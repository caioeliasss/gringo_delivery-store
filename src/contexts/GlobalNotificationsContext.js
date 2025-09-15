// src/contexts/GlobalNotificationsContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
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

  // Estados para throttling e controle de requisições
  const lastCheckRef = useRef(0);
  const checkInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // Estado para snackbar de feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Função otimizada para verificar mensagens de chat não lidas com throttling
  const checkUnreadChatMessages = useCallback(
    async (force = false) => {
      if (!user?.uid || !mountedRef.current) return;

      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckRef.current;
      const minInterval = 60000; // 1 minuto mínimo entre verificações

      // Se não forçado e foi verificado recentemente, pular
      if (!force && timeSinceLastCheck < minInterval) {
        console.log(
          `⏭️ Pulando verificação de chat - checado há ${Math.round(
            timeSinceLastCheck / 1000
          )}s`
        );
        return;
      }

      // Se já tem uma verificação em andamento, pular
      if (checkInProgressRef.current) {
        console.log("⏳ Verificação de chat já em andamento, pulando...");
        return;
      }

      try {
        checkInProgressRef.current = true;
        lastCheckRef.current = now;

        console.log("🔍 Verificando mensagens de chat não lidas...");

        const response = await getUnreadChatInfo(user.uid);

        // // Só atualizar se ainda estiver montado
        if (mountedRef.current) {
          setHasUnreadChatMessages(response.data.hasUnreadMessages);
          setChatUnreadCount(response.data.totalUnreadCount || 0);

          console.log("✅ Status do chat atualizado:", {
            hasUnread: response.data.hasUnreadMessages,
            count: response.data.totalUnreadCount || 0,
          });
        }
      } catch (error) {
        console.error(
          "❌ Erro ao verificar mensagens de chat não lidas:",
          error
        );
      } finally {
        checkInProgressRef.current = false;
      }
    },
    [user?.uid]
  );

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
          throw new Error("Falha ao inicializar Service Worker");
        }
      } else {
        showFeedback("Permissão para notificações foi negada", "warning");
        setPushPermission("denied");
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao habilitar notificações:", error);
      showFeedback(
        `Erro ao habilitar notificações: ${error.message || "Tente novamente"}`,
        "error"
      );
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
      console.log("🚀 Inicializando GlobalNotifications para:", user.uid);
      initializePushNotifications();
      // checkUnreadChatMessages(true); // Forçar primeira verificação
    }
  }, [user?.uid]);

  // Verificação periódica de mensagens de chat não lidas
  useEffect(() => {
    if (!user?.uid) return;

    // Verificar a cada 3 minutos (reduzido de 2 minutos)
    const chatCheckInterval = setInterval(() => {
      checkUnreadChatMessages(false);
    }, 180000); // 3 minutos

    console.log("⏰ Timer de verificação de chat configurado para 3 minutos");

    return () => {
      clearInterval(chatCheckInterval);
      console.log("🧹 Timer de verificação de chat limpo");
    };
  }, [user?.uid, checkUnreadChatMessages]);

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

    return () => {
      clearInterval(checkInterval);
      console.log("🧹 Timer de verificação de notificações push limpo");
    };
  }, [pushSupported, pushEnabled, user?.uid]);

  // Cleanup no unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      console.log("🧹 GlobalNotificationsProvider desmontado");
    };
  }, []);
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
