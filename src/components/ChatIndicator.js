// src/components/ChatIndicator.js
import React from "react";
import { IconButton, Badge, Tooltip, Box, Typography } from "@mui/material";
import {
  Chat as ChatIcon,
  ChatBubble as ChatBubbleIcon,
} from "@mui/icons-material";
import { useGlobalNotifications } from "../contexts/GlobalNotificationsContext";

const ChatIndicator = ({ onClick, sx = {}, children }) => {
  const { 
    hasUnreadChatMessages, 
    chatUnreadCount, 
    isConnected 
  } = useGlobalNotifications();

  // Se children for fornecido, usar apenas como wrapper com badge
  if (children) {
    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        {children}
        {hasUnreadChatMessages && chatUnreadCount > 0 && (
          <Badge
            badgeContent={chatUnreadCount}
            color="error"
            max={99}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
            }}
          />
        )}
      </Box>
    );
  }

  // Determinar ícone e cor baseado no status
  const getIconProps = () => {
    if (!isConnected) {
      return {
        icon: ChatIcon,
        color: "disabled",
        tooltip: "Chat desconectado",
      };
    }

    if (hasUnreadChatMessages && chatUnreadCount > 0) {
      return {
        icon: ChatBubbleIcon,
        color: "error",
        tooltip: `${chatUnreadCount} mensagem${
          chatUnreadCount > 1 ? "ns" : ""
        } não lida${chatUnreadCount > 1 ? "s" : ""} no chat`,
      };
    }

    return {
      icon: ChatIcon,
      color: "inherit",
      tooltip: "Nenhuma mensagem nova no chat",
    };
  };

  const { icon: IconComponent, color, tooltip } = getIconProps();

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2">{tooltip}</Typography>
          <Typography variant="caption" color="textSecondary">
            Chat: {isConnected ? "✅ Conectado" : "❌ Desconectado"}
          </Typography>
        </Box>
      }
      arrow
    >
      <IconButton
        onClick={onClick}
        color={color}
        sx={{
          ...sx,
          animation: hasUnreadChatMessages && chatUnreadCount > 0 ? "pulse 2s infinite" : "none",
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
          badgeContent={hasUnreadChatMessages && chatUnreadCount > 0 ? chatUnreadCount : null}
          color="error"
          max={99}
          overlap="circular"
        >
          <IconComponent />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default ChatIndicator;
