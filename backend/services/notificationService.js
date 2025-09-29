const Notification = require("../models/Notification");
const Motoboy = require("../models/Motoboy");
const Store = require("../models/Store");
const SupportTeam = require("../models/SupportTeam");
const pushNotificationService = require("./pushNotificationService");

class NotificationService {
  /**
   * Busca notificações pendentes de entrega para um motoboy
   * @param {string} motoboyId - ID do motoboy
   * @returns {Promise<Array>} - Lista de notificações
   */
  async getPendingDeliveryNotifications(motoboyId) {
    return await Notification.find({
      motoboyId: motoboyId,
      status: "PENDING",
      type: "DELIVERY_REQUEST",
    });
  }

  /**
   * Busca todas as notificações de um motoboy
   * @param {string} motoboyId - ID do motoboy
   * @returns {Promise<Array>} - Lista de notificações
   */
  async getAllNotifications(motoboyId) {
    return await Notification.find({
      motoboyId: motoboyId,
    });
  }

  /**
   * Cria uma notificação de solicitação de entrega
   * @param {Object} data - Dados da notificação
   * @param {string} data.motoboyId - ID do motoboy
   * @param {Object} data.order - Dados do pedido
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Notificação criada
   */
  async createDeliveryRequestNotification(data, app) {
    const { motoboyId, order } = data;

    if (!motoboyId || !order) {
      throw new Error("Dados incompletos. motoboyId e order são obrigatórios");
    }

    // Verificar se motoboy existe e está disponível
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      throw new Error("Motoboy não encontrado");
    }

    if (!motoboy.isAvailable) {
      throw new Error("Motoboy não está disponível");
    }

    // Criar a notificação
    const notification = new Notification({
      motoboyId: motoboyId,
      type: "DELIVERY_REQUEST",
      title: `${order.store.name}`,
      message: `${
        order.customer.length > 1 ? "(ESPECIAL) " : ""
      }Entregue por R$${order.motoboy.price.toFixed(2)} - ${order.store.name}`,
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
              orderId: order._id,
            }
          );
        console.log("Notificação enviada via FCM:", fcmNotification);
      } catch (pushError) {
        console.error("Erro ao enviar notificação call style:", pushError);
        // Não falhar o request se a notificação call style falhar
      }
    }
    // Enviar evento SSE se disponível

    const notificationSent = global.sendSocketNotification(
      motoboy.firebaseUid,
      "deliveryRequest",
      {
        order: order,
        notificationId: notification._id,
        type: "deliveryRequest",
        title: notification.title,
        message: notification.message,
      }
    );

    if (app?.locals?.sendEventToStore) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        };

        const notified = app.locals.sendEventToStore(
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

    return notification;
  }

  /**
   * Exclui uma notificação de solicitação de entrega quando aceita
   * @param {string} motoboyId - ID do motoboy
   * @param {string} orderId - ID do pedido
   * @returns {Promise<Object>} - Resultado da exclusão
   */
  async deleteDeliveryRequestNotification(motoboyId, orderId) {
    try {
      // Buscar e excluir notificação de DELIVERY_REQUEST para este motoboy e pedido
      const result = await Notification.findOneAndDelete({
        motoboyId: motoboyId,
        type: "DELIVERY_REQUEST",
        "data.orderId": orderId,
        status: "PENDING",
      });

      if (result) {
        console.log(
          `🗑️ Notificação de entrega excluída: ${result._id} para motoboy ${motoboyId} e pedido ${orderId}`
        );
        return { deleted: true, notificationId: result._id };
      } else {
        console.log(
          `⚠️ Nenhuma notificação de entrega encontrada para exclusão: motoboy ${motoboyId}, pedido ${orderId}`
        );
        return { deleted: false, message: "Notificação não encontrada" };
      }
    } catch (error) {
      console.error("Erro ao excluir notificação de entrega:", error);
      throw error;
    }
  }

  /**
   * Exclui todas as notificações de solicitação de entrega pendentes para um pedido específico
   * @param {string} orderId - ID do pedido
   * @returns {Promise<Object>} - Resultado da exclusão
   */
  async deleteAllDeliveryRequestNotifications(orderId) {
    try {
      // Excluir todas as notificações de DELIVERY_REQUEST pendentes para este pedido
      const result = await Notification.deleteMany({
        type: "DELIVERY_REQUEST",
        "data.orderId": orderId,
        status: "PENDING",
      });

      console.log(
        `🗑️ ${result.deletedCount} notificações de entrega excluídas para o pedido ${orderId}`
      );

      return {
        deleted: result.deletedCount > 0,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error("Erro ao excluir todas as notificações de entrega:", error);
      throw error;
    }
  }

  /**
   * Atualiza o status de uma notificação
   * @param {Object} data - Dados da atualização
   * @param {string} data.id - ID da notificação
   * @param {string} data.status - Novo status
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Notificação atualizada
   */
  async updateNotificationStatus(data, app) {
    const { id, status } = data;

    if (!id || !status) {
      throw new Error("Dados incompletos. id e status são obrigatórios");
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new Error("Notificação não encontrada");
    }

    const motoboy = await Motoboy.findById(notification.motoboyId);
    notification.status = status;
    await notification.save();

    // Enviar evento SSE se disponível

    const notificationSent = global.sendSocketNotification(
      motoboy.firebaseUid,
      "notificationUpdateBell",
      notification.status !== "READ"
    );

    if (app?.locals?.sendEventToStore && motoboy) {
      app.locals.sendEventToStore(
        motoboy.firebaseUid,
        "notificationUpdateBell",
        notification.status !== "READ"
      );
    }

    return notification;
  }

  /**
   * Cria uma notificação genérica
   * @param {Object} data - Dados da notificação
   * @param {string} data.motoboyId - ID do motoboy (opcional)
   * @param {string} data.firebaseUid - UID do Firebase (opcional)
   * @param {string} data.title - Título da notificação
   * @param {string} data.message - Mensagem da notificação
   * @param {string} data.type - Tipo da notificação
   * @param {Date} data.expiresAt - Data de expiração
   * @param {string} data.screen - Tela para redirecionar
   * @param {string} data.chatId - ID do chat (opcional)
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Notificação criada
   */
  async createGenericNotification(data, app) {
    const {
      motoboyId,
      title,
      message,
      type,
      expiresAt,
      firebaseUid,
      screen,
      chatId,
    } = data;

    // Buscar usuário por motoboyId primeiro (se fornecido)
    let user = null;
    let userType = null;

    if (motoboyId) {
      user = await Motoboy.findById(motoboyId);
      if (user) userType = "MOTOBOY";
    }

    // Se não encontrou por motoboyId ou motoboyId não foi fornecido, buscar por firebaseUid
    if (!user && firebaseUid) {
      // Tentar encontrar em Motoboy primeiro
      user = await Motoboy.findOne({ firebaseUid });
      if (user) {
        userType = "MOTOBOY";
      } else {
        // Tentar encontrar em Store
        user = await Store.findOne({ firebaseUid });
        if (user) {
          userType = "STORE";
        } else {
          // Tentar encontrar em SupportTeam
          user = await SupportTeam.findOne({ firebaseUid });
          if (user) {
            userType = "SUPPORT";
          }
        }
      }
    }

    // Criar a notificação
    const notification = new Notification({
      motoboyId: userType === "MOTOBOY" ? user?._id : null,
      firebaseUid: firebaseUid || user?.firebaseUid || null,
      type: type || "SYSTEM",
      title,
      message,
      status: "PENDING",
      expiresAt: expiresAt || new Date(Date.now() + 60000 * 60 * 24 * 7), // 7 dias para expirar
    });

    await notification.save();

    // Enviar push notification se tiver token FCM
    if (user && (user.fcmToken || user.pushToken)) {
      try {
        const token = user.fcmToken || user.pushToken;
        await pushNotificationService.sendCallStyleNotificationFCM(
          token,
          notification.title,
          notification.message,
          {
            notificationId: notification._id,
            type: notification.type,
            screen: screen || "/(tabs)",
            chatId: chatId || null,
            orderId: userType === "MOTOBOY" ? user.race?.orderId : null,
          }
        );
        console.log(
          `📱 Notificação FCM enviada para ${userType}: ${
            user.name || user.businessName
          }`
        );
      } catch (pushError) {
        console.error(
          `Erro ao enviar notificação FCM para ${userType}:`,
          pushError
        );
      }
    } else {
      console.warn("Usuário não encontrado ou não possui token FCM/Push", {
        motoboyId,
        firebaseUid,
        userExists: !!user,
        userType: userType,
        hasFcmToken: user?.fcmToken ? true : false,
        hasPushToken: user?.pushToken ? true : false,
        userName: user?.name || user?.businessName || "Desconhecido",
      });
    }

    // Enviar evento via Socket e SSE se disponível
    if (firebaseUid) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          chatId: chatId || null,
          userType: userType,
        };

        // Enviar notificação via Socket
        const notificationSent = global.sendSocketNotification(
          firebaseUid,
          "genericNotification",
          notifyData
        );

        console.log(
          `🔌 Socket notification ${
            notificationSent ? "enviada" : "falhou"
          } para ${userType}: ${firebaseUid}`
        );

        // Enviar via SSE se disponível
        if (app?.locals?.sendEventToStore) {
          app.locals.sendEventToStore(
            firebaseUid,
            notification.type || "genericNotification",
            notifyData
          );
        }
      } catch (notifyError) {
        console.error(`Erro ao enviar notificação Socket/SSE:`, notifyError);
      }
    }

    return notification;
  }

  /**
   * Notifica todos os membros do suporte
   * @param {Object} data - Dados da notificação
   * @param {string} data.title - Título da notificação
   * @param {string} data.message - Mensagem da notificação
   * @param {Object} data.data - Dados adicionais (opcional)
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Resultado da operação
   */
  async notifySupport(data, app) {
    const { title, message, data: additionalData } = data;

    if (!title || !message) {
      throw new Error("Dados incompletos. title e message são obrigatórios");
    }

    // Buscar todos os membros ativos da equipe de suporte
    const supportMembers = await SupportTeam.find({ active: true });

    if (supportMembers.length === 0) {
      throw new Error("Nenhum membro de suporte ativo encontrado");
    }

    const notifications = [];
    const notificationPromises = [];

    // Criar uma notificação para cada membro do suporte
    for (const supportMember of supportMembers) {
      const notification = new Notification({
        firebaseUid: supportMember.firebaseUid,
        type: "SUPPORT_ALERT",
        title,
        message,
        data: additionalData || {},
        status: "PENDING",
        expiresAt: new Date(Date.now() + 60000 * 60 * 24 * 7), // 7 dias para expirar
      });

      notifications.push(notification);
      notificationPromises.push(notification.save());

      // Enviar evento SSE para este membro específico do suporte
      if (app?.locals?.sendEventToStore) {
        try {
          const notifyData = {
            notificationId: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
          };

          app.locals.sendEventToStore(
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

    return {
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Notifica sobre uma ocorrência
   * @param {Object} data - Dados da ocorrência
   * @param {string} data.title - Título da notificação
   * @param {string} data.message - Mensagem da notificação
   * @param {string} data.firebaseUid - UID do Firebase do destinatário
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Notificação criada
   */
  async notifyOccurrence(data, app) {
    const { title, message, firebaseUid } = data;

    if (!title || !message || !firebaseUid) {
      throw new Error(
        "Dados incompletos. title, message e firebaseUid são obrigatórios"
      );
    }

    const notification = new Notification({
      firebaseUid,
      type: "MOTOBOY",
      title,
      message,
      data: { title, message },
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000 * 60 * 24 * 7), // 7 dias para expirar
    });

    await notification.save();

    // Enviar evento SSE se disponível
    if (app?.locals?.sendEventToStore) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        };

        app.locals.sendEventToStore(
          firebaseUid,
          "occurrenceNotification",
          notifyData
        );
      } catch (notifyError) {
        console.error("Erro ao enviar notificação SSE:", notifyError);
      }
    }

    // Buscar usuário para enviar push notification
    let user;
    user = await Motoboy.findOne({ firebaseUid });
    if (!user) {
      user = await Store.findOne({ firebaseUid });
    }

    if (!user) {
      throw new Error("Usuário não encontrado");
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
              orderId: order._id,
            }
          );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
        // Não falhar o request se a notificação push falhar
      }
    }

    return notification;
  }

  /**
   * Notifica o motoboy sobre mudança de status do pedido
   * @param {Object} data - Dados da notificação
   * @param {string} data.orderId - ID do pedido
   * @param {string} data.orderNumber - Número do pedido
   * @param {string} data.newStatus - Novo status do pedido
   * @param {string} data.previousStatus - Status anterior do pedido
   * @param {string} data.motoboyId - ID do motoboy
   * @param {string} data.storeName - Nome da loja
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Notificação criada
   */
  async notifyOrderStatusChange(data, app) {
    const {
      orderId,
      orderNumber,
      newStatus,
      previousStatus,
      motoboyId,
      storeName,
    } = data;

    if (!orderId || !newStatus || !motoboyId) {
      throw new Error(
        "Dados incompletos. orderId, newStatus e motoboyId são obrigatórios"
      );
    }

    // Buscar motoboy
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      console.warn(
        `Motoboy ${motoboyId} não encontrado para notificação de status`
      );
      return null;
    }

    // Definir título e mensagem baseado no status
    let title,
      message,
      screen = "/(tabs)";

    switch (newStatus) {
      case "em_preparo":
        title = "Pedido Confirmado";
        message = `O pedido ${orderNumber} foi confirmado pela loja ${storeName}. Prepare-se para a retirada.`;
        break;
      case "em_entrega":
        title = "Pedido em Entrega";
        message = `Você já pode entregar o pedido ${orderNumber} da loja ${storeName}.`;
        break;
      case "pronto":
        title = "Pedido Pronto";
        message = `O pedido ${orderNumber} está pronto para retirada na loja ${storeName}.`;
        screen = "/(tabs)";
        break;
      case "entregue":
        title = "Entrega Finalizada";
        message = `Parabéns! O pedido ${orderNumber} foi marcado como entregue.`;
        break;
      case "cancelado":
        title = "Pedido Cancelado";
        message = `O pedido ${orderNumber} foi cancelado pela loja ${storeName}.`;
        break;
      default:
        title = "Atualização do Pedido";
        message = `O status do pedido ${orderNumber} foi atualizado para: ${newStatus}.`;
    }

    // Criar a notificação
    const notification = new Notification({
      motoboyId: motoboy._id,
      firebaseUid: motoboy.firebaseUid,
      type: "ORDER_STATUS_UPDATE",
      title,
      message,
      data: {
        orderId,
        orderNumber,
        newStatus,
        previousStatus,
        storeName,
      },
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60000 * 60 * 24 * 7), // 7 dias para expirar
    });

    await notification.save();

    console.log(
      `Notificação de status criada: ${notification._id} para motoboy ${motoboy.name} - ${previousStatus} → ${newStatus}`
    );

    // Enviar push notification se tiver token FCM
    if (motoboy.fcmToken) {
      //FIXME por favor
      try {
        await pushNotificationService.sendCallStyleNotificationFCM(
          motoboy.fcmToken,
          notification.title,
          notification.message,
          {
            notificationId: notification._id,
            type: notification.type,
            orderId: orderId,
            screen: screen,
            newStatus: newStatus,
          }
        );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push de status:", pushError);
      }
    }

    // Enviar notificação via Socket
    const notificationSent = global.sendSocketNotification(
      motoboy.firebaseUid,
      "orderStatusChanged",
      {
        orderId,
        orderNumber,
        newStatus,
        previousStatus,
        storeName,
        notificationId: notification._id,
        title: notification.title,
        message: notification.message,
      }
    );

    // Enviar evento SSE se disponível
    if (app?.locals?.sendEventToStore) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        };

        app.locals.sendEventToStore(
          motoboy.firebaseUid,
          "orderStatusUpdate",
          notifyData
        );

        console.log(
          `Notificação SSE de status enviada para motoboy ${motoboy.name}: ${previousStatus} → ${newStatus}`
        );
      } catch (notifyError) {
        console.error("Erro ao enviar notificação SSE de status:", notifyError);
      }
    }

    return notification;
  }

  /**
   * Envia notificação para membros da equipe de administração
   * @param {Object} data - Dados da notificação
   * @param {string} data.title - Título da notificação
   * @param {string} data.message - Mensagem da notificação
   * @param {string} data.type - Tipo da notificação (ADMIN_ALERT, SECURITY, etc.)
   * @param {Object} data.data - Dados adicionais da notificação
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Array>} - Lista de notificações criadas
   */
  async notifyAdmin(data, app) {
    const { title, message, type = "ADMIN_ALERT", data: additionalData } = data;

    if (!title || !message) {
      throw new Error("Dados incompletos. title e message são obrigatórios");
    }

    // Buscar todos os membros ativos da equipe de administração
    const Admin = require("../models/Admin");
    const adminMembers = await Admin.find({ active: true });

    if (adminMembers.length === 0) {
      throw new Error("Nenhum membro de administração ativo encontrado");
    }

    const notifications = [];
    const notificationPromises = [];

    // Criar uma notificação para cada membro do admin
    for (const adminMember of adminMembers) {
      const notification = new Notification({
        firebaseUid: adminMember.firebaseUid,
        type,
        title,
        message,
        data: additionalData || {},
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      });

      notifications.push(notification);
      notificationPromises.push(notification.save());

      // Enviar notificação push para web
      if (global.webPushService) {
        try {
          const pushData = {
            title,
            body: message,
            icon: "/logo192.png",
            badge: "/icone-512-gringo.png",
            tag: `admin-${type.toLowerCase()}`,
            data: {
              type,
              notificationId: notification._id,
              url: "/notifications",
              ...additionalData,
            },
            requireInteraction: true,
            vibrate: [200, 100, 200],
          };

          await global.webPushService.sendNotificationToUser(
            adminMember.firebaseUid,
            pushData
          );

          console.log(
            `🔔 Notificação push enviada para admin ${adminMember.name}: ${title}`
          );
        } catch (pushError) {
          console.error(
            `Erro ao enviar notificação push para admin ${adminMember.name}:`,
            pushError
          );
        }
      }

      // Enviar notificação via Socket para admin
      const notificationSent = global.sendSocketNotification(
        adminMember.firebaseUid,
        "adminNotification",
        {
          notificationId: notification._id,
          type,
          title,
          message,
          data: additionalData || {},
        }
      );

      console.log(
        `📡 Notificação Socket para admin ${adminMember.name}: ${
          notificationSent ? "✅" : "❌"
        }`
      );

      // Enviar evento SSE se disponível
      if (app?.locals?.sendEventToStore) {
        try {
          const notifyData = {
            notificationId: notification._id,
            type,
            title,
            message,
            data: additionalData || {},
          };

          app.locals.sendEventToStore(
            adminMember.firebaseUid,
            "adminNotification",
            notifyData
          );

          console.log(
            `📡 Notificação SSE enviada para admin ${adminMember.name}: ${title}`
          );
        } catch (notifyError) {
          console.error(
            `Erro ao enviar notificação SSE para admin ${adminMember.name}:`,
            notifyError
          );
        }
      }
    }

    // Aguardar todas as notificações serem salvas
    await Promise.all(notificationPromises);

    console.log(
      `✅ ${notifications.length} notificações administrativas criadas: ${title}`
    );

    return notifications;
  }
}

module.exports = new NotificationService();
