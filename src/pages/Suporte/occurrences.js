import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Container,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
  Badge,
  InputAdornment,
  Menu,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  ChatBubbleOutline as ChatIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  MoreVert as MoreVertIcon,
  AccessTime as AccessTimeIcon,
  ErrorOutline as ErrorOutlineIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  ShoppingBag as OrderIcon,
  DirectionsBike as MotoboyIcon,
  DateRange as DateIcon,
  Place as PlaceIcon,
  TableChart as TableChartIcon,
  GridView as GridViewIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Receipt as OrdersIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon,
  Report as ReportProblemIcon,
  Map as MapIcon,
  ReportProblem as OcorrenciasIcon,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import eventService from "../../services/eventService";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
} from "../../config/menuConfig";

const TIPOS_OCORRENCIA = {
  CLIENTE: {
    label: "Problema com Cliente",
    color: "#E57373",
    short: "Cliente",
  },
  ENTREGA: {
    label: "Problema com Entrega",
    color: "#FFB74D",
    short: "Entrega",
  },
  PAGAMENTO: {
    label: "Problema com Pagamento",
    color: "#4FC3F7",
    short: "Pagamento",
  },
  EVENTO: { label: "Evento", color: "#AED581", short: "Evento" },
  APP: { label: "Problema com App", color: "#9575CD", short: "App" },
  OUTRO: { label: "Outros", color: "#90A4AE", short: "Outros" },
  ESTABELECIMENTO: {
    label: "Problema com Estabelecimento",
    color: "#4DB6AC",
    short: "Estabelecimento",
  },
  PRODUTO: {
    label: "Problema com Produto",
    color: "#FF8A65",
    short: "Produto",
  },
  MOTOBOY: {
    label: "Problema de busca de Motoboy",
    color: "#FF8A65",
    short: "Acionamento",
  },
};

const Occurrences = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // Estados
  const [occurrences, setOccurrences] = useState([]);
  const [filteredOccurrences, setFilteredOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOccurrence, setSelectedOccurrence] = useState(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [detailMode, setDetailMode] = useState(false);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [motoboyDetails, setMotoboyDetails] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [travelDetails, setTravelDetails] = useState(null);
  const [storeDetails, setStoreDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // Adicionar novo estado
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch occurrences on component mount

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert("Erro ao fazer logout. Tente novamente.");
    }
  };

  useEffect(() => {
    fetchOccurrences();

    // Configurar polling apenas se o usuário estiver autenticado
    if (currentUser) {
      const pollInterval = setInterval(() => {
        fetchOccurrences();
      }, 60000); // A cada 60 segundos

      // Cleanup: limpar o interval quando o componente for desmontado ou currentUser mudar
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [currentUser]);

  useEffect(() => {
    if (occurrences.length > 0) {
      filterOccurrences();
    }
  }, [tabValue, searchQuery, occurrences]);

  useEffect(() => {
    // Só conectar o SSE se o usuário estiver autenticado
    if (currentUser) {
      // Conectar com o UID do usuário atual como identificador da loja
      eventService.connect(currentUser.uid);

      // Configurar manipulador para atualizações de pedidos
      const handleOrderUpdate = (orderData) => {
        fetchOccurrences();
      };

      // Registrar o manipulador de eventos
      eventService.on("supportNotification", handleOrderUpdate);

      // Limpar na desmontagem
      return () => {
        eventService.off("supportNotification", handleOrderUpdate);
        // Não desconectar, pois outros componentes podem precisar da conexão
      };
    }
  }, [currentUser]);

  const handleRemoveMotoboy = async (occurrence) => {
    try {
      setStatusUpdateLoading(true);
      const response = await api.delete(
        `/motoboys/removeMotoboyFromOrder/${occurrence.orderId}/${occurrence.motoboyId}`
      );
      await api.put(`/travels/status/${occurrence.travelId}`, {
        status: "cancelado",
      });
      if (response.status === 200) {
        setSnackbar({
          open: true,
          message: "Motoboy removido com sucesso",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Erro ao remover motoboy",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Erro ao remover motoboy:", error);
      setSnackbar({
        open: true,
        message: "Erro ao remover motoboy",
        severity: "error",
      });
    } finally {
      setStatusUpdateLoading(false);
      handleStatusMenuClose();
    }
  };

  const handleFindMotoboys = async (occurrence) => {
    try {
      setStatusUpdateLoading(true);
      setSnackbar({
        open: true,
        message: "Buscando motoboy...",
        severity: "info",
      });

      const response = await api.get(
        `/motoboys/find?order_id=${occurrence.orderId}`
      );
      if (response.data.status === 200) {
        setSnackbar({
          open: true,
          message: "Motoboy encontrado com sucesso",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Erro ao encontrar motoboy",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Erro ao encontrar motoboys:", error);
      setSnackbar({
        open: true,
        message: "Erro ao encontrar motoboys",
        severity: "error",
      });
    } finally {
      setStatusUpdateLoading(false);
      handleStatusMenuClose();
    }
  };

  const fetchOccurrences = async () => {
    try {
      setLoading(true);
      const response = await api.get("/occurrences");
      setOccurrences(response.data);
      setFilteredOccurrences(response.data);
    } catch (error) {
      console.error("Error fetching occurrences:", error);
      setSnackbar({
        open: true,
        message: "Erro ao carregar ocorrências",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOccurrences = () => {
    let filtered = [...occurrences];

    // Filter by status
    if (tabValue !== "all") {
      filtered = filtered.filter((o) => o.status === tabValue.toUpperCase());
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.description?.toLowerCase().includes(query) ||
          o.name?.toLowerCase().includes(query) ||
          o.type?.toLowerCase().includes(query) ||
          o.orderId?.toString().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredOccurrences(filtered);
  };

  const handleStatusClick = (event, occurrence) => {
    setSelectedOccurrence(occurrence);
    setStatusMenuAnchorEl(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchorEl(null);
  };

  // Função para atualizar o status da ocorrência
  const handleStatusChange = async (newStatus) => {
    if (!selectedOccurrence) return;

    try {
      setStatusUpdateLoading(true);

      const response = await api.put(`/occurrences/${selectedOccurrence._id}`, {
        status: newStatus,
      });

      // Atualizar o estado local
      const updatedOccurrences = occurrences.map((o) =>
        o._id === selectedOccurrence._id ? { ...o, status: newStatus } : o
      );

      setOccurrences(updatedOccurrences);

      setSnackbar({
        open: true,
        message: `Status atualizado para ${
          newStatus === "ABERTO"
            ? "Aberto"
            : newStatus === "FECHADO"
            ? "Fechado"
            : "Pendente"
        }`,
        severity: "success",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setSnackbar({
        open: true,
        message: "Erro ao atualizar status",
        severity: "error",
      });
    } finally {
      setStatusUpdateLoading(false);
      handleStatusMenuClose();
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleOpenResponseDialog = (occurrence) => {
    setSelectedOccurrence(occurrence);
    setResponseText(occurrence.answer || "");
    setResponseDialogOpen(true);
  };

  const handleCloseResponseDialog = () => {
    setResponseDialogOpen(false);
    setResponseText("");
    setSelectedOccurrence(null);
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      setSnackbar({
        open: true,
        message: "Por favor, digite uma resposta",
        severity: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.put(`/occurrences/${selectedOccurrence._id}`, {
        answer: responseText,
      });

      // Update local state
      const updatedOccurrences = occurrences.map((o) =>
        o._id === selectedOccurrence._id ? response.data : o
      );
      setOccurrences(updatedOccurrences);

      setSnackbar({
        open: true,
        message: "Resposta enviada com sucesso!",
        severity: "success",
      });

      await api.post("/notifications/notifyOccurrence", {
        ...selectedOccurrence,
        title: "Nova resposta",
        message: "Suporte respondeu uma ocorrência",
      });

      handleCloseResponseDialog();
    } catch (error) {
      console.error("Error submitting response:", error);
      setSnackbar({
        open: true,
        message: "Erro ao enviar resposta",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Modificar a função handleStartChat no arquivo occurrences.js
  const handleStartChat = async (occurrence) => {
    try {
      setLoading(true);

      // Verificar se já existe um chat entre o suporte e o motoboy
      const motoboyId = occurrence.firebaseUid;
      const supportId = currentUser.uid;

      if (!motoboyId) {
        setSnackbar({
          open: true,
          message: "Esta ocorrência não tem um motoboy associado",
          severity: "warning",
        });
        return;
      }

      // Buscar chats existentes do usuário de suporte
      const existingChatsResponse = await api.get(`/chat/user/${supportId}`);
      const existingChats = existingChatsResponse.data;

      // Verificar se já existe um chat com o motoboy
      const existingChat = existingChats.find(
        (chat) =>
          chat.firebaseUid.includes(motoboyId) &&
          chat.firebaseUid.includes(supportId)
      );

      let chatId;

      if (existingChat) {
        // Usar o chat existente
        chatId = existingChat._id;
      } else {
        // Criar um novo chat
        const newChatResponse = await api.post("/chat", {
          firebaseUid: [supportId, motoboyId],
          chatType: "SUPPORT",
        });

        if (!newChatResponse.data || !newChatResponse.data._id) {
          throw new Error("Erro ao criar chat");
        }

        chatId = newChatResponse.data._id;

        // Criar uma mensagem inicial automaticamente
        await api.post("/chat/message", {
          chatId: chatId,
          message: `Chat iniciado pelo suporte referente à ocorrência: ${
            occurrence._id
          }\n\nTipo: ${
            TIPOS_OCORRENCIA[occurrence.type]?.label
          }\n\nDescrição: ${occurrence.description}`,
          sender: supportId,
        });

        setSnackbar({
          open: true,
          message: "Novo chat criado com sucesso!",
          severity: "success",
        });
      }

      // Navegar para a página de chat com os parâmetros necessários
      navigate(`/chat`, {
        state: {
          chatId: chatId,
          occurrenceId: occurrence._id,
          motoboyId: occurrence.motoboyId,
          storeId: occurrence.storeId,
          customerId: occurrence.customerId,
        },
      });
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      setSnackbar({
        open: true,
        message: "Erro ao iniciar chat. Tente novamente.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event, occurrence) => {
    setSelectedOccurrence(occurrence);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = (occurrence) => {
    setSelectedOccurrence(occurrence);
    setDetailMode(true);
    handleMenuClose();

    // Carregar detalhes relacionados
    loadRelatedDetails(occurrence);
  };

  const handleCloseDetails = () => {
    setDetailMode(false);
    setSelectedOccurrence(null);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  const getStatusChip = (status, occurrence = null) => {
    let chip;

    switch (status) {
      case "ABERTO":
        chip = (
          <Chip
            icon={<AccessTimeIcon />}
            label="Aberto"
            color="warning"
            size="small"
          />
        );
        break;
      case "FECHADO":
        chip = (
          <Chip
            icon={<CheckCircleIcon />}
            label="Fechado"
            color="success"
            size="small"
          />
        );
        break;
      case "PENDENTE":
        chip = (
          <Chip
            icon={<ErrorOutlineIcon />}
            label="Pendente"
            color="info"
            size="small"
          />
        );
        break;
      default:
        return null;
    }

    // Se não passamos uma ocorrência, retorna o chip estático
    if (!occurrence) return chip;

    // Se passamos uma ocorrência, faz o chip ser clicável
    return (
      <Box component="span" onClick={(e) => handleStatusClick(e, occurrence)}>
        <Tooltip title="Clique para alterar o status">
          <Box component="span" sx={{ cursor: "pointer" }}>
            {chip}
          </Box>
        </Tooltip>
      </Box>
    );
  };

  const getTypeChip = (type) => {
    const typeInfo = TIPOS_OCORRENCIA[type] || {
      label: type,
      color: "#757575",
    };

    return (
      <Chip
        label={typeInfo.short}
        size="small"
        style={{
          backgroundColor: `${typeInfo.color}20`,
          color: typeInfo.color,
          fontWeight: 500,
          border: `1px solid ${typeInfo.color}`,
        }}
      />
    );
  };

  // Função para buscar detalhes do motoboy
  const fetchMotoboyDetails = async (motoboyId) => {
    try {
      const response = await api.get(`/motoboys/id/${motoboyId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes do motoboy:", error);
      return null;
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes do pedido:", error);
      return null;
    }
  };

  const fetchTravelDetails = async (travelId) => {
    try {
      const response = await api.get(`/travels/details/${travelId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes da corrida:", error);
      return null;
    }
  };

  const fetchStoreDetails = async (storeId) => {
    try {
      const response = await api.get(`/stores/id/${storeId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes da loja:", error);
      return null;
    }
  };

  // Função para carregar todos os detalhes relacionados
  const loadRelatedDetails = async (occurrence) => {
    setLoadingDetails(true);

    const details = await Promise.allSettled([
      occurrence.motoboyId ? fetchMotoboyDetails(occurrence.motoboyId) : null,
      occurrence.orderId ? fetchOrderDetails(occurrence.orderId) : null,
      occurrence.travelId ? fetchTravelDetails(occurrence.travelId) : null,
      occurrence.storeId ? fetchStoreDetails(occurrence.storeId) : null,
    ]);

    setMotoboyDetails(
      details[0].status === "fulfilled" ? details[0].value : null
    );
    setOrderDetails(
      details[1].status === "fulfilled" ? details[1].value : null
    );
    setTravelDetails(
      details[2].status === "fulfilled" ? details[2].value : null
    );
    setStoreDetails(
      details[3].status === "fulfilled" ? details[3].value : null
    );

    setLoadingDetails(false);
  };

  // Substitua a função renderOccurrenceDetails() por esta versão expandida:
  const renderOccurrenceDetails = () => {
    if (!selectedOccurrence) return null;

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <IconButton
            onClick={handleCloseDetails}
            sx={{ mr: 1 }}
            color="primary"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h2" fontWeight="bold">
            Detalhes da Ocorrência
          </Typography>
        </Box>

        {/* Card Principal da Ocorrência */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              {getTypeChip(selectedOccurrence.type)}
            </Typography>
            {getStatusChip(selectedOccurrence.status, selectedOccurrence)}
          </Box>

          <Box sx={{ display: "flex", mb: 3, flexWrap: "wrap", gap: 1 }}>
            {TIPOS_OCORRENCIA[selectedOccurrence.type]?.label}
            <Chip
              icon={<DateIcon />}
              label={formatDate(selectedOccurrence.date)}
              size="small"
              variant="outlined"
            />
          </Box>

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Descrição:
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              whiteSpace: "pre-wrap",
              bgcolor: "#f5f5f5",
              p: 2,
              borderRadius: 1,
            }}
          >
            {selectedOccurrence.description}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            {selectedOccurrence.motoboyId && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <MotoboyIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Motoboy ID:
                    </Typography>
                    <Typography variant="body2">
                      {selectedOccurrence.motoboyId}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {selectedOccurrence.storeId && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <StoreIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Estabelecimento ID:
                    </Typography>
                    <Typography variant="body2">
                      {selectedOccurrence.storeId}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {selectedOccurrence.customerId && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <PersonIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Cliente ID:
                    </Typography>
                    <Typography variant="body2">
                      {selectedOccurrence.customerId}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {selectedOccurrence.orderId && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <OrderIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Pedido ID:
                    </Typography>
                    <Typography variant="body2">
                      {selectedOccurrence.orderId}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {selectedOccurrence.travelId && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <SendIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Travel ID:
                    </Typography>
                    <Typography variant="body2">
                      {selectedOccurrence.travelId}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {selectedOccurrence.coordinates &&
              selectedOccurrence.coordinates.length === 2 && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PlaceIcon color="primary" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Localização:
                      </Typography>
                      <Typography variant="body2">
                        {selectedOccurrence.coordinates[0].toFixed(6)},{" "}
                        {selectedOccurrence.coordinates[1].toFixed(6)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <DateIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Criado em:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedOccurrence.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {selectedOccurrence.answer && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Resposta:
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: "#e8f4fd",
                  borderRadius: 2,
                  borderLeft: "4px solid #2196f3",
                }}
              >
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                  {selectedOccurrence.answer}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 1, textAlign: "right" }}
                  color="textSecondary"
                >
                  {formatDate(selectedOccurrence.updatedAt)}
                </Typography>
              </Paper>
            </>
          )}

          <Box
            sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
          >
            {selectedOccurrence.status === "ABERTO" && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<ChatIcon />}
                  onClick={() => handleStartChat(selectedOccurrence)}
                >
                  Iniciar Chat
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MotoboyIcon />}
                  onClick={() => handleRemoveMotoboy(selectedOccurrence)}
                >
                  Remover Motoboy
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<OrderIcon />}
                  onClick={() => handleFindMotoboys(selectedOccurrence)}
                >
                  Reiniciar fila
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => handleOpenResponseDialog(selectedOccurrence)}
                >
                  Responder
                </Button>
              </>
            )}
          </Box>
        </Paper>

        {/* Loading de detalhes relacionados */}
        {loadingDetails && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              Carregando detalhes relacionados...
            </Typography>
          </Box>
        )}

        {/* Detalhes do Motoboy */}
        {motoboyDetails && (
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: "flex", alignItems: "center" }}
            >
              <MotoboyIcon sx={{ mr: 1 }} color="primary" />
              Detalhes do Motoboy
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Nome:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {motoboyDetails.name}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Telefone:
                  </Typography>
                  <Typography variant="body1">
                    {motoboyDetails.phoneNumber || "Não informado"}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Email:
                  </Typography>
                  <Typography variant="body1">
                    {motoboyDetails.email || "Não informado"}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    CPF:
                  </Typography>
                  <Typography variant="body1">
                    {motoboyDetails.cpf || "Não informado"}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Avaliação:
                  </Typography>
                  <Typography variant="body1">
                    ⭐ {motoboyDetails.score?.toFixed(1) || "Sem avaliação"}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Status / Cadastro:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    <Chip
                      label={
                        motoboyDetails.isAvailable
                          ? "Disponível"
                          : "Indisponível"
                      }
                      color={motoboyDetails.isAvailable ? "success" : "default"}
                      size="small"
                    />
                    <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                    <Chip
                      label={
                        motoboyDetails.isApproved ? "Aprovado" : "Pendente"
                      }
                      color={motoboyDetails.isApproved ? "success" : "warning"}
                      size="small"
                    />
                  </Box>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {motoboyDetails.race?.active && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Corrida Ativa:
                    </Typography>
                    <Typography variant="body1">
                      Sim - Pedido: {motoboyDetails.race.orderId}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Detalhes do Pedido */}
        {orderDetails && (
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: "flex", alignItems: "center" }}
            >
              <OrderIcon sx={{ mr: 1 }} color="primary" />
              Detalhes do Pedido
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Número do Pedido:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {orderDetails.orderNumber}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Status:
                  </Typography>
                  <Chip
                    label={orderDetails.status}
                    color={
                      orderDetails.status === "entregue"
                        ? "success"
                        : orderDetails.status === "cancelado"
                        ? "error"
                        : orderDetails.status === "em_entrega"
                        ? "info"
                        : "warning"
                    }
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Valor Total:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    R$ {orderDetails.total?.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Data do Pedido:
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(orderDetails.orderDate)}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {orderDetails.customer && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Cliente:
                    </Typography>
                    <Typography variant="body1">
                      {orderDetails.customer.name} -{" "}
                      {orderDetails.customer.phone}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {orderDetails.customer.customerAddress?.street},{" "}
                      {orderDetails.customer.customerAddress?.number}
                      {orderDetails.customer.customerAddress?.neighborhood &&
                        ` - ${orderDetails.customer.customerAddress.neighborhood}`}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {orderDetails.payment && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Forma de Pagamento:
                    </Typography>
                    <Typography variant="body1">
                      {orderDetails.payment.method}
                      {orderDetails.payment.needsChange &&
                        ` - Troco para R$ ${orderDetails.payment.changeFor}`}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {orderDetails.delivery?.distance && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Distância da Entrega:
                    </Typography>
                    <Typography variant="body1">
                      {orderDetails.delivery.distance.toFixed(2)} km
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {orderDetails.notes && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Observações:
                    </Typography>
                    <Typography variant="body1">
                      {orderDetails.notes}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Detalhes da Corrida/Travel */}
        {travelDetails && (
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: "flex", alignItems: "center" }}
            >
              <SendIcon sx={{ mr: 1 }} color="primary" />
              Detalhes da Corrida
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Preço da Corrida:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    R$ {travelDetails.price?.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Distância:
                  </Typography>
                  <Typography variant="body1">
                    {travelDetails.distance?.toFixed(2)} km
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Status:
                  </Typography>
                  <Chip
                    label={travelDetails.status || "Em andamento"}
                    color={
                      travelDetails.status === "COMPLETED"
                        ? "success"
                        : travelDetails.status === "CANCELLED"
                        ? "error"
                        : "info"
                    }
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Condições Especiais:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    {travelDetails.rain && (
                      <Chip
                        icon={<PlaceIcon />}
                        label="Chuva"
                        size="small"
                        color="info"
                      />
                    )}
                  </Box>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Início da Corrida:
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(travelDetails.createdAt)}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {travelDetails.arrival_store && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Chegada na Loja:
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(travelDetails.arrival_store)}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {travelDetails.arrival_customer && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Chegada no Cliente:
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(travelDetails.arrival_customer)}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Detalhes da Loja */}
        {storeDetails && (
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: "flex", alignItems: "center" }}
            >
              <StoreIcon sx={{ mr: 1 }} color="primary" />
              Detalhes do Estabelecimento
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Nome do Estabelecimento:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {storeDetails.businessName || storeDetails.displayName}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    CNPJ:
                  </Typography>
                  <Typography variant="body1">
                    {storeDetails.cnpj || "Não informado"}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Email:
                  </Typography>
                  <Typography variant="body1">{storeDetails.email}</Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Telefone:
                  </Typography>
                  <Typography variant="body1">
                    {storeDetails.phone || "Não informado"}
                  </Typography>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {storeDetails.address && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Endereço:
                    </Typography>
                    <Typography variant="body1">
                      {typeof storeDetails.address === "string"
                        ? storeDetails.address
                        : `${storeDetails.address.address || ""}, ${
                            storeDetails.address.addressNumber || ""
                          } - ${storeDetails.address.bairro || ""}, ${
                            storeDetails.address.cidade || ""
                          } - CEP: ${storeDetails.address.cep || ""}`}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Status:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    <Chip
                      label={storeDetails.isAvailable ? "Aberto" : "Fechado"}
                      color={storeDetails.isAvailable ? "success" : "default"}
                      size="small"
                    />
                    <Chip
                      label={
                        storeDetails.cnpj_approved
                          ? "CNPJ Aprovado"
                          : "CNPJ Pendente"
                      }
                      color={storeDetails.cnpj_approved ? "success" : "warning"}
                      size="small"
                    />
                  </Box>
                </Box>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
              {storeDetails.businessHours && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Horário de Funcionamento:
                    </Typography>
                    <Typography variant="body1">
                      {storeDetails.businessHours.open} -{" "}
                      {storeDetails.businessHours.close}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </Box>
    );
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Função para renderizar vista em tabela
  const renderTableView = () => (
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "primary.main" }}>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>
              Tipo
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>
              Descrição
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>
              Status
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>
              Data
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: "bold" }}>
              Pedido
            </TableCell>
            <TableCell
              sx={{ color: "white", fontWeight: "bold" }}
              align="center"
            >
              Ações
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredOccurrences.map((occurrence) => (
            <TableRow
              key={occurrence._id}
              hover
              sx={{ "&:hover": { bgcolor: "action.hover" } }}
            >
              <TableCell>{getTypeChip(occurrence.type)}</TableCell>
              <TableCell sx={{ maxWidth: 300 }}>
                <Typography
                  variant="body2"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {occurrence.description}
                </Typography>
              </TableCell>
              <TableCell>
                {getStatusChip(occurrence.status, occurrence)}
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(occurrence.date), "dd/MM/yyyy")}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {format(new Date(occurrence.date), "HH:mm")}
                </Typography>
              </TableCell>
              <TableCell>
                {occurrence.orderId ? (
                  <Chip
                    icon={<OrderIcon />}
                    label={`#${occurrence.orderId.slice(-6)}`}
                    size="small"
                    variant="outlined"
                  />
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    N/A
                  </Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                  <Tooltip title="Ver detalhes">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(occurrence)}
                      color="primary"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                  {occurrence.status === "ABERTO" && (
                    <>
                      <Tooltip title="Responder">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenResponseDialog(occurrence)}
                          color="success"
                        >
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Iniciar chat">
                        <IconButton
                          size="small"
                          onClick={() => handleStartChat(occurrence)}
                          color="info"
                        >
                          <ChatIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );

  // Função para renderizar vista em grid (existente)
  const renderGridView = () => (
    <Grid container spacing={2} display={"grid"} width={"400px"}>
      {filteredOccurrences.map((occurrence) => (
        <Grid item xs={12} sm={6} mb={2} md={4} key={occurrence._id}>
          <Card
            elevation={2}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              position: "relative",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 1,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, occurrence)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ mb: 1 }}>
                {getTypeChip(occurrence.type)}
                <Box
                  sx={{
                    mt: 1,
                    mb: 0.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    component="div"
                    fontWeight="bold"
                    noWrap
                    sx={{ maxWidth: "70%" }}
                  >
                    {TIPOS_OCORRENCIA[occurrence.type]?.label}
                  </Typography>
                  {getStatusChip(occurrence.status, occurrence)}
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {occurrence.description}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: 0.5,
                  mt: 3,
                }}
              >
                {occurrence.orderId && (
                  <Chip
                    icon={<OrderIcon />}
                    label={`Pedido #${occurrence.orderId}`}
                    size="small"
                    variant="outlined"
                  />
                )}
                <Chip
                  icon={<DateIcon />}
                  label={format(new Date(occurrence.date), "dd/MM/yyyy")}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </CardContent>

            <CardActions sx={{ justifyContent: "flex-end", p: 2, pt: 0 }}>
              <Button
                size="small"
                onClick={() => handleViewDetails(occurrence)}
              >
                Ver Detalhes
              </Button>
              {occurrence.status === "ABERTO" && (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => handleOpenResponseDialog(occurrence)}
                  startIcon={<SendIcon />}
                >
                  Responder
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: "bold", color: "primary.main" }}
        >
          Ocorrências
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Gerencie as ocorrências reportadas pelos usuários
        </Typography>
      </Box>
      {isMobile ? (
        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          variant="temporary"
          title="Gringo Delivery"
          logoUrl="https://i.imgur.com/8jOdfcO.png"
          logoAlt="Gringo Delivery"
          logoHeight={50}
          menuItems={SUPPORT_MENU_ITEMS}
          // Passa diretamente a função de logout
          footerItems={createSupportFooterItems(handleLogout)}
        />
      ) : (
        <SideDrawer
          open={true}
          variant="permanent"
          title="Gringo Delivery"
          logoUrl="https://i.imgur.com/8jOdfcO.png"
          logoAlt="Gringo Delivery"
          logoHeight={50}
          menuItems={SUPPORT_MENU_ITEMS}
          footerItems={createSupportFooterItems(handleLogout)}
        />
      )}

      {detailMode ? (
        renderOccurrenceDetails()
      ) : (
        <>
          {/* Filters and search */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant={isMobile ? "scrollable" : "standard"}
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                  >
                    <Tab
                      label={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography>Todas</Typography>
                        </Box>
                      }
                      value="all"
                    />
                    <Tab
                      label={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Badge
                            badgeContent={
                              occurrences.filter((o) => o.status === "ABERTO")
                                .length
                            }
                            color="error"
                            max={99}
                          >
                            <Typography>Abertas</Typography>
                          </Badge>
                        </Box>
                      }
                      value="aberto"
                    />
                    <Tab
                      label={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Badge
                            badgeContent={
                              occurrences.filter((o) => o.status === "PENDENTE")
                                .length
                            }
                            color="info"
                            max={99}
                          >
                            <Typography>Pendentes</Typography>
                          </Badge>
                        </Box>
                      }
                      value="pendente"
                    />
                    <Tab
                      label={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography>Fechadas</Typography>
                        </Box>
                      }
                      value="fechado"
                    />
                  </Tabs>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Buscar ocorrências..."
                  variant="outlined"
                  size="small"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={handleClearSearch}
                          edge="end"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Botão toggle para alternar visualização */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    size="small"
                    color="primary"
                  >
                    <ToggleButton
                      value="grid"
                      aria-label="visualização em grid"
                    >
                      <Tooltip title="Visualização em cartões">
                        <GridViewIcon /> {/* ou AppsIcon ou DashboardIcon */}
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton
                      value="table"
                      aria-label="visualização em tabela"
                    >
                      <Tooltip title="Visualização em tabela">
                        <TableChartIcon />{" "}
                        {/* ou ListViewIcon ou ViewListIcon */}
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Occurrences list */}
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "400px",
              }}
            >
              <CircularProgress />
            </Box>
          ) : filteredOccurrences.length === 0 ? (
            <Paper
              elevation={2}
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: 2,
                bgcolor: "#f8f9fa",
              }}
            >
              <ErrorOutlineIcon
                sx={{ fontSize: 60, color: "#bdbdbd", mb: 2 }}
              />
              <Typography variant="h6" color="textSecondary">
                Nenhuma ocorrência encontrada
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Tente ajustar os filtros ou realizar uma nova busca
              </Typography>
            </Paper>
          ) : // Renderizar baseado no modo de visualização selecionado
          viewMode === "grid" ? (
            renderGridView()
          ) : (
            renderTableView()
          )}
        </>
      )}

      {/* Response dialog */}
      <Dialog
        open={responseDialogOpen}
        onClose={handleCloseResponseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SendIcon sx={{ mr: 1 }} color="primary" />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Responder Ocorrência
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleCloseResponseDialog}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Ocorrência:
            </Typography>
            <Typography variant="body1" gutterBottom fontWeight="medium">
              {TIPOS_OCORRENCIA[selectedOccurrence?.type]?.label}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, whiteSpace: "pre-wrap" }}
            >
              {selectedOccurrence?.description}
            </Typography>
          </Box>

          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Sua resposta:
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={5}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Digite sua resposta aqui..."
            fullWidth
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    color="primary"
                    onClick={() => setResponseText("")}
                    edge="end"
                    disabled={!responseText}
                  >
                    <CloseIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={() => {
                handleCloseResponseDialog();
                handleStartChat(selectedOccurrence);
              }}
            >
              Iniciar Chat
            </Button>
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ alignSelf: "flex-end" }}
            >
              {responseText.length} caracteres
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResponseDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitResponse}
            variant="contained"
            disabled={!responseText.trim() || submitting}
            startIcon={
              submitting ? <CircularProgress size={20} /> : <SendIcon />
            }
          >
            {submitting ? "Enviando..." : "Enviar Resposta"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu for card options */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewDetails(selectedOccurrence)}>
          Ver Detalhes
        </MenuItem>
        {selectedOccurrence?.status === "ABERTO" && (
          <>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                handleOpenResponseDialog(selectedOccurrence);
              }}
            >
              Responder
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                handleStartChat(selectedOccurrence);
              }}
            >
              Iniciar Chat
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* Status change menu */}
      <Menu
        anchorEl={statusMenuAnchorEl}
        open={Boolean(statusMenuAnchorEl)}
        onClose={handleStatusMenuClose}
      >
        <MenuItem
          onClick={() => handleStatusChange("ABERTO")}
          disabled={
            selectedOccurrence?.status === "ABERTO" || statusUpdateLoading
          }
          sx={{
            color: theme.palette.warning.main,
            fontWeight:
              selectedOccurrence?.status === "ABERTO" ? "bold" : "normal",
          }}
        >
          <AccessTimeIcon sx={{ mr: 1, fontSize: 20 }} />
          Aberto
        </MenuItem>
        <MenuItem
          onClick={() => handleStatusChange("PENDENTE")}
          disabled={
            selectedOccurrence?.status === "PENDENTE" || statusUpdateLoading
          }
          sx={{
            color: theme.palette.info.main,
            fontWeight:
              selectedOccurrence?.status === "PENDENTE" ? "bold" : "normal",
          }}
        >
          <ErrorOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
          Pendente
        </MenuItem>
        <MenuItem
          onClick={() => handleStatusChange("FECHADO")}
          disabled={
            selectedOccurrence?.status === "FECHADO" || statusUpdateLoading
          }
          sx={{
            color: theme.palette.success.main,
            fontWeight:
              selectedOccurrence?.status === "FECHADO" ? "bold" : "normal",
          }}
        >
          <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
          Fechado
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Occurrences;
