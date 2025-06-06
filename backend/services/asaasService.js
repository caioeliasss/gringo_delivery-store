// backend/services/asaasService.js
const axios = require("axios");

class AsaasService {
  constructor() {
    this.baseURL =
      process.env.ASAAS_ENVIRONMENT === "production"
        ? "https://www.asaas.com/api/v3"
        : "https://sandbox.asaas.com/api/v3";

    this.apiKey = process.env.ASAAS_API_KEY;

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        access_token: this.apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async createInvoice(data) {
    try {
      const response = await this.api.post("/invoices", {
        customer: data.customerId,
        value: data.amount,
        dueDate: data.dueDate,
        description: data.description || "Fatura mensal",
        paymentMethod: data.paymentMethod || "PIX",
        // Adicione outros campos conforme necessário
      });

      return response.data;
    } catch (error) {
      console.error("Erro ao criar fatura:", error.response?.data);
      throw new Error(
        error.response?.data?.errors?.[0]?.description ||
          "Erro ao processar fatura"
      );
    }
  }

  // Consultar fatura
  async getInvoice(invoiceId) {
    try {
      const response = await this.api.get(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao consultar fatura:", error.response?.data);
      throw error;
    }
  }

  // Listar faturas
  async listInvoices(filters = {}) {
    try {
      const response = await this.api.get("/invoices", { params: filters });
      return response.data;
    } catch (error) {
      console.error("Erro ao listar faturas:", error.response?.data);
      throw error;
    }
  }

  // Cancelar fatura
  async cancelInvoice(invoiceId) {
    try {
      const response = await this.api.delete(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao cancelar fatura:", error.response?.data);
      throw error;
    }
  }

  // Consultar saldo da conta
  async getBalance() {
    try {
      const response = await this.api.get("/finance/balance");
      return response.data;
    } catch (error) {
      console.error("Erro ao consultar saldo:", error.response?.data);
      throw error;
    }
  }

  // Criar transferência PIX
  async createPixTransfer(data) {
    try {
      console.log("Criando transferência PIX com dados:", data);
      const response = await this.api.post("/transfers", {
        value: data.value,
        pixAddressKey: data.pixKey,
        pixAddressKeyType: data.pixKeyType, // EMAIL, CPF, CNPJ, PHONE, EVP
        description:
          data.description || "Pagamento de corrida - Gringo Delivery",
        scheduleDate: data.scheduleDate || null, // Para agendamento
      });

      console.log("Transferência PIX criada com sucesso:", response.data);

      return response.data;
    } catch (error) {
      console.error("Erro ao criar transferência PIX:", error.response?.data);
      throw new Error(
        error.response?.data?.errors?.[0]?.description ||
          "Erro ao processar transferência"
      );
    }
  }

  // Consultar transferência
  async getTransfer(transferId) {
    try {
      const response = await this.api.get(`/transfers/${transferId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao consultar transferência:", error.response?.data);
      throw error;
    }
  }

  // Listar transferências
  async listTransfers(filters = {}) {
    try {
      const response = await this.api.get("/transfers", { params: filters });
      return response.data;
    } catch (error) {
      console.error("Erro ao listar transferências:", error.response?.data);
      throw error;
    }
  }

  // Cancelar transferência (se ainda não processada)
  async cancelTransfer(transferId) {
    try {
      const response = await this.api.delete(`/transfers/${transferId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao cancelar transferência:", error.response?.data);
      throw error;
    }
  }

  // Validar chave PIX
  async validatePixKey(pixKey, pixKeyType) {
    try {
      const response = await this.api.post("/pix/addressKeys/validate", {
        addressKey: pixKey,
        addressKeyType: pixKeyType,
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao validar chave PIX:", error.response?.data);
      throw error;
    }
  }

  // Consultar saldo da conta
  async getBalance() {
    try {
      const response = await this.api.get("/finance/balance");
      return response.data;
    } catch (error) {
      console.error("Erro ao consultar saldo:", error.response?.data);
      throw error;
    }
  }
}

module.exports = new AsaasService();
