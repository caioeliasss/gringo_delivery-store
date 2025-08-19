// backend/socket/socketHandler.js
const Motoboy = require("../models/Motoboy");
const Order = require("../models/Order");
const Travel = require("../models/Travel");
const notificationService = require("../services/notificationService");
const motoboyServices = require("../services/motoboyServices");

module.exports = (io, socketManager) => {
  io.on("connection", (socket) => {
    const motoboyId = socket.handshake.query.motoboyId;
    const firebaseUid = socket.handshake.query.firebaseUid;
    const userType = socket.handshake.query.userType || "motoboy"; // motoboy, store, support

    console.log(
      `Usuario conectado via socket: ${
        firebaseUid || motoboyId
      }, Tipo: ${userType}`
    );

    // Registrar usuário no SocketManager
    if (firebaseUid) {
      socketManager.registerUser(firebaseUid, socket.id, userType);
      socket.join(`user:${firebaseUid}`);
    }

    // Juntar o usuário às salas apropriadas
    if (motoboyId) {
      socket.join(`motoboy:${motoboyId}`);
    }

    // Sala por tipo de usuário
    socket.join(`${userType}s`);

    // Confirmar conexão
    socket.emit("connection:success", {
      message: "Conectado com sucesso",
      timestamp: new Date().toISOString(),
      socketId: socket.id,
    });

    // Receber atualização de localização
    socket.on("updateLocation", async (locationData) => {
      try {
        // console.log(`Localização recebida de ${motoboyId}:`, locationData);

        // Validar dados recebidos
        if (!locationData.latitude || !locationData.longitude) {
          throw new Error("Dados de localização inválidos");
        }

        // Atualizar no banco de dados
        const updatedMotoboy = await Motoboy.findByIdAndUpdate(
          motoboyId,
          {
            coordinates: [locationData.longitude, locationData.latitude],
            lastLocationUpdate: new Date(),
            isOnline: true, // Marcar como online quando atualiza localização
            // Se você quiser armazenar mais informações
            currentLocation: {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy,
              timestamp: locationData.timestamp || new Date().toISOString(),
            },
          },
          { new: true } // Retorna o documento atualizado
        );

        if (!updatedMotoboy) {
          throw new Error("Motoboy não encontrado");
        }

        // Emitir para outros clientes interessados (dashboard admin, cliente, etc)
        io.emit("motoboyLocationUpdate", {
          motoboyId,
          location: locationData,
          timestamp: new Date().toISOString(),
        });

        // Confirmar recebimento
        socket.emit("locationUpdate:success", {
          status: "success",
          message: "Localização atualizada com sucesso",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Erro ao atualizar localização:", error);
        socket.emit("locationUpdate:error", {
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Aceitar pedido via socket
    socket.on("acceptOrder", async (data) => {
      try {
        const { orderId, motoboyId, travelId } = data;
        console.log(
          `🔌 [SOCKET] Pedido ${orderId} aceito pelo motoboy ${motoboyId} e travelId ${travelId}`
        );

        const motoboy = await Motoboy.findById(motoboyId);
        if (!motoboy) {
          throw new Error("Motoboy não encontrado");
        }

        // Atualizar motoboy como indisponível e com corrida ativa
        await Motoboy.findByIdAndUpdate(motoboyId, {
          isAvailable: false,
          race: {
            travelId: travelId,
            orderId: orderId,
            active: true,
          },
        });

        // Atualizar status do pedido no banco de dados
        await Order.findByIdAndUpdate(orderId, {
          status: "em_preparo",
          "motoboy.motoboyId": motoboyId,
          "motoboy.name": motoboy.name,
          "motoboy.phone": motoboy.phoneNumber,
          "motoboy.phoneNumber": motoboy.phoneNumber,
          "motoboy.queue.status": "confirmado",
        });

        console.log(
          `✅ [SOCKET] Pedido ${orderId} aceito e motoboy ${motoboyId} marcado como indisponível`
        );

        // **NOVA INTEGRAÇÃO** - Notificar motoboyServices sobre a aceitação
        motoboyServices.handleOrderAcceptance(orderId, motoboyId);

        // **EXCLUIR NOTIFICAÇÕES** - Remover todas as notificações de entrega para este pedido
        try {
          // Excluir a notificação específica do motoboy que aceitou
          await notificationService.deleteDeliveryRequestNotification(
            motoboyId,
            orderId
          );

          // Excluir todas as outras notificações pendentes para este pedido
          await notificationService.deleteAllDeliveryRequestNotifications(
            orderId
          );

          console.log(
            `🗑️ Todas as notificações de entrega para o pedido ${orderId} foram excluídas`
          );
        } catch (notificationError) {
          console.error("Erro ao excluir notificações:", notificationError);
          // Não falhar o processo de aceitação se a exclusão das notificações falhar
        }

        // Notificar loja sobre aceite
        io.emit("orderAccepted", {
          orderId,
          motoboyId,
          travelId,
          timestamp: new Date().toISOString(),
        });

        socket.emit("acceptOrder:success", {
          orderId,
          message: "Pedido aceito com sucesso",
        });
      } catch (error) {
        console.error("Erro ao aceitar pedido:", error);
        socket.emit("acceptOrder:error", {
          message: error.message,
        });
      }
    });

    // Recusar pedido via socket
    socket.on("declineOrder", async (data) => {
      try {
        const { orderId, motoboyId, reason } = data;
        console.log(
          `🔌 [SOCKET] Pedido ${orderId} recusado pelo motoboy ${motoboyId}`
        );

        // **NOVA INTEGRAÇÃO** - Notificar motoboyServices sobre a recusa
        const requestKey = `${orderId}-${motoboyId}`;
        const pendingRequest = motoboyServices.requestQueue.get(requestKey);

        if (pendingRequest) {
          console.log(`❌ [SOCKET] Limpando request pendente devido à recusa`);

          if (pendingRequest.timeoutId) {
            clearTimeout(pendingRequest.timeoutId);
          }

          motoboyServices.requestQueue.delete(requestKey);
          pendingRequest.resolve(false);
        }

        // Notificar sistema sobre recusa
        io.emit("orderDeclined", {
          orderId,
          motoboyId,
          reason,
          timestamp: new Date().toISOString(),
        });

        socket.emit("declineOrder:success", {
          orderId,
          message: "Pedido recusado",
        });
      } catch (error) {
        socket.emit("declineOrder:error", {
          message: error.message,
        });
      }
    });

    // Responder notificação estilo chamada
    socket.on("respondCallNotification", async (data) => {
      try {
        const { callId, action, firebaseUid } = data;

        // Emitir resposta para sistema
        io.emit("callNotificationResponse", {
          callId,
          action,
          firebaseUid,
          timestamp: new Date().toISOString(),
        });

        socket.emit("respondCallNotification:success", {
          callId,
          action,
          message: `Chamada ${action === "accept" ? "aceita" : "recusada"}`,
        });
      } catch (error) {
        socket.emit("respondCallNotification:error", {
          message: error.message,
        });
      }
    });

    // Marcar notificação como lida
    socket.on("markNotificationRead", async (data) => {
      try {
        const { notificationId } = data;

        // Emitir para outros dispositivos do mesmo usuário
        if (firebaseUid) {
          socket.to(`user:${firebaseUid}`).emit("notificationMarkedRead", {
            notificationId,
            timestamp: new Date().toISOString(),
          });
        }

        socket.emit("markNotificationRead:success", {
          notificationId,
          message: "Notificação marcada como lida",
        });
      } catch (error) {
        socket.emit("markNotificationRead:error", {
          message: error.message,
        });
      }
    });

    // Lidar com eventos de pedidos
    socket.on("orderStatusUpdate", async (data) => {
      try {
        console.log("Atualização de status do pedido:", data);

        // Emitir para outros interessados
        io.emit("orderUpdate", {
          orderId: data.orderId,
          status: data.status,
          motoboyId: motoboyId,
          timestamp: new Date().toISOString(),
        });

        socket.emit("orderUpdate:success", {
          status: "success",
          message: "Status do pedido atualizado",
        });
      } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
        socket.emit("orderUpdate:error", {
          status: "error",
          message: error.message,
        });
      }
    });

    // Desconexão
    socket.on("disconnect", () => {
      console.log(
        `Usuario desconectado: ${firebaseUid || motoboyId}, Socket ID: ${
          socket.id
        }`
      );

      // Remover usuário do SocketManager
      if (firebaseUid) {
        socketManager.unregisterUser(firebaseUid);
      }

      // Opcional: Atualizar status do motoboy para offline
      if (motoboyId) {
        Motoboy.findByIdAndUpdate(motoboyId, {
          isOnline: false,
          lastSeen: new Date(),
        }).catch((err) =>
          console.error("Erro ao atualizar status offline:", err)
        );
      }
    });

    // Eventos de heartbeat para manter conexão
    socket.on("heartbeat", () => {
      socket.emit("heartbeat:response", {
        timestamp: new Date().toISOString(),
      });
    });

    // Entrar em sala específica
    socket.on("joinRoom", (roomName) => {
      socket.join(roomName);
      socket.emit("joinRoom:success", {
        room: roomName,
        message: "Entrou na sala com sucesso",
      });
    });

    // Sair de sala específica
    socket.on("leaveRoom", (roomName) => {
      socket.leave(roomName);
      socket.emit("leaveRoom:success", {
        room: roomName,
        message: "Saiu da sala com sucesso",
      });
    });
  });

  // Retornar função para enviar notificações
  return {
    sendNotification: global.sendSocketNotification,

    // Função para broadcast para todos os motoboys
    broadcastToMotoboys: (eventType, data) => {
      io.to("motoboys").emit(eventType, data);
    },

    // Função para broadcast para todas as lojas
    broadcastToStores: (eventType, data) => {
      io.to("stores").emit(eventType, data);
    },

    // Função para broadcast para suporte
    broadcastToSupport: (eventType, data) => {
      io.to("supports").emit(eventType, data);
    },
  };
};
