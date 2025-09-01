const axios = require("axios");
const OrderService = require("./orderService");
const Store = require("../models/Store");

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

      console.log(
        `[IFOOD] Polling concluído - ${
          response.data.length || 0
        } eventos recebidos`
      );
      return response.data;
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
}

module.exports = IfoodService;
