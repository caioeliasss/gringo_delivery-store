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
  SmartToy as SmartToyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  SUPPORT_MENU_ITEMS,
  createAdminFooterItems,
} from "../../config/menuConfig";
import SideDrawer from "../../components/SideDrawer/SideDrawer";

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
  const [filter, setFilter] = useState(1); // 0: Todas, 1: Abertas, 2: Finalizadas
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [estabelecimento, setEstabelecimento] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [formData, setFormData] = useState({
    assunto: "",
    descricao: "",
  });
  const menuItems = SUPPORT_MENU_ITEMS;

  // Definir itens de rodapé para SideDrawer

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
          ocorrencias.filter((o) => o.status === "FECHADO")
        );
        break;
      default: // Todas
        setFilteredOcorrencias(ocorrencias);
        break;
    }
  };

  const [aiGenerating, setAiGenerating] = useState(false);

  const submitOcorrencia = async () => {
    if (!formData.assunto || !formData.descricao) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    try {
      setLoading(true);
      setAiGenerating(true);

      const ocorrenciaData = {
        type: formData.assunto,
        storeId: estabelecimento?._id || null,
        firebaseUid: currentUser?.uid || null,
        description: formData.descricao,
        estabelecimentoId: estabelecimento._id || null,
        date: new Date(),
      };

      // Simular delay para mostrar o processo da IA
      setTimeout(() => setAiGenerating(false), 2000);

      await api.post("/occurrences", ocorrenciaData);
      await api.post("/notifications/notifySupport", {
        title: "Nova Ocorrência - Estabelecimento",
        message: `Ocorrência registrada pelo estabelecimento: ${formData.assunto}`,
      });

      setDialogVisible(false);
      setFormData({ assunto: "", descricao: "" });
      alert(
        "Ocorrência registrada com sucesso! A IA GringoBot já gerou uma resposta inicial."
      );
      fetchOcorrencias();
    } catch (error) {
      console.error("Erro ao criar ocorrência:", error);
      alert("Não foi possível registrar a ocorrência.");
    } finally {
      setLoading(false);
      setAiGenerating(false);
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

  const footerItems = createAdminFooterItems(handleLogout);

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
      FECHADO: {
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
                            <Box sx={{ flex: 1 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 0.5,
                                }}
                              >
                                <Typography variant="h6" fontWeight="bold">
                                  {getAssuntoLabel(ocorrencia.type)}
                                </Typography>
                                {ocorrencia.answerAi && (
                                  <Chip
                                    icon={
                                      <SmartToyIcon sx={{ fontSize: 14 }} />
                                    }
                                    label="IA Respondeu"
                                    size="small"
                                    sx={{
                                      background:
                                        "linear-gradient(45deg, #667eea, #764ba2)",
                                      color: "white",
                                      fontWeight: "bold",
                                      fontSize: "0.7rem",
                                      "& .MuiChip-icon": {
                                        color: "white",
                                      },
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatDate(ocorrencia.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 1,
                            }}
                          >
                            {getStatusChip(ocorrencia.status)}
                            {ocorrencia.answerAi && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  backgroundColor: "rgba(102, 126, 234, 0.1)",
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.5,
                                }}
                              >
                                <AutoAwesomeIcon
                                  sx={{
                                    fontSize: 14,
                                    color: "#667eea",
                                    mr: 0.5,
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "#667eea",
                                    fontWeight: "bold",
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  Resposta Inteligente
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>

                        {/* Descrição */}
                        <Typography
                          variant="body1"
                          sx={{ mb: 2, lineHeight: 1.6 }}
                        >
                          {ocorrencia.description}
                        </Typography>

                        {/* Resposta Automática da IA */}
                        {ocorrencia.answerAi && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Box
                              sx={{
                                position: "relative",
                                p: 3,
                                background:
                                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                borderRadius: 2,
                                color: "white",
                                boxShadow:
                                  "0 8px 32px rgba(102, 126, 234, 0.2)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                "&::before": {
                                  content: '""',
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                                  borderRadius: 2,
                                  pointerEvents: "none",
                                },
                              }}
                            >
                              {/* Header da IA */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mb: 2,
                                  position: "relative",
                                  zIndex: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    backgroundColor:
                                      "rgba(255, 255, 255, 0.15)",
                                    borderRadius: 2,
                                    px: 2,
                                    py: 1,
                                    backdropFilter: "blur(10px)",
                                  }}
                                >
                                  <SmartToyIcon sx={{ mr: 1, fontSize: 20 }} />
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight="bold"
                                    sx={{ mr: 1 }}
                                  >
                                    GringoBot
                                  </Typography>
                                  <Chip
                                    icon={
                                      <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                                    }
                                    label="IA"
                                    size="small"
                                    sx={{
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.2)",
                                      color: "white",
                                      fontWeight: "bold",
                                      fontSize: "0.7rem",
                                      "& .MuiChip-icon": {
                                        color: "white",
                                      },
                                    }}
                                  />
                                </Box>
                                <Box
                                  sx={{
                                    ml: "auto",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Chip
                                    label="Resposta Automática"
                                    size="small"
                                    sx={{
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.1)",
                                      color: "rgba(255, 255, 255, 0.8)",
                                      fontSize: "0.7rem",
                                      border:
                                        "1px solid rgba(255, 255, 255, 0.2)",
                                    }}
                                  />
                                </Box>
                              </Box>

                              {/* Conteúdo da resposta */}
                              <Box
                                sx={{
                                  position: "relative",
                                  zIndex: 1,
                                }}
                              >
                                <Typography
                                  variant="body1"
                                  sx={{
                                    lineHeight: 1.6,
                                    fontSize: "0.95rem",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                  }}
                                >
                                  {ocorrencia.answerAi}
                                </Typography>
                              </Box>

                              {/* Efeito de brilho */}
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: -2,
                                  right: -2,
                                  width: 20,
                                  height: 20,
                                  background:
                                    "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
                                  borderRadius: "50%",
                                  animation: "sparkle 2s ease-in-out infinite",
                                  "@keyframes sparkle": {
                                    "0%, 100%": {
                                      opacity: 0.3,
                                      transform: "scale(0.8)",
                                    },
                                    "50%": {
                                      opacity: 1,
                                      transform: "scale(1.2)",
                                    },
                                  },
                                }}
                              />
                            </Box>
                          </>
                        )}

                        {/* Resposta do Suporte Humano */}
                        {ocorrencia.answer && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Box
                              sx={{
                                p: 2,
                                backgroundColor: "success.light",
                                borderRadius: 1,
                                borderLeft: 4,
                                borderLeftColor: "success.main",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mb: 1,
                                }}
                              >
                                <ReplyIcon
                                  sx={{ mr: 1, color: "success.main" }}
                                />
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                  color="success.main"
                                >
                                  Resposta do Suporte
                                </Typography>
                                <Chip
                                  label="Atendimento Humano"
                                  size="small"
                                  sx={{
                                    ml: 1,
                                    backgroundColor: "success.main",
                                    color: "white",
                                    fontSize: "0.7rem",
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" color="success.dark">
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

                <Alert
                  severity="info"
                  sx={{
                    mt: 2,
                    background:
                      "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))",
                    borderLeft: "4px solid #667eea",
                  }}
                  icon={<SmartToyIcon />}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", mb: 0.5 }}
                  >
                    🤖 IA GringoBot + Suporte Humano
                  </Typography>
                  Nossa IA GringoBot gerará uma resposta inicial automática para
                  sua ocorrência. Nossa equipe de suporte também será notificada
                  e entrará em contato se necessário.
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
                  loading ? (
                    aiGenerating ? (
                      <SmartToyIcon />
                    ) : (
                      <CircularProgress size={20} />
                    )
                  ) : (
                    <AddIcon />
                  )
                }
                sx={{
                  background:
                    loading && aiGenerating
                      ? "linear-gradient(45deg, #667eea, #764ba2)"
                      : undefined,
                }}
              >
                {loading
                  ? aiGenerating
                    ? "IA GringoBot está gerando resposta..."
                    : "Finalizando..."
                  : "Enviar Ocorrência"}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
}
