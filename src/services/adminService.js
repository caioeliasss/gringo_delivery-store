// src/services/adminService.js
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080/api";

class AdminService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/admin`,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Interceptor para adicionar token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem("adminToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // ✅ DEBUG: Log das requisições
      console.log("🔍 AdminService Request:", {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        headers: config.headers,
      });

      return config;
    });

    // Interceptor para tratar erros
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("adminToken");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email, password) {
    const response = await this.api.post("/auth/login", { email, password });
    return response.data;
  }

  async verifyToken(token) {
    const response = await this.api.get("/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  // Dashboard
  async getDashboardStats() {
    const response = await this.api.get("/dashboard/stats");
    return response.data;
  }

  // Lojas
  async getStores(params = {}) {
    const response = await this.api.get("/stores", { params });
    return response.data;
  }

  async approveStore(storeId) {
    const response = await this.api.put(`/stores/${storeId}/approve`);
    return response.data;
  }

  async rejectStore(storeId, reason) {
    const response = await this.api.put(`/stores/${storeId}/reject`, {
      reason,
    });
    return response.data;
  }

  async getFinancialStats(params = {}) {
    const response = await this.api.get("/financial/stats", { params });
    return response.data;
  }

  async getWithdrawals(params = {}) {
    console.log("🔍 DEBUG AdminService - getWithdrawals params:", params);
    const response = await this.api.get("/financial/withdrawals", { params });
    console.log(
      "🔍 DEBUG AdminService - getWithdrawals response:",
      response.data
    );
    return response.data;
  }

  async processWithdrawal(withdrawalId) {
    const response = await this.api.post(
      `/financial/withdrawals/${withdrawalId}/process`
    );
    return response.data;
  }

  async rejectWithdrawal(withdrawalId, reason = "") {
    const response = await this.api.post(
      `/financial/withdrawals/${withdrawalId}/reject`,
      { reason }
    );
    return response.data;
  }

  async getBillings(params = {}) {
    console.log("🔍 DEBUG AdminService - getBillings params:", params);
    const response = await this.api.get("/financial/billings", { params });
    console.log("🔍 DEBUG AdminService - getBillings response:", response.data);
    return response.data;
  }

  // ✅ NOVA FUNÇÃO: Alterar status do billing
  async updateBillingStatus(billingId, status, reason = "") {
    console.log("🔍 DEBUG AdminService - updateBillingStatus:", {
      billingId,
      status,
      reason,
    });
    const response = await this.api.patch(
      `/financial/billings/${billingId}/status`,
      { status, reason }
    );
    console.log(
      "🔍 DEBUG AdminService - updateBillingStatus response:",
      response.data
    );
    return response.data;
  }

  // Pedidos
  async getOrders(params = {}) {
    const response = await this.api.get("/orders", { params });
    return response.data;
  }

  // Faturamento
  async getBillingData(params = {}) {
    const response = await this.api.get("/billing", { params });
    return response.data;
  }

  async generateBilling(params) {
    const response = await this.api.post("/billing/generate", params);
    return response.data;
  }

  // Relatórios
  async getRevenueReport(params = {}) {
    const response = await this.api.get("/reports/revenue", { params });
    return response.data;
  }

  async getStoresReport(params = {}) {
    const response = await this.api.get("/reports/stores", { params });
    return response.data;
  }
}

export const adminService = new AdminService();
