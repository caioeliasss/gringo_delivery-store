import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import webPushService from "../services/webPushService";

export const useSocketNotifications = (firebaseUid, userType = "support") => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionError, setConnectionError] = useState(null);
  const listenersRef = useRef([]);

  useEffect(() => {
    if (!firebaseUid) {
      console.log("⚠️ FirebaseUid não fornecido para WebSocket");
      return;
    }

    let socketInstance = null;

    const connectSocket = async () => {
      try {
        // URL do servidor WebSocket - lógica robusta para diferentes ambientes
        let serverUrl;

        if (process.env.NODE_ENV === "production") {
          // Em produção, usar a URL configurada ou a origem atual
          serverUrl =
            process.env.REACT_APP_SOCKET_URL || window.location.origin;
        } else {
          // Em desenvolvimento, usar localhost:8080
          serverUrl =
            process.env.REACT_APP_SOCKET_URL || "http://localhost:8080";
        }

        // Verificação adicional de segurança
        if (
          !serverUrl ||
          serverUrl === "undefined" ||
          serverUrl === "null" ||
          serverUrl === ""
        ) {
          serverUrl = window.location.origin;
        }

        console.log("🔌 Conectando ao WebSocket...", {
          firebaseUid,
          userType,
          serverUrl,
          env: process.env.NODE_ENV,
          origin: window.location.origin,
          envVars: {
            REACT_APP_SOCKET_URL: process.env.REACT_APP_SOCKET_URL,
            NODE_ENV: process.env.NODE_ENV,
          },
        });
        setConnectionError(null);

        socketInstance = io(serverUrl, {
          path: "/socket",
          auth: {
            firebaseUid,
            userType,
          },
          query: {
            firebaseUid,
            userType,
          },
          transports: ["polling", "websocket"], // Começar com polling, depois upgrade
          upgrade: true,
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          forceNew: true, // Forçar nova conexão
        });

        setSocket(socketInstance);

        // Eventos de conexão
        socketInstance.on("connect", () => {
          console.log("✅ WebSocket conectado:", {
            socketId: socketInstance.id,
            firebaseUid,
            userType,
            transport: socketInstance.io.engine.transport.name,
          });
          setIsConnected(true);
          setConnectionError(null);
        });

        socketInstance.on("disconnect", (reason) => {
          console.log("🔌 WebSocket desconectado:", reason);
          setIsConnected(false);
          setConnectionError(`Desconectado: ${reason}`);
        });

        socketInstance.on("connect_error", (error) => {
          console.error("❌ Erro de conexão WebSocket:", {
            error: error.message,
            type: error.type,
            description: error.description,
            serverUrl,
          });
          setIsConnected(false);
          setConnectionError(`Erro: ${error.message}`);
        });

        // Listener para confirmação de registro
        socketInstance.on("user_registered", (data) => {
          console.log("👤 Usuário registrado no servidor:", data);
        });

        // Listener para debug
        socketInstance.on("debug_info", (data) => {
          console.log("🐛 Debug do servidor:", data);
        });

        // Eventos de notificação específicos do suporte
        socketInstance.on("supportNotification", (data) => {
          console.log("🔔 Nova notificação do suporte:", data);

          setNotifications((prev) => {
            const exists = prev.some(
              (n) => n.notificationId === data.notificationId
            );
            if (!exists) {
              setUnreadCount((count) => count + 1);

              // Mostrar notificação push se habilitada
              if (webPushService.hasPermission()) {
                webPushService.showSupportNotification(
                  data.title || "Nova Notificação de Suporte",
                  {
                    body: data.message || data.body,
                    type: "support",
                    data: data,
                    tag: `support-${data.notificationId}`,
                    requireInteraction: true,
                  }
                );
              }

              return [data, ...prev].slice(0, 100); // Manter últimas 100
            }
            return prev;
          });
        });

        socketInstance.on("notificationUpdateBell", (hasUnread) => {
          console.log("🔔 Atualização de sino de notificação:", hasUnread);
          setUnreadCount(hasUnread ? 1 : 0);
        });

        // Evento genérico para qualquer notificação do suporte
        socketInstance.on("SUPPORT_ALERT", (data) => {
          console.log("⚠️ Alerta de suporte:", data);

          setNotifications((prev) => {
            const exists = prev.some(
              (n) => n.notificationId === data.notificationId
            );
            if (!exists) {
              setUnreadCount((count) => count + 1);

              // Mostrar notificação push se habilitada
              if (webPushService.hasPermission()) {
                webPushService.showSupportNotification(
                  data.title || "Alerta de Suporte",
                  {
                    body: data.message || data.body,
                    type: "alert",
                    data: data,
                    tag: `alert-${data.notificationId}`,
                    requireInteraction: true,
                    urgency: "high",
                  }
                );
              }

              return [data, ...prev].slice(0, 100);
            }
            return prev;
          });
        });

        // Evento para sistema
        socketInstance.on("SYSTEM", (data) => {
          console.log("🖥️ Notificação do sistema:", data);

          setNotifications((prev) => {
            const exists = prev.some(
              (n) => n.notificationId === data.notificationId
            );
            if (!exists) {
              setUnreadCount((count) => count + 1);

              // Mostrar notificação push se habilitada
              if (webPushService.hasPermission()) {
                webPushService.showNotification(
                  data.title || "Notificação do Sistema",
                  {
                    body: data.message || data.body,
                    type: "system",
                    data: data,
                    tag: `system-${data.notificationId}`,
                    icon: "/logo192.png",
                    requireInteraction: false,
                  }
                );
              }

              return [data, ...prev].slice(0, 100);
            }
            return prev;
          });
        });

        // Evento genérico para captuar qualquer notificação
        socketInstance.onAny((eventName, data) => {
          if (
            eventName.includes("notification") ||
            eventName.includes("alert")
          ) {
            console.log(`🔔 Evento capturado: ${eventName}`, data);
          }
        });
      } catch (error) {
        console.error("❌ Erro ao conectar WebSocket:", error);
        setIsConnected(false);
      }
    };

    connectSocket();

    // Cleanup
    return () => {
      console.log("🧹 Limpando conexão WebSocket...");

      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }

      setSocket(null);
      setIsConnected(false);
    };
  }, [firebaseUid, userType]);

  // Função para marcar notificação como lida
  const markAsRead = (notificationId) => {
    if (socket && isConnected) {
      socket.emit("markNotificationRead", { notificationId });

      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, status: "READ" } : n
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    }
  };

  // Função para marcar todas como lidas
  const markAllAsRead = () => {
    const unreadNotifications = notifications.filter(
      (n) => n.status !== "READ"
    );

    unreadNotifications.forEach((notification) => {
      if (socket && isConnected) {
        socket.emit("markNotificationRead", {
          notificationId: notification.notificationId,
        });
      }
    });

    setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));

    setUnreadCount(0);
  };

  // Função para limpar notificações
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Função para enviar evento personalizado
  const emit = (eventName, data) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
      return true;
    }
    return false;
  };

  // Função para adicionar listener personalizado
  const addListener = (eventName, callback) => {
    if (socket) {
      socket.on(eventName, callback);
      listenersRef.current.push({ eventName, callback });
    }
  };

  // Função para remover listener
  const removeListener = (eventName, callback) => {
    if (socket) {
      socket.off(eventName, callback);
      listenersRef.current = listenersRef.current.filter(
        (l) => !(l.eventName === eventName && l.callback === callback)
      );
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    emit,
    addListener,
    removeListener,
  };
};
