const express = require("express");
const router = express.Router();
const notificationService = require("../services/notificationService");
// Modelo de Ocorrência
const Occurrence = require("../models/Occurrence");
const emailService = require("../services/emailService");
const aiService = require("../services/aiService");

// GET - Buscar todas as ocorrências
router.get("/", async (req, res) => {
  try {
    const occurrences = await Occurrence.find().sort({ createdAt: -1 });

    res.status(200).json(occurrences);
  } catch (error) {
    console.error("Erro ao buscar ocorrências:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar ocorrências", error: error.message });
  }
});

// GET - Buscar ocorrências filtradas por roles do support team
router.get("/filtered/:roles", async (req, res) => {
  try {
    const { roles } = req.params;

    // Converter a string de roles em array
    let userRoles = [];
    try {
      userRoles = roles.split(",").map((role) => role.trim());
    } catch (error) {
      return res.status(400).json({
        message: "Formato de roles inválido. Use roles separados por vírgula.",
      });
    }

    let query = {};

    // Se o usuário é admin, buscar todas as ocorrências
    if (userRoles.includes("admin")) {
      query = {};
    } else {
      // Se não é admin, filtrar por roles que o usuário tem acesso
      query = {
        $or: [
          // Ocorrências que não têm role definido (acessível a todos)
          { role: { $exists: false } },
          { role: { $size: 0 } },
          // Ocorrências que têm pelo menos um role que o usuário possui
          { role: { $in: userRoles } },
        ],
      };
    }

    const occurrences = await Occurrence.find(query).sort({ createdAt: -1 });

    res.status(200).json(occurrences);
  } catch (error) {
    console.error("Erro ao buscar ocorrências filtradas:", error);
    res.status(500).json({
      message: "Erro ao buscar ocorrências filtradas",
      error: error.message,
    });
  }
});

// GET - Buscar ocorrências de um motoboy específico
router.get("/motoboy/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar todas as ocorrências deste motoboy
    const occurrences = await Occurrence.find({ motoboyId: id }).sort({
      createdAt: -1,
    });

    res.status(200).json(occurrences);
  } catch (error) {
    console.error("Erro ao buscar ocorrências do motoboy:", error);
    res.status(500).json({
      message: "Erro ao buscar ocorrências do motoboy",
      error: error.message,
    });
  }
});

// GET - Buscar uma ocorrência específica por ID
router.get("/details/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const occurrence = await Occurrence.findById(id);

    if (!occurrence) {
      return res.status(404).json({ message: "Ocorrência não encontrada" });
    }

    res.status(200).json(occurrence);
  } catch (error) {
    console.error("Erro ao buscar ocorrência:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar ocorrência", error: error.message });
  }
});

// POST - Criar nova ocorrência
router.post("/", async (req, res) => {
  try {
    const {
      name,
      firebaseUid,
      description,
      type,
      motoboyId,
      storeId,
      customerId,
      orderId,
      travelId,
      coordinates,
    } = req.body;

    let role = ["admin"];
    switch (type) {
      case "ATENDIMENTO":
        role.push("general");
        break;
      case "CLIENTE":
        role.push("general");
        break;
      case "ENTREGA":
        role.push("logistics");
        break;
      case "PAGAMENTO":
        role.push("finances");
        break;
      case "EVENTO":
        role.push("general");
        break;
      case "APP":
        role.push("general");
        break;
      case "OUTRO":
        role.push("general");
        break;
      case "ESTABELECIMENTO":
        role.push("general");
        break;
      case "PRODUTO":
        role.push("general");
        break;
      case "PEDIDO":
        role.push("general");
        break;
      case "MOTOBOY":
        role.push("logistics");
        break;
      case "ENTREGADOR":
        role.push("logistics");
        break;
      default:
        role.push("general");
        break;
    }

    // Criar nova ocorrência
    const newOccurrence = new Occurrence({
      description,
      type,
      role,
      travelId: travelId || null,
      motoboyId: motoboyId || null,
      storeId: storeId || null,
      customerId: customerId || null,
      orderId: orderId || null,
      status: "ABERTO",
      date: new Date(),
      coordinates: coordinates || null,
      firebaseUid: firebaseUid || null,
    });

    // Gera resposta automática da IA baseada na descrição da ocorrência
    try {
      newOccurrence.answerAi = await aiService.generateOccurrenceResponse(
        description,
        type
      );
    } catch (error) {
      console.error("Erro ao gerar resposta da IA:", error);
      // Continua o processo mesmo se a IA falhar
      newOccurrence.answerAi =
        "Sua ocorrência foi registrada e nossa equipe irá analisar em breve.";
    }

    const savedOccurrence = await newOccurrence.save();

    notificationService.notifySupport({
      title: "Nova Ocorrência",
      message: `Nova ocorrência registrada por ${name}`,
      body: `Nova ocorrência registrada por ${name}`,
      data: {
        occurrenceId: savedOccurrence._id,
        type: type,
        status: "ABERTO",
      },
    });

    await emailService.notifySupportOccurrence(savedOccurrence);

    res.status(201).json(savedOccurrence);
  } catch (error) {
    console.error("Erro ao criar ocorrência:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar ocorrência", error: error.message });
  }
});

// PUT - Atualizar ocorrência (para responder ou finalizar)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      status,
      motoboyId,
      storeId,
      customerId,
      orderId,
      coordinates,
      answer,
      firebaseUid,
    } = req.body;

    // Verificar se a ocorrência existe
    const occurrence = await Occurrence.findById(id);
    if (!occurrence) {
      return res.status(404).json({ message: "Ocorrência não encontrada" });
    }

    // Atualizar campos (apenas os que foram enviados)
    if (name) occurrence.name = name;
    if (description) occurrence.description = description;
    if (type) occurrence.type = type;
    if (status) occurrence.status = status;
    if (motoboyId !== undefined) occurrence.motoboyId = motoboyId;
    if (storeId !== undefined) occurrence.storeId = storeId;
    if (customerId !== undefined) occurrence.customerId = customerId;
    if (orderId !== undefined) occurrence.orderId = orderId;
    if (coordinates) occurrence.coordinates = coordinates;
    if (answer) occurrence.answer = answer;
    if (firebaseUid) occurrence.firebaseUid = firebaseUid;

    const updatedOccurrence = await occurrence.save();

    notificationService.createGenericNotification({
      title: "Ocorrência Atualizada",
      message: `A ocorrência ${updatedOccurrence._id} foi atualizada.`,
      firebaseUid: occurrence.firebaseUid,
      type: "OCCURRENCE_CHANGE",
      data: {
        occurrenceId: updatedOccurrence._id,
        type: "OCCURRENCE_CHANGE",
        status: updatedOccurrence.status,
      },
    });

    await emailService.notifyStatusChange(updatedOccurrence);

    res.status(200).json(updatedOccurrence);
  } catch (error) {
    console.error("Erro ao atualizar ocorrência:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar ocorrência", error: error.message });
  }
});

// DELETE - Remover ocorrência
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a ocorrência existe
    const occurrence = await Occurrence.findById(id);
    if (!occurrence) {
      return res.status(404).json({ message: "Ocorrência não encontrada" });
    }

    // Remover ocorrência
    await Occurrence.findByIdAndDelete(id);

    res.status(200).json({ message: "Ocorrência removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover ocorrência:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover ocorrência", error: error.message });
  }
});

// GET - Estatísticas de ocorrências para relatórios
router.get("/stats/summary", async (req, res) => {
  try {
    const { startDate, endDate, roles } = req.query;

    console.log("Parâmetros recebidos:", { startDate, endDate, roles });

    // Construir filtro de data
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Ajustar fim do dia para incluir todo o dia
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };
    } else {
      // Fallback para período padrão se não fornecido
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    }

    // Filtrar por roles se fornecido
    let roleFilter = {};
    if (roles && roles !== "admin") {
      const userRoles = roles.split(",").map((role) => role.trim());
      if (!userRoles.includes("admin")) {
        roleFilter = {
          $or: [
            { role: { $exists: false } },
            { role: { $size: 0 } },
            { role: { $in: userRoles } },
          ],
        };
      }
    }

    // Combinar filtros
    const baseFilter = { ...dateFilter, ...roleFilter };

    // Estatísticas básicas
    const totalOcorrencias = await Occurrence.countDocuments(baseFilter);
    const ocorrenciasAbertas = await Occurrence.countDocuments({
      ...baseFilter,
      status: "ABERTO",
    });
    const ocorrenciasFechadas = await Occurrence.countDocuments({
      ...baseFilter,
      status: "FECHADO",
    });
    const ocorrenciasPendentes = await Occurrence.countDocuments({
      ...baseFilter,
      status: "PENDENTE",
    });
    const ocorrenciasEmAndamento = await Occurrence.countDocuments({
      ...baseFilter,
      status: "EM_ANDAMENTO",
    });

    const ocorrencias = await Occurrence.find(baseFilter);

    // Contagem por tipo
    const tiposOcorrencia = await Occurrence.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Contagem por status
    const statusOcorrencia = await Occurrence.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Contagem por prioridade (baseada no tipo)
    const prioridadeMap = {
      PAGAMENTO: "Alta",
      ENTREGA: "Alta",
      PRODUTO: "Alta",
      CLIENTE: "Média",
      ESTABELECIMENTO: "Média",
      PEDIDO: "Média",
      APP: "Baixa",
      EVENTO: "Baixa",
      ATENDIMENTO: "Média",
      MOTOBOY: "Média",
      ENTREGADOR: "Média",
      OUTRO: "Baixa",
    };

    const prioridadeStats = tiposOcorrencia.reduce((acc, item) => {
      const prioridade = prioridadeMap[item._id] || "Baixa";
      acc[prioridade] = (acc[prioridade] || 0) + item.count;
      return acc;
    }, {});

    // Tempo médio de resolução (simulado por enquanto)
    // TODO: Implementar cálculo real baseado em timestamps de criação e fechamento
    const tempoMedioResolucao = 2.4;

    res.status(200).json({
      total: totalOcorrencias,
      abertas: ocorrenciasAbertas,
      fechadas: ocorrenciasFechadas,
      pendentes: ocorrenciasPendentes,
      emAndamento: ocorrenciasEmAndamento,
      porTipo: tiposOcorrencia,
      porStatus: statusOcorrencia,
      porPrioridade: prioridadeStats,
      tempoMedioResolucao,
      ocorrencias,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas de ocorrências:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar estatísticas", error: error.message });
  }
});

// GET - Buscar ocorrências por usuário Firebase
router.get("/firebase/:firebaseUid", async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    // Buscar todas as ocorrências deste usuário Firebase
    const occurrences = await Occurrence.find({ firebaseUid }).sort({
      createdAt: -1,
    });

    res.status(200).json(occurrences);
  } catch (error) {
    console.error("Erro ao buscar ocorrências do usuário Firebase:", error);
    res.status(500).json({
      message: "Erro ao buscar ocorrências do usuário Firebase",
      error: error.message,
    });
  }
});

// GET - Buscar ocorrências recentes para relatórios
router.get("/reports/recent", async (req, res) => {
  try {
    const { limit = 10, roles, startDate, endDate } = req.query;

    // Construir filtro de data
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Ajustar fim do dia para incluir todo o dia
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };
    } else {
      // Fallback para último mês se não fornecido
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    }

    // Filtrar por roles se fornecido
    let roleFilter = {};
    if (roles && roles !== "admin") {
      const userRoles = roles.split(",").map((role) => role.trim());
      if (!userRoles.includes("admin")) {
        roleFilter = {
          $or: [
            { role: { $exists: false } },
            { role: { $size: 0 } },
            { role: { $in: userRoles } },
          ],
        };
      }
    }

    const filter = { ...dateFilter, ...roleFilter };

    const occurrences = await Occurrence.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json(occurrences);
  } catch (error) {
    console.error("Erro ao buscar ocorrências recentes:", error);
    res.status(500).json({
      message: "Erro ao buscar ocorrências recentes",
      error: error.message,
    });
  }
});

// GET - Análise temporal de ocorrências
router.get("/reports/timeline", async (req, res) => {
  try {
    const { period = "month", groupBy = "day" } = req.query;

    // Construir pipeline de agregação baseado no período
    let matchStage = {};
    let groupStage = {};

    const now = new Date();
    switch (period) {
      case "week":
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchStage = { createdAt: { $gte: startOfWeek } };
        break;
      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchStage = { createdAt: { $gte: startOfMonth } };
        break;
      case "year":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        matchStage = { createdAt: { $gte: startOfYear } };
        break;
    }

    // Definir agrupamento
    switch (groupBy) {
      case "hour":
        groupStage = {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" },
          },
        };
        break;
      case "day":
        groupStage = {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
        };
        break;
      case "month":
        groupStage = {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
        };
        break;
    }

    const timeline = await Occurrence.aggregate([
      { $match: matchStage },
      {
        $group: {
          ...groupStage,
          count: { $sum: 1 },
          types: { $push: "$type" },
          statuses: { $push: "$status" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json(timeline);
  } catch (error) {
    console.error("Erro ao buscar timeline de ocorrências:", error);
    res.status(500).json({
      message: "Erro ao buscar timeline",
      error: error.message,
    });
  }
});

// GET - Top problemas mais frequentes
router.get("/reports/top-issues", async (req, res) => {
  try {
    const { limit = 5, period = "month" } = req.query;

    // Filtro de período
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "week":
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: startOfWeek } };
        break;
      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
        break;
      case "quarter":
        const quarterStart = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1
        );
        dateFilter = { createdAt: { $gte: quarterStart } };
        break;
    }

    const topIssues = await Occurrence.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          averageResolutionTime: { $avg: "$resolutionTime" }, // Assumindo que existe este campo
          mostRecentCase: { $max: "$createdAt" },
          statusDistribution: {
            $push: "$status",
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json(topIssues);
  } catch (error) {
    console.error("Erro ao buscar top problemas:", error);
    res.status(500).json({
      message: "Erro ao buscar top problemas",
      error: error.message,
    });
  }
});

// GET - Performance de resolução
router.get("/reports/resolution-performance", async (req, res) => {
  try {
    const { period = "month" } = req.query;

    // Filtro de período
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "week":
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: startOfWeek } };
        break;
      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
        break;
    }

    const performance = await Occurrence.aggregate([
      { $match: { ...dateFilter, status: "FECHADO" } },
      {
        $addFields: {
          resolutionTimeHours: {
            $divide: [
              { $subtract: ["$updatedAt", "$createdAt"] },
              1000 * 60 * 60, // Converter para horas
            ],
          },
        },
      },
      {
        $group: {
          _id: "$type",
          avgResolutionTime: { $avg: "$resolutionTimeHours" },
          minResolutionTime: { $min: "$resolutionTimeHours" },
          maxResolutionTime: { $max: "$resolutionTimeHours" },
          totalResolved: { $sum: 1 },
        },
      },
      { $sort: { avgResolutionTime: 1 } },
    ]);

    // Calcular estatísticas gerais
    const overallStats = await Occurrence.aggregate([
      { $match: { ...dateFilter, status: "FECHADO" } },
      {
        $addFields: {
          resolutionTimeHours: {
            $divide: [
              { $subtract: ["$updatedAt", "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgOverall: { $avg: "$resolutionTimeHours" },
          totalResolved: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      byType: performance,
      overall: overallStats[0] || { avgOverall: 0, totalResolved: 0 },
    });
  } catch (error) {
    console.error("Erro ao buscar performance de resolução:", error);
    res.status(500).json({
      message: "Erro ao buscar performance",
      error: error.message,
    });
  }
});

// POST - Testar resposta da IA para uma descrição
router.post("/test-ai-response", async (req, res) => {
  try {
    const { description, type = "OUTRO" } = req.body;

    if (!description) {
      return res.status(400).json({
        message: "Descrição é obrigatória para testar a resposta da IA",
      });
    }

    const aiResponse = await aiService.generateOccurrenceResponse(
      description,
      type
    );
    const priority = aiService.analyzePriority(description, type);

    res.status(200).json({
      originalDescription: description,
      type,
      aiResponse,
      suggestedPriority: priority,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao testar resposta da IA:", error);
    res.status(500).json({
      message: "Erro ao gerar resposta de teste da IA",
      error: error.message,
    });
  }
});

// PUT - Regenerar resposta da IA para uma ocorrência existente
router.put("/:id/regenerate-ai-response", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a ocorrência existe
    const occurrence = await Occurrence.findById(id);
    if (!occurrence) {
      return res.status(404).json({ message: "Ocorrência não encontrada" });
    }

    // Regenerar resposta da IA
    const newAiResponse = await aiService.generateOccurrenceResponse(
      occurrence.description,
      occurrence.type
    );

    // Atualizar ocorrência
    occurrence.answerAi = newAiResponse;
    const updatedOccurrence = await occurrence.save();

    res.status(200).json({
      message: "Resposta da IA regenerada com sucesso",
      occurrence: updatedOccurrence,
      newAiResponse,
    });
  } catch (error) {
    console.error("Erro ao regenerar resposta da IA:", error);
    res.status(500).json({
      message: "Erro ao regenerar resposta da IA",
      error: error.message,
    });
  }
});

module.exports = router;
