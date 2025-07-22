import React, { useState, useEffect, useRef, use } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Switch,
  FormControlLabel,
  Container,
  Fab,
  CircularProgress,
  Alert,
  Divider,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  MyLocation as MyLocationIcon,
  Store as StoreIcon,
  DeliveryDining as MotoboyIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CheckCircle as ApprovedIcon,
  Cancel as UnapprovedIcon,
  ToggleOff as OfflineIcon,
  ToggleOn as OnlineIcon,
  Star as StarIcon,
  Assignment as OrdersIcon,
  FilterList as FilterIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon,
  ShoppingBag,
  Map as MapIcon,
  ReportProblem as OcorrenciasIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SideDrawer from "../../components/SideDrawer/SideDrawer";

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const defaultCenter = {
  lat: -22.428377,
  lng: -46.956744,
}; // -22.428377, -46.956744

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
  };

  let iconClass, color;

  if (type === "motoboy") {
    color =
      status === "available"
        ? colors.motoboy.available
        : colors.motoboy.offline;
    iconClass = "fas fa-motorcycle"; // Font Awesome motorcycle icon
  } else {
    color =
      status === "approved" ? colors.store.approved : colors.store.pending;
    iconClass = "fas fa-store"; // Font Awesome store icon
  }

  const iconSvg = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
          </style>
        </defs>
        <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="3"/>
        <text x="20" y="25" text-anchor="middle" fill="${color}" font-size="16" font-family="Font Awesome 6 Free" font-weight="900">
          ${type === "motoboy" ? "🏍️" : "🏪"}
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
};

// Configurações dos markers personalizados
const createMarkerIcon = (type, status) => {
  // Verificar se o Google Maps está disponível
  if (!window.google || !window.google.maps) {
    console.warn("Google Maps ainda não foi carregado");
    return null; // Retorna null se não estiver carregado
  }

  const baseUrl = "https://maps.google.com/mapfiles/ms/icons/";

  if (type === "motoboy") {
    return {
      url:
        status === "available"
          ? `${baseUrl}blue-dot.png`
          : `${baseUrl}gray-dot.png`,
      scaledSize: new window.google.maps.Size(32, 32),
    };
  } else if (type === "store") {
    return {
      url:
        status === "approved"
          ? `${baseUrl}green-dot.png`
          : `${baseUrl}red-dot.png`,
      scaledSize: new window.google.maps.Size(32, 32),
    };
  }

  return {
    url: `${baseUrl}purple-dot.png`,
    scaledSize: new window.google.maps.Size(32, 32),
  };
};

export default function SupportMapPage() {
  const { currentUser, logout } = useAuth();
  const mapRef = useRef(null);
  const navigate = useNavigate();

  const [motoboys, setMotoboys] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [showMotoboys, setShowMotoboys] = useState(true);
  const [showStores, setShowStores] = useState(true);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isMapLoaded, setIsMapLoaded] = useState(false); // Adicionar estado
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    console.log("user: ", currentUser);
    if (!currentUser) {
      console.error("Usuário não autenticado, redirecionando...");
      navigate("/login");
    }
  }, [currentUser, navigate]);

  const handleStartChat = async (selectedItem) => {
    try {
      setLoading(true);

      let targetFirebaseUid;
      const supportId = currentUser?.uid;
      //   console.log("🚀 Iniciando chat com:", currentUser);

      // Determinar o firebaseUid baseado no tipo
      if (selectedItem.type === "motoboy") {
        // Para motoboys, usar o firebaseUid diretamente
        targetFirebaseUid = selectedItem.firebaseUid;

        if (!targetFirebaseUid) {
          console.error("Motoboy não tem firebaseUid:", selectedItem);
          alert("Erro: Motoboy não possui ID válido para chat");
          return;
        }
      } else if (selectedItem.type === "store") {
        // Para stores, usar o firebaseUid da store
        targetFirebaseUid = selectedItem.firebaseUid;

        if (!targetFirebaseUid) {
          console.error("Store não tem firebaseUid:", selectedItem);
          alert("Erro: Estabelecimento não possui ID válido para chat");
          return;
        }
      } else {
        console.error("Tipo desconhecido:", selectedItem.type);
        alert("Erro: Tipo de usuário não reconhecido");
        return;
      }

      console.log("🚀 Iniciando chat:", {
        supportId,
        targetFirebaseUid,
        type: selectedItem.type,
        name: selectedItem.name || selectedItem.businessName,
      });

      // Buscar chats existentes do usuário de suporte
      const existingChatsResponse = await api.get(`/chat/user/${supportId}`);
      const existingChats = existingChatsResponse.data;

      // Verificar se já existe um chat
      const existingChat = existingChats.find(
        (chat) =>
          chat.firebaseUid.includes(targetFirebaseUid) &&
          chat.firebaseUid.includes(supportId)
      );

      let chatId;

      if (existingChat) {
        // Usar o chat existente
        chatId = existingChat._id;
        console.log("💬 Chat existente encontrado:", chatId);
      } else {
        // Criar um novo chat
        console.log("🆕 Criando novo chat...");

        const newChatResponse = await api.post("/chat", {
          firebaseUid: [supportId, targetFirebaseUid],
          chatType: "SUPPORT",
          participantNames: {
            [supportId]: "Suporte Gringo",
            [targetFirebaseUid]:
              selectedItem.name ||
              selectedItem.businessName ||
              `${selectedItem.type} ${targetFirebaseUid.substring(0, 6)}`,
          },
        });

        if (!newChatResponse.data || !newChatResponse.data._id) {
          throw new Error("Erro ao criar chat");
        }

        chatId = newChatResponse.data._id;
        console.log("✅ Chat criado:", chatId);

        // Criar uma mensagem inicial automaticamente
        const initialMessage =
          selectedItem.type === "motoboy"
            ? `Olá ${selectedItem.name}! Sou da equipe de suporte do Gringo Delivery. Como posso ajudar?`
            : `Olá ${
                selectedItem.businessName || selectedItem.displayName
              }! Sou da equipe de suporte do Gringo Delivery. Como posso ajudar?`;

        await api.post("/chat/message", {
          chatId: chatId,
          message: initialMessage,
          sender: supportId,
        });

        console.log("📨 Mensagem inicial enviada");
      }

      // Fechar o dialog antes de navegar
      setDetailDialog(false);

      // Navegar para a página de chat
      navigate(`/chat`, {
        state: {
          chatId: chatId,
          targetUserId: targetFirebaseUid,
          targetUserName: selectedItem.name || selectedItem.businessName,
          userType: selectedItem.type,
        },
      });
    } catch (error) {
      console.error("❌ Erro ao iniciar chat:", error);
      alert(`Erro ao iniciar chat: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMapData = async () => {
    try {
      setLoading(true);

      // Carregar motoboys
      const motoboyResponse = await api.get("/motoboys");
      //   console.log("📍 Resposta motoboys:", motoboyResponse.data);

      const motoboyData = motoboyResponse.data.filter(
        (m) => m.coordinates && m.coordinates.length === 2
      );
      //   console.log("📍 Motoboys filtrados:", motoboyData);
      setMotoboys(motoboyData);

      // Carregar stores
      const storeResponse = await api.get("/stores");
      //   console.log("🏪 Resposta stores:", storeResponse.data);

      const storeData = storeResponse.data.filter(
        (s) =>
          s.geolocation &&
          s.geolocation.coordinates &&
          s.geolocation.coordinates.length === 2
      );
      //   console.log("🏪 Stores filtradas:", storeData);
      setStores(storeData);

      //   console.log("🗺️ Dados carregados:", {
      //     motoboys: motoboyData.length,
      //     stores: storeData.length,
      //   });
    } catch (error) {
      console.error("Erro ao carregar dados do mapa:", error);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar no início de handleMarkerClick para debug:
  const handleMarkerClick = (item, type) => {
    // console.log("🔍 Item clicado:", {
    //   type,
    //   firebaseUid: item.firebaseUid,
    //   name: item.name || item.businessName,
    //   dados: item,
    // });

    setSelectedItem({ ...item, type });
    setDetailDialog(true);
  };

  const getFilteredMotoboys = () => {
    return motoboys.filter((motoboy) => {
      if (showOnlineOnly && !motoboy.isAvailable) return false;
      return true;
    });
  };

  const getFilteredStores = () => {
    return stores.filter((store) => {
      if (showOnlineOnly && !store.isAvailable) return false;
      return true;
    });
  };

  const centerMapOnBounds = () => {
    if (!mapRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Adicionar pontos dos motoboys
    if (showMotoboys) {
      getFilteredMotoboys().forEach((motoboy) => {
        if (motoboy.coordinates && motoboy.coordinates.length === 2) {
          bounds.extend({
            lat: motoboy.coordinates[1],
            lng: motoboy.coordinates[0],
          });
          hasPoints = true;
        }
      });
    }

    // Adicionar pontos das lojas
    if (showStores) {
      getFilteredStores().forEach((store) => {
        if (store.geolocation && store.geolocation.coordinates.length === 2) {
          bounds.extend({
            lat: store.geolocation.coordinates[1],
            lng: store.geolocation.coordinates[0],
          });
          hasPoints = true;
        }
      });
    }

    if (hasPoints) {
      mapRef.current.fitBounds(bounds);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert("Erro ao fazer logout. Tente novamente.");
    }
  };

  const renderMarkers = () => {
    const markers = [];

    // console.log("🎯 Renderizando markers:", {
    //   isMapLoaded,
    //   showMotoboys,
    //   showStores,
    //   motoboyCount: getFilteredMotoboys().length,
    //   storeCount: getFilteredStores().length,
    // });

    // Só renderizar markers se o Google Maps estiver carregado
    if (!isMapLoaded) {
      console.log("❌ Mapa ainda não carregado");
      return markers;
    }

    // Markers dos motoboys
    if (showMotoboys) {
      getFilteredMotoboys().forEach((motoboy, index) => {
        // console.log(`🏍️ Motoboy ${index}:`, {
        //   name: motoboy.name,
        //   coordinates: motoboy.coordinates,
        //   isAvailable: motoboy.isAvailable,
        // });

        if (motoboy.coordinates && motoboy.coordinates.length === 2) {
          const icon = createFontAwesomeMarker(
            "motoboy",
            motoboy.isAvailable ? "available" : "offline"
          );

          //   console.log(`✅ Adicionando marker motoboy: ${motoboy.name}`);

          markers.push(
            <Marker
              key={`motoboy-${motoboy._id}`}
              position={{
                lat: motoboy.coordinates[1],
                lng: motoboy.coordinates[0],
              }}
              icon={icon}
              onClick={() => handleMarkerClick(motoboy, "motoboy")}
              title={`Motoboy: ${motoboy.name}`}
            />
          );
        } else {
          console.log(`❌ Motoboy sem coordenadas válidas: ${motoboy.name}`);
        }
      });
    }

    // Markers das lojas
    if (showStores) {
      getFilteredStores().forEach((store, index) => {
        // console.log(`🏪 Store ${index}:`, {
        //   name: store.businessName || store.displayName,
        //   geolocation: store.geolocation,
        //   isAvailable: store.isAvailable,
        // });

        if (
          store.geolocation &&
          store.geolocation.coordinates &&
          store.geolocation.coordinates.length === 2
        ) {
          const icon = createFontAwesomeMarker(
            "store",
            store.cnpj_approved ? "approved" : "pending"
          );

          //   console.log(
          //     `✅ Adicionando marker store: ${
          //       store.businessName || store.displayName
          //     }`
          //   );

          markers.push(
            <Marker
              key={`store-${store._id}`}
              position={{
                lat: store.geolocation.coordinates[1],
                lng: store.geolocation.coordinates[0],
              }}
              icon={icon}
              onClick={() => handleMarkerClick(store, "store")}
              title={`Loja: ${store.businessName || store.displayName}`}
            />
          );
        } else {
          console.log(
            `❌ Store sem coordenadas válidas: ${
              store.businessName || store.displayName
            }`
          );
        }
      });
    }

    // console.log(`🎯 Total de markers criados: ${markers.length}`);
    return markers;
  };

  // Corrigir o DialogActions no renderDetailDialog
  const renderDetailDialog = () => {
    if (!selectedItem) return null;

    const { type } = selectedItem;

    return (
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Avatar
                sx={{
                  mr: 2,
                  bgcolor: type === "motoboy" ? "primary.main" : "success.main",
                }}
              >
                {type === "motoboy" ? <MotoboyIcon /> : <StoreIcon />}
              </Avatar>
              <Typography variant="h6">
                {type === "motoboy" ? "Motoboy" : "Estabelecimento"}
              </Typography>
            </Box>
            <IconButton onClick={() => setDetailDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {type === "motoboy" ? (
            <MotoboyDetails motoboy={selectedItem} />
          ) : (
            <StoreDetails store={selectedItem} />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Fechar</Button>

          {/* Botão para ligar */}
          <Button
            variant="outlined"
            startIcon={<PhoneIcon />}
            href={`tel:${selectedItem.phoneNumber || selectedItem.phone}`}
            onClick={(e) => e.stopPropagation()}
          >
            Ligar
          </Button>

          {/* Botão para iniciar chat - CORRIGIDO */}
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <PhoneIcon />}
            onClick={() => handleStartChat(selectedItem)}
            disabled={loading}
          >
            {loading ? "Iniciando..." : "Iniciar Chat"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const MotoboyDetails = ({ motoboy }) => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informações Pessoais
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Nome" secondary={motoboy.name} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Email" secondary={motoboy.email} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Telefone"
                  secondary={motoboy.phoneNumber}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="CPF" secondary={motoboy.cpf} />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status e Avaliação
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                icon={motoboy.isAvailable ? <OnlineIcon /> : <OfflineIcon />}
                label={motoboy.isAvailable ? "Online" : "Offline"}
                color={motoboy.isAvailable ? "success" : "default"}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                icon={
                  motoboy.isApproved ? <ApprovedIcon /> : <UnapprovedIcon />
                }
                label={motoboy.isApproved ? "Aprovado" : "Pendente"}
                color={motoboy.isApproved ? "success" : "error"}
                sx={{ mr: 1, mb: 1 }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <StarIcon sx={{ color: "gold", mr: 1 }} />
              <Typography variant="h6">
                {motoboy.score ? motoboy.score.toFixed(1) : "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                / 5.0
              </Typography>
            </Box>

            {motoboy.race && motoboy.race.active && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Em corrida:</strong>
                  <br />
                  Pedido: #{motoboy.race.orderId}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Localização
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <LocationIcon sx={{ mr: 1, color: "text.secondary" }} />
              <Typography>
                Lat: {motoboy.coordinates[1].toFixed(6)}, Lng:{" "}
                {motoboy.coordinates[0].toFixed(6)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Adicionar esta função helper antes do componente StoreDetails
  const formatAddress = (address) => {
    if (!address) return "Não informado";

    if (typeof address === "string") return address;

    if (typeof address === "object") {
      const parts = [];

      if (address.address) parts.push(address.address);
      if (address.addressNumber) parts.push(address.addressNumber);
      if (address.bairro) parts.push(`- ${address.bairro}`);
      if (address.cidade) parts.push(`${address.cidade}`);
      if (address.cep) parts.push(`CEP: ${address.cep}`);

      return parts.length > 0 ? parts.join(", ") : "Endereço incompleto";
    }

    return "Formato de endereço inválido";
  };

  const formatBusinessHours = (businessHours) => {
    if (!businessHours) return "Não informado";

    if (typeof businessHours === "string") return businessHours;

    if (typeof businessHours === "object") {
      // Se for um objeto, tentar formatar de forma mais legível
      try {
        return Object.entries(businessHours)
          .map(([day, hours]) => `${day}: ${hours}`)
          .join("\n");
      } catch {
        return JSON.stringify(businessHours, null, 2);
      }
    }

    return "Formato inválido";
  };

  // Versão corrigida do StoreDetails
  const StoreDetails = ({ store }) => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informações do Estabelecimento
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Nome do Negócio"
                  secondary={store.businessName || store.displayName}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="Email" secondary={store.email} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Telefone" secondary={store.phone} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="CNPJ"
                  secondary={store.cnpj || "Não informado"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Endereço"
                  secondary={formatAddress(store.address)}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                icon={store.isAvailable ? <OnlineIcon /> : <OfflineIcon />}
                label={store.isAvailable ? "Aberto" : "Fechado"}
                color={store.isAvailable ? "success" : "default"}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                icon={
                  store.cnpj_approved ? <ApprovedIcon /> : <UnapprovedIcon />
                }
                label={store.cnpj_approved ? "CNPJ Aprovado" : "CNPJ Pendente"}
                color={store.cnpj_approved ? "success" : "error"}
                sx={{ mr: 1, mb: 1 }}
              />
            </Box>

            {store.businessHours && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Horário de Funcionamento:
                </Typography>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                >
                  {formatBusinessHours(store.businessHours)}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Localização
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <LocationIcon sx={{ mr: 1, color: "text.secondary" }} />
              <Typography>
                Lat: {store.geolocation.coordinates[1].toFixed(6)}, Lng:{" "}
                {store.geolocation.coordinates[0].toFixed(6)}
              </Typography>
            </Box>

            {/* Mostrar endereço formatado */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Endereço:
              </Typography>
              <Typography variant="body2">
                {formatAddress(store.address)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h4" fontWeight="bold">
            Mapa de Suporte
          </Typography>
          <Box>
            <Tooltip title="Atualizar dados">
              <IconButton onClick={loadMapData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Centralizar mapa">
              <IconButton onClick={centerMapOnBounds}>
                <MyLocationIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {false ? (
          <SideDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            variant="temporary"
            title="Gringo Delivery"
            logoUrl="https://i.imgur.com/8jOdfcO.png"
            logoAlt="Gringo Delivery"
            logoHeight={50}
            menuItems={[
              {
                path: "/dashboard",
                text: "Dashboard",
                icon: <DashboardIcon />,
              },
              { path: "/produtos", text: "Produtos", icon: <ProductsIcon /> },
              {
                path: "/ocorrencias",
                text: "Ocorrências",
                icon: <ReportProblemIcon />,
              },
              { path: "/chat", text: "Chat", icon: <ChatIcon /> },
              {
                path: "/motoboys",
                text: "Entregadores",
                icon: <MotoboyIcon />,
              },
              { path: "/pedidos", text: "Pedidos", icon: <OrdersIcon /> },
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
              {
                path: "/dashboard",
                text: "Dashboard",
                icon: <DashboardIcon />,
              },
              {
                path: "/ocorrencias",
                text: "Ocorrências",
                icon: <OcorrenciasIcon />,
              },
              { path: "/chat", text: "Chat", icon: <ChatIcon /> },
              { path: "/mapa", text: "Mapa", icon: <MapIcon /> },
              { path: "/pedidos", text: "Pedidos", icon: <OrdersIcon /> },
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

        {/* Filtros */}
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={showMotoboys}
                  onChange={(e) => setShowMotoboys(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <MotoboyIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Badge
                    badgeContent={getFilteredMotoboys().length}
                    color="primary"
                  >
                    <Typography>Motoboys</Typography>
                  </Badge>
                </Box>
              }
            />
          </Grid>

          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={showStores}
                  onChange={(e) => setShowStores(e.target.checked)}
                  color="success"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <StoreIcon sx={{ mr: 1, color: "success.main" }} />
                  <Badge
                    badgeContent={getFilteredStores().length}
                    color="success"
                  >
                    <Typography>Estabelecimentos</Typography>
                  </Badge>
                </Box>
              }
            />
          </Grid>

          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  color="warning"
                />
              }
              label="Apenas Online"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Mapa */}
      <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
        {loading ? (
          <Box
            sx={{
              height: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={60} />
          </Box>
        ) : (
          <LoadScript
            googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
            onLoad={() => {
              //   console.log("🗺️ Google Maps carregado com sucesso");
              setIsMapLoaded(true); // Marcar como carregado
            }}
            onError={(error) => {
              console.error("❌ Erro ao carregar Google Maps:", error);
            }}
          >
            <GoogleMap
              ref={mapRef}
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
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
              onLoad={(map) => {
                mapRef.current = map;
                // console.log("🗺️ Mapa carregado e referência definida");
              }}
            >
              {renderMarkers()}
            </GoogleMap>
          </LoadScript>
        )}
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <MotoboyIcon
                sx={{ fontSize: 40, color: "primary.main", mb: 1 }}
              />
              <Typography variant="h4" fontWeight="bold">
                {motoboys.filter((m) => m.isAvailable).length}
              </Typography>
              <Typography color="text.secondary">Motoboys Online</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <StoreIcon sx={{ fontSize: 40, color: "success.main", mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stores.filter((s) => s.isAvailable).length}
              </Typography>
              <Typography color="text.secondary">Lojas Abertas</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <ApprovedIcon sx={{ fontSize: 40, color: "info.main", mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {motoboys.filter((m) => m.isApproved).length}
              </Typography>
              <Typography color="text.secondary">Motoboys Aprovados</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <UnapprovedIcon
                sx={{ fontSize: 40, color: "error.main", mb: 1 }}
              />
              <Typography variant="h4" fontWeight="bold">
                {stores.filter((s) => !s.cnpj_approved).length}
              </Typography>
              <Typography color="text.secondary">CNPJs Pendentes</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de detalhes */}
      {renderDetailDialog()}
    </Container>
  );
}
