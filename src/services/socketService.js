// src/services/socketService.js - Versão para React Web (Loja)
import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.connectionPromise = null;
  }

  async connect(firebaseUid, userType = "store", token = null) {
    // Se já está conectando, retornar a promessa existente
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Se já está conectado com o mesmo usuário, não reconectar
    if (this.isConnected && this.socket?.auth?.firebaseUid === firebaseUid) {
      console.log("Socket já conectado para esta loja");
      return Promise.resolve();
    }

    this.connectionPromise = this._performConnection(
      firebaseUid,
      userType,
      token
    );
    return this.connectionPromise;
  }

  async _performConnection(firebaseUid, userType, token) {
    try {
      console.log("🏪 Iniciando conexão WebSocket da loja...", {
        firebaseUid,
        userType,
        hasToken: !!token,
      });

      // Desconectar socket anterior se existir
      if (this.socket) {
        console.log("Desconectando socket anterior...");
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
      }

      // Configuração do socket
      const socketConfig = {
        path: "/socket",
        auth: {
          firebaseUid,
          userType,
          token,
        },
        query: {
          firebaseUid,
          userType,
        },
        transports: ["polling", "websocket"],
        upgrade: true,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        maxHttpBufferSize: 1e6,
        pingTimeout: 60000,
        pingInterval: 25000,
      };

      // URL do servidor
      const serverUrl =
        process.env.REACT_APP_SOCKET_URL || "http://localhost:8080";

      this.socket = io(serverUrl, socketConfig);

      // Promise para aguardar conexão
      return new Promise((resolve, reject) => {
        const connectionTimeout = setTimeout(() => {
          console.error("Timeout na conexão WebSocket da loja");
          this.socket?.disconnect();
          reject(new Error("Connection timeout"));
        }, 15000);

        // Evento de conexão bem-sucedida
        this.socket.on("connect", () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;

          console.log("✅ Socket da loja conectado com sucesso!", {
            socketId: this.socket.id,
            transport: this.socket.io.engine.transport.name,
            firebaseUid,
          });

          this.setupEventListeners();

          // Emitir evento para componentes
          this.emit("connection:success", {
            socketId: this.socket.id,
            transport: this.socket.io.engine.transport.name,
            firebaseUid,
          });

          resolve();
        });

        // Evento de erro de conexão
        this.socket.on("connect_error", (error) => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.connectionPromise = null;

          console.error("❌ Erro de conexão socket da loja:", {
            message: error.message,
            description: error.description,
            context: error.context,
            type: error.type,
          });

          this.emit("connection:failed", error);
          reject(error);
        });

        // Evento de desconexão
        this.socket.on("disconnect", (reason) => {
          this.isConnected = false;
          console.log("🔌 Socket da loja desconectado:", reason);

          this.emit("connection:lost", { reason });

          // Reconectar automaticamente se não foi desconexão manual
          if (
            reason !== "io client disconnect" &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            console.log(
              `Tentando reconexão da loja em ${
                this.reconnectDelay
              }ms... (tentativa ${this.reconnectAttempts + 1})`
            );
            this.reconnectAttempts++;

            setTimeout(() => {
              if (!this.isConnected) {
                this._performConnection(firebaseUid, userType, token).catch(
                  (error) => console.error("Erro na reconexão da loja:", error)
                );
              }
            }, this.reconnectDelay);

            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
          }
        });
      });
    } catch (error) {
      this.connectionPromise = null;
      console.error("Erro ao criar socket da loja:", error);
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    console.log("🏪 Configurando listeners de eventos da loja...");

    // Listener genérico para debug
    this.socket.onAny((eventName, ...args) => {
      console.log(`🔔 [LOJA] Evento recebido: ${eventName}`, args);
    });

    // === EVENTOS ESPECÍFICOS DA LOJA ===

    this.socket.on("newOrder", (data) => {
      console.log("Neworder on the way");
      this.emit("newOrder", data);
    });

    this.socket.on("orderUpdate", (data) => {
      console.log("🔄 Pedido atualizado:", data);
      this.emit("orderUpdate", data);
    });

    // Pedido aceito pelo motoboy
    this.socket.on("orderAcceptedByMotoboy", (data) => {
      console.log("✅ Pedido aceito pelo motoboy:", data);
      this.emit("orderAcceptedByMotoboy", data);
    });

    // Pedido recusado pelo motoboy
    this.socket.on("orderDeclinedByMotoboy", (data) => {
      console.log("❌ Pedido recusado pelo motoboy:", data);
      this.emit("orderDeclinedByMotoboy", data);
    });

    // Status do pedido alterado pelo motoboy
    this.socket.on("orderStatusUpdatedByMotoboy", (data) => {
      console.log("📊 Status do pedido atualizado pelo motoboy:", data);
      this.emit("orderStatusUpdatedByMotoboy", data);
    });

    // Localização do motoboy atualizada
    this.socket.on("motoboyLocationUpdated", (data) => {
      console.log("📍 Localização do motoboy atualizada:", data);
      this.emit("motoboyLocationUpdated", data);
    });

    // Motoboy chegou no local
    this.socket.on("motoboyArrived", (data) => {
      console.log("🚚 Motoboy chegou no local:", data);
      this.emit("motoboyArrived", data);
    });

    // Pedido entregue
    this.socket.on("orderDelivered", (data) => {
      console.log("📦 Pedido entregue:", data);
      this.emit("orderDelivered", data);
    });

    // Motoboy atribuído ao pedido
    this.socket.on("motoboyAssigned", (data) => {
      console.log("👤 Motoboy atribuído ao pedido:", data);
      this.emit("motoboyAssigned", data);
    });

    // Motoboy removido do pedido
    this.socket.on("motoboyUnassigned", (data) => {
      console.log("👤 Motoboy removido do pedido:", data);
      this.emit("motoboyUnassigned", data);
    });

    // Notificação geral
    this.socket.on("storeNotification", (data) => {
      console.log("📢 Notificação para loja:", data);
      this.emit("storeNotification", data);
    });

    // Erro no pedido
    this.socket.on("orderError", (data) => {
      console.error("❌ Erro no pedido:", data);
      this.emit("orderError", data);
    });

    // Heartbeat
    this.socket.on("ping", () => {
      this.socket.emit("pong");
    });

    // Evento de erro geral
    this.socket.on("error", (error) => {
      console.error("❌ Erro no socket da loja:", error);
      this.emit("error", error);
    });

    console.log("✅ Listeners da loja configurados com sucesso");
  }

  // === MÉTODOS PARA ENVIAR EVENTOS ===

  // Confirmar que pedido está pronto para entrega
  confirmOrderReady(orderId, motoboyId) {
    if (!this.socket || !this.isConnected) {
      console.warn(
        "Socket não conectado, não é possível confirmar pedido pronto"
      );
      return false;
    }

    const payload = { orderId, motoboyId, timestamp: Date.now() };
    console.log("📦 Confirmando que pedido está pronto:", payload);
    this.socket.emit("orderReady", payload);
    return true;
  }

  // Atualizar status do pedido
  updateOrderStatus(orderId, status, additionalData = {}) {
    if (!this.socket || !this.isConnected) {
      console.warn("Socket não conectado, não é possível atualizar status");
      return false;
    }

    const payload = {
      orderId,
      status,
      ...additionalData,
      timestamp: Date.now(),
    };
    console.log("📊 Atualizando status do pedido (loja):", payload);
    this.socket.emit("updateOrderStatus", payload);
    return true;
  }

  // Cancelar pedido
  cancelOrder(orderId, reason = null) {
    if (!this.socket || !this.isConnected) {
      console.warn("Socket não conectado, não é possível cancelar pedido");
      return false;
    }

    const payload = { orderId, reason, timestamp: Date.now() };
    console.log("❌ Cancelando pedido:", payload);
    this.socket.emit("cancelOrder", payload);
    return true;
  }

  // === SISTEMA DE EVENTOS CUSTOMIZADO ===

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erro no callback do evento ${event}:`, error);
      }
    });
  }

  // === MÉTODOS DE UTILIDADE ===

  // Testar conexão
  testConnection() {
    if (!this.socket || !this.isConnected) {
      console.error("Socket da loja não conectado para teste");
      return false;
    }

    console.log("🧪 Testando conexão da loja...");
    this.socket.emit("test", {
      message: "Teste de conexão da loja",
      timestamp: Date.now(),
    });

    return true;
  }

  // Desconectar
  disconnect() {
    console.log("🔌 Desconectando socket da loja...");

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.connectionPromise = null;
    this.listeners.clear();

    console.log("✅ Socket da loja desconectado");
  }

  // Getters para status
  get connected() {
    return this.isConnected && this.socket?.connected;
  }

  get status() {
    if (!this.socket) return "disconnected";
    if (this.socket.connected) return "connected";
    if (this.socket.connecting) return "connecting";
    return "disconnected";
  }
}

// Instância singleton
const socketService = new SocketService();

export default socketService;
