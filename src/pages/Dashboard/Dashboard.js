import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getUserProfile, acceptTerms } from "../../services/api";
import OrderStats from "../../components/orderStats";
import OverdueBillings from "../../components/OverdueBillings";
import TermsServiceModal from "../../components/TermsServiceModal";
import QuickNotifications from "../../components/QuickNotifications/QuickNotifications";
import {
  Box,
  Container,
  Typography,
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
} from "@mui/material";
import {
  Receipt as OrdersIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  ReportProblem as OcorrenciasIcon,
  Chat as ChatIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import { buscarCnpj } from "../../services/cnpj";
import {
  SUPPORT_MENU_ITEMS,
  createAdminFooterItems,
} from "../../config/menuConfig";
import SideDrawer from "../../components/SideDrawer/SideDrawer";

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cnpjInfo, setCnpjInfo] = useState({});
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await getUserProfile();
        const userData = userResponse.data;
        const cnpj = userData.cnpj;
        setUserProfile(userData);

        // Verificar se o usuário precisa aceitar os termos
        if (!userData.termsAccepted) {
          setShowTermsModal(true);
        }

        const cnpjResponse = await buscarCnpj(cnpj);
        setCnpjInfo(cnpjResponse.data);
      } catch (error) {
        setCnpjInfo({ nome_fantasia: "Caro Cliente" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      await acceptTerms();
      // Atualizar o perfil do usuário
      setUserProfile((prev) => ({
        ...prev,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      }));
      setShowTermsModal(false);
    } catch (error) {
      console.error("Erro ao aceitar termos:", error);
      throw error; // Re-throw para que o modal possa mostrar o erro
    }
  };

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = SUPPORT_MENU_ITEMS;

  // Definir itens de rodapé para SideDrawer
  const footerItems = createAdminFooterItems(handleLogout);

  const drawerItems = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, textAlign: "center" }}>
        <img
          src="https://i.imgur.com/8jOdfcO.png"
          alt="Gringo Delivery"
          style={{ height: 50, marginBottom: 16 }}
        />
      </Box>
      <Divider />
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
  );

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
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontWeight: "bold" }}
            >
              Gringo Delivery
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer para dispositivos móveis */}
      <Drawer
        anchor="left"
        open={isMobile ? drawerOpen : true}
        onClose={toggleDrawer(false)}
        variant={isMobile ? "temporary" : "permanent"}
        sx={{
          width: 250,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 250,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerItems}
      </Drawer>

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
        <Container maxWidth="md">
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 4, fontWeight: "bold", color: "primary.main" }}
          >
            Dashboard
          </Typography>

          <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              {userProfile?.perfil_url ? (
                <Avatar
                  src={
                    userProfile.perfil_url ||
                    "https://firebasestorage.googleapis.com/v0/b/gringo-delivery.firebasestorage.app/o/location.png?alt=media&token=30f96692-ca61-410f-940f-604af7b6be16"
                  }
                  alt={userProfile.displayName || currentUser?.email}
                  sx={{ width: 80, height: 80, mr: 3 }}
                />
              ) : (
                <Avatar
                  sx={{ width: 80, height: 80, mr: 3, bgcolor: "primary.main" }}
                >
                  {(userProfile?.displayName || currentUser?.email || "?")
                    .charAt(0)
                    .toUpperCase()}
                </Avatar>
              )}
              <Box>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{ fontWeight: "bold" }}
                >
                  Bem-vindo,{" "}
                  {/* {userProfile?.displayName || currentUser?.email.split("@")[0]} */}
                  {userProfile.businessName
                    ? userProfile.businessName
                    : userProfile.displayName}
                  !
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2, mr: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Email:
                  </Typography>
                  <Typography variant="body1">{currentUser?.email}</Typography>
                </Box>
              </Grid>

              {userProfile?.cnpj && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2, mr: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      CNPJ:
                    </Typography>
                    <Typography variant="body1">
                      {String(userProfile?.cnpj).replace(
                        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                        "$1.$2.$3/$4-$5"
                      )}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Box sx={{ mr: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Cadastro Aprovado:
                  </Typography>
                  <Typography
                    variant="body1"
                    color={userProfile?.cnpj_approved ? "success" : "error"}
                  >
                    {userProfile?.cnpj_approved ? "Aprovado" : "Pendente"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* ✅ Componente de Coordenadas de Retirada */}

          {/* ✅ Componente de Notificações Rápidas */}
          <QuickNotifications />

          {/* ✅ ADICIONAR: Componente de contas atrasadas */}
          <Paper elevation={3} sx={{ mt: 4, p: 4, borderRadius: 3 }}>
            <OverdueBillings />
          </Paper>

          <Paper elevation={3} sx={{ mt: 4, p: 4, borderRadius: 3 }}>
            <OrderStats />
          </Paper>
        </Container>
      </Box>

      {/* Modal de Termos de Serviço */}
      <TermsServiceModal
        open={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
        userType="store"
      />
    </Box>
  );
};

export default Dashboard;
