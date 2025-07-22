import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  LinearProgress,
  Chip,
  useTheme,
  keyframes,
} from "@mui/material";
import {
  TwoWheeler as MotobikeIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import eventService from "../../services/eventService";

// Animação para o ícone da moto
const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
`;
//FIXME arrumar status do pedido
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const BuscandoMotoboy = ({
  open,
  onClose,
  orderNumber,
  customerName,
  createdAt,
  orderId, // Adicione o ID do pedido para monitorar
  status,
}) => {
  const theme = useTheme();
  const [searchTime, setSearchTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [motoboyFound, setMotoboyFound] = useState(false);
  const [motoboyInfo, setMotoboyInfo] = useState(null);
  const [orderStatus, setOrderStatus] = useState("pendente");

  const steps = [
    { label: "Criando pedido...", icon: <CheckIcon />, completed: true },
    {
      label: "Buscando motoboys disponíveis...",
      icon: <LocationIcon />,
      completed: false,
    },
    {
      label: "Aguardando aceitação...",
      icon: <ScheduleIcon />,
      completed: false,
    },
    {
      label: "Motoboy encontrado!",
      icon: <PersonIcon />,
      completed: false,
    },
  ];

  // Efeito para monitorar atualizações do pedido via SSE
  useEffect(() => {
    if (!open || !orderId) return;

    const handleOrderUpdate = (orderData) => {
      console.log("Atualização de pedido no BuscandoMotoboy:", orderData);

      // Verificar se é o pedido que estamos monitorando
      if (orderData._id === orderId) {
        setOrderStatus(orderData.status);

        // Se encontrou um motoboy (mudou para "em_entrega")
        console.log("Status do pedido:", orderData.status);
        if (orderData.status === "em_preparo" && orderData.motoboy) {
          setMotoboyFound(true);
          setMotoboyInfo(orderData.motoboy);
          setCurrentStep(3); // Último step

          // Fechar automaticamente após 3 segundos
          setTimeout(() => {
            if (onClose && typeof onClose === "function") {
              onClose();
            }
          }, 3000);
        }
      }
    };

    // Registrar o listener
    eventService.on("orderUpdate", handleOrderUpdate);

    // Cleanup
    return () => {
      eventService.off("orderUpdate", handleOrderUpdate);
    };
  }, [open, orderId, onClose]);

  useEffect(() => {
    // Atualizar o status do pedido se for passado como prop
    if (status) {
      setOrderStatus(status);
      if (status === "em_preparo") {
        setMotoboyFound(true);
        setCurrentStep(3); // Último step
        // Fechar automaticamente após 3 segundos
        setTimeout(() => {
          if (onClose && typeof onClose === "function") {
            onClose();
          }
        }, 3000);
      } else if (status === "pendente") {
        setMotoboyFound(false);
        setCurrentStep(2); // Primeiro step
      }
    }
  }, [status, onClose]);

  // Timer para mostrar tempo de busca
  useEffect(() => {
    let interval;
    if (open && !motoboyFound) {
      setSearchTime(
        createdAt
          ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
          : 1
      );
      setCurrentStep(2);

      interval = setInterval(() => {
        setSearchTime((prev) => prev + 1);

        // Simular progresso dos steps
        if (searchTime >= 5 && currentStep === 1) {
          setCurrentStep(2);
        }
      }, 1000); // Mudou para 1 segundo para melhor UX
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [open, searchTime, currentStep, createdAt, motoboyFound]);

  // Formatar tempo de busca
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calcular progresso
  const getProgress = () => {
    if (motoboyFound) return 100;

    const baseProgress = (currentStep / (steps.length - 1)) * 100;
    const timeProgress = Math.min((searchTime / 30) * 20, 20);
    return Math.min(baseProgress + timeProgress, 85);
  };

  // Handler seguro para o onClose
  const handleClose = () => {
    if (onClose && typeof onClose === "function") {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={null}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      {/* Header com gradiente */}
      <DialogTitle
        sx={{
          background: motoboyFound
            ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
            : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "white",
          textAlign: "center",
          py: 3,
        }}
      >
        <Box
          sx={{
            animation: motoboyFound ? "none" : `${bounce} 2s infinite`,
            display: "inline-block",
            mb: 2,
          }}
        >
          {motoboyFound ? (
            <CheckIcon sx={{ fontSize: 48 }} />
          ) : (
            <MotobikeIcon sx={{ fontSize: 48 }} />
          )}
        </Box>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
          {motoboyFound ? "Motoboy Encontrado!" : "Buscando Motoboy"}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Pedido #{orderNumber || "N/A"} para {customerName || "Cliente"}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 4 }}>
        {/* Progresso geral */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {motoboyFound ? "Busca concluída" : "Progresso da busca"}
            </Typography>
            <Typography
              variant="body2"
              color={motoboyFound ? "success.main" : "primary.main"}
              sx={{ fontWeight: "bold" }}
            >
              {Math.round(getProgress())}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={getProgress()}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "grey.200",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                background: motoboyFound
                  ? `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`
                  : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              },
            }}
          />
        </Box>

        {/* Steps */}
        <Box sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                opacity: index <= currentStep ? 1 : 0.5,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 2,
                  bgcolor:
                    index < currentStep
                      ? "success.main"
                      : index === currentStep
                      ? motoboyFound
                        ? "success.main"
                        : "primary.main"
                      : "grey.300",
                  color: "white",
                  animation:
                    index === currentStep && !motoboyFound
                      ? `${pulse} 2s infinite`
                      : "none",
                }}
              >
                {index < currentStep ||
                (index === currentStep && motoboyFound) ? (
                  <CheckIcon sx={{ fontSize: 20 }} />
                ) : (
                  step.icon
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: index <= currentStep ? "bold" : "normal",
                    color:
                      index <= currentStep ? "text.primary" : "text.secondary",
                  }}
                >
                  {step.label}
                </Typography>
                {index === currentStep && !motoboyFound && (
                  <Typography variant="body2" color="primary.main">
                    Em andamento...
                  </Typography>
                )}
                {index === currentStep && motoboyFound && (
                  <Typography variant="body2" color="success.main">
                    Concluído!
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Informações do motoboy encontrado */}
        {motoboyFound && motoboyInfo && (
          <Box
            sx={{
              bgcolor: "success.light",
              borderRadius: 2,
              p: 3,
              mb: 3,
              border: `1px solid ${theme.palette.success.main}`,
            }}
          >
            <Typography
              variant="h6"
              color="success.dark"
              sx={{ fontWeight: "bold", mb: 2, textAlign: "center" }}
            >
              🎉 Motoboy Encontrado!
            </Typography>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
                {motoboyInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Telefone: {motoboyInfo.phone}
              </Typography>
              <Chip
                label="🚀 Saiu para entrega"
                color="success"
                size="small"
                variant="filled"
              />
            </Box>
          </Box>
        )}

        {/* Informações de tempo */}
        <Box
          sx={{
            bgcolor: motoboyFound ? "success.50" : "grey.50",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
            border: `1px solid ${
              motoboyFound
                ? theme.palette.success.light
                : theme.palette.grey[200]
            }`,
          }}
        >
          <Typography
            variant="h6"
            color={motoboyFound ? "success.main" : "primary.main"}
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            {motoboyFound
              ? `Busca concluída em: ${formatTime(searchTime)}`
              : `Tempo de busca: ${formatTime(searchTime)}`}
          </Typography>

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}
          >
            {motoboyFound ? (
              <>
                <Chip
                  label="✅ Encontrado"
                  color="success"
                  size="small"
                  variant="filled"
                  sx={{ cursor: "default" }}
                />
                <Chip
                  label="🚀 Em entrega"
                  color="primary"
                  size="small"
                  variant="filled"
                  sx={{ cursor: "default" }}
                />
              </>
            ) : (
              <>
                <Chip
                  label="🔍 Procurando"
                  color="primary"
                  size="small"
                  variant="filled"
                  sx={{
                    animation: `${pulse} 1.5s infinite`,
                    cursor: "default",
                  }}
                />
                <Chip
                  label="📍 Na sua região"
                  color="secondary"
                  size="small"
                  variant="filled"
                  sx={{ cursor: "default" }}
                />
              </>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {motoboyFound
              ? "Seu pedido está a caminho! O motoboy entrará em contato em breve."
              : "Estamos buscando o melhor motoboy disponível para realizar sua entrega. Isso pode levar alguns minutos."}
          </Typography>

          {!motoboyFound && (
            <Box
              sx={{
                bgcolor: "info.light",
                color: "info.contrastText",
                borderRadius: 1,
                p: 2,
                mt: 2,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
                💡 Você pode fechar esta janela
              </Typography>
              <Typography variant="body2">
                A busca continuará em segundo plano e você será notificado
                quando um motoboy aceitar o pedido.
              </Typography>
            </Box>
          )}

          {motoboyFound && (
            <Box
              sx={{
                bgcolor: "success.light",
                color: "success.contrastText",
                borderRadius: 1,
                p: 2,
                mt: 2,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
                🎯 Próximos passos
              </Typography>
              <Typography variant="body2">
                Acompanhe o status do pedido na lista de pedidos. Esta janela
                será fechada automaticamente.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          variant={motoboyFound ? "contained" : "outlined"}
          color={motoboyFound ? "success" : "primary"}
          fullWidth
          sx={{
            py: 1.5,
            fontWeight: "bold",
            borderRadius: 2,
          }}
        >
          {motoboyFound ? "Fechar" : "Continuar navegando"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuscandoMotoboy;
