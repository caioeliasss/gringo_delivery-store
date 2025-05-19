const Notification = require("../models/Notification");
const Motoboy = require("../models/Motoboy");
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

const getNotificationsAll = async (req, res) => {
  try {
    const motoboyId = req.query.motoboyId; // Modificado de req.params para req.query
    const notifications = await Notification.find({
      motoboyId: motoboyId,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const { motoboyId, order } = req.body;

    if (!motoboyId || !order) {
      return res.status(400).json({
        message: "Dados incompletos. motoboyId e order são obrigatórios",
      });
    }

    // Verificar se motoboy existe e está disponível
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    // console.log(motoboy._id)

    if (!motoboy.isAvailable) {
      return res.status(400).json({ message: "Motoboy não está disponível" });
    }

    // Criar a notificação
    const notification = new Notification({
      motoboyId: motoboyId,
      type: "DELIVERY_REQUEST",
      title: `${order.store.name}`,
      message: `Pedido #${order.orderNumber}`,
      data: {
        storeAddress: order.store.address,
        order: order,
        orderId: order._id,
        customerName: order.customer.name,
        address: order.customer.customerAddress,
      },
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000), // 1 minuto para expirar
    });

    await notification.save();
    console.log(
      `Notificação criada: ${notification._id} para motoboy ${motoboyId}`
    );

    // Enviar evento SSE se disponível na aplicação
    if (req.app.locals.sendEventToStore) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        };

        const notified = req.app.locals.sendEventToStore(
          motoboy.firebaseUid,
          "notificationUpdate",
          notifyData
        );

        console.log(
          `Notificação SSE ${notified ? "ENVIADA" : "FALHOU"} para motoboy ${
            motoboy.name
          }`
        );
      } catch (notifyError) {
        console.error("Erro ao enviar notificação SSE:", notifyError);
      }
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateNotification = async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).json({
        message: "Dados incompletos. id e status são obrigatórios",
      });
    }
    const notification = await Notification.findById(id);
    const motoboy = await Motoboy.findById(notification.motoboyId);
    notification.status = status;
    await notification.save();

    req.app.locals.sendEventToStore(
      motoboy.firebaseUid,
      "notificationUpdateBell",
      notification.status !== "READ"
    );

    res.status(200).json({ message: "Atualizado com sucesso", notification });
  } catch (error) {
    res.status(500).json({ message: "Erro interno", error });
  }
};

const createNotificationGeneric = async (req, res) => {
  try {
    const { motoboyId, title, message, type } = req.body;

    if (!motoboyId) {
      return res.status(400).json({
        message: "Dados incompletos. motoboyId são obrigatórios",
      });
    }

    // Verificar se motoboy existe e está disponível
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    // console.log(motoboy._id)

    // Criar a notificação
    const notification = new Notification({
      motoboyId: motoboyId,
      type: type || "SYSTEM",
      title: title,
      message: message,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000 * 60 * 24 * 360), // 360 dias para expirar
    });
    await notification.save();

    res.status(201).json(notification);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    res.status(500).json({ message: error.message });
  }
};

router.post("/generic", createNotificationGeneric);
router.get("/", getNotifications);
router.get("/all", getNotificationsAll);
router.post("/", createNotification);
router.put("/", updateNotification);

module.exports = router;
