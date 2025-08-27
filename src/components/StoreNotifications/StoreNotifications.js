import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Chat as ChatIcon,
  LocalShipping as OrderIcon,
  Warning as WarningIcon,
  Receipt as BillingIcon,
  Store as StoreIcon,
  Settings as SettingsIcon,
  PlayArrow as TestIcon,
  Refresh as RefreshIcon,
  VolumeUp as VolumeIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { useGlobalNotifications } from "../../contexts/GlobalNotificationsContext";
import SideDrawer from "../SideDrawer/SideDrawer";
import { STORE_MENU_ITEMS } from "../../config/menuConfig";
import {
  getStoreNotifications,
  updateStoreNotification,
} from "../../services/api";

const StoreNotifications = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();

  // Usar o contexto global de notificações
  const {
    isConnected,
    connectionError,
    unreadCount: socketUnreadCount,
    markAsRead: socketMarkAsRead,
    markAllAsRead: socketMarkAllAsRead,
    pushEnabled,
    pushSupported,
    pushPermission,
    diagnostics,
    enablePushNotifications,
    disablePushNotifications,
    testNotification,
    showFeedback,
  } = useGlobalNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Função para buscar notificações
  const fetchNotifications = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError("");
      const response = await getStoreNotifications(user.uid);
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
      setError("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  // Marcar notificação como lida
  const markAsRead = async (notificationId) => {
    try {
      await updateStoreNotification(notificationId, "READ");

      // Atualizar localmente
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, status: "READ" } : n
        )
      );

      // Marcar também via Socket
      socketMarkAsRead(notificationId);
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (n) => n.status !== "READ"
    );

    for (const notification of unreadNotifications) {
      try {
        await updateStoreNotification(notification._id, "READ");
      } catch (error) {
        console.error("Erro ao marcar notificação como lida:", error);
      }
    }

    // Atualizar localmente
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));

    // Marcar também via Socket
    socketMarkAllAsRead();
  };

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

  // Função para retornar a cor baseada no tipo da notificação
  const getNotificationColor = (type) => {
    switch (type) {
      case "CHAT_MESSAGE":
        return "info";
      case "ORDER_STATUS_UPDATE":
        return "success";
      case "OCCURRENCE_CHANGE":
      case "STORE_ALERT":
        return "warning";
      case "BILLING":
        return "secondary";
      default:
        return "primary";
    }
  };

  // Abrir detalhes da notificação
  const openDetails = (notification) => {
    setSelectedNotification(notification);
    setDetailsOpen(true);

    // Marcar como lida se ainda não foi
    if (notification.status === "PENDING") {
      markAsRead(notification._id);
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  // Configuração do SideDrawer
  const handleLogout = () => {
    // Implementar logout da loja
    console.log("Logout da loja");
  };

  const menuItems = STORE_MENU_ITEMS.concat([
    {
      text: "Notificações",
      icon: <NotificationsIcon />,
      path: "/notifications",
      badge: socketUnreadCount > 0 ? socketUnreadCount : null,
    },
  ]);

  useEffect(() => {
    fetchNotifications();

    // Configurar intervalo para atualizar periodicamente
    const interval = setInterval(fetchNotifications, 30000); // 30 segundos

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  if (loading) {
    return (
      <Box sx={{ display: "flex" }}>
        {/* SideDrawer */}
        {isMobile ? (
          <SideDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            variant="temporary"
            title="Gringo Delivery"
            logoUrl="https://i.imgur.com/8jOdfcO.png"
            logoAlt="Gringo Delivery"
            logoHeight={50}
            menuItems={menuItems}
            subtitle="Painel da Loja"
          />
        ) : (
          <SideDrawer
            open={true}
            variant="permanent"
            title="Gringo Delivery"
            logoUrl="https://i.imgur.com/8jOdfcO.png"
            logoAlt="Gringo Delivery"
            logoHeight={50}
            menuItems={menuItems}
            subtitle="Painel da Loja"
          />
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      {/* SideDrawer */}
      {isMobile ? (
        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          variant="temporary"
          title="Gringo Delivery"
          logoUrl="https://i.imgur.com/8jOdfcO.png"
          logoAlt="Gringo Delivery"
          logoHeight={50}
          menuItems={menuItems}
          subtitle="Painel da Loja"
        />
      ) : (
        <SideDrawer
          open={true}
          variant="permanent"
          title="Gringo Delivery"
          logoUrl="https://i.imgur.com/8jOdfcO.png"
          logoAlt="Gringo Delivery"
          logoHeight={50}
          menuItems={menuItems}
          subtitle="Painel da Loja"
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          marginLeft: isMobile ? 0 : "240px",
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              <StoreIcon sx={{ mr: 2, verticalAlign: "middle" }} />
              Notificações da Loja
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Acompanhe todas as notificações e alertas da sua loja
            </Typography>
          </Box>

          {/* Status da Conexão e Configurações Push */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Badge
                color={isConnected ? "success" : "error"}
                variant="dot"
                sx={{ mr: 2 }}
              >
                <NotificationsActiveIcon />
              </Badge>
              <Typography variant="h6">Status das Notificações</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                WebSocket: {isConnected ? "✅ Conectado" : "❌ Desconectado"}
                {connectionError && ` (${connectionError})`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Push: {pushSupported ? "✅ Suportado" : "❌ Não suportado"}
                {pushSupported && ` - ${pushPermission}`}
              </Typography>
            </Box>

            {pushSupported && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={pushEnabled}
                      onChange={() =>
                        pushEnabled
                          ? disablePushNotifications()
                          : enablePushNotifications()
                      }
                    />
                  }
                  label="Notificações Push"
                />
                <IconButton
                  onClick={testNotification}
                  disabled={!pushEnabled}
                  size="small"
                >
                  <TestIcon />
                </IconButton>
                <IconButton onClick={fetchNotifications} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
            )}
          </Paper>

          {/* Ações */}
          <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={markAllAsRead}
              disabled={notifications.every((n) => n.status === "READ")}
            >
              Marcar Todas como Lidas
            </Button>
            <Button variant="outlined" onClick={fetchNotifications}>
              Atualizar
            </Button>
          </Box>

          {/* Lista de Notificações */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {notifications.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, textAlign: "center" }}>
              <NotificationsIcon
                sx={{ fontSize: 60, color: "grey.400", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                Nenhuma notificação encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Você será notificado aqui quando houver atualizações
              </Typography>
            </Paper>
          ) : (
            <Paper elevation={1}>
              <List>
                {notifications.map((notification, index) => (
                  <React.Fragment key={notification._id}>
                    <ListItem
                      button
                      onClick={() => openDetails(notification)}
                      sx={{
                        backgroundColor:
                          notification.status === "READ"
                            ? "transparent"
                            : "action.hover",
                      }}
                    >
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight:
                                  notification.status === "READ"
                                    ? "normal"
                                    : "bold",
                              }}
                            >
                              {notification.title}
                            </Typography>

                            {notification.status === "PENDING" && (
                              <Chip
                                label="Nova"
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 0.5 }}
                            >
                              {notification.message.length > 100
                                ? `${notification.message.substring(0, 100)}...`
                                : notification.message}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatDate(notification.createdAt)}
                            </Typography>
                          </Box>
                        }
                      />

                      <Chip
                        label={notification.type.replace("_", " ")}
                        size="small"
                        color={getNotificationColor(notification.type)}
                        variant="outlined"
                      />
                    </ListItem>

                    {index < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {/* Dialog de Detalhes */}
          <Dialog
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {selectedNotification?.title || "Detalhes da Notificação"}
            </DialogTitle>

            <DialogContent>
              {selectedNotification && (
                <Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedNotification.message}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <Chip
                      label={selectedNotification.type.replace("_", " ")}
                      color={getNotificationColor(selectedNotification.type)}
                      variant="outlined"
                    />
                    <Chip
                      label={selectedNotification.status}
                      color={
                        selectedNotification.status === "READ"
                          ? "success"
                          : "warning"
                      }
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {formatDate(selectedNotification.createdAt)}
                  </Typography>

                  {selectedNotification.data &&
                    Object.keys(selectedNotification.data).length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Dados Adicionais:
                        </Typography>
                        <Paper
                          sx={{
                            p: 2,
                            backgroundColor: "grey.100",
                            borderRadius: 1,
                          }}
                        >
                          <pre style={{ margin: 0, fontSize: "0.75rem" }}>
                            {JSON.stringify(selectedNotification.data, null, 2)}
                          </pre>
                        </Paper>
                      </Box>
                    )}
                </Box>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
};

export default StoreNotifications;
