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

    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error("Access token não disponível. Autentique-se primeiro.");
    }
    try {
      const response = await axios.get(
        `${this.baseURL}/order/v1.0/events:polling`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error.message);
      throw error;
    } finally {
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
      // console.log("Access Token:", this.accessToken);
      // Configurar expiração do token (normalmente 1 hora)
      this.tokenExpiry = Date.now() + (response.data.expiresIn || 3600) * 1000;

      console.log(
        `[IFOOD] Autenticado com sucesso para store: ${this.storeFirebaseUid}`
      );
      return this.accessToken;
    } catch (error) {
      console.error("Erro na autenticação iFood:", error);
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
    if (
      !this.accessToken ||
      (this.tokenExpiry && Date.now() >= this.tokenExpiry)
    ) {
      console.log("Token expirado ou inexistente, autenticando...");
      await this.authenticate();
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
      console.error("Erro ao buscar pedidos:", error.message);
      throw error;
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
      console.error("Erro ao buscar detalhes do pedido:", error.message);
      throw error;
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

  // Método para verificar se as credenciais estão configuradas
  hasCredentials() {
    return !!(process.env.IFOOD_CLIENT_ID && process.env.IFOOD_CLIENT_SECRET);
  }
}

module.exports = IfoodService;
