import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Badge,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
  Tooltip,
  Container,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  MarkEmailRead as MarkReadIcon,
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  NotificationsPaused as NotificationsPausedIcon,
  Chat as ChatIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Assessment as ReportIcon,
  Store as StoreIcon,
  TwoWheeler as MotoboyIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../../contexts/AuthContext";
import { useGlobalNotifications } from "../../../contexts/GlobalNotificationsContext";
import api from "../../../services/api";
import WebSocketDebug from "../../../components/WebSocketDebug";
import AdminNotificationDebug from "../../../components/AdminNotificationDebug";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";
import {
  SUPPORT_MENU_ITEMS,
  createAdminFooterItems,
} from "../../../config/menuConfig";
import { UseAdminAuth } from "../../../contexts/AdminAuthContext";

const AdminNotifications = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const { AdminUser, logoutAdmin } = UseAdminAuth();

  // Usar o contexto global de notificações para admin
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
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Função para habilitar/desabilitar notificações push
  const handlePushToggle = async () => {
    if (!pushSupported) {
      showFeedback(
        "Notificações push não são suportadas neste navegador",
        "error"
      );
      return;
    }

    if (!pushEnabled) {
      await enablePushNotifications();
    } else {
      disablePushNotifications();
    }
  };

  // Buscar notificações de admin
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.uid) {
        throw new Error("Usuário não autenticado");
      }

      const response = await api.get("/notifications/admin", {
        params: { firebaseUid: user.uid },
      });

      setNotifications(response.data);

      // Contar notificações não lidas
      const unread = response.data.filter(
        (notification) => notification.status === "PENDING"
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Erro ao buscar notificações de admin:", error);
      setError("Erro ao carregar notificações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Marcar notificação como lida
  const markAsRead = async (notificationId) => {
    try {
      await api.put("/notifications/admin", {
        id: notificationId,
        status: "READ",
      });

      // Atualizar estado local
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, status: "READ" }
            : notification
        )
      );

      // Atualizar contador de não lidas
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(
        (notification) => notification.status === "PENDING"
      );

      const promises = unreadNotifications.map((notification) =>
        api.put("/notifications/admin", {
          id: notification._id,
          status: "READ",
        })
      );

      await Promise.all(promises);

      // Atualizar estado local
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          status: "READ",
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  // Obter ícone baseado no tipo de notificação
  const getNotificationIcon = (type) => {
    switch (type) {
      case "ADMIN_ALERT":
        return <AdminIcon color="error" />;
      case "SYSTEM":
        return <InfoIcon color="info" />;
      case "ERROR":
        return <ErrorIcon color="error" />;
      case "SECURITY":
        return <SecurityIcon color="warning" />;
      case "REPORT":
        return <ReportIcon color="primary" />;
      case "STORE_ALERT":
        return <StoreIcon color="warning" />;
      case "MOTOBOY_ALERT":
        return <MotoboyIcon color="warning" />;
      case "CHAT_MESSAGE":
        return <ChatIcon color="primary" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  // Obter cor baseada no tipo
  const getNotificationColor = (type) => {
    switch (type) {
      case "ADMIN_ALERT":
        return "error";
      case "SYSTEM":
        return "info";
      case "ERROR":
        return "error";
      case "SECURITY":
        return "warning";
      case "REPORT":
        return "primary";
      case "STORE_ALERT":
        return "warning";
      case "MOTOBOY_ALERT":
        return "warning";
      case "CHAT_MESSAGE":
        return "primary";
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
  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const menuItems = SUPPORT_MENU_ITEMS.concat([
    {
      text: "Notificações",
      icon: <NotificationsIcon />,
      path: "/notifications",
      badge: unreadCount > 0 ? unreadCount : null,
    },
  ]);

  const footerItems = createAdminFooterItems(handleLogout);

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
            footerItems={footerItems}
            subtitle="Painel Administrativo"
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
            footerItems={footerItems}
            subtitle="Painel Administrativo"
          />
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            ml: isMobile ? 0 : "2px",
            mt: isMobile ? "64px" : 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress />
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
          footerItems={footerItems}
          subtitle="Painel Administrativo"
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
          footerItems={footerItems}
          subtitle="Painel Administrativo"
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: isMobile ? 0 : "2px",
          mt: isMobile ? "64px" : 0,
        }}
      >
        <Container maxWidth="lg">
          {/* Debug Components - apenas em desenvolvimento */}
          {process.env.NODE_ENV === "development" && (
            <Box sx={{ mb: 4 }}>
              <WebSocketDebug />
              <AdminNotificationDebug />
            </Box>
          )}

          {/* Cabeçalho */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Badge badgeContent={unreadCount} color="error">
                <AdminIcon sx={{ mr: 2, color: "primary.main" }} />
              </Badge>
              <Typography variant="h4" fontWeight="bold">
                Notificações Administrativas
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                onClick={fetchNotifications}
                color="primary"
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>

              {unreadCount > 0 && (
                <Button
                  startIcon={<MarkReadIcon />}
                  onClick={markAllAsRead}
                  variant="outlined"
                  size="small"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </Box>
          </Box>

          {/* Erro */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Configurações de notificações push */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">
                  Notificações Push Administrativas
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip
                  icon={isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
                  label={isConnected ? "Conectado" : "Desconectado"}
                  color={isConnected ? "success" : "error"}
                  size="small"
                />
                {connectionError && (
                  <Tooltip title={connectionError}>
                    <Chip
                      icon={<ErrorIcon />}
                      label="Debug"
                      color="warning"
                      size="small"
                    />
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Receba notificações críticas do sistema, alertas de segurança e
              atualizações importantes mesmo quando a página não estiver aberta.
            </Typography>

            {/* Debug Info */}
            {process.env.NODE_ENV === "development" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  <strong>Debug Admin:</strong> User: {user?.uid} | Socket:{" "}
                  {isConnected ? "✅" : "❌"} | Push:{" "}
                  {pushEnabled ? "✅" : "❌"} | SW:{" "}
                  {diagnostics?.serviceWorkerRegistered ? "✅" : "❌"} |
                  Permission: {pushPermission}
                  {connectionError && ` | Error: ${connectionError}`}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={async () => {
                      if (window.webPushService) {
                        const status =
                          await window.webPushService.checkCurrentStatus();
                        console.log("🔍 Status completo (Admin):", status);
                        alert(`Status: ${JSON.stringify(status, null, 2)}`);
                      }
                    }}
                  >
                    Verificar Status Completo
                  </Button>
                </Box>
              </Alert>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={pushEnabled}
                    onChange={handlePushToggle}
                    disabled={!pushSupported}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {pushEnabled ? (
                      <NotificationsActiveIcon color="primary" />
                    ) : (
                      <NotificationsPausedIcon color="disabled" />
                    )}
                    <Typography>
                      {pushEnabled ? "Habilitadas" : "Desabilitadas"}
                    </Typography>
                  </Box>
                }
              />

              {pushSupported && pushEnabled && (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Tooltip title="Testar notificação">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={testNotification}
                      startIcon={<NotificationsIcon />}
                    >
                      Testar
                    </Button>
                  </Tooltip>

                  <Tooltip title="Testar apenas som">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (window.webPushService) {
                          window.webPushService.playNotificationSound();
                        }
                      }}
                      startIcon={<NotificationsActiveIcon />}
                    >
                      🔊 Som
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {!pushSupported && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Notificações push não são suportadas neste navegador.
              </Alert>
            )}

            {pushPermission === "denied" && (
              <Alert severity="error" sx={{ mt: 2 }}>
                As notificações foram bloqueadas. Para habilitá-las, vá nas
                configurações do navegador e permita notificações para este
                site.
              </Alert>
            )}
          </Paper>

          {/* Lista de notificações */}
          {notifications.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <AdminIcon
                sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma notificação administrativa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Você receberá aqui alertas importantes do sistema, notificações
                de segurança e atualizações críticas.
              </Typography>
            </Paper>
          ) : (
            <Paper>
              <List>
                {notifications.map((notification, index) => (
                  <React.Fragment key={notification._id}>
                    <ListItem
                      button
                      onClick={() => openDetails(notification)}
                      sx={{
                        bgcolor:
                          notification.status === "PENDING"
                            ? "action.hover"
                            : "transparent",
                        "&:hover": {
                          bgcolor: "action.selected",
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: "primary.light" }}>
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>

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
                              fontWeight={
                                notification.status === "PENDING"
                                  ? "bold"
                                  : "normal"
                              }
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

          {/* Modal de detalhes */}
          <Dialog
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
          >
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {isMobile && (
                  <IconButton onClick={() => setDetailsOpen(false)}>
                    <ArrowBackIcon />
                  </IconButton>
                )}

                <Avatar sx={{ bgcolor: "primary.light" }}>
                  {selectedNotification &&
                    getNotificationIcon(selectedNotification.type)}
                </Avatar>

                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedNotification?.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedNotification &&
                      formatDate(selectedNotification.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent>
              {selectedNotification && (
                <Box>
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography
                        variant="body1"
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        {selectedNotification.message}
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* Dados adicionais se existirem */}
                  {selectedNotification.data &&
                    Object.keys(selectedNotification.data).length > 0 && (
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            Informações Adicionais:
                          </Typography>
                          <Box
                            component="pre"
                            sx={{ fontSize: "0.875rem", overflow: "auto" }}
                          >
                            {JSON.stringify(selectedNotification.data, null, 2)}
                          </Box>
                        </CardContent>
                      </Card>
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

export default AdminNotifications;
