import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { findMotoboys } from "../../services/api";
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Fab,
  Autocomplete,
  Icon,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  ShoppingBag as ShoppingBagIcon,
  Receipt as OrdersIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Clear as ClearIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Schedule as ScheduleIcon,
  LocalShipping as DeliveryIcon,
  DoneAll as DoneAllIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import eventService from "../../services/eventService";

const Pedidos = () => {
  const { currentUser, logout } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [openDialog, setOpenDialog] = useState(false);
  const [currentPedido, setCurrentPedido] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [driverCode, setDriverCode] = useState(null);

  // Estado para o formulário de novo pedido
  const [novoPedido, setNovoPedido] = useState({
    customer: {
      name: "",
      phone: "",
      customerAddress: {
        cep: null,
        address: "",
        addressNumber: "",
        bairro: "",
        cidade: "",
      },
    },
    items: [],
    payment: {
      method: "dinheiro",
      change: 0,
    },
    notes: "",
    total: 0,
  });

  // Estado para o item atual sendo adicionado
  const [currentItem, setCurrentItem] = useState({
    productId: "",
    productName: "",
    quantity: 1,
    price: 0,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Só conectar o SSE se o usuário estiver autenticado
    if (currentUser) {
      // Conectar com o UID do usuário atual como identificador da loja
      eventService.connect(currentUser.uid);

      // Configurar manipulador para atualizações de pedidos
      const handleOrderUpdate = (orderData) => {
        console.log("Atualização de pedido recebida:", orderData);

        // Atualizar o pedido na lista local se o pedido já existir
        setPedidos((prevPedidos) =>
          prevPedidos.map((pedido) =>
            pedido._id === orderData._id ? { ...pedido, ...orderData } : pedido
          )
        );

        // Se o pedido atual estiver aberto, atualizá-lo também
        if (currentPedido && currentPedido._id === orderData._id) {
          setCurrentPedido((prevPedido) => ({ ...prevPedido, ...orderData }));
        }

        // Notificar o usuário sobre a mudança
        setSnackbar({
          open: true,
          message: `Pedido #${orderData.orderNumber} atualizado para ${orderData.status}`,
          severity: "info",
        });
      };

      // Registrar o manipulador de eventos
      eventService.on("orderUpdate", handleOrderUpdate);

      // Limpar na desmontagem
      return () => {
        eventService.off("orderUpdate", handleOrderUpdate);
        // Não desconectar, pois outros componentes podem precisar da conexão
      };
    }
  }, [currentUser, currentPedido]);

  const handleFetchPedidos = () => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        const response = await api.get("/orders");
        setPedidos(response.data);
        setFilteredPedidos(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
        setError(
          "Não foi possível carregar os pedidos. Tente novamente mais tarde."
        );
        setSnackbar({
          open: true,
          message: "Erro ao carregar pedidos",
          severity: "error",
        });
        setLoading(false);
      }
    };
    fetchPedidos();
  };

  const handleThisFetchPedido = (id) => {
    const fetchPedido = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${id}`);
        setCurrentPedido(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
        setError(
          "Não foi possível carregar os pedidos. Tente novamente mais tarde."
        );
        setSnackbar({
          open: true,
          message: "Erro ao carregar pedido",
          severity: "error",
        });
        setLoading(false);
      }
    };
    fetchPedido();
  };
  // Carregar pedidos
  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        const response = await api.get("/orders");
        setPedidos(response.data);
        setFilteredPedidos(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
        setError(
          "Não foi possível carregar os pedidos. Tente novamente mais tarde."
        );
        setSnackbar({
          open: true,
          message: "Erro ao carregar pedidos",
          severity: "error",
        });
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  // Carregar produtos (para uso na criação de pedidos)
  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoadingProdutos(true);
        const response = await api.get("/products");
        setProdutos(response.data);
        setLoadingProdutos(false);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        setLoadingProdutos(false);
      }
    };

    if (openCreateDialog) {
      fetchProdutos();
    }
  }, [openCreateDialog]);

  // Efeito para aplicar filtros
  useEffect(() => {
    let result = [...pedidos];

    // Filtrar por termo de busca
    if (searchTerm) {
      result = result.filter(
        (pedido) =>
          pedido.customer?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          pedido.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por status
    if (filterStatus !== "todos") {
      result = result.filter((pedido) => pedido.status === filterStatus);
    }

    setFilteredPedidos(result);
  }, [pedidos, searchTerm, filterStatus]);

  // Controle do drawer
  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
  };

  // Ver detalhes do pedido
  const handleViewPedido = (pedido) => {
    setCurrentPedido(pedido);
    setOpenDialog(true);
  };

  // Atualizar status do pedido
  const handleUpdateStatus = async (pedidoId, newStatus) => {
    try {
      setLoading(true);

      // Chamar API para atualizar status
      await api.put(`/orders/${pedidoId}/status`, { status: newStatus });

      // Atualizar estado local
      const updatedPedidos = pedidos.map((pedido) =>
        pedido._id === pedidoId ? { ...pedido, status: newStatus } : pedido
      );

      setPedidos(updatedPedidos);

      // Se o pedido atual está aberto, atualizar também
      if (currentPedido && currentPedido._id === pedidoId) {
        setCurrentPedido({ ...currentPedido, status: newStatus });
      }

      setSnackbar({
        open: true,
        message: "Status do pedido atualizado com sucesso",
        severity: "success",
      });

      setLoading(false);
    } catch (err) {
      console.error("Erro ao atualizar status do pedido:", err);
      setSnackbar({
        open: true,
        message: "Erro ao atualizar status do pedido",
        severity: "error",
      });
      setLoading(false);
    }
  };

  const handleDriverCode = (code, pedido) => {
    if (pedido.motoboy.phone === null) {
      setSnackbar({
        open: true,
        message: "Não há um motoboy atribuido ao pedido ainda.",
        severity: "error",
      });
      setLoading(false);
      return;
    }
    const driverCode = pedido.motoboy.phone.slice(-4);
    if (code === driverCode) {
      console.log("pedido:", pedido._id);
      handleUpdateStatus(pedido._id, "em_entrega");
      setSnackbar({
        open: true,
        message: "Pedido atualizado, em rota de entrega",
        severity: "success",
      });
    } else {
      setSnackbar({
        open: true,
        message: "Erro ao atualizar status, codigo invalido",
        severity: "error",
      });
      setLoading(false);
    }
  };

  // Abrir formulário de criação de pedido
  const handleOpenCreateDialog = () => {
    setNovoPedido({
      store: {
        name: "",
        cnpj: "",
        cep: null,
        coordinates: [],
        address: {},
      },
      customer: {
        name: "",
        phone: "",
        customerAddress: {
          cep: null,
          address: "",
          addressNumber: "",
          bairro: "",
          cidade: "",
        },
      },
      items: [],
      payment: {
        method: "dinheiro",
        change: 0,
      },
      notes: "",
      total: 0,
    });
    setCurrentItem({
      productId: "",
      productName: "",
      quantity: 1,
      price: 0,
    });
    setOpenCreateDialog(true);
  };

  // Fechar formulário de criação de pedido
  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  // Atualizar dados do cliente
  // Atualizar dados do cliente
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;

    // Check if the field belongs to the address object
    if (
      ["cep", "address", "addressNumber", "bairro", "cidade"].includes(name)
    ) {
      let processedValue = value;

      // Para campos numéricos, remover caracteres não numéricos e converter para número
      if (["cep"].includes(name)) {
        processedValue = value.replace(/\D/g, "");
        if (processedValue !== "") {
          processedValue = Number(processedValue);
        }
      }

      setNovoPedido((prev) => ({
        ...prev,
        customer: {
          ...prev.customer,
          customerAddress: {
            ...prev.customer.customerAddress,
            [name]: processedValue,
          },
        },
      }));
    } else {
      // Handle regular customer fields
      setNovoPedido((prev) => ({
        ...prev,
        customer: {
          ...prev.customer,
          [name]: value,
        },
      }));
    }
  };

  // Atualizar forma de pagamento
  const handlePaymentMethodChange = (e) => {
    setNovoPedido((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        method: e.target.value,
      },
    }));
  };

  // Atualizar troco
  const handleChangeValueChange = (e) => {
    const change = parseFloat(e.target.value) || 0;
    setNovoPedido((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        change: change,
      },
    }));
  };

  // Atualizar observações
  const handleNotesChange = (e) => {
    setNovoPedido((prev) => ({
      ...prev,
      notes: e.target.value,
    }));
  };

  // Selecionar produto para adicionar ao pedido
  const handleProductSelect = (event, produto) => {
    if (produto) {
      setCurrentItem({
        productId: produto._id,
        productName: produto.productName,
        quantity: 1,
        price: produto.priceOnSale || produto.priceFull,
      });
    } else {
      setCurrentItem({
        productId: "",
        productName: "",
        quantity: 1,
        price: 0,
      });
    }
  };

  // Atualizar quantidade do item atual
  const handleQuantityChange = (e) => {
    const quantity = parseInt(e.target.value) || 1;
    setCurrentItem((prev) => ({
      ...prev,
      quantity: quantity > 0 ? quantity : 1,
    }));
  };

  // Adicionar item ao pedido
  const handleAddItem = () => {
    if (!currentItem.productName) {
      setSnackbar({
        open: true,
        message: "Selecione um produto para adicionar",
        severity: "warning",
      });
      return;
    }

    const newItem = { ...currentItem };
    const updatedItems = [...novoPedido.items, newItem];

    // Calcular novo total
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    setNovoPedido((prev) => ({
      ...prev,
      items: updatedItems,
      total: newTotal,
    }));

    // Limpar item atual para adicionar outro
    setCurrentItem({
      productId: "",
      productName: "",
      quantity: 1,
      price: 0,
    });
  };

  // Remover item do pedido
  const handleRemoveItem = (index) => {
    const updatedItems = novoPedido.items.filter((_, i) => i !== index);
    // Recalcular total
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    setNovoPedido((prev) => ({
      ...prev,
      items: updatedItems,
      total: newTotal,
    }));
  };

  // Criar novo pedido
  const handleCreatePedido = async () => {
    // Validação básica
    if (
      !novoPedido.customer.name ||
      !novoPedido.customer.phone ||
      !novoPedido.customer.customerAddress.address
    ) {
      setSnackbar({
        open: true,
        message: "Preencha todos os dados do cliente",
        severity: "warning",
      });
      return;
    }

    if (novoPedido.items.length === 0) {
      setSnackbar({
        open: true,
        message: "Adicione pelo menos um item ao pedido",
        severity: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const userProfileResponse = await api.get("/stores/me");
      const userCnpj = userProfileResponse.data.cnpj;
      const storeAddress = userProfileResponse.data.address;
      const userGeolocation = userProfileResponse.data.geolocation;

      const orderData = {
        ...novoPedido,
        store: {
          cnpj: userCnpj,
          address: storeAddress,
          coordinates: userGeolocation.coordinates,
        },
        // geolocation: userGeolocation,
      };

      // console.log(orderData);
      // Chamar API para criar pedido
      const response = await api.post("/orders", orderData);

      const orderId = response.data._id || response.data.order._id;

      if (!orderId) {
        setSnackbar({
          open: true,
          message: "Erro ao criar pedido",
          severity: "error",
        });
        return;
      }
      // Adicionar novo pedido à lista
      setPedidos((prev) => [response.data.order, ...prev]);

      setSnackbar({
        open: true,
        message: "Pedido criado com sucesso",
        severity: "success",
      });

      setOpenCreateDialog(false);
      setLoading(false);

      findMotoboys(orderId);
    } catch (err) {
      console.error("Erro ao criar pedido:", err);
      setSnackbar({
        open: true,
        message: "Erro ao criar pedido",
        severity: "error",
      });
      setLoading(false);
    }
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // Fazer logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Formatação de data e hora
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Formatação de valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Obter chip colorido de acordo com o status
  const getStatusChip = (status) => {
    const statusConfig = {
      pendente: {
        color: "warning",
        icon: <ScheduleIcon fontSize="small" />,
        label: "Buscando motorista",
      },
      em_preparo: {
        color: "primary",
        icon: <CheckIcon fontSize="small" />,
        label: "Em Preparo",
      },
      em_entrega: {
        color: "info",
        icon: <DeliveryIcon fontSize="small" />,
        label: "Em Entrega",
      },
      entregue: {
        color: "success",
        icon: <DoneAllIcon fontSize="small" />,
        label: "Entregue",
      },
      cancelado: {
        color: "error",
        icon: <CloseIcon fontSize="small" />,
        label: "Cancelado",
      },
    };

    const config = statusConfig[status] || statusConfig.pendente;

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  // Drawer content
  const drawerItems = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, textAlign: "center" }}>
        <img
          src="https://i.imgur.com/8jOdfcO.png"
          style={{ height: 50, marginBottom: 16 }}
          alt="Gringo Delivery"
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

  // Renderizar estado vazio (sem pedidos)
  const renderEmptyState = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
      }}
    >
      <OrdersIcon sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1, fontWeight: "bold" }}>
        Nenhum pedido encontrado
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 3, textAlign: "center" }}
      >
        Não há pedidos registrados no momento.
        <br />
        Crie um novo pedido ou aguarde pedidos dos clientes.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpenCreateDialog}
        startIcon={<AddIcon />}
      >
        Criar Pedido
      </Button>
    </Box>
  );

  // Renderizar estado vazio após filtros
  const renderEmptyFilterState = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
      }}
    >
      <FilterListIcon sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1, fontWeight: "bold" }}>
        Nenhum pedido encontrado com esses filtros
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Tente ajustar seus critérios de busca ou limpar os filtros.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleClearFilters}
        startIcon={<ClearIcon />}
      >
        Limpar Filtros
      </Button>
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
        <AppBar position="fixed" sx={{ bgcolor: "primary.main" }}>
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

      {/* Drawer para navegação */}
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
          position: "relative",
        }}
      >
        <Container maxWidth="lg">
          {/* Cabeçalho */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              Pedidos
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Novo Pedido
            </Button>
          </Box>

          {/* Filtros */}
          <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  color: "primary.main",
                }}
              >
                <FilterListIcon sx={{ mr: 1 }} /> Filtros
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder="Buscar pedidos (cliente, ID, endereço)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm ? (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setSearchTerm("")}
                            size="small"
                          >
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="status-filter-label">
                      Status do Pedido
                    </InputLabel>
                    <Select
                      labelId="status-filter-label"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Status do Pedido"
                    >
                      <MenuItem value="todos">Todos os Pedidos</MenuItem>
                      <MenuItem value="pendente">Pendentes</MenuItem>
                      <MenuItem value="em_preparo">Em Preparo</MenuItem>
                      <MenuItem value="em_entrega">Em Entrega</MenuItem>
                      <MenuItem value="entregue">Entregues</MenuItem>
                      <MenuItem value="cancelado">Cancelados</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Exibir resumo dos filtros ativos e botão para limpar */}
            {(searchTerm || filterStatus !== "todos") && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Filtros ativos:
                </Typography>

                {searchTerm && (
                  <Chip
                    label={`Busca: "${searchTerm}"`}
                    size="small"
                    onDelete={() => setSearchTerm("")}
                  />
                )}

                {filterStatus !== "todos" && (
                  <Chip
                    label={`Status: ${
                      filterStatus === "pendente"
                        ? "Pendentes"
                        : filterStatus === "em_preparo"
                        ? "Em Preparo"
                        : filterStatus === "em_entrega"
                        ? "Em Entrega"
                        : filterStatus === "entregue"
                        ? "Entregues"
                        : "Cancelados"
                    }`}
                    size="small"
                    color={
                      filterStatus === "pendente"
                        ? "warning"
                        : filterStatus === "em_preparo"
                        ? "primary"
                        : filterStatus === "em_entrega"
                        ? "info"
                        : filterStatus === "entregue"
                        ? "success"
                        : "error"
                    }
                    onDelete={() => setFilterStatus("todos")}
                  />
                )}

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                  sx={{ ml: "auto" }}
                >
                  Limpar filtros
                </Button>
              </Box>
            )}
          </Paper>

          {/* Contagem de pedidos */}
          <Box
            sx={{ mb: 2 }}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Exibindo {filteredPedidos.length} pedido
              {filteredPedidos.length !== 1 ? "s" : ""}{" "}
              {filteredPedidos.length !== pedidos.length &&
                `de ${pedidos.length} total`}
            </Typography>
            <Button onClick={handleFetchPedidos}>
              <RefreshIcon></RefreshIcon>
            </Button>
          </Box>

          {/* Pedidos */}
          {loading && pedidos.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : pedidos.length === 0 ? (
            renderEmptyState()
          ) : filteredPedidos.length === 0 ? (
            renderEmptyFilterState()
          ) : (
            <TableContainer
              component={Paper}
              sx={{ mb: 4, borderRadius: 2, overflowX: "auto" }}
            >
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: "primary.main" }}>
                  <TableRow>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      ID
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Data
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Cliente
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPedidos.map((pedido) => (
                    <TableRow
                      key={pedido._id}
                      hover
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                        cursor: "pointer",
                        bgcolor:
                          pedido.status === "pendente"
                            ? "warning.lightest"
                            : pedido.status === "cancelado"
                            ? "error.lightest"
                            : pedido.status === "entregue"
                            ? "success.lightest"
                            : "inherit",
                      }}
                      onClick={() => handleViewPedido(pedido)}
                    >
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{ fontWeight: "bold" }}
                      >
                        {pedido.orderNumber}
                      </TableCell>
                      <TableCell>{formatDateTime(pedido.orderDate)}</TableCell>
                      <TableCell>{pedido.customer.name}</TableCell>
                      <TableCell>{formatCurrency(pedido.total)}</TableCell>
                      <TableCell>{getStatusChip(pedido.status)}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPedido(pedido);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Dialog para visualizar detalhes do pedido */}
          <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            maxWidth="md"
            fullWidth
          >
            {currentPedido && (
              <>
                <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      Detalhes do Pedido #{currentPedido.orderNumber}
                    </Typography>
                    {getStatusChip(currentPedido.status)}
                  </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 3, mt: 2 }}>
                  <Grid container spacing={3}>
                    {/* Informações do Cliente */}
                    <Grid item xs={12} md={6}>
                      <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            color: "primary.main",
                            fontWeight: "bold",
                          }}
                        >
                          Informações do Cliente
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Nome:
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.customer.name}
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Telefone:
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.customer.phone}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            CEP:
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.customer.customerAddress.cep.toString()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Logradoro:
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.customer.customerAddress.address}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Numero:
                          </Typography>
                          <Typography variant="body2">
                            {
                              currentPedido.customer.customerAddress
                                .addressNumber
                            }
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Bairro:
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.customer.customerAddress.bairro}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Cidade:
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.customer.customerAddress.cidade}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Informações do Pagamento */}
                    <Grid item xs={12} md={6}>
                      <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            color: "primary.main",
                            fontWeight: "bold",
                          }}
                        >
                          Informações do Pagamento
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Forma de Pagamento:
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ textTransform: "capitalize" }}
                          >
                            {currentPedido.payment.method}
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Total:
                          </Typography>
                          <Typography variant="body2">
                            {formatCurrency(currentPedido.total)}
                          </Typography>
                        </Box>
                        {currentPedido.payment.change > 0 && (
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: "bold" }}
                            >
                              Troco para:
                            </Typography>
                            <Typography variant="body2">
                              {formatCurrency(
                                currentPedido.total +
                                  currentPedido.payment.change
                              )}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>

                    {/* Itens do Pedido */}
                    <Grid item xs={12}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            color: "primary.main",
                            fontWeight: "bold",
                          }}
                        >
                          Itens do Pedido
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell align="center">Quantidade</TableCell>
                                <TableCell align="right">Preço Unit.</TableCell>
                                <TableCell align="right">Subtotal</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {currentPedido.items.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell align="center">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatCurrency(item.price)}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatCurrency(item.price * item.quantity)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  align="right"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  Total:
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {formatCurrency(currentPedido.total)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Grid>

                    {/* Observações */}
                    {currentPedido.notes && (
                      <Grid item xs={12}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              mb: 2,
                              color: "primary.main",
                              fontWeight: "bold",
                            }}
                          >
                            Observações
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.notes || "Nenhuma observação"}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}

                    {/* Atualizar Status */}
                    <Grid item xs={12}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            color: "primary.main",
                            fontWeight: "bold",
                          }}
                        >
                          Atualizar Status do Pedido
                        </Typography>
                        {currentPedido.motoboy.phone !== "" ? (
                          <Box display="flex">
                            <Typography
                              fontSize={"12px"}
                              sx={{ mb: 2, color: "secundary.main" }}
                            >
                              Nome do motoboy:
                            </Typography>
                            <Typography
                              fontSize={"12px"}
                              sx={{
                                ml: 0.5,
                                mb: 2,
                                color: "primary.main",
                                fontWeight: "bold",
                              }}
                            >
                              {currentPedido.motoboy.name}
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            display="flex"
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              justifyContent: "space-between", // Distribui os elementos
                              alignItems: "center",
                              mb: 2,
                            }}
                          >
                            <Typography
                              fontSize={"12px"}
                              sx={{
                                color: "primary.main",
                                fontWeight: "bold",
                              }}
                            >
                              Motoboy não encontrado.
                            </Typography>
                            <Button
                              onClick={() =>
                                handleThisFetchPedido(currentPedido._id)
                              }
                            >
                              {loading ? (
                                <CircularProgress
                                  sx={{ width: "14px", height: "14px" }}
                                ></CircularProgress>
                              ) : (
                                <RefreshIcon
                                  sx={{ width: "20px", height: "20px" }}
                                ></RefreshIcon>
                              )}
                            </Button>
                          </Box>
                        )}
                        {currentPedido.status !== "cancelado" &&
                        currentPedido.status !== "entregue" ? (
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              justifyContent: "space-between", // Distribui os elementos
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              {currentPedido.status === "pendente" && (
                                <Button
                                  variant="contained"
                                  color="primary"
                                  startIcon={<CheckIcon />}
                                  onClick={() =>
                                    handleUpdateStatus(
                                      currentPedido._id,
                                      "em_preparo"
                                    )
                                  }
                                >
                                  Iniciar Preparo
                                </Button>
                              )}

                              {currentPedido.status === "em_preparo" && (
                                <Box sx={{ display: "flex", gap: 2 }}>
                                  <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    label="Código do entregador"
                                    onChange={(e) =>
                                      setDriverCode(e.target.value)
                                    }
                                    value={driverCode || ""}
                                    sx={{
                                      maxWidth: { sm: "220px" },
                                    }}
                                  />
                                  <Button
                                    variant="contained"
                                    color="info"
                                    startIcon={<DeliveryIcon />}
                                    onClick={() =>
                                      handleDriverCode(
                                        driverCode,
                                        currentPedido
                                      )
                                    }
                                    sx={{
                                      py: 1,
                                      px: 2,
                                      height: "40px",
                                    }}
                                  >
                                    Enviar para Entrega
                                  </Button>
                                </Box>
                              )}

                              {currentPedido.status === "em_entrega" && (
                                <Button
                                  variant="contained"
                                  color="success"
                                  startIcon={<DoneAllIcon />}
                                  onClick={() =>
                                    handleUpdateStatus(
                                      currentPedido._id,
                                      "entregue"
                                    )
                                  }
                                >
                                  Confirmar Entrega
                                </Button>
                              )}
                            </Box>

                            {/* Botão cancelar sempre à direita */}
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<CloseIcon />}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Tem certeza que deseja cancelar este pedido?"
                                  )
                                ) {
                                  handleUpdateStatus(
                                    currentPedido._id,
                                    "cancelado"
                                  );
                                }
                              }}
                            >
                              Cancelar Pedido
                            </Button>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Este pedido não pode ser atualizado pois já foi{" "}
                            {currentPedido.status === "entregue"
                              ? "entregue"
                              : "cancelado"}
                            .
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenDialog(false)}>Fechar</Button>
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* Dialog para criação de novo pedido */}
          <Dialog
            open={openCreateDialog}
            onClose={handleCloseCreateDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle
              sx={{
                bgcolor: "primary.main",
                color: "white",
                fontWeight: "bold",
              }}
            >
              Criar Novo Pedido
            </DialogTitle>
            <DialogContent sx={{ p: 3, mt: 2 }}>
              {/* Formulário de Pedido */}
              <Grid container spacing={3}>
                {/* Dados do Cliente */}
                <Grid item xs={12} width="100%">
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        color: "primary.main",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <PersonIcon sx={{ mr: 1 }} /> Dados do Cliente
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Nome do Cliente"
                          name="name"
                          value={novoPedido.customer.name}
                          onChange={handleCustomerChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Telefone"
                          name="phone"
                          value={novoPedido.customer.phone}
                          onChange={handleCustomerChange}
                          required
                          placeholder="(XX) XXXXX-XXXX"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon color="primary" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <TextField
                        label="CEP"
                        name="cep"
                        value={novoPedido.customer.customerAddress.cep}
                        onChange={handleCustomerChange}
                        required
                        inputProps={{
                          inputMode: "numeric",
                          pattern: "[0-9]*",
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Grid item xs={12}>
                        <Box sx={{ p: 0, display: "flex" }} columnGap={1}>
                          <TextField
                            fullWidth
                            label="Logradouro"
                            name="address"
                            value={novoPedido.customer.customerAddress.address}
                            onChange={handleCustomerChange}
                            required
                          />

                          <TextField
                            label="Número"
                            name="addressNumber"
                            value={
                              novoPedido.customer.customerAddress.addressNumber
                            }
                            onChange={handleCustomerChange}
                            required
                          />

                          <TextField
                            label="Bairro"
                            name="bairro"
                            value={novoPedido.customer.customerAddress.bairro}
                            onChange={handleCustomerChange}
                            required
                          />

                          <TextField
                            label="Cidade"
                            name="cidade"
                            value={novoPedido.customer.customerAddress.cidade}
                            onChange={handleCustomerChange}
                            required
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Itens do Pedido */}
                <Grid item xs={12} width="100%">
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        color: "primary.main",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ShoppingBagIcon sx={{ mr: 1 }} /> Itens do Pedido
                    </Typography>

                    {/* Adicionar Novo Item */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6} width="300px">
                        <Autocomplete
                          options={produtos}
                          getOptionLabel={(option) => option.productName || ""}
                          onChange={handleProductSelect}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Selecionar Produto"
                              variant="outlined"
                              fullWidth
                            />
                          )}
                          loading={loadingProdutos}
                          isOptionEqualToValue={(option, value) =>
                            option._id === value._id
                          }
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          fullWidth
                          label="Quantidade"
                          type="number"
                          value={currentItem.quantity}
                          onChange={handleQuantityChange}
                          InputProps={{
                            inputProps: { min: 1 },
                          }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={handleAddItem}
                          sx={{ height: "100%" }}
                        >
                          Adicionar Item
                        </Button>
                      </Grid>
                    </Grid>

                    {/* Lista de Itens */}
                    {novoPedido.items.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Produto</TableCell>
                              <TableCell align="center">Quantidade</TableCell>
                              <TableCell align="right">Preço Unit.</TableCell>
                              <TableCell align="right">Subtotal</TableCell>
                              <TableCell align="center">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {novoPedido.items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell align="center">
                                  {item.quantity}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(item.price)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(item.price * item.quantity)}
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveItem(index)}
                                  >
                                    <CloseIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                align="right"
                                sx={{ fontWeight: "bold" }}
                              >
                                Total:
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontWeight: "bold" }}
                              >
                                {formatCurrency(novoPedido.total)}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box sx={{ p: 2, textAlign: "center" }}>
                        <Typography color="text.secondary">
                          Nenhum item adicionado ao pedido
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* Forma de Pagamento */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        color: "primary.main",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <MoneyIcon sx={{ mr: 1 }} /> Forma de Pagamento
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Método de Pagamento</InputLabel>
                      <Select
                        value={novoPedido.payment.method}
                        onChange={handlePaymentMethodChange}
                        label="Método de Pagamento"
                      >
                        <MenuItem value="dinheiro">Dinheiro</MenuItem>
                        <MenuItem value="cartao">Cartão</MenuItem>
                        <MenuItem value="pix">PIX</MenuItem>
                      </Select>
                    </FormControl>

                    {novoPedido.payment.method === "dinheiro" && (
                      <TextField
                        fullWidth
                        label="Troco para"
                        type="number"
                        value={novoPedido.payment.change}
                        onChange={handleChangeValueChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">R$</InputAdornment>
                          ),
                          inputProps: { step: "0.01", min: "0" },
                        }}
                      />
                    )}
                  </Paper>
                </Grid>

                {/* Observações */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
                    <Typography
                      variant="h6"
                      sx={{ mb: 2, color: "primary.main", fontWeight: "bold" }}
                    >
                      Observações
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Observações sobre o pedido..."
                      value={novoPedido.notes}
                      onChange={handleNotesChange}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={handleCloseCreateDialog}>Cancelar</Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreatePedido}
                disabled={loading || novoPedido.items.length === 0}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Criar Pedido"
                )}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar para mensagens */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
              sx={{ width: "100%" }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>

          {/* Botão flutuante para criar pedido (visível em dispositivos móveis) */}
          {isMobile && (
            <Fab
              color="primary"
              aria-label="Adicionar"
              sx={{ position: "fixed", bottom: 16, right: 16 }}
              onClick={handleOpenCreateDialog}
            >
              <AddIcon />
            </Fab>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default Pedidos;
