import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Avatar,
  Card,
  CardContent,
  Divider,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Payment as PaymentIcon,
  Block as BlockIcon,
  Receipt as ReceiptIcon,
  QrCode as QrCodeIcon,
  CopyAll as CopyIcon,
} from "@mui/icons-material";
import { UseStoreAuth } from "../../../contexts/StoreAuthContext";
import api from "../../../services/api";
import { QRCodeSVG } from "qrcode.react";

export default function LiberacaoFinanceiro() {
  const { StoreUser } = UseStoreAuth();
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);

  useEffect(() => {
    if (StoreUser?._id) {
      fetchOverdueInvoices();
    }
  }, [StoreUser]);

  const fetchOverdueInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/billing/overdue/${StoreUser._id}`);
      setOverdueInvoices(response.data);
    } catch (error) {
      console.error("Erro ao buscar faturas vencidas:", error);
      setError("Erro ao carregar informações financeiras");
    } finally {
      setLoading(false);
    }
  };
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };
  const handleContactSupport = () => {
    window.open("mailto:financeirogringodelivery@gmail.com", "_blank");
  };

  const handleGenerateQRCode = async (billing) => {
    try {
      setQrCodeLoading(true);
      setSelectedBilling(billing);
      setQrCodeDialog(true);

      const response = await api.get(
        `/billing/qrcode/${billing.asaasInvoiceId}`
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

  const getTotalOverdue = () => {
    return overdueInvoices.reduce(
      (total, invoice) => total + invoice.amount,
      0
    );
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <Container
      maxWidth="lg"
      sx={{ py: 4, minHeight: "100vh", display: "flex", alignItems: "center" }}
    >
      <Box sx={{ width: "100%" }}>
        {/* Header com ícone e título */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "error.main",
              mx: "auto",
              mb: 2,
            }}
          >
            <BlockIcon fontSize="large" />
          </Avatar>

          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            color="text.primary"
          >
            Acesso Suspenso
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Pendências Financeiras Identificadas
          </Typography>

          <Chip
            icon={<WarningIcon />}
            label="Contas em Atraso"
            color="error"
            variant="outlined"
            size="large"
          />
        </Box>

        {/* Alert principal */}
        <Alert
          severity="error"
          sx={{ mb: 3, fontSize: "1.1rem" }}
          icon={<CreditCardIcon />}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            Seu acesso à plataforma foi suspenso temporariamente
          </Typography>
          <Typography variant="body1">
            Existem faturas em aberto que precisam ser quitadas para reativar
            seu estabelecimento.
          </Typography>
        </Alert>

        {/* Card principal com informações */}
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary">
              <BusinessIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Situação Financeira -{" "}
              {StoreUser?.businessName || "Seu Estabelecimento"}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Para manter seu estabelecimento ativo na plataforma Gringo
              Delivery, é necessário manter as mensalidades em dia. Regularize
              sua situação para voltar a receber pedidos.
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Resumo financeiro */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom color="error">
                <PaymentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Resumo das Pendências
              </Typography>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <Box>
                  <Typography variant="h4" color="error.main" sx={{ mb: 2 }}>
                    Total em Atraso: {formatCurrency(getTotalOverdue())}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {overdueInvoices.length} fatura(s) vencida(s)
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Lista de etapas para regularização */}
            <Typography variant="h6" gutterBottom>
              Como Regularizar:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <ReceiptIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="1. Verificar Faturas em Aberto"
                  secondary="Confira abaixo todas as faturas que estão em atraso"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <PaymentIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="2. Efetuar o Pagamento"
                  secondary="Realize o pagamento via PIX, boleto ou cartão de crédito"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="3. Aguardar Confirmação"
                  secondary="Após o pagamento, aguarde até 24h para reativação automática"
                />
              </ListItem>
            </List>
          </CardContent>
        </Paper>

        {/* Tabela de faturas vencidas */}
        {!loading && overdueInvoices.length > 0 && (
          <Paper elevation={2} sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="error">
                Faturas em Atraso
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Descrição</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Vencimento</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Valor</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Ações</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overdueInvoices.map((invoice) => (
                      <TableRow key={invoice._id}>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="error.main"
                            fontWeight="bold"
                          >
                            {formatCurrency(invoice.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label="Vencida" color="error" size="small" />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleGenerateQRCode(invoice)}
                          >
                            Ver Fatura
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        )}

        {/* Card com informações importantes */}
        <Card sx={{ mb: 3, bgcolor: "warning.light" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <WarningIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Importante
            </Typography>
            <Typography variant="body1">
              • Seu estabelecimento permanecerá <strong>invisível</strong> para
              clientes até a regularização
              <br />
              • Pedidos em andamento não serão afetados
              <br />• Após o pagamento, a reativação é{" "}
              <strong>automática em até 24 horas</strong>
              <br />• Em caso de dúvidas, entre em contato com nosso suporte
              financeiro
            </Typography>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<EmailIcon />}
            onClick={handleContactSupport}
            sx={{ minWidth: 200 }}
          >
            Contatar Financeiro
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={refreshPage}
            sx={{ minWidth: 200 }}
          >
            Verificar Status
          </Button>
        </Box>

        {/* Footer com informações de contato */}
        <Box sx={{ mt: 4, textAlign: "center", opacity: 0.8 }}>
          <Typography variant="body2" color="text.secondary">
            Dúvidas sobre pagamentos? Entre em contato:
          </Typography>
          <Box
            sx={{
              mt: 1,
              display: "flex",
              justifyContent: "center",
              gap: 3,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EmailIcon fontSize="small" />
              <Typography variant="body2">
                financeirogringodelivery@gmail.com
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PhoneIcon fontSize="small" />
              <Typography variant="body2">19 99396-4997</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
      <Dialog
        open={qrCodeDialog}
        onClose={() => setQrCodeDialog(false)}
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
          <Button onClick={() => setQrCodeDialog(false)}>Fechar</Button>
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
    </Container>
  );
}
