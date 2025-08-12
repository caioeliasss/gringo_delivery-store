// src/components/GlobalNotificationIndicator.js
import React from "react";
import {
  Badge,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Settings as SettingsIcon,
  TestTube as TestIcon,
  VolumeUp as VolumeIcon,
} from "@mui/icons-material";
import { useGlobalNotifications } from "../contexts/GlobalNotificationsContext";
import { useNavigate } from "react-router-dom";

const GlobalNotificationIndicator = ({ showSettings = false }) => {
  const navigate = useNavigate();
  const {
    unreadCount,
    pushEnabled,
    pushSupported,
    pushPermission,
    isConnected,
    connectionError,
    enablePushNotifications,
    disablePushNotifications,
    testNotification,
  } = useGlobalNotifications();

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    if (showSettings) {
      setAnchorEl(event.currentTarget);
    } else {
      // Navegar para a página de notificações
      navigate("/notificacoes");
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTogglePush = async () => {
    if (pushEnabled) {
      disablePushNotifications();
    } else {
      await enablePushNotifications();
    }
  };

  const handleTest = () => {
    testNotification();
    handleClose();
  };

  const handleGoToNotifications = () => {
    navigate("/notificacoes");
    handleClose();
  };

  // Determinar ícone e cor baseado no status
  const getIconProps = () => {
    if (!isConnected) {
      return {
        icon: NotificationsIcon,
        color: "disabled",
        tooltip: "Desconectado do servidor",
      };
    }

    if (unreadCount > 0) {
      return {
        icon: NotificationsActiveIcon,
        color: "error",
        tooltip: `${unreadCount} notificação${
          unreadCount > 1 ? "ões" : ""
        } não lida${unreadCount > 1 ? "s" : ""}`,
      };
    }

    return {
      icon: NotificationsIcon,
      color: "primary",
      tooltip: "Notificações",
    };
  };

  const { icon: IconComponent, color, tooltip } = getIconProps();

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton onClick={handleClick} color={color}>
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : null}
            color="error"
          >
            <IconComponent />
          </Badge>
        </IconButton>
      </Tooltip>

      {showSettings && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: { width: 320, maxWidth: "90vw" },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          {/* Header */}
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Configurações de Notificações
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {isConnected ? "✅ Conectado" : "❌ Desconectado"}
              {connectionError && (
                <Typography variant="caption" color="error" display="block">
                  Erro: {connectionError}
                </Typography>
              )}
            </Typography>
          </Box>

          <Divider />

          {/* Ir para notificações */}
          <MenuItem onClick={handleGoToNotifications}>
            <NotificationsIcon sx={{ mr: 2 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1">Ver Notificações</Typography>
              {unreadCount > 0 && (
                <Typography variant="caption" color="error">
                  {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
                </Typography>
              )}
            </Box>
          </MenuItem>

          <Divider />

          {/* Configurações Push */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Notificações Push
            </Typography>

            {!pushSupported && (
              <Alert severity="warning" sx={{ mb: 1, fontSize: "0.75rem" }}>
                Não suportadas neste navegador
              </Alert>
            )}

            {pushPermission === "denied" && (
              <Alert severity="error" sx={{ mb: 1, fontSize: "0.75rem" }}>
                Bloqueadas pelo navegador
              </Alert>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={pushEnabled}
                  onChange={handleTogglePush}
                  disabled={!pushSupported || pushPermission === "denied"}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {pushEnabled ? "Habilitadas" : "Desabilitadas"}
                </Typography>
              }
            />

            {pushSupported && pushEnabled && (
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <MenuItem
                  onClick={handleTest}
                  sx={{ p: 0.5, minHeight: "auto", borderRadius: 1 }}
                >
                  <TestIcon sx={{ mr: 1, fontSize: "1rem" }} />
                  <Typography variant="caption">Testar</Typography>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    // Testar apenas som
                    if (window.webPushService) {
                      window.webPushService.playNotificationSound();
                    }
                    handleClose();
                  }}
                  sx={{ p: 0.5, minHeight: "auto", borderRadius: 1 }}
                >
                  <VolumeIcon sx={{ mr: 1, fontSize: "1rem" }} />
                  <Typography variant="caption">Som</Typography>
                </MenuItem>
              </Box>
            )}
          </Box>
        </Menu>
      )}
    </>
  );
};

export default GlobalNotificationIndicator;
