import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  InputAdornment,
  Stack,
  LinearProgress,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Receipt as OrdersIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Gavel as NegotiationIcon,
  Warning as WarningIcon,
  Check as AcceptIcon,
  Cancel as RejectIcon,
  SwapHoriz as AlternativeIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  ImageIcon,
  DescriptionIcon,
  PersonIcon,
  StoreIcon,
  LocalShipping as LocalShippingIcon,
  CalendarToday as CalendarTodayIcon,
  History as HistoryIcon,
  NotificationImportant as NotificationImportantIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Autorenew as AutorenewIcon,
  PriorityHigh as PriorityHighIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
  ReportProblem as OcorrenciasIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useAuth } from "../../../contexts/AuthContext";
import { UseStoreAuth } from "../../../contexts/StoreAuthContext";
import api from "../../../services/api";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import "./HandshakeNegotiation.css";
import DisputeNotifications from "./components/DisputeNotifications";
import useHandshakeNegotiation from "./hooks/useHandshakeNegotiation";
import {
  STORE_MENU_ITEMS,
  createSupportFooterItems,
} from "../../../config/menuConfig";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";

// Cores do tema
const colors = {
  primary: "#EB2E3E",
  secondary: "#FBBF24",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  background: "#F5F5F5",
  white: "#FFFFFF",
  text: "#333333",
  subtext: "#666666",
};

// Componente principal
const HandshakeNegotiation = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const { storeData } = UseStoreAuth();

  // Hook personalizado para gerenciar negociações
  const {
    loading,
    pendingDisputes,
    historyData,
    error,
    statistics,
    lastUpdate,
    loadDisputeDetails,
    acceptDispute,
    rejectDispute,
    proposeAlternative,
    refreshAll,
    clearError,
  } = useHandshakeNegotiation();

  // Estados para UI
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Estados para dialogs
  const [disputeDetailsOpen, setDisputeDetailsOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseType, setResponseType] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [alternativeData, setAlternativeData] = useState({
    type: "PARTIAL_REFUND",
    description: "",
    amount: { value: "", currency: "BRL" },
  });

  // Estados para filtros e paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [submitting, setSubmitting] = useState(false);

  // Carregar dados iniciais - removido pois agora é feito pelo hook
  // useEffect(() => {
  //   loadInitialData();
  //   // Configurar refresh automático a cada 30 segundos para disputes pendentes
  //   const interval = setInterval(() => {
  //     if (tabValue === 0) loadPendingDisputes();
  //   }, 30000);
  //   return () => clearInterval(interval);
  // }, [tabValue]);

  // Mostrar erro do hook como snackbar
  useEffect(() => {
    if (error) {
      showSnackbar(error, "error");
      clearError();
    }
  }, [error, clearError]);

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDisputeClick = async (dispute) => {
    try {
      const disputeDetails = await loadDisputeDetails(dispute.disputeId);
      setSelectedDispute(disputeDetails);
      setDisputeDetailsOpen(true);
    } catch (error) {
      console.error("Erro ao carregar detalhes da disputa:", error);
      showSnackbar("Erro ao carregar detalhes da disputa", "error");
    }
  };

  const handleResponseAction = (type) => {
    setResponseType(type);
    setResponseDialogOpen(true);
    setDisputeDetailsOpen(false);
  };

  const submitResponse = async () => {
    if (!selectedDispute) return;

    setSubmitting(true);
    try {
      const disputeId = selectedDispute.disputeId;

      switch (responseType) {
        case "ACCEPT":
          await acceptDispute(disputeId);
          break;
        case "REJECT":
          if (!rejectReason.trim()) {
            showSnackbar("Motivo da rejeição é obrigatório", "error");
            return;
          }
          await rejectDispute(disputeId, rejectReason);
          break;
        case "ALTERNATIVE":
          if (
            !alternativeData.description.trim() ||
            !alternativeData.amount.value
          ) {
            showSnackbar("Preencha todos os campos da contraproposta", "error");
            return;
          }
          await proposeAlternative(disputeId, alternativeData);
          break;
        default:
          return;
      }

      showSnackbar("Resposta enviada com sucesso!", "success");
      setResponseDialogOpen(false);
      setSelectedDispute(null);
      setRejectReason("");
      setAlternativeData({
        type: "PARTIAL_REFUND",
        description: "",
        amount: { value: "", currency: "BRL" },
      });
    } catch (error) {
      console.error("Erro ao enviar resposta:", error);
      // O erro será mostrado pelo hook através do useEffect
    } finally {
      setSubmitting(false);
    }
  };

  // Função para logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Componente para exibir status da disputa
  const DisputeStatusChip = ({ status, timeRemaining }) => {
    const getStatusConfig = (status, timeRemaining) => {
      switch (status) {
        case "PENDING":
          if (timeRemaining <= 15) {
            return {
              label: "CRÍTICO",
              color: "error",
              icon: <PriorityHighIcon />,
            };
          } else if (timeRemaining <= 60) {
            return {
              label: "URGENTE",
              color: "warning",
              icon: <WarningIcon />,
            };
          }
          return { label: "PENDENTE", color: "info", icon: <ScheduleIcon /> };
        case "ACCEPTED":
          return { label: "ACEITO", color: "success", icon: <AcceptIcon /> };
        case "REJECTED":
          return { label: "REJEITADO", color: "error", icon: <RejectIcon /> };
        case "COUNTER_PROPOSED":
          return {
            label: "CONTRAPROPOSTA",
            color: "warning",
            icon: <AlternativeIcon />,
          };
        case "SETTLED":
          return {
            label: "FINALIZADO",
            color: "success",
            icon: <AcceptIcon />,
          };
        case "EXPIRED":
          return { label: "EXPIRADO", color: "error", icon: <TimeIcon /> };
        default:
          return { label: status, color: "default", icon: <InfoIcon /> };
      }
    };

    const config = getStatusConfig(status, timeRemaining);

    return (
      <Chip
        label={config.label}
        color={config.color}
        icon={config.icon}
        size="small"
        sx={{ fontWeight: "bold" }}
      />
    );
  };

  // Componente para exibir tipo de disputa
  const DisputeTypeChip = ({ type }) => {
    const getTypeConfig = (type) => {
      switch (type) {
        case "QUALITY":
          return { label: "Qualidade", color: "#FF5722", icon: "🍕" };
        case "MISSING_ITEMS":
          return { label: "Itens Faltantes", color: "#FF9800", icon: "📦" };
        case "WRONG_ITEMS":
          return { label: "Itens Errados", color: "#F44336", icon: "❌" };
        case "DELAY":
          return { label: "Atraso", color: "#9C27B0", icon: "⏰" };
        case "OTHER":
          return { label: "Outros", color: "#607D8B", icon: "❓" };
        default:
          return { label: type, color: "#757575", icon: "📝" };
      }
    };

    const config = getTypeConfig(type);

    return (
      <Chip
        label={`${config.icon} ${config.label}`}
        sx={{
          bgcolor: config.color,
          color: "white",
          fontWeight: "bold",
        }}
        size="small"
      />
    );
  };

  // Renderizar tabela de disputes pendentes
  const renderPendingDisputes = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!pendingDisputes.length) {
      return (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <NegotiationIcon
            sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhuma disputa pendente
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Todas as negociações estão em dia! 🎉
          </Typography>
        </Paper>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: colors.primary }}>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Pedido
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Tipo
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Status
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Tempo Restante
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Recebido
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingDisputes.map((dispute) => (
              <TableRow
                key={dispute.disputeId}
                sx={{
                  "&:hover": { bgcolor: "action.hover" },
                  bgcolor: dispute.isCritical
                    ? "#ffebee"
                    : dispute.isUrgent
                    ? "#fff3e0"
                    : "inherit",
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {dispute.orderId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <DisputeTypeChip type={dispute.disputeType} />
                </TableCell>
                <TableCell>
                  <DisputeStatusChip
                    status={dispute.status}
                    timeRemaining={dispute.timeRemainingMinutes}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TimeIcon
                      fontSize="small"
                      color={
                        dispute.isCritical
                          ? "error"
                          : dispute.isUrgent
                          ? "warning"
                          : "action"
                      }
                    />
                    <Typography
                      variant="body2"
                      color={
                        dispute.isCritical
                          ? "error"
                          : dispute.isUrgent
                          ? "warning"
                          : "text.primary"
                      }
                      fontWeight={
                        dispute.isCritical || dispute.isUrgent
                          ? "bold"
                          : "normal"
                      }
                    >
                      {dispute.timeRemainingMinutes}min
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDistanceToNow(new Date(dispute.receivedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    startIcon={<ViewIcon />}
                    onClick={() => handleDisputeClick(dispute)}
                    size="small"
                    sx={{ bgcolor: colors.primary }}
                  >
                    Ver Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Renderizar cards de resumo
  const renderSummaryCards = () => {
    const { summary } = historyData;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: colors.info, color: "white" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.total}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Disputes Pendentes
                  </Typography>
                </Box>
                <NegotiationIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: colors.error, color: "white" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.critical}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Críticas (≤15min)
                  </Typography>
                </Box>
                <PriorityHighIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: colors.warning, color: "white" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.urgent}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Urgentes (≤60min)
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: colors.success, color: "white" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.disputes?.resolutionRate || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Taxa de Resolução
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box
      sx={{ display: "flex", minHeight: "100vh", bgcolor: colors.background }}
    >
      {/* Notificações de disputes críticas */}
      <DisputeNotifications
        disputes={pendingDisputes}
        onViewDispute={handleDisputeClick}
        onDismiss={(disputeId) => {
          // Optional: implementar lógica de dismiss se necessário
          console.log("Dispute notification dismissed:", disputeId);
        }}
      />

      {/* Drawer para mobile */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          variant="temporary"
          anchor="left"
          width={280}
          menuItems={STORE_MENU_ITEMS}
          footerItems={createSupportFooterItems(handleLogout)}
        />
      </Box>

      {/* Sidebar para desktop */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <SideDrawer
          open={true}
          variant="permanent"
          width={280}
          menuItems={STORE_MENU_ITEMS}
          footerItems={createSupportFooterItems(handleLogout)}
        />
      </Box>

      {/* Conteúdo principal */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* AppBar para mobile */}
        <AppBar
          position="sticky"
          sx={{
            display: { xs: "block", md: "none" },
            bgcolor: colors.primary,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Negociações iFood
            </Typography>
            <IconButton color="inherit" onClick={refreshAll}>
              <RefreshIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Conteúdo */}
        <Container maxWidth="xl" sx={{ py: 3, flexGrow: 1 }}>
          {/* Header para desktop */}
          <Box sx={{ display: { xs: "none", md: "block" }, mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h4" fontWeight="bold" color={colors.text}>
                  Negociações iFood
                </Typography>
                <Typography variant="body1" color={colors.subtext}>
                  Gerencie suas disputas e negociações da plataforma iFood
                </Typography>
                {loading && (
                  <Typography variant="caption" color={colors.warning}>
                    🔄 Carregando dados...
                  </Typography>
                )}
                {!loading && (
                  <Typography variant="caption" color={colors.success}>
                    ✅ Última atualização: {format(lastUpdate, "HH:mm:ss")}
                  </Typography>
                )}
              </Box>
              <Button
                variant="contained"
                startIcon={
                  loading ? <CircularProgress size={16} /> : <RefreshIcon />
                }
                onClick={refreshAll}
                disabled={loading}
                sx={{ bgcolor: colors.primary }}
              >
                {loading ? "Atualizando..." : "Atualizar"}
              </Button>
            </Box>
          </Box>

          {/* Cards de resumo */}
          {renderSummaryCards()}

          {/* Abas principais */}
          <Paper sx={{ mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{
                "& .MuiTab-root": { fontWeight: "bold" },
                "& .Mui-selected": { color: colors.primary },
                "& .MuiTabs-indicator": { bgcolor: colors.primary },
              }}
            >
              <Tab
                label={
                  <Badge badgeContent={pendingDisputes.length} color="error">
                    Disputes Pendentes
                  </Badge>
                }
                icon={<NotificationImportantIcon />}
              />
              <Tab label="Histórico" icon={<HistoryIcon />} />
              <Tab label="Relatórios" icon={<ReportIcon />} />
            </Tabs>
          </Paper>

          {/* Conteúdo das abas */}
          {tabValue === 0 && (
            <Box>
              {pendingDisputes.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Atenção!</strong> Você tem {pendingDisputes.length}{" "}
                  dispute(s) pendente(s) que requerem sua atenção. Respostas são
                  obrigatórias dentro do prazo.
                </Alert>
              )}
              {renderPendingDisputes()}
            </Box>
          )}

          {tabValue === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Histórico de Negociações
              </Typography>
              {/* Implementar tabela de histórico aqui */}
              <Typography variant="body2" color="text.secondary">
                Em desenvolvimento...
              </Typography>
            </Paper>
          )}

          {tabValue === 2 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Relatórios e Estatísticas
              </Typography>
              {/* Implementar gráficos e relatórios aqui */}
              <Typography variant="body2" color="text.secondary">
                Em desenvolvimento...
              </Typography>
            </Paper>
          )}
        </Container>
      </Box>

      {/* Dialog de detalhes da disputa */}
      <Dialog
        open={disputeDetailsOpen}
        onClose={() => setDisputeDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ bgcolor: colors.primary, color: "white" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Detalhes da Disputa
            </Typography>
            <IconButton
              onClick={() => setDisputeDetailsOpen(false)}
              sx={{ color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {selectedDispute && (
            <Box sx={{ p: 3 }}>
              {/* Informações básicas */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        color={colors.primary}
                      >
                        Informações da Disputa
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            ID do Pedido:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {selectedDispute.orderId}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Tipo:
                          </Typography>
                          <DisputeTypeChip type={selectedDispute.disputeType} />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Status:
                          </Typography>
                          <DisputeStatusChip
                            status={selectedDispute.status}
                            timeRemaining={selectedDispute.timeRemainingMinutes}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Tempo Restante:
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={
                              selectedDispute.timeRemainingMinutes <= 15
                                ? "error"
                                : selectedDispute.timeRemainingMinutes <= 60
                                ? "warning"
                                : "text.primary"
                            }
                          >
                            {selectedDispute.timeRemainingMinutes} minutos
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        color={colors.primary}
                      >
                        Progresso do Tempo
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(
                            0,
                            Math.min(
                              100,
                              (selectedDispute.timeRemainingMinutes / 1440) *
                                100
                            )
                          )}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "grey.200",
                            "& .MuiLinearProgress-bar": {
                              bgcolor:
                                selectedDispute.timeRemainingMinutes <= 15
                                  ? colors.error
                                  : selectedDispute.timeRemainingMinutes <= 60
                                  ? colors.warning
                                  : colors.success,
                            },
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Expira em:{" "}
                        {format(
                          new Date(selectedDispute.expiresAt),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Descrição da disputa */}
              <Card variant="outlined" sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color={colors.primary}>
                    Descrição da Disputa
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedDispute.description}
                  </Typography>
                  {selectedDispute.customerComplaint && (
                    <>
                      <Typography
                        variant="subtitle2"
                        color={colors.primary}
                        gutterBottom
                      >
                        Reclamação do Cliente:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedDispute.customerComplaint}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Itens em disputa */}
              {selectedDispute.disputedItems &&
                selectedDispute.disputedItems.length > 0 && (
                  <Card variant="outlined" sx={{ mt: 3 }}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        color={colors.primary}
                      >
                        Itens em Disputa
                      </Typography>
                      {selectedDispute.disputedItems.map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            py: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {item.quantity}x {item.name}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            R$ {item.price.value.toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}

              {/* Alternativas disponíveis */}
              {selectedDispute.availableAlternatives &&
                selectedDispute.availableAlternatives.length > 0 && (
                  <Card variant="outlined" sx={{ mt: 3 }}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        color={colors.primary}
                      >
                        Alternativas Sugeridas
                      </Typography>
                      {selectedDispute.availableAlternatives.map(
                        (alt, index) => (
                          <Chip
                            key={index}
                            label={alt.description || alt.type}
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )
                      )}
                    </CardContent>
                  </Card>
                )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: "grey.50" }}>
          {selectedDispute?.canRespond && (
            <>
              <Button
                onClick={() => handleResponseAction("ACCEPT")}
                variant="contained"
                startIcon={<AcceptIcon />}
                sx={{ bgcolor: colors.success }}
              >
                Aceitar
              </Button>
              <Button
                onClick={() => handleResponseAction("REJECT")}
                variant="contained"
                startIcon={<RejectIcon />}
                sx={{ bgcolor: colors.error }}
              >
                Rejeitar
              </Button>
              <Button
                onClick={() => handleResponseAction("ALTERNATIVE")}
                variant="contained"
                startIcon={<AlternativeIcon />}
                sx={{ bgcolor: colors.warning }}
              >
                Contraproposta
              </Button>
            </>
          )}
          <Button onClick={() => setDisputeDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de resposta */}
      <Dialog
        open={responseDialogOpen}
        onClose={() => setResponseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: colors.primary, color: "white" }}>
          <Typography variant="h6" fontWeight="bold">
            {responseType === "ACCEPT" && "Aceitar Disputa"}
            {responseType === "REJECT" && "Rejeitar Disputa"}
            {responseType === "ALTERNATIVE" && "Fazer Contraproposta"}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {responseType === "ACCEPT" && (
            <Alert severity="info">
              Ao aceitar esta disputa, você concorda com a reclamação do cliente
              e aceita as consequências financeiras e/ou operacionais.
            </Alert>
          )}

          {responseType === "REJECT" && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Ao rejeitar esta disputa, você está contestando a reclamação. É
                necessário fornecer um motivo detalhado.
              </Alert>
              <TextField
                label="Motivo da Rejeição"
                multiline
                rows={4}
                fullWidth
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explique detalhadamente por que você está rejeitando esta disputa..."
                required
              />
            </Box>
          )}

          {responseType === "ALTERNATIVE" && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Você pode fazer uma contraproposta para resolver a disputa de
                forma alternativa.
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Tipo de Alternativa</InputLabel>
                <Select
                  value={alternativeData.type}
                  onChange={(e) =>
                    setAlternativeData({
                      ...alternativeData,
                      type: e.target.value,
                    })
                  }
                >
                  <MenuItem value="PARTIAL_REFUND">Reembolso Parcial</MenuItem>
                  <MenuItem value="REFUND">Reembolso Total</MenuItem>
                  <MenuItem value="REPLACEMENT">Substituição</MenuItem>
                  <MenuItem value="VOUCHER">Voucher/Desconto</MenuItem>
                  <MenuItem value="CUSTOM">Solução Personalizada</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Descrição da Proposta"
                multiline
                rows={3}
                fullWidth
                value={alternativeData.description}
                onChange={(e) =>
                  setAlternativeData({
                    ...alternativeData,
                    description: e.target.value,
                  })
                }
                placeholder="Descreva sua proposta alternativa..."
                sx={{ mb: 2 }}
                required
              />

              <TextField
                label="Valor (R$)"
                type="number"
                fullWidth
                value={alternativeData.amount.value}
                onChange={(e) =>
                  setAlternativeData({
                    ...alternativeData,
                    amount: {
                      ...alternativeData.amount,
                      value: e.target.value,
                    },
                  })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">R$</InputAdornment>
                  ),
                }}
                placeholder="0,00"
                required
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setResponseDialogOpen(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={submitResponse}
            variant="contained"
            disabled={submitting}
            sx={{
              bgcolor:
                responseType === "ACCEPT"
                  ? colors.success
                  : responseType === "REJECT"
                  ? colors.error
                  : colors.warning,
            }}
          >
            {submitting ? <CircularProgress size={20} /> : "Enviar Resposta"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HandshakeNegotiation;
