const Notification = require("../models/Notification");
const Motoboy = require("../models/Motoboy");
const Store = require("../models/Store");
const Order = require("../models/Order");
const express = require("express");
const router = express.Router();
const motoboyServices = require("../services/motoboyServices");
const pushNotificationService = require("../services/pushNotificationService");
const notificationService = require("../services/notificationService");
const fullScreenNotificationService = require("../services/fullScreenNotificationService");

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

const hasUnreadNotifications = async (req, res) => {
  try {
    const { motoboyId, firebaseUid } = req.query;

    if (!motoboyId && !firebaseUid) {
      return res.status(400).json({
        message: "motoboyId ou firebaseUid é obrigatório",
      });
    }

    // Determinar critério de busca
    let searchCriteria = {};
    if (motoboyId) {
      searchCriteria.motoboyId = motoboyId;
    } else if (firebaseUid) {
      searchCriteria.firebaseUid = firebaseUid;
    }

    // Contar apenas notificações não lidas (muito mais eficiente que buscar todas)
    const unreadCount = await Notification.countDocuments({
      ...searchCriteria,
      status: { $ne: "READ" }, // Todas que NÃO são "READ"
      expiresAt: { $gt: new Date() }, // E que não expiraram
    });

    res.json({
      hasUnread: unreadCount > 0,
      unreadCount: unreadCount,
    });
  } catch (error) {
    console.error("Erro ao verificar notificações não lidas:", error);
    res.status(500).json({ message: error.message });
  }
};

const getSupportNotifications = async (req, res) => {
  try {
    const { firebaseUid } = req.query;

    if (!firebaseUid) {
      return res.status(400).json({
        message: "firebaseUid é obrigatório",
      });
    }

    const notifications = await Notification.find({
      firebaseUid: firebaseUid,
      $or: [
        { type: "SUPPORT_ALERT" },
        { type: "SUPPORT" },
        { type: "SYSTEM" },
        { type: "CHAT_MESSAGE" },
      ],
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Erro ao buscar notificações do suporte:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateSupportNotification = async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        message: "Dados incompletos. id e status são obrigatórios",
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada" });
    }

    notification.status = status;
    await notification.save();

    // Enviar atualização via Socket se disponível
    if (global.sendSocketNotification && notification.firebaseUid) {
      global.sendSocketNotification(
        notification.firebaseUid,
        "notificationUpdateBell",
        notification.status !== "READ"
      );
    }

    res.status(200).json({
      message: "Notificação atualizada com sucesso",
      notification,
    });
  } catch (error) {
    console.error("Erro ao atualizar notificação do suporte:", error);
    res.status(500).json({ message: error.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const { motoboyId, order, fullscreen } = req.body;

    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      throw new Error("Motoboy não encontrado");
    }

    const notification =
      await notificationService.createDeliveryRequestNotification({
        motoboyId,
        order,
        fullscreen,
      });

    // Enviar evento via Socket se disponível na aplicação
    if (global.sendSocketNotification) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        };

        const notified = global.sendSocketNotification(
          motoboy.firebaseUid,
          "deliveryRequest",
          notifyData
        );

        console.log(
          `Notificação Socket ${notified ? "ENVIADA" : "FALHOU"} para motoboy ${
            motoboy.name
          }`
        );
      } catch (notifyError) {
        console.error("Erro ao enviar notificação Socket:", notifyError);
      }
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    res.status(500).json({ message: error.message });
  }
};

const orderReadyNotification = async (req, res) => {
  try {
    const { motoboyId, orderId } = req.body;
    if (!motoboyId || !orderId) {
      return res.status(400).json({
        message: "Dados incompletos. motoboyId e orderId são obrigatórios",
      });
    }
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }
    const notification = new Notification({
      motoboyId: motoboy._id,
      type: "ORDER_READY",
      title: "Pedido Pronto",
      message: `O pedido ${order.orderNumber} está pronto para retirada no estabelecimento ${order.store.name}.`,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000 * 60 * 1 * 1), // 1 hora para expirar
    });
    await notification.save();
    // Enviar notificação push
    let fcmNotification = null;
    if (motoboy.fcmToken) {
      try {
        fcmNotification =
          await pushNotificationService.sendCallStyleNotificationFCM(
            motoboy.fcmToken,
            notification.title,
            notification.message,
            {
              notificationId: notification._id,
              type: notification.type,
              screen: "/(tabs)",
              orderId: order._id,
            }
          );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
        // Não falhar o request se a notificação push falhar
      }
    }
    res.status(201).json({
      message: "Notificação de pedido pronto criada com sucesso",
      notification,
      fcmNotification,
    });
  } catch (error) {
    console.error("Erro ao criar notificação de pedido pronto:", error);
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

    if (global.sendSocketNotification) {
      global.sendSocketNotification(
        motoboy.firebaseUid,
        "notificationUpdateBell",
        notification.status !== "READ"
      );
    }

    res.status(200).json({ message: "Atualizado com sucesso", notification });
  } catch (error) {
    res.status(500).json({ message: "Erro interno", error });
  }
};

const createNotificationGeneric = async (req, res) => {
  try {
    const {
      motoboyId,
      title,
      message,
      type,
      expiresAt,
      firebaseUid,
      screen,
      chatId,
    } = req.body;
    // Verificar se motoboy existe e está disponível
    let motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      motoboy = await Motoboy.findOne({ firebaseUid: firebaseUid });
    }
    // console.log(motoboy._id)

    // Criar a notificação
    const notification = new Notification({
      motoboyId: motoboy ? motoboy._id : null,
      type: type || "SYSTEM",
      title: title,
      message: message,
      status: "PENDING",
      expiresAt: expiresAt || new Date(Date.now() + 60000 * 60 * 24 * 7), // 360 dias para expirar
    });
    await notification.save();

    if (motoboy.fcmToken) {
      try {
        const fcmNotification =
          await pushNotificationService.sendCallStyleNotificationFCM(
            motoboy.fcmToken,
            notification.title,
            notification.message,
            {
              notificationId: notification._id,
              type: notification.type,
              screen: "/(tabs)",
            }
          );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
        // Não falhar o request se a notificação push falhar
      }
    }

    if (global.sendSocketNotification) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          chatId: chatId || null,
        };

        global.sendSocketNotification(
          firebaseUid,
          notification.type || "genericNotification",
          notifyData
        );
      } catch (notifyError) {
        console.error(`Erro ao enviar notificação Socket para:`, notifyError);
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

      // Enviar evento Socket para este membro específico do suporte
      if (global.sendSocketNotification) {
        try {
          const notifyData = {
            notificationId: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
          };

          // Enviar notificação para o UID do Firebase deste membro do suporte
          global.sendSocketNotification(
            supportMember.firebaseUid,
            "supportNotification",
            notifyData
          );

          console.log(
            `Notificação enviada para o membro de suporte: ${supportMember.name} (${supportMember.firebaseUid})`
          );
        } catch (notifyError) {
          console.error(
            `Erro ao enviar notificação Socket para ${supportMember.name}:`,
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

    // Enviar evento Socket para o motoboy
    if (global.sendSocketNotification) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        };

        global.sendSocketNotification(
          firebaseUid,
          "occurrenceNotification",
          notifyData
        );
      } catch (notifyError) {
        console.error("Erro ao enviar notificação Socket:", notifyError);
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

    if (user.fcmToken) {
      try {
        const fcmNotification =
          await pushNotificationService.sendCallStyleNotificationFCM(
            user.fcmToken,
            notification.title,
            notification.message,
            {
              notificationId: notification._id,
              type: notification.type,
              screen: "/(tabs)",
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

/**
 * Cria uma notificação estilo chamada do WhatsApp (full screen intent)
 */
const createCallStyleNotification = async (req, res) => {
  try {
    const {
      motoboyId,
      firebaseUid,
      title,
      message,
      type,
      timeoutSeconds,
      callId,
      screen,
      additionalData,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Dados incompletos. title e message são obrigatórios",
      });
    }

    const result = await notificationService.createCallStyleNotification(
      {
        motoboyId,
        firebaseUid,
        title,
        message,
        type,
        timeoutSeconds,
        callId,
        screen,
        additionalData,
      },
      req.app
    );

    console.log(
      `Notificação estilo chamada criada com sucesso: ${result.callId}`
    );
    res.status(201).json(result);
  } catch (error) {
    console.error("Erro ao criar notificação estilo chamada:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Responde a uma notificação estilo chamada (aceitar/recusar)
 */
const respondToCallStyleNotification = async (req, res) => {
  try {
    const { callId, action, firebaseUid } = req.body;

    if (!callId || !action || !firebaseUid) {
      return res.status(400).json({
        message:
          "Dados incompletos. callId, action e firebaseUid são obrigatórios",
      });
    }

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        message: "Ação inválida. Use 'accept' ou 'decline'",
      });
    }

    const result = await notificationService.respondToCallStyleNotification(
      { callId, action, firebaseUid },
      req.app
    );

    console.log(`Resposta da chamada processada: ${callId} - ${action}`);
    res.json(result);
  } catch (error) {
    console.error("Erro ao responder notificação estilo chamada:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Busca informações de uma chamada pelo ID
 */
const getCallInfo = async (req, res) => {
  try {
    const { callId } = req.params;

    if (!callId) {
      return res.status(400).json({
        message: "callId é obrigatório",
      });
    }

    const notification = await Notification.findOne({
      "data.callId": callId,
      type: "CALL_STYLE",
    });

    if (!notification) {
      return res.status(404).json({
        message: "Chamada não encontrada",
      });
    }

    res.json({
      callId,
      notification,
      status: notification.status,
      createdAt: notification.createdAt,
      expiresAt: notification.expiresAt,
      data: notification.data,
    });
  } catch (error) {
    console.error("Erro ao buscar informações da chamada:", error);
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { firebaseUid, motoboyId, userId } =
      req.body || req.query || req.params;
    console.log("Marking all notifications as read. Dados recebidos:", {
      firebaseUid,
      motoboyId,
      userId,
    });

    // Determinar qual critério usar para buscar as notificações
    let searchCriteria = {};

    if (motoboyId) {
      // Para notificações do motoboy (maioria dos casos)
      searchCriteria = { motoboyId: motoboyId };
    } else if (firebaseUid) {
      // Para notificações por firebaseUid (suporte, etc)
      searchCriteria = { firebaseUid: firebaseUid };
    } else if (userId) {
      // Tentar ambos os casos
      searchCriteria = {
        $or: [{ motoboyId: userId }, { firebaseUid: userId }],
      };
    } else {
      return res.status(400).json({
        message: "É necessário fornecer motoboyId, firebaseUid ou userId",
      });
    }

    console.log("Critério de busca:", searchCriteria);

    // Buscar notificações que NÃO estão marcadas como READ
    const updateResult = await Notification.updateMany(
      {
        ...searchCriteria,
        status: { $ne: "READ" }, // Pegar todas que NÃO são "READ"
      },
      { $set: { status: "READ" } }
    );

    console.log(
      `${updateResult.modifiedCount} notificações marcadas como lidas de ${updateResult.matchedCount} encontradas`
    );

    res.json({
      message: "Todas as notificações marcadas como lidas",
      modifiedCount: updateResult.modifiedCount,
      matchedCount: updateResult.matchedCount,
    });
  } catch (error) {
    console.error("Erro ao marcar todas as notificações como lidas:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "ID da notificação é obrigatório",
      });
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        message: "Notificação não encontrada",
      });
    }

    console.log(`🗑️ Notificação excluída: ${id}`);

    res.json({
      message: "Notificação excluída com sucesso",
      deletedNotification: notification,
    });
  } catch (error) {
    console.error("Erro ao excluir notificação:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteDeliveryRequestNotifications = async (req, res) => {
  try {
    const { motoboyId, orderId } = req.body;

    if (!motoboyId || !orderId) {
      return res.status(400).json({
        message: "motoboyId e orderId são obrigatórios",
      });
    }

    const result = await notificationService.deleteDeliveryRequestNotification(
      motoboyId,
      orderId
    );

    res.json(result);
  } catch (error) {
    console.error("Erro ao excluir notificação de entrega:", error);
    res.status(500).json({ message: error.message });
  }
};

const getFirebaseNotifications = async (req, res) => {
  try {
    const { firebaseUid } = req.query;
    if (!firebaseUid) {
      return res.status(400).json({
        message: "firebaseUid é obrigatório",
      });
    }

    const notifications = await Notification.find({
      firebaseUid: firebaseUid,
    });

    res.json(notifications);
  } catch (error) {
    console.error("Erro ao buscar notificações do Firebase:", error);
    res.status(500).json({ message: error.message });
  }
};

const getAdminNotifications = async (req, res) => {
  try {
    const { firebaseUid } = req.query;

    if (!firebaseUid) {
      return res.status(400).json({
        message: "firebaseUid é obrigatório",
      });
    }

    const notifications = await Notification.find({
      firebaseUid: firebaseUid,
      $or: [
        { type: "ADMIN_ALERT" },
        { type: "SYSTEM" },
        { type: "SECURITY" },
        { type: "REPORT" },
        { type: "STORE_ALERT" },
        { type: "MOTOBOY_ALERT" },
        { type: "CHAT_MESSAGE" },
        { type: "ERROR" },
      ],
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Erro ao buscar notificações de admin:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateAdminNotification = async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        message: "Dados incompletos. id e status são obrigatórios",
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada" });
    }

    notification.status = status;
    await notification.save();

    res.json({
      message: "Notificação atualizada com sucesso",
      notification,
    });
  } catch (error) {
    console.error("Erro ao atualizar notificação de admin:", error);
    res.status(500).json({ message: error.message });
  }
};

const notifyAdmin = async (req, res) => {
  try {
    const { title, message, type, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Dados incompletos. title e message são obrigatórios",
      });
    }

    const notifications = await notificationService.notifyAdmin(
      {
        title,
        message,
        type: type || "ADMIN_ALERT",
        data: data || {},
      },
      req.app
    );

    res.status(201).json({
      message: "Notificações enviadas com sucesso",
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Erro ao enviar notificações para admin:", error);
    res.status(500).json({ message: error.message });
  }
};

router.get("/firebase", getFirebaseNotifications);
router.get("/admin", getAdminNotifications);
router.put("/admin", updateAdminNotification);
router.post("/notifyAdmin", notifyAdmin);
router.put("/mark-as-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);
router.delete("/delivery-request", deleteDeliveryRequestNotifications);
router.post("/notifyOccurrence", notifyOccurrence);
router.post("/notifySupport", notifySupport);
router.post("/generic", createNotificationGeneric);
router.get("/", getNotifications);
router.get("/all", getNotificationsAll);
router.get("/has-unread", hasUnreadNotifications);
router.get("/support", getSupportNotifications);
router.post("/", createNotification);
router.put("/", updateNotification);
router.put("/support", updateSupportNotification);
router.post("/call-style", createCallStyleNotification);
router.post("/call-style/respond", respondToCallStyleNotification);
router.get("/call-style/:callId", getCallInfo);
router.post("/order-ready", orderReadyNotification);

module.exports = router;
