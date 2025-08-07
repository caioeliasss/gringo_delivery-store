import React from "react";
import { IconButton, Badge, Tooltip, Box, Typography } from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";
import { useSocketNotifications } from "../hooks/useSocketNotifications";
import { useAuth } from "../contexts/AuthContext";

const NotificationIndicator = ({ onClick, sx = {} }) => {
  const { user } = useAuth();
  const { isConnected, unreadCount } = useSocketNotifications();

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2">
            {unreadCount > 0
              ? `${unreadCount} notificação${
                  unreadCount > 1 ? "ões" : ""
                } não lida${unreadCount > 1 ? "s" : ""}`
              : "Nenhuma notificação nova"}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Status: {isConnected ? "Conectado" : "Desconectado"}
          </Typography>
        </Box>
      }
      arrow
    >
      <IconButton
        onClick={onClick}
        color="inherit"
        sx={{
          ...sx,
          animation: unreadCount > 0 ? "pulse 2s infinite" : "none",
          "@keyframes pulse": {
            "0%": {
              transform: "scale(1)",
            },
            "50%": {
              transform: "scale(1.05)",
            },
            "100%": {
              transform: "scale(1)",
            },
          },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          overlap="circular"
        >
          {unreadCount > 0 ? (
            <NotificationsActiveIcon />
          ) : (
            <NotificationsIcon />
          )}
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default NotificationIndicator;
