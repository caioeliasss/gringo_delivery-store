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
  Support as SupportIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
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
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";
import { useAuth } from "../../../contexts/AuthContext";
import api from "../../../services/api";
import "./Support.css";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
} from "../../../config/menuConfig";

const SUPPORT_STATUS = [
  {
    value: "online",
    label: "Online",
    color: "success",
    icon: OnlineIcon,
  },
  {
    value: "busy",
    label: "Ocupado",
    color: "warning",
    icon: SupportIcon,
  },
  {
    value: "offline",
    label: "Offline",
    color: "error",
    icon: OfflineIcon,
  },
];

export default function SupportPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [supportTeam, setSupportTeam] = useState([]);
  const [filteredSupport, setFilteredSupport] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsModal, setDetailsModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedSupport, setSelectedSupport] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    status: "offline",
    active: false,
  });

  useEffect(() => {
    fetchSupportTeam();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [supportTeam, selectedStatuses, searchTerm]);

  const fetchSupportTeam = async () => {
    try {
      setLoading(true);
      const response = await api.get("/support");
      const fetchedSupport = response.data;
      setSupportTeam(fetchedSupport);
    } catch (error) {
      console.error("Erro ao buscar equipe de suporte:", error);
      setSupportTeam([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = supportTeam;

    // Filtrar por status
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((support) =>
        selectedStatuses.includes(support.status || "offline")
      );
    }

    // Filtrar por nome (busca flexível)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((support) => {
        const name = (support.name || "").toLowerCase();
        const email = (support.email || "").toLowerCase();
        // Busca por palavras parciais
        const searchWords = searchLower.split(/\s+/);
        return searchWords.every(
          (word) => name.includes(word) || email.includes(word)
        );
      });
    }

    setFilteredSupport(filtered);
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

  const openDetails = (support) => {
    setSelectedSupport(support);
    setDetailsModal(true);
  };

  const closeDetails = () => {
    setSelectedSupport(null);
    setDetailsModal(false);
  };

  const openEditModal = (support = null) => {
    if (support) {
      setEditForm({
        name: support.name || "",
        email: support.email || "",
        phone: support.phone || "",
        whatsapp: support.whatsapp || "",
        status: support.status || "offline",
        active: support.active || false,
      });
      setSelectedSupport(support);
    } else {
      setEditForm({
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        status: "offline",
        active: false,
      });
      setSelectedSupport(null);
    }
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setSelectedSupport(null);
    setEditForm({
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      status: "offline",
      active: false,
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSupport = async () => {
    try {
      if (selectedSupport) {
        // Atualizar
        await api.put(`/support/${selectedSupport._id}`, editForm);
      } else {
        // Criar novo
        await api.post("/support", {
          ...editForm,
          firebaseUid: `temp_${Date.now()}`, // Gerar UID temporário
        });
      }

      await fetchSupportTeam();
      closeEditModal();
    } catch (error) {
      console.error("Erro ao salvar membro da equipe:", error);
    }
  };

  const handleDeleteSupport = async (supportId) => {
    if (
      window.confirm("Tem certeza que deseja remover este membro da equipe?")
    ) {
      try {
        await api.delete(`/support/${supportId}`);
        await fetchSupportTeam();
        closeDetails();
      } catch (error) {
        console.error("Erro ao remover membro da equipe:", error);
      }
    }
  };

  const getStatusChip = (status) => {
    const statusConfig =
      SUPPORT_STATUS.find((s) => s.value === status) || SUPPORT_STATUS[2];

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

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  // Definir itens do menu para SideDrawer
  const menuItems = SUPPORT_MENU_ITEMS;

  // Definir itens de rodapé para SideDrawer
  const footerItems = createSupportFooterItems(handleLogout);

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
              justifyContent: "space-between",
              mb: 3,
              p: 2,
              backgroundColor: "white",
              borderRadius: 2,
              boxShadow: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SupportIcon sx={{ mr: 2, color: "primary.main" }} />
              <Typography variant="h4" fontWeight="bold">
                Equipe de Suporte
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openEditModal()}
              sx={{ borderRadius: 2 }}
            >
              Adicionar Membro
            </Button>
          </Box>

          {/* Filtros */}
          <Paper className="filter-section" sx={{ mb: 3, p: 2 }}>
            <Grid container spacing={2}>
              {/* Barra de Pesquisa */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Pesquisar por nome ou email"
                  placeholder="Ex: João Souza ou joao@email.com"
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
                  <InputLabel id="status-filter-label">
                    Filtrar por Status
                  </InputLabel>
                  <Select
                    labelId="status-filter-label"
                    multiple
                    value={selectedStatuses}
                    onChange={handleStatusChange}
                    input={<OutlinedInput label="Filtrar por Status" />}
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
                            const status = SUPPORT_STATUS.find(
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
                    {SUPPORT_STATUS.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        <Checkbox
                          checked={selectedStatuses.indexOf(status.value) > -1}
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
                const statusConfig = SUPPORT_STATUS.find(
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

          {/* Lista da Equipe de Suporte */}
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
          ) : filteredSupport.length === 0 ? (
            <Paper
              className="empty-state"
              sx={{
                p: 6,
                textAlign: "center",
                backgroundColor: "grey.50",
              }}
            >
              <SupportIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhum membro da equipe encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm.trim()
                  ? `Nenhum membro encontrado para "${searchTerm}". Tente uma pesquisa diferente.`
                  : selectedStatuses.length > 0
                  ? "Tente ajustar os filtros para ver mais membros."
                  : "Adicione membros à equipe de suporte."}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openEditModal()}
                sx={{ mt: 2 }}
              >
                Adicionar Primeiro Membro
              </Button>
            </Paper>
          ) : (
            <Paper className="support-table">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Membro</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>WhatsApp</TableCell>
                    <TableCell>Ativo</TableCell>
                    <TableCell>Cadastrado</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSupport.map((support, index) => (
                    <TableRow
                      key={support._id || index}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                      onClick={() => openDetails(support)}
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
                            {support.name?.charAt(0)?.toUpperCase() || "S"}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {support.name || "Nome não informado"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {support.email || "Email não informado"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(support.status || "offline")}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {support.phone || "Não informado"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {support.whatsapp || "Não informado"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={support.active ? "Sim" : "Não"}
                          color={support.active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(support.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(support);
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
            open={detailsModal}
            onClose={closeDetails}
            maxWidth="md"
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
                <SupportIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6" fontWeight="bold">
                  Detalhes do Membro - {selectedSupport?.name || "Sem nome"}
                </Typography>
              </Box>
              <IconButton onClick={closeDetails} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              {selectedSupport && (
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
                        sx={{
                          width: 64,
                          height: 64,
                          mr: 2,
                          bgcolor: "primary.light",
                        }}
                      >
                        {selectedSupport.name?.charAt(0)?.toUpperCase() || "S"}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedSupport.name || "Nome não informado"}
                        </Typography>
                        {getStatusChip(selectedSupport.status || "offline")}
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={selectedSupport.active ? "Ativo" : "Inativo"}
                            color={
                              selectedSupport.active ? "success" : "default"
                            }
                            size="small"
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Cadastrado em: {formatDate(selectedSupport.createdAt)}
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    {/* Informações de Contato */}
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
                            <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                            <Typography variant="h6" fontWeight="bold">
                              Informações de Contato
                            </Typography>
                          </Box>

                          <Stack spacing={1}>
                            {selectedSupport.email && (
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
                                  {selectedSupport.email}
                                </Typography>
                              </Box>
                            )}

                            {selectedSupport.phone && (
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
                                  {selectedSupport.phone}
                                </Typography>
                              </Box>
                            )}

                            {selectedSupport.whatsapp && (
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <WhatsAppIcon
                                  sx={{
                                    mr: 1,
                                    fontSize: 16,
                                    color: "text.secondary",
                                  }}
                                />
                                <Typography variant="body2">
                                  {selectedSupport.whatsapp}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Informações do Sistema */}
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
                            <SupportIcon
                              sx={{ mr: 1, color: "primary.main" }}
                            />
                            <Typography variant="h6" fontWeight="bold">
                              Informações do Sistema
                            </Typography>
                          </Box>

                          <Stack spacing={1}>
                            <Typography variant="body2">
                              <strong>ID do Firebase:</strong>{" "}
                              <code
                                style={{
                                  backgroundColor: "#f5f5f5",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {selectedSupport.firebaseUid || "Não informado"}
                              </code>
                            </Typography>

                            <Typography variant="body2">
                              <strong>Status:</strong>{" "}
                              {selectedSupport.status || "Offline"}
                            </Typography>

                            <Typography variant="body2">
                              <strong>Última atualização:</strong>{" "}
                              {formatDate(selectedSupport.updatedAt)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button
                onClick={() => openEditModal(selectedSupport)}
                startIcon={<EditIcon />}
                variant="outlined"
              >
                Editar
              </Button>
              <Button
                onClick={() => handleDeleteSupport(selectedSupport._id)}
                startIcon={<DeleteIcon />}
                color="error"
                variant="outlined"
              >
                Remover
              </Button>
              <Button onClick={closeDetails} color="inherit">
                Fechar
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal de Edição/Criação */}
          <Dialog
            open={editModal}
            onClose={closeEditModal}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: { borderRadius: 2 },
            }}
          >
            <DialogTitle>
              <Typography variant="h6" fontWeight="bold">
                {selectedSupport ? "Editar Membro" : "Adicionar Membro"}
              </Typography>
            </DialogTitle>

            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nome"
                      value={editForm.name}
                      onChange={(e) =>
                        handleEditFormChange("name", e.target.value)
                      }
                      variant="outlined"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        handleEditFormChange("email", e.target.value)
                      }
                      variant="outlined"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      value={editForm.phone}
                      onChange={(e) =>
                        handleEditFormChange("phone", e.target.value)
                      }
                      variant="outlined"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="WhatsApp"
                      value={editForm.whatsapp}
                      onChange={(e) =>
                        handleEditFormChange("whatsapp", e.target.value)
                      }
                      variant="outlined"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={editForm.status}
                        onChange={(e) =>
                          handleEditFormChange("status", e.target.value)
                        }
                        label="Status"
                      >
                        {SUPPORT_STATUS.map((status) => (
                          <MenuItem key={status.value} value={status.value}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <status.icon sx={{ mr: 1, fontSize: 18 }} />
                              {status.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Ativo</InputLabel>
                      <Select
                        value={editForm.active}
                        onChange={(e) =>
                          handleEditFormChange("active", e.target.value)
                        }
                        label="Ativo"
                      >
                        <MenuItem value={true}>Sim</MenuItem>
                        <MenuItem value={false}>Não</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={closeEditModal} color="inherit">
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSupport}
                variant="contained"
                startIcon={selectedSupport ? <EditIcon /> : <AddIcon />}
              >
                {selectedSupport ? "Salvar" : "Adicionar"}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
}
