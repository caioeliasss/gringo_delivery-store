/**
 * Endpoint simulado para polling do iFood
 *
 * Este arquivo adiciona rotas de teste para simular o polling do iFood
 * sem depender da API real. Útil para desenvolvimento e testes.
 *
 * Adicione estas rotas ao seu server.js ou crie um arquivo separado para testes.
 */

const express = require("express");
const IfoodService = require("../services/ifoodService");

const router = express.Router();

// Simulador de eventos para teste
class HandshakeEventGenerator {
  static generateDispute(customData = {}) {
    const disputeTypes = [
      "QUALITY",
      "MISSING_ITEMS",
      "WRONG_ITEMS",
      "DELAY",
      "OTHER",
    ];
    const disputeType =
      customData.disputeType ||
      disputeTypes[Math.floor(Math.random() * disputeTypes.length)];

    const eventId = `event_dispute_${Date.now()}_${Math.floor(
      Math.random() * 1000
    )}`;
    const disputeId = `dispute_${Date.now()}_${Math.floor(
      Math.random() * 1000
    )}`;
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      id: eventId,
      eventType: "HANDSHAKE_DISPUTE",
      orderId: orderId,
      disputeId: disputeId,
      merchantId:
        customData.merchantId || "e43783c9-ef69-43e4-b600-1cb5cbf10acf",
      disputeType: disputeType,
      description:
        customData.description || `Problema de ${disputeType.toLowerCase()}`,
      customerComplaint:
        customData.customerComplaint ||
        "Cliente reportou problema com o pedido",
      media: customData.media || [],
      disputedItems: customData.disputedItems || [
        {
          id: "item_123",
          name: "Pizza Margherita",
          quantity: 1,
          price: { value: 25.9, currency: "BRL" },
        },
      ],
      availableAlternatives: customData.availableAlternatives || [
        { type: "REFUND", description: "Reembolso total" },
        { type: "PARTIAL_REFUND", description: "Reembolso parcial" },
      ],
      expiresAt: new Date(
        Date.now() + (customData.hoursToExpire || 24) * 60 * 60 * 1000
      ),
      createdAt: new Date(),
      ...customData,
    };
  }

  static generateSettlement(disputeId, customData = {}) {
    const settlementResults = [
      "ACCEPTED",
      "REJECTED",
      "ALTERNATIVE_ACCEPTED",
      "AUTOMATIC_TIMEOUT",
    ];
    const result =
      customData.settlementResult ||
      settlementResults[Math.floor(Math.random() * settlementResults.length)];

    const eventId = `event_settlement_${Date.now()}_${Math.floor(
      Math.random() * 1000
    )}`;
    const orderId = customData.orderId || `order_${Date.now()}`;

    return {
      id: eventId,
      eventType: "HANDSHAKE_SETTLEMENT",
      eventId: eventId,
      orderId: orderId,
      disputeId: disputeId,
      merchantId:
        customData.merchantId || "e43783c9-ef69-43e4-b600-1cb5cbf10acf",
      originalDisputeEventId:
        customData.originalDisputeEventId ||
        `event_dispute_${Date.now() - 1000}_${Math.floor(
          Math.random() * 1000
        )}`,
      settlementResult: result,
      settlementDetails: {
        type: result === "ACCEPTED" ? "REFUND" : "PARTIAL_REFUND",
        description: `Settlement: ${result}`,
        amount: { value: 25.9, currency: "BRL" },
      },
      decisionMaker: customData.decisionMaker || "MERCHANT",
      negotiationTimeline: {
        disputeCreatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        settlementReachedAt: new Date(),
      },
      status: customData.status || "PROCESSED",
      createdAt: new Date(),
      ...customData,
    };
  }
}

// ========================================
// ROTAS DE SIMULAÇÃO
// ========================================

/**
 * POST /api/test/handshake/dispute
 * Simula criação de um novo dispute
 */
router.post("/dispute", async (req, res) => {
  try {
    const { storeFirebaseUid, customData } = req.body;

    const dispute = HandshakeEventGenerator.generateDispute(customData);

    // Processar usando o IfoodService
    const ifoodService = new IfoodService();
    await ifoodService.processEvents([dispute], storeFirebaseUid);

    res.status(200).json({
      success: true,
      message: "Dispute simulado criado com sucesso",
      data: {
        eventId: dispute.id,
        disputeId: dispute.disputeId,
        orderId: dispute.orderId,
        disputeType: dispute.disputeType,
        expiresAt: dispute.expiresAt,
      },
    });
  } catch (error) {
    console.error("Erro ao simular dispute:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao simular dispute",
      error: error.message,
    });
  }
});

/**
 * POST /api/test/handshake/settlement
 * Simula criação de um settlement
 */
router.post("/settlement", async (req, res) => {
  try {
    const { disputeId, storeFirebaseUid, customData } = req.body;

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message: "disputeId é obrigatório",
      });
    }

    // Se não tiver originalDisputeEventId, tentar buscar no banco ou usar um padrão
    const originalDisputeEventId =
      customData?.originalDisputeEventId ||
      `event_dispute_related_to_${disputeId}`;

    const settlement = HandshakeEventGenerator.generateSettlement(disputeId, {
      ...customData,
      originalDisputeEventId: originalDisputeEventId,
    });

    // Processar usando o IfoodService
    const ifoodService = new IfoodService();
    await ifoodService.processEvents([settlement], storeFirebaseUid);

    res.status(200).json({
      success: true,
      message: "Settlement simulado criado com sucesso",
      data: {
        eventId: settlement.eventId,
        disputeId: settlement.disputeId,
        originalDisputeEventId: settlement.originalDisputeEventId,
        settlementResult: settlement.settlementResult,
      },
    });
  } catch (error) {
    console.error("Erro ao simular settlement:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao simular settlement",
      error: error.message,
    });
  }
});

/**
 * POST /api/test/handshake/urgent-dispute
 * Simula um dispute urgente (expira em 1 hora)
 */
router.post("/urgent-dispute", async (req, res) => {
  try {
    const { storeFirebaseUid } = req.body;

    const urgentDispute = HandshakeEventGenerator.generateDispute({
      disputeType: "QUALITY",
      description: "URGENTE: Produto com problema grave de qualidade",
      hoursToExpire: 1, // 1 hora
    });

    const ifoodService = new IfoodService();
    await ifoodService.processEvents([urgentDispute], storeFirebaseUid);

    res.status(200).json({
      success: true,
      message: "Dispute urgente criado (expira em 1 hora)",
      data: {
        eventId: urgentDispute.id,
        disputeId: urgentDispute.disputeId,
        expiresAt: urgentDispute.expiresAt,
        timeRemainingMinutes: 60,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao criar dispute urgente",
      error: error.message,
    });
  }
});

/**
 * POST /api/test/handshake/critical-dispute
 * Simula um dispute crítico (expira em 15 minutos)
 */
router.post("/critical-dispute", async (req, res) => {
  try {
    const { storeFirebaseUid } = req.body;

    const criticalDispute = HandshakeEventGenerator.generateDispute({
      disputeType: "QUALITY",
      description: "CRÍTICO: Situação que requer ação imediata",
      hoursToExpire: 0.25, // 15 minutos
    });

    const ifoodService = new IfoodService();
    await ifoodService.processEvents([criticalDispute], storeFirebaseUid);

    res.status(200).json({
      success: true,
      message: "Dispute crítico criado (expira em 15 minutos)",
      data: {
        eventId: criticalDispute.id,
        disputeId: criticalDispute.disputeId,
        expiresAt: criticalDispute.expiresAt,
        timeRemainingMinutes: 15,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao criar dispute crítico",
      error: error.message,
    });
  }
});

/**
 * POST /api/test/handshake/complete-flow
 * Simula um fluxo completo: dispute → settlement
 */
router.post("/complete-flow", async (req, res) => {
  try {
    const { storeFirebaseUid, settlementResult } = req.body;

    // 1. Criar dispute
    const dispute = HandshakeEventGenerator.generateDispute({
      disputeType: "MISSING_ITEMS",
      description: "Teste de fluxo completo - itens faltantes",
    });

    const ifoodService = new IfoodService();
    await ifoodService.processEvents([dispute], storeFirebaseUid);

    // 2. Aguardar um pouco
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Criar settlement com referência correta ao dispute
    const settlement = HandshakeEventGenerator.generateSettlement(
      dispute.disputeId,
      {
        orderId: dispute.orderId,
        originalDisputeEventId: dispute.id,
        settlementResult: settlementResult || "ALTERNATIVE_ACCEPTED",
      }
    );

    await ifoodService.processEvents([settlement], storeFirebaseUid);

    res.status(200).json({
      success: true,
      message: "Fluxo completo simulado (dispute → settlement)",
      data: {
        dispute: {
          eventId: dispute.id,
          disputeId: dispute.disputeId,
          orderId: dispute.orderId,
        },
        settlement: {
          eventId: settlement.id,
          originalDisputeEventId: settlement.originalDisputeEventId,
          settlementResult: settlement.settlementResult,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao simular fluxo completo",
      error: error.message,
    });
  }
});

/**
 * POST /api/test/handshake/batch-events
 * Simula múltiplos eventos de uma vez
 */
router.post("/batch-events", async (req, res) => {
  try {
    const {
      storeFirebaseUid,
      disputeCount = 3,
      settlementCount = 1,
    } = req.body;

    const events = [];
    const disputes = [];

    // Gerar disputes
    for (let i = 0; i < disputeCount; i++) {
      const dispute = HandshakeEventGenerator.generateDispute({
        description: `Dispute em lote #${i + 1}`,
      });
      events.push(dispute);
      disputes.push(dispute);
    }

    // Gerar settlements (usar disputes criados acima)
    for (let i = 0; i < settlementCount && i < disputes.length; i++) {
      const relatedDispute = disputes[i];
      const settlement = HandshakeEventGenerator.generateSettlement(
        relatedDispute.disputeId,
        {
          orderId: relatedDispute.orderId,
          originalDisputeEventId: relatedDispute.id,
        }
      );
      events.push(settlement);
    }

    // Processar todos os eventos
    const ifoodService = new IfoodService();
    await ifoodService.processEvents(events, storeFirebaseUid);

    res.status(200).json({
      success: true,
      message: `${events.length} eventos simulados em lote`,
      data: {
        totalEvents: events.length,
        disputes: disputeCount,
        settlements: settlementCount,
        events: events.map((e) => ({
          id: e.id || e.eventId,
          type: e.eventType,
          disputeId: e.disputeId,
          originalDisputeEventId: e.originalDisputeEventId,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao simular eventos em lote",
      error: error.message,
    });
  }
});

/**
 * GET /api/test/handshake/status
 * Verifica status dos dados de teste
 */
router.get("/status", async (req, res) => {
  try {
    const HandshakeDispute = require("../models/HandshakeDispute");
    const HandshakeSettlement = require("../models/HandshakeSettlement");

    const [
      totalDisputes,
      pendingDisputes,
      totalSettlements,
      recentDisputes,
      recentSettlements,
    ] = await Promise.all([
      HandshakeDispute.countDocuments(),
      HandshakeDispute.countDocuments({ status: "PENDING" }),
      HandshakeSettlement.countDocuments(),
      HandshakeDispute.find().sort({ createdAt: -1 }).limit(5),
      HandshakeSettlement.find().sort({ createdAt: -1 }).limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDisputes,
          pendingDisputes,
          totalSettlements,
        },
        recent: {
          disputes: recentDisputes.map((d) => ({
            disputeId: d.disputeId,
            status: d.status,
            disputeType: d.disputeType,
            createdAt: d.createdAt,
          })),
          settlements: recentSettlements.map((s) => ({
            disputeId: s.disputeId,
            settlementResult: s.settlementResult,
            createdAt: s.createdAt,
          })),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao verificar status",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/test/handshake/cleanup
 * Remove dados de teste
 */
router.delete("/cleanup", async (req, res) => {
  try {
    const HandshakeDispute = require("../models/HandshakeDispute");
    const HandshakeSettlement = require("../models/HandshakeSettlement");

    const [disputeResult, settlementResult] = await Promise.all([
      HandshakeDispute.deleteMany({
        $or: [
          { disputeId: { $regex: /^dispute_\d+_\d+$/ } },
          { eventId: { $regex: /^event_dispute_/ } },
        ],
      }),
      HandshakeSettlement.deleteMany({
        $or: [
          { eventId: { $regex: /^event_settlement_/ } },
          { disputeId: { $regex: /^dispute_\d+_\d+$/ } },
        ],
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Dados de teste removidos",
      data: {
        disputesRemoved: disputeResult.deletedCount,
        settlementsRemoved: settlementResult.deletedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao limpar dados",
      error: error.message,
    });
  }
});

module.exports = router;
