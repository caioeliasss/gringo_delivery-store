import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  Container,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Store as StoreIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import api from "../../../services/api";
import { STORE_MENU_ITEMS } from "../../../config/menuConfig";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";
import { useNavigate } from "react-router-dom";
import { UseStoreAuth } from "../../../contexts/StoreAuthContext";

const Configuracao = () => {
  const [merchantId, setMerchantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeData, setStoreData] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    StoreUser,
    logoutStore,
    loading: authLoading,
    isStoreMember,
  } = UseStoreAuth();
  const navigate = useNavigate();
  const menuItems = STORE_MENU_ITEMS;
  useEffect(() => {
    if (!authLoading && !isStoreMember) {
      console.log("Usuário não é membro da loja, redirecionando para login");
      navigate("/login");
    }
  }, [authLoading, isStoreMember, navigate]);
  // Carregar dados da loja ao montar o componente
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoadingStore(true);
        const response = await api.get("/stores/me");
        setStoreData(response.data);

        // Se já tem merchantId configurado, exibir no campo
        if (response.data.ifoodConfig?.merchantId) {
          setMerchantId(response.data.ifoodConfig.merchantId);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da loja:", error);
        setSnackbar({
          open: true,
          message: "Erro ao carregar dados da loja",
          severity: "error",
        });
      } finally {
        setLoadingStore(false);
      }
    };

    if (StoreUser && !authLoading) {
      fetchStoreData();
    }
  }, [StoreUser, authLoading]);

  // Função para salvar o merchantId
  const handleSaveMerchantId = async () => {
    if (!merchantId.trim()) {
      setSnackbar({
        open: true,
        message: "Por favor, insira um Merchant ID válido",
        severity: "warning",
      });
      return;
    }

    if (!storeData?._id) {
      setSnackbar({
        open: true,
        message: "Dados da loja não encontrados",
        severity: "error",
      });
      return;
    }

    try {
      setLoading(true);

      await api.post("/stores/sendMerchant", {
        storeId: storeData._id,
        merchantId: merchantId.trim(),
      });

      // Atualizar dados locais
      setStoreData((prev) => ({
        ...prev,
        ifoodConfig: {
          ...prev.ifoodConfig,
          merchantId: merchantId.trim(),
        },
      }));

      setSnackbar({
        open: true,
        message: "Merchant ID salvo com sucesso!",
        severity: "success",
      });
    } catch (error) {
      console.error("Erro ao salvar Merchant ID:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erro ao salvar Merchant ID",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const getMerchantStatus = () => {
    const hasMerchantId = storeData?.ifoodConfig?.merchantId;
    return {
      configured: hasMerchantId,
      icon: hasMerchantId ? (
        <CheckCircleIcon color="success" />
      ) : (
        <WarningIcon color="warning" />
      ),
      text: hasMerchantId ? "Configurado" : "Não configurado",
      color: hasMerchantId ? "success" : "warning",
    };
  };

  const merchantStatus = getMerchantStatus();

  // Mostrar loading enquanto a autenticação está sendo carregada
  if (authLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Verificando autenticação...
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Aguarde enquanto verificamos suas credenciais
          </Typography>
        </Box>
      </Container>
    );
  }

  // Verificar se é membro da loja
  if (!StoreUser || !isStoreMember) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <Typography variant="h6" color="error" gutterBottom>
            Acesso restrito a estabelecimentos
          </Typography>
          <Typography
            variant="body1"
            color="textSecondary"
            align="center"
            sx={{ mb: 2 }}
          >
            Esta página é exclusiva para estabelecimentos cadastrados.
            <br />
            Faça login com uma conta de estabelecimento válida.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/login")}
          >
            Fazer Login
          </Button>
        </Box>
      </Container>
    );
  }

  if (loadingStore) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box>
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        menuItems={menuItems}
        userInfo={{
          name: StoreUser?.displayName || "Estabelecimento",
          email: StoreUser?.email || "",
          role: "Estabelecimento",
        }}
        onLogout={logoutStore}
      />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 2 }}
        >
          <StoreIcon color="primary" sx={{ fontSize: 40 }} />
          Configurações da Loja
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Configure as integrações e parâmetros da sua loja.
        </Typography>

        {/* Card de informações da loja */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="Informações da Loja"
            subheader="Dados básicos do estabelecimento"
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Nome da Loja:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {storeData?.businessName ||
                    storeData?.displayName ||
                    "Não informado"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  CNPJ:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {storeData?.cnpj || "Não informado"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Status do CNPJ:
                </Typography>
                <Chip
                  label={storeData?.cnpj_approved ? "Aprovado" : "Pendente"}
                  color={storeData?.cnpj_approved ? "success" : "warning"}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Merchant ID Status:
                </Typography>
                <Chip
                  icon={merchantStatus.icon}
                  label={merchantStatus.text}
                  color={merchantStatus.color}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Card de configuração do iFood */}
        <Card>
          <CardHeader
            title="Integração iFood"
            subheader="Configure sua integração com o iFood"
            avatar={<InfoIcon color="primary" />}
          />
          <CardContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                O Merchant ID é necessário para integrar sua loja com o iFood.
                Você pode encontrar este ID no painel administrativo do iFood.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Merchant ID"
                placeholder="Ex: 12345678-1234-1234-1234-123456789012"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                variant="outlined"
                disabled={loading}
                helperText="Insira o Merchant ID fornecido pelo iFood"
                InputProps={{
                  startAdornment: merchantStatus.configured && (
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  ),
                }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() =>
                  setMerchantId(storeData?.ifoodConfig?.merchantId || "")
                }
                disabled={loading || !storeData?.ifoodConfig?.merchantId}
              >
                Resetar
              </Button>
              <Button
                variant="contained"
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                onClick={handleSaveMerchantId}
                disabled={loading || !merchantId.trim()}
              >
                {loading ? "Salvando..." : "Salvar Merchant ID"}
              </Button>
            </Box>

            {merchantStatus.configured && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  ✅ Merchant ID configurado com sucesso! Sua loja está pronta
                  para receber pedidos do iFood.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

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
      </Container>
    </Box>
  );
};

export default Configuracao;
