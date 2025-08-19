const express = require("express");
const router = express.Router();
const Travel = require("../models/Travel");
const Order = require("../models/Order");

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

// Adicione a rota
router.get("/price/:id", getCurrentTravelPrice);
router.get("/details/:id", getTravelById);
router.get("/order/:id", getTravelByOrderId);
router.put("/priceOrder/:id", updateTravelByOrder);
router.put("/:id", updateTravel);
router.put("/status/:id", updateTravelStatus);
router.post("/", createTravel);
router.get("/:motoboyId", getTravels);

module.exports = router;
