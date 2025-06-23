const express = require("express");
const router = express.Router();
const Travel = require("../models/Travel");

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
    travel.save();
    res.json(travel);
  } catch (error) {
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
    res.json(travel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTravels = async (req, res) => {
  try {
    const { motoboyId } = req.params;
    if (!motoboyId) {
      return res.status(401).json({ message: "Não foi informado o motoboyId" });
    }
    const travels = await Travel.find({ motoboyId: motoboyId });

    res.status(200).json(travels);
  } catch (error) {
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

// Adicione a rota
router.get("/price/:id", getCurrentTravelPrice);
router.get("/details/:id", getTravelById);
router.put("/:id", updateTravel);
router.put("/status/:id", updateTravelStatus);
router.post("/", createTravel);
router.get("/:motoboyId", getTravels);

module.exports = router;
