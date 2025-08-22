import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  useMediaQuery,
  Divider,
} from "@mui/material";
import {
  AccountBalance as FinanceIcon,
  Receipt as BillingIcon,
  TrendingUp as TrendingIcon,
  Assessment as ReportsIcon,
} from "@mui/icons-material";
import OverdueBillings from "../../../components/OverdueBillings";
import {
  SUPPORT_MENU_ITEMS,
  createAdminFooterItems,
} from "../../../config/menuConfig";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";
import { useAuth } from "../../../contexts/AuthContext";
const Financeiro = () => {
  const { currentUser, logout } = useAuth();
  const menuItems = SUPPORT_MENU_ITEMS;
  const navigate = useNavigate();
  // Definir itens de rodapé para SideDrawer
  const footerItems = createAdminFooterItems(() => {
    console.log("Footer item clicked");
  });
  const isMobile = useMediaQuery("(max-width:600px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3, marginRight: 3 }}>
      {/* Header da Página */}
      <Box marginRight={2} sx={{ width: 250, mr: 2 }}>
        {isMobile ? (
          <SideDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            variant="temporary"
            title="Gringo Delivery"
            logoUrl="https://i.imgur.com/8jOdfcO.png"
            logoAlt="Gringo Delivery"
            logoHeight={50}
            menuItems={menuItems}
            footerItems={footerItems}
            subtitle="Painel Administrativo"
          />
        ) : (
          <SideDrawer
            open={true}
            variant="permanent"
            title="Gringo Delivery"
            logoUrl="https://i.imgur.com/8jOdfcO.png"
            logoAlt="Gringo Delivery"
            logoHeight={50}
            menuItems={menuItems}
            footerItems={footerItems}
            subtitle="Painel Administrativo"
          />
        )}
      </Box>
      <Box mb={4} ml={isMobile ? 0 : 3}>
        <Box display="flex" alignItems="center" mb={2}>
          <FinanceIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            Financeiro
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Gerencie suas faturas, pagamentos e informações financeiras
        </Typography>
      </Box>

      <Grid container spacing={3} ml={isMobile ? 0 : 3}>
        {/* Cards de Resumo Financeiro */}
        <Grid item xs={12} md={8}>
          {/* Seção Principal - Faturas */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <BillingIcon color="primary" sx={{ mr: 2 }} />
              <Typography variant="h5" fontWeight="bold">
                Faturas e Pagamentos
              </Typography>
            </Box>

            {/* Componente de Faturas Vencidas */}
            <OverdueBillings />
          </Paper>
        </Grid>

        {/* Sidebar com Informações Adicionais */}
        <Grid item xs={12} md={4}>
          {/* Card de Resumo */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Resumo Financeiro
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Status da Conta
                </Typography>
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  Em Dia
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Próximo Vencimento
                </Typography>
                <Typography variant="body1">Verifique suas faturas</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Forma de Pagamento
                </Typography>
                <Typography variant="body1">PIX, Boleto</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Card de Informações */}
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ReportsIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Informações
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Pagamento via PIX:</strong> Instantâneo e sem taxas
              </Typography>

              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Boleto Bancário:</strong> Disponível para download
              </Typography>

              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Dúvidas?</strong> Entre em contato conosco pelo suporte
              </Typography>

              <Box mt={2} p={2} bgcolor="info.light" borderRadius={1}>
                <Typography variant="body2" color="info.dark">
                  💡 <strong>Dica:</strong> Mantenha suas faturas em dia para
                  evitar interrupções no serviço
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Financeiro;
