import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Grid,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Warning as WarningIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Payment as PaymentIcon,
  Schedule as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime as ClockIcon,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import api, { getUserProfile } from "../services/api";

const OverdueBillings = () => {
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchBillings();
  }, []);

  const fetchBillings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar perfil do usuário para pegar storeId
      const userProfile = await getUserProfile();

      if (!userProfile?.data?._id) {
        throw new Error("Perfil do usuário não encontrado");
      }

      const storeId = userProfile.data._id;
      console.log("📋 Buscando faturas para loja:", storeId);

      // ✅ SOLUÇÃO SIMPLES: Usar apenas o api configurado, sem axios direto
      let overdueBillings = [];
      let pendingBillings = [];

      try {
        console.log("📞 Buscando faturas vencidas...");
        const overdueResponse = await api.get(`/billing/overdue/${storeId}`);
        overdueBillings = Array.isArray(overdueResponse.data)
          ? overdueResponse.data
          : [];
        console.log("✅ Faturas vencidas:", overdueBillings.length);
      } catch (overdueError) {
        console.warn(
          "⚠️ Erro faturas vencidas:",
          overdueError.response?.status || overdueError.message
        );
      }

      try {
        console.log("📞 Buscando faturas pendentes...");
        const pendingResponse = await api.get(`/billing/pending/${storeId}`);
        pendingBillings = Array.isArray(pendingResponse.data)
          ? pendingResponse.data
          : [];
        console.log("✅ Faturas pendentes:", pendingBillings.length);
      } catch (pendingError) {
        console.warn(
          "⚠️ Erro faturas pendentes:",
          pendingError.response?.status || pendingError.message
        );
      }

      setBillings({
        overdue: overdueBillings,
        pending: pendingBillings,
        all: [...overdueBillings, ...pendingBillings],
      });

      console.log("✅ Billings carregadas:", {
        overdue: overdueBillings.length,
        pending: pendingBillings.length,
        total: overdueBillings.length + pendingBillings.length,
      });
    } catch (error) {
      console.error("❌ Erro geral ao carregar faturas:", error);

      let errorMessage = "Erro ao carregar faturas";

      if (error.message?.includes("Perfil do usuário")) {
        errorMessage = "Erro ao identificar a loja. Faça login novamente.";
      } else if (error.response?.status === 401) {
        errorMessage = "Não autorizado. Faça login novamente.";
      } else if (error.response?.status === 404) {
        errorMessage = "Serviço de faturamento não encontrado.";
      } else if (error.response?.status === 500) {
        errorMessage = "Erro interno do servidor.";
      } else {
        errorMessage = error.message || "Erro desconhecido ao carregar faturas";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCode = async (billing) => {
    try {
      setQrCodeLoading(true);
      setSelectedBilling(billing);
      setQrCodeDialog(true);

      const response = await api.get(
        `/billing/qrcode/${billing.asaasInvoiceId || billing._id}`
      );
      if (!response.data) {
        throw new Error("QR Code inválido ou não encontrado");
      }

      setQrCodeData(response.data.asaasInvoice);
    } catch (error) {
      console.error("❌ Erro ao gerar QR Code:", error);
      setError("Erro ao gerar QR Code PIX");
    } finally {
      setQrCodeLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const calculateDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusInfo = (billing) => {
    const isOverdue = new Date(billing.dueDate) < new Date();

    if (isOverdue) {
      return {
        status: "overdue",
        label: "Vencida",
        color: "error",
        days: calculateDaysOverdue(billing.dueDate),
        message: `${calculateDaysOverdue(billing.dueDate)} dias em atraso`,
      };
    } else {
      const daysUntilDue = getDaysUntilDue(billing.dueDate);
      return {
        status: "pending",
        label: "Pendente",
        color: daysUntilDue <= 3 ? "warning" : "info",
        days: daysUntilDue,
        message:
          daysUntilDue > 0 ? `Vence em ${daysUntilDue} dias` : "Vence hoje",
      };
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const closeQRCodeDialog = () => {
    setQrCodeDialog(false);
    setSelectedBilling(null);
    setQrCodeData(null);
  };

  // ✅ NOVO: Componente para renderizar cada billing
  const BillingCard = ({ billing, isOverdue = false }) => {
    const statusInfo = getStatusInfo(billing);

    return (
      <Card
        elevation={2}
        sx={{
          border: "1px solid",
          borderColor: isOverdue ? "error.main" : "warning.main",
          "&:hover": { boxShadow: 4 },
          mb: 2,
        }}
      >
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                {billing.description || "Fatura Mensal"}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Valor
                  </Typography>
                  <Typography
                    variant="h6"
                    color="primary.main"
                    fontWeight="bold"
                  >
                    {formatCurrency(billing.amount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Vencimento
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(billing.dueDate)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    {isOverdue ? "Dias em Atraso" : "Status"}
                  </Typography>
                  <Chip
                    label={statusInfo.message}
                    color={statusInfo.color}
                    size="small"
                    icon={
                      isOverdue ? (
                        <WarningIcon fontSize="small" />
                      ) : (
                        <ClockIcon fontSize="small" />
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo
                  </Typography>
                  <Typography variant="body1">
                    {billing.type === "SUBSCRIPTION"
                      ? "Assinatura"
                      : billing.type === "MOTOBOY_FEE"
                      ? "Taxa Motoboy"
                      : "Outros"}
                  </Typography>
                </Grid>
              </Grid>

              {isOverdue && billing.interest && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Juros acumulados:</strong>{" "}
                    {formatCurrency(billing.interest)}
                  </Typography>
                </Alert>
              )}
            </Box>

            <Box ml={2}>
              <Button
                variant="contained"
                startIcon={<QrCodeIcon />}
                onClick={() => handleGenerateQRCode(billing)}
                size="small"
                color={isOverdue ? "error" : "primary"}
              >
                Gerar PIX
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={fetchBillings}>
            Tentar Novamente
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const overdueBillings = billings.overdue || [];
  const pendingBillings = billings.pending || [];
  const totalBillings = overdueBillings.length + pendingBillings.length;

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center">
          <PaymentIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="h2" fontWeight="bold">
            Faturas
          </Typography>
          {totalBillings > 0 && (
            <Chip
              label={`${totalBillings} total`}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>
        <Tooltip title="Atualizar">
          <IconButton onClick={fetchBillings} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {totalBillings === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <PaymentIcon sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
          <Typography variant="h6" color="success.main" gutterBottom>
            Parabéns! Nenhuma fatura pendente
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Todas as suas faturas estão em dia.
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* ✅ NOVO: Seção de Faturas Vencidas */}
          {overdueBillings.length > 0 && (
            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" width="100%">
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="error.main" fontWeight="bold">
                    Faturas Vencidas
                  </Typography>
                  <Badge
                    badgeContent={overdueBillings.length}
                    color="error"
                    sx={{ ml: 2 }}
                  >
                    <Box />
                  </Badge>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Atenção!</strong> Você possui{" "}
                    {overdueBillings.length} fatura
                    {overdueBillings.length > 1 ? "s" : ""} vencida
                    {overdueBillings.length > 1 ? "s" : ""}. Quite o quanto
                    antes para evitar juros e possível suspensão do serviço.
                  </Typography>
                </Alert>
                {overdueBillings.map((billing) => (
                  <BillingCard
                    key={billing._id}
                    billing={billing}
                    isOverdue={true}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {/* ✅ NOVO: Seção de Faturas Pendentes */}
          {pendingBillings.length > 0 && (
            <Accordion defaultExpanded={overdueBillings.length === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" width="100%">
                  <PendingIcon color="warning" sx={{ mr: 1 }} />
                  <Typography
                    variant="h6"
                    color="warning.main"
                    fontWeight="bold"
                  >
                    Faturas Pendentes
                  </Typography>
                  <Badge
                    badgeContent={pendingBillings.length}
                    color="warning"
                    sx={{ ml: 2 }}
                  >
                    <Box />
                  </Badge>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Você possui {pendingBillings.length} fatura
                    {pendingBillings.length > 1 ? "s" : ""} pendente
                    {pendingBillings.length > 1 ? "s" : ""} de pagamento.
                  </Typography>
                </Alert>
                {pendingBillings.map((billing) => (
                  <BillingCard
                    key={billing._id}
                    billing={billing}
                    isOverdue={false}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {/* Dialog QR Code - Mantém o mesmo */}
      <Dialog
        open={qrCodeDialog}
        onClose={closeQRCodeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <QrCodeIcon sx={{ mr: 1 }} />
            Pagamento via PIX
          </Box>
        </DialogTitle>

        <DialogContent>
          {selectedBilling && (
            <Box>
              <Box mb={3}>
                <Typography variant="body2" color="text.secondary">
                  Fatura
                </Typography>
                <Typography variant="h6">
                  {selectedBilling.description || "Fatura Mensal"}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Valor
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {formatCurrency(selectedBilling.amount)}
                </Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {qrCodeLoading ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight={200}
                >
                  <CircularProgress />
                </Box>
              ) : qrCodeData ? (
                <Box>
                  <Box display="flex" justifyContent="center" mb={3}>
                    <QRCodeSVG
                      value={qrCodeData.payload || qrCodeData.encodedImage}
                      size={200}
                      level="L"
                    />
                  </Box>

                  {qrCodeData.payload && (
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Código PIX Copia e Cola:
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: "grey.50",
                          wordBreak: "break-all",
                          maxHeight: 100,
                          overflow: "auto",
                        }}
                      >
                        <Typography variant="body2" fontFamily="monospace">
                          {qrCodeData.payload}
                        </Typography>
                        <Box display="flex" justifyContent="flex-end" mt={1}>
                          <Tooltip title="Copiar código">
                            <IconButton
                              size="small"
                              onClick={() =>
                                copyToClipboard(qrCodeData.payload)
                              }
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Box>
                  )}

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Aponte a câmera do seu celular para o QR Code ou copie e
                      cole o código PIX no seu aplicativo bancário.
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Alert severity="error">
                  Erro ao gerar QR Code. Tente novamente.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeQRCodeDialog}>Fechar</Button>
          {qrCodeData?.payload && (
            <Button
              variant="contained"
              startIcon={<CopyIcon />}
              onClick={() => copyToClipboard(qrCodeData.payload)}
            >
              Copiar Código
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OverdueBillings;
