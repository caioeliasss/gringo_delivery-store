const HandshakeDispute = require("../models/HandshakeDispute");
const HandshakeSettlement = require("../models/HandshakeSettlement");
const IfoodService = require("./ifoodService");
const Store = require("../models/Store");

class HandshakeNegotiationService {
  constructor() {
    this.ifoodService = new IfoodService();
  }

  // Método para processar resposta a uma disputa
  async respondToDispute(
    disputeId,
    responseType,
    responseData = {},
    storeFirebaseUid = null
  ) {
    try {
      // Buscar a disputa
      const dispute = await HandshakeDispute.findOne({ disputeId });
      if (!dispute) {
        throw new Error(`Disputa não encontrada: ${disputeId}`);
      }

      // Verificar se não está expirada
      if (dispute.isExpired()) {
        throw new Error(`Disputa expirada: ${disputeId}`);
      }

      // Verificar se já foi respondida
      if (dispute.status !== "PENDING") {
        throw new Error(
          `Disputa já foi respondida: ${disputeId} - Status: ${dispute.status}`
        );
      }

      // Configurar store se fornecido
      if (storeFirebaseUid) {
        await this.ifoodService.setStoreCredentials(storeFirebaseUid);
      }

      let result;

      switch (responseType) {
        case "ACCEPT":
          result = await this.ifoodService.acceptDispute(
            disputeId,
            storeFirebaseUid
          );
          break;

        case "REJECT":
          if (!responseData.reason) {
            throw new Error("Motivo da rejeição é obrigatório");
          }
          result = await this.ifoodService.rejectDispute(
            disputeId,
            responseData.reason,
            storeFirebaseUid
          );
          break;

        case "ALTERNATIVE":
          if (!responseData.alternative) {
            throw new Error("Dados da contraproposta são obrigatórios");
          }
          result = await this.ifoodService.proposeAlternative(
            disputeId,
            responseData.alternative,
            storeFirebaseUid
          );
          break;

        default:
          throw new Error(`Tipo de resposta inválido: ${responseType}`);
      }

      // Log da ação
      // console.log(
      //   `[HANDSHAKE] ✅ Disputa respondida: ${disputeId} - ${responseType}`
      // );

      return {
        success: true,
        disputeId,
        responseType,
        result,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(
        `[HANDSHAKE] ❌ Erro ao responder disputa ${disputeId}:`,
        error
      );
      throw error;
    }
  }

  // Método para listar disputes pendentes para uma store
  async getPendingDisputesForStore(storeFirebaseUid) {
    try {
      const disputes = await HandshakeDispute.find({
        storeFirebaseUid,
        status: "PENDING",
        expiresAt: { $gt: new Date() },
      }).sort({ receivedAt: -1 });

      // Adicionar informações de tempo restante
      const disputesWithTimeInfo = disputes.map((dispute) => ({
        ...dispute.toObject(),
        timeRemainingMinutes: dispute.timeRemainingMinutes,
        isUrgent: dispute.timeRemainingMinutes <= 60, // Menos de 1 hora
        isCritical: dispute.timeRemainingMinutes <= 15, // Menos de 15 minutos
      }));

      return disputesWithTimeInfo;
    } catch (error) {
      console.error(
        `[HANDSHAKE] Erro ao buscar disputes pendentes para store ${storeFirebaseUid}:`,
        error
      );
      throw error;
    }
  }

  // Método para buscar detalhes de uma disputa específica
  async getDisputeDetails(disputeId) {
    try {
      const dispute = await HandshakeDispute.findOne({ disputeId });
      if (!dispute) {
        throw new Error(`Disputa não encontrada: ${disputeId}`);
      }

      return {
        ...dispute.toObject(),
        timeRemainingMinutes: dispute.timeRemainingMinutes,
        isExpired: dispute.isExpired(),
        canRespond: dispute.status === "PENDING" && !dispute.isExpired(),
      };
    } catch (error) {
      console.error(
        `[HANDSHAKE] Erro ao buscar detalhes da disputa ${disputeId}:`,
        error
      );
      throw error;
    }
  }

  // Método para obter histórico de negociações de uma store
  async getNegotiationHistory(storeFirebaseUid, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        status = null,
        startDate = null,
        endDate = null,
      } = options;

      // Query para disputes
      const disputeQuery = { storeFirebaseUid };
      if (status) disputeQuery.status = status;
      if (startDate || endDate) {
        disputeQuery.receivedAt = {};
        if (startDate) disputeQuery.receivedAt.$gte = new Date(startDate);
        if (endDate) disputeQuery.receivedAt.$lte = new Date(endDate);
      }

      // Query para settlements
      const settlementQuery = { storeFirebaseUid };
      if (startDate || endDate) {
        settlementQuery.receivedAt = {};
        if (startDate) settlementQuery.receivedAt.$gte = new Date(startDate);
        if (endDate) settlementQuery.receivedAt.$lte = new Date(endDate);
      }

      const [disputes, settlements] = await Promise.all([
        HandshakeDispute.find(disputeQuery)
          .sort({ receivedAt: -1 })
          .limit(limit)
          .skip(skip),
        HandshakeSettlement.find(settlementQuery)
          .populate("relatedDispute")
          .sort({ receivedAt: -1 })
          .limit(limit)
          .skip(skip),
      ]);

      return {
        disputes,
        settlements,
        summary: await this.getNegotiationSummary(storeFirebaseUid),
      };
    } catch (error) {
      console.error(
        `[HANDSHAKE] Erro ao buscar histórico de negociações para store ${storeFirebaseUid}:`,
        error
      );
      throw error;
    }
  }

  // Método para obter resumo das negociações
  async getNegotiationSummary(storeFirebaseUid) {
    try {
      const [disputeStats, settlementStats] = await Promise.all([
        HandshakeDispute.aggregate([
          { $match: { storeFirebaseUid } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              avgTimeRemaining: {
                $avg: {
                  $divide: [
                    { $subtract: ["$expiresAt", "$receivedAt"] },
                    1000 * 60,
                  ],
                },
              },
            },
          },
        ]),
        HandshakeSettlement.aggregate([
          { $match: { storeFirebaseUid } },
          {
            $group: {
              _id: "$settlementResult",
              count: { $sum: 1 },
              avgNegotiationTime: {
                $avg: "$negotiationTimeline.totalNegotiationTime",
              },
              totalMerchantLiability: {
                $sum: "$financialImpact.merchantLiability.value",
              },
            },
          },
        ]),
      ]);

      // Calcular estatísticas
      const totalDisputes = disputeStats.reduce(
        (sum, stat) => sum + stat.count,
        0
      );
      const pendingDisputes =
        disputeStats.find((stat) => stat._id === "PENDING")?.count || 0;
      const resolvedDisputes = disputeStats
        .filter((stat) => stat._id !== "PENDING")
        .reduce((sum, stat) => sum + stat.count, 0);

      const totalSettlements = settlementStats.reduce(
        (sum, stat) => sum + stat.count,
        0
      );
      const acceptedSettlements =
        settlementStats.find((stat) => stat._id === "ACCEPTED")?.count || 0;
      const rejectedSettlements =
        settlementStats.find((stat) => stat._id === "REJECTED")?.count || 0;

      return {
        disputes: {
          total: totalDisputes,
          pending: pendingDisputes,
          resolved: resolvedDisputes,
          resolutionRate:
            totalDisputes > 0
              ? ((resolvedDisputes / totalDisputes) * 100).toFixed(1)
              : 0,
          breakdown: disputeStats,
        },
        settlements: {
          total: totalSettlements,
          accepted: acceptedSettlements,
          rejected: rejectedSettlements,
          acceptanceRate:
            totalSettlements > 0
              ? ((acceptedSettlements / totalSettlements) * 100).toFixed(1)
              : 0,
          breakdown: settlementStats,
        },
        financialImpact: {
          totalLiability: settlementStats.reduce(
            (sum, stat) => sum + (stat.totalMerchantLiability || 0),
            0
          ),
          currency: "BRL",
        },
      };
    } catch (error) {
      console.error(
        `[HANDSHAKE] Erro ao calcular resumo de negociações para store ${storeFirebaseUid}:`,
        error
      );
      throw error;
    }
  }

  // Método para verificar e atualizar disputes expirados
  async checkAndUpdateExpiredDisputes() {
    try {
      const expiredCount = await this.ifoodService.checkExpiredDisputes();
      // console.log(
      //   `[HANDSHAKE] Verificação de expiração concluída: ${expiredCount} disputes expirados`
      // );
      return expiredCount;
    } catch (error) {
      console.error("[HANDSHAKE] Erro ao verificar disputes expirados:", error);
      throw error;
    }
  }

  // Método para validar dados de contraproposta
  validateAlternativeData(alternativeData) {
    const errors = [];

    if (!alternativeData.type) {
      errors.push("Tipo da alternativa é obrigatório");
    }

    const validTypes = [
      "REFUND",
      "PARTIAL_REFUND",
      "REPLACEMENT",
      "VOUCHER",
      "CUSTOM",
    ];
    if (alternativeData.type && !validTypes.includes(alternativeData.type)) {
      errors.push(`Tipo inválido. Deve ser um de: ${validTypes.join(", ")}`);
    }

    if (alternativeData.type === "PARTIAL_REFUND" && !alternativeData.amount) {
      errors.push("Valor é obrigatório para reembolso parcial");
    }

    if (alternativeData.amount && !alternativeData.amount.value) {
      errors.push("Valor do amount é obrigatório");
    }

    if (alternativeData.items && Array.isArray(alternativeData.items)) {
      alternativeData.items.forEach((item, index) => {
        if (!item.id) errors.push(`Item ${index + 1}: ID é obrigatório`);
        if (!item.name) errors.push(`Item ${index + 1}: Nome é obrigatório`);
        if (!item.quantity || item.quantity < 1)
          errors.push(`Item ${index + 1}: Quantidade deve ser maior que 0`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Método para criar uma resposta padrão baseada no tipo de disputa
  createDefaultResponse(disputeType, responseType) {
    const responses = {
      QUALITY: {
        ACCEPT:
          "Aceitamos a reclamação sobre a qualidade do produto e iremos proceder com a solução adequada.",
        REJECT:
          "Após análise, não identificamos problemas na qualidade do produto conforme nossos padrões.",
        ALTERNATIVE: {
          type: "PARTIAL_REFUND",
          description:
            "Oferecemos reembolso parcial devido à questão de qualidade relatada.",
        },
      },
      MISSING_ITEMS: {
        ACCEPT:
          "Confirmamos a falta de itens no pedido e iremos proceder com a reposição ou reembolso.",
        REJECT: "Conferimos e todos os itens foram enviados conforme o pedido.",
        ALTERNATIVE: {
          type: "REPLACEMENT",
          description:
            "Oferecemos a reposição dos itens faltantes em uma próxima entrega.",
        },
      },
      WRONG_ITEMS: {
        ACCEPT: "Reconhecemos o erro no pedido e iremos corrigir a situação.",
        REJECT:
          "Verificamos e os itens enviados estão corretos conforme o pedido.",
        ALTERNATIVE: {
          type: "REPLACEMENT",
          description: "Oferecemos a troca pelos itens corretos.",
        },
      },
      DELAY: {
        ACCEPT:
          "Reconhecemos o atraso na entrega e nos desculpamos pelo inconveniente.",
        REJECT: "A entrega foi realizada dentro do prazo estimado.",
        ALTERNATIVE: {
          type: "VOUCHER",
          description:
            "Oferecemos um voucher de desconto para compensar o atraso.",
        },
      },
      OTHER: {
        ACCEPT:
          "Aceitamos a reclamação e iremos trabalhar para resolver a situação.",
        REJECT: "Após análise, não encontramos fundamento para a reclamação.",
        ALTERNATIVE: {
          type: "CUSTOM",
          description:
            "Propomos uma solução personalizada para resolver a questão.",
        },
      },
    };

    return (
      responses[disputeType]?.[responseType] || responses.OTHER[responseType]
    );
  }
}

module.exports = HandshakeNegotiationService;
