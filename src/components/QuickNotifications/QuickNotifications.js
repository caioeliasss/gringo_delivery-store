import React, { useState, useContext, useEffect } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Alert,
  CircularProgress,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Chat as ChatIcon,
  LocalShipping as OrderIcon,
  Warning as WarningIcon,
  Receipt as BillingIcon,
  PlayArrow as TestIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { AuthContext } from "../../contexts/AuthContext";
import { useGlobalNotifications } from "../../contexts/GlobalNotificationsContext";
import { getStoreNotifications } from "../../services/api";

// Hook seguro para usar o contexto global de notificações
const useSafeGlobalNotifications = () => {
  try {
    return useGlobalNotifications();
  } catch (error) {
    // Retorna valores padrão quando o contexto não está disponível
    return {
      pushEnabled: false,
      pushSupported: false,
      pushPermission: "default",
      enablePushNotifications: () => {},
      disablePushNotifications: () => {},
      testNotification: () => {},
      isConnected: false,
    };
  }
};

const QuickNotifications = () => {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const { currentUser } = useContext(AuthContext);

  // Usar o hook seguro para o contexto global de notificações
  const {
    pushEnabled,
    pushSupported,
    pushPermission,
    enablePushNotifications,
    disablePushNotifications,
    testNotification,
    isConnected,
  } = useSafeGlobalNotifications();

  // Função para retornar o ícone baseado no tipo da notificação
  const getNotificationIcon = (type) => {
    const iconProps = { color: "primary" };

    switch (type) {
      case "CHAT_MESSAGE":
        return <ChatIcon {...iconProps} />;
      case "ORDER_STATUS_UPDATE":
        return <OrderIcon {...iconProps} />;
      case "OCCURRENCE_CHANGE":
      case "STORE_ALERT":
        return <WarningIcon {...iconProps} />;
      case "BILLING":
        return <BillingIcon {...iconProps} />;
      default:
        return <NotificationsIcon {...iconProps} />;
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  // Busca notificações do backend ao expandir
  const fetchNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      const res = await getStoreNotifications(currentUser.uid);
      const data = res.data;
      const filteredData = data.filter(
        (n) =>
          n.type === "CHAT_MESSAGE" ||
          n.type === "ORDER_STATUS_UPDATE" ||
          n.type === "OCCURRENCE_CHANGE" ||
          n.type === "BILLING" ||
          n.type === "STORE_ALERT"
      );
      setNotifications(
        (filteredData || [])
          .map((n) => ({
            id: n._id,
            title: n.title || n.type || "Notificação",
            body: n.message || n.body || "",
            date: n.createdAt ? new Date(n.createdAt).toLocaleString() : "",
            createdAt: n.createdAt, // Manter a data original para ordenação
            type: n.type, // Adicionar o tipo para usar no ícone
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Ordenar por data decrescente
          .slice(0, 3) // Limitar às últimas 3 notificações
      );
    } catch (err) {
      setError("Erro ao buscar notificações");
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = (event, isExpanded) => {
    setExpanded(isExpanded);
    if (isExpanded && notifications.length === 0 && !loading) {
      fetchNotifications();
    }
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={handleAccordionChange}
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        mt: 4,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: expanded ? "white" : "primary.main",
          color: expanded ? "primary.main" : "white",
          "&:hover": {
            backgroundColor: expanded ? "grey.100" : "primary.dark",
            color: expanded ? "primary.main" : "white",
          },
          "& .MuiAccordionSummary-expandIconWrapper": {
            color: expanded ? "primary.main" : "white",
          },
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Notificações Rápidas
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Veja abaixo as notificações mais recentes recebidas pela loja.
        </Typography>

        {/* Controles de Notificações Push */}
        {pushSupported && (
          <>
            <Box sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {pushEnabled ? (
                    <NotificationsActiveIcon color="success" />
                  ) : (
                    <NotificationsOffIcon color="disabled" />
                  )}
                  <Typography variant="subtitle2">Notificações Push</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={pushEnabled}
                        onChange={() =>
                          pushEnabled
                            ? disablePushNotifications()
                            : enablePushNotifications()
                        }
                        size="small"
                      />
                    }
                    label=""
                    sx={{ m: 0 }}
                  />
                  <Tooltip title="Testar Notificação">
                    <IconButton
                      onClick={testNotification}
                      disabled={!pushEnabled}
                      size="small"
                    >
                      <TestIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Atualizar">
                    <IconButton onClick={fetchNotifications} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {pushEnabled
                  ? "✅ Receba notificações mesmo com a página fechada"
                  : "❌ Ative para receber notificações em tempo real"}
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : notifications.length === 0 ? (
          <Alert severity="info">
            Nenhuma notificação recebida recentemente.
          </Alert>
        ) : (
          <List>
            {notifications.map((notif) => (
              <ListItem key={notif.id} alignItems="flex-start" sx={{ mb: 2 }}>
                <ListItemIcon>{getNotificationIcon(notif.type)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {notif.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notif.body}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {notif.date}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
export default QuickNotifications;
