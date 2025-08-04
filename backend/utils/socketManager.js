// backend/utils/socketManager.js
class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // firebaseUid -> socketId
    this.userRooms = new Map(); // firebaseUid -> [rooms]
  }

  // Registrar usuário conectado
  registerUser(firebaseUid, socketId, userType = "user") {
    this.connectedUsers.set(firebaseUid, {
      socketId,
      userType,
      connectedAt: new Date(),
      lastActivity: new Date(),
    });

    console.log(`Usuario registrado: ${firebaseUid} (${userType})`);
  }

  // Remover usuário desconectado
  unregisterUser(firebaseUid) {
    this.connectedUsers.delete(firebaseUid);
    this.userRooms.delete(firebaseUid);
    console.log(`Usuario removido: ${firebaseUid}`);
  }

  // Verificar se usuário está online
  isUserOnline(firebaseUid) {
    return this.connectedUsers.has(firebaseUid);
  }

  // Obter estatísticas de conexões
  getConnectionStats() {
    const stats = {
      totalConnected: this.connectedUsers.size,
      byType: {},
    };

    this.connectedUsers.forEach((userData) => {
      const type = userData.userType;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  // Obter lista de usuários conectados (para debug)
  getConnectedUsers() {
    const users = [];
    this.connectedUsers.forEach((userData, firebaseUid) => {
      users.push({
        firebaseUid,
        socketId: userData.socketId,
        userType: userData.userType,
        connectedAt: userData.connectedAt,
        lastActivity: userData.lastActivity,
      });
    });
    return users;
  }

  // Enviar notificação para usuário específico
  sendNotificationToUser(firebaseUid, eventType, data) {
    try {
      console.log(
        `🔍 [DEBUG] Tentando enviar notificação para ${firebaseUid}, evento: ${eventType}`
      );
      console.log(
        `🔍 [DEBUG] Usuários conectados:`,
        Array.from(this.connectedUsers.keys())
      );

      if (!this.isUserOnline(firebaseUid)) {
        console.warn(`❌ [DEBUG] Usuario ${firebaseUid} não está online`);
        console.warn(
          `❌ [DEBUG] Usuários online atualmente:`,
          this.getConnectionStats()
        );
        return false;
      }

      console.log(
        `✅ [DEBUG] Usuario ${firebaseUid} está online, enviando evento ${eventType}`
      );

      this.io.to(`user:${firebaseUid}`).emit(eventType, {
        ...data,
        timestamp: new Date().toISOString(),
        sentVia: "socket",
      });

      console.log(
        `✅ [DEBUG] Socket notification sent to ${firebaseUid}: ${eventType}`
      );
      return true;
    } catch (error) {
      console.error("❌ [DEBUG] Erro ao enviar notificação socket:", error);
      return false;
    }
  }

  // Broadcast para tipo de usuário
  broadcastToUserType(userType, eventType, data) {
    try {
      this.io.to(`${userType}s`).emit(eventType, {
        ...data,
        timestamp: new Date().toISOString(),
        broadcast: true,
        userType,
      });

      console.log(`Broadcast sent to ${userType}s: ${eventType}`);
      return true;
    } catch (error) {
      console.error(`Erro no broadcast para ${userType}:`, error);
      return false;
    }
  }

  // Enviar para múltiplos usuários
  sendToMultipleUsers(firebaseUids, eventType, data) {
    const results = [];

    firebaseUids.forEach((uid) => {
      const sent = this.sendNotificationToUser(uid, eventType, data);
      results.push({ uid, sent });
    });

    return results;
  }

  // Enviar notificação de pedido para motoboys próximos
  sendOrderNotificationToNearbyMotoboys(motoboys, orderData) {
    const notificationData = {
      type: "NEW_ORDER_OFFER",
      order: orderData,
      expiresAt: new Date(Date.now() + 60000), // 1 minuto para expirar
    };

    const results = motoboys.map((motoboy) => {
      if (motoboy.firebaseUid) {
        const sent = this.sendNotificationToUser(
          motoboy.firebaseUid,
          "newOrderOffer",
          notificationData
        );
        return {
          motoboyId: motoboy._id,
          firebaseUid: motoboy.firebaseUid,
          sent,
        };
      }
      return { motoboyId: motoboy._id, sent: false };
    });

    console.log(
      `Ofertas de pedido enviadas para ${
        results.filter((r) => r.sent).length
      }/${results.length} motoboys`
    );
    return results;
  }

  // Notificar sobre mudança de status do pedido
  notifyOrderStatusChange(orderId, newStatus, involvedUsers = []) {
    const statusData = {
      orderId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    };

    // Enviar para usuários específicos envolvidos no pedido
    involvedUsers.forEach((user) => {
      if (user.firebaseUid) {
        this.sendNotificationToUser(
          user.firebaseUid,
          "orderStatusUpdate",
          statusData
        );
      }
    });

    // Broadcast para dashboards admin
    this.broadcastToUserType("admin", "orderStatusUpdate", statusData);

    return statusData;
  }

  // Notificar sobre localização do motoboy
  notifyLocationUpdate(motoboyId, locationData, orderId = null) {
    const updateData = {
      motoboyId,
      location: locationData,
      orderId,
      timestamp: new Date().toISOString(),
    };

    // Se há um pedido ativo, notificar cliente e loja
    if (orderId) {
      this.io.to(`order:${orderId}`).emit("motoboyLocationUpdate", updateData);
    }

    // Notificar dashboards admin
    this.broadcastToUserType("admin", "motoboyLocationUpdate", updateData);

    return updateData;
  }

  // Gerenciar salas de pedidos
  joinOrderRoom(socketId, orderId, userType) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(`order:${orderId}`);
      console.log(`${userType} entrou na sala do pedido: ${orderId}`);
    }
  }

  leaveOrderRoom(socketId, orderId) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(`order:${orderId}`);
      console.log(`Socket saiu da sala do pedido: ${orderId}`);
    }
  }

  // Limpar conexões inativas
  cleanupInactiveConnections(maxInactiveMinutes = 30) {
    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    let cleaned = 0;

    this.connectedUsers.forEach((userData, firebaseUid) => {
      if (userData.lastActivity < cutoffTime) {
        this.unregisterUser(firebaseUid);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(
        `Limpeza de conexões inativas: ${cleaned} usuarios removidos`
      );
    }

    return cleaned;
  }

  // Atualizar atividade do usuário
  updateUserActivity(firebaseUid) {
    const userData = this.connectedUsers.get(firebaseUid);
    if (userData) {
      userData.lastActivity = new Date();
    }
  }
}

module.exports = SocketManager;
