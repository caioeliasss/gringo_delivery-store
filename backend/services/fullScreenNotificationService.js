const admin = require("../config/firebase-admin");
const Notification = require("../models/Notification");
const Motoboy = require("../models/Motoboy");
const Store = require("../models/Store");

class FullScreenNotificationService {
  /**
   * Cria e envia uma notificação fullscreen estilo chamada
   * @param {Object} options - Opções da notificação
   * @param {string} options.recipientId - ID do destinatário (motoboy, store, etc)
   * @param {string} options.recipientType - Tipo: 'motoboy', 'store', 'support'
   * @param {string} options.title - Título da notificação
   * @param {string} options.message - Mensagem da notificação
   * @param {string} options.callType - Tipo da chamada: 'delivery', 'support', 'emergency'
   * @param {Object} options.data - Dados adicionais
   * @param {number} options.timeoutSeconds - Timeout em segundos (padrão: 30)
   * @param {Object} app - Instância do Express para SSE
   */
  async createFullScreenNotification(options, app = null) {
    const {
      recipientId,
      recipientType = "motoboy",
      title,
      message,
      callType = "delivery",
      data = {},
      timeoutSeconds = 30,
    } = options;

    try {
      // 1. Validar dados obrigatórios
      if (!recipientId || !title || !message) {
        throw new Error(
          `recipientId, title e message são obrigatórios ${!recipientId} ${!title} ${!message}`
        );
      }

      // 2. Buscar destinatário
      const recipient = await this.getRecipient(recipientId, recipientType);
      if (!recipient) {
        throw new Error(`${recipientType} não encontrado: ${recipientId}`);
      }

      // 3. Gerar ID único da chamada
      const callId = `call_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // 4. Criar notificação no banco
      const notification = await this.saveNotificationToDB({
        recipientId,
        recipientType,
        title,
        message,
        callType,
        callId,
        data,
        timeoutSeconds,
      });

      // 5. Enviar via FCM se token FCM disponível
      if (recipient.fcmToken) {
        await this.sendFCMNotification(recipient.fcmToken, {
          title,
          message,
          callId,
          callType,
          timeoutSeconds,
          ...data,
        });
        console.log(
          `📱 FCM fullscreen enviado para ${
            recipient.name || recipient.storeName
          }`
        );
      }

      // 6. Enviar via SSE como fallback
      if (app?.locals?.sendEventToStore && recipient.firebaseUid) {
        this.sendSSENotification(app, recipient.firebaseUid, {
          title,
          message,
          callId,
          callType,
          timeoutSeconds,
          notificationId: notification._id,
          ...data,
        });
        console.log(
          `📡 SSE fullscreen enviado para ${
            recipient.name || recipient.storeName
          }`
        );
      }

      // 7. Configurar auto-timeout
      this.scheduleTimeout(
        callId,
        notification._id,
        timeoutSeconds,
        app,
        recipient
      );

      return {
        success: true,
        callId,
        notificationId: notification._id,
        recipient: {
          id: recipient._id,
          name: recipient.name || recipient.storeName,
          type: recipientType,
        },
      };
    } catch (error) {
      console.error("❌ Erro ao criar notificação fullscreen:", error);
      throw error;
    }
  }

  /**
   * Busca o destinatário baseado no tipo
   */
  async getRecipient(recipientId, recipientType) {
    switch (recipientType) {
      case "motoboy":
        return await Motoboy.findById(recipientId);
      case "store":
        return await Store.findById(recipientId);
      default:
        throw new Error(`Tipo de destinatário não suportado: ${recipientType}`);
    }
  }

  /**
   * Salva a notificação no banco de dados
   */
  async saveNotificationToDB(options) {
    const notification = new Notification({
      motoboyId:
        options.recipientType === "motoboy" ? options.recipientId : null,
      storeId: options.recipientType === "store" ? options.recipientId : null,
      type: "FULLSCREEN_CALL",
      title: options.title,
      message: options.message,
      data: {
        callId: options.callId,
        callType: options.callType,
        isFullScreen: true,
        timeoutSeconds: options.timeoutSeconds,
        ...options.data,
      },
      status: "PENDING",
      expiresAt: new Date(Date.now() + options.timeoutSeconds * 1000),
    });

    await notification.save();
    console.log(`💾 Notificação salva no DB: ${notification._id}`);
    return notification;
  }

  /**
   * Envia notificação via FCM
   */
  async sendFCMNotification(fcmToken, data) {
    const payload = {
      token: fcmToken,
      notification: {
        title: data.title,
        body: data.message,
      },
      data: {
        isCallStyle: "true",
        callId: data.callId,
        callType: data.callType,
        timeoutSeconds: data.timeoutSeconds.toString(),
        screen: "IncomingCallScreen",
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        ),
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "call_channel",
          priority: "max",
          visibility: "public",
          sound: "ringtone",
          vibrate_timings: ["500", "1000", "500", "1000"],
          full_screen_intent: true,
          importance: "max",
          category: "call",
          actions: [
            {
              action: "ACCEPT_CALL",
              title: "Aceitar",
            },
            {
              action: "DECLINE_CALL",
              title: "Recusar",
            },
          ],
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            alert: {
              title: data.title,
              body: data.message,
            },
            sound: "default",
            category: "INCOMING_CALL",
            "interruption-level": "time-sensitive",
            "content-available": 1,
            "mutable-content": 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(payload);
      return response;
    } catch (error) {
      console.error("❌ Erro FCM:", error);
      throw error;
    }
  }

  /**
   * Envia notificação via SSE
   */
  sendSSENotification(app, firebaseUid, data) {
    try {
      app.locals.sendEventToStore(firebaseUid, "incomingCall", {
        type: "FULLSCREEN_CALL",
        isFullScreen: true,
        ...data,
      });
    } catch (error) {
      console.error("❌ Erro SSE:", error);
    }
  }

  /**
   * Agenda timeout automático da chamada
   */
  scheduleTimeout(callId, notificationId, timeoutSeconds, app, recipient) {
    setTimeout(async () => {
      try {
        // Verificar se ainda está pendente
        const notification = await Notification.findById(notificationId);
        if (notification && notification.status === "PENDING") {
          // Marcar como expirada
          notification.status = "TIMEOUT";
          await notification.save();

          console.log(`⏰ Chamada ${callId} expirou por timeout`);

          // Notificar cliente do timeout via SSE
          if (app?.locals?.sendEventToStore && recipient.firebaseUid) {
            app.locals.sendEventToStore(recipient.firebaseUid, "callTimeout", {
              callId,
              notificationId,
            });
          }
        }
      } catch (error) {
        console.error("❌ Erro no timeout:", error);
      }
    }, timeoutSeconds * 1000);
  }

  /**
   * Processa resposta da chamada (aceitar/recusar)
   */
  async processCallResponse(callId, action, responderId) {
    try {
      const notification = await Notification.findOne({
        "data.callId": callId,
        status: "PENDING",
      });

      if (!notification) {
        throw new Error("Chamada não encontrada ou já processada");
      }

      // Atualizar status
      notification.status = action.toUpperCase(); // 'ACCEPTED' ou 'DECLINED'
      notification.respondedAt = new Date();
      notification.responderId = responderId;
      await notification.save();

      console.log(`📞 Chamada ${callId} ${action} por ${responderId}`);

      return {
        success: true,
        callId,
        action,
        responderId,
      };
    } catch (error) {
      console.error("❌ Erro ao processar resposta da chamada:", error);
      throw error;
    }
  }

  /**
   * Métodos de conveniência para tipos específicos de chamada
   */

  // Chamada de entrega urgente
  async createUrgentDeliveryCall(motoboyId, orderData, app) {
    return this.createFullScreenNotification(
      {
        recipientId: motoboyId,
        recipientType: "motoboy",
        title: `🚨 ENTREGA URGENTE - ${orderData.storeName}`,
        message: `Pedido #${orderData.orderNumber} • R$ ${orderData.total}`,
        callType: "urgent_delivery",
        data: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          storeName: orderData.storeName,
          customerName: orderData.customerName,
          totalValue: orderData.total,
          priority: "high",
        },
        timeoutSeconds: 60,
      },
      app
    );
  }

  // Chamada de suporte
  async createSupportCall(storeId, issue, app) {
    return this.createFullScreenNotification(
      {
        recipientId: storeId,
        recipientType: "store",
        title: `🆘 SUPORTE NECESSÁRIO`,
        message: `Problema: ${issue.description}`,
        callType: "support",
        data: {
          issueId: issue._id,
          issueType: issue.type,
          priority: issue.priority,
          description: issue.description,
        },
        timeoutSeconds: 120,
      },
      app
    );
  }

  // Chamada de emergência
  async createEmergencyCall(recipientId, recipientType, emergencyData, app) {
    return this.createFullScreenNotification(
      {
        recipientId,
        recipientType,
        title: `🚨 EMERGÊNCIA`,
        message: emergencyData.message,
        callType: "emergency",
        data: {
          emergencyType: emergencyData.type,
          location: emergencyData.location,
          reportedBy: emergencyData.reportedBy,
          priority: "critical",
        },
        timeoutSeconds: 45,
      },
      app
    );
  }
}

module.exports = new FullScreenNotificationService();
