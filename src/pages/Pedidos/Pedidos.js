import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { findMotoboys } from "../../services/api";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
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
  Tab,
  Tabs,
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
} from "@mui/icons-material";
import eventService from "../../services/eventService";
import Avaliate from "../../components/Avaliate";
import BuscandoMotoboy from "../../components/BuscandoMotoboy/BuscandoMotoboy";
import GoogleMapReact from "google-map-react";
import MyLocationIcon from "@mui/icons-material/MyLocation";

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

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const userProfileResponse = await api.get("/stores/me");
        const userProfile = userProfileResponse.data;
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
  const handleViewPedido = (pedido) => {
    setCurrentPedido(pedido);
    if (pedido.status === "pendente") {
      setBuscandoMotoboy(true);
      setOrderCreated({
        orderNumber: pedido.orderNumber,
        customerName: Array.isArray(pedido.customer)
          ? pedido.customer.map((c) => c.name).join(", ")
          : pedido.customer?.name || "Cliente",
        createdAt: pedido.createdAt,
      });
    }

    setOpenDialog(true);
  };

  // Atualizar status do pedido
  const handleUpdateStatus = async (pedidoId, newStatus) => {
    try {
      setLoading(true);

      // Chamar API para atualizar status
      await api.put(`/orders/status`, { status: newStatus, id: pedidoId });

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
        driveBack:
          novoPedido.payment.method === "maquina" ||
          novoPedido.payment.method === "dinheiro",
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
      // Adicionar novo pedido à lista
      setPedidos((prev) => [response.data.order, ...prev]);
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

  const handleCallDeliveryPerson = async (pedido) => {
    if (!pedido.motoboy || !pedido.motoboy.phone || !pedido.motoboy.motoboyId) {
      setSnackbar({
        open: true,
        message: "Nenhum motoboy atribuído a este pedido.",
        severity: "warning",
      });
      return;
    }
    try {
      const phoneNumber = pedido.motoboy.phone;
      const motoboyId = pedido.motoboy.motoboyId;

      const orderReady = require("../../services/api").orderReady;
      const response = await orderReady(motoboyId, pedido._id);
      if (response.status > 199 && response.status < 300) {
        setSnackbar({
          open: true,
          message: "Motoboy notificado sobre o pedido.",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Erro ao notificar motoboy. Este é o telefone do motoboy: ${phoneNumber}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Erro ao notificar motoboy:", error);
      setSnackbar({
        open: true,
        message: `Erro ao notificar motoboy. Este é o telefone do motoboy: ${pedido.motoboy.phone}`,
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
          menuItems={[
            { path: "/dashboard", text: "Dashboard", icon: <DashboardIcon /> },
            { path: "/produtos", text: "Produtos", icon: <ProductsIcon /> },
            { path: "/pedidos", text: "Pedidos", icon: <OrdersIcon /> },
            {
              path: "/ocorrencias",
              text: "Ocorrências",
              icon: <OcorrenciasIcon />,
            },
            { path: "/chat", text: "Chat", icon: <ChatIcon /> },
          ]}
          // Passa diretamente a função de logout
          footerItems={[
            {
              text: "Sair",
              icon: <LogoutIcon />,
              onClick: handleLogout,
              color: "error",
            },
          ]}
        />
      ) : (
        <SideDrawer
          open={true}
          variant="permanent"
          title="Gringo Delivery"
          logoUrl="https://i.imgur.com/8jOdfcO.png"
          logoAlt="Gringo Delivery"
          logoHeight={50}
          menuItems={[
            { path: "/dashboard", text: "Dashboard", icon: <DashboardIcon /> },
            { path: "/produtos", text: "Produtos", icon: <ProductsIcon /> },
            { path: "/pedidos", text: "Pedidos", icon: <OrdersIcon /> },
            {
              path: "/ocorrencias",
              text: "Ocorrências",
              icon: <OcorrenciasIcon />,
            },
            { path: "/chat", text: "Chat", icon: <ChatIcon /> },
          ]}
          footerItems={[
            {
              text: "Sair",
              icon: <LogoutIcon />,
              onClick: handleLogout,
              color: "error",
            },
          ]}
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
                    <Grid item xs={12} width="100%" mt={3}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              color: "primary.main",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <PersonIcon sx={{ mr: 1 }} /> Clientes e Endereços
                            de Entrega
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddCustomer}
                          >
                            Adicionar Cliente
                          </Button>
                        </Box>

                        {/* Tabs para navegar entre os clientes */}
                        <Box
                          sx={{
                            borderBottom: 1,
                            borderColor: "divider",
                            mb: 2,
                          }}
                        >
                          <Tabs
                            value={activeCustomerIndex}
                            onChange={(e, newValue) =>
                              setActiveCustomerIndex(newValue)
                            }
                            variant="scrollable"
                            scrollButtons="auto"
                          >
                            {novoPedido.customer.map((customer, index) => (
                              <Tab
                                key={index}
                                label={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Typography variant="body2">
                                      {customer.name
                                        ? `${customer.name.substr(0, 15)}...`
                                        : `Cliente ${index + 1}`}
                                    </Typography>
                                    {novoPedido.customer.length > 1 && (
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveCustomer(index);
                                        }}
                                      >
                                        <CloseIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
                                }
                              />
                            ))}
                          </Tabs>
                        </Box>

                        {/* Formulário para o cliente atual */}
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Nome do Cliente"
                              name="name"
                              value={
                                novoPedido.customer[activeCustomerIndex]
                                  ?.name || ""
                              }
                              onChange={handleCustomerChange}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Telefone"
                              name="phone"
                              value={
                                novoPedido.customer[activeCustomerIndex]
                                  ?.phone || ""
                              }
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

                          {/* Endereço do cliente atual */}
                          <Grid item xs={12}>
                            <Typography
                              variant="subtitle1"
                              sx={{ mt: 2, mb: 1, fontWeight: "bold" }}
                            >
                              Endereço de Entrega
                            </Typography>
                            <Box
                              sx={{ p: 0, display: "flex", flexWrap: "wrap" }}
                              columnGap={1}
                              rowGap={2}
                            >
                              <TextField
                                sx={{ minWidth: "120px", flexGrow: 1 }}
                                label="CEP"
                                name="cep"
                                value={
                                  novoPedido.customer[activeCustomerIndex]
                                    .customerAddress.cep || ""
                                }
                                onChange={(e) =>
                                  handleCustomerChange(e, activeCustomerIndex)
                                }
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

                              <TextField
                                sx={{ minWidth: "200px", flexGrow: 3 }}
                                label="Logradouro"
                                name="logradouro"
                                value={
                                  novoPedido.customer[activeCustomerIndex]
                                    .customerAddress.logradouro
                                }
                                onChange={(e) =>
                                  handleCustomerChange(e, activeCustomerIndex)
                                }
                                required
                              />

                              <TextField
                                sx={{ minWidth: "100px", flexGrow: 1 }}
                                label="Número"
                                name="numero"
                                value={
                                  novoPedido.customer[activeCustomerIndex]
                                    .customerAddress.addressNumber
                                }
                                onChange={(e) =>
                                  handleCustomerChange(e, activeCustomerIndex)
                                }
                                required
                              />

                              <TextField
                                sx={{ minWidth: "150px", flexGrow: 2 }}
                                label="Bairro"
                                name="bairro"
                                value={
                                  novoPedido.customer[activeCustomerIndex]
                                    .customerAddress.bairro
                                }
                                onChange={(e) =>
                                  handleCustomerChange(e, activeCustomerIndex)
                                }
                                required
                              />

                              <TextField
                                sx={{ minWidth: "150px", flexGrow: 2 }}
                                label="Cidade"
                                name="cidade"
                                value={
                                  novoPedido.customer[activeCustomerIndex]
                                    .customerAddress.cidade
                                }
                                onChange={(e) =>
                                  handleCustomerChange(e, activeCustomerIndex)
                                }
                                required
                              />

                              <TextField
                                sx={{ minWidth: "100px", flexGrow: 1 }}
                                label="Estado"
                                name="estado"
                                value={
                                  novoPedido.customer[activeCustomerIndex]
                                    .customerAddress.estado || ""
                                }
                                onChange={(e) =>
                                  handleCustomerChange(e, activeCustomerIndex)
                                }
                              />
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Informações de coordenadas para o cliente atual */}
                        <Box sx={{ mt: 2 }}>
                          {novoPedido.customer[activeCustomerIndex]
                            .customerAddress.coordinates &&
                            novoPedido.customer[activeCustomerIndex]
                              .customerAddress.coordinates.length === 2 && (
                              <Chip
                                label={`Coordenadas: ${novoPedido.customer[
                                  activeCustomerIndex
                                ].customerAddress.coordinates[1].toFixed(
                                  6
                                )}, ${novoPedido.customer[
                                  activeCustomerIndex
                                ].customerAddress.coordinates[0].toFixed(6)}`}
                                color="primary"
                                variant="outlined"
                                sx={{ mr: 1 }}
                              />
                            )}
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
                        {currentPedido.motoboy?.name !== null ? (
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
                        ) : (
                          <Box
                            display="flex"
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              justifyContent: "space-between",
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
                                />
                              ) : (
                                <RefreshIcon
                                  sx={{ width: "20px", height: "20px" }}
                                />
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
                                  <Button
                                    variant="contained"
                                    color="info"
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
                                    Chamar Entregador
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
              {/* Seção de Localização com Tabs */}
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
                    <LocationIcon sx={{ mr: 1 }} /> Localização
                  </Typography>

                  {/* Tabs para alternar entre Origem e Destino */}
                  <Tabs
                    value={locationTab}
                    onChange={handleLocationTabChange}
                    sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
                  >
                    <Tab label="Local 1 (Retirada)" />
                    <Tab label="Local 2 (Entrega)" />
                  </Tabs>

                  {/* Alternador entre mapa e entrada manual de endereço */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      mb: 2,
                    }}
                  >
                    <Button
                      startIcon={useMap ? <Edit /> : <LocationIcon />}
                      onClick={toggleAddressInputMethod}
                      color="primary"
                    >
                      {useMap ? "Usar Endereço Manual" : "Usar Mapa"}
                    </Button>
                  </Box>

                  {/* Conteúdo baseado na tab selecionada */}
                  {locationTab === 0 ? (
                    // Local 1 (Origem / Retirada)
                    <>
                      {useMap ? (
                        // Para Local 1 (Origem)
                        <Box
                          sx={{
                            height: 400,
                            width: "100%",
                            position: "relative",
                            mb: 2,
                          }}
                        >
                          <SearchField
                            placeholder="Digite o endereço de retirada e pressione Enter ou clique na lupa"
                            color="primary"
                            searchAddress={searchAddress}
                            setSearchAddress={setSearchAddress}
                            onSearch={handleAddressSearch}
                          />

                          <GoogleMapReact
                            bootstrapURLKeys={{
                              key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
                            }}
                            defaultCenter={mapCenter}
                            center={mapCenter}
                            defaultZoom={15}
                            onClick={handleMapClick}
                          >
                            {/* Marcador para Local 1 (Origem) */}
                            {originLocation && (
                              <LocationIcon
                                color="primary"
                                fontSize="large"
                                lat={originLocation.lat}
                                lng={originLocation.lng}
                                style={{
                                  transform: "translate(-50%, -100%)",
                                }}
                              />
                            )}

                            {/* Marcadores para Locais de Destino (Clientes) - opacos quando não são o cliente ativo */}
                            {destinationLocation.map((location, index) => (
                              <LocationIcon
                                key={`destination-${location.customerIndex}`}
                                color="secondary"
                                fontSize="large"
                                lat={location.lat}
                                lng={location.lng}
                                style={{
                                  transform: "translate(-50%, -100%)",
                                  opacity:
                                    location.customerIndex ===
                                    activeCustomerIndex
                                      ? 1.0
                                      : 0.4,
                                  // Destaque visual para o cliente ativo
                                  filter:
                                    location.customerIndex ===
                                    activeCustomerIndex
                                      ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))"
                                      : "none",
                                  zIndex:
                                    location.customerIndex ===
                                    activeCustomerIndex
                                      ? 2
                                      : 1,
                                }}
                              />
                            ))}
                          </GoogleMapReact>

                          <Fab
                            size="small"
                            color="primary"
                            onClick={getCurrentLocation}
                            sx={{
                              position: "absolute",
                              bottom: 16,
                              right: 16,
                            }}
                          >
                            <MyLocationIcon />
                          </Fab>
                        </Box>
                      ) : (
                        // Entrada manual para Local 1
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="CEP"
                              name="cep"
                              value={novoPedido.store.address.cep || ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setNovoPedido((prev) => ({
                                  ...prev,
                                  store: {
                                    ...prev.store,
                                    address: {
                                      ...prev.store.address,
                                      cep: value ? Number(value) : null,
                                    },
                                  },
                                }));
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <LocationIcon color="primary" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={8}>
                            <TextField
                              fullWidth
                              label="Logradouro"
                              name="logradouro"
                              value={novoPedido.store.address.logradouro || ""}
                              onChange={(e) => {
                                setNovoPedido((prev) => ({
                                  ...prev,
                                  store: {
                                    ...prev.store,
                                    address: {
                                      ...prev.store.address,
                                      logradouro: e.target.value,
                                    },
                                  },
                                }));
                              }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Número"
                              name="numero"
                              value={novoPedido.store.address.numero || ""}
                              onChange={(e) => {
                                setNovoPedido((prev) => ({
                                  ...prev,
                                  store: {
                                    ...prev.store,
                                    address: {
                                      ...prev.store.address,
                                      numero: e.target.value,
                                    },
                                  },
                                }));
                              }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Bairro"
                              name="bairro"
                              value={novoPedido.store.address.bairro || ""}
                              onChange={(e) => {
                                setNovoPedido((prev) => ({
                                  ...prev,
                                  store: {
                                    ...prev.store,
                                    address: {
                                      ...prev.store.address,
                                      bairro: e.target.value,
                                    },
                                  },
                                }));
                              }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Cidade"
                              name="cidade"
                              value={novoPedido.store.address.cidade || ""}
                              onChange={(e) => {
                                setNovoPedido((prev) => ({
                                  ...prev,
                                  store: {
                                    ...prev.store,
                                    address: {
                                      ...prev.store.address,
                                      cidade: e.target.value,
                                    },
                                  },
                                }));
                              }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Estado"
                              name="estado"
                              value={novoPedido.store.address.estado || ""}
                              onChange={(e) => {
                                setNovoPedido((prev) => ({
                                  ...prev,
                                  store: {
                                    ...prev.store,
                                    address: {
                                      ...prev.store.address,
                                      estado: e.target.value,
                                    },
                                  },
                                }));
                              }}
                              required
                            />
                          </Grid>
                        </Grid>
                      )}
                    </>
                  ) : (
                    // Local 2 (Destino / Entrega)
                    <>
                      {useMap ? (
                        // Para Local 2 (Destino)
                        <Box
                          sx={{
                            height: 400,
                            width: "100%",
                            position: "relative",
                            mb: 2,
                          }}
                        >
                          <SearchField
                            placeholder="Digite o endereço de entrega e pressione Enter ou clique na lupa"
                            color="secondary"
                            searchAddress={searchAddress}
                            setSearchAddress={setSearchAddress}
                            onSearch={handleAddressSearch}
                          />

                          <GoogleMapReact
                            bootstrapURLKeys={{
                              key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
                            }}
                            defaultCenter={mapCenter}
                            center={mapCenter}
                            defaultZoom={15}
                            onClick={handleMapClick}
                          >
                            {/* Marcador para Local 1 (Origem) - opaco quando não é a aba ativa */}
                            {originLocation && (
                              <LocationIcon
                                color="primary"
                                fontSize="large"
                                lat={originLocation.lat}
                                lng={originLocation.lng}
                                style={{
                                  transform: "translate(-50%, -100%)",
                                  opacity: 0.4,
                                }}
                              />
                            )}

                            {/* Marcadores para Locais de Destino (Clientes) */}
                            {destinationLocation.map((location, index) => (
                              <LocationIcon
                                key={`destination-${location.customerIndex}`}
                                color="secondary"
                                fontSize="large"
                                lat={location.lat}
                                lng={location.lng}
                                style={{
                                  transform: "translate(-50%, -100%)",
                                  opacity:
                                    location.customerIndex ===
                                    activeCustomerIndex
                                      ? 1.0
                                      : 0.4,
                                  // Destaque visual para o cliente ativo
                                  filter:
                                    location.customerIndex ===
                                    activeCustomerIndex
                                      ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))"
                                      : "none",
                                  zIndex:
                                    location.customerIndex ===
                                    activeCustomerIndex
                                      ? 2
                                      : 1,
                                }}
                              />
                            ))}
                          </GoogleMapReact>

                          <Fab
                            size="small"
                            color="primary"
                            onClick={getCurrentLocation}
                            sx={{
                              position: "absolute",
                              bottom: 16,
                              right: 16,
                            }}
                          >
                            <MyLocationIcon />
                          </Fab>
                        </Box>
                      ) : (
                        // Entrada manual para Local 2 - CORRIGIR ESTA PARTE
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="CEP"
                              name="cep"
                              value={
                                novoPedido.customer.customerAddress.cep || ""
                              }
                              onChange={handleCustomerChange}
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
                          </Grid>
                          <Grid item xs={12} sm={8}>
                            <TextField
                              fullWidth
                              label="Logradouro"
                              name="address"
                              value={
                                novoPedido.customer.customerAddress.address
                              }
                              onChange={handleCustomerChange}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Número"
                              name="addressNumber"
                              value={
                                novoPedido.customer.customerAddress
                                  .addressNumber
                              }
                              onChange={handleCustomerChange}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Bairro"
                              name="bairro"
                              value={novoPedido.customer.customerAddress.bairro}
                              onChange={handleCustomerChange}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Cidade"
                              name="cidade"
                              value={novoPedido.customer.customerAddress.cidade}
                              onChange={handleCustomerChange}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Estado"
                              name="estado"
                              value={
                                novoPedido.customer.customerAddress.estado || ""
                              }
                              onChange={handleCustomerChange}
                            />
                          </Grid>
                        </Grid>
                      )}
                    </>
                  )}

                  {/* Exibição das coordenadas selecionadas */}
                  <Box sx={{ mt: 2 }}>
                    {locationTab === 0 &&
                      novoPedido.store.coordinates &&
                      novoPedido.store.coordinates.length === 2 && (
                        <Chip
                          label={`Coordenadas: ${novoPedido.store.coordinates[1].toFixed(
                            6
                          )}, ${novoPedido.store.coordinates[0].toFixed(6)}`}
                          color="white"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}

                    {locationTab === 1 &&
                      novoPedido.customer[activeCustomerIndex]?.customerAddress
                        ?.coordinates &&
                      novoPedido.customer[activeCustomerIndex]?.customerAddress
                        ?.coordinates.length === 2 && (
                        <Chip
                          label={`Coordenadas: ${novoPedido.customer[
                            activeCustomerIndex
                          ]?.customerAddress?.coordinates[1].toFixed(
                            6
                          )}, ${novoPedido.customer[
                            activeCustomerIndex
                          ]?.customerAddress?.coordinates[0].toFixed(6)}`}
                          color="white"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}
                  </Box>
                </Paper>
              </Grid>
              <Grid container spacing={3} mt={3}>
                {/* Dados do Cliente */}
                <Grid item xs={12} width="100%">
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          color: "primary.main",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <PersonIcon sx={{ mr: 1 }} /> Dados do Cliente
                      </Typography>

                      <Box>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={handleAddCustomer}
                          startIcon={<AddIcon />}
                          sx={{ mr: 1 }}
                        >
                          Adicionar Cliente
                        </Button>

                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() =>
                            handleRemoveCustomer(activeCustomerIndex)
                          }
                          startIcon={<CloseIcon />}
                          disabled={novoPedido.customer.length <= 1}
                        >
                          Remover Cliente
                        </Button>
                      </Box>
                    </Box>

                    {/* Navegação entre clientes */}
                    <Box
                      sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                    >
                      <Tabs
                        value={activeCustomerIndex}
                        onChange={(e, newValue) =>
                          setActiveCustomerIndex(newValue)
                        }
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="clientes tabs"
                      >
                        {novoPedido.customer.map((cliente, index) => (
                          <Tab
                            key={index}
                            label={
                              cliente.name
                                ? `Cliente: ${cliente.name}`
                                : `Cliente ${index + 1}`
                            }
                            sx={{
                              textTransform: "none",
                              minWidth: "120px",
                              maxWidth: "200px",
                            }}
                          />
                        ))}
                      </Tabs>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Nome do Cliente"
                          name="name"
                          value={
                            novoPedido.customer[activeCustomerIndex]?.name || ""
                          }
                          onChange={handleCustomerChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Telefone"
                          name="phone"
                          value={
                            novoPedido.customer[activeCustomerIndex]?.phone ||
                            ""
                          }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="CEP"
                          name="cep"
                          value={
                            novoPedido.customer[activeCustomerIndex]
                              ?.customerAddress?.cep || ""
                          }
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
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ p: 0, display: "flex" }} columnGap={1}>
                          <TextField
                            fullWidth
                            label="Logradouro"
                            name="address"
                            value={
                              novoPedido.customer[activeCustomerIndex]
                                ?.customerAddress?.address || ""
                            }
                            onChange={handleCustomerChange}
                            required
                          />

                          <TextField
                            label="Número"
                            name="addressNumber"
                            value={
                              novoPedido.customer[activeCustomerIndex]
                                ?.customerAddress?.addressNumber || ""
                            }
                            onChange={handleCustomerChange}
                            required
                          />

                          <TextField
                            label="Bairro"
                            name="bairro"
                            value={
                              novoPedido.customer[activeCustomerIndex]
                                ?.customerAddress?.bairro || ""
                            }
                            onChange={handleCustomerChange}
                            required
                          />

                          <TextField
                            label="Cidade"
                            name="cidade"
                            value={
                              novoPedido.customer[activeCustomerIndex]
                                ?.customerAddress?.cidade || ""
                            }
                            onChange={handleCustomerChange}
                            required
                          />

                          <TextField
                            label="Estado"
                            name="estado"
                            value={
                              novoPedido.customer[activeCustomerIndex]
                                ?.customerAddress?.estado || ""
                            }
                            onChange={handleCustomerChange}
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
                        {/* <MenuItem value="cartao">Cartão</MenuItem> */}
                        <MenuItem value="pix">PIX</MenuItem>
                        <MenuItem value="maquina">Maquina de Cartão</MenuItem>
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

                    {novoPedido.payment.method === "dinheiro" && (
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mt: 1 }}
                      >
                        Taxa de retorno será aplicada de R$0,40
                      </Typography>
                    )}
                    {novoPedido.payment.method === "maquina" && (
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mt: 1 }}
                      >
                        Taxa de retorno será aplicada de R$0,40
                      </Typography>
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
                disabled={loading}
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
