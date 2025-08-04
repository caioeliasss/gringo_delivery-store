import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Gavel as GavelIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  LocalShipping as DeliveryIcon,
  Restaurant as RestaurantIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

const TermsOfServiceModal = ({
  open,
  onAccept,
  onDecline,
  loading = false,
}) => {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleAccept = () => {
    if (acceptedTerms && hasReadTerms) {
      onAccept();
    }
  };

  const termsContent = [
    {
      icon: <RestaurantIcon color="primary" />,
      title: "Responsabilidades do Estabelecimento",
      content: [
        "Manter informações de produtos sempre atualizadas",
        "Garantir qualidade e segurança alimentar dos produtos",
        "Cumprir prazos de preparo informados na plataforma",
        "Comunicar indisponibilidades de produtos em tempo hábil",
      ],
    },
    {
      icon: <PaymentIcon color="primary" />,
      title: "Taxas e Pagamentos",
      content: [
        "Taxa de entrega: conforme configurado no painel administrativo",
        "Mensalidade: valor fixo mensal para uso da plataforma",
        "Pagamentos processados automaticamente via sistema",
        "Relatórios financeiros disponíveis no dashboard",
      ],
    },
    {
      icon: <DeliveryIcon color="primary" />,
      title: "Processo de Entrega",
      content: [
        "Entregas realizadas por motoboys parceiros da plataforma",
        "Tempo de entrega estimado automaticamente pelo sistema",
        "Acompanhamento em tempo real disponível para clientes",
        "Suporte para resolução de problemas durante entregas",
      ],
    },
    {
      icon: <SecurityIcon color="primary" />,
      title: "Proteção de Dados",
      content: [
        "Dados protegidos conforme LGPD (Lei Geral de Proteção de Dados)",
        "Informações compartilhadas apenas para processamento de pedidos",
        "Sistema seguro de armazenamento de dados",
        "Direito de exclusão de dados mediante solicitação",
      ],
    },
  ];

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "primary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <GavelIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" fontWeight="bold">
            Termos de Serviço - Gringo Delivery
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, maxHeight: "60vh", overflowY: "auto" }}>
        <Box sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Importante:</strong> Para utilizar nossa plataforma, é
              necessário aceitar os termos de serviço abaixo. Leia
              cuidadosamente cada seção.
            </Typography>
          </Alert>

          <Typography variant="h6" gutterBottom color="primary.main">
            Bem-vindo à Plataforma Gringo Delivery
          </Typography>

          <Typography variant="body2" paragraph color="text.secondary">
            Ao aceitar estes termos, você concorda em utilizar nossa plataforma
            de delivery seguindo as diretrizes estabelecidas para garantir a
            melhor experiência para todos os usuários.
          </Typography>

          <Divider sx={{ my: 3 }} />

          {termsContent.map((section, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{ mb: 3, p: 2, borderRadius: 2 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                {section.icon}
                <Typography
                  variant="h6"
                  sx={{ ml: 1, fontWeight: "600", color: "text.primary" }}
                >
                  {section.title}
                </Typography>
              </Box>

              <List dense>
                {section.content.map((item, itemIndex) => (
                  <ListItem key={itemIndex} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary">
                          {item}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ))}

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: "warning.light",
              borderColor: "warning.main",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="600">
                Importante
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              O descumprimento destes termos pode resultar na suspensão ou
              cancelamento da conta na plataforma. Em caso de dúvidas, entre em
              contato com nosso suporte.
            </Typography>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          flexDirection: "column",
          alignItems: "stretch",
          p: 3,
          pt: 1,
          bgcolor: "grey.50",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={hasReadTerms}
                onChange={(e) => setHasReadTerms(e.target.checked)}
                color="primary"
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                Li e compreendi todos os termos acima
              </Typography>
            }
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                color="primary"
                disabled={!hasReadTerms || loading}
              />
            }
            label={
              <Typography
                variant="body2"
                fontWeight={acceptedTerms ? "600" : "400"}
              >
                Aceito os termos de serviço e concordo em utilizá-los
              </Typography>
            }
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            onClick={onDecline}
            variant="outlined"
            color="error"
            fullWidth
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            Recusar
          </Button>
          <Button
            onClick={handleAccept}
            variant="contained"
            color="primary"
            fullWidth
            disabled={!acceptedTerms || !hasReadTerms || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{ py: 1.5, fontWeight: "bold" }}
          >
            {loading ? "Salvando..." : "Aceitar e Continuar"}
          </Button>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 2 }}
        >
          Versão dos Termos: 1.0 | Data:{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </Typography>
      </DialogActions>
    </Dialog>
  );
};

export default TermsOfServiceModal;
