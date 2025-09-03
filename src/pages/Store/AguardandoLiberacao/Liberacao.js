import React from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Avatar,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  Lock as LockIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from "@mui/icons-material";

export default function Liberacao() {
  // Aqui você pode pegar os dados da loja do contexto ou props se necessário
  // const { user } = useAuth(); // exemplo

  const handleContactSupport = () => {
    // Aqui você pode implementar a lógica para contatar o suporte
    // Por exemplo, abrir um chat, enviar email, etc.
    window.open("mailto:suporte@gringodelivery.com.br", "_blank");
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <Container
      maxWidth="md"
      sx={{ py: 4, minHeight: "100vh", display: "flex", alignItems: "center" }}
    >
      <Box sx={{ width: "100%" }}>
        {/* Header com ícone e título */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "warning.main",
              mx: "auto",
              mb: 2,
            }}
          >
            <LockIcon fontSize="large" />
          </Avatar>

          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            color="text.primary"
          >
            Acesso Restrito
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Aguardando Liberação do Estabelecimento
          </Typography>

          <Chip
            icon={<HourglassEmptyIcon />}
            label="Pendente de Aprovação"
            color="warning"
            variant="outlined"
            size="large"
          />
        </Box>

        {/* Card principal com informações */}
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary">
              <BusinessIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Status do Seu Estabelecimento
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Seu estabelecimento foi cadastrado com sucesso, mas ainda está
              aguardando a aprovação final de nossa equipe para começar a operar
              na plataforma Gringo Delivery.
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Lista de etapas */}
            <Typography variant="h6" gutterBottom>
              Processo de Aprovação:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Cadastro Realizado"
                  secondary="Seus dados foram recebidos com sucesso"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <AccessTimeIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Análise de Documentos"
                  secondary="Nossa equipe está verificando seus dados e documentos"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <ScheduleIcon color="disabled" />
                </ListItemIcon>
                <ListItemText
                  primary="Aprovação Final"
                  secondary="Após a análise, você receberá a liberação para operar"
                />
              </ListItem>
            </List>
          </CardContent>
        </Paper>

        {/* Card com informações de tempo */}
        <Card sx={{ mb: 3, bgcolor: "info.light", color: "info.contrastText" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AccessTimeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Tempo de Análise
            </Typography>
            <Typography variant="body1">
              O processo de aprovação geralmente leva de{" "}
              <strong>24 a 72 horas úteis</strong>. Você receberá uma
              notificação por email assim que seu estabelecimento for aprovado.
            </Typography>
          </CardContent>
        </Card>

        {/* Card com próximos passos */}
        <Card
          sx={{
            mb: 4,
            bgcolor: "success.light",
            color: "success.contrastText",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <CheckCircleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Próximos Passos
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Enquanto aguarda a aprovação, você pode:
            </Typography>
            <List dense>
              <ListItem sx={{ pl: 0 }}>
                <Typography variant="body2">
                  • Preparar seu cardápio e preços
                </Typography>
              </ListItem>
              <ListItem sx={{ pl: 0 }}>
                <Typography variant="body2">
                  • Organizar o processo de recebimento de pedidos
                </Typography>
              </ListItem>
              <ListItem sx={{ pl: 0 }}>
                <Typography variant="body2">
                  • Verificar seus dados cadastrais
                </Typography>
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<EmailIcon />}
            onClick={handleContactSupport}
            sx={{ minWidth: 200 }}
          >
            Contatar Suporte
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={refreshPage}
            sx={{ minWidth: 200 }}
          >
            Verificar Status
          </Button>
        </Box>

        {/* Footer com informações de contato */}
        <Box sx={{ mt: 4, textAlign: "center", opacity: 0.8 }}>
          <Typography variant="body2" color="text.secondary">
            Precisa de ajuda? Entre em contato conosco:
          </Typography>
          <Box
            sx={{
              mt: 1,
              display: "flex",
              justifyContent: "center",
              gap: 3,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EmailIcon fontSize="small" />
              <Typography variant="body2">
                suporte@gringodelivery.com.br
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PhoneIcon fontSize="small" />
              <Typography variant="body2">(11) 99999-9999</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
