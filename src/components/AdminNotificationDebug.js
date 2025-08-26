import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  Grid,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useGlobalNotifications } from "../contexts/GlobalNotificationsContext";

const AdminNotificationDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);

  const {
    isConnected,
    connectionError,
    pushEnabled,
    pushSupported,
    pushPermission,
    diagnostics,
    testNotification,
  } = useGlobalNotifications();

  // Função para coletar informações de debug completas
  const collectDebugInfo = async () => {
    try {
      setError(null);
      console.log("🔍 Coletando informações de debug...");

      const info = {
        timestamp: new Date().toISOString(),
        browser: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        },
        location: {
          protocol: window.location.protocol,
          host: window.location.host,
          pathname: window.location.pathname,
          isSecureContext: window.isSecureContext,
        },
        apis: {
          notificationSupported: "Notification" in window,
          serviceWorkerSupported: "serviceWorker" in navigator,
          pushManagerSupported: "PushManager" in window,
          notificationPermission: Notification?.permission || "não disponível",
        },
        webPushService: null,
        serviceWorker: null,
        errors: [],
      };

      // Verificar estado do webPushService
      try {
        if (window.webPushService) {
          const status = await window.webPushService.checkCurrentStatus();
          info.webPushService = {
            status,
            diagnostics: window.webPushService.getDiagnostics(),
          };
        } else {
          info.errors.push("webPushService não está disponível globalmente");
        }
      } catch (serviceError) {
        info.errors.push(
          `Erro ao verificar webPushService: ${serviceError.message}`
        );
      }

      // Verificar estado do Service Worker
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration(
            "/"
          );
          info.serviceWorker = {
            hasRegistration: !!registration,
            scope: registration?.scope,
            active: registration?.active
              ? {
                  state: registration.active.state,
                  scriptURL: registration.active.scriptURL,
                }
              : null,
            installing: registration?.installing
              ? {
                  state: registration.installing.state,
                  scriptURL: registration.installing.scriptURL,
                }
              : null,
            waiting: registration?.waiting
              ? {
                  state: registration.waiting.state,
                  scriptURL: registration.waiting.scriptURL,
                }
              : null,
          };
        }
      } catch (swError) {
        info.errors.push(
          `Erro ao verificar Service Worker: ${swError.message}`
        );
      }

      // Verificar se há algum erro específico
      if (connectionError) {
        info.errors.push(`Erro de conexão: ${connectionError}`);
      }

      setDebugInfo(info);
      console.log("📊 Debug info coletado:", info);
    } catch (debugError) {
      console.error("Erro ao coletar debug info:", debugError);
      setError(`Erro ao coletar informações: ${debugError.message}`);
    }
  };

  // Função para testar notificação com mais detalhes
  const testAdvancedNotification = async () => {
    try {
      setError(null);
      console.log("🧪 Testando notificação avançada...");

      if (!window.webPushService) {
        throw new Error("webPushService não está disponível");
      }

      const result = await window.webPushService.showNotification(
        "🧪 Teste Admin - Notificação Avançada",
        {
          body: `Teste realizado em ${new Date().toLocaleTimeString()}`,
          icon: "/logo192.png",
          badge: "/favicon_trim.png",
          tag: "admin-debug-test",
          requireInteraction: true,
          data: {
            type: "admin-test",
            timestamp: Date.now(),
          },
          actions: [
            {
              action: "view",
              title: "Ver Detalhes",
              icon: "/logo192.png",
            },
            {
              action: "dismiss",
              title: "Dispensar",
            },
          ],
        }
      );

      console.log("✅ Notificação de teste enviada:", result);
      alert("Notificação de teste enviada! Verifique se apareceu.");
    } catch (testError) {
      console.error("Erro no teste de notificação:", testError);
      setError(`Erro no teste: ${testError.message}`);
    }
  };

  // Função para forçar re-registro do Service Worker
  const forceReregisterServiceWorker = async () => {
    try {
      setError(null);
      console.log("🔄 Forçando re-registro do Service Worker...");

      // Desregistrar service worker existente
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration) {
          await registration.unregister();
          console.log("🗑️ Service Worker desregistrado");
        }
      }

      // Aguardar um pouco e re-registrar
      setTimeout(async () => {
        try {
          if (window.webPushService) {
            const success = await window.webPushService.registerServiceWorker();
            console.log("📝 Re-registro resultado:", success);

            // Coletar debug info atualizado
            setTimeout(collectDebugInfo, 1000);

            if (success) {
              alert("Service Worker re-registrado com sucesso!");
            } else {
              alert("Falha ao re-registrar Service Worker");
            }
          }
        } catch (reregError) {
          console.error("Erro ao re-registrar:", reregError);
          setError(`Erro no re-registro: ${reregError.message}`);
        }
      }, 500);
    } catch (forceError) {
      console.error("Erro ao forçar re-registro:", forceError);
      setError(`Erro: ${forceError.message}`);
    }
  };

  useEffect(() => {
    // Coletar debug info na inicialização
    collectDebugInfo();
  }, []);

  const getStatusColor = (status) => {
    if (status === true || status === "granted" || status === "activated")
      return "success";
    if (status === false || status === "denied") return "error";
    return "warning";
  };

  const getStatusIcon = (status) => {
    if (status === true || status === "granted" || status === "activated")
      return <CheckIcon />;
    if (status === false || status === "denied") return <ErrorIcon />;
    return <WarningIcon />;
  };

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <BugIcon sx={{ mr: 1, color: "primary.main" }} />
        <Typography variant="h6">Debug de Notificações (Admin)</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          onClick={collectDebugInfo}
          startIcon={<BugIcon />}
        >
          Atualizar Debug
        </Button>
        <Button
          variant="outlined"
          onClick={testAdvancedNotification}
          disabled={!pushEnabled}
        >
          Teste Avançado
        </Button>
        <Button
          variant="outlined"
          onClick={forceReregisterServiceWorker}
          color="warning"
        >
          Re-registrar SW
        </Button>
        <Button
          variant="outlined"
          onClick={testNotification}
          disabled={!pushEnabled}
        >
          Teste Simples
        </Button>
      </Box>

      {/* Status Rápido */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item>
          <Chip
            icon={getStatusIcon(pushSupported)}
            label={`Suporte: ${pushSupported ? "Sim" : "Não"}`}
            color={getStatusColor(pushSupported)}
            size="small"
          />
        </Grid>
        <Grid item>
          <Chip
            icon={getStatusIcon(pushPermission === "granted")}
            label={`Permissão: ${pushPermission}`}
            color={getStatusColor(pushPermission === "granted")}
            size="small"
          />
        </Grid>
        <Grid item>
          <Chip
            icon={getStatusIcon(pushEnabled)}
            label={`Habilitado: ${pushEnabled ? "Sim" : "Não"}`}
            color={getStatusColor(pushEnabled)}
            size="small"
          />
        </Grid>
        <Grid item>
          <Chip
            icon={getStatusIcon(isConnected)}
            label={`WebSocket: ${isConnected ? "Conectado" : "Desconectado"}`}
            color={getStatusColor(isConnected)}
            size="small"
          />
        </Grid>
      </Grid>

      {connectionError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Erro de Conexão:</strong> {connectionError}
        </Alert>
      )}

      {/* Informações Detalhadas */}
      {debugInfo && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Informações Detalhadas ({debugInfo.timestamp})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{ fontSize: "0.75rem", overflow: "auto", maxHeight: 400 }}
            >
              {JSON.stringify(debugInfo, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Diagnósticos do WebPushService */}
      {diagnostics && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Diagnósticos do WebPushService
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{ fontSize: "0.75rem", overflow: "auto", maxHeight: 300 }}
            >
              {JSON.stringify(diagnostics, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
};

export default AdminNotificationDebug;
