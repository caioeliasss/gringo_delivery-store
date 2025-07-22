import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getUserProfile } from "../../services/api";
import OrderStats from "../../components/orderStats";
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
} from "@mui/material";
import {
  Receipt as OrdersIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Menu as MenuIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon,
  ShoppingBag,
  Map as MapIcon,
  BikeScooter as MotoboyIcon,
  ReportProblem as ReportProblemIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import { buscarCnpj } from "../../services/cnpj";
import api from "../../services/api";
import { buscarGenero } from "../../services/gender";
import SideDrawer from "../../components/SideDrawer/SideDrawer";

const SuporteDashboard = () => {
  //TODO adicionar stats dos suportes
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cnpjInfo, setCnpjInfo] = useState({});
  const [selectedAvatar, setSelectedAvatar] = useState(
    "avatar-placeholder.png"
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await api.get(
          `/support/firebase/${currentUser?.uid}`
        );
        setUserProfile(userResponse.data);

        try {
          const response = await buscarGenero(userResponse.data.name);
          if (response.data.gender === "female") {
            setSelectedAvatar("https://avatar.iran.liara.run/public/girl");
          } else {
            setSelectedAvatar("https://avatar.iran.liara.run/public/boy");
          }
        } catch (error) {}
      } catch (error) {
        setCnpjInfo({ nome_fantasia: "Caro Cliente" });
      } finally {
        setLoading(false);
      }
    };

    const checkIfIsSupportTeam = async () => {
      try {
        const response = await api.get(`/support/firebase/${currentUser?.uid}`);
        if (!response.data) {
          navigate("/login");
        }
      } catch (error) {
        console.error("Erro ao verificar o usuário:", error);
        navigate("/login");
      }
    };

    checkIfIsSupportTeam();
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

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = [
    { path: "/dashboard", text: "Dashboard", icon: <DashboardIcon /> },
    { path: "/produtos", text: "Produtos", icon: <ProductsIcon /> },
    { path: "/ocorrencias", text: "Ocorrências", icon: <ReportProblemIcon /> },
    { path: "/chat", text: "Chat", icon: <ChatIcon /> },
    { path: "/motoboys", text: "Entregadores", icon: <MotoboyIcon /> },
    { path: "/pedidos", text: "Pedidos", icon: <OrdersIcon /> },
  ];

  // Definir itens de rodapé para SideDrawer
  const footerItems = [
    {
      text: "Sair",
      icon: <LogoutIcon />,
      onClick: handleLogout,
      color: "error",
    },
  ];

  const drawerItems = (
    <SideDrawer
      open={true}
      variant="permanent"
      title="Gringo Delivery"
      logoUrl="https://i.imgur.com/8jOdfcO.png"
      logoAlt="Gringo Delivery"
      logoHeight={50}
      menuItems={menuItems}
      footerItems={footerItems}
    />
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
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "start",
                mb: 1,
              }}
            >
              {/* Avatar principal */}
              {userProfile?.photoURL ? (
                <Avatar
                  src={userProfile.photoURL}
                  alt={userProfile.displayName || currentUser?.email}
                  sx={{ width: 80, height: 80, mb: 1 }}
                />
              ) : (
                <Avatar
                  src={`${selectedAvatar}`}
                  sx={{ width: 80, height: 80, mb: 1 }}
                >
                  {!selectedAvatar &&
                    (userProfile?.name || currentUser?.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                </Avatar>
              )}

              <Box sx={{ mt: 3, ml: 2, textAlign: "center" }}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{ fontWeight: "bold" }}
                >
                  Bem-vindo,{" "}
                  {userProfile?.name || currentUser?.email.split("@")[0]}!
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
              <Grid item xs={12} sm={6}>
                <Box sx={{ mr: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Cadastro Aprovado:
                  </Typography>
                  <Typography
                    variant="body1"
                    color={userProfile.active ? "success" : "error"}
                  >
                    {userProfile.active ? "Aprovado" : "Pendente"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{ mb: 2, fontWeight: "bold", color: "primary.main" }}
            >
              Acesso Rápido
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/ocorrencias"
                  startIcon={<ProductsIcon />}
                  fullWidth
                  sx={{
                    p: 2,
                    height: "100%",
                    color: "primary.main",
                    borderColor: "primary.main",
                  }}
                >
                  Gerenciar Ocorrências
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/chat"
                  startIcon={<OrdersIcon />}
                  fullWidth
                  sx={{
                    p: 2,
                    height: "100%",
                    color: "primary.main",
                    borderColor: "primary.main",
                  }}
                >
                  Gerenciar Chat
                </Button>
              </Grid>
              {/* Adicione outros botões de acesso rápido conforme necessário */}
            </Grid>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default SuporteDashboard;
