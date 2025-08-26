const axios = require("axios");
const OrderService = require("./orderService");

class IfoodService {
  constructor() {
    this.baseURL = "https://merchant-api.ifood.com.br";
    this.clientId = process.env.IFOOD_CLIENT_ID;
    this.clientSecret = process.env.IFOOD_CLIENT_SECRET;
    this.accessToken = null;
  }

  async pollingIfood() {
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
      setTimeout(() => this.pollingIfood(), 29000);
    }
  }

  async authenticate() {
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
      return this.accessToken;
    } catch (error) {
      console.error("Erro na autenticação iFood:", error);
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

  async getMerchantDetails(merchantId) {
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

  async getOrders() {
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

  async getOrderDetails(orderId) {
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

  async confirmOrder(orderId) {
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
      const Order = require("../models/Order");
      await Order.updateOne({ ifoodId: orderId }, { status: "em_preparo" });
      return response.data;
    } catch (error) {
      console.error("Erro ao confirmar pedido:", error);
      throw error;
    }
  }

  async dispatchOrder(orderId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}:dispatch`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      await this.updateStatus(orderId, "em_entrega");
      return response.data;
    } catch (error) {
      console.error("Erro ao despachar pedido:", error);
      throw error;
    }
  }

  async readyForPickup(orderId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/order/v1.0/orders/${orderId}:readyForPickup`,
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
      console.error("Erro ao marcar como pronto:", error);
      throw error;
    }
  }
}

module.exports = IfoodService;
