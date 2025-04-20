// services/fcmService.js
const admin = require("firebase-admin");

// Certifique-se de que o Firebase Admin SDK esteja inicializado no seu app

module.exports = {
  sendNotification: async (token, notification) => {
    try {
      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log("Notificação enviada:", response);
      return response;
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      throw error;
    }
  },
};
