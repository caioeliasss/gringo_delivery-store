const Avaliate = require("../models/Avaliate");
const express = require("express");
const Motoboy = require("../models/Motoboy");
const router = express.Router();

const createAvaliate = async (req, res) => {
  const {
    orderId,
    motoboyId,
    storeId,
    customerId,
    rating,
    feedback,
    storeName,
  } = req.body;
  try {
    const avaliate = new Avaliate({
      orderId: orderId || null,
      motoboyId: motoboyId || null,
      storeId: storeId || null,
      customerId: customerId || null,
      rating: rating || null,
      feedback: feedback || null,
      storeName: storeName || null,
    });
    await avaliate.save();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const ratings = await Avaliate.find({
      motoboyId: motoboyId,
      createdAt: { $gte: sevenDaysAgo },
    });

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length
        : 0;

    const updatedMotoboy = await Motoboy.findByIdAndUpdate(
      motoboyId,
      { score: averageRating },
      { new: true }
    );

    res.json({ avaliate, updatedMotoboy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAvaliate = async (req, res) => {
  try {
    const { orderId } = req.params;
    const avaliate = await Avaliate.findOne({ orderId: orderId });
    if (!avaliate) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }
    res.json(avaliate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAvaliateByMotoboy = async (req, res) => {
  try {
    const { motoboyId } = req.params;
    const avaliate = await Avaliate.find({ motoboyId: motoboyId });
    if (!avaliate) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }
    res.json(avaliate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAvaliateByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const avaliate = await Avaliate.find({ storeId: storeId });
    if (!avaliate) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }
    res.json(avaliate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAvaliateByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const avaliate = await Avaliate.find({ customerId: customerId });
    if (!avaliate) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }
    res.json(avaliate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAvaliateByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const avaliate = await Avaliate.find({ orderId: orderId });
    if (!avaliate) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }
    res.json(avaliate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.post("/", createAvaliate);
router.get("/order/:orderId", getAvaliate);
router.get("/motoboy/:motoboyId", getAvaliateByMotoboy);
router.get("/store/:storeId", getAvaliateByStore);
router.get("/customer/:customerId", getAvaliateByCustomer);

module.exports = router;
