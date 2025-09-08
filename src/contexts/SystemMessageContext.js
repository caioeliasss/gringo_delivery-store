// src/contexts/SystemMessageContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { Snackbar, Alert, AlertTitle } from "@mui/material";
import {
  setSystemMessageHandler,
  clearSystemMessageHandler,
} from "../utils/systemMessageNotifier";

const SystemMessageContext = createContext();

export const useSystemMessage = () => {
  const context = useContext(SystemMessageContext);
  if (!context) {
    throw new Error(
      "useSystemMessage must be used within SystemMessageProvider"
    );
  }
  return context;
};

export const SystemMessageProvider = ({ children }) => {
  const [message, setMessage] = useState({
    open: false,
    title: "",
    content: "",
    severity: "info",
    duration: 6000,
  });

  const showMessage = (title, content, severity = "info", duration = 6000) => {
    setMessage({
      open: true,
      title,
      content,
      severity,
      duration,
    });
  };

  const showRateLimitMessage = () => {
    showMessage(
      "Sistema Temporariamente Instável",
      "Estamos enfrentando uma alta demanda no momento. O sistema voltará ao normal em instantes. Agradecemos sua paciência!",
      "warning",
      8000
    );
  };

  const hideMessage = () => {
    setMessage((prev) => ({ ...prev, open: false }));
  };

  const value = {
    showMessage,
    showRateLimitMessage,
    hideMessage,
  };

  // Registrar o handler quando o componente monta
  useEffect(() => {
    setSystemMessageHandler(showRateLimitMessage);

    return () => {
      clearSystemMessageHandler();
    };
  }, []);

  return (
    <SystemMessageContext.Provider value={value}>
      {children}

      {/* Snackbar para mensagens do sistema */}
      <Snackbar
        open={message.open}
        autoHideDuration={message.duration}
        onClose={hideMessage}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: 9999 }}
      >
        <Alert
          onClose={hideMessage}
          severity={message.severity}
          sx={{
            width: "100%",
            maxWidth: "500px",
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
          variant="filled"
        >
          {message.title && <AlertTitle>{message.title}</AlertTitle>}
          {message.content}
        </Alert>
      </Snackbar>
    </SystemMessageContext.Provider>
  );
};
