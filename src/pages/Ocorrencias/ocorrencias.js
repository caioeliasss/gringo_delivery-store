// Importações necessárias
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Paper,
  Avatar,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Fab,
  Container,
  AppBar,
  Toolbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
} from "@mui/material";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  PendingActions as PendingActionsIcon,
  Reply as ReplyIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  PhoneAndroid as PhoneAndroidIcon,
  ReportProblem as ReportProblemIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  ShoppingBag as ProductsIcon,
  Chat as ChatIcon,
  Logout as LogoutIcon,
  ReportProblem as OcorrenciasIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const ASSUNTOS_OCORRENCIA = [
  { label: "Problema com pedido", value: "PEDIDO", icon: ShoppingCartIcon },
  { label: "Problema com cliente", value: "CLIENTE", icon: PersonIcon },
  { label: "Problema com entregador", value: "ENTREGADOR", icon: PersonIcon },
  { label: "Problema com pagamento", value: "PAGAMENTO", icon: PaymentIcon },
  { label: "Problema com aplicativo", value: "APP", icon: PhoneAndroidIcon },
  { label: "Outro", value: "OUTRO", icon: ReportProblemIcon },
];

export default function OcorrenciasPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [ocorrencias, setOcorrencias] = useState([]);
  const [filteredOcorrencias, setFilteredOcorrencias] = useState([]);
  const [filter, setFilter] = useState(0); // 0: Todas, 1: Abertas, 2: Finalizadas
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [estabelecimento, setEstabelecimento] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [formData, setFormData] = useState({
    assunto: "",
    descricao: "",
  });

  // Função para toggle do drawer
  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  useEffect(() => {
    fetchOcorrencias();
    fetchEstabelecimento();
  }, []);

  useEffect(() => {
    applyFilter(filter);
  }, [ocorrencias, filter]);

  const fetchEstabelecimento = async () => {
    try {
      const response = await api.get("/stores/me");
      setEstabelecimento(response.data);
    } catch (error) {
      console.error("Erro ao buscar dados do estabelecimento:", error);
    }
  };

  const fetchOcorrencias = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/occurrences/firebase/${user?.uid}`);
      setOcorrencias(response.data);
    } catch (error) {
      console.error("Erro ao buscar ocorrências:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (filterValue) => {
    switch (filterValue) {
      case 1: // Abertas
        setFilteredOcorrencias(
          ocorrencias.filter(
            (o) => o.status === "ABERTO" || o.status === "PENDENTE"
          )
        );
        break;
      case 2: // Finalizadas
        setFilteredOcorrencias(
          ocorrencias.filter((o) => o.status === "FINALIZADA")
        );
        break;
      default: // Todas
        setFilteredOcorrencias(ocorrencias);
        break;
    }
  };

  const submitOcorrencia = async () => {
    if (!formData.assunto || !formData.descricao) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    try {
      setLoading(true);
      const ocorrenciaData = {
        type: formData.assunto,
        firebaseUid: currentUser?.uid || null,
        description: formData.descricao,
        estabelecimentoId: estabelecimento._id || null,
        date: new Date(),
      };

      await api.post("/occurrences", ocorrenciaData);
      await api.post("/notifications/notifySupport", {
        title: "Nova Ocorrência - Estabelecimento",
        message: `Ocorrência registrada pelo estabelecimento: ${formData.assunto}`,
      });

      setDialogVisible(false);
      setFormData({ assunto: "", descricao: "" });
      alert("Ocorrência registrada com sucesso!");
      fetchOcorrencias();
    } catch (error) {
      console.error("Erro ao criar ocorrência:", error);
      alert("Não foi possível registrar a ocorrência.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      ABERTO: {
        color: "warning",
        icon: <PendingActionsIcon fontSize="small" />,
        label: "Aberta",
      },
      PENDENTE: {
        color: "info",
        icon: <PendingIcon fontSize="small" />,
        label: "Pendente",
      },
      FINALIZADA: {
        color: "success",
        icon: <CheckCircleIcon fontSize="small" />,
        label: "Finalizada",
      },
    };

    const config = statusConfig[status] || statusConfig.ABERTO;

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        variant="outlined"
        size="small"
      />
    );
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  const getAssuntoIcon = (assunto) => {
    const item = ASSUNTOS_OCORRENCIA.find((a) => a.value === assunto);
    return item ? item.icon : ReportProblemIcon;
  };

  const getAssuntoLabel = (assunto) => {
    const item = ASSUNTOS_OCORRENCIA.find((a) => a.value === assunto);
    return item ? item.label : assunto;
  };

  // Componente do drawer de navegação
  const drawerItems = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
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
          sx={{
            color: "text.primary",
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
          sx={{
            color: "text.primary",
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
          sx={{
            color: "text.primary",
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

      {/* Conteúdo principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: isMobile ? 0 : "2px",
          mt: isMobile ? "64px" : 0,
        }}
      >
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 3,
              p: 2,
              backgroundColor: "white",
              borderRadius: 2,
              boxShadow: 1,
            }}
          >
            <ReportProblemIcon sx={{ mr: 2, color: "primary.main" }} />
            <Typography variant="h4" fontWeight="bold" sx={{ flexGrow: 1 }}>
              Ocorrências
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogVisible(true)}
              sx={{ ml: 2 }}
            >
              Nova Ocorrência
            </Button>
          </Box>

          {/* Filtros */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={filter}
              onChange={(e, newValue) => setFilter(newValue)}
              variant="fullWidth"
              indicatorColor="primary"
            >
              <Tab label="Todas" />
              <Tab label="Abertas" />
              <Tab label="Finalizadas" />
            </Tabs>
          </Paper>

          {/* Lista de Ocorrências */}
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 300,
              }}
            >
              <CircularProgress size={40} />
            </Box>
          ) : filteredOcorrencias.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: "center",
                backgroundColor: "grey.50",
              }}
            >
              <ReportProblemIcon
                sx={{ fontSize: 80, color: "grey.400", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma ocorrência encontrada
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogVisible(true)}
                sx={{ mt: 2 }}
              >
                Registrar Primeira Ocorrência
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredOcorrencias.map((ocorrencia, index) => {
                const IconComponent = getAssuntoIcon(ocorrencia.type);

                return (
                  <Grid item xs={12} key={ocorrencia.id || index}>
                    <Card
                      sx={{
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 4,
                        },
                      }}
                    >
                      <CardContent>
                        {/* Header do Card */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              flex: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: "primary.light",
                                color: "primary.contrastText",
                                mr: 2,
                              }}
                            >
                              <IconComponent />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {getAssuntoLabel(ocorrencia.type)}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatDate(ocorrencia.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                          {getStatusChip(ocorrencia.status)}
                        </Box>

                        {/* Descrição */}
                        <Typography
                          variant="body1"
                          sx={{ mb: 2, lineHeight: 1.6 }}
                        >
                          {ocorrencia.description}
                        </Typography>

                        {/* Resposta do Suporte */}
                        {ocorrencia.answer && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Box
                              sx={{
                                p: 2,
                                backgroundColor: "info.light",
                                borderRadius: 1,
                                borderLeft: 4,
                                borderLeftColor: "info.main",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mb: 1,
                                }}
                              >
                                <ReplyIcon sx={{ mr: 1, color: "info.main" }} />
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                  color="info.main"
                                >
                                  Resposta do Suporte
                                </Typography>
                              </Box>
                              <Typography variant="body2">
                                {ocorrencia.answer}
                              </Typography>
                            </Box>
                          </>
                        )}

                        {/* Informações do Pedido */}
                        {ocorrencia.orderId && (
                          <Box
                            sx={{
                              mt: 2,
                              pt: 2,
                              borderTop: 1,
                              borderColor: "grey.200",
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Pedido: #{ocorrencia.orderId}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* FAB para dispositivos móveis */}
          <Fab
            color="primary"
            aria-label="add"
            onClick={() => setDialogVisible(true)}
            sx={{
              position: "fixed",
              bottom: 20,
              right: 20,
              display: { xs: "flex", md: "none" },
            }}
          >
            <AddIcon />
          </Fab>

          {/* Dialog para Nova Ocorrência */}
          <Dialog
            open={dialogVisible}
            onClose={() => setDialogVisible(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: { borderRadius: 2 },
            }}
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <AddIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6" fontWeight="bold">
                  Nova Ocorrência
                </Typography>
              </Box>
              <IconButton onClick={() => setDialogVisible(false)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Selecione o tipo do problema:
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {ASSUNTOS_OCORRENCIA.map((assunto) => {
                    const IconComponent = assunto.icon;
                    const isSelected = formData.assunto === assunto.value;

                    return (
                      <Grid item xs={12} sm={6} key={assunto.value}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: "pointer",
                            border: 2,
                            borderColor: isSelected
                              ? "primary.main"
                              : "grey.200",
                            backgroundColor: isSelected
                              ? "primary.light"
                              : "white",
                            transition: "all 0.2s",
                            "&:hover": {
                              borderColor: "primary.main",
                              backgroundColor: "primary.light",
                            },
                          }}
                          onClick={() =>
                            setFormData({ ...formData, assunto: assunto.value })
                          }
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              flexDirection: "column",
                              textAlign: "center",
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: isSelected ? "white" : "primary.light",
                                color: isSelected
                                  ? "primary.main"
                                  : "primary.contrastText",
                                mb: 1,
                              }}
                            >
                              <IconComponent />
                            </Avatar>
                            <Typography
                              variant="body2"
                              fontWeight={isSelected ? "bold" : "normal"}
                              color={isSelected ? "white" : "text.primary"}
                            >
                              {assunto.label}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Descreva o problema:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  variant="outlined"
                  placeholder="Descreva sua ocorrência com detalhes para que possamos ajudar melhor..."
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  Esta ocorrência será enviada para nossa equipe de suporte que
                  entrará em contato em breve.
                </Alert>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={() => setDialogVisible(false)} color="inherit">
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={submitOcorrencia}
                disabled={loading || !formData.assunto || !formData.descricao}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <AddIcon />
                }
              >
                {loading ? "Enviando..." : "Enviar Ocorrência"}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
}
