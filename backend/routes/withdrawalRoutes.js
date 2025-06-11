// backend/routes/withdrawalRoutes.js
const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");
const Motoboy = require("../models/Motoboy");
const Withdrawal = require("../models/Withdrawal");
const asaasService = require("../services/asaasService");

// Solicitar saque
const requestWithdrawal = async (req, res) => {
  try {
    const { motoboyId } = req.params;
    const { amount, pixKey, pixKeyType, travels } = req.body;

    // Buscar motoboy
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ error: "Motoboy não encontrado" });
    }

    // Calcular saldo disponível
    const availableBalance = await calculateAvailableBalance(motoboyId);

    if (amount > availableBalance) {
      return res.status(400).json({
        error: "Saldo insuficiente",
        availableBalance,
        requestedAmount: amount,
      });
    }

    // Validar chave PIX
    // const pixValidation = await asaasService.validatePixKey(pixKey, pixKeyType); //TODO verificar endpoint
    // if (!pixValidation.valid) {
    //   return res.status(400).json({ error: "Chave PIX inválida" });
    // }

    // Calcular taxas
    const fees = calculateFees(amount);
    const netAmount = amount - fees.total;

    if (travels && travels.length > 0) {
      // Atualizar viagens no banco de dados
      const travelIds = travels.map((travel) => travel.travelId || travel._id);

      await Travel.updateMany(
        {
          _id: { $in: travelIds },
          "finance.status": "liberado",
        },
        {
          $set: {
            "finance.status": "processando",
            "finance.transactionDate": new Date(),
          },
        }
      );
    }

    // Criar registro de saque
    const withdrawal = new Withdrawal({
      motoboyId,
      amount,
      pixKey,
      pixKeyType,
      netAmount,
      travels: travels
        ? travels.map((travel) => ({
            travelId: travel.travelId || travel._id,
            amount: travel.amount || travel.finance?.value || 0,
          }))
        : [],
      fees: {
        asaasFee: fees.asaas,
        platformFee: fees.platform,
      },
      status: "pending",
    });

    await withdrawal.save();

    // ADICIONAR: Processar automaticamente
    try {
      // console.log("🚀 Processando saque automaticamente...");

      // Atualizar status para processando
      withdrawal.status = "processing";
      withdrawal.processedAt = new Date();
      await withdrawal.save();

      // Criar transferência no Asaas
      const transferData = {
        value: withdrawal.netAmount,
        pixKey: withdrawal.pixKey,
        pixKeyType: withdrawal.pixKeyType,
        description: `Saque ${withdrawal._id} - Gringo Delivery`,
      };

      // console.log("📤 Enviando dados para Asaas:", transferData);
      const asaasTransfer = await asaasService.createPixTransfer(transferData);
      // console.log("✅ Resposta do Asaas:", asaasTransfer);

      // Atualizar com ID da transferência
      withdrawal.asaasTransferId = asaasTransfer.id;
      withdrawal.status =
        asaasTransfer.status === "CONFIRMED" ? "completed" : "processing";

      if (withdrawal.status === "completed") {
        withdrawal.completedAt = new Date();
        await markTravelsAsPaid(withdrawal.motoboyId, withdrawal.travels);
      }

      await withdrawal.save();

      res.json({
        success: true,
        withdrawal,
        asaasTransfer,
        message: "Saque criado e processado com sucesso",
      });
    } catch (processError) {
      console.error("❌ Erro ao processar saque:", processError);

      // Atualizar status para falha
      withdrawal.status = "failed";
      withdrawal.errorMessage = processError.message;
      await withdrawal.save();

      res.status(500).json({
        error: "Saque criado mas falhou no processamento",
        withdrawal,
        details: processError.message,
      });
    }
  } catch (error) {
    console.error("Erro ao solicitar saque:", error);
    res.status(500).json({ error: error.message });
  }
};

const calculateFees = (amount) => {
  const asaasFee = 3.0; // Taxa fixa do Asaas para PIX
  const platformFee = amount * 0.02; // 2% de taxa da plataforma (exemplo)

  return {
    asaas: asaasFee,
    platform: platformFee,
    total: asaasFee + platformFee,
  };
};

const Travel = require("../models/Travel");
const calculateAvailableBalance = async (motoboyId) => {
  const travels = await Travel.find({
    motoboyId,
    "finance.status": "liberado", // Apenas iagens liberadas para saque
    "finance.dueDate": { $lte: new Date() }, // Viagens vencidas
  });

  return travels.reduce((total, travel) => {
    return total + (travel.finance.value || 0);
  }, 0);
};

// CORRIGIR: Função que estava faltando
const markTravelsAsPaid = async (motoboyId, travels) => {
  try {
    if (!travels || travels.length === 0) {
      console.log("⚠️ Nenhuma viagem específica para marcar como paga");
      return;
    }

    const travelIds = travels.map((t) => t.travelId);

    const result = await Travel.updateMany(
      { _id: { $in: travelIds } },
      {
        $set: {
          "finance.status": "pago",
          "finance.transactionDate": new Date(),
        },
      }
    );

    console.log(`✅ ${result.modifiedCount} viagens marcadas como pagas`);
    return result;
  } catch (error) {
    console.error("❌ Erro ao marcar viagens como pagas:", error);
    throw error;
  }
};

// CORRIGIR: Processamento de saque
const processWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ error: "Saque não encontrado" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ error: "Saque já foi processado" });
    }

    console.log("🚀 Processando saque:", withdrawalId);

    // Atualizar status para processando
    withdrawal.status = "processing";
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    // Criar transferência no Asaas
    const transferData = {
      value: withdrawal.netAmount,
      pixKey: withdrawal.pixKey,
      pixKeyType: withdrawal.pixKeyType,
      description: `Saque ${withdrawal._id} - Gringo Delivery`,
    };

    console.log("📤 Dados para Asaas:", transferData);
    const asaasTransfer = await asaasService.createPixTransfer(transferData);
    console.log("✅ Resposta Asaas:", asaasTransfer);

    // Atualizar com ID da transferência
    withdrawal.asaasTransferId = asaasTransfer.id;
    withdrawal.status =
      asaasTransfer.status === "CONFIRMED" ? "completed" : "processing";

    if (withdrawal.status === "completed") {
      withdrawal.completedAt = new Date();
      // CORRIGIR: Usar a função local
      await markTravelsAsPaid(withdrawal.motoboyId, withdrawal.travels);
    }

    await withdrawal.save();

    res.json({
      success: true,
      withdrawal,
      asaasTransfer,
      message: "Saque processado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao processar saque:", error);

    // Atualizar status para falha
    if (req.params.withdrawalId) {
      await Withdrawal.findByIdAndUpdate(req.params.withdrawalId, {
        status: "failed",
        errorMessage: error.message,
      });
    }

    res.status(500).json({ error: error.message });
  }
};

const getWithdrawals = async (req, res) => {
  try {
    const { motoboyId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const filter = { motoboyId };
    if (status) filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments(filter);

    res.json({
      withdrawals,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Erro ao listar saques:", error);
    res.status(500).json({ error: error.message });
  }
};

const handleAsaasWebhook = async (req, res) => {
  try {
    const { event, transfer } = req.body;

    if (event === "TRANSFER_CONFIRMED" || event === "TRANSFER_FAILED") {
      const withdrawal = await Withdrawal.findOne({
        asaasTransferId: transfer.id,
      });

      if (withdrawal) {
        withdrawal.status =
          event === "TRANSFER_CONFIRMED" ? "completed" : "failed";

        if (event === "TRANSFER_CONFIRMED") {
          withdrawal.completedAt = new Date();
          await this.markTravelsAsPaid(withdrawal.motoboyId, withdrawal.amount);
        } else {
          withdrawal.errorMessage =
            transfer.failReason || "Transferência falhou";
        }

        await withdrawal.save();
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook Asaas:", error);
    res.status(500).json({ error: error.message });
  }
};

router.post("/:motoboyId/request", requestWithdrawal);

// Processar saque
router.post("/:withdrawalId/process", processWithdrawal);

// Listar saques
router.get("/:motoboyId", getWithdrawals);

// Consultar saldo disponível
router.get("/:motoboyId/balance", async (req, res) => {
  try {
    const { motoboyId } = req.params;
    const availableBalance =
      await withdrawalController.calculateAvailableBalance(motoboyId);
    res.json({ availableBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook do Asaas
router.post("/webhook/asaas", handleAsaasWebhook);

module.exports = router;
