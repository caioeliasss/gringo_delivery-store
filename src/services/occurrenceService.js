// src/services/occurrenceService.js
import api from "./api";

export const occurrenceService = {
  // Buscar estatísticas resumidas de ocorrências
  async getOccurrenceStats(period = "month", roles = null) {
    try {
      const params = { period };
      if (roles) {
        params.roles = Array.isArray(roles) ? roles.join(",") : roles;
      }

      const response = await api.get("/occurrences/stats/summary", { params });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar estatísticas de ocorrências:", error);
      throw error;
    }
  },

  // Buscar ocorrências recentes usando nova rota específica
  async getRecentOccurrences(limit = 10, period = "month", roles = null) {
    try {
      const params = { limit, period };
      if (roles) {
        params.roles = Array.isArray(roles) ? roles.join(",") : roles;
      }

      const response = await api.get("/occurrences/reports/recent", { params });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar ocorrências recentes:", error);
      throw error;
    }
  },

  // Buscar timeline de ocorrências
  async getOccurrenceTimeline(period = "month", groupBy = "day") {
    try {
      const response = await api.get("/occurrences/reports/timeline", {
        params: { period, groupBy },
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar timeline de ocorrências:", error);
      throw error;
    }
  },

  // Buscar top problemas
  async getTopIssues(limit = 5, period = "month") {
    try {
      const response = await api.get("/occurrences/reports/top-issues", {
        params: { limit, period },
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar top problemas:", error);
      throw error;
    }
  },

  // Buscar performance de resolução
  async getResolutionPerformance(period = "month") {
    try {
      const response = await api.get(
        "/occurrences/reports/resolution-performance",
        {
          params: { period },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar performance de resolução:", error);
      throw error;
    }
  },

  // Buscar ocorrências filtradas por roles
  async getFilteredOccurrences(roles) {
    try {
      const rolesString = Array.isArray(roles) ? roles.join(",") : roles;
      const response = await api.get(`/occurrences/filtered/${rolesString}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar ocorrências filtradas:", error);
      throw error;
    }
  },

  // Buscar detalhes de uma ocorrência específica
  async getOccurrenceDetails(id) {
    try {
      const response = await api.get(`/occurrences/details/${id}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes da ocorrência:", error);
      throw error;
    }
  },

  // Transformar dados da API para formato do componente
  transformStatsData(apiData) {
    const tipoNomes = {
      ENTREGA: "Problemas de Entrega",
      PRODUTO: "Produto/Qualidade",
      CLIENTE: "Atendimento ao Cliente",
      PAGAMENTO: "Problemas de Pagamento",
      ESTABELECIMENTO: "Estabelecimento",
      APP: "Problemas do App",
      MOTOBOY: "Problemas com Entregador",
      ENTREGADOR: "Problemas com Entregador",
      ATENDIMENTO: "Atendimento Geral",
      EVENTO: "Eventos",
      PEDIDO: "Problemas de Pedido",
      OUTRO: "Outros",
    };

    const tipoCores = {
      ENTREGA: "error",
      PRODUTO: "warning",
      CLIENTE: "info",
      PAGAMENTO: "secondary",
      ESTABELECIMENTO: "success",
      APP: "primary",
      MOTOBOY: "warning",
      ENTREGADOR: "warning",
      ATENDIMENTO: "info",
      EVENTO: "default",
      PEDIDO: "error",
      OUTRO: "default",
    };

    const ocorrenciasPorTipo = apiData.porTipo.map((item) => ({
      tipo: item._id,
      nome: tipoNomes[item._id] || item._id,
      quantidade: item.count,
      porcentagem: parseFloat(((item.count / apiData.total) * 100).toFixed(1)),
      cor: tipoCores[item._id] || "default",
    }));

    return {
      totalOcorrencias: apiData.total,
      ocorrenciasResolvidas: apiData.fechadas,
      ocorrenciasPendentes:
        apiData.pendentes + (apiData.abertas || 0) + (apiData.emAndamento || 0),
      tempoMedioResolucao: apiData.tempoMedioResolucao || 2.4,
      ocorrenciasPorTipo,
    };
  },

  // Transformar dados de ocorrências para formato da tabela
  transformOccurrenceData(occurrences) {
    return occurrences.map((occ) => ({
      id: `#OC-${occ._id.slice(-4)}`,
      tipo: occ.description?.split(":")[0] || "Não especificado",
      categoria: occ.type || "OUTRO",
      descricao: occ.description || "Sem descrição",
      status: this.mapStatus(occ.status),
      prioridade: this.mapPriority(occ.type),
      data: new Date(occ.date || occ.createdAt).toLocaleString("pt-BR"),
    }));
  },

  // Função integrada para buscar todos os dados do relatório
  async getReportData(period = "month", roles = null) {
    try {
      const [stats, recentOccurrences] = await Promise.all([
        this.getOccurrenceStats(period, roles),
        this.getRecentOccurrences(10, period, roles),
      ]);

      const transformedStats = this.transformStatsData(stats);
      const transformedOccurrences =
        this.transformOccurrenceData(recentOccurrences);

      return {
        ...transformedStats,
        ocorrencias: transformedOccurrences,
      };
    } catch (error) {
      console.error("Erro ao buscar dados do relatório:", error);
      throw error;
    }
  },

  // Mapear status da API para status do componente
  mapStatus(apiStatus) {
    const statusMap = {
      ABERTO: "Pendente",
      FECHADO: "Resolvida",
      PENDENTE: "Em análise",
      EM_ANDAMENTO: "Em análise",
    };
    return statusMap[apiStatus] || apiStatus;
  },

  // Mapear prioridade baseada no tipo
  mapPriority(type) {
    const highPriority = ["PAGAMENTO", "ENTREGA", "PRODUTO"];
    const mediumPriority = ["CLIENTE", "ESTABELECIMENTO", "PEDIDO"];

    if (highPriority.includes(type)) return "Alta";
    if (mediumPriority.includes(type)) return "Média";
    return "Baixa";
  },
};

export default occurrenceService;
