// app/services/socketService.js - Para React Native
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 2000;
    this.heartbeatInterval = null;
  }

  async connect(firebaseUid, userType = "motoboy", token = null) {
    try {
      if (this.socket && this.isConnected) {
        console.log("Socket já conectado");
        return;
      }

      const API_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

      console.log("Conectando ao socket...", { firebaseUid, userType });

      this.socket = io(API_URL, {
        query: {
          firebaseUid,
          userType,
        },
        auth: token ? { token } : undefined,
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxRetries,
        reconnectionDelay: this.retryDelay,
      });

      this.setupEventListeners();
      this.startHeartbeat();
    } catch (error) {
      console.error("Erro ao conectar socket:", error);
      this.handleConnectionError();
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket conectado com sucesso:", this.socket.id);
      this.isConnected = true;
      this.connectionRetries = 0;
      this.emit("connection:success");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket desconectado:", reason);
      this.isConnected = false;
      this.emit("connection:lost", { reason });

      if (reason === "io server disconnect") {
        // Reconectar se o servidor desconectou
        this.reconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Erro de conexão socket:", error);
      this.isConnected = false;
      this.handleConnectionError();
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconectado após", attemptNumber, "tentativas");
      this.isConnected = true;
      this.emit("connection:restored");
    });

    // Eventos específicos do sistema
    this.socket.on("notificationUpdate", (data) => {
      console.log("Nova notificação recebida:", data);
      this.emit("notificationReceived", data);
    });

    this.socket.on("newOrderOffer", (data) => {
      console.log("Nova oferta de pedido:", data);
      this.emit("orderOfferReceived", data);
    });

    this.socket.on("orderStatusUpdate", (data) => {
      console.log("Status do pedido atualizado:", data);
      this.emit("orderStatusChanged", data);
    });

    this.socket.on("motoboyLocationUpdate", (data) => {
      this.emit("locationUpdateReceived", data);
    });

    // Resposta do heartbeat
    this.socket.on("heartbeat:response", () => {
      // Socket está vivo
    });

    // Confirmações de ações
    this.socket.on("acceptOrder:success", (data) => {
      this.emit("orderAccepted", data);
    });

    this.socket.on("declineOrder:success", (data) => {
      this.emit("orderDeclined", data);
    });

    this.socket.on("locationUpdate:success", (data) => {
      this.emit("locationUpdated", data);
    });
  }

  // Enviar localização
  sendLocation(locationData, motoboyId = null) {
    if (!this.isConnected) {
      console.warn("Socket não conectado, não é possível enviar localização");
      return false;
    }

    const payload = {
      latitude: locationData.coords?.latitude || locationData.latitude,
      longitude: locationData.coords?.longitude || locationData.longitude,
      accuracy: locationData.coords?.accuracy || locationData.accuracy,
      timestamp: new Date().toISOString(),
      motoboyId,
    };

    this.socket.emit("updateLocation", payload);
    return true;
  }

  // Aceitar pedido
  acceptOrder(orderId, motoboyId) {
    if (!this.isConnected) {
      console.warn("Socket não conectado");
      return false;
    }

    this.socket.emit("acceptOrder", { orderId, motoboyId });
    return true;
  }

  // Recusar pedido
  declineOrder(orderId, motoboyId, reason = null) {
    if (!this.isConnected) {
      console.warn("Socket não conectado");
      return false;
    }

    this.socket.emit("declineOrder", { orderId, motoboyId, reason });
    return true;
  }

  // Responder notificação estilo chamada
  respondCallNotification(callId, action, firebaseUid) {
    if (!this.isConnected) {
      console.warn("Socket não conectado");
      return false;
    }

    this.socket.emit("respondCallNotification", {
      callId,
      action,
      firebaseUid,
    });
    return true;
  }

  // Marcar notificação como lida
  markNotificationRead(notificationId) {
    if (!this.isConnected) {
      console.warn("Socket não conectado");
      return false;
    }

    this.socket.emit("markNotificationRead", { notificationId });
    return true;
  }

  // Atualizar status do pedido
  updateOrderStatus(orderId, status) {
    if (!this.isConnected) {
      console.warn("Socket não conectado");
      return false;
    }

    this.socket.emit("orderStatusUpdate", { orderId, status });
    return true;
  }

  // Entrar em sala específica
  joinRoom(roomName) {
    if (!this.isConnected) return false;

    this.socket.emit("joinRoom", roomName);
    return true;
  }

  // Sair de sala específica
  leaveRoom(roomName) {
    if (!this.isConnected) return false;

    this.socket.emit("leaveRoom", roomName);
    return true;
  }

  // Sistema de eventos personalizado
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(eventName, data = null) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no listener ${eventName}:`, error);
        }
      });
    }
  }

  // Heartbeat para manter conexão viva
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.socket.emit("heartbeat");
      }
    }, 30000); // A cada 30 segundos
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  handleConnectionError() {
    this.connectionRetries++;

    if (this.connectionRetries < this.maxRetries) {
      console.log(
        `Tentando reconexão... (${this.connectionRetries}/${this.maxRetries})`
      );
      setTimeout(() => {
        this.reconnect();
      }, this.retryDelay * this.connectionRetries);
    } else {
      console.error("Máximo de tentativas de reconexão atingido");
      this.emit("connection:failed");
    }
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  disconnect() {
    console.log("Desconectando socket...");

    this.stopHeartbeat();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.listeners.clear();
    this.connectionRetries = 0;
  }

  // Getter para status de conexão
  get connected() {
    return this.isConnected;
  }

  // Getter para ID do socket
  get socketId() {
    return this.socket?.id || null;
  }
}

// Instância singleton
const socketService = new SocketService();

export default socketService;
