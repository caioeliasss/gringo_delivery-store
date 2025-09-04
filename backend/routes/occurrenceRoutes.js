const express = require("express");
const router = express.Router();
const notificationService = require("../services/notificationService");
// Modelo de Ocorrência
const Occurrence = require("../models/Occurrence");
const emailService = require("../services/emailService");

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
router.get("/:id", async (req, res) => {
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

    // Criar nova ocorrência
    const newOccurrence = new Occurrence({
      description,
      type,
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

// GET - Estatísticas de ocorrências
router.get("/stats/summary", async (req, res) => {
  try {
    const totalOcorrencias = await Occurrence.countDocuments();
    const ocorrenciasAbertas = await Occurrence.countDocuments({
      status: "ABERTO",
    });
    const ocorrenciasFechadas = await Occurrence.countDocuments({
      status: "FECHADO",
    });
    const ocorrenciasPendentes = await Occurrence.countDocuments({
      status: "PENDENTE",
    });

    // Contagem por tipo
    const tiposOcorrencia = await Occurrence.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      total: totalOcorrencias,
      abertas: ocorrenciasAbertas,
      fechadas: ocorrenciasFechadas,
      pendentes: ocorrenciasPendentes,
      porTipo: tiposOcorrencia,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas de ocorrências:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar estatísticas", error: error.message });
  }
});

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

module.exports = router;
