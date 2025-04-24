const Notification = require("../models/Notification");
const Order = require("../models/Order");
const express = require("express");
const router = express.Router();
const motoboyServices = require("../services/motoboyServices");

const getNotifications = async (req, res) => {
  try {
    const motoboyId = req.query.motoboyId; // Modificado de req.params para req.query
    const notifications = await Notification.find({
      motoboyId: motoboyId,
      status: "PENDING",
      type: "DELIVERY_REQUEST",
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNotification = async (req, res) => {
  try {
    const { id, status } = req.body;
    const notification = await Notification.findById(id);
    notification.status = status;
    await notification.save();
    res.status(200).json({ message: "Atualizado com sucesso", notification });
  } catch (error) {
    res.status(500).json({ message: "Erro interno", error });
  }
};

router.get("/", getNotifications);
router.put("/", updateNotification);

module.exports = router;
