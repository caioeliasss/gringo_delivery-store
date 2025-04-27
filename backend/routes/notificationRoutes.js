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

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    if (status === status) {
      console.log("Tentando enviar notificação SSE...");
      console.log("User UID para notificação:", req.user.uid);

      // Verificar se a função de notificação existe
      if (!req.app.locals.sendEventToStore) {
        console.error(
          "ERRO: função sendEventToStore não encontrada em app.locals"
        );
        return res.status(200).json({
          message:
            "Status do pedido atualizado com sucesso, mas notificação falhou",
          order,
        });
      }

      // Preparar dados do pedido para a notificação
      const orderData = {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: "em_preparacao",
        customer: {
          name: order.customer.name,
        },
        total: order.total,
        orderDate: order.orderDate,
      };

      console.log("Dados para enviar:", JSON.stringify(orderData));

      // Tentar enviar a notificação
      try {
        const notified = req.app.locals.sendEventToStore(
          req.user.uid,
          "orderUpdate",
          orderData
        );

        console.log(`Notificação SSE ${notified ? "ENVIADA" : "FALHOU"}`);
      } catch (notifyError) {
        console.error("Erro ao enviar notificação SSE:", notifyError);
      }
    }
    res.status(200).json({ message: "Atualizado com sucesso", notification });
  } catch (error) {
    res.status(500).json({ message: "Erro interno", error });
  }
};

router.get("/", getNotifications);
router.put("/", updateNotification);

module.exports = router;
