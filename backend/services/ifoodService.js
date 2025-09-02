const axios = require("axios");
const OrderService = require("./orderService");
const Store = require("../models/Store");
const HandshakeDispute = require("../models/HandshakeDispute");
const HandshakeSettlement = require("../models/HandshakeSettlement");

class IfoodService {
  constructor(storeFirebaseUid = null) {
    this.baseURL = "https://merchant-api.ifood.com.br";
    this.storeFirebaseUid = storeFirebaseUid;
    this.clientId = process.env.IFOOD_CLIENT_ID;
    this.clientSecret = process.env.IFOOD_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Método para configurar o store
  async setStoreCredentials(storeFirebaseUid) {
    try {
      const store = await Store.findOne({ firebaseUid: storeFirebaseUid });
      if (!store) {
        throw new Error(`Store não encontrada: ${storeFirebaseUid}`);
      }

      this.storeFirebaseUid = storeFirebaseUid;
      this.merchantId = store.ifoodConfig?.merchantId;

      return store;
    } catch (error) {
      console.error("Erro ao configurar store:", error);
      throw error;
    }
  }

  async pollingIfood(storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    const tokenStatus = this.getTokenStatus();
    console.log(`[IFOOD] Polling iniciado - ${tokenStatus.message}`);

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }

    try {
      console.log(
        `[IFOOD] Fazendo polling para eventos - Store: ${
          this.storeFirebaseUid || "global"
        }`
      );

      const response = await axios.get(
        `${this.baseURL}/order/v1.0/events:polling`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 segundos de timeout
        }
      );

      const events = response.data;
      console.log(
        `[IFOOD] Polling concluído - ${events.length || 0} eventos recebidos`
      );

      // Processar eventos de negociação
      if (events && events.length > 0) {
        await this.processEvents(events, storeFirebaseUid);
      }

      return events;
    } catch (error) {
      this.handleAuthError(error, "pollingIfood");
    } finally {
      // Reagendar próximo polling em 29 segundos
      console.log(`[IFOOD] Reagendando próximo polling em 29 segundos`);
      setTimeout(() => this.pollingIfood(storeFirebaseUid), 29000);
    }
  }

  async authenticate() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "Credenciais iFood não configuradas nas variáveis de ambiente."
      );
    }

    try {
      console.log(
        `[IFOOD] Iniciando autenticação para store: ${
          this.storeFirebaseUid || "global"
        }`
      );

      const response = await axios.post(
        `${this.baseURL}/authentication/v1.0/oauth/token`,
        {
          grantType: "client_credentials",
          clientId: this.clientId,
          clientSecret: this.clientSecret,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.accessToken = response.data.accessToken;

      // Configurar expiração do token (normalmente 1 hora)
      const expiresInSeconds = response.data.expiresIn || 3600;
      this.tokenExpiry = Date.now() + expiresInSeconds * 1000;

      // Calcular data/hora de expiração para log
      const expiryDate = new Date(this.tokenExpiry);
      const timeLeftMinutes = Math.floor(expiresInSeconds / 60);

      console.log(
        `[IFOOD] ✅ Autenticado com sucesso para store: ${
          this.storeFirebaseUid || "global"
        }`
      );
      console.log(
        `[IFOOD] Token válido por ${timeLeftMinutes} minutos, expira em: ${expiryDate.toLocaleString(
          "pt-BR"
        )}`
      );

      return this.accessToken;
    } catch (error) {
      console.error(
        `[IFOOD] ❌ Erro na autenticação para store ${
          this.storeFirebaseUid || "global"
        }:`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async goingToOrigin(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/logistics/v1.0/orders/${orderId}/goingToOrigin`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Erro ao atualizar status do pedido para 'going to origin':",
        error.message
      );
      throw error;
    }
  }

  async assignMotoboy(orderId, driver, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/logistics/v1.0/orders/${orderId}/assignDriver`,
        {
          workerName: driver.name,
          workerPhone: driver.phone,
          workerVehicleType: driver.vehicleType || "MOTORCYCLE",
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        try {
          await this.goingToOrigin(orderId, storeFirebaseUid);
        } catch (error) {
          console.error(
            "Erro ao atualizar status do pedido para 'going to origin':",
            error.message
          );
        }
      }
      return response.data;
    } catch (error) {
      console.error("Erro ao atribuir motoboy ao pedido:", error.message);
      throw error;
    }
  }

  async arrivedAtOrigin(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/logistics/v1.0/orders/${orderId}/arrivedAtOrigin`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Erro ao atualizar status do pedido para 'arrived at origin':",
        error.message
      );
      throw error;
    }
  }

  async arrivedAtDestination(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/logistics/v1.0/orders/${orderId}/arrivedAtDestination`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Erro ao atualizar status do pedido para 'arrived at destination':",
        error.message
      );
      throw error;
    }
  }

  async readyToPickup(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }
    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}/readyToPickup`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Erro ao atualizar status do pedido para 'ready to pickup':",
        error.message
      );
      throw error;
    }
  }

  async ensureAuthenticated() {
    // Verificar se precisa autenticar
    // Renovar token quando restarem menos de 5 minutos (300 segundos) para expirar
    const bufferTime = 5 * 60 * 1000; // 5 minutos em milissegundos
    const timeUntilExpiry = this.tokenExpiry
      ? this.tokenExpiry - Date.now()
      : 0;

    if (
      !this.accessToken ||
      !this.tokenExpiry ||
      timeUntilExpiry <= bufferTime
    ) {
      const timeLeft =
        timeUntilExpiry > 0 ? Math.floor(timeUntilExpiry / 1000) : 0;
      console.log(
        `[IFOOD] Token ${
          !this.accessToken
            ? "não existe"
            : timeUntilExpiry <= 0
            ? "expirado"
            : `expira em ${timeLeft}s`
        }, renovando...`
      );
      await this.authenticate();
    } else {
      const timeLeft = Math.floor(timeUntilExpiry / 1000);
      console.log(`[IFOOD] Token válido, expira em ${timeLeft}s`);
    }
  }

  async getMerchantDetails(merchantId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }
    try {
      const response = await axios.get(
        `${this.baseURL}/merchant/v1.0/merchants/${merchantId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes do merchant:", error.message);
      throw error;
    }
  }

  async getOrders(storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();
    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }
    try {
      const response = await axios.get(`${this.baseURL}/order/v1.0/orders`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      this.handleAuthError(error, "getOrders");
    }
  }

  async getOrderDetails(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }
    try {
      const response = await axios.get(
        `${this.baseURL}/order/v1.0/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleAuthError(error, "getOrderDetails");
    }
  }

  async confirmOrder(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }
    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}/confirm`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Atualizar status local
      // const Order = require("../models/Order");
      // await Order.updateOne({ ifoodId: orderId }, { status: "em_preparo" });
      return response.data;
    } catch (error) {
      console.error("Erro ao confirmar pedido:", error);
      throw error;
    }
  }

  async dispatchOrder(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}/dispatch`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao despachar pedido:", error);
      throw error;
    }
  }

  async completeOrder(orderId, storeFirebaseUid = null) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao completar pedido:", error);
      throw error;
    }
  }

  async verifyOrderDeliveryCode(orderId, deliveryCode) {
    await this.ensureAuthenticated();

    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}/verifyDeliveryCode`,
        { code: deliveryCode },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao verificar código de entrega:", error);
      throw error;
    }
  }

  async cancelOrder(
    orderId,
    reason,
    cancellationCode,
    storeFirebaseUid = null
  ) {
    // Se foi passado um storeFirebaseUid, configurar as credenciais
    // if (storeFirebaseUid && storeFirebaseUid !== this.storeFirebaseUid) {
    //   await this.setStoreCredentials(storeFirebaseUid);
    // }

    await this.ensureAuthenticated();

    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}/requestCancellation`,
        {
          reason,
          cancellationCode,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao cancelar pedido: ifoodservice");
      throw error;
    }
  }

  async cancellationReasons(orderId, firebaseUid = null) {
    // Se foi passado um firebaseUid, configurar as credenciais
    if (firebaseUid && firebaseUid !== this.storeFirebaseUid) {
      await this.setStoreCredentials(firebaseUid);
    }

    await this.ensureAuthenticated();

    try {
      const response = await axios.get(
        `${this.baseURL}/order/v1.0/orders/${orderId}/cancellationReasons`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao informar motivo de cancelamento:", error);
      throw error;
    }
  }

  // Método helper para identificar a qual store pertence um pedido
  async getStoreFromOrderId(orderId) {
    try {
      const Order = require("../models/Order");
      const Store = require("../models/Store");
      const order = await Order.findOne({ ifoodId: orderId });
      if (order && order.store) {
        const store = await Store.findOne({ cnpj: order.store.cnpj });
        if (store) {
          return store.firebaseUid;
        }
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar store do pedido:", error);
      return null;
    }
  }

  // Método estático para criar instância configurada para um store específico
  static async createForStore(storeFirebaseUid) {
    const service = new IfoodService();
    await service.setStoreCredentials(storeFirebaseUid);
    return service;
  }

  // Método auxiliar para tratar erros de autenticação
  handleAuthError(error, methodName) {
    if (error.response?.status === 401) {
      console.log(
        `[IFOOD] Token inválido detectado em ${methodName}, limpando cache`
      );
      this.accessToken = null;
      this.tokenExpiry = null;
    }

    console.error(
      `[IFOOD] ❌ Erro em ${methodName}:`,
      error.response?.data || error.message
    );
    throw error;
  }

  // Método para verificar se as credenciais estão configuradas
  hasCredentials() {
    return !!(process.env.IFOOD_CLIENT_ID && process.env.IFOOD_CLIENT_SECRET);
  }

  // Método para verificar status do token atual
  getTokenStatus() {
    if (!this.accessToken) {
      return {
        hasToken: false,
        isExpired: true,
        timeUntilExpiry: 0,
        message: "Nenhum token disponível",
      };
    }

    if (!this.tokenExpiry) {
      return {
        hasToken: true,
        isExpired: true,
        timeUntilExpiry: 0,
        message: "Token sem data de expiração definida",
      };
    }

    const now = Date.now();
    const timeUntilExpiry = this.tokenExpiry - now;
    const isExpired = timeUntilExpiry <= 0;
    const bufferTime = 5 * 60 * 1000; // 5 minutos
    const needsRenewal = timeUntilExpiry <= bufferTime;

    return {
      hasToken: true,
      isExpired,
      needsRenewal,
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
      timeUntilExpirySeconds: Math.max(0, Math.floor(timeUntilExpiry / 1000)),
      expiryDate: new Date(this.tokenExpiry),
      message: isExpired
        ? "Token expirado"
        : needsRenewal
        ? `Token precisa ser renovado em breve (${Math.floor(
            timeUntilExpiry / 1000
          )}s restantes)`
        : `Token válido (${Math.floor(timeUntilExpiry / 1000)}s restantes)`,
    };
  }

  // Método para processar eventos recebidos
  async processEvents(events, storeFirebaseUid = null) {
    try {
      for (const event of events) {
        console.log(
          `[IFOOD] Processando evento: ${event.eventType} - ${event.id}`
        );

        switch (event.eventType) {
          case "HANDSHAKE_DISPUTE":
            await this.processHandshakeDispute(event, storeFirebaseUid);
            break;
          case "HANDSHAKE_SETTLEMENT":
            await this.processHandshakeSettlement(event, storeFirebaseUid);
            break;
          default:
            console.log(`[IFOOD] Evento não processado: ${event.eventType}`);
            break;
        }
      }
    } catch (error) {
      console.error("[IFOOD] Erro ao processar eventos:", error);
      throw error;
    }
  }

  // Processar evento HANDSHAKE_DISPUTE
  async processHandshakeDispute(event, storeFirebaseUid = null) {
    try {
      console.log(`[IFOOD] Processando HANDSHAKE_DISPUTE - ID: ${event.id}`);

      // Verificar se já existe
      const existingDispute = await HandshakeDispute.findOne({
        eventId: event.id,
      });
      if (existingDispute) {
        console.log(`[IFOOD] Dispute já processado: ${event.id}`);
        return;
      }

      // Extrair dados do evento
      const disputeData = {
        eventId: event.id,
        orderId: event.orderId,
        disputeId: event.disputeId,
        merchantId: event.merchantId,
        storeFirebaseUid: storeFirebaseUid,
        disputeType: event.disputeType || "OTHER",
        description: event.description || "",
        customerComplaint: event.customerComplaint || "",
        media: event.media || [],
        disputedItems: event.disputedItems || [],
        availableAlternatives: event.availableAlternatives || [],
        expiresAt: new Date(
          event.expiresAt || Date.now() + 24 * 60 * 60 * 1000
        ), // 24h padrão
      };

      // Salvar no banco
      const dispute = new HandshakeDispute(disputeData);
      await dispute.save();

      console.log(`[IFOOD] ✅ HANDSHAKE_DISPUTE salvo: ${event.id}`);

      // TODO: Aqui você pode implementar notificações para o merchant
      // await this.notifyMerchantOfDispute(dispute);
    } catch (error) {
      console.error(
        `[IFOOD] ❌ Erro ao processar HANDSHAKE_DISPUTE ${event.id}:`,
        error
      );
      throw error;
    }
  }

  // Processar evento HANDSHAKE_SETTLEMENT
  async processHandshakeSettlement(event, storeFirebaseUid = null) {
    try {
      console.log(`[IFOOD] Processando HANDSHAKE_SETTLEMENT - ID: ${event.id}`);

      // Verificar se já existe
      const existingSettlement = await HandshakeSettlement.findOne({
        eventId: event.id,
      });
      if (existingSettlement) {
        console.log(`[IFOOD] Settlement já processado: ${event.id}`);
        return;
      }

      // Buscar o dispute relacionado
      const relatedDispute = await HandshakeDispute.findOne({
        disputeId: event.disputeId,
      });

      // Extrair dados do evento
      const settlementData = {
        eventId: event.id,
        orderId: event.orderId,
        disputeId: event.disputeId,
        merchantId: event.merchantId,
        storeFirebaseUid: storeFirebaseUid,
        originalDisputeEventId: event.originalDisputeEventId,
        settlementResult: event.settlementResult,
        settlementDetails: event.settlementDetails || {},
        decisionMaker: event.decisionMaker || "PLATFORM",
        negotiationTimeline: {
          disputeCreatedAt:
            event.negotiationTimeline?.disputeCreatedAt || new Date(),
          merchantRespondedAt: event.negotiationTimeline?.merchantRespondedAt,
          settlementReachedAt:
            event.negotiationTimeline?.settlementReachedAt || new Date(),
        },
        financialImpact: event.financialImpact || {},
        relatedDispute: relatedDispute?._id,
      };

      // Salvar no banco
      const settlement = new HandshakeSettlement(settlementData);
      await settlement.save();

      // Atualizar o dispute relacionado se existir
      if (relatedDispute) {
        relatedDispute.status = "SETTLED";
        await relatedDispute.save();
      }

      console.log(`[IFOOD] ✅ HANDSHAKE_SETTLEMENT salvo: ${event.id}`);
    } catch (error) {
      console.error(
        `[IFOOD] ❌ Erro ao processar HANDSHAKE_SETTLEMENT ${event.id}:`,
        error
      );
      throw error;
    }
  }

  // Endpoint para aceitar uma disputa
  async acceptDispute(disputeId, storeFirebaseUid = null) {
    await this.ensureAuthenticated();

    try {
      const response = await axios.post(
        `${this.baseURL}/handshake/v1.0/disputes/${disputeId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Atualizar status local
      await HandshakeDispute.updateOne(
        { disputeId },
        {
          status: "ACCEPTED",
          respondedAt: new Date(),
          "merchantResponse.type": "ACCEPT",
          "merchantResponse.respondedBy": storeFirebaseUid || "system",
        }
      );

      console.log(`[IFOOD] ✅ Dispute aceito: ${disputeId}`);
      return response.data;
    } catch (error) {
      console.error(`[IFOOD] ❌ Erro ao aceitar dispute ${disputeId}:`, error);
      throw error;
    }
  }

  // Endpoint para rejeitar uma disputa
  async rejectDispute(disputeId, reason, storeFirebaseUid = null) {
    await this.ensureAuthenticated();

    try {
      const response = await axios.post(
        `${this.baseURL}/handshake/v1.0/disputes/${disputeId}/reject`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Atualizar status local
      await HandshakeDispute.updateOne(
        { disputeId },
        {
          status: "REJECTED",
          respondedAt: new Date(),
          "merchantResponse.type": "REJECT",
          "merchantResponse.reason": reason,
          "merchantResponse.respondedBy": storeFirebaseUid || "system",
        }
      );

      console.log(`[IFOOD] ✅ Dispute rejeitado: ${disputeId}`);
      return response.data;
    } catch (error) {
      console.error(`[IFOOD] ❌ Erro ao rejeitar dispute ${disputeId}:`, error);
      throw error;
    }
  }

  // Endpoint para fazer contraproposta
  async proposeAlternative(
    disputeId,
    alternativeData,
    storeFirebaseUid = null
  ) {
    await this.ensureAuthenticated();

    try {
      const response = await axios.post(
        `${this.baseURL}/handshake/v1.0/disputes/${disputeId}/alternative`,
        alternativeData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Atualizar status local
      await HandshakeDispute.updateOne(
        { disputeId },
        {
          status: "COUNTER_PROPOSED",
          respondedAt: new Date(),
          "merchantResponse.type": "ALTERNATIVE",
          "merchantResponse.proposedAlternative": alternativeData,
          "merchantResponse.respondedBy": storeFirebaseUid || "system",
        }
      );

      console.log(
        `[IFOOD] ✅ Contraproposta enviada para dispute: ${disputeId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `[IFOOD] ❌ Erro ao enviar contraproposta para dispute ${disputeId}:`,
        error
      );
      throw error;
    }
  }

  // Método para buscar disputes pendentes
  async getPendingDisputes(storeFirebaseUid = null) {
    try {
      const query = {
        status: "PENDING",
        expiresAt: { $gt: new Date() }, // Apenas não expirados
      };

      if (storeFirebaseUid) {
        query.storeFirebaseUid = storeFirebaseUid;
      }

      const disputes = await HandshakeDispute.find(query).sort({
        receivedAt: -1,
      });

      return disputes;
    } catch (error) {
      console.error("[IFOOD] Erro ao buscar disputes pendentes:", error);
      throw error;
    }
  }

  // Método para buscar histórico de settlements
  async getSettlementsHistory(storeFirebaseUid = null, limit = 50) {
    try {
      const query = {};

      if (storeFirebaseUid) {
        query.storeFirebaseUid = storeFirebaseUid;
      }

      const settlements = await HandshakeSettlement.find(query)
        .populate("relatedDispute")
        .sort({ receivedAt: -1 })
        .limit(limit);

      return settlements;
    } catch (error) {
      console.error("[IFOOD] Erro ao buscar histórico de settlements:", error);
      throw error;
    }
  }

  // Método para verificar disputes expirados
  async checkExpiredDisputes() {
    try {
      const expiredDisputes = await HandshakeDispute.find({
        status: "PENDING",
        expiresAt: { $lt: new Date() },
      });

      for (const dispute of expiredDisputes) {
        dispute.status = "EXPIRED";
        await dispute.save();
        console.log(`[IFOOD] ⏰ Dispute expirado: ${dispute.disputeId}`);
      }

      return expiredDisputes.length;
    } catch (error) {
      console.error("[IFOOD] Erro ao verificar disputes expirados:", error);
      throw error;
    }
  }
}

module.exports = IfoodService;
