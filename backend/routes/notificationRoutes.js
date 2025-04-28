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
    const notification = await Notification.findById(id);
    notification.status = status;
    await notification.save();

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }
    res.status(200).json({ message: "Atualizado com sucesso", notification });
  } catch (error) {
    res.status(500).json({ message: "Erro interno", error });
  }
};

router.get("/", getNotifications);
router.post("/", createNotification);
router.put("/", updateNotification);

module.exports = router;
