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
    console.log(motoboyId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.get("/", getNotifications);
router.get("/boi", async (req, res) => {
  res.status(200).json({ message: "vc é o boi" });
});

module.exports = router;
