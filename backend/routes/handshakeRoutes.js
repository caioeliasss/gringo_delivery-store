const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const HandshakeNegotiationService = require("../services/handshakeNegotiationService");
const IfoodService = require("../services/ifoodService");

// Instanciar os serviços
const handshakeService = new HandshakeNegotiationService();

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token de autenticação não fornecido" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido ou expirado" });
  }
};

// ========== ROTAS PARA DISPUTES ==========

// Listar disputes pendentes
router.get("/disputes/pending", authenticateToken, async (req, res) => {
  try {
    const disputes = await handshakeService.getPendingDisputesForStore(
      req.user.uid
    );
    // console.log(
    //   "[HANDSHAKE] 📊 Disputes pendentes encontradas:",
    //   disputes.length
    // );
    res.status(200).json({
      success: true,
      data: disputes,
      count: disputes.length,
    });
  } catch (error) {
    console.error("Erro ao buscar disputes pendentes:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar disputes pendentes",
      error: error.message,
    });
  }
});

// Buscar detalhes de uma disputa específica
router.get("/disputes/:disputeId", authenticateToken, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const disputeDetails = await handshakeService.getDisputeDetails(disputeId);

    res.status(200).json({
      success: true,
      data: disputeDetails,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes da disputa:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar detalhes da disputa",
      error: error.message,
    });
  }
});

// Aceitar uma disputa
router.post(
  "/disputes/:disputeId/accept",
  authenticateToken,
  async (req, res) => {
    try {
      const { disputeId } = req.params;
      const result = await handshakeService.respondToDispute(
        disputeId,
        "ACCEPT",
        {},
        req.user.uid
      );

      res.status(200).json({
        success: true,
        message: "Disputa aceita com sucesso",
        data: result,
      });
    } catch (error) {
      console.error("Erro ao aceitar disputa:", error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: error.message,
      });
    }
  }
);

// Rejeitar uma disputa
router.post(
  "/disputes/:disputeId/reject",
  authenticateToken,
  async (req, res) => {
    try {
      const { disputeId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Motivo da rejeição é obrigatório",
        });
      }

      const result = await handshakeService.respondToDispute(
        disputeId,
        "REJECT",
        { reason },
        req.user.uid
      );

      res.status(200).json({
        success: true,
        message: "Disputa rejeitada com sucesso",
        data: result,
      });
    } catch (error) {
      console.error("Erro ao rejeitar disputa:", error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: error.message,
      });
    }
  }
);

// Fazer contraproposta
router.post(
  "/disputes/:disputeId/alternative",
  authenticateToken,
  async (req, res) => {
    try {
      const { disputeId } = req.params;
      const { alternative } = req.body;

      if (!alternative) {
        return res.status(400).json({
          success: false,
          message: "Dados da contraproposta são obrigatórios",
        });
      }

      // Validar dados da contraproposta
      const validation = handshakeService.validateAlternativeData(alternative);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dados da contraproposta são inválidos",
          errors: validation.errors,
        });
      }

      const result = await handshakeService.respondToDispute(
        disputeId,
        "ALTERNATIVE",
        { alternative },
        req.user.uid
      );

      res.status(200).json({
        success: true,
        message: "Contraproposta enviada com sucesso",
        data: result,
      });
    } catch (error) {
      console.error("Erro ao enviar contraproposta:", error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: error.message,
      });
    }
  }
);

// ========== ROTAS PARA SETTLEMENTS ==========

// Obter histórico de negociações
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const { limit, skip, status, startDate, endDate } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
      status,
      startDate,
      endDate,
    };

    const history = await handshakeService.getNegotiationHistory(
      req.user.uid,
      options
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico de negociações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar histórico de negociações",
      error: error.message,
    });
  }
});

// Obter resumo das negociações
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const summary = await handshakeService.getNegotiationSummary(req.user.uid);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo de negociações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar resumo de negociações",
      error: error.message,
    });
  }
});

// ========== ROTAS UTILITÁRIAS ==========

// Verificar disputes expirados
router.post("/disputes/check-expired", authenticateToken, async (req, res) => {
  try {
    const expiredCount = await handshakeService.checkAndUpdateExpiredDisputes();

    res.status(200).json({
      success: true,
      message: `${expiredCount} disputes expirados foram atualizados`,
      expiredCount,
    });
  } catch (error) {
    console.error("Erro ao verificar disputes expirados:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar disputes expirados",
      error: error.message,
    });
  }
});

// Obter respostas padrão baseadas no tipo de disputa
router.get(
  "/disputes/default-responses/:disputeType",
  authenticateToken,
  async (req, res) => {
    try {
      const { disputeType } = req.params;

      const defaultResponses = {
        accept: handshakeService.createDefaultResponse(disputeType, "ACCEPT"),
        reject: handshakeService.createDefaultResponse(disputeType, "REJECT"),
        alternative: handshakeService.createDefaultResponse(
          disputeType,
          "ALTERNATIVE"
        ),
      };

      res.status(200).json({
        success: true,
        data: defaultResponses,
      });
    } catch (error) {
      console.error("Erro ao buscar respostas padrão:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao buscar respostas padrão",
        error: error.message,
      });
    }
  }
);

// Validar dados de contraproposta (endpoint helper)
router.post(
  "/disputes/validate-alternative",
  authenticateToken,
  async (req, res) => {
    try {
      const { alternative } = req.body;

      if (!alternative) {
        return res.status(400).json({
          success: false,
          message: "Dados da contraproposta são obrigatórios",
        });
      }

      const validation = handshakeService.validateAlternativeData(alternative);

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error("Erro ao validar contraproposta:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao validar contraproposta",
        error: error.message,
      });
    }
  }
);

// ========== ROTAS ADMIN (FUTURO) ==========

// Estatísticas globais (para admin)
router.get("/admin/stats", authenticateToken, async (req, res) => {
  try {
    // TODO: Implementar verificação de permissão de admin

    const HandshakeDispute = require("../models/HandshakeDispute");
    const HandshakeSettlement = require("../models/HandshakeSettlement");

    const [disputeCount, settlementCount] = await Promise.all([
      HandshakeDispute.countDocuments(),
      HandshakeSettlement.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDisputes: disputeCount,
        totalSettlements: settlementCount,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas",
      error: error.message,
    });
  }
});

module.exports = router;
