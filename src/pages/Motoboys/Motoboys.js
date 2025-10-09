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
  BikeScooter as MotoboyIcon,
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
  DirectionsBike as VehicleIcon,
  Star as RatingIcon,
  AttachMoney as EarningsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Description as DocumentIcon,
  CloudDownload as DownloadIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import { useAuth } from "../../contexts/AuthContext";
import { useSuporteAuth } from "../../contexts/SuporteAuthContext";
import api, {
  getMotoboy,
  getMotoboys,
  getTravelsMotoboy,
} from "../../services/api";
import { getFileURL, getUserDocuments } from "../../services/storageService";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import "./Motoboys.css";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
  getFilteredSupportMenuItems,
} from "../../config/menuConfig";

const MOTOBOY_STATUS = [
  {
    value: true,
    label: "Disponível",
    color: "success",
    icon: OnlineIcon,
  },
  {
    value: "busy",
    label: "Ocupado",
    color: "warning",
    icon: MotoboyIcon,
  },
  {
    value: false,
    label: "Offline",
    color: "error",
    icon: OfflineIcon,
  },
];

export default function MotoboysPage() {
  // Hook para carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "maps", "geometry"],
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [motoboys, setMotoboys] = useState([]);
  const [filteredMotoboys, setFilteredMotoboys] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedMotoboy, setSelectedMotoboy] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [motoboyDocuments, setMotoboyDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [motoboyToDelete, setMotoboyToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMotoboys();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [motoboys, selectedStatuses, searchTerm]);

  const fetchMotoboys = async () => {
    try {
      setLoading(true);
      // Simular delay da API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await api.get("/motoboys");
      const fetchedMotoboys = response.data;
      setMotoboys(fetchedMotoboys);
    } catch (error) {
      console.error("Erro ao buscar motoboys:", error);
      // Usar dados mock em caso de erro na API
      setMotoboys([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = motoboys;

    // Filtrar por status
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((motoboy) =>
        selectedStatuses.includes(motoboy.status || "offline")
      );
    }

    // Filtrar por nome (busca flexível)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((motoboy) => {
        const name = (motoboy.name || "").toLowerCase();
        // Busca por palavras parciais - exemplo: "caio elias" encontra "Caio Cesar Silva Elias"
        const searchWords = searchLower.split(/\s+/);
        return searchWords.every((word) => name.includes(word));
      });
    }
    // console.warn("Filtered Motoboys:", filtered);
    setFilteredMotoboys(filtered);
  };

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setSelectedStatuses(typeof value === "string" ? value.split(",") : value);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatuses([]);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const fetchMotoboyDocuments = async (firebaseUid) => {
    try {
      setLoadingDocuments(true);

      // Verificar se o firebaseUid existe
      if (!firebaseUid) {
        console.warn("FirebaseUid não encontrado para este motoboy");
        setMotoboyDocuments([]);
        return;
      }

      // Buscar documentos do motoboy usando o firebaseUid
      const documents = await getUserDocuments(firebaseUid);
      setMotoboyDocuments(documents);
    } catch (error) {
      console.error("❌ Erro ao buscar documentos do motoboy:", error);

      // Criar objeto de erro mais seguro
      const errorInfo = {
        message: error?.message || "Erro desconhecido",
        code: error?.code || "unknown",
        firebaseUid: firebaseUid || "não fornecido",
        userAuthenticated: user?.uid || "Não autenticado",
        timestamp: new Date().toISOString(),
      };

      console.error("❌ Detalhes do erro:", errorInfo);
      setMotoboyDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const openDetails = async (motoboy) => {
    try {
      setSelectedMotoboy(motoboy);
      setDetailsModal(true);
      setMotoboyDocuments([]); // Limpar documentos anteriores

      console.log("Abrindo detalhes do motoboy:", {
        id: motoboy._id,
        name: motoboy.name,
        firebaseUid: motoboy.firebaseUid,
      });

      // Verificar se o usuário está autenticado
      if (!user) {
        console.error("❌ Usuário não está autenticado para buscar documentos");
        return;
      }

      // Buscar viagens do motoboy
      try {
        const travels = await getTravelsMotoboy(motoboy._id);
        const data = travels.data;
        setSelectedMotoboy((prev) => ({ ...prev, travels: data }));
      } catch (travelsError) {
        console.error("❌ Erro ao buscar viagens do motoboy:", travelsError);
      }

      // Buscar documentos do motoboy usando o firebaseUid
      if (motoboy.firebaseUid) {
        console.log("📄 Iniciando busca de documentos...");
        await fetchMotoboyDocuments(motoboy.firebaseUid);
      } else {
        console.warn("⚠️ Motoboy não possui firebaseUid:", motoboy.name);
        setMotoboyDocuments([]);
      }
    } catch (error) {
      console.error("❌ Erro geral ao abrir detalhes:", error);
      setSelectedMotoboy(motoboy);
      setDetailsModal(true);
    }
  };
  const closeDetails = () => {
    setSelectedMotoboy(null);
    setDetailsModal(false);
    setMotoboyDocuments([]);
    setLoadingDocuments(false);
  };

  const getStatusChip = (status) => {
    const statusConfig =
      MOTOBOY_STATUS.find((s) => s.value === status) || MOTOBOY_STATUS[2];

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

  const createMotoboyMarker = (motoboy) => {
    if (!window.google || !window.google.maps) {
      return null;
    }

    const colors = {
      available: "#4CAF50",
      busy: "#FF9800",
      offline: "#9E9E9E",
    };

    const color = colors[motoboy.status] || colors.offline;

    try {
      const iconSvg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="3"/>
          <text x="20" y="25" text-anchor="middle" fill="${color}" font-size="16" font-family="Arial, sans-serif" font-weight="900">
            🏍️
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

    // Renderizar marcador do motoboy selecionado
    if (
      selectedMotoboy &&
      selectedMotoboy.coordinates &&
      Array.isArray(selectedMotoboy.coordinates) &&
      selectedMotoboy.coordinates.length === 2
    ) {
      const icon = createMotoboyMarker(selectedMotoboy);

      if (icon) {
        markers.push(
          <Marker
            key={`motoboy-${selectedMotoboy._id || "selected"}`}
            position={{
              lat: parseFloat(selectedMotoboy.coordinates[1]),
              lng: parseFloat(selectedMotoboy.coordinates[0]),
            }}
            icon={icon}
            title={`Motoboy: ${selectedMotoboy.name || "Sem nome"}`}
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
      if (address.addressNumber) parts.push(address.addressNumber);
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

  // Definir itens do menu para SideDrawer com filtro baseado em roles
  const menuItems = SUPPORT_MENU_ITEMS;

  // Definir itens de rodapé para SideDrawer
  const footerItems = createSupportFooterItems(handleLogout);

  const handleApproveMotoboy = async (motoboyId) => {
    try {
      const response = await api.post(`/motoboys/approve/${motoboyId}`);
      const data = response.data;
      if (response.status === 200) {
        setSelectedMotoboy((prev) => ({
          ...prev,
          isApproved: true, // Atualiza o status para aprovado
        }));
      }
    } catch (error) {
      console.error("Erro ao aprovar motoboy:", error);
    }
  };

  const handleReprovarMotoboy = async (motoboyId) => {
    try {
      const response = await api.post(`/motoboys/repprove/${motoboyId}`);
      const data = response.data;
      if (response.status === 200) {
        setSelectedMotoboy((prev) => ({
          ...prev,
          isApproved: false, // Atualiza o status para reprovado
        }));
      }
    } catch (error) {
      console.error("Erro ao reprovar motoboy:", error);
    }
  };

  const handleDeleteMotoboy = async () => {
    if (!motoboyToDelete) return;

    setDeleting(true);
    try {
      const response = await api.delete(`/motoboys/${motoboyToDelete._id}`);
      if (response.status === 200) {
        // Atualizar lista de motoboys removendo o deletado
        setMotoboys((prev) =>
          prev.filter((motoboy) => motoboy._id !== motoboyToDelete._id)
        );
        setFilteredMotoboys((prev) =>
          prev.filter((motoboy) => motoboy._id !== motoboyToDelete._id)
        );

        // Fechar modal de detalhes se o motoboy deletado estava sendo visualizado
        if (selectedMotoboy?._id === motoboyToDelete._id) {
          setDetailsModal(false);
          setSelectedMotoboy(null);
        }

        // Fechar modal de confirmação
        setDeleteConfirmModal(false);
        setMotoboyToDelete(null);

        console.log("Motoboy excluído com sucesso");
      }
    } catch (error) {
      console.error("Erro ao excluir motoboy:", error);
      alert("Erro ao excluir motoboy. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteConfirmation = (motoboy) => {
    setMotoboyToDelete(motoboy);
    setDeleteConfirmModal(true);
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmModal(false);
    setMotoboyToDelete(null);
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
              <MotoboyIcon sx={{ mr: 2, color: "primary.main" }} />
              <Typography variant="h4" fontWeight="bold" sx={{ flexGrow: 1 }}>
                Entregadores
              </Typography>
            </Box>

            {/* Filtros */}
            <Paper className="filter-section" sx={{ mb: 3, p: 2 }}>
              <Grid container spacing={2}>
                {/* Barra de Pesquisa */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Pesquisar por nome"
                    placeholder="Ex: João Souza"
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
                <Grid item xs={12} md={6}>
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
                              const status = MOTOBOY_STATUS.find(
                                (s) => s.value === value
                              );
                              return (
                                <Chip
                                  key={value}
                                  label={status?.label || value}
                                  size="small"
                                  sx={{
                                    fontSize: "0.75rem",
                                    height: "24px",
                                    ...(status?.color === "error" && {
                                      backgroundColor: "#ffebee",
                                      color: "#c62828",
                                      "& .MuiChip-deleteIcon": {
                                        color: "#c62828",
                                      },
                                    }),
                                    ...(status?.color === "warning" && {
                                      backgroundColor: "#fff8e1",
                                      color: "#f57c00",
                                      "& .MuiChip-deleteIcon": {
                                        color: "#f57c00",
                                      },
                                    }),
                                    ...(status?.color === "success" && {
                                      backgroundColor: "#e8f5e8",
                                      color: "#2e7d32",
                                      "& .MuiChip-deleteIcon": {
                                        color: "#2e7d32",
                                      },
                                    }),
                                  }}
                                />
                              );
                            })}
                          </Box>
                        );
                      }}
                    >
                      {MOTOBOY_STATUS.map((status) => (
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
              </Grid>
            </Paper>

            {/* Status dos Filtros Ativos */}
            {(searchTerm.trim() || selectedStatuses.length > 0) && (
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
                  const statusConfig = MOTOBOY_STATUS.find(
                    (s) => s.value === status
                  );
                  return (
                    <Chip
                      key={status}
                      label={`Status: ${statusConfig?.label || status}`}
                      size="small"
                      color={statusConfig?.color || "default"}
                      variant="outlined"
                      onDelete={() =>
                        setSelectedStatuses((prev) =>
                          prev.filter((s) => s !== status)
                        )
                      }
                    />
                  );
                })}

                <Button size="small" onClick={clearAllFilters} sx={{ ml: 1 }}>
                  Limpar todos
                </Button>
              </Box>
            )}

            {/* Lista de Motoboys */}
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
            ) : filteredMotoboys.length === 0 ? (
              <Paper
                className="empty-state"
                sx={{
                  p: 6,
                  textAlign: "center",
                  backgroundColor: "grey.50",
                }}
              >
                <MotoboyIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhum entregador encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm.trim()
                    ? `Nenhum entregador encontrado para "${searchTerm}". Tente uma pesquisa diferente.`
                    : selectedStatuses.length > 0
                    ? "Tente ajustar os filtros para ver mais entregadores."
                    : "Os entregadores aparecerão aqui quando se cadastrarem."}
                </Typography>
              </Paper>
            ) : (
              <Paper className="motoboys-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Entregador</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Telefone</TableCell>
                      <TableCell>Veículo</TableCell>
                      <TableCell>Avaliação</TableCell>
                      <TableCell>Situação</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMotoboys.map((motoboy, index) => (
                      <TableRow
                        key={motoboy._id || index}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                        onClick={() => openDetails(motoboy)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Avatar
                              src={motoboy.profileImage || ""}
                              sx={{
                                bgcolor: "primary.light",
                                color: "primary.contrastText",
                                mr: 1,
                                width: 32,
                                height: 32,
                              }}
                            >
                              {motoboy.name?.charAt(0)?.toUpperCase() || "M"}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {motoboy.name || "Nome não informado"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                ID: {motoboy._id || "Não informado"}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(motoboy.isAvailable)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {motoboy.phoneNumber || "Não informado"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {motoboy.vehicle || "Não informado"}
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
                              {motoboy.score ? motoboy.score.toFixed(1) : "N/A"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {motoboy.isApproved ? "Aprovado" : "Pendente"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(motoboy);
                              }}
                            >
                              Detalhes
                            </Button>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteConfirmation(motoboy);
                              }}
                              sx={{
                                "&:hover": {
                                  backgroundColor: "error.light",
                                  color: "error.contrastText",
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Modal de Detalhes */}
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
                  <MotoboyIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Detalhes do Entregador -{" "}
                    {selectedMotoboy?.name || "Sem nome"}
                  </Typography>
                </Box>
                <IconButton onClick={closeDetails} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent>
                {selectedMotoboy && (
                  <Box sx={{ mt: 2 }}>
                    {/* Status e Avatar */}
                    <Box
                      sx={{
                        mb: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          src={selectedMotoboy.profileImage || ""}
                          sx={{
                            width: 64,
                            height: 64,
                            mr: 2,
                            bgcolor: "primary.light",
                          }}
                        >
                          {selectedMotoboy.name?.charAt(0)?.toUpperCase() ||
                            "M"}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {selectedMotoboy.name || "Nome não informado"}
                          </Typography>
                          {getStatusChip(selectedMotoboy.isAvailable)}
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Cadastrado em: {formatDate(selectedMotoboy.createdAt)}
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
                              <PersonIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Informações Pessoais
                              </Typography>
                            </Box>

                            <Stack spacing={1}>
                              {selectedMotoboy.phoneNumber && (
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
                                    {selectedMotoboy.phoneNumber}
                                  </Typography>
                                </Box>
                              )}

                              {selectedMotoboy.email && (
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
                                    {selectedMotoboy.email}
                                  </Typography>
                                </Box>
                              )}

                              {selectedMotoboy.address && (
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
                                    {formatAddress(selectedMotoboy.address)}
                                  </Typography>
                                </Box>
                              )}

                              {selectedMotoboy.birthDate && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Nascimento:{" "}
                                  {formatDate(selectedMotoboy.birthDate)}
                                </Typography>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Informações do Veículo */}
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
                              <VehicleIcon
                                sx={{ mr: 1, color: "primary.main" }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                Informações do Veículo
                              </Typography>
                            </Box>

                            <Stack spacing={1}>
                              <Typography variant="body2">
                                <strong>Tipo:</strong>{" "}
                                {selectedMotoboy.vehicle || "Não informado"}
                              </Typography>

                              {selectedMotoboy.licensePlate && (
                                <Typography variant="body2">
                                  <strong>Placa:</strong>{" "}
                                  {selectedMotoboy.licensePlate}
                                </Typography>
                              )}

                              {selectedMotoboy.vehicleModel && (
                                <Typography variant="body2">
                                  <strong>Modelo:</strong>{" "}
                                  {selectedMotoboy.vehicleModel}
                                </Typography>
                              )}

                              {selectedMotoboy.vehicleYear && (
                                <Typography variant="body2">
                                  <strong>Ano:</strong>{" "}
                                  {selectedMotoboy.vehicleYear}
                                </Typography>
                              )}
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
                                {selectedMotoboy.score
                                  ? `${selectedMotoboy.score.toFixed(1)} ⭐`
                                  : "Sem avaliações"}
                              </Typography>

                              <Typography variant="body2">
                                <strong>Entregas realizadas:</strong>{" "}
                                {selectedMotoboy?.travels?.length || 0}
                              </Typography>

                              <Typography variant="body2">
                                <strong>Última atividade:</strong>{" "}
                                {formatDate(
                                  selectedMotoboy?.travels?.[
                                    selectedMotoboy?.travels?.length - 1
                                  ]?.createdAt
                                )}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Grid item xs={12} md={6} mt={3}>
                      <Card variant="outlined" className="info-card">
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 2,
                            }}
                          >
                            <RatingIcon sx={{ mr: 1, color: "primary.main" }} />
                            <Typography variant="h6" fontWeight="bold">
                              Informações da Corrida
                            </Typography>
                          </Box>

                          <Stack spacing={1}>
                            <Typography variant="body2">
                              <strong>Em corrida:</strong>{" "}
                              {selectedMotoboy.race?.active ? (
                                <Chip
                                  label="Sim"
                                  color="success"
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              ) : (
                                <Chip
                                  label="Não"
                                  color="default"
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>

                            {selectedMotoboy.race?.active &&
                              selectedMotoboy.race?.orderId && (
                                <Typography variant="body2">
                                  <strong>ID do Pedido:</strong>{" "}
                                  <code
                                    style={{
                                      backgroundColor: "#f5f5f5",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    {selectedMotoboy.race.orderId}
                                  </code>
                                </Typography>
                              )}

                            <Typography variant="body2">
                              <strong>Ver detalhes do pedido:</strong>{" "}
                              {selectedMotoboy.race?.orderId ? (
                                <RouterLink
                                  to={`/pedidos`}
                                  state={{
                                    orderId: selectedMotoboy.race.orderId,
                                  }}
                                  style={{
                                    textDecoration: "none",
                                    color: "white",
                                    backgroundColor: "#1976d2",
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                    display: "inline-block",
                                    fontSize: "0.875rem",
                                    fontWeight: "500",
                                    transition: "background-color 0.2s",
                                    marginTop: "8px",
                                  }}
                                  onMouseOver={(e) => {
                                    e.target.style.backgroundColor = "#1565c0";
                                  }}
                                  onMouseOut={(e) => {
                                    e.target.style.backgroundColor = "#1976d2";
                                  }}
                                >
                                  📋 Ver Pedido #
                                  {selectedMotoboy.race.orderId?.slice(-6)}
                                </RouterLink>
                              ) : (
                                <span
                                  style={{
                                    fontStyle: "italic",
                                    color: "#666",
                                    backgroundColor: "#f9f9f9",
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                    display: "inline-block",
                                    marginTop: "8px",
                                  }}
                                >
                                  🚫 Nenhum pedido ativo
                                </span>
                              )}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Seção de Documentos */}
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
                          ) : motoboyDocuments.length === 0 ? (
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
                                {selectedMotoboy?.firebaseUid
                                  ? "Nenhum documento encontrado"
                                  : "Conta Firebase não vinculada"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {selectedMotoboy?.firebaseUid
                                  ? "O entregador ainda não enviou nenhum documento"
                                  : "Este entregador ainda não possui conta Firebase vinculada"}
                              </Typography>
                            </Box>
                          ) : (
                            <Grid container spacing={2}>
                              {motoboyDocuments.map((document, index) => (
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
                                          document.originalName || document.name
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
                                              document.name
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
                              Aprovar Entregador
                            </Typography>
                            <Box>
                              <Button
                                variant="contained"
                                color="primary"
                                disabled={selectedMotoboy.isApproved === false}
                                onClick={() => {
                                  handleReprovarMotoboy(selectedMotoboy._id);
                                }}
                                sx={{ textTransform: "none", mr: 1 }}
                              >
                                <CloseIcon sx={{ mr: 1 }} />
                                Reprovar
                              </Button>
                              <Button
                                variant="contained"
                                color="primary"
                                disabled={selectedMotoboy.isApproved === true}
                                onClick={() => {
                                  handleApproveMotoboy(selectedMotoboy._id);
                                }}
                                sx={{ textTransform: "none", mr: 1 }}
                              >
                                <CheckIcon sx={{ mr: 1 }} />
                                {selectedMotoboy.isApproved
                                  ? "Aprovado"
                                  : "Aprovar"}
                              </Button>
                              <Button
                                variant="contained"
                                color="error"
                                onClick={() => {
                                  openDeleteConfirmation(selectedMotoboy);
                                }}
                                sx={{ textTransform: "none" }}
                              >
                                <DeleteIcon sx={{ mr: 1 }} />
                                Excluir
                              </Button>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Mapa da localização */}
                    {selectedMotoboy.coordinates &&
                      Array.isArray(selectedMotoboy.coordinates) &&
                      selectedMotoboy.coordinates.length === 2 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ mb: 2 }}
                          >
                            Localização Atual
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
                                        selectedMotoboy.coordinates[1]
                                      ),
                                      lng: parseFloat(
                                        selectedMotoboy.coordinates[0]
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

            {/* Modal de Confirmação de Exclusão */}
            <Dialog
              open={deleteConfirmModal}
              onClose={closeDeleteConfirmation}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle sx={{ pb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <DeleteIcon sx={{ mr: 1, color: "error.main" }} />
                  Confirmar Exclusão
                </Box>
              </DialogTitle>
              <DialogContent>
                <Box sx={{ py: 2 }}>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Tem certeza que deseja excluir o cadastro do motoboy{" "}
                    <strong>{motoboyToDelete?.name}</strong>?
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Esta ação não pode ser desfeita. Todos os dados do motoboy
                    serão permanentemente removidos do sistema.
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: "error.light",
                      borderRadius: 1,
                      border: 1,
                      borderColor: "error.main",
                    }}
                  >
                    <Typography variant="body2" color="error.contrastText">
                      <strong>Atenção:</strong> Esta operação é irreversível!
                    </Typography>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button
                  onClick={closeDeleteConfirmation}
                  color="inherit"
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteMotoboy}
                  color="error"
                  variant="contained"
                  disabled={deleting}
                  startIcon={
                    deleting ? <CircularProgress size={20} /> : <DeleteIcon />
                  }
                >
                  {deleting ? "Excluindo..." : "Excluir"}
                </Button>
              </DialogActions>
            </Dialog>
          </Container>
        </Box>
      </Box>
    </>
  );
}
