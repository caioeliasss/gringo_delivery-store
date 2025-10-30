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
  Badge,
  InputAdornment,
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
  Schedule as ScheduleIcon,
  RemoveCircleOutline,
  AddCircleOutline,
  RestartAlt,
  AttachMoney,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api, {
  getMotoboy,
  getMotoboys,
  updateOrderStatus,
} from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
  getFilteredSupportMenuItems,
} from "../../config/menuConfig";
import { mockOrders } from "./mockData";
import "./Orders.css";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";
import CreateOrderDialog from "./CreateOrderDialog";
import { useSuporteAuth } from "../../contexts/SuporteAuthContext";
import {
  uploadStoreProfileImage,
  deleteStoreProfileImage,
} from "../../services/storageService";
import DeliveryRouteMap from "../../components/DeliveryRouteMap";

const ORDER_STATUS = [
  {
    label: "Pendente",
    value: "pendente",
    icon: PendingIcon,
    color: "warning",
    type: "order",
  },
  {
    label: "Agendado",
    value: "agendado",
    icon: ScheduleIcon,
    color: "info",
    type: "order",
  },
  { label: "Em Preparo", value: "em_preparo", icon: TimeIcon, color: "error" },
  {
    label: "Pronto para Entrega",
    value: "pronto_retirada",
    icon: CheckCircleIcon,
    color: "success",
    type: "order",
  },
  {
    label: "Em Entrega",
    value: "em_entrega",
    icon: ShippingIcon,
    color: "info",
    type: "order",
  },
  {
    label: "Entregue",
    value: "entregue",
    icon: CheckCircleIcon,
    color: "success",
    type: "order",
  },
  {
    label: "Cancelado",
    value: "cancelado",
    icon: CancelIcon,
    color: "error",
    type: "order",
  },
  {
    label: "Erro na Fila",
    value: "fila_cancelada",
    icon: CancelIcon,
    color: "error",
    type: "fila",
  },
  {
    label: "Confirmado",
    value: "confirmado",
    icon: CheckCircleIcon,
    color: "success",
    type: "fila",
  },
  {
    label: "Buscando",
    value: "buscando",
    icon: PendingIcon,
    color: "warning",
    type: "fila",
  },
];
//TODO criar visual de motoboy aguardando
export default function OrdersPage() {
  // Hook para carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script-orders",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "maps", "geometry"],
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedMotoboys, setSelectedMotoboys] = useState([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [priceFilter, setPriceFilter] = useState({ min: "", max: "" });
  const [searchText, setSearchText] = useState("");
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
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [loadingStatusUpdate, setLoadingStatusUpdate] = useState(false);
  const [profileImageModal, setProfileImageModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estados para rotas
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [directionsRequest, setDirectionsRequest] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    fetchOrders();
    loadSavedFilters();
  }, []);

  // Salvar filtros no localStorage
  const saveFiltersToStorage = () => {
    const filters = {
      selectedStatuses,
      selectedStores,
      selectedMotoboys,
      selectedPaymentMethods,
      dateFilter,
      priceFilter,
      searchText,
    };
    localStorage.setItem("ordersFilters", JSON.stringify(filters));
  };

  // Carregar filtros do localStorage
  const loadSavedFilters = () => {
    try {
      const savedFilters = localStorage.getItem("ordersFilters");
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        if (filters.selectedStatuses)
          setSelectedStatuses(filters.selectedStatuses);
        if (filters.selectedStores) setSelectedStores(filters.selectedStores);
        if (filters.selectedMotoboys)
          setSelectedMotoboys(filters.selectedMotoboys);
        if (filters.selectedPaymentMethods)
          setSelectedPaymentMethods(filters.selectedPaymentMethods);
        if (filters.dateFilter) setDateFilter(filters.dateFilter);
        if (filters.priceFilter) setPriceFilter(filters.priceFilter);
        if (filters.searchText) setSearchText(filters.searchText);
      }
    } catch (error) {
      console.error("Erro ao carregar filtros salvos:", error);
    }
  };

  // Salvar filtros sempre que mudarem
  useEffect(() => {
    saveFiltersToStorage();
  }, [
    selectedStatuses,
    selectedStores,
    selectedMotoboys,
    selectedPaymentMethods,
    dateFilter,
    priceFilter,
    searchText,
  ]);

  useEffect(() => {
    applyFilters();
  }, [
    orders,
    selectedStatuses,
    selectedStores,
    selectedMotoboys,
    selectedPaymentMethods,
    dateFilter,
    priceFilter,
    searchText,
  ]);

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
    let filtered = [...orders];

    // Filtro por status
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(
        (order) =>
          selectedStatuses.includes(order.status) ||
          selectedStatuses.includes(order.motoboy?.queue?.status)
      );
    }

    // Filtro por lojas
    if (selectedStores.length > 0) {
      filtered = filtered.filter((order) =>
        selectedStores.includes(order.store?._id)
      );
    }

    // Filtro por entregadores
    if (selectedMotoboys.length > 0) {
      filtered = filtered.filter((order) =>
        selectedMotoboys.includes(order.motoboy?.motoboyId)
      );
    }

    // Filtro por método de pagamento
    if (selectedPaymentMethods.length > 0) {
      filtered = filtered.filter((order) =>
        selectedPaymentMethods.includes(order.payment?.method)
      );
    }

    // Filtro por data
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
        const endDate = dateFilter.end
          ? new Date(dateFilter.end + "T23:59:59")
          : null;

        if (startDate && endDate) {
          return orderDate >= startDate && orderDate <= endDate;
        } else if (startDate) {
          return orderDate >= startDate;
        } else if (endDate) {
          return orderDate <= endDate;
        }
        return true;
      });
    }

    // Filtro por preço
    if (priceFilter.min || priceFilter.max) {
      filtered = filtered.filter((order) => {
        const total = order.total || 0;
        const minPrice = priceFilter.min ? parseFloat(priceFilter.min) : 0;
        const maxPrice = priceFilter.max
          ? parseFloat(priceFilter.max)
          : Infinity;

        return total >= minPrice && total <= maxPrice;
      });
    }

    // Filtro por texto (busca)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((order) => {
        // Buscar em número do pedido
        const orderNumber = (order.orderNumber || order.id || "")
          .toString()
          .toLowerCase();

        // Buscar em nome do cliente
        const customerName = Array.isArray(order.customer)
          ? order.customer
              .map((c) => c.name || "")
              .join(" ")
              .toLowerCase()
          : (order.customer?.name || "").toLowerCase();

        // Buscar em nome da loja
        const storeName = (order.store?.name || "").toLowerCase();

        // Buscar em nome do entregador
        const motoboyName = (order.motoboy?.name || "").toLowerCase();

        // Buscar em telefone do cliente
        const customerPhone = Array.isArray(order.customer)
          ? order.customer.map((c) => c.phone || "").join(" ")
          : order.customer?.phone || "";

        return (
          orderNumber.includes(searchLower) ||
          customerName.includes(searchLower) ||
          storeName.includes(searchLower) ||
          motoboyName.includes(searchLower) ||
          customerPhone.includes(searchText)
        );
      });
    }

    setFilteredOrders(filtered);
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

  const handleStoreChange = (event) => {
    const value = event.target.value;
    setSelectedStores(typeof value === "string" ? value.split(",") : value);
  };

  const handleMotoboyChange = (event) => {
    const value = event.target.value;
    setSelectedMotoboys(typeof value === "string" ? value.split(",") : value);
  };

  const handlePaymentMethodChange = (event) => {
    const value = event.target.value;
    setSelectedPaymentMethods(
      typeof value === "string" ? value.split(",") : value
    );
  };

  const handleClearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedStores([]);
    setSelectedMotoboys([]);
    setSelectedPaymentMethods([]);
    setDateFilter({ start: "", end: "" });
    setPriceFilter({ min: "", max: "" });
    setSearchText("");
    localStorage.removeItem("ordersFilters");
  };

  // Função para contar filtros ativos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedStores.length > 0) count++;
    if (selectedMotoboys.length > 0) count++;
    if (selectedPaymentMethods.length > 0) count++;
    if (dateFilter.start || dateFilter.end) count++;
    if (priceFilter.min || priceFilter.max) count++;
    if (searchText) count++;
    return count;
  };

  // Função para obter dados únicos para os filtros
  const getUniqueStores = () => {
    const storeMap = new Map();
    orders.forEach((order) => {
      if (order.store?._id && order.store?.name) {
        storeMap.set(order.store._id, order.store.name);
      }
    });
    return Array.from(storeMap.entries()).map(([id, name]) => ({ id, name }));
  };

  const getUniqueMotoboys = () => {
    const motoboyMap = new Map();
    orders.forEach((order) => {
      if (order.motoboy?.motoboyId && order.motoboy?.name) {
        motoboyMap.set(order.motoboy.motoboyId, order.motoboy.name);
      }
    });
    return Array.from(motoboyMap.entries()).map(([id, name]) => ({ id, name }));
  };

  const getUniquePaymentMethods = () => {
    const methods = new Set();
    orders.forEach((order) => {
      if (order.payment?.method) {
        methods.add(order.payment.method);
      }
    });
    return Array.from(methods);
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
      if (selectedOrder?.motoboy?.queue?.status !== "cancelado") {
        alert("A fila do motoboy não está cancelada.");
        return;
      }
      alert("Buscando motoboys disponíveis...");
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

  const openStatusModal = () => {
    setNewStatus(selectedOrder?.status || "");
    setStatusModal(true);
  };

  const handleUpdateOrderStatus = async () => {
    if (!newStatus || newStatus === selectedOrder?.status) {
      setStatusModal(false);
      return;
    }

    try {
      setLoadingStatusUpdate(true);
      const response = await updateOrderStatus(selectedOrder._id, newStatus);

      if (response.status === 200) {
        // Atualizar a lista de pedidos
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === selectedOrder._id
              ? {
                  ...order,
                  status: newStatus,
                  motoboy: {
                    ...order.motoboy,
                    queue: { ...order.motoboy.queue, status: newStatus },
                  },
                }
              : order
          )
        );

        // Atualizar o pedido selecionado
        setSelectedOrder((prev) => ({
          ...prev,
          status: newStatus,
          motoboy: {
            ...prev.motoboy,
            queue: { ...prev.motoboy.queue, status: newStatus },
          },
        }));

        setStatusModal(false);
        console.log("Status do pedido atualizado com sucesso");
      }
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
      alert("Erro ao atualizar status do pedido. Tente novamente.");
    } finally {
      setLoadingStatusUpdate(false);
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

  // Função para calcular rota do motoboy
  const calculateRoute = (origin, destination) => {
    if (!origin || !destination || !window.google) {
      console.warn("Origem, destino ou Google Maps não disponíveis");
      return;
    }

    setLoadingRoute(true);

    const directionsService = new window.google.maps.DirectionsService();

    const request = {
      origin: new window.google.maps.LatLng(origin.lat, origin.lng),
      destination: new window.google.maps.LatLng(
        destination.lat,
        destination.lng
      ),
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.METRIC,
      optimizeWaypoints: true,
    };

    setDirectionsRequest(request);
  };

  // Callback para o DirectionsService
  const directionsCallback = (result, status) => {
    setLoadingRoute(false);

    if (status === "OK" && result) {
      setDirectionsResponse(result);
      console.log("Rota calculada com sucesso");
    } else {
      console.error("Erro ao calcular rota:", status);
      setDirectionsResponse(null);

      // Mostrar mensagem de erro apenas para erros críticos
      if (status === "ZERO_RESULTS") {
        console.warn("Nenhuma rota encontrada entre os pontos");
      } else if (status === "OVER_QUERY_LIMIT") {
        console.warn("Limite de consultas excedido para a API do Google Maps");
      } else if (status === "REQUEST_DENIED") {
        console.error("Requisição negada pela API do Google Maps");
      }
    }
  };

  // Função para determinar o destino da rota baseado no status do pedido
  const getRouteDestination = () => {
    if (!selectedOrder || !selectedOrder.motoboy) {
      return null;
    }

    // Se o motoboy não chegou na loja, mostrar rota até a loja
    if (!selectedOrder.motoboy.hasArrived) {
      const store = selectedOrder.store;
      const storeCoords = store?.coordinates || store?.address?.coordinates;

      if (storeCoords && storeCoords.length === 2) {
        return {
          lat: parseFloat(storeCoords[1]),
          lng: parseFloat(storeCoords[0]),
        };
      }
    }

    // Se já chegou na loja mas não chegou no destino, mostrar rota até o cliente
    if (!selectedOrder.arrivedDestination) {
      // Pegar o primeiro endereço de cliente disponível
      if (selectedOrder.customer && Array.isArray(selectedOrder.customer)) {
        for (const customer of selectedOrder.customer) {
          const customerCoords =
            customer.address?.coordinates ||
            customer.customerAddress?.coordinates;

          if (customerCoords && customerCoords.length === 2) {
            return {
              lat: parseFloat(customerCoords[1]),
              lng: parseFloat(customerCoords[0]),
            };
          }
        }
      }

      // Se deliveryAddress existe, usar ele
      if (selectedOrder.deliveryAddress?.coordinates) {
        const coords = selectedOrder.deliveryAddress.coordinates;
        return {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0]),
        };
      }
    }

    return null;
  };

  // Função para limpar rota
  const clearRoute = () => {
    setDirectionsResponse(null);
    setDirectionsRequest(null);
    setLoadingRoute(false);
  };

  // useEffect para calcular rota quando o pedido ou motoboy mudam
  useEffect(() => {
    // Limpar rota anterior primeiro
    clearRoute();

    if (selectedOrder?.motoboy?.coordinates && isLoaded && window.google) {
      const destination = getRouteDestination();

      if (destination) {
        const origin = {
          lat: parseFloat(selectedOrder.motoboy.coordinates[1]),
          lng: parseFloat(selectedOrder.motoboy.coordinates[0]),
        };

        // Verificar se origem e destino são diferentes
        const distance =
          Math.abs(origin.lat - destination.lat) +
          Math.abs(origin.lng - destination.lng);

        if (distance > 0.0001) {
          // Só calcular se há diferença significativa
          calculateRoute(origin, destination);
        }
      }
    }
  }, [
    selectedOrder?.motoboy?.coordinates,
    selectedOrder?.motoboy?.hasArrived,
    selectedOrder?.arrivedDestination,
    isLoaded,
  ]);

  // useEffect para limpar rota quando modal de detalhes fecha
  useEffect(() => {
    if (!detailsModal) {
      clearRoute();
    }
  }, [detailsModal]);

  // Função para atualizar localização do motoboy e recalcular rota
  const handleRefreshMotoboyLocation = async () => {
    if (!selectedOrder?.motoboy?.motoboyId) {
      return;
    }

    try {
      await getMotoboyApi(selectedOrder.motoboy.motoboyId);

      // A rota será recalculada automaticamente pelo useEffect
      console.log("Localização do motoboy atualizada");
    } catch (error) {
      console.error("Erro ao atualizar localização do motoboy:", error);
      alert("Erro ao atualizar localização do motoboy. Tente novamente.");
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

  const openProfileImageModal = (store) => {
    setSelectedStore(store);
    setProfileImageModal(true);
  };

  const closeProfileImageModal = () => {
    setSelectedStore(null);
    setProfileImageModal(false);
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      // Fazer upload da nova imagem
      const imageUrl = await uploadStoreProfileImage(
        file,
        selectedStore.firebaseUid || selectedStore._id
      );

      // Excluir imagem anterior se existir
      if (selectedStore.perfil_url) {
        await deleteStoreProfileImage(selectedStore.perfil_url);
      }

      // Atualizar perfil no backend
      const response = await api.put(
        `/stores/${selectedStore._id}/profile-image`,
        {
          perfil_url: imageUrl,
        }
      );

      if (response.status === 200) {
        // Atualizar o estado local dos pedidos
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.store._id === selectedStore._id
              ? {
                  ...order,
                  store: {
                    ...order.store,
                    perfil_url: imageUrl,
                  },
                }
              : order
          )
        );

        // Atualizar pedido selecionado se necessário
        if (selectedOrder && selectedOrder.store._id === selectedStore._id) {
          setSelectedOrder((prevOrder) => ({
            ...prevOrder,
            store: {
              ...prevOrder.store,
              perfil_url: imageUrl,
            },
          }));
        }

        alert("Imagem de perfil atualizada com sucesso!");
        closeProfileImageModal();
      } else {
        alert("Erro ao salvar URL da imagem no perfil");
      }
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      alert(error.message || "Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    if (!selectedStore.perfil_url) return;

    setUploadingImage(true);

    try {
      // Excluir imagem do storage
      await deleteStoreProfileImage(selectedStore.perfil_url);

      // Atualizar perfil no backend
      const response = await api.put(
        `/stores/${selectedStore._id}/profile-image`,
        {
          perfil_url: "",
        }
      );

      if (response.status === 200) {
        // Atualizar o estado local dos pedidos
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.store._id === selectedStore._id
              ? {
                  ...order,
                  store: {
                    ...order.store,
                    perfil_url: "",
                  },
                }
              : order
          )
        );

        // Atualizar pedido selecionado se necessário
        if (selectedOrder && selectedOrder.store._id === selectedStore._id) {
          setSelectedOrder((prevOrder) => ({
            ...prevOrder,
            store: {
              ...prevOrder.store,
              perfil_url: "",
            },
          }));
        }

        alert("Imagem de perfil removida com sucesso!");
        closeProfileImageModal();
      } else {
        alert("Erro ao remover imagem do perfil");
      }
    } catch (error) {
      console.error("Erro ao remover imagem:", error);
      alert("Erro ao remover imagem de perfil");
    } finally {
      setUploadingImage(false);
    }
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
            <Paper className="filter-section" sx={{ mb: 3, p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <FilterListIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Filtros
                  </Typography>
                </Box>
                <Badge badgeContent={getActiveFiltersCount()} color="primary">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={handleClearAllFilters}
                    disabled={getActiveFiltersCount() === 0}
                  >
                    Limpar Filtros
                  </Button>
                </Badge>
              </Box>

              <Grid container spacing={2}>
                {/* Busca por texto */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Buscar"
                    placeholder="Nº pedido, cliente, loja..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Filtro por Status */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      multiple
                      sx={{ width: "150px" }}
                      value={selectedStatuses}
                      onChange={handleStatusChange}
                      input={<OutlinedInput label="Status" />}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
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
                            checked={
                              selectedStatuses.indexOf(status.value) > -1
                            }
                          />
                          <ListItemText primary={status.label} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Filtro por Loja */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Lojas</InputLabel>
                    <Select
                      multiple
                      sx={{ width: "150px" }}
                      value={selectedStores}
                      onChange={handleStoreChange}
                      input={<OutlinedInput label="Lojas" />}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => {
                            const store = getUniqueStores().find(
                              (s) => s.id === value
                            );
                            return (
                              <Chip
                                key={value}
                                label={store?.name || value}
                                size="small"
                                variant="outlined"
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {getUniqueStores().map((store) => (
                        <MenuItem key={store.id} value={store.id}>
                          <Checkbox
                            checked={selectedStores.indexOf(store.id) > -1}
                          />
                          <ListItemText primary={store.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Filtro por Entregador */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Entregadores</InputLabel>
                    <Select
                      multiple
                      sx={{ width: "150px" }}
                      value={selectedMotoboys}
                      onChange={handleMotoboyChange}
                      input={<OutlinedInput label="Entregadores" />}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => {
                            const motoboy = getUniqueMotoboys().find(
                              (m) => m.id === value
                            );
                            return (
                              <Chip
                                key={value}
                                label={motoboy?.name || value}
                                size="small"
                                variant="outlined"
                                color="info"
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {getUniqueMotoboys().map((motoboy) => (
                        <MenuItem key={motoboy.id} value={motoboy.id}>
                          <Checkbox
                            checked={selectedMotoboys.indexOf(motoboy.id) > -1}
                          />
                          <ListItemText primary={motoboy.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Filtro por Método de Pagamento */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Pagamento</InputLabel>
                    <Select
                      sx={{ width: "150px" }}
                      multiple
                      value={selectedPaymentMethods}
                      onChange={handlePaymentMethodChange}
                      input={<OutlinedInput label="Pagamento" />}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {getUniquePaymentMethods().map((method) => (
                        <MenuItem key={method} value={method}>
                          <Checkbox
                            checked={
                              selectedPaymentMethods.indexOf(method) > -1
                            }
                          />
                          <ListItemText primary={method} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Filtro por Data de Início */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data Início"
                    value={dateFilter.start}
                    onChange={(e) =>
                      setDateFilter((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>

                {/* Filtro por Data de Fim */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data Fim"
                    value={dateFilter.end}
                    onChange={(e) =>
                      setDateFilter((prev) => ({
                        ...prev,
                        end: e.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>

                {/* Filtro por Preço Mínimo */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Preço Mín. (R$)"
                    value={priceFilter.min}
                    onChange={(e) =>
                      setPriceFilter((prev) => ({
                        ...prev,
                        min: e.target.value,
                      }))
                    }
                    inputProps={{ min: 0, step: 0.01 }}
                    size="small"
                  />
                </Grid>

                {/* Filtro por Preço Máximo */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Preço Máx. (R$)"
                    value={priceFilter.max}
                    onChange={(e) =>
                      setPriceFilter((prev) => ({
                        ...prev,
                        max: e.target.value,
                      }))
                    }
                    inputProps={{ min: 0, step: 0.01 }}
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Contador de resultados */}
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {filteredOrders.length} de {orders.length} pedidos encontrados
                </Typography>

                {/* Indicadores de filtros ativos */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selectedStatuses.length > 0 ||
                    selectedStores.length > 0 ||
                    selectedMotoboys.length > 0 ||
                    selectedPaymentMethods.length > 0 ||
                    dateFilter.start ||
                    dateFilter.end ||
                    priceFilter.min ||
                    priceFilter.max ||
                    searchText) && (
                    <Typography
                      variant="caption"
                      color="primary.main"
                      fontWeight="bold"
                    >
                      Filtros ativos:
                    </Typography>
                  )}
                  {selectedStatuses.length > 0 && (
                    <Chip
                      label={`${selectedStatuses.length} status`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {selectedStores.length > 0 && (
                    <Chip
                      label={`${selectedStores.length} lojas`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {selectedMotoboys.length > 0 && (
                    <Chip
                      label={`${selectedMotoboys.length} entregadores`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {selectedPaymentMethods.length > 0 && (
                    <Chip
                      label={`${selectedPaymentMethods.length} pagamentos`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {(dateFilter.start || dateFilter.end) && (
                    <Chip label="Data" size="small" variant="outlined" />
                  )}
                  {(priceFilter.min || priceFilter.max) && (
                    <Chip label="Preço" size="small" variant="outlined" />
                  )}
                  {searchText && (
                    <Chip label="Busca" size="small" variant="outlined" />
                  )}
                </Box>
              </Box>
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {selectedStatuses.length > 0 ||
                  selectedStores.length > 0 ||
                  selectedMotoboys.length > 0 ||
                  selectedPaymentMethods.length > 0 ||
                  dateFilter.start ||
                  dateFilter.end ||
                  priceFilter.min ||
                  priceFilter.max ||
                  searchText
                    ? "Nenhum pedido corresponde aos filtros selecionados."
                    : "Os pedidos aparecerão aqui quando forem criados."}
                </Typography>
                {(selectedStatuses.length > 0 ||
                  selectedStores.length > 0 ||
                  selectedMotoboys.length > 0 ||
                  selectedPaymentMethods.length > 0 ||
                  dateFilter.start ||
                  dateFilter.end ||
                  priceFilter.min ||
                  priceFilter.max ||
                  searchText) && (
                  <Button
                    variant="outlined"
                    onClick={handleClearAllFilters}
                    sx={{ mt: 1 }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </Paper>
            ) : (
              <Paper className="orders-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pedido</TableCell>
                      <TableCell>Loja</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Status Fila</TableCell>
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
                            {order.store.name || "Loja Desconhecida"}
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusChip(order.status)}</TableCell>
                        <TableCell>
                          {getStatusChip(order.motoboy?.queue?.status)}
                        </TableCell>
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
                    sx={{ width: "150px" }}
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
                      <Button
                        variant="text"
                        color="primary"
                        onClick={openStatusModal}
                      >
                        {getStatusChip(selectedOrder.status)}
                      </Button>
                      <Typography variant="body2" color="text.secondary">
                        Criado em: {formatDate(selectedOrder.createdAt)}
                      </Typography>
                      {/* Exibir data de agendamento se for um pedido agendado */}
                      {selectedOrder.isScheduled &&
                        selectedOrder.scheduledDateTime && (
                          <Typography
                            variant="body2"
                            color="warning.main"
                            sx={{
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              mt: 0.5,
                            }}
                          >
                            <ScheduleIcon fontSize="small" />
                            Agendado para:{" "}
                            {formatDate(selectedOrder.scheduledDateTime)}
                          </Typography>
                        )}
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
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Typography variant="body1" fontWeight="medium">
                                  {selectedOrder.store?.name ||
                                    "Estabelecimento não informado"}
                                </Typography>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    openProfileImageModal(selectedOrder.store)
                                  }
                                  sx={{ ml: 1 }}
                                >
                                  Gerenciar Imagem
                                </Button>
                              </Box>

                              {/* Exibir imagem de perfil da loja se existir */}
                              {selectedOrder.store?.perfil_url && (
                                <Box sx={{ mt: 1 }}>
                                  <img
                                    src={selectedOrder.store.perfil_url}
                                    alt="Perfil do estabelecimento"
                                    style={{
                                      width: "80px",
                                      height: "80px",
                                      objectFit: "cover",
                                      borderRadius: "8px",
                                      border: "1px solid #ddd",
                                    }}
                                  />
                                </Box>
                              )}

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
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexDirection: "column",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={handleRefreshMotoboyLocation}
                                    sx={{ alignSelf: "flex-start" }}
                                  >
                                    <RefreshIcon sx={{ mr: 1 }} />
                                    Atualizar Localização
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
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
                                </Box>
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

                        {/* Queue Status Card */}
                        <Card sx={{ mb: 2 }}>
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
                                Status da Fila
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 2,
                              }}
                            >
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mr: 1 }}
                                >
                                  Status:
                                </Typography>
                                <Chip
                                  label={
                                    selectedOrder.motoboy?.queue?.status ||
                                    "Não definido"
                                  }
                                  color={
                                    selectedOrder.motoboy?.queue?.status ===
                                    "confirmado"
                                      ? "success"
                                      : selectedOrder.motoboy?.queue?.status ===
                                        "pendente"
                                      ? "warning"
                                      : "default"
                                  }
                                  variant="outlined"
                                  size="small"
                                />
                              </Box>

                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mr: 1 }}
                                >
                                  Total de Entregadores:
                                </Typography>
                                <Chip
                                  label={
                                    selectedOrder.motoboy?.queue?.motoboys
                                      ?.length || 0
                                  }
                                  color="info"
                                  variant="outlined"
                                  size="small"
                                />
                              </Box>
                            </Box>

                            {/* Lista de Motoboys na Fila */}
                            {selectedOrder.motoboy?.queue?.motoboys &&
                              selectedOrder.motoboy.queue.motoboys.length >
                                0 && (
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight="bold"
                                    sx={{ mb: 1 }}
                                  >
                                    Entregadores na Fila:
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 1,
                                    }}
                                  >
                                    {selectedOrder.motoboy.queue.motoboys.map(
                                      (motoboy, index) => (
                                        <Box
                                          key={motoboy._id || index}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            p: 1.5,
                                            border: "1px solid",
                                            borderColor:
                                              motoboy._id ===
                                                selectedOrder.motoboy?.motoboyId
                                                  ?.$oid ||
                                              motoboy._id ===
                                                selectedOrder.motoboy?.motoboyId
                                                ? "success.main"
                                                : motoboy.refused
                                                ? "error.main"
                                                : "divider",
                                            borderRadius: 1,
                                            bgcolor:
                                              motoboy._id ===
                                                selectedOrder.motoboy?.motoboyId
                                                  ?.$oid ||
                                              motoboy._id ===
                                                selectedOrder.motoboy?.motoboyId
                                                ? "success.lighter"
                                                : motoboy.refused
                                                ? "error.lighter"
                                                : "background.paper",
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
                                                width: 32,
                                                height: 32,
                                                mr: 1,
                                                bgcolor:
                                                  motoboy._id ===
                                                    selectedOrder.motoboy
                                                      ?.motoboyId?.$oid ||
                                                  motoboy._id ===
                                                    selectedOrder.motoboy
                                                      ?.motoboyId
                                                    ? "success.main"
                                                    : motoboy.refused
                                                    ? "error.main"
                                                    : "primary.main",
                                              }}
                                            >
                                              {index + 1}
                                            </Avatar>
                                            <Box>
                                              <Typography
                                                variant="body2"
                                                fontWeight="medium"
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 0.5,
                                                }}
                                              >
                                                {motoboy.name}
                                                {(motoboy._id ===
                                                  selectedOrder.motoboy
                                                    ?.motoboyId?.$oid ||
                                                  motoboy._id ===
                                                    selectedOrder.motoboy
                                                      ?.motoboyId) && (
                                                  <Chip
                                                    label="Selecionado"
                                                    color="success"
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: "0.75rem",
                                                    }}
                                                  />
                                                )}
                                                {motoboy.refused && (
                                                  <Chip
                                                    label="Recusou"
                                                    color="error"
                                                    size="small"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: "0.75rem",
                                                    }}
                                                  />
                                                )}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                              >
                                                Score:{" "}
                                                {motoboy.score.toFixed(1)} |
                                                Distância:{" "}
                                                {motoboy.distance < 1000
                                                  ? `${motoboy.distance}m`
                                                  : `${(
                                                      motoboy.distance / 1000
                                                    ).toFixed(1)}km`}
                                              </Typography>
                                            </Box>
                                          </Box>

                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              alignItems: "end",
                                            }}
                                          >
                                            <Chip
                                              label={
                                                motoboy.isAvailable
                                                  ? "Disponível"
                                                  : "Ocupado"
                                              }
                                              color={
                                                motoboy.isAvailable
                                                  ? "success"
                                                  : "error"
                                              }
                                              variant="outlined"
                                              size="small"
                                              sx={{ mb: 0.5 }}
                                            />
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              ~{motoboy.estimatedTimeMinutes}min
                                            </Typography>
                                          </Box>
                                        </Box>
                                      )
                                    )}
                                  </Box>
                                </Box>
                              )}
                          </CardContent>
                        </Card>
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
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Já chegou na loja:{" "}
                                    {selectedOrder.motoboy?.hasArrived
                                      ? "Sim"
                                      : "Não"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Chegou no cliente:{" "}
                                    {selectedOrder.arrivedDestination
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
                                            {customer.phone?.slice(-4)}
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
                        {/* Componente de Mapa Reutilizável */}
                        <Box sx={{ mt: 2 }}>
                          <DeliveryRouteMap
                            orderId={selectedOrder._id}
                            height="600px"
                            showRouteInfo={true}
                            showRefreshButton={true}
                            autoRefresh={false}
                            isLoaded={isLoaded}
                            loadError={loadError}
                            onRouteUpdate={(routeInfo) => {
                              if (routeInfo) {
                                console.log(
                                  "Informações da rota atualizadas:",
                                  routeInfo
                                );
                              }
                            }}
                          />
                        </Box>
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

            {/* Modal para Alterar Status */}
            <Dialog
              open={statusModal}
              onClose={() => setStatusModal(false)}
              maxWidth="sm"
              fullWidth
              className="status-modal"
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
                  <CheckCircleIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Alterar Status do Pedido
                  </Typography>
                </Box>
                <IconButton onClick={() => setStatusModal(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Pedido #{selectedOrder?.orderNumber || selectedOrder?.id}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Status atual: {getStatusChip(selectedOrder?.status)}
                  </Typography>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Novo Status</InputLabel>
                  <Select
                    sx={{ width: "150px" }}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    label="Novo Status"
                    disabled={loadingStatusUpdate}
                  >
                    {ORDER_STATUS.map(
                      (status) =>
                        status.type === "order" && (
                          <MenuItem key={status.value} value={status.value}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <status.icon
                                sx={{
                                  mr: 1,
                                  fontSize: 18,
                                  color: `${status.color}.main`,
                                }}
                              />
                              <Typography variant="body2">
                                {status.label}
                              </Typography>
                            </Box>
                          </MenuItem>
                        )
                    )}
                  </Select>
                </FormControl>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Selecione o novo status para o pedido
                </Typography>
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={() => setStatusModal(false)} color="inherit">
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateOrderStatus}
                  color="primary"
                  variant="contained"
                  disabled={
                    loadingStatusUpdate ||
                    !newStatus ||
                    newStatus === selectedOrder?.status
                  }
                  startIcon={
                    loadingStatusUpdate ? <CircularProgress size={20} /> : null
                  }
                >
                  {loadingStatusUpdate ? "Alterando..." : "Confirmar Alteração"}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Modal para Gerenciar Imagem de Perfil */}
            <Dialog
              open={profileImageModal}
              onClose={closeProfileImageModal}
              maxWidth="sm"
              fullWidth
              className="profile-image-modal"
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
                  <Avatar sx={{ mr: 1, bgcolor: "primary.main" }}>
                    <StoreIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight="bold">
                    Imagem de Perfil da Loja
                  </Typography>
                </Box>
                <IconButton onClick={closeProfileImageModal} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent>
                {selectedStore && (
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="body1" fontWeight="medium" mb={2}>
                      {selectedStore.name || "Estabelecimento"}
                    </Typography>

                    {/* Imagem atual ou placeholder */}
                    <Box sx={{ mb: 3 }}>
                      {selectedStore.perfil_url ? (
                        <Box>
                          <img
                            src={selectedStore.perfil_url}
                            alt="Perfil do estabelecimento"
                            style={{
                              width: "200px",
                              height: "200px",
                              objectFit: "cover",
                              borderRadius: "12px",
                              border: "2px solid #ddd",
                              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Box sx={{ mt: 2 }}>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={removeProfileImage}
                              disabled={uploadingImage}
                              sx={{ borderRadius: 2 }}
                            >
                              {uploadingImage
                                ? "Removendo..."
                                : "Remover Imagem"}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: "200px",
                            height: "200px",
                            margin: "0 auto",
                            backgroundColor: "#f8f9fa",
                            border: "2px dashed #ddd",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6c757d",
                          }}
                        >
                          <Box sx={{ textAlign: "center" }}>
                            <Avatar
                              sx={{
                                width: 60,
                                height: 60,
                                bgcolor: "grey.300",
                                margin: "0 auto 8px",
                              }}
                            >
                              <StoreIcon sx={{ fontSize: 30 }} />
                            </Avatar>
                            <Typography variant="body2">
                              Nenhuma imagem
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>

                    {/* Upload de nova imagem */}
                    <Box>
                      <input
                        type="file"
                        id="store-profile-image"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleProfileImageUpload}
                        disabled={uploadingImage}
                        style={{ display: "none" }}
                      />
                      <label htmlFor="store-profile-image">
                        <Button
                          variant="contained"
                          component="span"
                          disabled={uploadingImage}
                          sx={{
                            borderRadius: 2,
                            px: 4,
                            py: 1.5,
                            fontWeight: "bold",
                          }}
                        >
                          {uploadingImage
                            ? "Enviando..."
                            : selectedStore.perfil_url
                            ? "Alterar Imagem"
                            : "Adicionar Imagem"}
                        </Button>
                      </label>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        Formatos aceitos: JPG, PNG, WebP (máx. 5MB)
                      </Typography>
                    </Box>
                  </Box>
                )}
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button
                  onClick={closeProfileImageModal}
                  color="inherit"
                  sx={{ borderRadius: 2 }}
                >
                  Fechar
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
              isLoaded={isLoaded}
              loadError={loadError}
            />
          </Container>
        </Box>
      </Box>
    </>
  );
}
