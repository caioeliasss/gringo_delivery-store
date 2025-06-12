const Admin = require("../models/Admin");
const express = require("express");
const router = express.Router();
const Motoboys = require("../models/Motoboy");
const Order = require("../models/Order");
const Occurrence = require("../models/Occurrence");
const Store = require("../models/Store");
const Billing = require("../models/Billing");
const Withdrawal = require("../models/Withdrawal");
const Travel = require("../models/Travel");

const createAdmin = async (req, res) => {
  const { firebaseUid, name, email, role, permissions } = req.body;
  try {
    const admin = new Admin({
      firebaseUid,
      name,
      email,
      role,
      permissions,
    });
    await admin.save();
    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdmin = async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const admin = await Admin.findOne({ firebaseUid });
    if (!admin) {
      return res.status(404).json({ message: "Admin não encontrado" });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const dashboardStats = async (req, res) => {
  try {
    // Buscar dados em paralelo
    const [
      todayOrders,
      onlineDrivers,
      openOccurrences,
      totalStores,
      totalRevenue,
      pendingApprovals,
      pendingMotoboys,
    ] = await Promise.all([
      // Pedidos de hoje
      Order.countDocuments({
        createdAt: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999),
        },
      }),

      // Motoboys online (ativos nos últimos 5 minutos)
      Motoboys.countDocuments({
        isAvailable: true,
      }),

      // Ocorrências abertas
      Occurrence.countDocuments({
        status: { $in: ["aberto", "pendente"] },
      }),

      // Total de lojas ativas
      Store.countDocuments({
        cnpj_approved: true,
      }),

      // Receita do mês atual
      Order.aggregate([
        {
          $match: {
            status: "entregue",
            createdAt: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
          },
        },
      ]).then((result) => result[0]?.total || 0),

      // Lojas pendentes de aprovação
      Store.countDocuments({
        cnpj_approved: false,
      }),

      Motoboys.countDocuments({
        isApproved: false,
      }),
    ]);

    res.json({
      todayOrders,
      onlineDrivers,
      openOccurrences,
      totalStores,
      totalRevenue,
      pendingApprovals,
      pendingMotoboys,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({ error: error.message });
  }
};

const financialStats = async (req, res) => {
  try {
    // Executar todas as consultas em paralelo
    const [
      totalRevenue,
      pendingBillings,
      totalWithdrawals,
      pendingWithdrawals,
      monthlyWithdrawals,
      totalBillings,
    ] = await Promise.all([
      // 1. Receita total do mês
      Billing.aggregate([
        {
          $match: {
            type: { $in: ["MOTOBOY_FEE", "SUBSCRIPTION"] },
            createdAt: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]).then((result) => result[0]?.total || 0),

      // 2. Faturas pendentes
      Billing.aggregate([
        {
          $match: {
            status: "PENDING", // ✅ CORRIGIR: Apenas status PENDING
          },
        },
        {
          // ✅ CORRIGIR: $group dentro do array
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]).then((result) => result[0]?.total || 0),

      // 3. Total de saques (todos os status)
      Withdrawal.aggregate([
        {
          $match: {
            status: { $in: ["pending", "processing", "completed"] },
            createdAt: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]).then((result) => result[0]?.total || 0),

      // 4. Saques pendentes
      Travel.aggregate([
        {
          $match: {
            "finance.status": { $in: ["pendente", "liberado"] }, // ✅ CORRIGIR: Usar $in para array de status
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$finance.value" },
          },
        },
      ]).then((result) => result[0]?.total || 0),

      // 5. Saques do mês (concluídos)
      Withdrawal.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]).then((result) => result[0]?.total || 0),

      // 6. Total de faturas (contador)
      Billing.countDocuments(),
    ]);

    // ✅ CORRIGIR: Retornar objeto estruturado em vez de array
    res.json({
      monthlyRevenue: totalRevenue,
      pendingBillings: pendingBillings,
      totalWithdrawals: totalWithdrawals,
      pendingWithdrawals: pendingWithdrawals,
      monthlyWithdrawals: monthlyWithdrawals,
      totalBillings: totalBillings,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas financeiras:", error);
    res.status(500).json({ error: error.message });
  }
};

// Rota para listar billings - COM DEBUG E FILTRO CORRETO
const getBillings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status.toUpperCase(); // ✅ CORRIGIR: Garantir maiúsculo
    }

    const billings = await Billing.find(filter)
      .populate("storeId", "displayName businessName email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Billing.countDocuments(filter);

    // Formatar dados para o frontend
    const billingsFormatted = billings.map((b) => ({
      ...b,
      storeId: typeof b.storeId === "object" ? b.storeId._id : b.storeId,
      storeName:
        b.storeId?.businessName ||
        b.storeId?.displayName ||
        "Nome não encontrado",
      storeEmail: b.storeId?.email || "Email não encontrado",
      period:
        b.period ||
        `${new Date(b.createdAt).getMonth() + 1}/${new Date(
          b.createdAt
        ).getFullYear()}`,
      dueDate: b.dueDate || b.createdAt,
      type: b.type || "COBRANÇA",
      description: b.description || "Cobrança mensal",
    }));

    res.json({
      billings: billingsFormatted,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Erro ao buscar faturas:", error);
    res.status(500).json({ error: error.message });
  }
};

// Rota para listar withdrawals - COM DEBUG E FILTRO CORRETO
const getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    console.log("🔍 DEBUG: Filtro withdrawal recebido:", {
      page,
      limit,
      status,
    }); // ✅ DEBUG

    const filter = {};

    if (status && status !== "all") {
      filter.status = status; // ✅ Withdrawal usa minúsculo
    }

    const withdrawals = await Withdrawal.find(filter)
      .populate("motoboyId", "name email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Withdrawal.countDocuments(filter);

    // Formatar dados para o frontend
    const withdrawalsFormatted = withdrawals.map((w) => ({
      ...w,
      motoboyId:
        typeof w.motoboyId === "object" ? w.motoboyId._id : w.motoboyId,
      motoboyName: w.motoboyId?.name || "Nome não encontrado",
      motoboyEmail: w.motoboyId?.email || "Email não encontrado",
      netAmount: w.netAmount || w.amount,
      pixKey: w.pixKey || "N/A",
      pixKeyType: w.pixKeyType || "N/A",
    }));

    res.json({
      withdrawals: withdrawalsFormatted,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Erro ao buscar saques:", error);
    res.status(500).json({ error: error.message });
  }
};

// Processar saque
const processWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ error: "Saque não encontrado" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ error: "Saque não pode ser processado" });
    }

    // Atualizar status para processando
    withdrawal.status = "processing";
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    // Aqui você integraria com o gateway de pagamento PIX
    // Por enquanto, vamos simular o processamento
    setTimeout(async () => {
      try {
        withdrawal.status = "completed";
        withdrawal.completedAt = new Date();
        await withdrawal.save();
      } catch (error) {
        withdrawal.status = "failed";
        withdrawal.errorMessage = error.message;
        await withdrawal.save();
      }
    }, 5000); // Simular processamento de 5 segundos

    res.json({
      success: true,
      message: "Saque em processamento",
      withdrawal,
    });
  } catch (error) {
    console.error("Erro ao processar saque:", error);
    res.status(500).json({ error: error.message });
  }
};

// Rejeitar saque
const rejectWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const withdrawal = await Withdrawal.findByIdAndUpdate(
      withdrawalId,
      {
        status: "rejected",
        processedAt: new Date(),
        errorMessage: reason || "Rejeitado pelo administrador",
      },
      { new: true }
    );

    if (!withdrawal) {
      return res.status(404).json({ error: "Saque não encontrado" });
    }

    res.json({ success: true, withdrawal });
  } catch (error) {
    console.error("Erro ao rejeitar saque:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ ADICIONAR: Registrar todas as rotas
router.get("/financial/stats", financialStats);
router.get("/financial/withdrawals", getWithdrawals);
router.get("/financial/billings", getBillings);
router.post("/financial/withdrawals/:withdrawalId/process", processWithdrawal);
router.post("/financial/withdrawals/:withdrawalId/reject", rejectWithdrawal);

router.get("/dashboard/stats", dashboardStats);
router.post("/create", createAdmin);
router.get("/firebase/:firebaseUid", getAdmin);

module.exports = router;
