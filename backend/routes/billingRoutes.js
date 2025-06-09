const Billing = require("../models/Billing");
const express = require("express");
const router = express.Router();
const asaasService = require("../services/asaasService");

// Criar fatura
const createBilling = async (req, res) => {
  const {
    customerId,
    firebaseUid,
    storeId,
    amount,
    dueDate,
    period,
    type,
    description,
    paymentMethod,
  } = req.body;

  try {
    const billing = new Billing({
      customerId,
      firebaseUid,
      storeId,
      amount,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
      period: period || "MONTHLY",
      type: type || "SUBSCRIPTION",
      description: description || "Fatura mensal",
      paymentMethod: paymentMethod || "PIX",
    });

    await billing.save();

    // Chama o serviço Asaas para criar a fatura
    const asaasInvoice = await asaasService.createInvoice({
      customerId: billing.customerId,
      amount: billing.amount,
      dueDate: billing.dueDate.toISOString().split("T")[0],
      description: billing.description,
      paymentMethod: billing.paymentMethod,
    });

    res.status(201).json({ billing, asaasInvoice });
  } catch (error) {
    console.error("Erro ao criar fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

// Listar faturas
const listBillings = async (req, res) => {
  try {
    const billings = await Billing.find({ firebaseUid: req.user.uid });
    res.status(200).json(billings);
  } catch (error) {
    console.error("Erro ao listar faturas:", error);
    res.status(500).json({ message: error.message });
  }
};

// Consultar fatura
const getBilling = async (req, res) => {
  const { id } = req.params;

  try {
    const billing = await Billing.findById(id);
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }
    res.status(200).json(billing);
  } catch (error) {
    console.error("Erro ao consultar fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

// Atualizar fatura
const updateBilling = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const billing = await Billing.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }
    res.status(200).json(billing);
  } catch (error) {
    console.error("Erro ao atualizar fatura:", error);
    res.status(500).json({ message: error.message });
  }
  // };
};
// ...existing code...

// Verificar status da fatura no Asaas
const checkBillingStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const billing = await Billing.findById(id);
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }

    if (billing.asaasInvoiceId) {
      const asaasInvoice = await asaasService.getInvoice(
        billing.asaasInvoiceId
      );

      // Atualizar status local se necessário
      if (asaasInvoice.status !== billing.status) {
        billing.status =
          asaasInvoice.status === "RECEIVED" ? "PAID" : billing.status;
        await billing.save();
      }

      res.status(200).json({ billing, asaasInvoice });
    } else {
      res.status(200).json({ billing });
    }
  } catch (error) {
    console.error("Erro ao verificar status da fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

router.get("/:id/status", checkBillingStatus);
router.post("/", createBilling);
router.get("/", listBillings);
router.get("/:id", getBilling);
router.put("/:id", updateBilling);

module.exports = router;
