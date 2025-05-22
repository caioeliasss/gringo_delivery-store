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
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";

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
};

const Occurrences = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { currentUser } = useAuth();

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

  // Fetch occurrences on component mount
  useEffect(() => {
    fetchOccurrences();
  }, []);

  useEffect(() => {
    if (occurrences.length > 0) {
      filterOccurrences();
    }
  }, [tabValue, searchQuery, occurrences]);

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

  const handleStartChat = (occurrence) => {
    // Navigate to chat page with the occurrence ID
    navigate(`/suporte/chat`, {
      state: {
        occurrenceId: occurrence._id,
        motoboyId: occurrence.motoboyId,
        storeId: occurrence.storeId,
        customerId: occurrence.customerId,
      },
    });
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

  // Renderiza o modo de detalhes de uma ocorrência
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
      </Box>
    );
  };

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

      {detailMode ? (
        renderOccurrenceDetails()
      ) : (
        <>
          {/* Filters and search */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
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
              <Grid item xs={12} md={5}>
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
          ) : (
            <Grid container spacing={2}>
              {filteredOccurrences.map((occurrence) => (
                <Grid item xs={12} sm={6} md={4} key={occurrence._id}>
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
                          gap: 0.5,
                          mt: 1,
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
                          label={format(
                            new Date(occurrence.date),
                            "dd/MM/yyyy"
                          )}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>

                    <CardActions
                      sx={{ justifyContent: "flex-end", p: 2, pt: 0 }}
                    >
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
