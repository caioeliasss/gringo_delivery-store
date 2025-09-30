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
  Edit as EditIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  ReportProblem as ReportProblemIcon,
  Chat as ChatIcon,
  Logout as LogoutIcon,
  Inventory as ProductsIcon,
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  AccessTime as LastSeenIcon,
  Business as BusinessIcon,
  Star as RatingIcon,
  AttachMoney as EarningsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Description as DocumentIcon,
  CloudDownload as DownloadIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
  Badge as BadgeIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import { useAuth } from "../../contexts/AuthContext";
import api, {
  getStores,
  getStore,
  getStoreOrders,
  approveStore,
  reproveStore,
  updateStoreBilling,
  reproveFreeToNavigate,
  freeToNavigate,
} from "../../services/api";
import { getFileURL, getUserDocuments } from "../../services/storageService";
import {
  uploadStoreProfileImage,
  deleteStoreProfileImage,
} from "../../services/storageService";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
  getFilteredSupportMenuItems,
} from "../../config/menuConfig";
import "./Estabelecimentos.css";

// Hook para detectar o contexto atual
const useCurrentContext = () => {
  const [context, setContext] = useState({ isAdmin: false, isSuporte: false });

  useEffect(() => {
    const hostname = window.location.hostname;
    const subdomain = hostname.split(".")[0];
    setContext({
      isAdmin: subdomain === "admin",
      isSuporte: subdomain === "suporte",
    });
  }, []);

  return context;
};

const STORE_STATUS = [
  {
    value: "open",
    label: "Aberto",
    color: "success",
    icon: OnlineIcon,
  },
  {
    value: "closed",
    label: "Fechado",
    color: "error",
    icon: OfflineIcon,
  },
  {
    value: "busy",
    label: "Ocupado",
    color: "warning",
    icon: ScheduleIcon,
  },
];

const STORE_CATEGORIES = [
  "Restaurante",
  "Lanchonete",
  "Pizzaria",
  "Hamburgeria",
  "Açaí",
  "Pastelaria",
  "Sorveteria",
  "Padaria",
  "Farmácia",
  "Mercado",
  "Outros",
];

export default function EstabelecimentosPage() {
  // Hook para carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "maps"],
  });

  // Detectar o contexto atual
  const { isAdmin, isSuporte } = useCurrentContext();

  // Estados de suporte
  const [supportUser, setSupportUser] = useState(null);
  const [supportLoading, setSupportLoading] = useState(false);

  // Verificar se estamos no contexto de suporte e carregar dados do suporte
  useEffect(() => {
    if (isSuporte) {
      // Esta página será usada apenas no contexto onde o SuporteAuthProvider está disponível
      // Por isso o erro não deveria acontecer se as rotas estiverem configuradas corretamente
      console.log("Página carregada no contexto de suporte");
    } else if (isAdmin) {
      console.log("Página carregada no contexto de admin");
    }
  }, [isAdmin, isSuporte]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [storeDocuments, setStoreDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [billingModal, setBillingModal] = useState(false);
  const [billingOptions, setBillingOptions] = useState({
    deliveryFee: 0,
    minimumOrder: 0,
    commissionRate: 0,
    paymentMethods: [],
  });
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [profileImageModal, setProfileImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Verificar permissões do usuário - simplificado para admin sempre ter acesso
  const hasAdminPermission = () => {
    // No contexto admin, sempre tem permissão
    return isAdmin;
  };

  const hasFinancePermission = () => {
    // No contexto admin, sempre tem permissão
    return isAdmin;
  };

  const hasGeneralPermission = () => {
    // No contexto admin, sempre tem permissão
    return isAdmin;
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [stores, selectedStatuses, selectedCategories, searchTerm]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      // Simular delay da API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await getStores();
      const fetchedStores = response.data;
      setStores(fetchedStores);
    } catch (error) {
      console.error("Erro ao buscar estabelecimentos:", error);
      // Usar dados mock em caso de erro na API
      setStores(generateMockStores());
    } finally {
      setLoading(false);
    }
  };

  // Função para gerar dados mock enquanto não temos endpoint específico
  const generateMockStores = () => {
    return [
      {
        _id: "1",
        name: "Pizzaria Bella Vista",
        email: "contato@bellavista.com",
        phoneNumber: "(11) 99999-1111",
        address: {
          address: "Rua das Flores, 123",
          bairro: "Centro",
          cidade: "São Paulo",
          cep: "01234-567",
        },
        category: "Pizzaria",
        status: "open",
        rating: 4.5,
        avatar: null,
        coordinates: [-46.6333, -23.5505],
        firebaseUid: "firebase_uid_1",
        cnpj_approved: true,
        createdAt: "2024-01-15T10:30:00Z",
        openingHours: "18:00 - 23:00",
        deliveryFee: 5.99,
        minimumOrder: 25.0,
        commissionRate: 15.0,
        paymentMethods: ["PIX", "Cartão de Crédito", "Cartão de Débito"],
      },
      {
        _id: "2",
        name: "Burger King da Vila",
        email: "pedidos@burgervila.com",
        phoneNumber: "(11) 88888-2222",
        address: {
          address: "Av. Principal, 456",
          bairro: "Vila Nova",
          cidade: "São Paulo",
          cep: "02345-678",
        },
        category: "Hamburgeria",
        status: "busy",
        rating: 4.2,
        avatar: null,
        coordinates: [-46.6444, -23.56],
        firebaseUid: "firebase_uid_2",
        cnpj_approved: true,
        createdAt: "2024-02-10T08:15:00Z",
        openingHours: "11:00 - 22:00",
        deliveryFee: 4.99,
        minimumOrder: 20.0,
        commissionRate: 12.0,
        paymentMethods: ["Dinheiro", "PIX", "Cartão de Crédito"],
      },
      {
        _id: "3",
        name: "Açaí do João",
        email: "joao@acaijoao.com",
        phoneNumber: "(11) 77777-3333",
        address: {
          address: "Rua da Praia, 789",
          bairro: "Praia Grande",
          cidade: "São Paulo",
          cep: "03456-789",
        },
        category: "Açaí",
        status: "closed",
        rating: 4.8,
        avatar: null,
        coordinates: [-46.6555, -23.57],
        firebaseUid: "firebase_uid_3",
        cnpj_approved: false,
        createdAt: "2024-03-05T14:20:00Z",
        openingHours: "10:00 - 20:00",
        deliveryFee: 3.99,
        minimumOrder: 15.0,
        commissionRate: 18.0,
        paymentMethods: ["PIX", "Dinheiro", "Vale Alimentação"],
      },
    ];
  };

  const applyFilters = () => {
    let filtered = stores;

    // Filtrar por status
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((store) =>
        selectedStatuses.includes(store.status || "closed")
      );
    }

    // Filtrar por categoria
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((store) =>
        selectedCategories.includes(store.category || "Outros")
      );
    }

    // Filtrar por nome (busca flexível)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((store) => {
        const name = (store.businessName || store.name || "").toLowerCase();
        const category = (store.category || "").toLowerCase();
        const email = (store.email || "").toLowerCase();
        // Busca por palavras parciais no nome, categoria ou email
        const searchWords = searchLower.split(/\s+/);
        return searchWords.every(
          (word) =>
            name.includes(word) ||
            category.includes(word) ||
            email.includes(word)
        );
      });
    }

    setFilteredStores(filtered);
  };

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setSelectedStatuses(typeof value === "string" ? value.split(",") : value);
  };

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    setSelectedCategories(typeof value === "string" ? value.split(",") : value);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatuses([]);
    setSelectedCategories([]);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const fetchStoreDocuments = async (firebaseUid) => {
    try {
      setLoadingDocuments(true);

      // Verificar se o firebaseUid existe
      if (!firebaseUid) {
        console.warn("FirebaseUid não encontrado para este estabelecimento");
        setStoreDocuments([]);
        return;
      }

      // Buscar documentos do estabelecimento usando o firebaseUid
      const documents = await getUserDocuments(firebaseUid);
      setStoreDocuments(documents);
    } catch (error) {
      console.error("❌ Erro ao buscar documentos do estabelecimento:", error);

      // Criar objeto de erro mais seguro
      const errorInfo = {
        message: error?.message || "Erro desconhecido",
        code: error?.code || "unknown",
        firebaseUid: firebaseUid || "não fornecido",
        userAuthenticated: user?.uid || "Não autenticado",
        timestamp: new Date().toISOString(),
      };

      console.error("❌ Detalhes do erro:", errorInfo);
      setStoreDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const openDetails = async (store) => {
    try {
      setSelectedStore(store);
      setDetailsModal(true);
      setStoreDocuments([]); // Limpar documentos anteriores

      console.log("Abrindo detalhes do estabelecimento:", {
        id: store._id,
        name: store.businessName,
        firebaseUid: store.firebaseUid,
      });

      // Verificar se o usuário está autenticado
      if (!user) {
        console.error("❌ Usuário não está autenticado para buscar documentos");
        return;
      }

      // Buscar pedidos do estabelecimento
      try {
        const orders = await getStoreOrders(store._id);
        setSelectedStore((prev) => ({ ...prev, orders: orders.data }));
      } catch (ordersError) {
        console.error(
          "❌ Erro ao buscar pedidos do estabelecimento:",
          ordersError
        );
      }

      // Buscar documentos do estabelecimento usando o firebaseUid
      if (store.firebaseUid) {
        await fetchStoreDocuments(store.firebaseUid);
      } else {
        console.warn(
          "⚠️ Estabelecimento não possui firebaseUid:",
          store.businessName
        );
        setStoreDocuments([]);
      }
    } catch (error) {
      console.error("❌ Erro geral ao abrir detalhes:", error);
      setSelectedStore(store);
      setDetailsModal(true);
    }
  };

  const closeDetails = () => {
    setSelectedStore(null);
    setDetailsModal(false);
    setStoreDocuments([]);
    setLoadingDocuments(false);
  };

  const getStatusChip = (status) => {
    const statusConfig =
      STORE_STATUS.find((s) => s.value === status) || STORE_STATUS[1];

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

  const createStoreMarker = (store) => {
    if (!window.google || !window.google.maps) {
      return null;
    }

    const colors = {
      open: "#4CAF50",
      busy: "#FF9800",
      closed: "#9E9E9E",
    };

    const color = colors[store.status] || colors.closed;

    try {
      const iconSvg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="3"/>
          <text x="20" y="25" text-anchor="middle" fill="${color}" font-size="16" font-family="Arial, sans-serif" font-weight="900">
            🏪
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

  const renderMarkers = () => {
    const markers = [];

    // Verificar se Google Maps está disponível e carregado
    if (!isLoaded || loadError) {
      console.log("❌ Google Maps API não está disponível ou houve erro");
      return markers;
    }

    // Renderizar marcador do estabelecimento selecionado
    if (
      selectedStore &&
      selectedStore.coordinates &&
      Array.isArray(selectedStore.coordinates) &&
      selectedStore.coordinates.length === 2
    ) {
      const icon = createStoreMarker(selectedStore);

      if (icon) {
        markers.push(
          <Marker
            key={`store-${selectedStore._id || "selected"}`}
            position={{
              lat: parseFloat(selectedStore.coordinates[1]),
              lng: parseFloat(selectedStore.coordinates[0]),
            }}
            icon={icon}
            title={`Estabelecimento: ${
              selectedStore.businessName || "Sem nome"
            }`}
          />
        );
      }
    }

    return markers;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  const formatCurrency = (value) => {
    if (!value) return "R$ 0,00";
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
      if (address.bairro) parts.push(`- ${address.bairro}`);
      if (address.cidade) parts.push(`- ${address.cidade}`);
      if (address.cep) parts.push(`- CEP: ${address.cep}`);

      return parts.join(", ").replace(/,\s*-/g, " -");
    }

    return "Endereço não informado";
  };

  const formatDocumentName = (fileName) => {
    // Remove timestamp e extensão para mostrar nome mais limpo
    if (!fileName) return "Documento";

    // Remove o timestamp do início (formato: timestamp_nomeoriginal)
    const nameWithoutTimestamp = fileName.replace(/^\d+_/, "");

    // Remove a extensão
    const nameWithoutExtension = nameWithoutTimestamp.replace(/\.[^/.]+$/, "");

    // Capitaliza primeira letra
    return (
      nameWithoutExtension.charAt(0).toUpperCase() +
      nameWithoutExtension.slice(1)
    );
  };

  const openDocument = (documentUrl) => {
    window.open(documentUrl, "_blank");
  };

  const downloadDocument = (documentUrl, fileName) => {
    const link = document.createElement("a");
    link.href = documentUrl;
    link.download = fileName || "documento";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Usar configuração centralizada de menu
  const menuItems = SUPPORT_MENU_ITEMS;
  const footerItems = createSupportFooterItems(handleLogout);

  const handleApproveStore = async (storeId) => {
    try {
      const response = await approveStore(storeId);
      const data = response.data;
      if (response.status === 200) {
        setSelectedStore((prev) => ({
          ...prev,
          cnpj_approved: true, // Atualiza o status para aprovado
        }));
      }
    } catch (error) {
      console.error("Erro ao aprovar estabelecimento:", error);
    }
  };

  const handleReproveStore = async (storeId) => {
    try {
      const response = await reproveStore(storeId);
      const data = response.data;
      if (response.status === 200) {
        setSelectedStore((prev) => ({
          ...prev,
          cnpj_approved: false, // Atualiza o status para reprovado
        }));
      }
    } catch (error) {
      console.error("Erro ao reprovar estabelecimento:", error);
    }
  };

  const handleReproveFreeToNavigate = async (storeId) => {
    try {
      const response = await reproveFreeToNavigate(storeId);
      const data = response.data;
      if (response.status === 200) {
        setSelectedStore((prev) => ({
          ...prev,
          freeToNavigate: false, // Atualiza o status para reprovado
        }));
      }
    } catch (error) {
      console.error("Erro ao reprovar acesso:", error);
    }
  };

  const handleFreeToNavigate = async (storeId) => {
    try {
      const response = await freeToNavigate(storeId);
      const data = response.data;
      if (response.status === 200) {
        setSelectedStore((prev) => ({
          ...prev,
          freeToNavigate: true, // Atualiza o status para liberado
        }));
      }
    } catch (error) {
      console.error("Erro ao liberar acesso:", error);
    }
  };

  const openBillingModal = (store) => {
    setSelectedStore(store);
    setBillingOptions({
      deliveryFee: store.billingOptions.motoBoyFee || 0,
      minimumOrder: store.minimumOrder || 0,
      commissionRate: store.billingOptions.monthlyFee || 0,
      paymentMethods: store.paymentMethods || [],
    });
    setBillingModal(true);
  };

  const closeBillingModal = () => {
    setBillingModal(false);
    setBillingOptions({
      deliveryFee: 0,
      minimumOrder: 0,
      commissionRate: 0,
      paymentMethods: [],
    });
    setSelectedStore(null);
    closeDetails();
  };

  const handleBillingChange = (field, value) => {
    setBillingOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentMethodsChange = (event) => {
    const value = event.target.value;
    setBillingOptions((prev) => ({
      ...prev,
      paymentMethods: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const saveBillingOptions = async () => {
    try {
      setLoadingBilling(true);

      const data = {
        motoBoyFee: billingOptions.deliveryFee,
        monthlyFee: billingOptions.commissionRate,
      };
      console.log("Salvando billing options:", data);
      const response = await updateStoreBilling(selectedStore._id, data);

      if (response.status === 200) {
        console.log("Atualizando stores no frontend...");
        console.log("Selected store ID:", selectedStore._id);
        console.log("Billing options que serão salvos:", {
          motoBoyFee: billingOptions.deliveryFee,
          monthlyFee: billingOptions.commissionRate,
        });

        // Atualizar o store na lista
        setStores((prev) => {
          const updatedStores = prev.map((store) => {
            if (store._id === selectedStore._id) {
              const updatedStore = {
                ...store,
                billingOptions: {
                  ...store.billingOptions,
                  motoBoyFee: billingOptions.deliveryFee,
                  monthlyFee: billingOptions.commissionRate,
                },
              };
              console.log("Store atualizado na lista:", updatedStore);
              return updatedStore;
            }
            return store;
          });
          console.log("Lista completa de stores atualizada");
          // Forçar uma nova referência para o array
          return [...updatedStores];
        });

        // Atualizar o store selecionado se o modal de detalhes estiver aberto
        if (detailsModal && selectedStore) {
          setSelectedStore((prev) => {
            const updatedStore = {
              ...prev,
              billingOptions: {
                ...prev.billingOptions,
                motoBoyFee: billingOptions.deliveryFee,
                monthlyFee: billingOptions.commissionRate,
              },
            };
            console.log("Store selecionado atualizado:", updatedStore);
            return updatedStore;
          });
        }

        closeBillingModal();
      }
    } catch (error) {
      console.error("Erro ao atualizar opções de billing:", error);
    } finally {
      setLoadingBilling(false);
    }
  };

  const [editingName, setEditingName] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Estados para edição do CNPJ
  const [editingCnpj, setEditingCnpj] = useState(false);
  const [originalCnpj, setOriginalCnpj] = useState("");
  const [savingCnpj, setSavingCnpj] = useState(false);

  // Estados para edição do telefone
  const [editingPhone, setEditingPhone] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const handleEditName = () => {
    setOriginalName(selectedStore?.businessName || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!selectedStore || !selectedStore._id) {
      console.error("Nenhuma loja selecionada para atualizar");
      alert("Erro: Nenhuma loja selecionada");
      return;
    }

    const newName = selectedStore.businessName?.trim();
    if (!newName) {
      alert("Nome não pode estar vazio");
      return;
    }

    if (newName === originalName) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      console.log("Atualizando nome da loja:", {
        storeId: selectedStore._id,
        newName: newName,
      });

      await api.put(`/stores/name`, {
        businessName: newName,
        storeId: selectedStore._id,
      });

      // Atualizar a lista de lojas
      const response = await getStores();
      setStores(response.data);

      // Atualizar a loja selecionada na lista
      const updatedStore = response.data.find(
        (store) => store._id === selectedStore._id
      );
      if (updatedStore) {
        setSelectedStore(updatedStore);
      }

      setEditingName(false);
      console.log("Nome atualizado com sucesso!");

      // Mostrar feedback visual de sucesso
      const originalTitle = document.title;
      document.title = "✅ Nome salvo!";
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    } catch (error) {
      console.error("Erro ao atualizar nome da loja:", error);

      const errorMessage =
        error.response?.data?.message || "Erro ao atualizar nome da loja";
      alert(errorMessage);

      // Reverter o nome para o original
      setSelectedStore({
        ...selectedStore,
        businessName: originalName,
      });
    } finally {
      setSavingName(false);
    }
  };
  const handleCancelEditName = () => {
    setSelectedStore({
      ...selectedStore,
      businessName: originalName,
    });
    setEditingName(false);
  };

  // Funções para edição do CNPJ
  const handleEditCnpj = () => {
    setOriginalCnpj(selectedStore?.cnpj || "");
    setEditingCnpj(true);
  };

  const formatCnpj = (value) => {
    if (!value) return "";
    // Remove tudo que não é número
    const cnpjNumbers = value.replace(/\D/g, "");
    // Formata o CNPJ (XX.XXX.XXX/XXXX-XX)
    return cnpjNumbers
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const handleSaveCnpj = async () => {
    if (!selectedStore || !selectedStore._id) {
      console.error("Nenhuma loja selecionada para atualizar");
      alert("Erro: Nenhuma loja selecionada");
      return;
    }

    const newCnpj = selectedStore.cnpj?.replace(/\D/g, ""); // Remove formatação
    if (!newCnpj) {
      alert("CNPJ não pode estar vazio");
      return;
    }

    if (newCnpj.length !== 14) {
      alert("CNPJ deve ter 14 dígitos");
      return;
    }

    const originalCnpjNumbers = originalCnpj.replace(/\D/g, "");
    if (newCnpj === originalCnpjNumbers) {
      setEditingCnpj(false);
      return;
    }

    setSavingCnpj(true);
    try {
      console.log("Atualizando CNPJ da loja:", {
        storeId: selectedStore._id,
        newCnpj: newCnpj,
      });

      // Chamar API para atualizar CNPJ
      await api.put(`/stores/cnpj`, {
        cnpj: newCnpj,
        storeId: selectedStore._id,
      });

      // Atualizar a lista de lojas
      const response = await getStores();
      setStores(response.data);

      // Atualizar a loja selecionada na lista
      const updatedStore = response.data.find(
        (store) => store._id === selectedStore._id
      );

      updatedStore.cnpj = formatCnpj(newCnpj); // Formatar CNPJ antes de atualizar

      if (updatedStore) {
        setSelectedStore(updatedStore);
      }

      setEditingCnpj(false);
      console.log("CNPJ atualizado com sucesso!");

      // Mostrar feedback visual de sucesso
      const originalTitle = document.title;
      document.title = "✅ CNPJ salvo!";
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    } catch (error) {
      console.error("Erro ao atualizar CNPJ da loja:", error);

      const errorMessage =
        error.response?.data?.message || "Erro ao atualizar CNPJ da loja";
      alert(errorMessage);

      // Reverter o CNPJ para o original
      setSelectedStore({
        ...selectedStore,
        cnpj: originalCnpj,
      });
    } finally {
      setSavingCnpj(false);
    }
  };

  const handleCancelEditCnpj = () => {
    setSelectedStore({
      ...selectedStore,
      cnpj: originalCnpj,
    });
    setEditingCnpj(false);
  };

  // Funções para edição do telefone
  const handleEditPhone = () => {
    setOriginalPhone(selectedStore?.phone || "");
    setEditingPhone(true);
  };

  const formatPhone = (value) => {
    if (!value) return "";
    // Remove tudo que não é número
    const phoneNumbers = value.replace(/\D/g, "");
    // Formata o telefone (XX) XXXXX-XXXX
    return phoneNumbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const handleSavePhone = async () => {
    if (!selectedStore || !selectedStore._id) {
      console.error("Nenhuma loja selecionada para atualizar");
      alert("Erro: Nenhuma loja selecionada");
      return;
    }

    const newPhone = selectedStore.phone?.replace(/\D/g, "");
    const originalPhoneNumbers = originalPhone?.replace(/\D/g, "");

    if (!newPhone) {
      alert("Telefone não pode estar vazio");
      return;
    }

    if (newPhone.length < 10 || newPhone.length > 11) {
      alert("Telefone deve ter 10 ou 11 dígitos");
      return;
    }

    if (newPhone === originalPhoneNumbers) {
      setEditingPhone(false);
      return;
    }

    setSavingPhone(true);
    try {
      console.log("Atualizando telefone da loja:", {
        storeId: selectedStore._id,
        newPhone: newPhone,
      });

      const responseStore = await api.put(`/stores/phone`, {
        phone: newPhone,
        storeId: selectedStore._id,
      });

      // Atualizar a loja selecionada na lista
      const updatedStore = responseStore.data;
      if (updatedStore) {
        setSelectedStore(updatedStore);
      }
      console.log("Updated store after phone change:", responseStore.data);
      setEditingPhone(false);
      console.log("Telefone atualizado com sucesso!");

      // Mostrar feedback visual de sucesso
      const originalTitle = document.title;
      document.title = "✅ Telefone salvo!";
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    } catch (error) {
      console.error("Erro ao atualizar telefone da loja:", error);

      const errorMessage =
        error.response?.data?.message || "Erro ao atualizar telefone da loja";
      alert(errorMessage);

      // Reverter o telefone para o original
      setSelectedStore({
        ...selectedStore,
        phone: originalPhone,
      });
    } finally {
      setSavingPhone(false);
    }
  };

  const handleCancelEditPhone = () => {
    setSelectedStore({
      ...selectedStore,
      phone: originalPhone,
    });
    setEditingPhone(false);
  };

  const handleRemoveStore = async (storeId) => {
    if (!storeId) return;

    const confirm = window.confirm("Tem certeza que deseja remover esta loja?");
    if (!confirm) return;

    try {
      await api.delete("/stores/remove-store", {
        data: { storeId },
      });

      // Atualizar a lista de lojas após remoção
      const updatedStores = stores.filter((store) => store._id !== storeId);
      setStores(updatedStores);
      setSelectedStore(null);
      setDetailsModal(false);
    } catch (error) {
      console.error("Erro ao remover loja:", error);
      alert("Erro ao remover loja");
    }
  };

  const openProfileImageModal = () => {
    setProfileImageModal(true);
  };

  const closeProfileImageModal = () => {
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
        // Atualizar o estado local das lojas
        setStores((prevStores) =>
          prevStores.map((store) =>
            store._id === selectedStore._id
              ? {
                  ...store,
                  perfil_url: imageUrl,
                }
              : store
          )
        );

        // Atualizar loja selecionada
        setSelectedStore((prevStore) => ({
          ...prevStore,
          perfil_url: imageUrl,
        }));

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
        // Atualizar o estado local das lojas
        setStores((prevStores) =>
          prevStores.map((store) =>
            store._id === selectedStore._id
              ? {
                  ...store,
                  perfil_url: "",
                }
              : store
          )
        );

        // Atualizar loja selecionada
        setSelectedStore((prevStore) => ({
          ...prevStore,
          perfil_url: "",
        }));

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
              <StoreIcon sx={{ mr: 2, color: "primary.main" }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" fontWeight="bold">
                  Estabelecimentos
                </Typography>
                {isAdmin && (
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip
                      label="Administrador do Sistema"
                      size="small"
                      color="error"
                      variant="filled"
                    />
                  </Box>
                )}
              </Box>
            </Box>

            {/* Filtros */}
            <Paper className="filter-section" sx={{ mb: 3, p: 2 }}>
              <Grid container spacing={2}>
                {/* Barra de Pesquisa */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Pesquisar estabelecimento"
                    placeholder="Ex: Pizzaria Bella Vista"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: (
                        <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
                      ),
                      endAdornment: searchTerm && (
                        <IconButton
                          size="small"
                          onClick={() => setSearchTerm("")}
                          sx={{ color: "text.secondary" }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      ),
                    }}
                    variant="outlined"
                  />
                </Grid>

                {/* Filtro por Status */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <Select
                      labelId="status-filter-label"
                      multiple
                      value={selectedStatuses}
                      onChange={handleStatusChange}
                      displayEmpty
                      sx={{
                        minHeight: "56px",
                        "& .MuiSelect-select": {
                          minHeight: "20px",
                          display: "flex",
                          alignItems: "center",
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                          },
                        },
                      }}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              Selecione os status
                            </Typography>
                          );
                        }
                        return (
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                              alignItems: "center",
                              minHeight: "20px",
                            }}
                          >
                            {selected.map((value) => {
                              const status = STORE_STATUS.find(
                                (s) => s.value === value
                              );
                              return status ? (
                                <Chip
                                  key={value}
                                  label={status.label}
                                  size="small"
                                  color={status.color}
                                  variant="outlined"
                                />
                              ) : null;
                            })}
                          </Box>
                        );
                      }}
                    >
                      {STORE_STATUS.map((status) => (
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

                {/* Filtro por Categoria */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <Select
                      labelId="category-filter-label"
                      multiple
                      value={selectedCategories}
                      onChange={handleCategoryChange}
                      displayEmpty
                      sx={{
                        minHeight: "56px",
                        "& .MuiSelect-select": {
                          minHeight: "20px",
                          display: "flex",
                          alignItems: "center",
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                          },
                        },
                      }}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              Selecione as categorias
                            </Typography>
                          );
                        }
                        return (
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                              alignItems: "center",
                              minHeight: "20px",
                            }}
                          >
                            {selected.map((value) => (
                              <Chip
                                key={value}
                                label={value}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        );
                      }}
                    >
                      {STORE_CATEGORIES.map((category) => (
                        <MenuItem key={category} value={category}>
                          <Checkbox
                            checked={selectedCategories.indexOf(category) > -1}
                          />
                          <ListItemText primary={category} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Filtros ativos */}
            {(searchTerm.trim() ||
              selectedStatuses.length > 0 ||
              selectedCategories.length > 0) && (
              <Box
                sx={{
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Filtros ativos:
                </Typography>

                {searchTerm.trim() && (
                  <Chip
                    label={`Pesquisa: "${searchTerm}"`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onDelete={() => setSearchTerm("")}
                  />
                )}

                {selectedStatuses.map((status) => {
                  const statusConfig = STORE_STATUS.find(
                    (s) => s.value === status
                  );
                  return statusConfig ? (
                    <Chip
                      key={status}
                      label={`Status: ${statusConfig.label}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      onDelete={() => {
                        setSelectedStatuses((prev) =>
                          prev.filter((s) => s !== status)
                        );
                      }}
                    />
                  ) : null;
                })}

                {selectedCategories.map((category) => (
                  <Chip
                    key={category}
                    label={`Categoria: ${category}`}
                    size="small"
                    color="info"
                    variant="outlined"
                    onDelete={() => {
                      setSelectedCategories((prev) =>
                        prev.filter((c) => c !== category)
                      );
                    }}
                  />
                ))}

                <Button size="small" onClick={clearAllFilters} sx={{ ml: 1 }}>
                  Limpar todos
                </Button>
              </Box>
            )}

            {/* Lista de estabelecimentos */}
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
            ) : filteredStores.length === 0 ? (
              <Paper
                className="empty-state"
                sx={{
                  p: 6,
                  textAlign: "center",
                  backgroundColor: "grey.50",
                }}
              >
                <StoreIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhum estabelecimento encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm.trim()
                    ? `Nenhum estabelecimento encontrado para "${searchTerm}". Tente uma pesquisa diferente.`
                    : selectedStatuses.length > 0 ||
                      selectedCategories.length > 0
                    ? "Tente ajustar os filtros para ver mais estabelecimentos."
                    : "Os estabelecimentos aparecerão aqui quando se cadastrarem."}
                </Typography>
              </Paper>
            ) : (
              <Paper className="stores-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Estabelecimento</TableCell>
                      <TableCell>Contrato</TableCell>
                      <TableCell>CNPJ</TableCell>
                      <TableCell>Telefone</TableCell>
                      <TableCell>Avaliação</TableCell>
                      <TableCell>Taxa de Entrega</TableCell>
                      <TableCell>Inscrição mensal</TableCell>
                      <TableCell>Situação</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStores.map((store, index) => (
                      <TableRow
                        key={store._id || index}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                        onClick={() => openDetails(store)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Avatar
                              src={store.perfil_url || store.avatar || ""}
                              sx={{
                                bgcolor: "primary.light",
                                color: "primary.contrastText",
                                mr: 1,
                                width: 32,
                                height: 32,
                              }}
                            >
                              {store.businessName?.charAt(0)?.toUpperCase() ||
                                "E"}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {store.businessName || "Nome não informado"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                ID: {store._id?.slice(-6) || "Não informado"}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {store.termsAccepted ? "Assinado" : "Pendente"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={store.cnpj || "Não informado"}
                            size="small"
                            variant="outlined"
                            icon={<CategoryIcon fontSize="small" />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {store.phone || "Não informado"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <RatingIcon
                              sx={{
                                fontSize: 16,
                                color: "warning.main",
                                mr: 0.5,
                              }}
                            />
                            <Typography variant="body2">
                              {store.rating ? store.rating.toFixed(1) : "N/A"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatCurrency(store.billingOptions?.motoBoyFee)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatCurrency(store.billingOptions?.monthlyFee)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {store.cnpj_approved ? "Aprovado" : "Pendente"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            {hasAdminPermission() && (
                              <IconButton
                                onClick={() => handleRemoveStore(store._id)}
                                title="Remover estabelecimento (apenas administradores)"
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(store);
                              }}
                            >
                              Detalhes
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Modal de detalhes */}
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
                  <StoreIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Detalhes do Estabelecimento -{" "}
                    {selectedStore?.businessName || "Sem nome"}
                  </Typography>
                </Box>
                <IconButton onClick={closeDetails} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent>
                {selectedStore && (
                  <Box sx={{ mt: 2 }}>
                    {/* Cabeçalho com informações básicas */}
                    <Box
                      sx={{
                        mb: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box sx={{ position: "relative" }}>
                          <Avatar
                            src={
                              selectedStore.perfil_url ||
                              selectedStore.avatar ||
                              ""
                            }
                            sx={{
                              width: 64,
                              height: 64,
                              mr: 2,
                              bgcolor: "primary.light",
                            }}
                          >
                            {selectedStore.businessName
                              ?.charAt(0)
                              ?.toUpperCase() || "E"}
                          </Avatar>
                          {hasAdminPermission() && (
                            <IconButton
                              onClick={openProfileImageModal}
                              size="small"
                              sx={{
                                position: "absolute",
                                bottom: -4,
                                right: 4,
                                bgcolor: "primary.main",
                                color: "white",
                                width: 24,
                                height: 24,
                                "&:hover": {
                                  bgcolor: "primary.dark",
                                },
                              }}
                              title="Gerenciar imagem de perfil"
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <TextField
                            value={
                              selectedStore?.businessName || "Nome Indefinido"
                            }
                            onChange={(e) => {
                              setSelectedStore({
                                ...selectedStore,
                                businessName: e.target.value,
                              });
                            }}
                            disabled={!editingName || !hasAdminPermission()}
                            variant="standard"
                            size="medium"
                            sx={{ flexGrow: 1, mr: 1 }}
                            placeholder="Digite o nome da loja"
                          />
                          {hasAdminPermission() ? (
                            !editingName ? (
                              <IconButton
                                onClick={handleEditName}
                                size="small"
                                title="Editar nome"
                              >
                                <EditIcon />
                              </IconButton>
                            ) : (
                              <Box sx={{ display: "flex", gap: 0.5 }}>
                                <IconButton
                                  onClick={handleSaveName}
                                  size="small"
                                  disabled={savingName}
                                  title="Salvar alterações"
                                  sx={{
                                    color: "success.main",
                                    "&:hover": {
                                      backgroundColor: "success.light",
                                    },
                                  }}
                                >
                                  {savingName ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <CheckIcon />
                                  )}
                                </IconButton>
                                <IconButton
                                  onClick={handleCancelEditName}
                                  size="small"
                                  title="Cancelar edição"
                                  sx={{
                                    color: "error.main",
                                    "&:hover": {
                                      backgroundColor: "error.light",
                                    },
                                  }}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Box>
                            )
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              {isAdmin
                                ? ""
                                : "(Somente administradores podem editar)"}
                            </Typography>
                          )}

                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {getStatusChip(selectedStore.status || "closed")}
                            </Typography>
                            <Chip
                              label={selectedStore.category || "Outros"}
                              size="small"
                              variant="outlined"
                              icon={<CategoryIcon fontSize="small" />}
                              sx={{ mr: 1, mt: 1 }}
                            />
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Cadastrado em: {formatDate(selectedStore.createdAt)}
                      </Typography>
                    </Box>

                    <Grid container spacing={3}>
                      {/* Informações Pessoais */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" className="info-card">
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <BusinessIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Informações do Estabelecimento
                              </Typography>
                            </Box>

                            <Stack spacing={1}>
                              {/* Telefone editável */}
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
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexGrow: 1,
                                  }}
                                >
                                  <TextField
                                    value={
                                      editingPhone
                                        ? selectedStore?.phone || ""
                                        : formatPhone(
                                            selectedStore?.phone ||
                                              selectedStore?.phoneNumber ||
                                              ""
                                          )
                                    }
                                    onChange={(e) => {
                                      if (
                                        editingPhone &&
                                        hasAdminPermission()
                                      ) {
                                        const value = e.target.value.replace(
                                          /\D/g,
                                          ""
                                        );
                                        if (value.length <= 11) {
                                          setSelectedStore({
                                            ...selectedStore,
                                            phone: value,
                                          });
                                        }
                                      }
                                    }}
                                    disabled={
                                      !editingPhone || !hasAdminPermission()
                                    }
                                    variant="standard"
                                    size="small"
                                    sx={{ flexGrow: 1, mr: 1 }}
                                    placeholder="Digite o telefone"
                                    inputProps={{
                                      maxLength: editingPhone ? 11 : undefined,
                                    }}
                                  />
                                  {hasAdminPermission() ? (
                                    !editingPhone ? (
                                      <IconButton
                                        onClick={handleEditPhone}
                                        size="small"
                                        title="Editar telefone"
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    ) : (
                                      <Box sx={{ display: "flex", gap: 0.5 }}>
                                        <IconButton
                                          onClick={handleSavePhone}
                                          size="small"
                                          disabled={savingPhone}
                                          title="Salvar telefone"
                                          sx={{
                                            color: "success.main",
                                            "&:hover": {
                                              backgroundColor: "success.light",
                                            },
                                          }}
                                        >
                                          {savingPhone ? (
                                            <CircularProgress size={12} />
                                          ) : (
                                            <CheckIcon fontSize="small" />
                                          )}
                                        </IconButton>
                                        <IconButton
                                          onClick={handleCancelEditPhone}
                                          size="small"
                                          title="Cancelar edição"
                                          sx={{
                                            color: "error.main",
                                            "&:hover": {
                                              backgroundColor: "error.light",
                                            },
                                          }}
                                        >
                                          <CloseIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    )
                                  ) : (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: "0.7rem" }}
                                    >
                                      {isAdmin ? "" : "(Admin)"}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>

                              {selectedStore.email && (
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  <EmailIcon
                                    sx={{
                                      mr: 1,
                                      fontSize: 16,
                                      color: "text.secondary",
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {selectedStore.email}
                                  </Typography>
                                </Box>
                              )}

                              {/* CNPJ editável */}
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <BadgeIcon
                                  sx={{
                                    mr: 1,
                                    fontSize: 16,
                                    color: "text.secondary",
                                  }}
                                />
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexGrow: 1,
                                  }}
                                >
                                  <TextField
                                    value={
                                      editingCnpj
                                        ? selectedStore?.cnpj || ""
                                        : formatCnpj(selectedStore?.cnpj || "")
                                    }
                                    onChange={(e) => {
                                      if (editingCnpj && hasAdminPermission()) {
                                        const value = e.target.value.replace(
                                          /\D/g,
                                          ""
                                        );
                                        if (value.length <= 14) {
                                          setSelectedStore({
                                            ...selectedStore,
                                            cnpj: value,
                                          });
                                        }
                                      }
                                    }}
                                    disabled={
                                      !editingCnpj || !hasAdminPermission()
                                    }
                                    variant="standard"
                                    size="small"
                                    sx={{ flexGrow: 1, mr: 1 }}
                                    placeholder="Digite o CNPJ"
                                    inputProps={{
                                      maxLength: editingCnpj ? 14 : undefined,
                                    }}
                                  />
                                  {hasAdminPermission() ? (
                                    !editingCnpj ? (
                                      <IconButton
                                        onClick={handleEditCnpj}
                                        size="small"
                                        title="Editar CNPJ"
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    ) : (
                                      <Box sx={{ display: "flex", gap: 0.5 }}>
                                        <IconButton
                                          onClick={handleSaveCnpj}
                                          size="small"
                                          disabled={savingCnpj}
                                          title="Salvar CNPJ"
                                          sx={{
                                            color: "success.main",
                                            "&:hover": {
                                              backgroundColor: "success.light",
                                            },
                                          }}
                                        >
                                          {savingCnpj ? (
                                            <CircularProgress size={12} />
                                          ) : (
                                            <CheckIcon fontSize="small" />
                                          )}
                                        </IconButton>
                                        <IconButton
                                          onClick={handleCancelEditCnpj}
                                          size="small"
                                          title="Cancelar edição"
                                          sx={{
                                            color: "error.main",
                                            "&:hover": {
                                              backgroundColor: "error.light",
                                            },
                                          }}
                                        >
                                          <CloseIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    )
                                  ) : (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: "0.7rem" }}
                                    >
                                      {isAdmin ? "" : "(Admin)"}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>

                              {selectedStore.address && (
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
                                    {formatAddress(selectedStore.address)}
                                  </Typography>
                                </Box>
                              )}

                              {selectedStore.openingHours && (
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  <ScheduleIcon
                                    sx={{
                                      mr: 1,
                                      fontSize: 16,
                                      color: "text.secondary",
                                    }}
                                  />
                                  <Typography variant="body2">
                                    Horário: {selectedStore.openingHours}
                                  </Typography>
                                </Box>
                              )}
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Assinou o contrato:{" "}
                                {selectedStore.termsAccepted ? "Sim" : "Não"}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Data de assinatura:{" "}
                                {formatDate(selectedStore.termsAcceptedAt)}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Informações de Delivery */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" className="info-card">
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <EarningsIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Informações de Delivery
                              </Typography>
                            </Box>

                            <Stack spacing={1}>
                              <Typography variant="body2">
                                <strong>Taxa de entrega:</strong>{" "}
                                {formatCurrency(
                                  selectedStore.billingOptions?.motoBoyFee
                                )}
                              </Typography>

                              <Typography variant="body2">
                                <strong>Inscrição mensal:</strong>{" "}
                                {formatCurrency(
                                  selectedStore.billingOptions?.monthlyFee
                                )}
                              </Typography>

                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBillingModal(selectedStore);
                                }}
                                disabled={!hasFinancePermission()}
                                title={
                                  !hasFinancePermission()
                                    ? "Você não tem permissão para alterar configurações financeiras"
                                    : ""
                                }
                              >
                                {hasFinancePermission()
                                  ? "Alterar"
                                  : "Sem Acesso"}
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Estatísticas */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" className="info-card">
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <RatingIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Estatísticas
                              </Typography>
                            </Box>

                            <Stack spacing={1}>
                              <Typography variant="body2">
                                <strong>Avaliação:</strong>{" "}
                                {selectedStore.rating
                                  ? `${selectedStore.rating.toFixed(1)} ⭐`
                                  : "Sem avaliações"}
                              </Typography>

                              <Typography variant="body2">
                                <strong>Pedidos realizados:</strong>{" "}
                                {selectedStore.orders?.length || 0}
                              </Typography>

                              <Typography variant="body2">
                                <strong>Status atual:</strong>{" "}
                                {STORE_STATUS.find(
                                  (s) => s.value === selectedStore.status
                                )?.label || "Fechado"}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Documentos do estabelecimento */}
                    <Grid item xs={12} mt={3}>
                      <Card variant="outlined" className="info-card">
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 2,
                            }}
                          >
                            <DocumentIcon
                              sx={{ mr: 1, color: "primary.main" }}
                            />
                            <Typography variant="h6" fontWeight="bold">
                              Documentos Enviados
                            </Typography>
                          </Box>

                          {loadingDocuments ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: 100,
                              }}
                            >
                              <CircularProgress size={30} />
                              <Typography variant="body2" sx={{ ml: 2 }}>
                                Carregando documentos...
                              </Typography>
                            </Box>
                          ) : storeDocuments.length === 0 ? (
                            <Box
                              sx={{
                                textAlign: "center",
                                py: 3,
                                backgroundColor: "grey.50",
                                borderRadius: 1,
                              }}
                            >
                              <DocumentIcon
                                sx={{ fontSize: 48, color: "grey.400", mb: 1 }}
                              />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {selectedStore?.firebaseUid
                                  ? "Nenhum documento encontrado"
                                  : "Conta Firebase não vinculada"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {selectedStore?.firebaseUid
                                  ? "O estabelecimento ainda não enviou nenhum documento"
                                  : "Este estabelecimento ainda não possui conta Firebase vinculada"}
                              </Typography>
                            </Box>
                          ) : (
                            <Grid container spacing={2}>
                              {storeDocuments.map((document, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                  <Paper
                                    variant="outlined"
                                    sx={{
                                      p: 2,
                                      borderRadius: 2,
                                      transition: "all 0.2s",
                                      "&:hover": {
                                        boxShadow: 2,
                                        transform: "translateY(-2px)",
                                      },
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        mb: 1,
                                      }}
                                    >
                                      <DocumentIcon
                                        sx={{
                                          mr: 1,
                                          color: "primary.main",
                                          fontSize: 20,
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        fontWeight="medium"
                                        sx={{
                                          flexGrow: 1,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {formatDocumentName(
                                          document.originalName ||
                                            document.businessName
                                        )}
                                      </Typography>
                                    </Box>

                                    {document.timestamp && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: "block", mb: 1 }}
                                      >
                                        Enviado em:{" "}
                                        {formatDate(
                                          new Date(parseInt(document.timestamp))
                                        )}
                                      </Typography>
                                    )}

                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 1,
                                        justifyContent: "flex-end",
                                      }}
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          openDocument(document.url)
                                        }
                                        sx={{
                                          backgroundColor: "primary.light",
                                          color: "primary.contrastText",
                                          "&:hover": {
                                            backgroundColor: "primary.main",
                                          },
                                        }}
                                        title="Visualizar documento"
                                      >
                                        <ViewIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          downloadDocument(
                                            document.url,
                                            document.originalName ||
                                              document.businessName
                                          )
                                        }
                                        sx={{
                                          backgroundColor: "success.light",
                                          color: "success.contrastText",
                                          "&:hover": {
                                            backgroundColor: "success.main",
                                          },
                                        }}
                                        title="Baixar documento"
                                      >
                                        <DownloadIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          )}

                          <Divider sx={{ my: 2 }} />
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "bold" }}
                            >
                              Aprovar Estabelecimento (para pedidos)
                            </Typography>
                            {hasAdminPermission() ? (
                              <Box>
                                <Button
                                  variant="contained"
                                  color="error"
                                  disabled={
                                    selectedStore.cnpj_approved === false
                                  }
                                  onClick={() => {
                                    handleReproveStore(selectedStore._id);
                                  }}
                                  sx={{ textTransform: "none", mr: 1 }}
                                >
                                  <CloseIcon sx={{ mr: 1 }} />
                                  Reprovar
                                </Button>
                                <Button
                                  variant="contained"
                                  color="success"
                                  disabled={
                                    selectedStore.cnpj_approved === true
                                  }
                                  onClick={() => {
                                    handleApproveStore(selectedStore._id);
                                  }}
                                  sx={{ textTransform: "none" }}
                                >
                                  <CheckIcon sx={{ mr: 1 }} />
                                  {selectedStore.cnpj_approved
                                    ? "Aprovado"
                                    : "Aprovar"}
                                </Button>
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {isAdmin
                                  ? ""
                                  : "Apenas administradores podem aprovar estabelecimentos"}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "bold" }}
                            >
                              Liberação de uso do sistema:
                            </Typography>
                            {hasAdminPermission() ? (
                              <Box>
                                <Button
                                  variant="contained"
                                  color="error"
                                  disabled={
                                    selectedStore.freeToNavigate === false
                                  }
                                  onClick={() => {
                                    handleReproveFreeToNavigate(
                                      selectedStore._id
                                    );
                                  }}
                                  sx={{ textTransform: "none", mr: 1 }}
                                >
                                  <CloseIcon sx={{ mr: 1 }} />
                                  Cancelar Acesso
                                </Button>
                                <Button
                                  variant="contained"
                                  color="success"
                                  disabled={
                                    selectedStore.freeToNavigate === true
                                  }
                                  onClick={() => {
                                    handleFreeToNavigate(selectedStore._id);
                                  }}
                                  sx={{ textTransform: "none" }}
                                >
                                  <CheckIcon sx={{ mr: 1 }} />
                                  {selectedStore.freeToNavigate
                                    ? "Acesso Liberado"
                                    : "Liberar acesso"}
                                </Button>
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {isAdmin
                                  ? ""
                                  : "Apenas administradores podem liberar acesso ao sistema"}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Mapa */}
                    {selectedStore.coordinates &&
                      Array.isArray(selectedStore.coordinates) &&
                      selectedStore.coordinates.length === 2 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ mb: 2 }}
                          >
                            Localização do Estabelecimento
                          </Typography>
                          <Card variant="outlined">
                            <CardContent>
                              {loadError && (
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: "200px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "error.light",
                                    borderRadius: 1,
                                    mb: 2,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="error.contrastText"
                                  >
                                    Erro ao carregar o Google Maps
                                  </Typography>
                                </Box>
                              )}

                              {!isLoaded ? (
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: "400px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "grey.100",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Box sx={{ textAlign: "center" }}>
                                    <CircularProgress sx={{ mb: 2 }} />
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Carregando mapa...
                                    </Typography>
                                  </Box>
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: "400px",
                                    position: "relative",
                                  }}
                                >
                                  <GoogleMap
                                    mapContainerStyle={{
                                      width: "100%",
                                      height: "400px",
                                    }}
                                    center={{
                                      lat: parseFloat(
                                        selectedStore.coordinates[1]
                                      ),
                                      lng: parseFloat(
                                        selectedStore.coordinates[0]
                                      ),
                                    }}
                                    zoom={15}
                                    options={{
                                      zoomControl: true,
                                      mapTypeControl: true,
                                      scaleControl: true,
                                      streetViewControl: true,
                                      rotateControl: false,
                                      fullscreenControl: true,
                                    }}
                                  >
                                    {renderMarkers()}
                                  </GoogleMap>
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

            {/* Modal de Billing */}
            <Dialog
              open={billingModal}
              onClose={closeBillingModal}
              maxWidth="md"
              fullWidth
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
                  <EarningsIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Opções de Billing -{" "}
                    {selectedStore?.name ||
                      selectedStore?.businessName ||
                      "Estabelecimento"}
                  </Typography>
                </Box>
                <IconButton onClick={closeBillingModal} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent>
                {selectedStore && (
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={3}>
                      {/* Taxa de Entrega */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Taxa de Entrega (R$)"
                          type="number"
                          inputProps={{ min: 0, step: 0.01 }}
                          value={billingOptions.deliveryFee}
                          onChange={(e) =>
                            handleBillingChange(
                              "deliveryFee",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          variant="outlined"
                          disabled={!hasFinancePermission()}
                          helperText={
                            !hasFinancePermission() && !isAdmin
                              ? "Somente usuários com permissão financeira podem editar"
                              : ""
                          }
                        />
                      </Grid>

                      {/* Taxa de Comissão */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Inscrição mensal (R$)"
                          type="number"
                          inputProps={{ min: 0, step: 0.01 }}
                          value={billingOptions.commissionRate}
                          onChange={(e) =>
                            handleBillingChange(
                              "commissionRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          variant="outlined"
                          disabled={!hasFinancePermission()}
                          helperText={
                            !hasFinancePermission() && !isAdmin
                              ? "Somente usuários com permissão financeira podem editar"
                              : ""
                          }
                        />
                      </Grid>

                      {/* Resumo */}
                      <Grid item xs={12}>
                        <Card variant="outlined" sx={{ mt: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Resumo das Configurações
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Typography variant="body2">
                                  <strong>Taxa de Entrega:</strong>{" "}
                                  {formatCurrency(billingOptions.deliveryFee)}
                                </Typography>
                              </Grid>

                              <Grid item xs={6}>
                                <Typography variant="body2">
                                  <strong>Taxa de Comissão:</strong>{" "}
                                  {formatCurrency(
                                    billingOptions.commissionRate
                                  )}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={closeBillingModal} color="inherit">
                  Cancelar
                </Button>
                {hasFinancePermission() && (
                  <Button
                    onClick={saveBillingOptions}
                    variant="contained"
                    disabled={loadingBilling}
                    startIcon={
                      loadingBilling ? (
                        <CircularProgress size={20} />
                      ) : (
                        <CheckIcon />
                      )
                    }
                  >
                    {loadingBilling ? "Salvando..." : "Salvar"}
                  </Button>
                )}
                {!hasFinancePermission() && !isAdmin && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 2 }}
                  >
                    Apenas usuários com permissão financeira podem salvar
                    alterações
                  </Typography>
                )}
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
                      {selectedStore.businessName || "Estabelecimento"}
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
          </Container>
        </Box>
      </Box>
    </>
  );
}
