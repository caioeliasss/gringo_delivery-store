// backend/services/asaasService.js
const axios = require("axios");

class AsaasService {
  constructor() {
    this.baseURL =
      process.env.ASAAS_ENVIRONMENT === "production"
        ? "https://api.asaas.com/v3"
        : "https://api-sandbox.asaas.com/v3";

    this.apiKey = process.env.ASAAS_API_KEY;

    // CORRIGIR: Asaas usa $aact_ diretamente, NÃO Bearer!
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        access_token: this.apiKey, // MUDANÇA: Volta para access_token!
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 segundos timeout
    });

    // Log para debug
    console.log("🔑 Asaas configurado:");
    console.log("  - Environment:", process.env.ASAAS_ENVIRONMENT || "sandbox");
    console.log("  - BaseURL:", this.baseURL);
    console.log("  - API Key presente:", !!this.apiKey);
    console.log(
      "  - API Key (primeiros 10 chars):",
      this.apiKey ? this.apiKey.substring(0, 10) + "..." : "AUSENTE"
    );
  }

  async createCustomer(data) {
    try {
      // CORRIGIR: Verificar campos obrigatórios
      if (!data.name || !data.email || !data.cpfCnpj) {
        throw new Error("Campos obrigatórios: name, email, cpfCnpj");
      }

      // CORRIGIR: Limpar CNPJ (apenas números)
      const cleanCnpj = data.cpfCnpj.replace(/\D/g, "");

      const payload = {
        name: data.name,
        email: data.email,
        cpfCnpj: cleanCnpj, // IMPORTANTE: apenas números
        mobilePhone: data.phone?.toString().replace(/\D/g, ""), // Limpar telefone também
      };

      const response = await this.api.post("/customers", payload);

      console.log("✅ Cliente criado com sucesso:", response.data);
      const customerId = response.data.id;

      const Store = require("../models/Store");
      Store.findOneAndUpdate(
        { cnpj: Number(cleanCnpj) },
        { asaasCustomerId: customerId },
        { new: true, upsert: true } // Atualiza ou cria se não existir
      ).catch((error) => {
        console.error("Erro ao atualizar Store com asaasCustomerId:", error);
      });

      return response.data;
    } catch (error) {
      console.error("❌ Erro detalhado ao criar cliente:", {
        message: error.message,
      });

      // Se for erro de rede/timeout
      if (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
        throw new Error(`Erro de conexão com Asaas: ${error.message}`);
      }

      throw new Error(
        error.response?.data?.errors?.[0]?.description ||
          error.response?.data?.message ||
          `Erro HTTP ${error.response?.status}: ${error.response?.statusText}` ||
          `Erro de rede: ${error.message}`
      );
    }
  }

  // CORRIGIR: Método para testar a conexão
  async testConnection() {
    try {
      console.log("🧪 Testando conexão com Asaas...");
      console.log("🔗 URL:", `${this.baseURL}/customers?limit=1`);
      console.log("🔑 Headers:", {
        access_token: this.apiKey
          ? this.apiKey.substring(0, 15) + "..."
          : "AUSENTE",
        "Content-Type": "application/json",
      });

      const response = await this.api.get("/customers?limit=1");

      console.log("✅ Conexão com Asaas OK - Resposta:", {
        status: response.status,
        hasCustomers: response.data.data?.length > 0,
        totalCount: response.data.totalCount,
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error("❌ Erro na conexão com Asaas:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        code: error.code,
      });

      return {
        success: false,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          code: error.code,
        },
      };
    }
  }

  // ADICIONAR: Função para garantir que existe um customer no Asaas
  async ensureCustomer(storeData) {
    try {
      // Se já tem customerId, retorna ele
      if (storeData.asaasCustomerId) {
        console.log("✅ Customer já existe:", storeData.asaasCustomerId);
        return { id: storeData.asaasCustomerId };
      }

      console.log("⚠️ Customer não encontrado, criando novo...");

      // Criar novo customer
      const customerData = {
        name:
          storeData.businessName || storeData.displayName || storeData.email,
        email: storeData.email,
        cpfCnpj: String(storeData.cnpj),
        phone: storeData.phone || "",
      };

      const response = await this.createCustomer(customerData);

      console.log("✅ Novo customer criado:", response.id);
      return response;
    } catch (error) {
      console.error("❌ Erro ao garantir customer:", error);
      throw new Error(`Erro ao criar/verificar customer: ${error.message}`);
    }
  }

  // ADICIONAR: Função para garantir customer para motoboy
  async ensureMotoboyCustomer(motoboyData) {
    try {
      // Se já tem customerId, retorna ele
      if (motoboyData.asaasCustomerId) {
        console.log(
          "✅ Customer do motoboy já existe:",
          motoboyData.asaasCustomerId
        );
        return { id: motoboyData.asaasCustomerId };
      }

      console.log("⚠️ Customer do motoboy não encontrado, criando novo...");

      // Criar novo customer para motoboy
      const customerData = {
        name: motoboyData.name,
        email: motoboyData.email,
        cpfCnpj: motoboyData.cpf,
        phone: motoboyData.phoneNumber || motoboyData.phone || "",
      };

      const response = await this.createCustomer(customerData);

      // Atualizar o motoboy com o customerId
      const Motoboy = require("../models/Motoboy");
      await Motoboy.findByIdAndUpdate(motoboyData._id, {
        asaasCustomerId: response.id,
      });

      console.log("✅ Novo customer para motoboy criado:", response.id);
      return response;
    } catch (error) {
      console.error("❌ Erro ao garantir customer para motoboy:", error);
      throw new Error(
        `Erro ao criar/verificar customer do motoboy: ${error.message}`
      );
    }
  }

  async createInvoice(data) {
    try {
      const response = await this.api.post("/payments", {
        customer: data.customerId,
        billingType: "BOLETO",
        value: data.amount,
        dueDate: data.dueDate,
        description: data.description || "Fatura mensal",
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
      const response = await this.api.get(`/payments/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao consultar fatura:", error.response?.data);
      throw error;
    }
  }

  async getQRcodePayments(id) {
    try {
      const response = await this.api.get(`/payments/${id}/pixQrCode`);
      return response.data;
    } catch (error) {
      console.error(
        "Erro ao consultar QR Code de pagamento:",
        error.response?.data
      );
      throw error;
    }
  }

  // Listar faturas
  async listInvoices(filters = {}) {
    try {
      const response = await this.api.get("/payments", { params: filters });
      return response.data;
    } catch (error) {
      console.error("Erro ao listar faturas:", error.response?.data);
      throw error;
    }
  }

  // Cancelar fatura
  async cancelInvoice(invoiceId) {
    try {
      const response = await this.api.delete(`/payments/${invoiceId}`);
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
      // Primeiro, teste a conectividade

      // CORRIGIR: Testar endpoint padrão do Asaas para transferências
      const payload = {
        value: data.value,
        pixAddressKey: data.pixKey, // Voltar para pixAddressKey (documentação oficial)
        pixAddressKeyType: data.pixKeyType, // EMAIL, CPF, CNPJ, PHONE, EVP
        description:
          data.description || "Pagamento de corrida - Gringo Delivery",
      };

      // Remover scheduleDate se for null para evitar problemas
      if (data.scheduleDate) {
        payload.scheduleDate = data.scheduleDate;
      }

      const response = await this.api.post("/transfers", payload);

      return response.data;
    } catch (error) {
      console.error("❌ Erro detalhado ao criar transferência PIX:");
      console.error("  - Status:", error.response?.status);
      console.error("  - Status Text:", error.response?.statusText);
      console.error("  - Data:", error.response?.data);
      console.error("  - URL:", error.config?.url);
      console.error("  - Method:", error.config?.method);
      console.error("  - BaseURL:", error.config?.baseURL);

      // Se for HTML (erro 404), é problema de endpoint
      if (
        typeof error.response?.data === "string" &&
        error.response.data.includes("<!doctype html>")
      ) {
        throw new Error(
          `Endpoint não encontrado: ${error.config?.baseURL}${error.config?.url}. A API do Asaas pode estar com problemas ou o endpoint mudou.`
        );
      }

      throw new Error(
        error.response?.data?.errors?.[0]?.description ||
          error.response?.data?.message ||
          `Erro HTTP ${error.response?.status}: ${error.response?.statusText}` ||
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
