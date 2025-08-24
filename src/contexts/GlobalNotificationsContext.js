// src/contexts/GlobalNotificationsContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useSocketNotifications } from "../hooks/useSocketNotifications";
import webPushService from "../services/webPushService";
import { getUnreadChatInfo } from "../services/api";
import { Snackbar, Alert } from "@mui/material";

const GlobalNotificationsContext = createContext();

export const useGlobalNotifications = () => {
  const context = useContext(GlobalNotificationsContext);
  if (!context) {
    throw new Error(
      "useGlobalNotifications must be used within GlobalNotificationsProvider"
    );
  }
  return context;
};

export const GlobalNotificationsProvider = ({
  children,
  userType = "support",
}) => {
  const { user } = useAuth();

  // Hook para notificações em tempo real via WebSocket
  const {
    isConnected,
    connectionError,
    unreadCount: socketUnreadCount,
    markAsRead: socketMarkAsRead,
    markAllAsRead: socketMarkAllAsRead,
  } = useSocketNotifications(user?.uid, userType);

  // Estados para notificações push
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState("default");
  const [diagnostics, setDiagnostics] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Estados para mensagens de chat não lidas
  const [hasUnreadChatMessages, setHasUnreadChatMessages] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Estado para snackbar de feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Função para verificar mensagens de chat não lidas
  const checkUnreadChatMessages = async () => {
    if (!user?.uid) return;

    try {
      // Usar a função otimizada com cache automático
      const response = await getUnreadChatInfo(user.uid);

      // Atualizar estados com os dados retornados
      setHasUnreadChatMessages(response.data.hasUnreadMessages);
      setChatUnreadCount(response.data.totalUnreadCount || 0);
    } catch (error) {
      console.error("Erro ao verificar mensagens de chat não lidas:", error);
    }
  };

  // Função para mostrar feedback ao usuário
  const showFeedback = (message, severity = "info") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // Inicialização automática das notificações push
  const initializePushNotifications = async () => {
    if (!user?.uid || initialized) return;

    try {
      console.log("🔔 Inicializando sistema global de notificações...");

      const supported = webPushService.isSupported();
      setPushSupported(supported);

      if (supported) {
        // Verificar status atual
        const status = await webPushService.checkCurrentStatus();

        setPushPermission(status.permission);
        setPushEnabled(status.isFullyConfigured);

        if (status.isFullyConfigured) {
          console.log("✅ Notificações push já configuradas e funcionando");
          showFeedback("Notificações ativas ✅", "success");
        } else if (status.hasPermission && !status.serviceWorkerRegistered) {
          // Tem permissão mas service worker não está registrado
          console.log("🔄 Reconectando Service Worker...");
          const reconnected = await webPushService.initialize();

          if (reconnected) {
            setPushEnabled(true);
            showFeedback("Notificações reconectadas!", "success");
          }
        } else if (status.permission === "default") {
          // Primeira vez - mostrar opção discreta para habilitar
          console.log("ℹ️ Notificações disponíveis mas não habilitadas");
        }

        // Atualizar diagnósticos
        setDiagnostics(webPushService.getDiagnostics());
      }

      setInitialized(true);
    } catch (error) {
      console.error("❌ Erro ao inicializar notificações:", error);
      showFeedback("Erro ao inicializar notificações", "error");
    }
  };

  // Função para habilitar notificações push
  const enablePushNotifications = async () => {
    if (!pushSupported) {
      showFeedback("Notificações não são suportadas neste navegador", "error");
      return false;
    }

    try {
      console.log("🔔 Habilitando notificações push...");

      const granted = await webPushService.requestPermission();
      if (granted) {
        const initialized = await webPushService.initialize();
        if (initialized) {
          setPushEnabled(true);
          setPushPermission("granted");
          setDiagnostics(webPushService.getDiagnostics());

          showFeedback("Notificações habilitadas com sucesso!", "success");

          // Mostrar notificação de teste
          setTimeout(() => {
            webPushService.testNotification();
          }, 1000);

          return true;
        } else {
          showFeedback("Erro ao inicializar notificações", "error");
          return false;
        }
      } else {
        showFeedback("Permissão para notificações foi negada", "warning");
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao habilitar notificações:", error);
      showFeedback("Erro ao habilitar notificações", "error");
      return false;
    }
  };

  // Função para desabilitar notificações push
  const disablePushNotifications = () => {
    setPushEnabled(false);
    showFeedback("Notificações desabilitadas", "info");
  };

  // Função para testar notificação
  const testNotification = () => {
    if (pushEnabled) {
      webPushService.testNotification();
    } else {
      showFeedback("Notificações não estão habilitadas", "warning");
    }
  };

  // Inicializar quando o usuário estiver disponível
  useEffect(() => {
    if (user?.uid) {
      initializePushNotifications();
      checkUnreadChatMessages(); // Verificar mensagens de chat também
    }
  }, [user?.uid]);

  // Verificação periódica de mensagens de chat não lidas
  useEffect(() => {
    if (!user?.uid) return;

    // Verificar imediatamente
    checkUnreadChatMessages();

    // Verificar a cada 30 segundos
    const chatCheckInterval = setInterval(checkUnreadChatMessages, 30000);

    return () => clearInterval(chatCheckInterval);
  }, [user?.uid]);

  // Verificação periódica do status das notificações
  useEffect(() => {
    if (!pushSupported || !pushEnabled || !user?.uid) return;

    const checkInterval = setInterval(async () => {
      try {
        const status = await webPushService.checkCurrentStatus();

        if (!status.isFullyConfigured && pushEnabled) {
          console.warn(
            "⚠️ Notificações push perderam configuração, tentando reconectar..."
          );

          const reconnected = await webPushService.initialize();
          if (!reconnected) {
            setPushEnabled(false);
            showFeedback(
              "Notificações foram perdidas. Reative-as nas configurações.",
              "warning"
            );
          }
        }

        // Atualizar diagnósticos
        setDiagnostics(webPushService.getDiagnostics());
      } catch (error) {
        console.error("❌ Erro na verificação periódica:", error);
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(checkInterval);
  }, [pushSupported, pushEnabled, user?.uid]);

  const value = {
    // Estados
    pushEnabled,
    pushSupported,
    pushPermission,
    diagnostics,
    isConnected,
    connectionError,
    unreadCount: socketUnreadCount,
    initialized,

    // Estados de mensagens de chat
    hasUnreadChatMessages,
    chatUnreadCount,

    // Funções
    enablePushNotifications,
    disablePushNotifications,
    testNotification,
    showFeedback,
    markAsRead: socketMarkAsRead,
    markAllAsRead: socketMarkAllAsRead,
    checkUnreadChatMessages,
  };

  return (
    <GlobalNotificationsContext.Provider value={value}>
      {children}

      {/* Snackbar global para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </GlobalNotificationsContext.Provider>
  );
};
