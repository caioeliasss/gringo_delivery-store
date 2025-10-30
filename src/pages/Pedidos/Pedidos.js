import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { findMotoboys, getStoreOrders } from "../../services/api";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import ViewCoordinates from "../../components/ViewCoordinates/ViewCoordinates";
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
  RadioGroup,
  Radio,
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
  Tab,
  Tabs,
  Avatar,
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
  Star as StarIcon,
  Edit,
  ReportProblem as OcorrenciasIcon,
  Chat as ChatIcon,
  Receipt as ReceiptIcon,
  NotificationAdd,
  QrCode as QrCodeIcon,
  Badge as BadgeIcon,
} from "@mui/icons-material";
import eventService from "../../services/eventService";
import socketService from "../../services/socketService";
import Avaliate from "../../components/Avaliate";
import BuscandoMotoboy from "../../components/BuscandoMotoboy/BuscandoMotoboy";

import MyLocationIcon from "@mui/icons-material/MyLocation";
import CreateOrderDialog from "../Orders/CreateOrderDialog";
import {
  SUPPORT_MENU_ITEMS,
  createAdminFooterItems,
} from "../../config/menuConfig";
import DeliveryRouteMap from "../../components/DeliveryRouteMap";
import { useJsApiLoader } from "@react-google-maps/api";

const SearchField = ({
  placeholder,
  color = "primary",
  searchAddress,
  setSearchAddress,
  onSearch,
}) => (
  <Box
    sx={{
      position: "absolute",
      top: 10,
      left: 10,
      right: 10,
      zIndex: 10,
    }}
  >
    <Box sx={{ display: "flex", gap: 1 }}>
      <TextField
        fullWidth
        placeholder={placeholder}
        value={searchAddress}
        onChange={(e) => setSearchAddress(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            onSearch();
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color={color} />
            </InputAdornment>
          ),
          sx: {
            backgroundColor: "white",
            borderRadius: 2,
            boxShadow: 2,
          },
        }}
        variant="outlined"
        size="small"
      />
      <Button
        variant="contained"
        color={color}
        onClick={onSearch}
        sx={{
          minWidth: "auto",
          px: 2,
          borderRadius: 2,
          boxShadow: 2,
        }}
      >
        <SearchIcon />
      </Button>
    </Box>
  </Box>
);

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
  const searchInputRef = useRef(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [driverCode, setDriverCode] = useState(null);
  const [avaliateOpen, setAvaliateOpen] = useState(false);
  const [buscandoMotoboy, setBuscandoMotoboy] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null); // Para armazenar dados do pedido criado
  const [searchAddress, setSearchAddress] = useState("");
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(0); // Índice do cliente ativo
  const [storeOrigin, setStoreOrigin] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [storeId, setStoreId] = useState(null); // ID da loja atual
  const [socketConnected, setSocketConnected] = useState(false); // Status da conexão socket
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState([{}]);
  const [selectedReason, setSelectedReason] = useState(null);
  // Estado para o formulário de novo pedido
  const [novoPedido, setNovoPedido] = useState({
    store: {
      name: "",
      cnpj: "",
      coordinates: [],
      address: {
        cep: null,
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
      },
    },
    customer: [
      {
        name: "",
        phone: "",
        customerAddress: {
          cep: null,
          address: "",
          addressNumber: "",
          bairro: "",
          cidade: "",
          estado: "",
          coordinates: [], // [longitude, latitude]
        },
      },
    ],
    items: [
      {
        productId: "",
        productName: "Produto padrão",
        quantity: 1,
        price: 0,
      },
    ],
    payment: {
      method: "dinheiro",
      change: 0,
    },
    notes: "",
    total: 0,
  });

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script-pedidos",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "maps", "geometry"],
  });

  // Estado para o item atual sendo adicionado
  const [currentItem, setCurrentItem] = useState({
    productId: "",
    productName: "",
    quantity: 1,
    price: 0,
  });
  const [deliveryCode, setDeliveryCode] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Novos estados para controle de localização
  const [locationTab, setLocationTab] = useState(0); // 0 para Origem, 1 para Destino
  const [useMap, setUseMap] = useState(true); // Se true, usa mapa para selecionar localização

  // Estados para controlar o mapa
  const [mapCenter, setMapCenter] = useState({
    lat: -22.39731,
    lng: -46.947326,
  }); // -22.397310, -46.947326
  const [originLocation, setOriginLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState([]);
  const [addressSearch, setAddressSearch] = useState(null);
  const [statusBuscandoMotoboy, setStatusBuscandoMotoboy] =
    useState("pendente");
  // Removido em favor de activeCustomerIndex
  const location = useLocation();
  // Estados para preview de custo
  const [previewCost, setPreviewCost] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [driveBack, setDriveBack] = useState(false);

  useEffect(() => {
    // Verificar se há um orderId passado via state
    if (location.state?.orderId) {
      const orderId = location.state.orderId;
      console.log("🔍 Procurando pedido com ID:", orderId);

      if (pedidos.length > 0) {
        const targetOrder = pedidos.find((order) => order._id === orderId);
        if (targetOrder) {
          console.log("✅ Pedido encontrado na lista local:", targetOrder);
          handleViewPedido(targetOrder);
          // Limpar o state para evitar abrir novamente
          navigate(location.pathname, { replace: true });
        } else {
          console.log("⚠️ Pedido não encontrado na lista, buscando na API...");
          fetchSpecificOrder(orderId);
        }
      } else if (!loading) {
        // Se não há pedidos carregados e não está carregando, buscar na API
        console.log("⚠️ Lista de pedidos vazia, buscando na API...");
        fetchSpecificOrder(orderId);
      }
    }
  }, [location.state?.orderId, pedidos.length, loading]);

  const fetchSpecificOrder = async (orderId) => {
    try {
      console.log("🔍 Buscando pedido específico:", orderId);
      const response = await api.get(`/orders/${orderId}`);
      const order = response.data;
      if (order) {
        console.log("✅ Pedido encontrado:", order);
        handleViewPedido(order);
        // Limpar o state para evitar abrir novamente
        navigate(location.pathname, { replace: true });
      }
    } catch (error) {
      console.error("❌ Erro ao buscar pedido específico:", error);
      setSnackbar({
        open: true,
        message: `Pedido ${orderId} não encontrado.`,
        severity: "error",
      });
      // Limpar o state mesmo em caso de erro
      navigate(location.pathname, { replace: true });
    }
  };

  useEffect(() => {
    // Só conectar o SSE se o usuário estiver autenticado
    if (currentUser) {
      // Conectar com o UID do usuário atual como identificador da loja
      eventService.connect(currentUser.uid);

      // Configurar manipulador para atualizações de pedidos
      const handleOrderUpdate = (orderData) => {
        // Atualizar o pedido na lista local se o pedido já existir
        setStatusBuscandoMotoboy(orderData.status);
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

  useEffect(() => {
    if (openCancelDialog) {
      if (currentPedido) {
        // Buscar motivos de cancelamento ao abrir o diálogo
        const fetchCancellationReasons = async () => {
          try {
            const response = await api.get("/orders/cancelarIfood", {
              params: { orderId: currentPedido.ifoodId },
            });
            setCancellationReasons(response.data);
          } catch (error) {
            console.error("Erro ao buscar motivos de cancelamento:", error);
          }
        };

        fetchCancellationReasons();
      }
    }
  }, [openCancelDialog]);

  const handleCancelOrder = async () => {
    if (!currentPedido.ifoodId) {
      try {
        const response = await api.put("/orders/status", {
          id: currentPedido._id,
          status: "cancelado",
        });
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: `Pedido #${currentPedido._id} cancelado.`,
            severity: "success",
          });
        }
        setOpenCancelDialog(false);
        setOpenDialog(false);
        setPedidos((prev) =>
          prev.map((pedido) =>
            pedido._id === currentPedido._id
              ? { ...pedido, status: "cancelado" }
              : pedido
          )
        );
        return;
      } catch (error) {
        console.error("Erro ao cancelar pedido:", error);
        setSnackbar({
          open: true,
          message: `Erro ao cancelar pedido #${currentPedido._id}.`,
          severity: "error",
        });
        return;
      }
    }
    if (selectedReason && currentPedido.ifoodId) {
      try {
        const response = await api.post("/orders/cancelarIfood", {
          orderId: currentPedido.ifoodId,
          reason: selectedReason,
        });
        console.log("Pedido cancelado com sucesso:", response.data);
        setSnackbar({
          open: true,
          message: `Pedido #${currentPedido.ifoodId} cancelado.`,
          severity: "success",
        });
        setOpenCancelDialog(false);
        setOpenDialog(false);
        setPedidos((prev) =>
          prev.map((pedido) =>
            pedido._id === currentPedido._id
              ? { ...pedido, status: "cancelado" }
              : pedido
          )
        );
        setCurrentPedido((prev) =>
          prev ? { ...prev, status: "cancelado" } : null
        );
      } catch (error) {
        console.error("Erro ao cancelar pedido ifood:", error);
        setSnackbar({
          open: true,
          message: `Erro ao cancelar pedido #${currentPedido.ifoodId}.`,
          severity: "error",
        });
      }
    } else {
      setSnackbar({
        open: true,
        message: "Selecione um motivo para o cancelamento.",
        severity: "warning",
      });
    }
  };
  // useEffect para conectar e escutar eventos do WebSocket
  useEffect(() => {
    if (currentUser && storeId) {
      // Conectar socket
      socketService
        .connect(currentUser.uid, "store")
        .then(() => {
          console.log("🏪 Socket da loja conectado com sucesso!");
          setSocketConnected(true);
        })
        .catch((error) => {
          console.error("❌ Erro ao conectar socket da loja:", error);
          setSocketConnected(false);
        });

      // Monitorar status da conexão
      const handleConnectionSuccess = () => setSocketConnected(true);
      const handleConnectionFailed = () => setSocketConnected(false);
      const handleConnectionLost = () => setSocketConnected(false);

      socketService.on("connection:success", handleConnectionSuccess);
      socketService.on("connection:failed", handleConnectionFailed);
      socketService.on("connection:lost", handleConnectionLost);

      // === LISTENERS PARA ATUALIZAÇÕES DOS PEDIDOS ===

      // Pedido aceito pelo motoboy
      const handleOrderAcceptedByMotoboy = (data) => {
        console.log("✅ Pedido aceito pelo motoboy via socket:", data);

        const motoboy = {
          name: data.motoboy.name,
          phone: data.motoboy.phoneNumber,
          motoboyId: data.motoboy._id,
          profileImage: data.motoboy.profileImage,
        };
        setPedidos((prevPedidos) =>
          prevPedidos.map((pedido) =>
            pedido._id === data.orderId
              ? {
                  ...pedido,
                  status: "em_preparo",
                  motoboy: motoboy,
                }
              : pedido
          )
        );

        // Atualizar pedido atual se estiver aberto
        if (currentPedido && currentPedido._id === data.orderId) {
          setCurrentPedido((prevPedido) => ({
            ...prevPedido,
            status: "em_preparo",
            motoboy: data.motoboy || prevPedido.motoboy,
          }));
        }

        setSnackbar({
          open: true,
          message: `Pedido #${
            data.orderNumber || data.orderId
          } foi aceito pelo motoboy!`,
          severity: "success",
        });

        // Fechar dialog de busca se estiver aberto
        if (data.orderId === orderCreated?._id) {
          setBuscandoMotoboy(false);
          setOrderCreated(null);
        }
      };

      // Pedido recusado pelo motoboy
      const handleOrderDeclinedByMotoboy = (data) => {
        console.log("❌ Pedido recusado pelo motoboy via socket:", data);

        setSnackbar({
          open: true,
          message: `Pedido #${
            data.orderNumber || data.orderId
          } foi recusado. Buscando outro motoboy...`,
          severity: "warning",
        });
      };

      // Status atualizado pelo motoboy
      const handleOrderStatusUpdatedByMotoboy = (data) => {
        console.log("📊 Status atualizado pelo motoboy via socket:", data);

        const statusMessages = {
          em_entrega: "está a caminho para entrega",
          entregue: "foi entregue com sucesso",
          em_preparo: "está sendo preparado",
          cancelado: "foi cancelado",
        };

        setPedidos((prevPedidos) =>
          prevPedidos.map((pedido) =>
            pedido._id === data.orderId
              ? { ...pedido, status: data.status }
              : pedido
          )
        );

        // Atualizar pedido atual se estiver aberto
        if (currentPedido && currentPedido._id === data.orderId) {
          setCurrentPedido((prevPedido) => ({
            ...prevPedido,
            status: data.status,
          }));
        }

        // Atualizar status do dialog de busca
        if (data.orderId === orderCreated?._id) {
          setStatusBuscandoMotoboy(data.status);
        }

        const message =
          statusMessages[data.status] ||
          `teve status atualizado para ${data.status}`;
        setSnackbar({
          open: true,
          message: `Pedido #${data.orderNumber || data.orderId} ${message}`,
          severity: data.status === "entregue" ? "success" : "info",
        });
      };

      // Motoboy atribuído
      const handleMotoboyAssigned = (data) => {
        console.log("👤 Motoboy atribuído via socket:", data);

        // Normalizar estrutura do motoboy para consistência
        const normalizedMotoboy = {
          name: data.motoboy?.name,
          phone: data.motoboy?.phone || data.motoboy?.phoneNumber,
          motoboyId: data.motoboy?._id || data.motoboy?.motoboyId,
          profileImage: data.motoboy?.profileImage,
          ...data.motoboy,
        };

        setPedidos((prevPedidos) =>
          prevPedidos.map((pedido) =>
            pedido._id === data.orderId
              ? {
                  ...pedido,
                  motoboy: normalizedMotoboy,
                  status: data.status || pedido.status,
                }
              : pedido
          )
        );

        // Atualizar pedido atual se estiver aberto
        if (currentPedido && currentPedido._id === data.orderId) {
          setCurrentPedido((prevPedido) => ({
            ...prevPedido,
            motoboy: normalizedMotoboy,
            status: data.status || prevPedido.status,
          }));
        }

        setSnackbar({
          open: true,
          message: `Motoboy ${
            data.motoboy?.name || "atribuído"
          } foi designado para o pedido #${data.orderNumber || data.orderId}`,
          severity: "info",
        });
      };

      // Localização do motoboy atualizada
      const handleMotoboyLocationUpdated = (data) => {
        // Atualizar localização do motoboy se necessário para rastreamento em tempo real
        console.log("📍 Localização do motoboy atualizada:", data);
        // Implementar se houver rastreamento em tempo real
      };

      // Pedido entregue
      const handleOrderDelivered = (data) => {
        console.log("📦 Pedido entregue via socket:", data);

        setPedidos((prevPedidos) =>
          prevPedidos.map((pedido) =>
            pedido._id === data.orderId
              ? { ...pedido, status: "entregue" }
              : pedido
          )
        );

        // Atualizar pedido atual se estiver aberto
        if (currentPedido && currentPedido._id === data.orderId) {
          setCurrentPedido((prevPedido) => ({
            ...prevPedido,
            status: "entregue",
          }));
        }

        setSnackbar({
          open: true,
          message: `🎉 Pedido #${
            data.orderNumber || data.orderId
          } foi entregue com sucesso!`,
          severity: "success",
        });
      };

      // Handler para atualizações gerais de pedidos
      const handleOrderUpdateSocket = (data) => {
        console.log("🔄 [SOCKET] Pedido atualizado:", data);

        setPedidos((prevPedidos) =>
          prevPedidos.map((pedido) =>
            pedido._id === data.orderId
              ? { ...pedido, status: data.status, ...data }
              : pedido
          )
        );

        // Atualizar pedido atual se estiver aberto
        if (currentPedido && currentPedido._id === data.orderId) {
          setCurrentPedido((prevPedido) => ({
            ...prevPedido,
            status: data.status,
            ...data,
          }));
        }

        setSnackbar({
          open: true,
          message: `Pedido atualizado para ${data.status}`,
          severity: "info",
        });
      };

      // Registrar todos os listeners
      socketService.on("orderAcceptedByMotoboy", handleOrderAcceptedByMotoboy);
      socketService.on("orderDeclinedByMotoboy", handleOrderDeclinedByMotoboy);
      socketService.on(
        "orderStatusUpdatedByMotoboy",
        handleOrderStatusUpdatedByMotoboy
      );
      socketService.on("motoboyAssigned", handleMotoboyAssigned);
      socketService.on("motoboyLocationUpdated", handleMotoboyLocationUpdated);
      socketService.on("orderDelivered", handleOrderDelivered);
      socketService.on("orderUpdate", handleOrderUpdateSocket);
      socketService.on("newOrder", (data) => {
        console.log("📦 Novo pedido recebido via socket:", data._doc);
        setPedidos((prevPedidos) => {
          if (prevPedidos.some((pedido) => pedido._id === data._doc._id)) {
            return prevPedidos;
          }
          return [data._doc, ...prevPedidos];
        });
      });

      // Cleanup na desmontagem
      return () => {
        socketService.off("connection:success", handleConnectionSuccess);
        socketService.off("connection:failed", handleConnectionFailed);
        socketService.off("connection:lost", handleConnectionLost);
        socketService.off(
          "orderAcceptedByMotoboy",
          handleOrderAcceptedByMotoboy
        );
        socketService.off(
          "orderDeclinedByMotoboy",
          handleOrderDeclinedByMotoboy
        );
        socketService.off(
          "orderStatusUpdatedByMotoboy",
          handleOrderStatusUpdatedByMotoboy
        );
        socketService.off("motoboyAssigned", handleMotoboyAssigned);
        socketService.off(
          "motoboyLocationUpdated",
          handleMotoboyLocationUpdated
        );
        socketService.off("orderDelivered", handleOrderDelivered);
        socketService.off("orderUpdate", handleOrderUpdateSocket);
        // Remover apenas a referência do listener 'newOrder', sem adicionar um novo
        socketService.off("newOrder");

        setSocketConnected(false);
        // Não desconectar completamente pois outros componentes podem usar
        // socketService.disconnect();
      };
    }
  }, [currentUser, storeId, currentPedido, orderCreated]);

  const handleFetchPedidos = () => {
    const fetchPedidos = async () => {
      try {
        if (!storeId) {
          console.log("⚠️ StoreId não disponível ainda, aguardando...");
          return;
        }

        setLoading(true);
        console.log("🔍 Iniciando fetch de pedidos para loja:", storeId);
        console.log("👤 Usuário atual:", currentUser);

        const response = await getStoreOrders(storeId);
        console.log("✅ Pedidos carregados com sucesso:", response.data);
        setPedidos(response.data);
        setFilteredPedidos(response.data);
        setLoading(false);
      } catch (err) {
        console.error("❌ Erro ao carregar pedidos:", err);
        console.error("📋 Detalhes do erro:", {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        });

        setError(
          "Não foi possível carregar os pedidos. Tente novamente mais tarde."
        );
        setSnackbar({
          open: true,
          message: `Erro ao carregar pedidos: ${
            err.response?.status || err.message
          }`,
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
        if (!currentUser) {
          console.log("⚠️ Usuário não autenticado, aguardando...");
          return;
        }

        if (!storeId) {
          console.log("⚠️ StoreId não disponível ainda, aguardando...");
          return;
        }

        setLoading(true);
        const response = await getStoreOrders(storeId);
        console.log("✅ Pedidos carregados no useEffect:", response.data);
        setPedidos(response.data);
        setFilteredPedidos(response.data);
        setLoading(false);
      } catch (err) {
        console.error("❌ Erro no useEffect ao carregar pedidos:", err);
        console.error("📋 Detalhes do erro no useEffect:", {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        });

        setError(
          "Não foi possível carregar os pedidos. Tente novamente mais tarde."
        );
        setSnackbar({
          open: true,
          message: `Erro ao carregar pedidos: ${
            err.response?.status || err.message
          }`,
          severity: "error",
        });
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [currentUser, storeId]); // Adicionadas dependências do currentUser e storeId

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const userProfileResponse = await api.get("/stores/me");
        const userProfile = userProfileResponse.data;
        setStoreId(userProfile._id);
        setStoreOrigin({
          name:
            userProfile.name ||
            userProfile.businessName ||
            userProfile.displayName,
          cnpj: userProfile.cnpj,
          address: userProfile.address,
          coordinates: userProfile.geolocation.coordinates,
        });
      } catch (err) {
        console.error("Erro ao carregar perfil da loja:", err);
        setSnackbar({
          open: true,
          message: "Erro ao carregar perfil da loja",
          severity: "error",
        });
      }
    };
    fetchStore();
  }, []);

  // Carregar produtos (para uso na criação de pedidos)
  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoadingProdutos(true);
        // const response = await api.get("/products");
        // setProdutos(response.data);
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

  // Calcular preview automaticamente quando endereços mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        storeOrigin &&
        storeOrigin.coordinates &&
        novoPedido.customer.some(
          (c) =>
            c.customerAddress.coordinates &&
            c.customerAddress.coordinates.length === 2
        )
      ) {
        calculatePreviewCost();
      }
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timer);
  }, [storeOrigin, novoPedido.customer, driveBack]);

  // Efeito para aplicar filtros
  useEffect(() => {
    let result = [...pedidos];

    // Filtrar por termo de busca
    if (searchTerm) {
      result = result.filter((pedido) => {
        // Procura no número do pedido
        if (
          pedido.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return true;
        }

        // Se customer for array, procura em todos os clientes
        if (Array.isArray(pedido.customer)) {
          return pedido.customer.some(
            (cliente) =>
              cliente?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              cliente?.phone?.includes(searchTerm)
          );
        }
        // Para compatibilidade com pedidos antigos
        else if (pedido.customer?.name) {
          return (
            pedido.customer.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            pedido.customer?.phone?.includes(searchTerm)
          );
        }

        return false;
      });
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
  const handleViewPedido = async (pedido) => {
    setCurrentPedido(pedido);
    // if (pedido.status === "pendente") {
    //   setBuscandoMotoboy(true);
    //   setOrderCreated({
    //     orderNumber: pedido.orderNumber,
    //     customerName: Array.isArray(pedido.customer)
    //       ? pedido.customer.map((c) => c.name).join(", ")
    //       : pedido.customer?.name || "Cliente",
    //     createdAt: pedido.createdAt,
    //   });
    // }

    setOpenDialog(true);
  };

  // Atualizar status do pedido
  const handleUpdateStatus = async (pedidoId, newStatus) => {
    try {
      setLoading(true);

      // Chamar API para atualizar status
      await api.put(`/orders/status`, { status: newStatus, id: pedidoId });

      // Também notificar via socket para comunicação em tempo real
      socketService.updateOrderStatus(pedidoId, newStatus);

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
    // Verificar se existe motoboy e telefone
    if (
      !pedido.motoboy ||
      (!pedido.motoboy.phone && !pedido.motoboy.phoneNumber)
    ) {
      setSnackbar({
        open: true,
        message: "Não há um motoboy atribuido ao pedido ainda.",
        severity: "error",
      });
      setLoading(false);
      return;
    }

    // Usar phone ou phoneNumber como fallback
    const phoneNumber = pedido.motoboy.phone || pedido.motoboy.phoneNumber;

    if (!phoneNumber) {
      setSnackbar({
        open: true,
        message: "Telefone do motoboy não encontrado.",
        severity: "error",
      });
      setLoading(false);
      return;
    }

    const driverCode = phoneNumber.toString().slice(-4);
    if (code === driverCode) {
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
      customer: [
        {
          name: "",
          phone: "",
          customerAddress: {
            cep: null,
            address: "",
            addressNumber: "",
            bairro: "",
            cidade: "",
            estado: "",
            coordinates: [],
          },
        },
      ],
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
    setOriginLocation({
      lat: storeOrigin.coordinates[1],
      lng: storeOrigin.coordinates[0],
    });
    setMapCenter({
      lat: storeOrigin.coordinates[1],
      lng: storeOrigin.coordinates[0],
    });
    setDestinationLocation([]);
    setActiveCustomerIndex(0);
    setOpenCreateDialog(true);
  };

  // Fechar formulário de criação de pedido
  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  // Adicionar um novo cliente
  const handleAddCustomer = () => {
    const newCustomerIndex = novoPedido.customer.length;

    setNovoPedido((prev) => ({
      ...prev,
      customer: [
        ...prev.customer,
        {
          name: "",
          phone: "",
          customerAddress: {
            cep: null,
            address: "",
            addressNumber: "",
            bairro: "",
            cidade: "",
            estado: "",
            coordinates: [],
          },
        },
      ],
    }));

    // Muda o foco para o novo cliente adicionado
    setActiveCustomerIndex(newCustomerIndex);
  };

  // Remover um cliente
  const handleRemoveCustomer = (index) => {
    if (novoPedido.customer.length <= 1) {
      setSnackbar({
        open: true,
        message: "O pedido deve ter pelo menos um cliente",
        severity: "warning",
      });
      return;
    }

    setNovoPedido((prev) => ({
      ...prev,
      customer: prev.customer.filter((_, i) => i !== index),
    }));

    // Remove o ponto de destino correspondente
    setDestinationLocation((prevLocations) =>
      prevLocations
        .filter((location) => location.customerIndex !== index)
        .map((location) => ({
          ...location,
          // Ajusta os índices dos pontos com índice maior que o removido
          customerIndex:
            location.customerIndex > index
              ? location.customerIndex - 1
              : location.customerIndex,
        }))
    );

    // Atualiza o índice atual se necessário
    if (activeCustomerIndex >= index && activeCustomerIndex > 0) {
      setActiveCustomerIndex(activeCustomerIndex - 1);
    }
  };

  // Atualizar dados do cliente
  // Atualizar dados do cliente
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    const index = activeCustomerIndex;

    // Check if the field belongs to the address object
    if (
      [
        "cep",
        "address",
        "addressNumber",
        "bairro",
        "cidade",
        "estado",
      ].includes(name)
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
        customer: prev.customer.map((customer, i) =>
          i === index
            ? {
                ...customer,
                customerAddress: {
                  ...customer.customerAddress,
                  [name]: processedValue,
                },
              }
            : customer
        ),
      }));
    } else {
      // Handle regular customer fields
      setNovoPedido((prev) => ({
        ...prev,
        customer: prev.customer.map((customer, i) =>
          i === index ? { ...customer, [name]: value } : customer
        ),
      }));
      if (name === "phone") {
        // Gerar código do cliente (últimos 4 dígitos do telefone)
        const clienteCod = value.replace(/\D/g, "").slice(-4);
        setNovoPedido((prev) => ({
          ...prev,
          customer: prev.customer.map((customer, i) =>
            i === index ? { ...customer, cliente_cod: clienteCod } : customer
          ),
        }));
      }
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

  // Função para calcular preview do custo
  const calculatePreviewCost = async () => {
    if (!storeOrigin || !storeOrigin.coordinates) {
      setSnackbar({
        open: true,
        message: "Selecione uma loja primeiro",
        severity: "warning",
      });
      return;
    }

    // Verificar se todos os clientes têm coordenadas
    const customersWithCoords = novoPedido.customer.filter(
      (customer) =>
        customer.customerAddress.coordinates &&
        customer.customerAddress.coordinates.length === 2
    );

    if (customersWithCoords.length === 0) {
      setSnackbar({
        open: true,
        message: "Adicione pelo menos um endereço de entrega no mapa",
        severity: "warning",
      });
      return;
    }

    try {
      setLoadingPreview(true);

      const previewData = {
        store: {
          coordinates: storeOrigin.coordinates,
        },
        customer: customersWithCoords,
        driveBack: driveBack,
      };

      console.log("Enviando dados para preview:", previewData);

      const response = await api.post("/orders/preview-cost", previewData);

      console.log("Resposta do preview:", response.data);

      if (response.data.success) {
        setPreviewCost(response.data.preview);
        setSnackbar({
          open: true,
          message: `Custo calculado: ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(response.data.preview.totalCost)}`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Erro ao calcular custo: " + response.data.message,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Erro ao calcular preview do custo:", error);
      setSnackbar({
        open: true,
        message: "Erro ao calcular custo da viagem",
        severity: "error",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Criar novo pedido com suporte a múltiplos clientes
  const handleCreatePedido = async () => {
    // Validação para múltiplos clientes
    const clientesInvalidos = novoPedido.customer.filter(
      (cliente) =>
        !cliente.name ||
        !cliente.phone ||
        !cliente.customerAddress.address ||
        !cliente.customerAddress.addressNumber ||
        !cliente.customerAddress.bairro ||
        !cliente.customerAddress.cidade
    );

    if (clientesInvalidos.length > 0) {
      // Encontrar o índice do primeiro cliente inválido para focar nele
      const indexInvalido = novoPedido.customer.findIndex(
        (cliente) =>
          !cliente.name ||
          !cliente.phone ||
          !cliente.customerAddress.address ||
          !cliente.customerAddress.addressNumber ||
          !cliente.customerAddress.bairro ||
          !cliente.customerAddress.cidade
      );

      // Alterar para o cliente inválido
      if (indexInvalido !== -1) {
        setActiveCustomerIndex(indexInvalido);
      }

      setSnackbar({
        open: true,
        message:
          "Todos os clientes precisam ter nome, telefone e endereço completo preenchidos",
        severity: "warning",
      });
      return;
    }

    // Gerar código para cada cliente (últimos 4 dígitos do telefone)
    const customersWithCode = novoPedido.customer.map((customer) => ({
      ...customer,
      cliente_cod: customer.phone.replace(/\D/g, "").slice(-4),
    }));

    if (novoPedido.items.length === 0) {
      novoPedido.total = 1;
      novoPedido.items = [
        {
          productName: "Produto padrão",
          quantity: 1,
          price: 1,
        },
      ];
    }

    try {
      setLoading(true);
      const userProfileResponse = await api.get("/stores/me");
      const userCnpj = userProfileResponse.data.cnpj;
      const storeAddress = userProfileResponse.data.address;
      const userGeolocation = userProfileResponse.data.geolocation;

      const orderData = {
        ...novoPedido,
        customer: customersWithCode, // Enviar clientes com código gerado
        store: {
          name: storeOrigin.name,
          cnpj: userCnpj,
          address: {
            cep: novoPedido.store.address.cep,
            address: novoPedido.store.address.logradouro,
            addressNumber: novoPedido.store.address.numero,
            bairro: novoPedido.store.address.bairro,
            cidade: novoPedido.store.address.cidade,
            estado: novoPedido.store.address.estado,
            coordinates: novoPedido.store.coordinates,
          },
          coordinates: novoPedido.store.coordinates,
        },
        driveBack: driveBack, // Usar o estado driveBack
        findDriverAuto: false,
      };

      setOpenCreateDialog(false);
      setBuscandoMotoboy(true);

      const response = await api.post("/orders", orderData);

      const orderId = response.data._id || response.data.order._id;

      if (!orderId) {
        setBuscandoMotoboy(false);
        setSnackbar({
          open: true,
          message: "Erro ao criar pedido",
          severity: "error",
        });
        return;
      }

      setOrderCreated({
        orderNumber: response.data.order.orderNumber,
        customerName: response.data.order.customer.name,
        createdAt: response.data.order.createdAt,
      });
      // Adicionar novo pedido à lista - REMOVIDO para evitar duplicação
      // O pedido já é adicionado via CreateOrderDialog callback
      // setPedidos((prev) => [response.data.order, ...prev]);
      setBuscandoMotoboy(true);
      setSnackbar({
        open: true,
        message: "Pedido criado com sucesso",
        severity: "success",
      });

      setOpenCreateDialog(false);
      setLoading(false);

      await findMotoboys(orderId);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao criar pedido",
        severity: "error",
      });
      console.error("Erro ao criar pedido:", err);
      setLoading(false);
      return;
    }
  };

  const handleCloseBuscandoMotoboy = () => {
    setBuscandoMotoboy(false);
    setOrderCreated(null);
  };

  const handleOnSubmitAvaliation = async (avaliation) => {
    try {
      const response = await api.post(`/avaliates/`, avaliation);
      const response2 = await api.post(`/orders/${avaliation.orderId}/rated`);
      setPedidos((prev) =>
        prev.map((pedido) =>
          pedido._id === avaliation.orderId
            ? { ...pedido, motoboy: { ...pedido.motoboy, rated: true } }
            : pedido
        )
      );
      setSnackbar({
        open: true,
        message: "Avaliação enviada com sucesso",
        severity: "success",
      });
      setAvaliateOpen(false);
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      setSnackbar({
        open: true,
        message: "Erro ao enviar avaliação",
        severity: "error",
      });
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
  const menuItems = SUPPORT_MENU_ITEMS;

  // Definir itens de rodapé para SideDrawer
  const footerItems = createAdminFooterItems(handleLogout);

  // Formatação de data e hora
  const formatDateTime = (dateString) => {
    if (!dateString) {
      return "Data não informada";
    }

    const date = new Date(dateString);

    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return "Data inválida";
    }

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

  // Função para formatar informações de benefícios/descontos
  const formatBenefitInfo = (benefit) => {
    const targetNames = {
      ITEM: "Item específico",
      PROGRESSIVE_DISCOUNT_ITEM: "Desconto progressivo no item",
      ORDER: "Pedido completo",
      DELIVERY: "Taxa de entrega",
    };

    const sponsorNames = {
      IFOOD: "iFood",
      MERCHANT: "Loja",
      CUSTOMER: "Cliente",
    };

    return {
      targetName: targetNames[benefit.target] || benefit.target,
      sponsorshipInfo:
        benefit.sponsorshipValues?.map((sponsor) => ({
          name: sponsorNames[sponsor.name] || sponsor.name,
          value: sponsor.value,
          percentage:
            benefit.value > 0
              ? Math.round((sponsor.value / benefit.value) * 100)
              : 0,
        })) || [],
    };
  };

  // Obter chip colorido de acordo com o status
  const getStatusChip = (status) => {
    const statusConfig = {
      pendente: {
        color: "warning",
        icon: <ScheduleIcon fontSize="small" />,
        label: "Pendente de Aceitação",
      },
      em_preparo: {
        color: "primary",
        icon: <CheckIcon fontSize="small" />,
        label: "Em Preparo",
      },
      pronto: {
        color: "success",
        icon: <DoneAllIcon fontSize="small" />,
        label: "Pronto para retirada",
      },
      ready_takeout: {
        color: "success",
        icon: <DoneAllIcon fontSize="small" />,
        label: "Pronto para Retirada",
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
        onClick={() => setCreateDialogOpen(true)}
        startIcon={<AddIcon />}
      >
        Criar Pedido
      </Button>
    </Box>
  );

  const handleCallDeliveryPerson = async (pedido) => {
    const orderReady = require("../../services/api").updateOrderStatus;

    const newStatus =
      pedido.deliveryMode === "retirada" ? "ready_takeout" : "pronto";

    console.log("Novo status do pedido:", newStatus);

    if (newStatus === "ready_takeout") {
      try {
        await orderReady(pedido._id, newStatus);
      } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
        setSnackbar({
          open: true,
          message: `Erro ao verificar código de entrega no iFood: ${error.message}`,
          severity: "error",
        });
        return;
      }
      setPedidos((prevPedidos) =>
        prevPedidos.map((p) =>
          p._id === pedido._id ? { ...p, status: newStatus } : p
        )
      );
      setCurrentPedido((prev) => ({ ...prev, status: newStatus }));
      setSnackbar({
        open: true,
        message:
          "Entregador chamado com sucesso! Agora você pode enviar para entrega.",
        severity: "success",
      });
      return;
    }

    if (!pedido.motoboy || !pedido.motoboy.name) {
      setSnackbar({
        open: true,
        message: "Nenhum motoboy atribuído a este pedido.",
        severity: "warning",
      });
      return;
    }
    try {
      const response = await orderReady(pedido._id, newStatus);
      const phoneNumber = pedido.motoboy.phone;
      const motoboyId = pedido.motoboy.motoboyId;

      if (response.status > 199 && response.status < 300) {
        // Também notificar via socket
        socketService.confirmOrderReady(pedido._id, motoboyId);

        // Marcar que o entregador foi chamado
        pedido.hasArrived = true;

        // Atualizar o estado do pedido atual para refletir a mudança
        setCurrentPedido({ ...pedido, hasArrived: true, status: newStatus });

        // Atualizar também na lista de pedidos
        setPedidos((prevPedidos) =>
          prevPedidos.map((p) =>
            p._id === pedido._id
              ? { ...p, hasArrived: true, status: newStatus }
              : p
          )
        );

        setSnackbar({
          open: true,
          message:
            "Entregador chamado com sucesso! Agora você pode enviar para entrega.",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Erro ao Pedido Pronto. Telefone do entregador: ${phoneNumber}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Erro ao Pedido Pronto:", error);
      setSnackbar({
        open: true,
        message: `Erro ao Pedido Pronto. Telefone do entregador: ${pedido.motoboy.phone}`,
        severity: "error",
      });
    }
  };

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

  // Função para lidar com a alteração entre as guias Origem e Destino
  const handleLocationTabChange = (event, newValue) => {
    setLocationTab(newValue);
  };

  // Função para alternar entre mapa e entrada manual de endereço
  const toggleAddressInputMethod = () => {
    setUseMap(!useMap);
  };

  // Função para lidar com cliques no mapa
  const handleMapClick = ({ lat, lng }) => {
    // Atualizar a localização dependendo da aba selecionada
    if (locationTab === 0) {
      // Local 1 (Origem)
      setOriginLocation({ lat, lng });
      setNovoPedido((prev) => ({
        ...prev,
        store: {
          ...prev.store,
          coordinates: [lng, lat],
        },
      }));

      // Se possível, buscar endereço reverso usando API de geocodificação
      reverseGeocode(lat, lng, "origin");
    } else {
      // Local 2 (Destino) - Agora atualiza para o cliente ativo e adiciona/atualiza no array de destinos
      setDestinationLocation((prevLocations) => {
        // Criar um novo array para evitar mutação direta
        const newLocations = [...prevLocations];
        // Verificar se já existe um ponto para este cliente
        const existingIndex = newLocations.findIndex(
          (loc) => loc.customerIndex === activeCustomerIndex
        );

        // Se já existe, atualiza a localização
        if (existingIndex !== -1) {
          newLocations[existingIndex] = {
            lat,
            lng,
            customerIndex: activeCustomerIndex,
          };
        } else {
          // Caso contrário, adiciona nova localização
          newLocations.push({ lat, lng, customerIndex: activeCustomerIndex });
        }

        return newLocations;
      });

      // Atualiza os dados do cliente ativo
      setNovoPedido((prev) => ({
        ...prev,
        customer: prev.customer.map((customer, i) =>
          i === activeCustomerIndex
            ? {
                ...customer,
                customerAddress: {
                  ...customer.customerAddress,
                  coordinates: [lng, lat],
                },
              }
            : customer
        ),
      }));

      // Se possível, buscar endereço reverso usando API de geocodificação
      reverseGeocode(lat, lng, "destination");
    }
  };

  // Função para obter localização atual
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });

          // Atualizar a localização dependendo da aba selecionada
          if (locationTab === 0) {
            // Local 1 (Origem)
            setOriginLocation({ lat: latitude, lng: longitude });
            setNovoPedido((prev) => ({
              ...prev,
              store: {
                ...prev.store,
                coordinates: [longitude, latitude],
              },
            }));

            // Geocodificação reversa
            reverseGeocode(latitude, longitude, "origin");
          } else {
            // Local 2 (Destino) - Atualiza para o cliente ativo no array de destinos
            setDestinationLocation((prevLocations) => {
              const newLocations = [...prevLocations];
              const existingIndex = newLocations.findIndex(
                (loc) => loc.customerIndex === activeCustomerIndex
              );

              if (existingIndex !== -1) {
                newLocations[existingIndex] = {
                  lat: latitude,
                  lng: longitude,
                  customerIndex: activeCustomerIndex,
                };
              } else {
                newLocations.push({
                  lat: latitude,
                  lng: longitude,
                  customerIndex: activeCustomerIndex,
                });
              }

              return newLocations;
            });

            // Atualiza os dados do cliente ativo
            setNovoPedido((prev) => ({
              ...prev,
              customer: prev.customer.map((customer, i) =>
                i === activeCustomerIndex
                  ? {
                      ...customer,
                      customerAddress: {
                        ...customer.customerAddress,
                        coordinates: [longitude, latitude],
                      },
                    }
                  : customer
              ),
            }));

            // Geocodificação reversa
            reverseGeocode(latitude, longitude, "destination");
          }
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          setSnackbar({
            open: true,
            message: "Não foi possível obter sua localização atual",
            severity: "error",
          });
        }
      );
    } else {
      setSnackbar({
        open: true,
        message: "Geolocalização não suportada pelo seu navegador",
        severity: "error",
      });
    }
  };

  // Função para geocodificação reversa (obter endereço a partir das coordenadas)
  const reverseGeocode = async (lat, lng, locationType) => {
    try {
      // Aqui você pode usar qualquer API de geocodificação reversa
      // Por exemplo, usando a API do Google Maps ou Nominatim

      // Exemplo com API do Google Maps (requer chave API)
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );

      if (!response.data) {
        throw new Error("Erro ao obter endereço");
      }

      let addressData = response.data.results[0].address_components;
      addressData = {
        cep: response.data.results[0].address_components[6].long_name,
        logradouro: response.data.results[0].address_components[1].long_name,
        numero: response.data.results[0].address_components[0].long_name,
        bairro: response.data.results[0].address_components[2].long_name,
        cidade: response.data.results[0].address_components[3].long_name,
        estado: response.data.results[0].address_components[4].long_name,
      };

      // Atualizar o estado com o endereço obtido
      if (locationType === "origin") {
        setNovoPedido((prev) => ({
          ...prev,
          store: {
            ...prev.store,
            address: {
              ...prev.store.address,
              cep: addressData.cep,
              logradouro: addressData.logradouro,
              numero: addressData.numero,
              bairro: addressData.bairro,
              cidade: addressData.cidade,
              estado: addressData.estado,
            },
          },
        }));
      } else {
        // Atualiza para o cliente atual
        setNovoPedido((prev) => ({
          ...prev,
          customer: prev.customer.map((customer, i) =>
            i === activeCustomerIndex
              ? {
                  ...customer,
                  customerAddress: {
                    ...customer.customerAddress,
                    cep: addressData.cep,
                    address: addressData.logradouro,
                    addressNumber: addressData.numero,
                    bairro: addressData.bairro,
                    cidade: addressData.cidade,
                    estado: addressData.estado,
                  },
                }
              : customer
          ),
        }));
      }
    } catch (error) {
      console.error("Erro na geocodificação reversa:", error);
      setSnackbar({
        open: true,
        message: "Erro ao obter endereço a partir das coordenadas",
        severity: "error",
      });
    }
  };

  // Adicione esta função para processar a seleção de endereço
  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) {
      setSnackbar({
        open: true,
        message: "Digite um endereço para buscar",
        severity: "warning",
      });
      return;
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchAddress + ", Brasil"
        )}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.status === "OK" && response.data.results.length > 0) {
        const result = response.data.results[0];
        const { lat, lng } = result.geometry.location;

        // Centralizar o mapa na localização encontrada
        setMapCenter({ lat, lng });

        // Simular clique no mapa para definir a localização
        handleMapClick({ lat, lng });

        setSnackbar({
          open: true,
          message: "Endereço encontrado com sucesso!",
          severity: "success",
        });

        // Limpar o campo de busca
        setSearchAddress("");
      } else {
        setSnackbar({
          open: true,
          message: "Endereço não encontrado. Tente ser mais específico.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      setSnackbar({
        open: true,
        message: "Erro ao buscar endereço. Tente novamente.",
        severity: "error",
      });
    }
  };
  // Adicione este useEffect para inicializar a API do Google Places

  // Novo useEffect para o autocomplete simples
  useEffect(() => {
    if (
      useMap &&
      searchInputRef.current &&
      window.google &&
      window.google.maps &&
      window.google.maps.places
    ) {
      // Criar autocomplete simples
      const autocomplete = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          componentRestrictions: { country: "br" },
          fields: ["geometry", "formatted_address"],
          types: ["address"],
        }
      );

      // Listener para quando um lugar for selecionado
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          // Atualizar centro do mapa
          setMapCenter({ lat, lng });

          // Simular clique no mapa
          handleMapClick({ lat, lng });
        }
      });

      return () => {
        if (autocomplete) {
          window.google.maps.event.clearInstanceListeners(autocomplete);
        }
      };
    }
  }, [useMap, locationTab]);

  const handleTakeoutCode = async (pedido) => {
    if (!deliveryCode.trim()) {
      setSnackbar({
        open: true,
        message: "Digite um código de retirada",
        severity: "warning",
      });
      return;
    }
    try {
      const response = await api.post("/verifyIfoodDeliveryCode", {
        orderId: pedido.ifoodId,
        deliveryCode: deliveryCode,
      });
      setSnackbar({
        open: true,
        message: response.data.message,
        severity: response.data.success ? "success" : "error",
      });
    } catch (error) {
      console.error("Erro ao verificar código de retirada:", error);
      setSnackbar({
        open: true,
        message: "Erro ao verificar código de retirada",
        severity: "error",
      });
    }
  };

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

      {/* Drawer para navegação */}
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

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Indicador de conexão Socket */}
              <Chip
                icon={
                  socketConnected ? (
                    <Icon sx={{ color: "success.main" }}>wifi</Icon>
                  ) : (
                    <Icon sx={{ color: "error.main" }}>wifi_off</Icon>
                  )
                }
                label={socketConnected ? "Conectado" : "Desconectado"}
                size="small"
                color={socketConnected ? "success" : "error"}
                variant="outlined"
                sx={{
                  fontSize: "0.75rem",
                  "& .MuiChip-icon": { fontSize: "16px" },
                }}
              />

              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Novo Pedido
              </Button>
            </Box>
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

          <Box sx={{ mt: 4 }}>
            <ViewCoordinates isLoaded={isLoaded} loadError={loadError} />
          </Box>

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
                        bgcolor: "inherit",
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
                      <TableCell>
                        {(pedido.customer &&
                          pedido.customer.length > 0 &&
                          pedido.customer[0]?.name) ||
                          "Não identificado"}
                      </TableCell>
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

                        {pedido.status === "entregue" &&
                          !pedido.motoboy.rated && (
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAvaliateOpen(true);
                                setCurrentPedido(pedido);
                              }}
                            >
                              <StarIcon />
                            </IconButton>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Dialog
            open={openCancelDialog}
            onClose={() => setOpenCancelDialog(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: { borderRadius: 3, p: 1, bgcolor: "background.paper" },
            }}
          >
            <DialogTitle
              sx={{
                bgcolor: "error.main",
                color: "white",
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <CloseIcon sx={{ fontSize: 28, color: "white" }} />
                <span>Cancelar Pedido</span>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pb: 1 }}>
              <Typography
                sx={{ mb: 2, fontWeight: 500, color: "text.primary" }}
              >
                {currentPedido
                  ? `Você tem certeza que deseja cancelar o pedido #${currentPedido.orderNumber}?`
                  : "Nenhum pedido selecionado para cancelar."}
              </Typography>
              {currentPedido && currentPedido.ifoodId && (
                <Box>
                  <Typography
                    sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}
                  >
                    Selecione o motivo do cancelamento:
                  </Typography>
                  <RadioGroup
                    value={selectedReason || ""}
                    onChange={(e) => setSelectedReason(e.target.value)}
                  >
                    {!cancellationReasons ? (
                      <CircularProgress size={24} />
                    ) : (
                      cancellationReasons.map((reason) => (
                        <Box
                          key={reason.cancelCodeId}
                          sx={{
                            mb: 1,
                            borderRadius: 2,
                            border:
                              selectedReason === reason.cancelCodeId
                                ? "2px solid #f44336"
                                : "1px solid #e0e0e0",
                            bgcolor:
                              selectedReason === reason.cancelCodeId
                                ? "rgba(244,67,54,0.08)"
                                : "background.paper",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            px: 2,
                            py: 1,
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedReason(reason)}
                        >
                          <Radio
                            checked={selectedReason === reason}
                            value={reason}
                            color="error"
                            sx={{ mr: 1 }}
                          />
                          <Typography
                            sx={{ fontWeight: 500, color: "text.primary" }}
                          >
                            {reason.description}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </RadioGroup>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => setOpenCancelDialog(false)}
                variant="outlined"
                color="inherit"
              >
                Voltar
              </Button>
              {currentPedido && currentPedido.ifoodId ? (
                <Button
                  onClick={() => handleCancelOrder(currentPedido?.ifoodId)}
                  color="error"
                  variant="contained"
                  disabled={!selectedReason}
                >
                  Confirmar Cancelamento
                </Button>
              ) : (
                <Button
                  onClick={() => handleCancelOrder(currentPedido?._id)}
                  color="error"
                  variant="contained"
                >
                  Confirmar Cancelamento
                </Button>
              )}
            </DialogActions>
          </Dialog>

          {/* Dialog para visualizar detalhes do pedido */}
          <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            maxWidth="lg"
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
                    {/* Informações dos Clientes */}
                    <Grid item xs={12} width="100%" mt={3}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            color: "primary.main",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <PersonIcon sx={{ mr: 1 }} /> Clientes e Endereços de
                          Entrega
                        </Typography>

                        {/* Lista de clientes do pedido atual */}
                        {currentPedido.customer &&
                        Array.isArray(currentPedido.customer) ? (
                          currentPedido.customer.map((customer, index) => (
                            <Box
                              key={index}
                              sx={{
                                mb: 2,
                                p: 2,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: "bold",
                                  mb: 1,
                                  color: "primary.main",
                                }}
                              >
                                Cliente {index + 1}
                              </Typography>

                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2">
                                    <strong>Nome:</strong>{" "}
                                    {customer.name || "Não informado"}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2">
                                    <strong>Telefone:</strong>{" "}
                                    {customer.phone || "Não informado"}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2">
                                    <strong>CPF/CNPJ:</strong>{" "}
                                    {customer.documentNumber || "Não informado"}
                                  </Typography>
                                </Grid>

                                {customer.customerAddress && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                      <strong>Endereço de Entrega:</strong>
                                    </Typography>
                                    <Typography variant="body2" sx={{ ml: 2 }}>
                                      {customer.customerAddress.address &&
                                      customer.customerAddress.addressNumber
                                        ? `${customer.customerAddress.address}, ${customer.customerAddress.addressNumber}`
                                        : "Endereço não informado"}
                                      {customer.customerAddress.bairro && (
                                        <span>
                                          {" "}
                                          - {customer.customerAddress.bairro}
                                        </span>
                                      )}
                                      {customer.customerAddress.cidade && (
                                        <span>
                                          , {customer.customerAddress.cidade}
                                        </span>
                                      )}
                                      {customer.customerAddress.estado && (
                                        <span>
                                          {" "}
                                          - {customer.customerAddress.estado}
                                        </span>
                                      )}
                                      {customer.customerAddress.cep && (
                                        <span>
                                          {" "}
                                          (CEP: {customer.customerAddress.cep})
                                        </span>
                                      )}
                                    </Typography>

                                    {customer.customerAddress.coordinates &&
                                      customer.customerAddress.coordinates
                                        .length === 2 && (
                                        <Chip
                                          label={`Coordenadas: ${customer.customerAddress.coordinates[1].toFixed(
                                            6
                                          )}, ${customer.customerAddress.coordinates[0].toFixed(
                                            6
                                          )}`}
                                          color="white"
                                          variant="outlined"
                                          size="small"
                                          sx={{ mt: 1 }}
                                        />
                                      )}
                                  </Grid>
                                )}

                                {customer.cliente_cod && (
                                  <Grid item xs={12}>
                                    <Chip
                                      label={`Código do Cliente: ${customer.cliente_cod}`}
                                      color="secondary"
                                      variant="outlined"
                                      size="small"
                                    />
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Nenhum cliente informado ou dados inválidos.
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} width={"100%"}>
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
                        {currentPedido.motoboy?.name &&
                          currentPedido.deliveryMode !== "retirada" && (
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
                                {currentPedido.motoboy?.name}
                              </Typography>
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
                                  Confirmar Preparação
                                </Button>
                              )}

                              {currentPedido.status && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 2,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {/* Primeiro: Botão para Pedido Pronto */}
                                  {currentPedido.status === "em_preparo" && (
                                    <Button
                                      variant="contained"
                                      color="warning"
                                      startIcon={<NotificationAdd />}
                                      onClick={() =>
                                        handleCallDeliveryPerson(currentPedido)
                                      }
                                      sx={{
                                        py: 1,
                                        px: 2,
                                        height: "40px",
                                      }}
                                    >
                                      Pedido Pronto
                                    </Button>
                                  )}

                                  {/* Segundo: Campo de código e botão para enviar (só aparece após Pedido Pronto) */}
                                  {currentPedido.status === "pronto" && (
                                    <>
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
                                    </>
                                  )}
                                </Box>
                              )}
                              {currentPedido.status === "ready_takeout" && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    mt: 1,
                                  }}
                                >
                                  <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    label="Código de retirada"
                                    onChange={(e) => {
                                      setDeliveryCode(e.target.value);
                                    }}
                                    sx={{
                                      maxWidth: { sm: "220px" },
                                    }}
                                  />
                                  <Button
                                    variant="contained"
                                    color="info"
                                    startIcon={<DeliveryIcon />}
                                    onClick={() =>
                                      handleTakeoutCode(currentPedido)
                                    }
                                    sx={{
                                      py: 1,
                                      px: 2,
                                      height: "40px",
                                      mt: 1,
                                    }}
                                  >
                                    Concluir
                                  </Button>
                                </Box>
                              )}

                              {currentPedido.status === "em_entrega" && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Pedido em entrega
                                </Typography>
                              )}
                            </Box>

                            {/* Botão cancelar sempre à direita */}
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<CloseIcon />}
                              onClick={() => {
                                setOpenCancelDialog(true);
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
                          <Typography variant="body2" color="text.secondary">
                            {currentPedido.payment.cardBrand}
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
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Troco:
                          </Typography>
                          <Typography variant="body2">
                            {formatCurrency(currentPedido.payment.change)}
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

                    {/* Benefícios e Descontos */}
                    {currentPedido.benefits &&
                      currentPedido.benefits.length > 0 && (
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
                              <StarIcon sx={{ mr: 1 }} />
                              Benefícios e Descontos
                            </Typography>
                            {currentPedido.benefits.map((benefit, index) => {
                              const benefitInfo = formatBenefitInfo(benefit);
                              return (
                                <Box
                                  key={index}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    bgcolor: "#ececec",
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: "success.main",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      mb: 1,
                                    }}
                                  >
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: "bold",
                                        color: "success.dark",
                                      }}
                                    >
                                      {benefitInfo.targetName}
                                    </Typography>
                                    <Chip
                                      label={`-${formatCurrency(
                                        benefit.value
                                      )}`}
                                      color="success"
                                      size="small"
                                      sx={{ fontWeight: "bold" }}
                                    />
                                  </Box>

                                  {benefit.targetId && (
                                    <Typography
                                      variant="body2"
                                      sx={{ mb: 1, fontStyle: "italic" }}
                                    >
                                      Aplicado ao item #{benefit.targetId}
                                    </Typography>
                                  )}

                                  {benefitInfo.sponsorshipInfo.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: "bold", mb: 1 }}
                                      >
                                        Responsáveis pelo Subsídio:
                                      </Typography>
                                      {benefitInfo.sponsorshipInfo.map(
                                        (sponsorship, sponsorIndex) => (
                                          <Box
                                            key={sponsorIndex}
                                            sx={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              ml: 2,
                                              mb: 0.5,
                                              p: 1,
                                              bgcolor: "rgba(255,255,255,0.7)",
                                              borderRadius: 0.5,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                              }}
                                            >
                                              <Typography variant="body2">
                                                {sponsorship.name}
                                              </Typography>
                                              <Chip
                                                label={`${sponsorship.percentage}%`}
                                                size="small"
                                                color="info"
                                                variant="outlined"
                                              />
                                            </Box>
                                            <Typography
                                              variant="body2"
                                              sx={{ fontWeight: "bold" }}
                                            >
                                              {formatCurrency(
                                                sponsorship.value
                                              )}
                                            </Typography>
                                          </Box>
                                        )
                                      )}
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}

                            <Box
                              sx={{
                                mt: 2,
                                p: 1,
                                bgcolor: "info.light",
                                borderRadius: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: "bold", color: "white" }}
                              >
                                Total em Benefícios:{" "}
                                {formatCurrency(
                                  currentPedido.benefits.reduce(
                                    (sum, benefit) =>
                                      sum + (benefit.value || 0),
                                    0
                                  )
                                )}
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      )}

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
                                <TableCell align="left">Observações</TableCell>
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
                                    {item.notes}
                                  </TableCell>
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

                              {/* Linha de subtotal antes dos descontos */}
                              {currentPedido.benefits &&
                                currentPedido.benefits.length > 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={4}
                                      align="right"
                                      sx={{
                                        fontWeight: "normal",
                                        color: "text.secondary",
                                      }}
                                    >
                                      Subtotal antes dos descontos:
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        fontWeight: "normal",
                                        color: "text.secondary",
                                      }}
                                    >
                                      {formatCurrency(
                                        currentPedido.total +
                                          (currentPedido.benefits?.reduce(
                                            (sum, benefit) =>
                                              sum + (benefit.value || 0),
                                            0
                                          ) || 0)
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )}

                              {/* Linhas de desconto */}
                              {currentPedido.benefits &&
                                currentPedido.benefits.map((benefit, index) => (
                                  <TableRow key={`benefit-${index}`}>
                                    <TableCell
                                      colSpan={4}
                                      align="right"
                                      sx={{
                                        color: "success.main",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      {benefit.target === "ITEM"
                                        ? "Desconto item específico"
                                        : benefit.target ===
                                          "PROGRESSIVE_DISCOUNT_ITEM"
                                        ? "Desconto progressivo"
                                        : "Desconto"}
                                      {benefit.targetId &&
                                        ` (Item #${benefit.targetId})`}
                                      :
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        color: "success.main",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      -{formatCurrency(benefit.value)}
                                    </TableCell>
                                  </TableRow>
                                ))}

                              <TableRow>
                                <TableCell
                                  colSpan={4}
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

                    <Grid item xs={12} width={"100%"}>
                      <Paper
                        elevation={3}
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          background: "white",
                          border: "1px solid rgba(103, 126, 234, 0.1)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                        }}
                      >
                        <Box
                          sx={{
                            mb: 4,
                            p: 2,
                            borderRadius: 2,
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 20px rgba(103, 126, 234, 0.3)",
                          }}
                        >
                          <DeliveryIcon sx={{ mr: 2, fontSize: 28 }} />
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: "bold",
                              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Informações da Corrida
                          </Typography>
                        </Box>

                        <Grid container spacing={2}>
                          {/* Modo de entrega */}
                          <Grid item xs={12} sm={6}>
                            <Box
                              sx={{
                                p: 3,
                                background:
                                  "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                                borderRadius: 3,
                                border: "2px solid",
                                borderColor:
                                  currentPedido.deliveryMode === "retirada"
                                    ? "#FF9800"
                                    : "#4CAF50",
                                boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
                                position: "relative",
                                overflow: "hidden",
                                "&::before": {
                                  content: '""',
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "4px",
                                  background:
                                    currentPedido.deliveryMode === "retirada"
                                      ? "linear-gradient(90deg, #FF9800, #FFB74D)"
                                      : "linear-gradient(90deg, #4CAF50, #66BB6A)",
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mb: 2,
                                }}
                              >
                                {currentPedido.deliveryMode === "retirada" ? (
                                  <Icon
                                    sx={{
                                      mr: 1,
                                      fontSize: 24,
                                      color: "#FF9800",
                                    }}
                                  >
                                    store
                                  </Icon>
                                ) : (
                                  <DeliveryIcon
                                    sx={{
                                      mr: 1,
                                      fontSize: 24,
                                      color: "#4CAF50",
                                    }}
                                  />
                                )}
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "text.primary",
                                  }}
                                >
                                  Modo de Entrega
                                </Typography>
                              </Box>
                              <Chip
                                label={
                                  currentPedido.deliveryMode === "retirada"
                                    ? "RETIRADA"
                                    : "ENTREGA"
                                }
                                sx={{
                                  bgcolor:
                                    currentPedido.deliveryMode === "retirada"
                                      ? "#FF9800"
                                      : "#4CAF50",
                                  color: "white",
                                  fontWeight: "bold",
                                  fontSize: "0.9rem",
                                  px: 2,
                                  py: 1,
                                  borderRadius: 2,
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                }}
                                size="medium"
                              />
                            </Box>
                          </Grid>

                          {/* Informações do motoboy */}
                          {currentPedido.deliveryMode === "entrega" && (
                            <Grid item xs={12} sm={6}>
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: "background.paper",
                                  borderRadius: 1,
                                  border: 1,
                                  borderColor: "divider",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: "bold", mb: 1 }}
                                >
                                  Entregador
                                </Typography>
                                {currentPedido.motoboy?.name ||
                                currentPedido.pickupCode ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      p: 2,
                                      borderRadius: 2,
                                      background:
                                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      color: "white",
                                      boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                                      position: "relative",
                                      overflow: "hidden",
                                      "&::before": {
                                        content: '""',
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: "rgba(255,255,255,0.1)",
                                        backdropFilter: "blur(10px)",
                                        zIndex: -1,
                                      },
                                    }}
                                  >
                                    <Box sx={{ position: "relative", mb: 2 }}>
                                      <Avatar
                                        sx={{
                                          width: 80,
                                          height: 80,
                                          border:
                                            "4px solid rgba(255,255,255,0.3)",
                                          boxShadow:
                                            "0 8px 25px rgba(0,0,0,0.2)",
                                          background:
                                            "linear-gradient(45deg, #FF6B6B, #4ECDC4)",
                                        }}
                                        alt={currentPedido.motoboy?.name}
                                        src={
                                          currentPedido.motoboy?.profileImage
                                        }
                                      >
                                        {!currentPedido.motoboy
                                          ?.profileImage && (
                                          <PersonIcon
                                            sx={{
                                              fontSize: 40,
                                              color: "white",
                                            }}
                                          />
                                        )}
                                      </Avatar>
                                      <Box
                                        sx={{
                                          position: "absolute",
                                          bottom: -5,
                                          right: -5,
                                          backgroundColor: "#4CAF50",
                                          borderRadius: "50%",
                                          width: 24,
                                          height: 24,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          border: "3px solid white",
                                          boxShadow:
                                            "0 2px 8px rgba(0,0,0,0.2)",
                                        }}
                                      >
                                        <CheckIcon
                                          sx={{ fontSize: 12, color: "white" }}
                                        />
                                      </Box>
                                    </Box>

                                    <Box
                                      sx={{
                                        textAlign: "center",
                                        width: "100%",
                                        mb: 1,
                                      }}
                                    >
                                      <Typography
                                        variant="h6"
                                        sx={{
                                          fontWeight: "bold",
                                          mb: 0.5,
                                          textShadow:
                                            "0 2px 4px rgba(0,0,0,0.3)",
                                          fontSize: "1.1rem",
                                        }}
                                      >
                                        {currentPedido.motoboy?.name ||
                                          "Entregador"}
                                      </Typography>
                                    </Box>

                                    <Box sx={{ width: "100%", space: 1 }}>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          mb: 1,
                                          p: 1,
                                          borderRadius: 1,
                                          bgcolor: "rgba(255,255,255,0.15)",
                                          backdropFilter: "blur(5px)",
                                        }}
                                      >
                                        <PhoneIcon
                                          sx={{
                                            mr: 1,
                                            fontSize: 18,
                                            color: "#E8F5E8",
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 500,
                                            fontSize: "0.9rem",
                                          }}
                                        >
                                          {currentPedido.motoboy?.phone ||
                                            currentPedido.motoboy
                                              ?.phoneNumber ||
                                            "Não informado"}
                                        </Typography>
                                      </Box>

                                      {currentPedido.pickupCode && (
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            mb: 1,
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: "rgba(255,193,7,0.2)",
                                            border:
                                              "1px solid rgba(255,193,7,0.5)",
                                          }}
                                        >
                                          <QrCodeIcon
                                            sx={{
                                              mr: 1,
                                              fontSize: 18,
                                              color: "#FFF176",
                                            }}
                                          />
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              fontWeight: "bold",
                                              fontSize: "0.9rem",
                                              color: "#FFF176",
                                            }}
                                          >
                                            Código: {currentPedido.pickupCode}
                                          </Typography>
                                        </Box>
                                      )}

                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          p: 1,
                                          borderRadius: 1,
                                          bgcolor: "rgba(255,255,255,0.1)",
                                        }}
                                      >
                                        <BadgeIcon
                                          sx={{
                                            mr: 1,
                                            fontSize: 18,
                                            color: "#E1F5FE",
                                          }}
                                        />
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontWeight: 400,
                                            fontSize: "0.8rem",
                                            opacity: 0.9,
                                          }}
                                        >
                                          ID:{" "}
                                          {currentPedido.motoboy?.motoboyId ||
                                            currentPedido.motoboy?._id ||
                                            "N/A"}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Chip
                                    label="Motoboy não atribuído"
                                    color="warning"
                                    variant="outlined"
                                    size="small"
                                  />
                                )}
                              </Box>
                            </Grid>
                          )}

                          {/* Valor da corrida */}
                          {currentPedido.motoboy?.price && (
                            <Grid item xs={12} sm={6}>
                              <Box
                                sx={{
                                  p: 3,
                                  background:
                                    "linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)",
                                  borderRadius: 3,
                                  border: "2px solid #4CAF50",
                                  boxShadow:
                                    "0 6px 20px rgba(76, 175, 80, 0.2)",
                                  position: "relative",
                                  overflow: "hidden",
                                  textAlign: "center",
                                  "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "4px",
                                    background:
                                      "linear-gradient(90deg, #4CAF50, #66BB6A)",
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mb: 2,
                                  }}
                                >
                                  <MoneyIcon
                                    sx={{
                                      mr: 1,
                                      fontSize: 24,
                                      color: "#2E7D32",
                                    }}
                                  />
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      fontWeight: "bold",
                                      color: "#2E7D32",
                                    }}
                                  >
                                    Valor da Corrida
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    p: 2,
                                    bgcolor: "#4CAF50",
                                    borderRadius: 2,
                                    boxShadow:
                                      "0 4px 12px rgba(76, 175, 80, 0.3)",
                                  }}
                                >
                                  <Typography
                                    variant="h4"
                                    sx={{
                                      color: "white",
                                      fontWeight: "bold",
                                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                                    }}
                                  >
                                    {formatCurrency(
                                      currentPedido.motoboy?.price
                                    )}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                          )}

                          {/* Status de chegada na loja */}
                          {currentPedido.deliveryMode === "entrega" && (
                            <Grid item xs={12} sm={6}>
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: "background.paper",
                                  borderRadius: 1,
                                  border: 1,
                                  borderColor: "divider",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: "bold", mb: 1 }}
                                >
                                  Motoboy chegou
                                </Typography>
                                <Chip
                                  label={
                                    currentPedido.motoboy?.hasArrived
                                      ? "Motoboy chegou"
                                      : "Aguardando chegada"
                                  }
                                  color={
                                    currentPedido.motoboy?.hasArrived
                                      ? "success"
                                      : "warning"
                                  }
                                  variant="outlined"
                                  size="small"
                                  icon={
                                    currentPedido.motoboy?.hasArrived ? (
                                      <CheckIcon />
                                    ) : (
                                      <ScheduleIcon />
                                    )
                                  }
                                />
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} width={"100%"}>
                      <DeliveryRouteMap
                        orderId={currentPedido._id}
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
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenDialog(false)}>Fechar</Button>
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* Avaliate Dialog - FORA do Dialog principal */}
          <Avaliate
            open={avaliateOpen}
            onSubmit={handleOnSubmitAvaliation}
            order={currentPedido}
            onClose={() => {
              setAvaliateOpen(false);
              setCurrentPedido(null);
            }}
          />

          {/* Dialog para criação de novo pedido */}
          <CreateOrderDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onOrderCreated={(newOrder) => {
              // Adicionar o novo pedido à lista
              // setPedidos((prevOrders) => [newOrder, ...prevOrders]);
              setSnackbar({
                open: true,
                message: "Pedido criado com sucesso!",
                severity: "success",
              });
              setCreateDialogOpen(false);
            }}
            storeId={storeId}
            isLoaded={isLoaded}
            loadError={loadError}
          />

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

          {/* BuscandoMotoboy Dialog - FORA dos outros componentes */}
          <BuscandoMotoboy
            open={buscandoMotoboy}
            onClose={handleCloseBuscandoMotoboy}
            orderNumber={orderCreated?.orderNumber}
            customerName={orderCreated?.customerName}
            createdAt={orderCreated?.createdAt}
            orderId={orderCreated?._id}
            status={statusBuscandoMotoboy}
          />
        </Container>
      </Box>
    </Box>
  );
};

export default Pedidos;
