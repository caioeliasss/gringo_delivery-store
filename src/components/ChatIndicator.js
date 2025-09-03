// src/components/ChatIndicator.js
import React, { useMemo } from "react";
import { IconButton, Badge, Tooltip, Box, Typography } from "@mui/material";
import {
  Chat as ChatIcon,
  ChatBubble as ChatBubbleIcon,
} from "@mui/icons-material";
import { useGlobalNotifications } from "../contexts/GlobalNotificationsContext";

const ChatIndicator = ({ onClick, sx = {}, children }) => {
  const { hasUnreadChatMessages, chatUnreadCount, isConnected } =
    useGlobalNotifications();

  // Memoizar os valores para evitar re-renders desnecessários
  const memoizedValues = useMemo(
    () => ({
      hasUnread: Boolean(hasUnreadChatMessages),
      count: Number(chatUnreadCount) || 0,
      connected: Boolean(isConnected),
    }),
    [hasUnreadChatMessages, chatUnreadCount, isConnected]
  );

  // Se children for fornecido, usar apenas como wrapper com badge
  if (children) {
    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        {children}
        {memoizedValues.hasUnread && memoizedValues.count > 0 && (
          <Badge
            badgeContent={memoizedValues.count}
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
  const getIconProps = useMemo(() => {
    if (!memoizedValues.connected) {
      return {
        icon: ChatIcon,
        color: "disabled",
        tooltip: "Chat desconectado",
      };
    }

    if (memoizedValues.hasUnread && memoizedValues.count > 0) {
      return {
        icon: ChatBubbleIcon,
        color: "error",
        tooltip: `${memoizedValues.count} mensagem${
          memoizedValues.count > 1 ? "ns" : ""
        } não lida${memoizedValues.count > 1 ? "s" : ""} no chat`,
      };
    }

    return {
      icon: ChatIcon,
      color: "inherit",
      tooltip: "Nenhuma mensagem nova no chat",
    };
  }, [memoizedValues]);

  const { icon: IconComponent, color, tooltip } = getIconProps;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2">{tooltip}</Typography>
          <Typography variant="caption" color="textSecondary">
            Chat:{" "}
            {memoizedValues.connected ? "✅ Conectado" : "❌ Desconectado"}
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
          animation:
            memoizedValues.hasUnread && memoizedValues.count > 0
              ? "pulse 2s infinite"
              : "none",
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
          badgeContent={
            memoizedValues.hasUnread && memoizedValues.count > 0
              ? memoizedValues.count
              : null
          }
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
