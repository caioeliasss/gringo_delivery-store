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
  Grid,
  Paper,
  Avatar,
  Divider,
  IconButton,
  Tab,
  Tabs,
  CircularProgress,
  Container,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
} from "@mui/material";
import {
  ShoppingCart as OrderIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  BikeScooter as DeliveryIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  ShoppingBag as ProductsIcon,
  Chat as ChatIcon,
  Logout as LogoutIcon,
  ReportProblem as ReportProblemIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  LocalShipping as ShippingIcon,
  Cancel as CancelIcon,
  RemoveCircleOutline,
  AddCircleOutline,
  RestartAlt,
  AttachMoney,
  Add as AddIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api, { getMotoboy, getMotoboys } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
} from "../../config/menuConfig";
import { mockOrders } from "./mockData";
import "./Orders.css";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import CreateOrderDialog from "./CreateOrderDialog";

const ORDER_STATUS = [
  {
    label: "Buscando motorista",
    value: "pendente",
    icon: PendingIcon,
    color: "warning",
  },
  { label: "Em Preparo", value: "em_preparo", icon: TimeIcon, color: "error" },
  {
    label: "Pronto para Entrega",
    value: "pronto_retirada",
    icon: CheckCircleIcon,
    color: "success",
  },
  {
    label: "Em Entrega",
    value: "em_entrega",
    icon: ShippingIcon,
    color: "info",
  },
  {
    label: "Entregue",
    value: "entregue",
    icon: CheckCircleIcon,
    color: "success",
  },
  { label: "Cancelado", value: "cancelado", icon: CancelIcon, color: "error" },
];
//TODO criar visual de motoboy aguardando
export default function OrdersPage() {
  // Hook para carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [atribuirMotoboyModal, setAtribuirMotoboyModal] = useState(false);
  const [closeMotoboyModal, setCloseMotoboyModal] = useState(false);
  const [selectedMotoboy, setSelectedMotoboy] = useState("");
  const [motoboys, setMotoboys] = useState([]);
  const [priceModal, setPriceModal] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [openCreateOrderDialog, setOpenCreateOrderDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, selectedStatuses]);

  useEffect(() => {
    // Verificar se há um orderId passado via state
    if (location.state?.orderId && orders.length > 0) {
      const targetOrder = orders.find(
        (order) => order._id === location.state.orderId
      );
      if (targetOrder) {
        openDetails(targetOrder);
        // Limpar o state para evitar abrir novamente
        navigate(location.pathname, { replace: true });
      } else {
        // Se não encontrou o pedido, tentar buscar diretamente na API
        fetchSpecificOrder(location.state.orderId);
      }
    }
  }, [orders, location.state, navigate, location.pathname]);

  const fetchSpecificOrder = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      const order = response.data;
      if (order) {
        openDetails(order);
        // Limpar o state para evitar abrir novamente
        navigate(location.pathname, { replace: true });
      }
    } catch (error) {
      console.error("Erro ao buscar pedido específico:", error);
      // Mostrar uma mensagem de erro ou notificação
      alert(`Pedido ${orderId} não encontrado.`);
    }
  };

  useEffect(() => {
    if (atribuirMotoboyModal) {
      const fetchMotoboys = async () => {
        try {
          const response = await api.get("/motoboys");
          setMotoboys(response.data);
        } catch (error) {
          console.error("Erro ao buscar motoboys:", error);
          alert("Erro ao buscar motoboys. Tente novamente.");
        }
      };
      fetchMotoboys();
    }
  }, [atribuirMotoboyModal]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Simular delay da API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await api.get("/orders/all");
      const fetchedOrders = response.data;
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      // Usar dados mock em caso de erro na API
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (selectedStatuses.length === 0) {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(
        orders.filter((order) => selectedStatuses.includes(order.status))
      );
    }
  };

  const handleAssignMotoboy = async (body) => {
    if (!selectedMotoboy) {
      alert("Selecione um entregador para atribuir ao pedido.");
      return;
    }

    const { orderId, motoboyId } = body;
    try {
      const response = await api.put(`/motoboys/assign`, {
        motoboyId: motoboyId,
        orderId: orderId,
      });

      if (response.status === 200) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId
              ? { ...order, motoboy: response.data.motoboy }
              : order
          )
        );
        setSelectedOrder((prevOrder) =>
          prevOrder?._id === orderId
            ? { ...prevOrder, motoboy: response.data.motoboy }
            : prevOrder
        );
      }
    } catch (error) {
      console.error("Erro ao atribuir entregador:", error);
      alert("Erro ao atribuir entregador. Tente novamente.");
    } finally {
      setAtribuirMotoboyModal(false);
    }
  };

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setSelectedStatuses(typeof value === "string" ? value.split(",") : value);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const openDetails = async (order) => {
    try {
      setSelectedOrder(order);
      if (order?.motoboy?.motoboyId) {
        await getMotoboyApi(order.motoboy.motoboyId);
      }
      setDetailsModal(true);
    } catch (error) {
      console.error("Erro ao abrir detalhes:", error);
      setSelectedOrder(order);
      setDetailsModal(true);
    }
  };

  const closeDetails = () => {
    setSelectedOrder(null);
    setSelectedMotoboy(null);
    setDetailsModal(false);
  };

  const getStatusChip = (status) => {
    const statusConfig =
      ORDER_STATUS.find((s) => s.value === status) || ORDER_STATUS[0];

    return (
      <Chip
        icon={<statusConfig.icon fontSize="small" />}
        label={statusConfig.label}
        color={statusConfig.color}
        variant="outlined"
        size="small"
      />
    );
  };

  const handleRemoveDeliveryBoy = async (motoboyId, orderId) => {
    try {
      const response = await api.delete(
        `/motoboys/removeMotoboyFromOrder/${orderId}/${motoboyId}`
      );

      if (response.status === 200) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId ? { ...order, motoboy: null } : order
          )
        );
        setSelectedOrder((prevOrder) =>
          prevOrder?._id === orderId
            ? { ...prevOrder, motoboy: null }
            : prevOrder
        );
      }
    } catch (error) {
      console.error("Erro ao remover entregador:", error);
      alert("Erro ao remover entregador. Tente novamente.");
    }
  };

  const handleFindMotoboys = async (orderId) => {
    try {
      const response = await api.get(`/motoboys/find?order_id=${orderId}`);
      if (response.status === 200) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId
              ? { ...order, motoboy: response.data.motoboy }
              : order
          )
        );
        setSelectedOrder((prevOrder) =>
          prevOrder?._id === orderId
            ? { ...prevOrder, motoboy: response.data.motoboy }
            : prevOrder
        );
        closeDetails();
      }
    } catch (error) {
      console.error("Erro ao encontrar motoboys:", error);
      alert("Erro ao encontrar motoboys. Tente novamente.");
    }
  };

  const openPriceModal = () => {
    setNewPrice(selectedOrder?.motoboy?.price?.toString() || "");
    setPriceModal(true);
  };

  const handlePriceChange = async () => {
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      alert("Por favor, insira um preço válido.");
      return;
    }

    try {
      const response = await api.put(
        `/travels/priceOrder/${selectedOrder._id}`,
        {
          price: parseFloat(newPrice),
        }
      );

      if (response.status === 200) {
        // Atualizar o preço no estado local
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === selectedOrder._id
              ? {
                  ...order,
                  motoboy: {
                    ...order.motoboy,
                    price: parseFloat(newPrice),
                  },
                }
              : order
          )
        );

        setSelectedOrder((prevOrder) => ({
          ...prevOrder,
          motoboy: {
            ...prevOrder.motoboy,
            price: parseFloat(newPrice),
          },
        }));

        setPriceModal(false);
        setNewPrice("");
        alert("Preço da corrida atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao atualizar preço:", error);
      alert("Erro ao atualizar preço. Tente novamente.");
    }
  };

  const createFontAwesomeMarker = (type, status) => {
    if (!window.google || !window.google.maps) {
      return null;
    }

    const colors = {
      motoboy: {
        available: "#2196F3",
        offline: "#9E9E9E",
      },
      store: {
        approved: "#4CAF50",
        pending: "#F44336",
      },
      customer: {
        approved: "#FF9800",
        pending: "#FF5722",
      },
    };

    let color, emoji;

    if (type === "motoboy") {
      color =
        status === "available"
          ? colors.motoboy.available
          : colors.motoboy.offline;
      emoji = "🏍️";
    } else if (type === "customer") {
      color =
        status === "approved"
          ? colors.customer.approved
          : colors.customer.pending;
      emoji = "👤";
    } else {
      color =
        status === "approved" ? colors.store.approved : colors.store.pending;
      emoji = "🏪";
    }

    try {
      const iconSvg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="3"/>
          <text x="20" y="25" text-anchor="middle" fill="${color}" font-size="16" font-family="Arial, sans-serif" font-weight="900">
            ${emoji}
          </text>
        </svg>
      `;

      const svgDataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        iconSvg
      )}`;

      return {
        url: svgDataUrl,
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
      };
    } catch (error) {
      console.error("Erro ao criar marcador:", error);
      return null;
    }
  };

  const getMotoboyApi = async (motoboyId) => {
    try {
      if (!motoboyId) {
        console.warn("Nenhum motoboy selecionado.");
        return;
      }
      const motoboy = await getMotoboy(motoboyId);
      const data = motoboy.data || motoboy;
      if (data) {
        setSelectedMotoboy(data);
      }
    } catch (error) {
      console.error("Erro ao buscar motoboy:", error);
      alert("Erro ao buscar motoboy. Tente novamente.");
    }
  };

  const renderMarkers = () => {
    const markers = [];

    // Verificar se Google Maps está disponível e carregado
    if (!isLoaded || loadError) {
      console.log("❌ Google Maps API não está disponível ou houve erro");
      return markers;
    }

    // Markers dos motoboys
    if (
      selectedMotoboy &&
      selectedMotoboy.coordinates &&
      Array.isArray(selectedMotoboy.coordinates) &&
      selectedMotoboy.coordinates.length === 2
    ) {
      const motoboy = selectedMotoboy;

      const icon = createFontAwesomeMarker(
        "motoboy",
        motoboy.isAvailable ? "available" : "offline"
      );

      if (icon) {
        markers.push(
          <Marker
            key={`motoboy-${motoboy._id || "unknown"}`}
            position={{
              lat: parseFloat(motoboy.coordinates[1]),
              lng: parseFloat(motoboy.coordinates[0]),
            }}
            icon={icon}
            title={`Motoboy: ${motoboy.name || "Sem nome"}`}
          />
        );
      }
    }

    if (selectedOrder && selectedOrder.store) {
      const store = selectedOrder.store;

      // Verificar coordenadas da loja
      const storeCoords = store.coordinates || store.address?.coordinates;

      if (
        storeCoords &&
        Array.isArray(storeCoords) &&
        storeCoords.length === 2
      ) {
        const icon = createFontAwesomeMarker(
          "store",
          store.cnpj_approved ? "approved" : "pending"
        );
        const iconCustomer = createFontAwesomeMarker(
          "customer",
          store.cnpj_approved ? "approved" : "pending"
        );

        if (icon) {
          markers.push(
            <Marker
              key={`store-${store._id || "unknown"}`}
              position={{
                lat: parseFloat(storeCoords[1]),
                lng: parseFloat(storeCoords[0]),
              }}
              icon={icon}
              title={`Loja: ${
                store.businessName || store.displayName || "Sem nome"
              }`}
            />
          );
        }

        // Markers dos clientes
        if (selectedOrder.customer && Array.isArray(selectedOrder.customer)) {
          selectedOrder.customer.forEach((customer, index) => {
            const customerCoords =
              customer.address?.coordinates ||
              customer.customerAddress?.coordinates;

            if (
              customerCoords &&
              Array.isArray(customerCoords) &&
              customerCoords.length === 2 &&
              iconCustomer
            ) {
              markers.push(
                <Marker
                  key={`customer-${customer._id || index}`}
                  position={{
                    lat: parseFloat(customerCoords[1]),
                    lng: parseFloat(customerCoords[0]),
                  }}
                  icon={iconCustomer}
                  title={`Cliente: ${customer.name || "Sem nome"}`}
                />
              );
            }
          });
        }
      } else {
        console.log(
          `❌ Store sem coordenadas válidas: ${
            store.businessName || store.displayName || "Sem nome"
          }`
        );
      }
    }

    // console.log(`🎯 Total de markers criados: ${markers.length}`);
    return markers;
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatAddress = (address) => {
    if (typeof address === "string") {
      return address;
    }

    if (typeof address === "object" && address !== null) {
      const parts = [];
      if (address.address) parts.push(address.address);
      if (address.addressNumber) parts.push(address.addressNumber);
      if (address.bairro) parts.push(`- ${address.bairro}`);
      if (address.cidade) parts.push(`- ${address.cidade}`);
      if (address.cep) parts.push(`- CEP: ${address.cep}`);

      return parts.join(", ").replace(/,\s*-/g, " -");
    }

    return "Endereço não informado";
  };

  // Usar configuração centralizada de menu
  const menuItems = SUPPORT_MENU_ITEMS;

  // Definir itens de rodapé para SideDrawer
  const footerItems = createSupportFooterItems(handleLogout);

  return (
    <>
      {/* Tela de carregamento da API do Google Maps */}
      {!isLoaded && !loadError && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Carregando Google Maps...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aguarde um momento
            </Typography>
          </Box>
        </Box>
      )}

      {/* Erro de carregamento da API */}
      {loadError && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Box sx={{ textAlign: "center", maxWidth: 400, p: 3 }}>
            <Typography variant="h6" color="error" sx={{ mb: 2 }}>
              Erro ao carregar Google Maps
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Verifique sua conexão com a internet e recarregue a página.
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </Button>
          </Box>
        </Box>
      )}

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
                onClick={() => setDrawerOpen(true)}
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

        {/* SideDrawer */}
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
          />
        )}

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
              className="header-section"
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
              <OrderIcon sx={{ mr: 2, color: "primary.main" }} />
              <Typography variant="h4" fontWeight="bold" sx={{ flexGrow: 1 }}>
                Pedidos
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreateOrderDialog(true)}
                sx={{
                  borderRadius: 2,
                  fontWeight: "bold",
                  px: 3,
                }}
              >
                Adicionar Corrida
              </Button>
            </Box>

            {/* Filtros */}
            <Paper className="filter-section" sx={{ mb: 3, p: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Status</InputLabel>
                <Select
                  multiple
                  value={selectedStatuses}
                  onChange={handleStatusChange}
                  input={<OutlinedInput label="Filtrar por Status" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        const status = ORDER_STATUS.find(
                          (s) => s.value === value
                        );
                        return (
                          <Chip
                            key={value}
                            label={status?.label || value}
                            size="small"
                            color={status?.color || "default"}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {ORDER_STATUS.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      <Checkbox
                        checked={selectedStatuses.indexOf(status.value) > -1}
                      />
                      <ListItemText primary={status.label} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* Lista de Pedidos */}
            {loading ? (
              <Box
                className="loading-spinner"
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 300,
                }}
              >
                <CircularProgress size={40} />
              </Box>
            ) : filteredOrders.length === 0 ? (
              <Paper
                className="empty-state"
                sx={{
                  p: 6,
                  textAlign: "center",
                  backgroundColor: "grey.50",
                }}
              >
                <OrderIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhum pedido encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedStatuses.length > 0
                    ? "Tente ajustar os filtros para ver mais pedidos."
                    : "Os pedidos aparecerão aqui quando forem criados."}
                </Typography>
              </Paper>
            ) : (
              <Paper className="orders-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pedido</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Entregador</TableCell>
                      <TableCell>Data</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map((order, index) => (
                      <TableRow
                        key={order.id || index}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                        onClick={() => openDetails(order)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Avatar
                              sx={{
                                bgcolor: "primary.light",
                                color: "primary.contrastText",
                                mr: 1,
                                width: 32,
                                height: 32,
                              }}
                            >
                              <OrderIcon fontSize="small" />
                            </Avatar>
                            #{order.orderNumber || order.id}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {Array.isArray(order.customer)
                              ? order.customer
                                  .map((customer) => customer.name)
                                  .join(", ")
                              : order.customer?.name || "Cliente não informado"}
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusChip(order.status)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(order.total || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {order.motoboy?.name || "Não atribuído"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(order.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(order);
                            }}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Modal de Detalhes */}
            <Dialog
              open={atribuirMotoboyModal}
              onClose={() => setAtribuirMotoboyModal(false)}
              maxWidth="sm"
              fullWidth
              className="motoboy-modal"
              PaperProps={{
                sx: { borderRadius: 2 },
              }}
            >
              <DialogTitle
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <DeliveryIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Atribuir Entregador ao Pedido #
                    {selectedOrder?.orderNumber || selectedOrder?.id}
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setCloseMotoboyModal(true)}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Selecione um entregador para atribuir ao pedido.
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Entregador</InputLabel>
                  <Select
                    value={selectedMotoboy}
                    onChange={(e) => setSelectedMotoboy(e.target.value)}
                    label="Entregador"
                  >
                    {motoboys.map((motoboy) => (
                      <MenuItem key={motoboy._id} value={motoboy._id}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            src={motoboy.avatar || ""}
                            sx={{ mr: 1, width: 32, height: 32 }}
                          >
                            {motoboy.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">
                            {motoboy.name}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setAtribuirMotoboyModal(false)}
                  color="secondary"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    handleAssignMotoboy({
                      orderId: selectedOrder._id,
                      motoboyId: selectedMotoboy,
                    })
                  }
                  color="primary"
                  disabled={!selectedMotoboy}
                >
                  Alocar Entregador
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={detailsModal}
              onClose={closeDetails}
              maxWidth="lg"
              fullWidth
              className="details-modal"
              PaperProps={{
                sx: { borderRadius: 2 },
              }}
            >
              <DialogTitle
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <OrderIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Detalhes do Pedido #
                    {selectedOrder?.orderNumber || selectedOrder?.id}
                  </Typography>
                </Box>
                <IconButton onClick={closeDetails} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent>
                {selectedOrder && (
                  <Box sx={{ mt: 2 }}>
                    {/* Status e Data */}
                    <Box
                      sx={{
                        mb: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      {getStatusChip(selectedOrder.status)}
                      <Typography variant="body2" color="text.secondary">
                        Criado em: {formatDate(selectedOrder.createdAt)}
                      </Typography>
                    </Box>

                    <Grid container spacing={3} direction={"column"}>
                      {/* Informações do Cliente */}
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" className="info-card">
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <PersonIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Cliente
                              </Typography>
                            </Box>

                            <Stack spacing={1}>
                              <Typography variant="body1" fontWeight="medium">
                                {Array.isArray(selectedOrder.customer)
                                  ? selectedOrder.customer
                                      .map((customer) => customer.name)
                                      .join(", ")
                                  : selectedOrder.customer?.name ||
                                    "Nome não informado"}
                              </Typography>

                              {/* Telefones dos clientes */}
                              {Array.isArray(selectedOrder.customer)
                                ? selectedOrder.customer.map(
                                    (customer, index) =>
                                      customer.phone && (
                                        <Box
                                          key={`phone-${index}`}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <PhoneIcon
                                            sx={{
                                              mr: 1,
                                              fontSize: 16,
                                              color: "text.secondary",
                                            }}
                                          />
                                          <Typography variant="body2">
                                            {customer.name}: {customer.phone}
                                          </Typography>
                                        </Box>
                                      )
                                  )
                                : selectedOrder.customer?.phone && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <PhoneIcon
                                        sx={{
                                          mr: 1,
                                          fontSize: 16,
                                          color: "text.secondary",
                                        }}
                                      />
                                      <Typography variant="body2">
                                        {selectedOrder.customer.phone}
                                      </Typography>
                                    </Box>
                                  )}

                              {/* Emails dos clientes */}
                              {Array.isArray(selectedOrder.customer)
                                ? selectedOrder.customer.map(
                                    (customer, index) =>
                                      customer.email && (
                                        <Box
                                          key={`email-${index}`}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <EmailIcon
                                            sx={{
                                              mr: 1,
                                              fontSize: 16,
                                              color: "text.secondary",
                                            }}
                                          />
                                          <Typography variant="body2">
                                            {customer.name}: {customer.email}
                                          </Typography>
                                        </Box>
                                      )
                                  )
                                : selectedOrder.customer?.email && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <EmailIcon
                                        sx={{
                                          mr: 1,
                                          fontSize: 16,
                                          color: "text.secondary",
                                        }}
                                      />
                                      <Typography variant="body2">
                                        {selectedOrder.customer.email}
                                      </Typography>
                                    </Box>
                                  )}

                              {/* Endereços de entrega */}
                              {Array.isArray(selectedOrder.customer)
                                ? selectedOrder.customer.map(
                                    (customer, index) =>
                                      customer.customerAddress && (
                                        <Box
                                          key={`address-${index}`}
                                          sx={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            mb: customer.customerAddress
                                              ? 1
                                              : 0,
                                          }}
                                        >
                                          <LocationIcon
                                            sx={{
                                              mr: 1,
                                              fontSize: 16,
                                              color: "text.secondary",
                                              mt: 0.5,
                                            }}
                                          />
                                          <Box>
                                            <Typography
                                              variant="body2"
                                              fontWeight="medium"
                                            >
                                              {customer.name}:
                                            </Typography>
                                            <Typography variant="body2">
                                              {formatAddress(
                                                customer.customerAddress
                                              )}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      )
                                  )
                                : selectedOrder.deliveryAddress && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                      }}
                                    >
                                      <LocationIcon
                                        sx={{
                                          mr: 1,
                                          fontSize: 16,
                                          color: "text.secondary",
                                          mt: 0.5,
                                        }}
                                      />
                                      <Typography variant="body2">
                                        {formatAddress(
                                          selectedOrder.deliveryAddress
                                        )}
                                      </Typography>
                                    </Box>
                                  )}
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                $ Forma de pagamento:{" "}
                                {selectedOrder.payment?.method}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Informações do Estabelecimento */}
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" className="info-card">
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <StoreIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Estabelecimento
                              </Typography>
                            </Box>

                            <Stack spacing={1}>
                              <Typography variant="body1" fontWeight="medium">
                                {selectedOrder.store?.name ||
                                  "Estabelecimento não informado"}
                              </Typography>

                              {selectedOrder.store?.phone && (
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  <PhoneIcon
                                    sx={{
                                      mr: 1,
                                      fontSize: 16,
                                      color: "text.secondary",
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {selectedOrder.store.phone}
                                  </Typography>
                                </Box>
                              )}

                              {selectedOrder.store?.address && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <LocationIcon
                                    sx={{
                                      mr: 1,
                                      fontSize: 16,
                                      color: "text.secondary",
                                      mt: 0.5,
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {formatAddress(selectedOrder.store.address)}
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Informações do Entregador */}
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" className="info-card">
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <DeliveryIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Entregador
                              </Typography>
                            </Box>

                            {selectedOrder.motoboy &&
                            selectedOrder.motoboy.motoboyId ? (
                              <Stack spacing={1}>
                                <Typography variant="body1" fontWeight="medium">
                                  {selectedOrder.motoboy.name}
                                </Typography>

                                {selectedOrder.motoboy.motoboyId && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <PhoneIcon
                                      sx={{
                                        mr: 1,
                                        fontSize: 16,
                                        color: "text.secondary",
                                      }}
                                    />
                                    <Typography variant="body2">
                                      {selectedOrder.motoboy.phone}
                                    </Typography>
                                  </Box>
                                )}

                                {selectedOrder.motoboy.vehicle && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Veículo: {selectedOrder.motoboy.vehicle}
                                  </Typography>
                                )}
                                <Button
                                  onClick={() =>
                                    handleRemoveDeliveryBoy(
                                      selectedOrder.motoboy.motoboyId,
                                      selectedOrder._id
                                    )
                                  }
                                >
                                  <RemoveCircleOutline sx={{ mr: 1 }} />
                                  Remover Entregador
                                </Button>
                              </Stack>
                            ) : (
                              <Stack>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  style={{ fontStyle: "italic" }}
                                >
                                  Entregador não atribuído
                                </Typography>
                                <Button
                                  sx={{ mt: 1 }}
                                  onClick={() => setAtribuirMotoboyModal(true)}
                                >
                                  <AddCircleOutline sx={{ mr: 1 }} />
                                  Alocar Entregador
                                </Button>
                                <Button
                                  onClick={() => {
                                    handleFindMotoboys(selectedOrder._id);
                                  }}
                                >
                                  <RestartAlt sx={{ mr: 1 }} />
                                  Iniciar Fila
                                </Button>
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Itens do Pedido */}
                    {selectedOrder.items && selectedOrder.items.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ mb: 2 }}
                        >
                          Itens do Pedido
                        </Typography>
                        <Card variant="outlined">
                          <CardContent>
                            {selectedOrder.items.map((item, index) => (
                              <Box key={index}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    py: 1,
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      variant="body1"
                                      fontWeight="medium"
                                    >
                                      {item.productName}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Quantidade: {item.quantity}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body1" fontWeight="bold">
                                    {formatCurrency(item.price * item.quantity)}
                                  </Typography>
                                </Box>
                                {index < selectedOrder.items.length - 1 && (
                                  <Divider />
                                )}
                              </Box>
                            ))}
                            <Divider sx={{ my: 2 }} />
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Typography variant="h6" fontWeight="bold">
                                Total
                              </Typography>
                              <Typography
                                variant="h6"
                                fontWeight="bold"
                                color="primary.main"
                              >
                                {formatCurrency(selectedOrder.total || 0)}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    )}

                    {/* Informações da Corrida //TODO alterar o visual das infos */}
                    {selectedOrder.motoboy && (
                      <Box sx={{ mt: 3 }}>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ mb: 2 }}
                        >
                          Info da Corrida
                        </Typography>
                        <Card variant="outlined">
                          <CardContent>
                            <Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  py: 1,
                                }}
                              >
                                <Box>
                                  <Typography
                                    variant="body1"
                                    fontWeight="medium"
                                  >
                                    Valores
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Preço da corrida:{" "}
                                    {formatCurrency(
                                      selectedOrder.motoboy?.price
                                    )}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Distancia: {selectedOrder.delivery.distance}
                                    km
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Chuva:{" "}
                                    {selectedOrder.delivery.priceList?.isRain
                                      ? "Sim"
                                      : "Não"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Alta demanda:{" "}
                                    {selectedOrder.delivery.priceList
                                      ?.isHighDemand
                                      ? "Sim"
                                      : "Não"}
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    fontWeight="medium"
                                    mt={1}
                                  >
                                    Códigos
                                  </Typography>

                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Codigo Motorista:{" "}
                                    {selectedOrder.motoboy?.phone?.slice(-4)}
                                  </Typography>

                                  {Array.isArray(selectedOrder.customer) ? (
                                    selectedOrder.customer.map(
                                      (customer, index) => (
                                        <Box
                                          key={`customer-${index}`}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                          >
                                            Código do cliente {customer.name}:{" "}
                                            {customer.phone}
                                          </Typography>
                                        </Box>
                                      )
                                    )
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Codigo Cliente:{" "}
                                      {selectedOrder.customer[0]?.phone?.slice(
                                        -4
                                      )}
                                    </Typography>
                                  )}
                                  <Button
                                    sx={{ mt: 1 }}
                                    onClick={() => openPriceModal()}
                                    variant="outlined"
                                    size="small"
                                  >
                                    <AttachMoney sx={{ mr: 1 }} />
                                    Alterar preço da corrida
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                        <Card variant="outlined" sx={{ mt: 2 }}>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">
                              Mapa da entrega
                            </Typography>
                            {selectedOrder &&
                              (selectedOrder?.store?.coordinates ||
                                selectedOrder?.store?.address?.coordinates) && (
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: "600px",
                                    position: "relative",
                                  }}
                                >
                                  <GoogleMap
                                    mapContainerStyle={{
                                      width: "100%",
                                      height: "600px",
                                    }}
                                    center={{
                                      lat:
                                        selectedOrder?.store
                                          ?.coordinates?.[1] ||
                                        selectedOrder?.store?.address
                                          ?.coordinates?.[1] ||
                                        -23.5505,
                                      lng:
                                        selectedOrder?.store
                                          ?.coordinates?.[0] ||
                                        selectedOrder?.store?.address
                                          ?.coordinates?.[0] ||
                                        -46.6333,
                                    }}
                                    zoom={11}
                                    options={{
                                      zoomControl: true,
                                      mapTypeControl: true,
                                      scaleControl: true,
                                      streetViewControl: true,
                                      rotateControl: false,
                                      fullscreenControl: true,
                                      styles: [
                                        {
                                          featureType: "poi",
                                          elementType: "labels",
                                          stylers: [{ visibility: "off" }],
                                        },
                                      ],
                                    }}
                                  >
                                    {renderMarkers()}
                                  </GoogleMap>
                                </Box>
                              )}
                            {true && (
                              <Box
                                sx={{
                                  width: "100%",
                                  height: "200px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "grey.100",
                                  borderRadius: 1,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Carregando mapa...
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    )}
                  </Box>
                )}
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={closeDetails} color="inherit">
                  Fechar
                </Button>
              </DialogActions>
            </Dialog>

            {/* Modal para Alterar Preço */}
            <Dialog
              open={priceModal}
              onClose={() => setPriceModal(false)}
              maxWidth="sm"
              fullWidth
              className="price-modal"
              PaperProps={{
                sx: { borderRadius: 2 },
              }}
            >
              <DialogTitle
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AttachMoney sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Alterar Preço da Corrida
                  </Typography>
                </Box>
                <IconButton onClick={() => setPriceModal(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Pedido #{selectedOrder?.orderNumber || selectedOrder?.id}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Preço atual:{" "}
                    {formatCurrency(selectedOrder?.motoboy?.price || 0)}
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  label="Novo Preço (R$)"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  type="number"
                  inputProps={{
                    step: "0.01",
                    min: "0",
                  }}
                  placeholder="Ex: 15.50"
                  autoFocus
                />

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Digite apenas o valor numérico (sem R$)
                </Typography>
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={() => setPriceModal(false)} color="inherit">
                  Cancelar
                </Button>
                <Button
                  onClick={handlePriceChange}
                  color="primary"
                  variant="contained"
                  disabled={!newPrice || isNaN(parseFloat(newPrice))}
                >
                  Confirmar Alteração
                </Button>
              </DialogActions>
            </Dialog>

            {/* Dialog de Criação de Corrida */}
            <CreateOrderDialog
              open={openCreateOrderDialog}
              onClose={() => setOpenCreateOrderDialog(false)}
              onOrderCreated={(newOrder) => {
                // Adicionar o novo pedido à lista
                setOrders((prevOrders) => [newOrder, ...prevOrders]);
                // Mostrar mensagem de sucesso (opcional)
                console.log("Nova corrida criada:", newOrder);
              }}
            />
          </Container>
        </Box>
      </Box>
    </>
  );
}
