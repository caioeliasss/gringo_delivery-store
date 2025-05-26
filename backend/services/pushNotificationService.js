const axios = require("axios");

/**
 * Serviço para enviar notificações push usando a API Expo
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
};

module.exports = pushNotificationService;
