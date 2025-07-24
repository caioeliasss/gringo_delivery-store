// Importações necessárias
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Divider,
  IconButton,
  CircularProgress,
  Container,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  ReportProblem as ReportProblemIcon,
  Chat as ChatIcon,
  Logout as LogoutIcon,
  LocalShipping as DeliveryIcon,
  TrendingUp as TrendingUpIcon,
  Cloud as RainIcon,
  DirectionsCar as DriveBackIcon,
  Route as RouteIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import SideDrawer from "../../components/SideDrawer/SideDrawer";
import { useAuth } from "../../contexts/AuthContext";
import { getDeliveryPrice, updateDeliveryPrice } from "../../services/api";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
} from "../../config/menuConfig";
import "./Precificacao.css";

export default function PrecificacaoPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estados para gerenciar os dados de precificação
  const [deliveryPrice, setDeliveryPrice] = useState({
    fixedKm: 0,
    fixedPriceHigh: 0,
    fixedPrice: 0,
    bonusKm: 0,
    priceRain: 0,
    isRain: false,
    isHighDemand: false,
    driveBack: 0,
  });

  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchDeliveryPrice();
  }, []);

  const fetchDeliveryPrice = async () => {
    try {
      setLoading(true);
      const response = await getDeliveryPrice();
      const data = response.data || {};

      setDeliveryPrice({
        fixedKm: data.fixedKm || 0,
        fixedPriceHigh: data.fixedPriceHigh || 0,
        fixedPrice: data.fixedPrice || 0,
        bonusKm: data.bonusKm || 0,
        priceRain: data.priceRain || 0,
        isRain: data.isRain || false,
        isHighDemand: data.isHighDemand || false,
        driveBack: data.driveBack || 0,
      });

      setOriginalData(data);
    } catch (error) {
      console.error("Erro ao buscar dados de precificação:", error);
      showSnackbar("Erro ao carregar dados de precificação", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setDeliveryPrice((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSwitchChange = (field, checked) => {
    setDeliveryPrice((prev) => ({
      ...prev,
      [field]: checked,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateDeliveryPrice(deliveryPrice);
      setOriginalData(deliveryPrice);
      setEditMode(false);
      showSnackbar(
        "Configurações de precificação salvas com sucesso!",
        "success"
      );
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      showSnackbar("Erro ao salvar configurações", "error");
    } finally {
      setSaving(false);
      setConfirmDialog(false);
    }
  };

  const handleCancel = () => {
    setDeliveryPrice(originalData);
    setEditMode(false);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  // Usar configuração centralizada de menu
  const menuItems = SUPPORT_MENU_ITEMS;
  const footerItems = createSupportFooterItems(handleLogout);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#f5f5f5"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Drawer lateral */}
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        menuItems={menuItems}
        footerItems={footerItems}
        userInfo={{
          name: user?.displayName || user?.email || "Usuário",
          email: user?.email || "",
          avatar: user?.photoURL,
        }}
      />

      <Box component="main" sx={{ flexGrow: 1 }}>
        {/* App Bar */}
        <AppBar position="static" sx={{ bgcolor: "#1976d2" }}></AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {/* Header da página */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography variant="h4" gutterBottom>
                  Configurações de Precificação
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Gerencie os valores e regras de precificação para as entregas
                </Typography>
              </Box>
              <Box>
                {!editMode ? (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                    sx={{ mr: 1 }}
                  >
                    Editar
                  </Button>
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={() => setConfirmDialog(true)}
                      disabled={saving}
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                  </Stack>
                )}
              </Box>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            {/* Card de Preços Base */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <MoneyIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6">Preços Base</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={3}>
                    <TextField
                      label="Preço Fixo (R$)"
                      type="number"
                      value={deliveryPrice.fixedPrice}
                      onChange={(e) =>
                        handleInputChange(
                          "fixedPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={!editMode}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>R$</Typography>
                        ),
                      }}
                      helperText="Valor base da entrega"
                    />

                    <TextField
                      label="Preço por KM Fixo (R$)"
                      type="number"
                      value={deliveryPrice.fixedKm}
                      onChange={(e) =>
                        handleInputChange(
                          "fixedKm",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={!editMode}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>R$</Typography>
                        ),
                      }}
                      helperText="Valor cobrado por quilômetro"
                    />

                    <TextField
                      label="Preço Fixo Alta Demanda (R$)"
                      type="number"
                      value={deliveryPrice.fixedPriceHigh}
                      onChange={(e) =>
                        handleInputChange(
                          "fixedPriceHigh",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={!editMode}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>R$</Typography>
                        ),
                      }}
                      helperText="Preço fixo em períodos de alta demanda"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Card de Preços Especiais */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TrendingUpIcon sx={{ mr: 1, color: "secondary.main" }} />
                    <Typography variant="h6">Preços Especiais</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={3}>
                    <TextField
                      label="Bônus por KM (R$)"
                      type="number"
                      value={deliveryPrice.bonusKm}
                      onChange={(e) =>
                        handleInputChange(
                          "bonusKm",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={!editMode}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>R$</Typography>
                        ),
                      }}
                      helperText="Bônus adicional por quilômetro"
                    />

                    <TextField
                      label="Preço Chuva (R$)"
                      type="number"
                      value={deliveryPrice.priceRain}
                      onChange={(e) =>
                        handleInputChange(
                          "priceRain",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={!editMode}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>R$</Typography>
                        ),
                      }}
                      helperText="Valor adicional em dias de chuva"
                    />

                    <TextField
                      label="Volta Dirigindo (R$)"
                      type="number"
                      value={deliveryPrice.driveBack}
                      onChange={(e) =>
                        handleInputChange(
                          "driveBack",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={!editMode}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>R$</Typography>
                        ),
                      }}
                      helperText="Valor para volta dirigindo"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Card de Configurações */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <RouteIcon sx={{ mr: 1, color: "info.main" }} />
                    <Typography variant="h6">
                      Configurações Especiais
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={deliveryPrice.isRain}
                            onChange={(e) =>
                              handleSwitchChange("isRain", e.target.checked)
                            }
                            disabled={!editMode}
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center">
                            <RainIcon sx={{ mr: 1 }} />
                            Modo Chuva Ativo
                          </Box>
                        }
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Ativa a cobrança adicional por chuva
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={deliveryPrice.isHighDemand}
                            onChange={(e) =>
                              handleSwitchChange(
                                "isHighDemand",
                                e.target.checked
                              )
                            }
                            disabled={!editMode}
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center">
                            <TrendingUpIcon sx={{ mr: 1 }} />
                            Alta Demanda Ativa
                          </Box>
                        }
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Ativa o preço de alta demanda
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Card de Resumo */}
            <Grid item xs={12}>
              <Card sx={{ bgcolor: "grey.50" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resumo da Configuração Atual
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: "center" }}>
                        <Typography variant="h4" color="primary">
                          {formatCurrency(deliveryPrice.fixedPrice)}
                        </Typography>
                        <Typography variant="caption">Preço Base</Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: "center" }}>
                        <Typography variant="h4" color="secondary">
                          {formatCurrency(deliveryPrice.fixedKm)}
                        </Typography>
                        <Typography variant="caption">Por KM</Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: "center" }}>
                        <Typography variant="h4" color="warning.main">
                          {formatCurrency(deliveryPrice.priceRain)}
                        </Typography>
                        <Typography variant="caption">Chuva</Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: "center" }}>
                        <Typography variant="h4" color="success.main">
                          {formatCurrency(deliveryPrice.bonusKm)}
                        </Typography>
                        <Typography variant="caption">Bônus/KM</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirmar Alterações</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja salvar as alterações na precificação?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
