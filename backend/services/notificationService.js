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

    // Enviar push notification se o motoboy tiver token
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
      }
    }

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

    // Verificar se motoboy existe
    let motoboy = null;
    if (motoboyId) {
      motoboy = await Motoboy.findById(motoboyId);
    }

    if (!motoboy && firebaseUid) {
      motoboy = await Motoboy.findOne({ firebaseUid });
    }

    // Criar a notificação
    const notification = new Notification({
      motoboyId: motoboy ? motoboy._id : null,
      firebaseUid: firebaseUid || (motoboy ? motoboy.firebaseUid : null),
      type: type || "SYSTEM",
      title,
      message,
      status: "PENDING",
      expiresAt: expiresAt || new Date(Date.now() + 60000 * 60 * 24 * 7), // 7 dias para expirar
    });

    await notification.save();

    // Enviar push notification se tiver token
    if (motoboy?.pushToken) {
      try {
        await pushNotificationService.sendPushNotification(
          motoboy.pushToken,
          notification.title,
          notification.message,
          {
            notificationId: notification._id,
            type: notification.type,
            screen: screen || "notifications",
          }
        );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
      }
    }

    // Enviar evento SSE se disponível
    if (app?.locals?.sendEventToStore && firebaseUid) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          chatId: chatId || null,
        };

        app.locals.sendEventToStore(
          firebaseUid,
          notification.type || "genericNotification",
          notifyData
        );
      } catch (notifyError) {
        console.error(`Erro ao enviar notificação SSE:`, notifyError);
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
            screen: "/occurrences",
          }
        );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push:", pushError);
      }
    }

    return notification;
  }

  /**
   * Cria uma notificação estilo chamada do WhatsApp (full screen intent)
   * @param {Object} data - Dados da notificação
   * @param {string} data.motoboyId - ID do motoboy (opcional)
   * @param {string} data.firebaseUid - UID do Firebase (opcional)
   * @param {string} data.title - Título da notificação (nome do chamador)
   * @param {string} data.message - Mensagem da notificação
   * @param {string} data.type - Tipo da notificação (padrão: CALL_STYLE)
   * @param {number} data.timeoutSeconds - Tempo em segundos para auto-cancelar (padrão: 30)
   * @param {string} data.callId - ID único da chamada
   * @param {string} data.screen - Tela para redirecionar ao aceitar
   * @param {Object} data.additionalData - Dados adicionais para a chamada
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Notificação criada
   */
  async createCallStyleNotification(data, app) {
    const {
      motoboyId,
      firebaseUid,
      title,
      message,
      type = "CALL_STYLE",
      timeoutSeconds = 30,
      callId,
      screen = "IncomingCall",
      additionalData = {},
    } = data;

    if (!title || !message) {
      throw new Error("Dados incompletos. title e message são obrigatórios");
    }

    // Verificar se motoboy existe
    let motoboy = null;
    if (motoboyId) {
      motoboy = await Motoboy.findById(motoboyId);
    }

    if (!motoboy && firebaseUid) {
      motoboy = await Motoboy.findOne({ firebaseUid });
    }

    // Buscar usuário se não for motoboy (pode ser loja ou suporte)
    let user = motoboy;
    if (!user && firebaseUid) {
      user = await Store.findOne({ firebaseUid });
      if (!user) {
        user = await SupportTeam.findOne({ firebaseUid });
      }
    }

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Gerar ID único da chamada se não fornecido
    const generatedCallId =
      callId ||
      `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Criar a notificação
    const notification = new Notification({
      motoboyId: motoboy ? motoboy._id : null,
      firebaseUid: firebaseUid || user.firebaseUid,
      type: type,
      title,
      message,
      data: {
        callId: generatedCallId,
        screen,
        isCallStyle: true,
        timeoutSeconds,
        ...additionalData,
      },
      status: "PENDING",
      expiresAt: new Date(Date.now() + timeoutSeconds * 1000), // Expira conforme timeout
    });

    await notification.save();

    console.log(
      `Notificação estilo chamada criada: ${notification._id} para usuário ${user.firebaseUid}`
    );

    // Enviar push notification estilo chamada se tiver token
    if (user.pushToken) {
      try {
        await pushNotificationService.sendCallStyleNotification(
          user.pushToken,
          title,
          message,
          {
            notificationId: notification._id,
            type: type,
            callId: generatedCallId,
            screen,
            ...additionalData,
          },
          timeoutSeconds
        );

        console.log(
          `Push notification estilo chamada enviada para ${user.name || user.storeName || user.firebaseUid}`
        );
      } catch (pushError) {
        console.error("Erro ao enviar notificação push estilo chamada:", pushError);
      }
    }

    // Enviar evento SSE se disponível
    if (app?.locals?.sendEventToStore) {
      try {
        const notifyData = {
          notificationId: notification._id,
          type: type,
          title: title,
          message: message,
          callId: generatedCallId,
          isCallStyle: true,
          timeoutSeconds,
          data: notification.data,
        };

        app.locals.sendEventToStore(
          user.firebaseUid,
          "incomingCall",
          notifyData
        );

        console.log(
          `Evento SSE de chamada enviado para ${user.name || user.storeName || user.firebaseUid}`
        );
      } catch (notifyError) {
        console.error("Erro ao enviar evento SSE de chamada:", notifyError);
      }
    }

    return {
      notification,
      callId: generatedCallId,
      user: {
        id: user._id,
        name: user.name || user.storeName,
        firebaseUid: user.firebaseUid,
      },
    };
  }

  /**
   * Responde a uma notificação estilo chamada (aceitar/recusar)
   * @param {Object} data - Dados da resposta
   * @param {string} data.callId - ID da chamada
   * @param {string} data.action - Ação: "accept" ou "decline"
   * @param {string} data.firebaseUid - UID do Firebase do usuário que está respondendo
   * @param {Object} app - Objeto da aplicação para SSE
   * @returns {Promise<Object>} - Resultado da resposta
   */
  async respondToCallStyleNotification(data, app) {
    const { callId, action, firebaseUid } = data;

    if (!callId || !action || !firebaseUid) {
      throw new Error("Dados incompletos. callId, action e firebaseUid são obrigatórios");
    }

    if (!["accept", "decline"].includes(action)) {
      throw new Error("Ação inválida. Use 'accept' ou 'decline'");
    }

    // Buscar a notificação pelo callId
    const notification = await Notification.findOne({
      "data.callId": callId,
      type: "CALL_STYLE",
      status: "PENDING",
    });

    if (!notification) {
      throw new Error("Chamada não encontrada ou já foi respondida");
    }

    // Verificar se o usuário tem permissão para responder esta chamada
    if (notification.firebaseUid !== firebaseUid) {
      throw new Error("Usuário não autorizado para responder esta chamada");
    }

    // Atualizar o status da notificação
    notification.status = action === "accept" ? "ACCEPTED" : "DECLINED";
    notification.data = {
      ...notification.data,
      response: action,
      respondedAt: new Date(),
    };

    await notification.save();

    console.log(
      `Chamada ${callId} ${action === "accept" ? "aceita" : "recusada"} por ${firebaseUid}`
    );

    // Enviar evento SSE de resposta
    if (app?.locals?.sendEventToStore) {
      try {
        const responseData = {
          callId,
          action,
          notificationId: notification._id,
          respondedAt: notification.data.respondedAt,
        };

        app.locals.sendEventToStore(firebaseUid, "callResponse", responseData);

        console.log(`Evento SSE de resposta da chamada enviado para ${firebaseUid}`);
      } catch (notifyError) {
        console.error("Erro ao enviar evento SSE de resposta:", notifyError);
      }
    }

    return {
      callId,
      action,
      notification,
      success: true,
    };
  }
}

module.exports = new NotificationService();
