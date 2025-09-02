import React, { useState, useEffect } from "react";
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  PriorityHigh as PriorityHighIcon,
  AccessTime as TimeIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componente para notificações críticas de disputes
const CriticalDisputeNotification = ({
  disputes = [],
  onViewDispute,
  onDismiss,
  autoHideDuration = 10000,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dismissedDisputes, setDismissedDisputes] = useState(new Set());

  // Filtrar disputes críticas não dismissadas
  const criticalDisputes = disputes.filter(
    (dispute) =>
      (dispute.isCritical || dispute.timeRemainingMinutes <= 15) &&
      !dismissedDisputes.has(dispute.disputeId)
  );

  const handleDismiss = (disputeId) => {
    setDismissedDisputes((prev) => new Set([...prev, disputeId]));
    if (onDismiss) {
      onDismiss(disputeId);
    }
  };

  const handleViewDispute = (dispute) => {
    handleDismiss(dispute.disputeId);
    if (onViewDispute) {
      onViewDispute(dispute);
    }
  };

  // Reset dismissed disputes quando a lista de disputes muda
  useEffect(() => {
    const currentDisputeIds = new Set(disputes.map((d) => d.disputeId));
    setDismissedDisputes(
      (prev) => new Set([...prev].filter((id) => currentDisputeIds.has(id)))
    );
  }, [disputes]);

  if (criticalDisputes.length === 0) {
    return null;
  }

  return (
    <>
      {criticalDisputes.map((dispute, index) => (
        <Snackbar
          key={dispute.disputeId}
          open={true}
          anchorOrigin={{
            vertical: "top",
            horizontal: isMobile ? "center" : "right",
          }}
          style={{
            top: isMobile ? 60 + index * 80 : 80 + index * 120,
            zIndex: theme.zIndex.snackbar + index,
          }}
          autoHideDuration={autoHideDuration}
          onClose={() => handleDismiss(dispute.disputeId)}
        >
          <Alert
            severity="error"
            variant="filled"
            sx={{
              width: isMobile ? "90vw" : 400,
              maxWidth: isMobile ? "90vw" : 400,
              bgcolor: "#d32f2f",
              color: "white",
              "& .MuiAlert-icon": {
                color: "white",
              },
              "& .MuiAlert-action": {
                color: "white",
              },
            }}
            icon={<PriorityHighIcon />}
            action={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => handleViewDispute(dispute)}
                  startIcon={<ViewIcon />}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                >
                  Ver
                </Button>
                <IconButton
                  size="small"
                  onClick={() => handleDismiss(dispute.disputeId)}
                  sx={{ color: "white" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                <WarningIcon
                  sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }}
                />
                Dispute Crítica - Ação Urgente Necessária
              </Typography>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.95 }}>
                  <strong>Pedido:</strong> {dispute.orderId}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.95 }}>
                  <strong>Tipo:</strong>{" "}
                  {getDisputeTypeLabel(dispute.disputeType)}
                </Typography>
              </Box>

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <TimeIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" fontWeight="bold">
                  {dispute.timeRemainingMinutes} min restantes
                </Typography>
                <Chip
                  label="CRÍTICO"
                  size="small"
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.3)",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "0.7rem",
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Recebido{" "}
                {formatDistanceToNow(new Date(dispute.receivedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </Typography>
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

// Componente para notificações de urgência (60 min ou menos)
const UrgentDisputeNotification = ({
  disputes = [],
  onViewDispute,
  onDismiss,
  autoHideDuration = 8000,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dismissedDisputes, setDismissedDisputes] = useState(new Set());

  // Filtrar disputes urgentes (não críticas) não dismissadas
  const urgentDisputes = disputes.filter(
    (dispute) =>
      !dispute.isCritical &&
      dispute.timeRemainingMinutes <= 60 &&
      dispute.timeRemainingMinutes > 15 &&
      !dismissedDisputes.has(dispute.disputeId)
  );

  const handleDismiss = (disputeId) => {
    setDismissedDisputes((prev) => new Set([...prev, disputeId]));
    if (onDismiss) {
      onDismiss(disputeId);
    }
  };

  const handleViewDispute = (dispute) => {
    handleDismiss(dispute.disputeId);
    if (onViewDispute) {
      onViewDispute(dispute);
    }
  };

  if (urgentDisputes.length === 0) {
    return null;
  }

  return (
    <>
      {urgentDisputes.slice(0, 2).map((dispute, index) => (
        <Snackbar
          key={dispute.disputeId}
          open={true}
          anchorOrigin={{
            vertical: "top",
            horizontal: isMobile ? "center" : "right",
          }}
          style={{
            top: isMobile ? 200 + index * 80 : 300 + index * 100,
            zIndex: theme.zIndex.snackbar - 1 + index,
          }}
          autoHideDuration={autoHideDuration}
          onClose={() => handleDismiss(dispute.disputeId)}
        >
          <Alert
            severity="warning"
            variant="filled"
            sx={{
              width: isMobile ? "90vw" : 360,
              maxWidth: isMobile ? "90vw" : 360,
              bgcolor: "#ed6c02",
              color: "white",
            }}
            icon={<WarningIcon />}
            action={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => handleViewDispute(dispute)}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                >
                  Ver
                </Button>
                <IconButton
                  size="small"
                  onClick={() => handleDismiss(dispute.disputeId)}
                  sx={{ color: "white" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Dispute Urgente
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Pedido {dispute.orderId} - {dispute.timeRemainingMinutes}min
                restantes
              </Typography>
              <Typography variant="caption">
                {getDisputeTypeLabel(dispute.disputeType)}
              </Typography>
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

// Função helper para labels dos tipos de dispute
const getDisputeTypeLabel = (type) => {
  const labels = {
    QUALITY: "Qualidade",
    MISSING_ITEMS: "Itens Faltantes",
    WRONG_ITEMS: "Itens Errados",
    DELAY: "Atraso",
    OTHER: "Outros",
  };
  return labels[type] || type;
};

// Componente principal que combina ambas as notificações
const DisputeNotifications = ({ disputes = [], onViewDispute, onDismiss }) => {
  return (
    <>
      <CriticalDisputeNotification
        disputes={disputes}
        onViewDispute={onViewDispute}
        onDismiss={onDismiss}
      />
      <UrgentDisputeNotification
        disputes={disputes}
        onViewDispute={onViewDispute}
        onDismiss={onDismiss}
      />
    </>
  );
};

export default DisputeNotifications;
export { CriticalDisputeNotification, UrgentDisputeNotification };
