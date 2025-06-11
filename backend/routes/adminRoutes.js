const Admin = require("../models/Admin");
const express = require("express");
const router = express.Router();
const Motoboys = require("../models/Motoboy");
const Order = require("../models/Order");
const Occurrence = require("../models/Occurrence");
const Store = require("../models/Store");

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

router.get("/dashboard/stats", dashboardStats);
router.post("/create", createAdmin);
router.get("/firebase/:firebaseUid", getAdmin);

module.exports = router;
