const axios = require("axios");
const admin = require("firebase-admin");

/**
 * Serviço para enviar notificações push usando a API Expo e FCM
 */
const pushNotificationService = {
  /**
   * Envia uma notificação push para um token Expo
   * @param {string} expoPushToken - Token do dispositivo destino
   * @param {string} title - Título da notificação
   * @param {string} body - Corpo da notificação
   * @param {object} data - Dados adicionais para a notificação
   * @returns {Promise} - Resultado do envio
   */

  convertToStringData(obj) {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        result[key] = "";
      } else if (typeof value === "object") {
        // Se for objeto, converte para JSON string
        result[key] = JSON.stringify(value);
      } else {
        // Converte para string
        result[key] = String(value);
      }
    }

    return result;
  },

  async sendPushNotification(expoPushToken, title, body, data = {}) {
    // Validar o formato do token
    if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken[")) {
      console.log("Token inválido:", expoPushToken);
      throw new Error("Formato de token inválido");
    }

    // Criar o payload da notificação
    const message = {
      to: expoPushToken,
      sound: "default",
      title: title,
      body: body,
      data: data,
      badge: 1,
      priority: "high", // Para Android
    };

    console.log(`Enviando notificação push para: ${expoPushToken}`);

    try {
      // Enviar a notificação usando a API Expo
      const response = await axios.post(
        "https://exp.host/--/api/v2/push/send",
        message,
        {
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Resposta da API Expo:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Erro ao enviar notificação push:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Envia notificações push para múltiplos tokens
   * @param {Array} tokens - Array de tokens Expo
   * @param {string} title - Título da notificação
   * @param {string} body - Corpo da notificação
   * @param {object} data - Dados adicionais
   * @returns {Promise} - Resultados do envio
   */
  async sendPushNotifications(tokens, title, body, data = {}) {
    if (!tokens || tokens.length === 0) {
      throw new Error("Nenhum token fornecido");
    }

    // Filtrar tokens válidos
    const validTokens = tokens.filter(
      (token) => token && token.startsWith("ExponentPushToken[")
    );

    if (validTokens.length === 0) {
      throw new Error("Nenhum token válido encontrado");
    }

    // Preparar mensagens para todos os tokens
    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data,
      badge: 1,
    }));

    try {
      // Enviar batch de notificações
      const response = await axios.post(
        "https://exp.host/--/api/v2/push/send",
        messages,
        {
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Erro ao enviar notificações em batch:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Envia uma notificação push estilo chamada (full screen intent)
   * @param {string} expoPushToken - Token do dispositivo destino
   * @param {string} title - Título da notificação (ex: nome do chamador)
   * @param {string} body - Corpo da notificação
   * @param {object} data - Dados adicionais para a notificação
   * @param {number} timeoutSeconds - Tempo em segundos para auto-cancelar (padrão: 30)
   * @returns {Promise} - Resultado do envio
   */
  async sendCallStyleNotification(
    expoPushToken,
    title,
    body,
    data = {},
    timeoutSeconds = 30
  ) {
    // Validar o formato do token
    if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken[")) {
      console.log("Token inválido:", expoPushToken);
      throw new Error("Formato de token inválido");
    }

    // Criar o payload da notificação estilo chamada
    const message = {
      to: expoPushToken,
      sound: "default", // Som personalizado pode ser configurado no app
      title: title,
      body: body,
      data: {
        ...data,
        type: "call_style",
        showFullScreen: true,
        timeout: timeoutSeconds * 1000, // Converter para millisegundos
        vibrate: [0, 1000, 500, 1000, 500, 1000], // Padrão de vibração
        importance: "max",
        category: "call",
        actions: [
          {
            id: "accept",
            title: "Aceitar",
            pressAction: { id: "accept" },
          },
          {
            id: "decline",
            title: "Recusar",
            pressAction: { id: "decline" },
          },
        ],
      },
      badge: 1,
      priority: "high", // Máxima prioridade
      channelId: "call_notifications", // Canal específico para chamadas
      categoryId: "call", // Categoria de chamada
      mutableContent: true, // Permite modificação no cliente
      contentAvailable: true, // Para background processing
      ttl: timeoutSeconds, // Time to live em segundos
    };

    console.log(`Enviando notificação estilo chamada para: ${expoPushToken}`);

    try {
      // Enviar a notificação usando a API Expo
      const response = await axios.post(
        "https://exp.host/--/api/v2/push/send",
        message,
        {
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Resposta da API Expo (Call Style):", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Erro ao enviar notificação estilo chamada:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Envia uma notificação push estilo chamada (full screen intent) usando FCM
   * @param {string} token - Token do dispositivo destino
   * @param {string} title - Título da notificação (ex: nome do chamador)
   * @param {string} message - Mensagem da notificação
   * @param {object} data - Dados adicionais para a notificação
   * @returns {Promise} - Resultado do envio
   */
  async sendCallStyleNotificationFCM(token, title, message, data = {}) {
    try {
      // Converter todos os dados para string (obrigatório no FCM)
      const stringData = this.convertToStringData({
        ...data,
        isCallStyle: "true",
        type: data.type || "call_style",
        screen: data.screen || "IncomingCallScreen",
        timestamp: Date.now().toString(),
        notificationId: data.notificationId?.toString() || "",
        orderId: data.orderId?.toString() || "",
        timeoutSeconds: "30",
        title: title,
        body: message,
        message: message,
      });

      const payload = {
        token: token,
        data: stringData,
        android: {
          priority: "high",
        },
        apns: {
          headers: {
            "apns-priority": "10",
            "apns-push-type": "alert",
          },
          payload: {
            aps: {
              alert: {
                title: title,
                body: message,
              },
              sound: "default",
              badge: 1,
              "content-available": 1,
              "mutable-content": 1,
              category: "DELIVERY_NOTIFICATION",
              "interruption-level": "time-sensitive",
            },
          },
        },
      };

      const response = await admin.messaging().send(payload);
      return response;
    } catch (error) {
      console.error("❌ Erro ao enviar FCM:", error);
      throw error;
    }
  },
};

module.exports = pushNotificationService;
