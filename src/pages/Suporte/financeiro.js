import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
  Badge,
  Pagination,
  CircularProgress,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Store as StoreIcon,
  TwoWheeler as MotoboyIcon,
  Receipt as BillingIcon,
  AccountBalance as WithdrawalIcon,
  Visibility as ViewIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Menu as MenuIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useSuporteAuth } from "../../contexts/SuporteAuthContext";
import { adminService } from "../../services/adminService";
import api from "../../services/api";
import { addDays, format as formatDateFns } from "date-fns";
import { ptBR } from "date-fns/locale";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import {
  SUPPORT_MENU_ITEMS,
  createAdminFooterItems,
  getFilteredSupportMenuItems,
} from "../../config/menuConfig";

const SuporteFinanceiro = () => {
  const { AdminUser, logoutAdmin, loading: authLoading } = useSuporteAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { supportUser } = useSuporteAuth();
  const navigate = useNavigate();

  // Estados principais - DEVEM ESTAR ANTES DOS RETURNS CONDICIONAIS
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Estados de dados
  const [withdrawals, setWithdrawals] = useState([]);
  const [billings, setBillings] = useState([]);
  const [allStores, setAllStores] = useState([]);
  const [allMotoboys, setAllMotoboys] = useState([]);
  const [financialStats, setFinancialStats] = useState({
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalBillings: 0,
    pendingBillings: 0,
    monthlyRevenue: 0,
    monthlyWithdrawals: 0,
  });

  // Estados de paginação
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [billingsPage, setBillingsPage] = useState(1);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [billingsTotal, setBillingsTotal] = useState(0);

  // Estados de filtros
  const [withdrawalFilter, setWithdrawalFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Estados de modais
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processWithdrawalOpen, setProcessWithdrawalOpen] = useState(false);
  const [deleteBillingOpen, setDeleteBillingOpen] = useState(false);
  const [deletingBilling, setDeletingBilling] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  // ✅ NOVOS ESTADOS: Modal de alterar status do billing
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");

  // Estados de erro/sucesso
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    type: "info",
  });

  // Estados do modal de nova cobrança
  const [createBillingOpen, setCreateBillingOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [newBilling, setNewBilling] = useState({
    storeId: "",
    firebaseUid: "",
    customerId: "",
    amount: "",
    additionalFee: 1.89,
    dueDate: formatDateFns(addDays(new Date(), 7), "yyyy-MM-dd"),
    description: "",
    paymentMethod: "BOLETO",
    type: "SUBSCRIPTION",
  });
  const [creatingBilling, setCreatingBilling] = useState(false);

  // Função para verificar se tem permissão de finance
  const hasFinancePermission = useCallback(() => {
    if (!supportUser?.role) return false;

    // Verificar se é array de roles ou string única
    const roles = Array.isArray(supportUser.role)
      ? supportUser.role
      : [supportUser.role];

    return roles.includes("admin") || roles.includes("finances");
  });

  // Verificar permissões de acesso
  useEffect(() => {
    if (supportUser && !authLoading && !hasFinancePermission()) {
      console.log(
        "❌ Usuário sem permissão para acessar financeiro:",
        supportUser
      );
      console.log("🔄 Tentando navegar para dashboard...");

      // Usar setTimeout para garantir que a navegação aconteça após o render
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    }
  }, [supportUser, authLoading, navigate, hasFinancePermission]);

  // Buscar lojas para o select quando abrir modal
  useEffect(() => {
    if (createBillingOpen && stores.length === 0) {
      api
        .get("/stores")
        .then((res) => setStores(res.data))
        .catch(() => setStores([]));
    }
  }, [createBillingOpen, stores.length]);

  // Função para buscar dados financeiros
  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Preparar filtros para withdrawals
      const withdrawalFilters = {
        page: withdrawalsPage,
        limit: 10,
        status: withdrawalFilter === "all" ? undefined : withdrawalFilter,
      };

      // Adicionar filtro por motoboy se selecionado
      if (activeTab === 0 && storeFilter !== "all") {
        withdrawalFilters.motoboyId = storeFilter; // Reutilizando storeFilter para motoboy na aba de saques
      }

      // Preparar filtros para billings
      const billingFilters = {
        page: billingsPage,
        limit: 10,
        status: billingFilter === "all" ? undefined : billingFilter,
      };

      // Adicionar filtro por loja se selecionado
      if (activeTab === 1 && storeFilter !== "all") {
        billingFilters.storeId = storeFilter;
      }

      console.log("🔍 DEBUG Frontend - Filtros sendo enviados:", {
        activeTab,
        storeFilter,
        withdrawalFilters,
        billingFilters,
      });

      // Buscar dados em paralelo
      const [statsData, withdrawalsData, billingsData] = await Promise.all([
        adminService.getFinancialStats(),
        adminService.getWithdrawals(withdrawalFilters),
        adminService.getBillings(billingFilters),
      ]);

      console.log("🔍 DEBUG Frontend - Dados retornados:", {
        statsData,
        withdrawalsData: {
          total: withdrawalsData.total,
          count: withdrawalsData.withdrawals?.length,
        },
        billingsData: {
          total: billingsData.total,
          count: billingsData.billings?.length,
        },
      });

      setFinancialStats(statsData);
      setWithdrawals(withdrawalsData.withdrawals || []);
      setWithdrawalsTotal(withdrawalsData.total || 0);
      setBillings(billingsData.billings || []);
      setBillingsTotal(billingsData.total || 0);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
      showAlert("Erro ao carregar dados financeiros", "error");
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    fetchFinancialData();
  }, [
    withdrawalsPage,
    billingsPage,
    withdrawalFilter,
    billingFilter,
    storeFilter,
    statusFilter,
    activeTab, // ✅ ADICIONAR: Recarregar quando trocar de aba
  ]);

  // Carregar lojas e motoboys únicos ao inicializar
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // Buscar lojas
        const storesResponse = await api.get("/stores");
        setAllStores(storesResponse.data || []);

        // Buscar motoboys únicos dos saques
        const withdrawalsResponse = await adminService.getWithdrawals({
          page: 1,
          limit: 1000, // Buscar muitos para extrair motoboys únicos
        });

        // Extrair motoboys únicos
        const uniqueMotoboys = [];
        const motoboyMap = new Map();

        (withdrawalsResponse.withdrawals || []).forEach((withdrawal) => {
          if (withdrawal.motoboyId && !motoboyMap.has(withdrawal.motoboyId)) {
            motoboyMap.set(withdrawal.motoboyId, {
              id: withdrawal.motoboyId,
              name: withdrawal.motoboyName || "Motoboy Desconhecido",
            });
            uniqueMotoboys.push({
              id: withdrawal.motoboyId,
              name: withdrawal.motoboyName || "Motoboy Desconhecido",
            });
          }
        });

        setAllMotoboys(uniqueMotoboys);
      } catch (error) {
        console.error("Erro ao carregar opções de filtro:", error);
      }
    };

    loadFilterOptions();
  }, []);

  // Tela de loading enquanto verifica auth
  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Verificando permissões...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Se não tem permissão, não renderizar nada (será redirecionado)
  if (supportUser && !hasFinancePermission()) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          p: 3,
        }}
      >
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            maxWidth: 400,
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Acesso Restrito
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Você não tem permissão para acessar a página financeira.
            <br />
            Apenas usuários com role "admin" ou "finances" podem acessar.
            <br />
            <small>
              Suas roles:{" "}
              {Array.isArray(supportUser?.role)
                ? supportUser.role.join(", ")
                : supportUser?.role || "nenhuma"}
            </small>
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/dashboard")}
          >
            Voltar ao Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  // Configuração do menu
  const menuItems = getFilteredSupportMenuItems(supportUser);

  const showAlert = (message, type = "info") => {
    setAlert({ open: true, message, type });
    setTimeout(
      () => setAlert({ open: false, message: "", type: "info" }),
      5000
    );
  };

  // Função para criar cobrança
  const handleCreateBilling = async () => {
    if (!newBilling.storeId || !newBilling.amount || !newBilling.dueDate) {
      showAlert("Preencha todos os campos obrigatórios", "warning");
      return;
    }
    if (!newBilling.firebaseUid) {
      showAlert(
        "Loja selecionada sem firebaseUid. Recarregue a lista de lojas.",
        "error"
      );
      return;
    }
    setCreatingBilling(true);
    try {
      // Calcular valor total (valor base + acréscimo)
      const totalAmount =
        Number(newBilling.amount) + Number(newBilling.additionalFee || 0);

      await api.post("/billing", {
        ...newBilling,
        amount: totalAmount,
        dueDate: newBilling.dueDate,
        paymentMethod: newBilling.paymentMethod,
        type: newBilling.type,
        firebaseUid: newBilling.firebaseUid,
        customerId: newBilling.customerId,
      });
      showAlert("Cobrança criada com sucesso!", "success");
      setCreateBillingOpen(false);
      setNewBilling({
        storeId: "",
        firebaseUid: "",
        customerId: "",
        amount: "",
        additionalFee: 0,
        dueDate: formatDateFns(addDays(new Date(), 7), "yyyy-MM-dd"),
        description: "",
        paymentMethod: "BOLETO",
        type: "SUBSCRIPTION",
      });
      fetchFinancialData();
    } catch (err) {
      showAlert("Erro ao criar cobrança", "error");
    } finally {
      setCreatingBilling(false);
    }
  };

  // Função para excluir cobrança
  const handleDeleteBilling = async () => {
    if (!selectedBilling) return;

    // Verificar se digitou "EXCLUIR" corretamente
    if (deleteConfirmText !== "EXCLUIR") {
      showAlert("Digite EXCLUIR para confirmar a exclusão", "warning");
      return;
    }

    setDeletingBilling(true);
    try {
      await api.delete(`/billing/${selectedBilling._id}`);
      showAlert("Cobrança excluída com sucesso!", "success");
      setDeleteBillingOpen(false);
      setSelectedBilling(null);
      setDeleteConfirmText("");
      fetchFinancialData();
    } catch (error) {
      console.error("Erro ao excluir cobrança:", error);
      showAlert(
        error.response?.data?.message || "Erro ao excluir cobrança",
        "error"
      );
    } finally {
      setDeletingBilling(false);
    }
  };

  // ✅ NOVA FUNÇÃO: Alterar status do billing
  const handleUpdateBillingStatus = async () => {
    if (!selectedBilling || !newStatus) {
      showAlert("Selecione um status válido", "warning");
      return;
    }

    // Verificar se o status é diferente do atual
    if (newStatus === selectedBilling.status) {
      showAlert("O status selecionado é igual ao atual", "warning");
      return;
    }

    setUpdatingStatus(true);
    try {
      const response = await adminService.updateBillingStatus(
        selectedBilling._id,
        newStatus,
        statusReason
      );

      showAlert(
        `Status da fatura alterado para ${newStatus} com sucesso!`,
        "success"
      );

      setUpdateStatusOpen(false);
      setSelectedBilling(null);
      setNewStatus("");
      setStatusReason("");
      fetchFinancialData(); // Recarregar dados

      console.log("✅ Status atualizado:", response);
    } catch (error) {
      console.error("Erro ao alterar status da fatura:", error);
      showAlert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro ao alterar status da fatura",
        "error"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleProcessWithdrawal = async (withdrawalId, action) => {
    try {
      setLoading(true);

      if (action === "approve") {
        await adminService.processWithdrawal(withdrawalId);
        showAlert("Saque processado com sucesso", "success");
      } else if (action === "reject") {
        await adminService.rejectWithdrawal(withdrawalId);
        showAlert("Saque rejeitado", "warning");
      }

      fetchFinancialData();
      setProcessWithdrawalOpen(false);
    } catch (error) {
      console.error("Erro ao processar saque:", error);
      showAlert("Erro ao processar saque", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Data inválida";

    try {
      // Criar um objeto Date e ajustar para o fuso horário brasileiro (UTC-3)
      const utcDate = new Date(date);

      // Verificar se a data é válida
      if (isNaN(utcDate.getTime())) {
        return "Data inválida";
      }

      // Ajustar para UTC-3 (fuso horário de Brasília)
      // Se a data vier em UTC, subtraímos 3 horas para obter o horário local
      const brasiliaOffset = -3 * 60; // -3 horas em minutos
      const localOffset = utcDate.getTimezoneOffset(); // offset local em minutos
      const brasiliaTime = new Date(
        utcDate.getTime() + (localOffset - brasiliaOffset) * 60 * 1000
      );

      return formatDateFns(brasiliaTime, "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
  };

  // Função para limpar filtros ao trocar de aba
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setStoreFilter("all"); // Limpar filtro de loja/motoboy

    // Resetar páginas
    setWithdrawalsPage(1);
    setBillingsPage(1);
  };

  const getStatusChip = (status, type = "withdrawal") => {
    const statusConfig = {
      withdrawal: {
        pending: {
          label: "Pendente",
          color: "warning",
          icon: <ScheduleIcon fontSize="small" />,
        },
        processing: {
          label: "Processando",
          color: "info",
          icon: <RefreshIcon fontSize="small" />,
        },
        completed: {
          label: "Concluído",
          color: "success",
          icon: <CheckCircleIcon fontSize="small" />,
        },
        failed: {
          label: "Falhou",
          color: "error",
          icon: <ErrorIcon fontSize="small" />,
        },
        rejected: {
          label: "Rejeitado",
          color: "error",
          icon: <RejectIcon fontSize="small" />,
        },
      },
      billing: {
        PENDING: {
          label: "Pendente",
          color: "warning",
          icon: <ScheduleIcon fontSize="small" />,
        },
        PAID: {
          label: "Pago",
          color: "success",
          icon: <CheckCircleIcon fontSize="small" />,
        },
        OVERDUE: {
          label: "Vencido",
          color: "error",
          icon: <WarningIcon fontSize="small" />,
        },
        CANCELLED: {
          label: "Cancelado",
          color: "default",
          icon: <RejectIcon fontSize="small" />,
        },
        CONFIRMED: {
          label: "Pago",
          color: "success",
          icon: <CheckCircleIcon fontSize="small" />,
        },
      },
    };

    const config = statusConfig[type][status] || {
      label: status,
      color: "default",
      icon: null,
    };

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
        variant="outlined"
      />
    );
  };

  // Componente de Card de Estatística
  const StatCard = ({
    title,
    value,
    icon,
    color = "primary",
    trend,
    subtitle,
  }) => (
    <Card elevation={3} sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
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
              {typeof value === "number" ? formatCurrency(value) : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? (
                  <TrendingUpIcon fontSize="small" color="success" />
                ) : (
                  <TrendingDownIcon fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={trend > 0 ? "success.main" : "error.main"}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}% vs mês anterior
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}.main`,
              color: "#ffffff",
              width: 56,
              height: 56,
              boxShadow: 2,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  // Menu lateral removido - agora usando SideDrawer component

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* AppBar Mobile */}
      {isMobile && (
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <AdminIcon sx={{ mr: 1 }} />
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontWeight: "bold" }}
            >
              {menuItems.find((item) => item.path === "/financeiro")?.title ||
                "Financeiro"}
            </Typography>
            <IconButton color="inherit" onClick={fetchFinancialData}>
              <RefreshIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer */}
      <SideDrawer
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        variant={isMobile ? "temporary" : "permanent"}
        menuItems={menuItems}
        currentPath="/financeiro"
        onLogout={logoutAdmin}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: isMobile ? 0 : "2px",
          mt: isMobile ? "64px" : 0,
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={4}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              Financeiro Administrativo
            </Typography>
            <Box>
              <Button
                variant="contained"
                color="success"
                sx={{ mr: 2 }}
                onClick={() => setCreateBillingOpen(true)}
              >
                Nova Cobrança
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                sx={{ mr: 2 }}
                onClick={() =>
                  showAlert("Função de exportar em desenvolvimento", "info")
                }
              >
                Exportar
              </Button>
              {/* Modal Nova Cobrança */}
              <Dialog
                open={createBillingOpen}
                onClose={() => setCreateBillingOpen(false)}
                maxWidth="sm"
                fullWidth
              >
                <DialogTitle>Criar Nova Cobrança para Loja</DialogTitle>
                <DialogContent>
                  <Box
                    component="form"
                    sx={{
                      mt: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <FormControl fullWidth required>
                      <InputLabel>Loja</InputLabel>
                      <Select
                        value={newBilling.storeId}
                        label="Loja"
                        onChange={(e) => {
                          const storeId = e.target.value;
                          const storeObj = stores.find(
                            (s) => s._id === storeId
                          );
                          setNewBilling((b) => ({
                            ...b,
                            storeId,
                            firebaseUid: storeObj?.firebaseUid || "",
                            customerId: storeObj?.asaasCustomerId || "",
                          }));
                        }}
                      >
                        {stores.map((store) => (
                          <MenuItem key={store._id} value={store._id}>
                            {store.businessName ||
                              store.displayName ||
                              store.email ||
                              store._id}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Valor (R$)"
                      type="number"
                      required
                      value={newBilling.amount}
                      onChange={(e) =>
                        setNewBilling((b) => ({ ...b, amount: e.target.value }))
                      }
                      inputProps={{ min: 1, step: 0.01 }}
                      fullWidth
                    />
                    <TextField
                      label="Acréscimo (R$)"
                      type="number"
                      value={newBilling.additionalFee || 1.89}
                      onChange={(e) =>
                        setNewBilling((b) => ({
                          ...b,
                          additionalFee: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                      helperText="Valor que será somado ao valor principal"
                    />
                    <TextField
                      label="Total da Cobrança (R$)"
                      type="text"
                      value={(() => {
                        const baseAmount = parseFloat(newBilling.amount) || 0;
                        const additionalFee =
                          parseFloat(newBilling.additionalFee) || 0;
                        const total = baseAmount + additionalFee;
                        return new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(total);
                      })()}
                      InputProps={{
                        readOnly: true,
                      }}
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": {
                          fontWeight: "bold",
                          color: "primary.main",
                          fontSize: "1.1rem",
                        },
                      }}
                      helperText="Valor final que será cobrado (valor + acréscimo)"
                    />
                    <TextField
                      label="Vencimento"
                      type="date"
                      required
                      value={newBilling.dueDate}
                      onChange={(e) =>
                        setNewBilling((b) => ({
                          ...b,
                          dueDate: e.target.value,
                        }))
                      }
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        min: formatDateFns(new Date(), "yyyy-MM-dd"), // Não permite datas anteriores a hoje
                      }}
                      fullWidth
                    />
                    <TextField
                      label="Descrição"
                      value={newBilling.description}
                      onChange={(e) =>
                        setNewBilling((b) => ({
                          ...b,
                          description: e.target.value,
                        }))
                      }
                      fullWidth
                    />
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Cobrança</InputLabel>
                      <Select
                        value={newBilling.type}
                        label="Tipo de Cobrança"
                        onChange={(e) =>
                          setNewBilling((b) => ({
                            ...b,
                            type: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="SUBSCRIPTION">Assinatura</MenuItem>
                        <MenuItem value="MOTOBOY_FEE">
                          Taxa de Acionamento
                        </MenuItem>
                        <MenuItem value="MOTOBOY_BILLING">
                          Cobrança de Motoboy
                        </MenuItem>
                        <MenuItem value="EARNING">Ganhos</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Método de Pagamento</InputLabel>
                      <Select
                        value={newBilling.paymentMethod}
                        label="Método de Pagamento"
                        onChange={(e) =>
                          setNewBilling((b) => ({
                            ...b,
                            paymentMethod: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="BOLETO">Boleto</MenuItem>
                        <MenuItem value="PIX">PIX</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setCreateBillingOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleCreateBilling}
                    disabled={creatingBilling}
                  >
                    {creatingBilling ? "Criando..." : "Criar Cobrança"}
                  </Button>
                </DialogActions>
              </Dialog>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={fetchFinancialData}
                disabled={loading}
              >
                Atualizar
              </Button>
            </Box>
          </Box>

          {/* Alert */}
          {alert.open && (
            <Alert
              severity={alert.type}
              sx={{ mb: 3 }}
              onClose={() => setAlert({ ...alert, open: false })}
            >
              {alert.message}
            </Alert>
          )}

          {/* Cards de Estatísticas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Receita Mensal"
                value={financialStats.monthlyRevenue}
                icon={<TrendingUpIcon />}
                color="success"
                trend={12}
                subtitle="Faturamento do mês"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Saques Pendentes"
                value={financialStats.pendingWithdrawals}
                icon={<WithdrawalIcon />}
                color="warning"
                subtitle="Aguardando aprovação"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Faturas Pendentes"
                value={financialStats.pendingBillings}
                icon={<BillingIcon />}
                color="info"
                subtitle="Aguardando pagamento"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Saques do Mês"
                value={financialStats.monthlyWithdrawals}
                icon={<MotoboyIcon />}
                color="primary"
                trend={-5}
                subtitle="Total processado"
              />
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper elevation={3} sx={{ borderRadius: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab
                label={
                  <Badge
                    badgeContent={financialStats.pendingWithdrawals}
                    color="warning"
                  >
                    Saques de Motoboys
                  </Badge>
                }
                icon={<WithdrawalIcon />}
              />
              <Tab
                label={
                  <Badge
                    badgeContent={financialStats.pendingBillings}
                    color="info"
                  >
                    Faturas de Lojas
                  </Badge>
                }
                icon={<BillingIcon />}
              />
            </Tabs>

            {/* Tab Content - Withdrawals */}
            {activeTab === 0 && (
              <Box sx={{ p: 3 }}>
                {/* Filtros */}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                  flexWrap="wrap"
                  gap={2}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Saques dos Motoboys
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Filtrar por Motoboy</InputLabel>
                      <Select
                        value={storeFilter}
                        label="Filtrar por Motoboy"
                        onChange={(e) => {
                          setStoreFilter(e.target.value);
                          setWithdrawalsPage(1); // ✅ RESETAR página ao filtrar
                        }}
                      >
                        <MenuItem value="all">Todos os Motoboys</MenuItem>
                        {allMotoboys.map((motoboy) => (
                          <MenuItem key={motoboy.id} value={motoboy.id}>
                            {motoboy.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Filtrar por Status</InputLabel>
                      <Select
                        value={withdrawalFilter}
                        label="Filtrar por Status"
                        onChange={(e) => {
                          setWithdrawalFilter(e.target.value);
                          setWithdrawalsPage(1); // ✅ RESETAR página ao filtrar
                        }}
                      >
                        <MenuItem value="all">Todos</MenuItem>
                        <MenuItem value="pending">Pendentes</MenuItem>
                        <MenuItem value="processing">Processando</MenuItem>
                        <MenuItem value="completed">Concluídos</MenuItem>
                        <MenuItem value="failed">Falharam</MenuItem>
                        <MenuItem value="rejected">Rejeitados</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FilterIcon />}
                      onClick={() => {
                        setStoreFilter("all");
                        setWithdrawalFilter("all");
                        setWithdrawalsPage(1);
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </Box>
                </Box>

                {/* Tabela de Withdrawals */}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Motoboy</TableCell>
                        <TableCell>Valor Bruto</TableCell>
                        <TableCell>Valor Líquido</TableCell>
                        <TableCell>Chave PIX</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {withdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal._id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
                                <MotoboyIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {withdrawal.motoboyName ||
                                    "Motoboy Desconhecido"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  ID: {withdrawal.motoboyId}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(withdrawal.amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(withdrawal.netAmount)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {withdrawal.pixKey}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {withdrawal.pixKeyType}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(withdrawal.status, "withdrawal")}
                          </TableCell>
                          <TableCell>
                            {formatDate(withdrawal.createdAt)}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Ver Detalhes">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setDetailsOpen(true);
                                }}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {withdrawal.status === "pending" && (
                              <>
                                <Tooltip title="Aprovar">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedWithdrawal(withdrawal);
                                      setProcessWithdrawalOpen(true);
                                    }}
                                  >
                                    <ApproveIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Rejeitar">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleProcessWithdrawal(
                                        withdrawal._id,
                                        "reject"
                                      )
                                    }
                                  >
                                    <RejectIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Paginação Withdrawals */}
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={Math.ceil(withdrawalsTotal / 10)}
                    page={withdrawalsPage}
                    onChange={(e, page) => setWithdrawalsPage(page)}
                    color="primary"
                  />
                </Box>
              </Box>
            )}

            {/* Tab Content - Billings */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                {/* Filtros */}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                  flexWrap="wrap"
                  gap={2}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Faturas das Lojas
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Filtrar por Loja</InputLabel>
                      <Select
                        value={storeFilter}
                        label="Filtrar por Loja"
                        onChange={(e) => {
                          setStoreFilter(e.target.value);
                          setBillingsPage(1); // ✅ RESETAR página ao filtrar
                        }}
                      >
                        <MenuItem value="all">Todas as Lojas</MenuItem>
                        {allStores.map((store) => (
                          <MenuItem key={store._id} value={store._id}>
                            {store.businessName ||
                              store.displayName ||
                              store.email ||
                              store._id}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Filtrar por Status</InputLabel>
                      <Select
                        value={billingFilter}
                        label="Filtrar por Status"
                        onChange={(e) => {
                          setBillingFilter(e.target.value);
                          setBillingsPage(1); // ✅ RESETAR página ao filtrar
                        }}
                      >
                        <MenuItem value="all">Todos</MenuItem>
                        <MenuItem value="PENDING">Pendentes</MenuItem>
                        <MenuItem value="PAID">Pagos</MenuItem>
                        <MenuItem value="CONFIRMED">Confirmados</MenuItem>
                        <MenuItem value="COMPLETED">Completados</MenuItem>
                        <MenuItem value="OVERDUE">Vencidos</MenuItem>
                        <MenuItem value="CANCELLED">Cancelados</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FilterIcon />}
                      onClick={() => {
                        setStoreFilter("all");
                        setBillingFilter("all");
                        setBillingsPage(1);
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </Box>
                </Box>

                {/* Tabela de Billings */}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Loja</TableCell>
                        <TableCell>Valor</TableCell>
                        <TableCell>Período</TableCell>
                        <TableCell>Vencimento</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {billings.map((billing) => (
                        <TableRow key={billing._id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar sx={{ mr: 2, bgcolor: "info.main" }}>
                                <StoreIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {billing.storeName || "Loja Desconhecida"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  ID: {billing.storeId}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(billing.amount)}
                          </TableCell>
                          <TableCell>
                            {billing.period === "MONTHLY"
                              ? "Mensal"
                              : "Semanal"}
                          </TableCell>
                          <TableCell>{formatDate(billing.dueDate)}</TableCell>
                          <TableCell>
                            {getStatusChip(billing.status, "billing")}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                billing.type === "SUBSCRIPTION"
                                  ? "Assinatura"
                                  : billing.type === "MOTOBOY_FEE"
                                  ? "Taxa Acionamento"
                                  : "Viagens"
                              }
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Ver Detalhes">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedBilling(billing);
                                  setDetailsOpen(true);
                                }}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Alterar Status">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedBilling(billing);
                                  setNewStatus(billing.status);
                                  setStatusReason("");
                                  setUpdateStatusOpen(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir Cobrança">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedBilling(billing);
                                  setDeleteBillingOpen(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Paginação Billings */}
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={Math.ceil(billingsTotal / 10)}
                    page={billingsPage}
                    onChange={(e, page) => setBillingsPage(page)}
                    color="primary"
                  />
                </Box>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>

      {/* Modal de Detalhes */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedWithdrawal ? "Detalhes do Saque" : "Detalhes da Fatura"}
        </DialogTitle>
        <DialogContent>
          {selectedWithdrawal && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Motoboy
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedWithdrawal.motoboyName}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status
                  </Typography>
                  <Box mb={2}>
                    {getStatusChip(selectedWithdrawal.status, "withdrawal")}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Valor Bruto
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatCurrency(selectedWithdrawal.amount)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Valor Líquido
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatCurrency(selectedWithdrawal.netAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Chave PIX
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedWithdrawal.pixKey}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Tipo da Chave
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedWithdrawal.pixKeyType}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Data da Solicitação
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(selectedWithdrawal.createdAt)}
                  </Typography>
                </Grid>
                {selectedWithdrawal.travels &&
                  selectedWithdrawal.travels.length > 0 && (
                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle2"
                        color="textSecondary"
                        gutterBottom
                      >
                        Viagens Incluídas ({selectedWithdrawal.travels.length})
                      </Typography>
                      <Box maxHeight={200} overflow="auto">
                        {selectedWithdrawal.travels.map((travel, index) => (
                          <Box
                            key={index}
                            p={1}
                            border={1}
                            borderColor="grey.300"
                            borderRadius={1}
                            mb={1}
                          >
                            <Typography variant="body2">
                              ID: {travel.travelId} -{" "}
                              {formatCurrency(travel.amount)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Grid>
                  )}
              </Grid>
            </Box>
          )}
          {selectedBilling && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Loja
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedBilling.storeName}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status
                  </Typography>
                  <Box mb={2}>
                    {getStatusChip(selectedBilling.status, "billing")}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Valor
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatCurrency(selectedBilling.amount)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Período
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedBilling.period}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Vencimento
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(selectedBilling.dueDate)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Tipo
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedBilling.type}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Descrição
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedBilling.description}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Processar Saque */}
      <Dialog
        open={processWithdrawalOpen}
        onClose={() => setProcessWithdrawalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Processar Saque</DialogTitle>
        <DialogContent>
          {selectedWithdrawal && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Você está prestes a processar o saque de{" "}
                {formatCurrency(selectedWithdrawal.amount)}
                para o motoboy {selectedWithdrawal.motoboyName}.
              </Alert>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                <strong>Valor Líquido:</strong>{" "}
                {formatCurrency(selectedWithdrawal.netAmount)}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                <strong>Chave PIX:</strong> {selectedWithdrawal.pixKey}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Tipo:</strong> {selectedWithdrawal.pixKeyType}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessWithdrawalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() =>
              handleProcessWithdrawal(selectedWithdrawal?._id, "approve")
            }
            disabled={loading}
          >
            {loading ? "Processando..." : "Aprovar Saque"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Cobrança */}
      <Dialog
        open={deleteBillingOpen}
        onClose={() => setDeleteBillingOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <DeleteIcon color="error" sx={{ mr: 1 }} />
            Excluir Cobrança
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBilling && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Atenção!</strong> Esta ação não pode ser desfeita. A
                cobrança será permanentemente removida do sistema e cancelada no
                Asaas (se aplicável).
              </Alert>

              <Typography variant="h6" gutterBottom>
                Detalhes da Cobrança:
              </Typography>

              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Loja:</strong>{" "}
                  {selectedBilling.storeName || "Desconhecida"}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Valor:</strong>{" "}
                  {formatCurrency(selectedBilling.amount)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Status:</strong> {selectedBilling.status}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Vencimento:</strong>{" "}
                  {formatDate(selectedBilling.dueDate)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Tipo:</strong>{" "}
                  {selectedBilling.type === "SUBSCRIPTION"
                    ? "Assinatura"
                    : selectedBilling.type === "MOTOBOY_FEE"
                    ? "Taxa Acionamento"
                    : selectedBilling.type === "MOTOBOY_BILLING"
                    ? "Cobrança Motoboy"
                    : selectedBilling.type}
                </Typography>
                <Typography variant="body2">
                  <strong>Método:</strong>{" "}
                  {selectedBilling.paymentMethod || "PIX"}
                </Typography>
              </Box>

              <Typography variant="body2" color="error">
                Confirme digitando <strong>EXCLUIR</strong> abaixo para
                prosseguir:
              </Typography>

              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Digite EXCLUIR para confirmar"
                value={deleteConfirmText}
                sx={{ mt: 1 }}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteBillingOpen(false);
              setDeleteConfirmText("");
            }}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteBilling}
            disabled={deletingBilling || deleteConfirmText !== "EXCLUIR"}
          >
            {deletingBilling ? "Excluindo..." : "Excluir Cobrança"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ NOVO MODAL: Alterar Status do Billing */}
      <Dialog
        open={updateStatusOpen}
        onClose={() => setUpdateStatusOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <EditIcon color="primary" sx={{ mr: 1 }} />
            Alterar Status da Fatura
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBilling && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Alterando status da fatura de{" "}
                {formatCurrency(selectedBilling.amount)}
                da loja {selectedBilling.storeName}
              </Alert>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                <strong>Status atual:</strong>{" "}
                {getStatusChip(selectedBilling.status, "billing")}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Novo Status</InputLabel>
                  <Select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    label="Novo Status"
                  >
                    <MenuItem value="PENDING">
                      <Box display="flex" alignItems="center">
                        <ScheduleIcon sx={{ mr: 1, color: "orange" }} />
                        Pendente
                      </Box>
                    </MenuItem>
                    <MenuItem value="PAID">
                      <Box display="flex" alignItems="center">
                        <CheckCircleIcon sx={{ mr: 1, color: "green" }} />
                        Pago
                      </Box>
                    </MenuItem>
                    <MenuItem value="OVERDUE">
                      <Box display="flex" alignItems="center">
                        <WarningIcon sx={{ mr: 1, color: "red" }} />
                        Vencido
                      </Box>
                    </MenuItem>
                    <MenuItem value="CANCELLED">
                      <Box display="flex" alignItems="center">
                        <ErrorIcon sx={{ mr: 1, color: "gray" }} />
                        Cancelado
                      </Box>
                    </MenuItem>
                    <MenuItem value="ERROR">
                      <Box display="flex" alignItems="center">
                        <ErrorIcon sx={{ mr: 1, color: "purple" }} />
                        Erro
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Motivo (opcional)"
                  multiline
                  rows={3}
                  fullWidth
                  variant="outlined"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Digite o motivo da alteração do status..."
                  sx={{ mt: 2 }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setUpdateStatusOpen(false);
              setNewStatus("");
              setStatusReason("");
            }}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={handleUpdateBillingStatus}
            disabled={
              updatingStatus ||
              !newStatus ||
              newStatus === selectedBilling?.status
            }
          >
            {updatingStatus ? "Alterando..." : "Alterar Status"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuporteFinanceiro;
