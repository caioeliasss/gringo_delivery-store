const Notification = require("../models/Notification");
const Motoboy = require("../models/Motoboy");
const Store = require("../models/Store");
const Order = require("../models/Order");
const express = require("express");
const router = express.Router();
const motoboyServices = require("../services/motoboyServices");
const pushNotificationService = require("../services/pushNotificationService");

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

    if (motoboy.pushToken) {
      try {
        await pushNotificationService.sendPushNotification(
          motoboy.pushToken,
          "Nova Entrega Disponível",
          notification.message,
          {
            notificationId: notification._id,
            type: notification.type,
            orderId: order._id,
            screen: "DeliveryRequest",
          }
        );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
        // Não falhar o request se a notificação push falhar
      }
    }

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
    const { motoboyId, title, message, type, expiresAt } = req.body;

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
      expiresAt: expiresAt || new Date(Date.now() + 60000 * 60 * 24 * 7), // 360 dias para expirar
    });
    await notification.save();

    if (motoboy.pushToken) {
      try {
        await pushNotificationService.sendPushNotification(
          motoboy.pushToken,
          notification.title,
          notification.message,
          {
            notificationId: notification._id,
            type: notification.type,
            screen: "DeliveryRequest",
          }
        );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
        // Não falhar o request se a notificação push falhar
      }
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    res.status(500).json({ message: error.message });
  }
};

const notifySupport = async (req, res) => {
  try {
    const { title, message, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Dados incompletos. title e message são obrigatórios",
      });
    }

    // Buscar todos os membros ativos da equipe de suporte
    const SupportTeam = require("../models/SupportTeam");
    const supportMembers = await SupportTeam.find({ active: true });

    if (supportMembers.length === 0) {
      return res
        .status(404)
        .json({ message: "Nenhum membro de suporte ativo encontrado" });
    }

    const notifications = [];
    const notificationPromises = [];

    // Criar uma notificação para cada membro do suporte
    for (const supportMember of supportMembers) {
      const notification = new Notification({
        firebaseUid: supportMember.firebaseUid, // Armazenar ID do membro do suporte
        type: "SUPPORT_ALERT",
        title: title,
        message: message,
        data: data || {},
        status: "PENDING",
        expiresAt: new Date(Date.now() + 60000 * 60 * 24 * 7), // 7 dias para expirar
      });

      notifications.push(notification);
      notificationPromises.push(notification.save());

      // Enviar evento SSE para este membro específico do suporte
      if (req.app.locals.sendEventToStore) {
        try {
          const notifyData = {
            notificationId: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
          };

          // Enviar notificação para o UID do Firebase deste membro do suporte
          req.app.locals.sendEventToStore(
            supportMember.firebaseUid,
            "supportNotification",
            notifyData
          );

          console.log(
            `Notificação enviada para o membro de suporte: ${supportMember.name} (${supportMember.firebaseUid})`
          );
        } catch (notifyError) {
          console.error(
            `Erro ao enviar notificação SSE para ${supportMember.name}:`,
            notifyError
          );
        }
      }
    }

    // Aguardar todas as notificações serem salvas
    await Promise.all(notificationPromises);

    res.status(201).json({
      message: `Notificações enviadas para ${notifications.length} membros do suporte`,
      notifications: notifications,
    });
  } catch (error) {
    console.error("Erro ao criar notificações para suporte:", error);
    res.status(500).json({ message: error.message });
  }
};

const notifyOccurrence = async (req, res) => {
  try {
    const { title, message, firebaseUid } = req.body;
    console.log("notifyOccurrence", req.body);

    if (!title || !message) {
      return res.status(400).json({
        message:
          "Dados incompletos. motoboyId, orderId, title e message são obrigatórios",
      });
    }

    const notification = new Notification({
      firebaseUid: firebaseUid, // Armazenar ID do membro do suporte
      type: "MOTOBOY",
      title: title,
      message: message,
      data: { title, message },
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000 * 60 * 24 * 7), // 7 dias para expirar
    });

    await notification.save();

    // Enviar evento SSE para o motoboy
    if (req.app.locals.sendEventToStore) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        };

        req.app.locals.sendEventToStore(
          firebaseUid,
          "occurrenceNotification",
          notifyData
        );
      } catch (notifyError) {
        console.error("Erro ao enviar notificação SSE:", notifyError);
      }
    }

    let user;
    user = await Motoboy.findOne({ firebaseUid: firebaseUid });
    if (!user) {
      user = await Store.findOne({ firebaseUid: firebaseUid });
    }
    if (!user) {
      return res.status(404).json({ message: "Usuario não encontrado" });
    }

    if (user.pushToken) {
      try {
        await pushNotificationService.sendPushNotification(
          user.pushToken,
          notification.title,
          notification.message,
          {
            notificationId: notification._id,
            type: notification.type,
            orderId: user._id,
            screen: "occurrences",
          }
        );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
        // Não falhar o request se a notificação push falhar
      }
    }
    res.status(201).json(notification);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    res.status(500).json({ message: error.message });
  }
};

router.post("/notifyOccurrence", notifyOccurrence);
router.post("/notifySupport", notifySupport);
router.post("/generic", createNotificationGeneric);
router.get("/", getNotifications);
router.get("/all", getNotificationsAll);
router.post("/", createNotification);
router.put("/", updateNotification);

module.exports = router;
