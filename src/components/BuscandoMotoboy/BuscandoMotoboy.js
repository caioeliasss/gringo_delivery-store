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
} from "@mui/icons-material";

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
}) => {
  const theme = useTheme();
  const [searchTime, setSearchTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

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
  ];

  // Timer para mostrar tempo de busca
  useEffect(() => {
    let interval;
    if (open) {
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
      }, 60000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [open, searchTime, currentStep, createdAt]);

  // Formatar tempo de busca
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calcular progresso
  const getProgress = () => {
    const baseProgress = (currentStep / steps.length) * 100;
    const timeProgress = Math.min((searchTime / 30) * 20, 20); // Máximo 20% adicional
    return Math.min(baseProgress + timeProgress, 85); // Máximo 85% até encontrar motoboy
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
      onClose={null} // Não permite fechar clicando fora
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
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "white",
          textAlign: "center",
          py: 3,
        }}
      >
        <Box
          sx={{
            animation: `${bounce} 2s infinite`,
            display: "inline-block",
            mb: 2,
          }}
        >
          <MotobikeIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
          Buscando Motoboy
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
              Progresso da busca
            </Typography>
            <Typography
              variant="body2"
              color="primary.main"
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
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
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
                      ? "primary.main"
                      : "grey.300",
                  color: "white",
                  animation:
                    index === currentStep ? `${pulse} 2s infinite` : "none",
                }}
              >
                {index < currentStep ? (
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
                {index === currentStep && (
                  <Typography variant="body2" color="primary.main">
                    Em andamento...
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Informações de tempo */}
        <Box
          sx={{
            bgcolor: "grey.50",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
            border: `1px solid ${theme.palette.grey[200]}`,
          }}
        >
          <Typography
            variant="h6"
            color="primary.main"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Tempo de busca: {formatTime(searchTime)}
          </Typography>

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}
          >
            {/* Remover onClick dos Chips que não precisam */}
            <Chip
              label="🔍 Procurando"
              color="primary"
              size="small"
              variant="filled"
              sx={{
                animation: `${pulse} 1.5s infinite`,
                cursor: "default", // Indica que não é clicável
              }}
            />
            <Chip
              label="📍 Na sua região"
              color="secondary"
              size="small"
              variant="filled"
              sx={{ cursor: "default" }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Estamos buscando o melhor motoboy disponível para realizar sua
            entrega. Isso pode levar alguns minutos.
          </Typography>

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
              A busca continuará em segundo plano e você será notificado quando
              um motoboy aceitar o pedido.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          fullWidth
          sx={{
            py: 1.5,
            fontWeight: "bold",
            borderRadius: 2,
          }}
        >
          Continuar navegando
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuscandoMotoboy;
