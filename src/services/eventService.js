// src/services/eventService.js

class EventService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectTimeout = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.storeId = null;
  }

  // Conectar ao servidor de eventos
  connect(storeId) {
    if (this.eventSource) {
      // Já existe uma conexão
      return;
    }

    this.storeId = storeId;

    // Construir URL com ID da loja
    const baseUrl =
      process.env.REACT_APP_API_URL || "http://localhost:8080/api";
    const eventsUrl =
      baseUrl.replace("/api", "") + `/api/events?storeId=${storeId}`;

    try {
      // Criar fonte de eventos
      this.eventSource = new EventSource(eventsUrl);

      // Manipulador de conexão
      this.eventSource.onopen = () => {
        console.log("SSE conectado");
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      // Manipulador de mensagens
      this.eventSource.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          console.log("Evento recebido:", eventData);

          // Notificar ouvintes do tipo de evento
          if (eventData.type && this.listeners.has(eventData.type)) {
            this.listeners.get(eventData.type).forEach((callback) => {
              callback(eventData.data);
            });
          }
        } catch (error) {
          console.error("Erro ao processar evento:", error);
        }
      };

      // Manipulador de erros
      this.eventSource.onerror = (error) => {
        console.error("Erro no SSE:", error);
        this.isConnected = false;
        this.eventSource.close();
        this.eventSource = null;

        // Tentar reconectar
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error("Erro ao conectar ao SSE:", error);
      this.scheduleReconnect();
    }
  }

  // Agendar reconexão
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Número máximo de tentativas de reconexão atingido");
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    console.log(
      `Tentando reconectar em ${delay}ms (tentativa ${
        this.reconnectAttempts + 1
      }/${this.maxReconnectAttempts})`
    );

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.storeId);
    }, delay);
  }

  // Registrar um ouvinte para um tipo específico de evento
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType).push(callback);
  }

  // Remover um ouvinte
  off(eventType, callback) {
    if (!this.listeners.has(eventType)) return;

    const callbacks = this.listeners.get(eventType);
    const index = callbacks.indexOf(callback);

    if (index !== -1) {
      callbacks.splice(index, 1);
    }

    if (callbacks.length === 0) {
      this.listeners.delete(eventType);
    }
  }

  // Desconectar do servidor de eventos
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.storeId = null;
      clearTimeout(this.reconnectTimeout);
    }
  }
}

// Criar e exportar uma única instância do serviço
const eventService = new EventService();
export default eventService;
