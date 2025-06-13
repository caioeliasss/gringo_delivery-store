import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getUserProfile } from "../../services/api";
import OrderStats from "../../components/orderStats";
import OverdueBillings from "../../components/OverdueBillings";
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
  ReportProblem as OcorrenciasIcon,
  Chat as ChatIcon,
  Map as MapIcon,
} from "@mui/icons-material";
import { buscarCnpj } from "../../services/cnpj";

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cnpjInfo, setCnpjInfo] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await getUserProfile();
        const cnpj = userResponse.data.cnpj;
        setUserProfile(userResponse.data);

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

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

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
      <List>
        <ListItem
          button
          component={Link}
          to="/dashboard"
          selected={true}
          sx={{
            color: "text.primary",
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            },
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/produtos"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <ProductsIcon />
          </ListItemIcon>
          <ListItemText primary="Produtos" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/pedidos"
          selected={true}
          sx={{
            color: "text.primary",
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            },
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <OrdersIcon />
          </ListItemIcon>
          <ListItemText primary="Pedidos" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/ocorrencias"
          selected={true}
          sx={{
            color: "text.primary",
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            },
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <OcorrenciasIcon />
          </ListItemIcon>
          <ListItemText primary="Ocorrências" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/chat"
          selected={true}
          sx={{
            color: "text.primary",
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            },
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <ChatIcon />
          </ListItemIcon>
          <ListItemText primary="Chat" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem
          button
          onClick={handleLogout}
          sx={{ "&:hover": { bgcolor: "error.light", color: "white" } }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItem>
      </List>
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
              {userProfile?.photoURL ? (
                <Avatar
                  src={userProfile.photoURL}
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
                  {cnpjInfo.nome_fantasia
                    ? cnpjInfo.nome_fantasia
                    : cnpjInfo.razao_social}
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
                      {String(userProfile.cnpj).replace(
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
                    color={userProfile.cnpj_approved ? "success" : "error"}
                  >
                    {userProfile.cnpj_approved ? "Aprovado" : "Pendente"}
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
                  to="/produtos"
                  startIcon={<ProductsIcon />}
                  fullWidth
                  sx={{
                    p: 2,
                    height: "100%",
                    color: "primary.main",
                    borderColor: "primary.main",
                  }}
                >
                  Gerenciar Produtos
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
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
                  Gerenciar Pedidos
                </Button>
              </Grid>
              {/* Adicione outros botões de acesso rápido conforme necessário */}
            </Grid>
          </Paper>

          {/* ✅ ADICIONAR: Componente de contas atrasadas */}
          <Paper elevation={3} sx={{ mt: 4, p: 4, borderRadius: 3 }}>
            <OverdueBillings />
          </Paper>

          <Paper elevation={3} sx={{ mt: 4, p: 4, borderRadius: 3 }}>
            <OrderStats />
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;
