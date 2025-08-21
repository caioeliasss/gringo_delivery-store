const express = require("express");
const router = express.Router();
const Travel = require("../models/Travel");
const Order = require("../models/Order");
const Motoboy = require("../models/Motoboy");

const createTravel = async (req, res) => {
  const { price, rain, distance, coordinatesFrom, coordinatesTo, order } =
    req.body;
  try {
    const travel = new Travel({
      price: price,
      rain: rain,
      distance: distance,
      coordinatesFrom: coordinatesFrom,
      coordinatesTo: coordinatesTo,
      motoboyId: order.motoboy.motoboyId,
      order: order,
    });

    // Aguardar o save e retornar o travel com _id
    const savedTravel = await travel.save();
    res.json(savedTravel);
  } catch (error) {
    console.error("Erro ao criar travel:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateTravel = async (req, res) => {
  const { id } = req.params;
  const {
    price,
    rain,
    distance,
    coordinatesFrom,
    coordinatesTo,
    order,
    arrival_customer,
    arrival_store,
    arrival_store_manually,
  } = req.body;
  try {
    const travel = await Travel.findByIdAndUpdate(
      id,
      {
        arrival_customer: arrival_customer,
        arrival_store: arrival_store,
        arrival_store_manually: arrival_store_manually,
        price: price,
        rain: rain,
        distance: distance,
        coordinatesFrom: coordinatesFrom,
        coordinatesTo: coordinatesTo,
        order: order,
      },
      { new: true }
    );

    const orderdb = await Order.findByIdAndUpdate(
      order._id,
      {
        motoboy: {
          ...motoboy,
          hasArrived: true,
        },
      },
      { new: true }
    );
    res.json(travel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTravels = async (req, res) => {
  try {
    const { motoboyId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!motoboyId) {
      return res.status(401).json({ message: "Não foi informado o motoboyId" });
    }

    // Converter para números
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Buscar travels com paginação e ordenação por data de criação (mais recentes primeiro)
    const travels = await Travel.find({ motoboyId: motoboyId })
      .sort({ createdAt: -1 }) // Ordenação decrescente por data de criação
      .skip(skip)
      .limit(limitNum);

    // Para compatibilidade, se não houver parâmetros de paginação, retornar o formato antigo
    if (!req.query.page && !req.query.limit) {
      return res.status(200).json(travels);
    }

    // Calcular resumo financeiro completo (TODOS os travels, não apenas os paginados)
    const allTravels = await Travel.find({ motoboyId: motoboyId }).select(
      "finance.value finance.status"
    );

    const summary = {
      totalPendente: 0,
      totalLiberado: 0,
      totalPago: 0,
      totalCancelado: 0,
      totalGeral: 0,
    };

    allTravels.forEach((travel) => {
      const value = travel.finance?.value || 0;
      const status = travel.finance?.status || "pendente";

      switch (status) {
        case "pendente":
          summary.totalPendente += value;
          break;
        case "liberado":
          summary.totalLiberado += value;
          break;
        case "pago":
          summary.totalPago += value;
          break;
        case "cancelado":
          summary.totalCancelado += value;
          break;
      }

      if (status !== "cancelado") {
        summary.totalGeral += value;
      }
    });

    // Retornar formato paginado com resumo completo
    res.status(200).json({
      travels: travels,
      page: pageNum,
      limit: limitNum,
      hasMore: travels.length === limitNum,
      summary: summary, // Resumo baseado em TODOS os travels
      totalTravels: allTravels.length, // Total de travels do motoboy
    });
  } catch (error) {
    console.error("Erro ao buscar travels:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateTravelStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const travel = await Travel.findByIdAndUpdate(
      id,
      {
        status: status,
      },
      { new: true }
    );
    res.json(travel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Adicione esta rota para buscar detalhes de uma travel específica:
const getTravelById = async (req, res) => {
  try {
    const { id } = req.params;
    const travel = await Travel.findById(id);

    if (!travel) {
      return res.status(404).json({ message: "Corrida não encontrada" });
    }

    res.status(200).json(travel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCurrentTravelPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const travel = await Travel.findById(id);

    if (!travel) {
      return res.status(404).json({ message: "Viagem não encontrada" });
    }

    const currentPrice = travel.getCurrentPrice();
    const originalPrice = travel.originalPrice || travel.price;
    const priceIncreaseStart =
      travel.priceIncreaseStartTime ||
      new Date(travel.createdAt.getTime() + 15 * 60 * 1000);
    const now = new Date();

    // Calcular tempo restante até o aumento começar
    const timeUntilIncrease = Math.max(0, priceIncreaseStart - now);

    // Calcular quantos minutos se passaram desde o início do aumento
    const minutesSinceIncrease = Math.max(
      0,
      Math.floor((now - priceIncreaseStart) / (60 * 1000))
    );

    res.status(200).json({
      travel: travel,
      status: travel.status,
      currentPrice: currentPrice,
      originalPrice: originalPrice,
      priceIncreaseStartTime: priceIncreaseStart,
      timeUntilIncrease: timeUntilIncrease,
      minutesSinceIncrease: minutesSinceIncrease,
      isIncreasing: now >= priceIncreaseStart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTravelByOrderId = async (req, res) => {
  try {
    const { id } = req.params;
    const travel = await Travel.findOne({ "order._id": id });

    if (!travel) {
      return res
        .status(404)
        .json({ message: "Viagem não encontrada para este pedido" });
    }

    res.status(200).json(travel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTravelByOrder = async (req, res) => {
  const { id } = req.params;
  const { price } = req.body;
  try {
    const travel = await Travel.findOneAndUpdate(
      { "order._id": id },
      {
        price: price,
        "finance.value": price,
      },
      { new: true }
    );

    const order = await Order.findByIdAndUpdate(id, {
      "motoboy.price": price,
    });

    if (!order) {
      return res
        .status(404)
        .json({ message: "Viagem não encontrada para este pedido" });
    }

    res.json({ travel: travel || null, order: order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Função para admin buscar todas as corridas
const getAllTravelsForAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, dateFilter, motoboyId } = req.query;

    // Converter para números
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    let filters = {};

    if (status && status !== "all") {
      filters.status = status;
    }

    if (motoboyId && motoboyId !== "all") {
      filters.motoboyId = motoboyId;
    }

    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      if (startDate) {
        filters.createdAt = { $gte: startDate };
      }
    }

    // Buscar travels com paginação
    const travels = await Travel.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Buscar informações dos motoboys separadamente
    const motoboyIds = [
      ...new Set(travels.map((t) => t.motoboyId).filter(Boolean)),
    ];
    const motoboys = await Motoboy.find({ _id: { $in: motoboyIds } }).lean();
    const motoboyMap = motoboys.reduce((map, motoboy) => {
      map[motoboy._id.toString()] = motoboy;
      return map;
    }, {});

    // Enriquecer dados com nome do motoboy
    const enrichedTravels = travels.map((travel) => ({
      ...travel,
      motoboyName: motoboyMap[travel.motoboyId?.toString()]?.name || "N/A",
    }));

    // Calcular total de registros
    const total = await Travel.countDocuments(filters);

    // Calcular estatísticas gerais
    const allTravels = await Travel.find({}).lean();

    const stats = {
      totalTravels: allTravels.length,
      completedTravels: allTravels.filter((t) => t.status === "completed")
        .length,
      canceledTravels: allTravels.filter((t) => t.status === "canceled").length,
      activeTravels: allTravels.filter((t) => t.status === "active").length,
      totalRevenue: allTravels
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + (t.price || 0), 0),
      averagePrice:
        allTravels.length > 0
          ? allTravels.reduce((sum, t) => sum + (t.price || 0), 0) /
            allTravels.length
          : 0,
      totalDistance: allTravels.reduce((sum, t) => sum + (t.distance || 0), 0),
      averageDistance:
        allTravels.length > 0
          ? allTravels.reduce((sum, t) => sum + (t.distance || 0), 0) /
            allTravels.length
          : 0,
    };

    res.status(200).json({
      travels: enrichedTravels,
      total: total,
      page: pageNum,
      limit: limitNum,
      hasMore: total > skip + limitNum,
      stats: stats,
    });
  } catch (error) {
    console.error("Erro ao buscar travels para admin:", error);
    res.status(500).json({ message: error.message });
  }
};

// Função para buscar todos os motoboys para filtro
const getAllMotoboys = async (req, res) => {
  try {
    const motoboys = await Motoboy.find({}, { _id: 1, name: 1, email: 1 })
      .sort({ name: 1 })
      .lean();

    res.status(200).json(motoboys);
  } catch (error) {
    console.error("Erro ao buscar motoboys:", error);
    res.status(500).json({ message: error.message });
  }
};

// Adicione a rota
router.get("/admin", getAllTravelsForAdmin); // Nova rota para admin
router.get("/admin/motoboys", getAllMotoboys); // Nova rota para buscar motoboys
router.get("/price/:id", getCurrentTravelPrice);
router.get("/details/:id", getTravelById);
router.get("/order/:id", getTravelByOrderId);
router.put("/priceOrder/:id", updateTravelByOrder);
router.put("/:id", updateTravel);
router.put("/status/:id", updateTravelStatus);
router.post("/", createTravel);
router.get("/:motoboyId", getTravels);

module.exports = router;
