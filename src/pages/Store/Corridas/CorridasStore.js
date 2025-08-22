import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  DirectionsCar as DirectionsCarIcon,
  AttachMoney as AttachMoneyIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";
import { STORE_MENU_ITEMS } from "../../../config/menuConfig";
import { UseStoreAuth } from "../../../contexts/StoreAuthContext";
import api from "../../../services/api";

const CorridasStore = () => {
  const { StoreUser, logoutStore } = UseStoreAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Configuração do menu
  const menuItems = STORE_MENU_ITEMS;

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Estados de dados
  const [travels, setTravels] = useState([]);
  const [travelStats, setTravelStats] = useState({
    totalTravels: 0,
    entregueTravels: 0,
    emEntregaTravels: 0,
    canceladoTravels: 0,
    totalRevenue: 0,
    averagePrice: 0,
    totalDistance: 0,
    averageDistance: 0,
    financePendingValue: 0,
    financeReleasedValue: 0,
    financePaidValue: 0,
    financeCanceledValue: 0,
    financeProcessingValue: 0,
  });

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [financeStatusFilter, setFinanceStatusFilter] = useState("all");

  // Estados de modais
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Estados de erro/sucesso
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    type: "info",
  });

  const showAlert = (message, type = "info") => {
    setAlert({
      open: true,
      message,
      type,
    });
  };

  // Carregar dados iniciais
  useEffect(() => {
    fetchTravelData();
  }, [page, rowsPerPage, statusFilter, dateFilter, financeStatusFilter]);

  const fetchTravelData = async () => {
    try {
      setLoading(true);

      // Buscar corridas do estabelecimento
      const response = await api.get("/travels/store", {
        params: {
          storeId: StoreUser?.uid,
          page: page + 1,
          limit: rowsPerPage,
          status: statusFilter !== "all" ? statusFilter : undefined,
          dateFilter: dateFilter !== "all" ? dateFilter : undefined,
          financeStatus:
            financeStatusFilter !== "all" ? financeStatusFilter : undefined,
        },
      });

      setTravels(response.data.travels || []);
      setTotalCount(response.data.total || 0);
      setTravelStats(response.data.stats || {});
    } catch (error) {
      console.error("Erro ao carregar dados de corridas:", error);
      showAlert("Erro ao carregar dados de corridas", "error");

      // Dados de exemplo para desenvolvimento
      const exampleTravels = [
        {
          _id: "1",
          motoboyId: "moto1",
          motoboyName: "João Silva",
          price: 15.5,
          distance: 5.2,
          status: "entregue",
          createdAt: new Date().toISOString(),
          order: {
            _id: "order1",
            store: { name: StoreUser?.displayName || "Meu Estabelecimento" },
            customer: [{ name: "Cliente 1", customerName: "Cliente 1" }],
          },
          finance: { status: "pago", value: 15.5 },
          coordinatesFrom: [-23.5505, -46.6333],
          coordinatesTo: [-23.5525, -46.6355],
        },
        {
          _id: "2",
          motoboyId: "moto2",
          motoboyName: "Maria Santos",
          price: 22.3,
          distance: 8.7,
          status: "em_entrega",
          createdAt: new Date().toISOString(),
          order: {
            _id: "order2",
            store: { name: StoreUser?.displayName || "Meu Estabelecimento" },
            customer: [{ name: "Cliente 2", customerName: "Cliente 2" }],
          },
          finance: { status: "pendente", value: 22.3 },
          coordinatesFrom: [-23.5515, -46.6343],
          coordinatesTo: [-23.5535, -46.6365],
        },
        {
          _id: "3",
          motoboyId: "moto3",
          motoboyName: "Carlos Lima",
          price: 18.9,
          distance: 6.5,
          status: "entregue",
          createdAt: new Date().toISOString(),
          order: {
            _id: "order3",
            store: { name: StoreUser?.displayName || "Meu Estabelecimento" },
            customer: [{ name: "Cliente 3", customerName: "Cliente 3" }],
          },
          finance: { status: "processando", value: 18.9 },
          coordinatesFrom: [-23.5525, -46.6353],
          coordinatesTo: [-23.5545, -46.6375],
        },
      ];

      setTravels(exampleTravels);
      setTotalCount(exampleTravels.length);
      setTravelStats({
        totalTravels: 42,
        entregueTravels: 35,
        emEntregaTravels: 5,
        canceladoTravels: 2,
        totalRevenue: 850.75,
        averagePrice: 20.25,
        totalDistance: 180.5,
        averageDistance: 4.3,
        financePendingValue: 125.5,
        financeReleasedValue: 320.25,
        financePaidValue: 380.0,
        financeCanceledValue: 0,
        financeProcessingValue: 25.0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (travel) => {
    setSelectedTravel(travel);
    setDetailsOpen(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (date) => {
    try {
      const parsedDate =
        typeof date === "string" ? parseISO(date) : new Date(date);
      return format(parsedDate, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  const formatDistance = (distance) => {
    return `${(distance || 0).toFixed(1)} km`;
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      entregue: { label: "Entregue", color: "success" },
      em_entrega: { label: "Em Entrega", color: "warning" },
      cancelado: { label: "Cancelado", color: "error" },
      aceito: { label: "Aceito", color: "info" },
      pendente: { label: "Pendente", color: "default" },
    };

    const config = statusConfig[status] || { label: status, color: "default" };

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="filled"
      />
    );
  };

  const getFinanceStatusChip = (status) => {
    const statusConfig = {
      pago: { label: "Pago", color: "success" },
      liberado: { label: "Liberado", color: "info" },
      pendente: { label: "Pendente", color: "warning" },
      cancelado: { label: "Cancelado", color: "error" },
      processando: { label: "Processando", color: "secondary" },
    };

    const config = statusConfig[status] || { label: status, color: "default" };

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="filled"
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
    format = "number",
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
              {format === "currency"
                ? formatCurrency(value)
                : format === "distance"
                ? formatDistance(value)
                : value}
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

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        menuItems={menuItems}
        userInfo={{
          name: StoreUser?.displayName || "Estabelecimento",
          email: StoreUser?.email || "",
          role: "Estabelecimento",
        }}
        onLogout={logoutStore}
      />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Minhas Corridas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visualize todas as corridas relacionadas ao seu estabelecimento
          </Typography>
        </Box>

        {/* Cards de Estatísticas Principais */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total de Corridas"
              value={travelStats.totalTravels}
              icon={<DirectionsCarIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Corridas Entregues"
              value={travelStats.entregueTravels}
              icon={<TimelineIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Em Entrega"
              value={travelStats.emEntregaTravels}
              icon={<TimelineIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Receita Total"
              value={travelStats.totalRevenue}
              icon={<AttachMoneyIcon />}
              color="info"
              format="currency"
            />
          </Grid>
        </Grid>

        <Divider sx={{ margin: 4 }} />

        {/* Cards de Estatísticas Financeiras */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pendente"
              value={travelStats.financePendingValue}
              icon={<AttachMoneyIcon />}
              color="warning"
              format="currency"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Processando"
              value={travelStats.financeProcessingValue}
              icon={<AttachMoneyIcon />}
              color="secondary"
              format="currency"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Liberado"
              value={travelStats.financeReleasedValue}
              icon={<AttachMoneyIcon />}
              color="info"
              format="currency"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pago"
              value={travelStats.financePaidValue}
              icon={<AttachMoneyIcon />}
              color="success"
              format="currency"
            />
          </Grid>
        </Grid>

        {/* Filtros */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <FilterListIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Filtros</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status da Corrida</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status da Corrida"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="entregue">Entregue</MenuItem>
                  <MenuItem value="em_entrega">Em Entrega</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                  <MenuItem value="aceito">Aceito</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status Financeiro</InputLabel>
                <Select
                  value={financeStatusFilter}
                  label="Status Financeiro"
                  onChange={(e) => setFinanceStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="pago">Pago</MenuItem>
                  <MenuItem value="liberado">Liberado</MenuItem>
                  <MenuItem value="processando">Processando</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Período</InputLabel>
                <Select
                  value={dateFilter}
                  label="Período"
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="today">Hoje</MenuItem>
                  <MenuItem value="week">Esta semana</MenuItem>
                  <MenuItem value="month">Este mês</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchTravelData}
                fullWidth
                size="small"
              >
                Atualizar
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabela de Corridas */}
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Motoboy</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Distância</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Pagamento</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {travels.map((travel) => (
                  <TableRow key={travel._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {travel._id?.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">
                          {travel.motoboyName || "Aguardando"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {travel.order?.customer?.[0]?.name ||
                          travel.order?.customer?.[0]?.customerName ||
                          "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(travel.price)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDistance(travel.distance)}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(travel.status)}</TableCell>
                    <TableCell>
                      {getFinanceStatusChip(travel.finance?.status)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(travel.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Ver detalhes">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(travel)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
          />
        </Paper>

        {/* Modal de Detalhes da Corrida */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <DirectionsCarIcon sx={{ mr: 1 }} />
              Detalhes da Corrida
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedTravel && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Informações da Corrida
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      ID da Corrida
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace">
                      {selectedTravel._id}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Status
                    </Typography>
                    {getStatusChip(selectedTravel.status)}
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Valor da Entrega
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(selectedTravel.price)}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Distância
                    </Typography>
                    <Typography variant="body1">
                      {formatDistance(selectedTravel.distance)}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Data da Corrida
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedTravel.createdAt)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Informações do Pedido
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Motoboy Responsável
                    </Typography>
                    <Typography variant="body1">
                      {selectedTravel.motoboyName || "Aguardando aceite"}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Cliente
                    </Typography>
                    <Typography variant="body1">
                      {selectedTravel.order?.customer?.[0]?.name ||
                        selectedTravel.order?.customer?.[0]?.customerName ||
                        "N/A"}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Status Financeiro
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Status do Pagamento
                    </Typography>
                    {getFinanceStatusChip(selectedTravel.finance?.status)}
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Valor do Pagamento
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(selectedTravel.finance?.value)}
                    </Typography>
                  </Box>
                </Grid>
                {selectedTravel.coordinatesFrom &&
                  selectedTravel.coordinatesTo && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Informações de Localização
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          Origem (Estabelecimento)
                        </Typography>
                        <Typography variant="body1" fontFamily="monospace">
                          {selectedTravel.coordinatesFrom.join(", ")}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          Destino (Cliente)
                        </Typography>
                        <Typography variant="body1" fontFamily="monospace">
                          {selectedTravel.coordinatesTo.join(", ")}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar para alertas */}
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert
            onClose={() => setAlert({ ...alert, open: false })}
            severity={alert.type}
            sx={{ width: "100%" }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CorridasStore;
