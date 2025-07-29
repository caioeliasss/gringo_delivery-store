import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UseAdminAuth } from "../../../contexts/AdminAuthContext";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  ShoppingCart as OrdersIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  TwoWheeler as MotoboyIcon,
  ReportProblem as OccurrenceIcon,
  AttachMoney as RevenueIcon,
  TrendingUp,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Map as MapIcon,
} from "@mui/icons-material";
import { adminService } from "../../../services/adminService";
import { buscarGenero } from "../../../services/gender";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";
import {
  SUPPORT_MENU_ITEMS,
  createAdminFooterItems,
} from "../../../config/menuConfig";

const AdminDashboard = () => {
  const { AdminUser, logoutAdmin } = UseAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayOrders: 0,
    onlineDrivers: 0,
    openOccurrences: 0,
    totalStores: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    pendingMotoboys: 0,
  });
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    "https://avatar.iran.liara.run/public/boy"
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Buscar dados do dashboard
        const dashboardData = await adminService.getDashboardStats();
        setStats({
          todayOrders: dashboardData.todayOrders || 0,
          onlineDrivers: dashboardData.onlineDrivers || 0,
          openOccurrences: dashboardData.openOccurrences || 0,
          totalStores: dashboardData.totalStores || 0,
          totalRevenue: dashboardData.totalRevenue || 0,
          pendingApprovals: dashboardData.pendingApprovals || 0,
          pendingMotoboys: dashboardData.pendingMotoboys || 0,
        });

        // Definir avatar baseado no gênero
        if (AdminUser?.name) {
          try {
            const response = await buscarGenero(AdminUser.name);
            if (response.data.gender === "female") {
              setSelectedAvatar("https://avatar.iran.liara.run/public/girl");
            } else {
              setSelectedAvatar("https://avatar.iran.liara.run/public/boy");
            }
          } catch (error) {
            console.log("Erro ao buscar gênero:", error);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        // Dados de fallback
        setStats({
          todayOrders: 0,
          onlineDrivers: 0,
          openOccurrences: 0,
          totalStores: 0,
          totalRevenue: 0,
          pendingApprovals: 0,
          pendingMotoboys: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [AdminUser]);

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Definir itens do menu para SideDrawer
  const menuItems = SUPPORT_MENU_ITEMS;

  // Definir itens de rodapé para SideDrawer
  const footerItems = createAdminFooterItems(handleLogout);

  // Componente StatCard com cores específicas para cada categoria
  const StatCard = ({ title, value, icon, color = "primary", subtitle }) => {
    // Definir cores específicas com alto contraste
    const getAvatarStyles = (colorType) => {
      const colorMap = {
        primary: { bgcolor: "#1976d2", color: "#ffffff" }, // Azul escuro/Branco
        success: { bgcolor: "#2e7d32", color: "#ffffff" }, // Verde escuro/Branco
        warning: { bgcolor: "#ed6c02", color: "#ffffff" }, // Laranja escuro/Branco
        info: { bgcolor: "#0288d1", color: "#ffffff" }, // Azul claro escuro/Branco
        error: { bgcolor: "#d32f2f", color: "#ffffff" }, // Vermelho escuro/Branco
      };

      return colorMap[colorType] || colorMap.primary;
    };

    const avatarStyles = getAvatarStyles(color);

    return (
      <Card elevation={3} sx={{ height: "100%", borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {title}
              </Typography>
              <Typography
                variant="h4"
                component="div"
                color={`${color}.main`}
                fontWeight="bold"
              >
                {value}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mt: 1 }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar
              sx={{
                bgcolor: avatarStyles.bgcolor,
                color: avatarStyles.color,
                width: 56,
                height: 56,
                boxShadow: 3,
                border: "2px solid rgba(255,255,255,0.8)",
              }}
            >
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* AppBar para dispositivos móveis */}
      {isMobile && (
        <AppBar position="fixed" sx={{ bgcolor: "primary.main" }}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontWeight: "bold" }}
            >
              Gringo Delivery - Admin
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* SideDrawer */}
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

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: isMobile ? 0 : "2px",
          mt: isMobile ? "64px" : 0,
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 4, fontWeight: "bold", color: "primary.main" }}
          >
            Dashboard Administrativo
          </Typography>

          {/* Perfil do Admin */}
          <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "start",
                mb: 1,
              }}
            >
              <Avatar
                src={selectedAvatar}
                sx={{ width: 80, height: 80, mb: 1 }}
              >
                {AdminUser?.name?.charAt(0)?.toUpperCase() || "A"}
              </Avatar>

              <Box sx={{ mt: 3, ml: 2 }}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{ fontWeight: "bold" }}
                >
                  Bem-vindo, {AdminUser?.name || "Administrador"}!
                </Typography>
                <Chip
                  label="Administrador"
                  color="primary"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2, mr: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Email:
                  </Typography>
                  <Typography variant="body1">{AdminUser?.email}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mr: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Nível de Acesso:
                  </Typography>
                  <Typography variant="body1" color="success.main">
                    Total (Administrador)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Cards de Estatísticas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Pedidos Hoje"
                value={stats.todayOrders}
                icon={<OrdersIcon />}
                color="primary"
                subtitle="Pedidos realizados hoje"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Motoboys Online"
                value={stats.onlineDrivers}
                icon={<MotoboyIcon />}
                color="success"
                subtitle="Entregadores ativos"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Ocorrências Abertas"
                value={stats.openOccurrences}
                icon={<OccurrenceIcon />}
                color="warning"
                subtitle="Pendentes de resolução"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Lojas Ativas"
                value={stats.totalStores}
                icon={<StoreIcon />}
                color="info"
                subtitle="Estabelecimentos cadastrados"
              />
            </Grid>
          </Grid>

          {/* Cards de Receita e Aprovações */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={2}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      Vendas do Mês
                    </Typography>
                    <Avatar
                      sx={{
                        bgcolor: "#f6f6f6",
                        color: "success.main",
                        marginLeft: 1,
                      }}
                    >
                      <RevenueIcon />
                    </Avatar>
                  </Box>
                  <Typography
                    variant="h4"
                    color="success.main"
                    fontWeight="bold"
                  >
                    R${" "}
                    {stats.totalRevenue.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography
                      variant="body2"
                      color="success.main"
                      sx={{ ml: 0.5 }}
                    ></Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                elevation={3}
                sx={{ height: "100%", borderRadius: 2, marginLeft: 1 }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={2}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      Aprovações Pendentes
                    </Typography>
                    <Avatar
                      sx={{
                        bgcolor: "#f6f6f6",
                        color: "warning.main",
                        marginLeft: 1,
                      }}
                    >
                      <StoreIcon />
                    </Avatar>
                  </Box>
                  <Typography
                    variant="h4"
                    color="warning.main"
                    fontWeight="bold"
                  >
                    {stats.pendingApprovals}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mt: 1 }}
                  >
                    Lojas aguardando aprovação
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={2}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      Aprovações Pendentes
                    </Typography>
                    <Avatar
                      sx={{
                        bgcolor: "#f6f6f6",
                        color: "warning.main",
                        marginLeft: 1,
                      }}
                    >
                      <MotoboyIcon />
                    </Avatar>
                  </Box>
                  <Typography
                    variant="h4"
                    color="warning.main"
                    fontWeight="bold"
                  >
                    {stats.pendingMotoboys}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mt: 1 }}
                  >
                    Motoboys aguardando aprovação
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Acesso Rápido */}
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{ mb: 3, fontWeight: "bold", color: "primary.main" }}
            >
              Acesso Rápido
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/stores"
                  startIcon={<StoreIcon />}
                  fullWidth
                  sx={{
                    p: 2,
                    height: "100%",
                    color: "primary.main",
                    borderColor: "primary.main",
                  }}
                >
                  Gerenciar Lojas
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/pedidos"
                  startIcon={<OrdersIcon />}
                  fullWidth
                  sx={{
                    p: 2,
                    height: "100%",
                    color: "primary.main",
                    borderColor: "primary.main",
                  }}
                >
                  Ver Pedidos
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/drivers"
                  startIcon={<MotoboyIcon />}
                  fullWidth
                  sx={{
                    p: 2,
                    height: "100%",
                    color: "primary.main",
                    borderColor: "primary.main",
                  }}
                >
                  Motoboys
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/reports"
                  startIcon={<ReportIcon />}
                  fullWidth
                  sx={{
                    p: 2,
                    height: "100%",
                    color: "primary.main",
                    borderColor: "primary.main",
                  }}
                >
                  Relatórios
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
