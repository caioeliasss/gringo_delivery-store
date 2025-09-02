import { useState, useEffect, useCallback } from "react";
import api, { invalidateCache } from "../../../../services/api";
import { auth } from "../../../../firebase";

// Hook personalizado para gerenciar negociações do iFood
export const useHandshakeNegotiation = () => {
  const [loading, setLoading] = useState(true);
  const [pendingDisputes, setPendingDisputes] = useState([]);
  const [historyData, setHistoryData] = useState({
    disputes: [],
    settlements: [],
    summary: {},
  });
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Carregar disputes pendentes
  const loadPendingDisputes = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("[HANDSHAKE] ❌ Usuário não autenticado");
        setError("Usuário não autenticado");
        return [];
      }

      const response = await api.get("/handshake/disputes/pending", {
        noCache: true, // Forçar requisição sem cache
        useQueue: false, // Não usar fila para refresh manual
      });
      // console.log("[HANDSHAKE] 📡 Resposta recebida:", response.data);

      const disputes = response.data.data || [];

      // Adicionar propriedades calculadas
      const enrichedDisputes = disputes.map((dispute) => ({
        ...dispute,
        isCritical: dispute.timeRemainingMinutes <= 15,
        isUrgent:
          dispute.timeRemainingMinutes <= 60 &&
          dispute.timeRemainingMinutes > 15,
        isNormal: dispute.timeRemainingMinutes > 60,
        timeRemainingPercentage: Math.max(
          0,
          Math.min(100, (dispute.timeRemainingMinutes / 1440) * 100)
        ),
      }));

      // console.log(
      //   "[HANDSHAKE] 📊 Disputes processadas:",
      //   enrichedDisputes.length
      // );
      setPendingDisputes(enrichedDisputes);
      setLastUpdate(new Date());
      return enrichedDisputes;
    } catch (error) {
      console.error(
        "[HANDSHAKE] ❌ Erro ao carregar disputes pendentes:",
        error
      );
      if (error.response) {
        console.error(
          "[HANDSHAKE] 📡 Status da resposta:",
          error.response.status
        );
        console.error("[HANDSHAKE] 📡 Dados da resposta:", error.response.data);
      }
      setError("Erro ao carregar disputes pendentes");
      throw error;
    }
  }, []);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    try {
      console.log(
        "[HANDSHAKE] 🌐 Fazendo requisição para /handshake/history (sem cache)"
      );
      const response = await api.get("/handshake/history", {
        noCache: true, // Forçar requisição sem cache
        useQueue: false, // Não usar fila para refresh manual
      });
      console.log(
        "[HANDSHAKE] 📡 Resposta do histórico recebida:",
        response.data
      );

      const data = response.data.data || {
        disputes: [],
        settlements: [],
        summary: {},
      };

      // console.log("[HANDSHAKE] 📊 Histórico processado");
      setHistoryData(data);
      return data;
    } catch (error) {
      console.error("[HANDSHAKE] ❌ Erro ao carregar histórico:", error);
      setError("Erro ao carregar histórico");
      throw error;
    }
  }, []);

  // Carregar detalhes de uma disputa específica
  const loadDisputeDetails = useCallback(async (disputeId) => {
    try {
      const response = await api.get(`/handshake/disputes/${disputeId}`);
      return response.data.data;
    } catch (error) {
      console.error("Erro ao carregar detalhes da disputa:", error);
      setError("Erro ao carregar detalhes da disputa");
      throw error;
    }
  }, []);

  // Aceitar disputa
  const acceptDispute = useCallback(
    async (disputeId) => {
      try {
        const response = await api.post(
          `/handshake/disputes/${disputeId}/accept`
        );

        // Atualizar a lista local
        setPendingDisputes((prev) =>
          prev.filter((dispute) => dispute.disputeId !== disputeId)
        );

        // Recarregar dados para ter certeza
        await loadPendingDisputes();
        await loadHistory();

        return response.data;
      } catch (error) {
        console.error("Erro ao aceitar disputa:", error);
        setError(error.response?.data?.message || "Erro ao aceitar disputa");
        throw error;
      }
    },
    [loadPendingDisputes, loadHistory]
  );

  // Rejeitar disputa
  const rejectDispute = useCallback(
    async (disputeId, reason) => {
      try {
        const response = await api.post(
          `/handshake/disputes/${disputeId}/reject`,
          {
            reason,
          }
        );

        // Atualizar a lista local
        setPendingDisputes((prev) =>
          prev.filter((dispute) => dispute.disputeId !== disputeId)
        );

        // Recarregar dados
        await loadPendingDisputes();
        await loadHistory();

        return response.data;
      } catch (error) {
        console.error("Erro ao rejeitar disputa:", error);
        setError(error.response?.data?.message || "Erro ao rejeitar disputa");
        throw error;
      }
    },
    [loadPendingDisputes, loadHistory]
  );

  // Fazer contraproposta
  const proposeAlternative = useCallback(
    async (disputeId, alternative) => {
      try {
        const response = await api.post(
          `/handshake/disputes/${disputeId}/alternative`,
          {
            alternative: {
              ...alternative,
              amount: {
                value: parseFloat(alternative.amount.value),
                currency: alternative.amount.currency,
              },
            },
          }
        );

        // Atualizar a lista local
        setPendingDisputes((prev) =>
          prev.filter((dispute) => dispute.disputeId !== disputeId)
        );

        // Recarregar dados
        await loadPendingDisputes();
        await loadHistory();

        return response.data;
      } catch (error) {
        console.error("Erro ao enviar contraproposta:", error);
        setError(
          error.response?.data?.message || "Erro ao enviar contraproposta"
        );
        throw error;
      }
    },
    [loadPendingDisputes, loadHistory]
  );

  // Refresh completo dos dados
  const refreshAll = useCallback(async () => {
    // console.log("[HANDSHAKE] 🔄 Iniciando refresh completo dos dados...");
    setLoading(true);
    setError(null);
    try {
      // Invalidar cache antes de recarregar
      // console.log("[HANDSHAKE] 🗑️ Invalidando cache...");
      invalidateCache("/handshake");

      // console.log("[HANDSHAKE] 📋 Carregando disputes pendentes...");
      const pendingResult = await loadPendingDisputes();
      // console.log(
      //   `[HANDSHAKE] ✅ ${
      //     pendingResult?.length || 0
      //   } disputes pendentes carregadas`
      // );

      // console.log("[HANDSHAKE] 📜 Carregando histórico...");
      const historyResult = await loadHistory();
      // console.log("[HANDSHAKE] ✅ Histórico carregado");

      // console.log("[HANDSHAKE] ✅ Refresh completo finalizado com sucesso");
    } catch (error) {
      console.error("[HANDSHAKE] ❌ Erro ao atualizar dados:", error);
      setError(error.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [loadPendingDisputes, loadHistory]);

  // Carregar dados iniciais
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh para disputes pendentes (a cada 30 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      loadPendingDisputes().catch(() => {
        // Falha silenciosa para não interromper UX
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [loadPendingDisputes]);

  // Limpar erro após 5 segundos
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  // Estatísticas calculadas
  const statistics = {
    total: pendingDisputes.length,
    critical: pendingDisputes.filter((d) => d.isCritical).length,
    urgent: pendingDisputes.filter((d) => d.isUrgent).length,
    normal: pendingDisputes.filter((d) => d.isNormal).length,
    averageTimeRemaining:
      pendingDisputes.length > 0
        ? pendingDisputes.reduce((sum, d) => sum + d.timeRemainingMinutes, 0) /
          pendingDisputes.length
        : 0,
    oldestDispute:
      pendingDisputes.length > 0
        ? Math.min(...pendingDisputes.map((d) => d.timeRemainingMinutes))
        : 0,
  };

  return {
    // Estado
    loading,
    pendingDisputes,
    historyData,
    error,
    lastUpdate,
    statistics,

    // Ações
    loadPendingDisputes,
    loadHistory,
    loadDisputeDetails,
    acceptDispute,
    rejectDispute,
    proposeAlternative,
    refreshAll,

    // Utilities
    clearError: () => setError(null),
  };
};

export default useHandshakeNegotiation;
