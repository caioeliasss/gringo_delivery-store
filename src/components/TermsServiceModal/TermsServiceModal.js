import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Link,
} from "@mui/material";
import {
  Close as CloseIcon,
  Article as ArticleIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getUserProfile } from "../../services/api";

const TermsServiceModal = ({ open, onClose, onAccept, userType = "store" }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!open) return;

      try {
        setLoading(true);
        if (currentUser) {
          const response = await getUserProfile();
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        setError("Não foi possível carregar os dados do usuário");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, open]);

  const handleAccept = async () => {
    if (!agreed) {
      setError("Você deve concordar com os termos para continuar");
      return;
    }

    setAccepting(true);
    try {
      await onAccept();
      handleClose();
    } catch (error) {
      console.error("Erro ao aceitar termos:", error);
      setError("Erro ao processar a aceitação dos termos");
    } finally {
      setAccepting(false);
    }
  };

  const handleClose = () => {
    setAgreed(false);
    setError(null);
    onClose();
  };

  const openTermsPage = () => {
    const url = `/termos/${userType}`;
    window.open(url, "_blank");
  };

  const getUserDisplayName = () => {
    if (!userProfile) return "Usuário";

    if (userType === "driver") {
      return userProfile.name || "Motoboy";
    } else {
      return (
        userProfile.businessName || userProfile.displayName || "Estabelecimento"
      );
    }
  };

  const getModalTitle = () => {
    if (userType === "driver") {
      return "Termos de Uso - Motoboy";
    } else {
      return "Contrato de Prestação de Serviços";
    }
  };

  const getWelcomeText = () => {
    if (userType === "driver") {
      return "Para utilizar a plataforma Gringo Delivery como motoboy, você precisa aceitar nossos Termos de Uso.";
    } else {
      return "Para utilizar a plataforma Gringo Delivery como estabelecimento, você precisa aceitar nosso Contrato de Prestação de Serviços.";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ArticleIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold">
            {getModalTitle()}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Mensagem de boas-vindas */}
            <Box sx={{ mb: 3, textAlign: "center" }}>
              <CheckCircleIcon
                sx={{ fontSize: 60, color: "success.main", mb: 2 }}
              />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
                Bem-vindo(a), {getUserDisplayName()}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {getWelcomeText()}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Informações do usuário */}
            {userProfile && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  Suas Informações
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "grey.100",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "grey.300",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 1,
                    }}
                  >
                    {userType === "driver" ? (
                      <>
                        <Typography variant="body2">
                          <strong>Nome:</strong>{" "}
                          {userProfile.name || "Não informado"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>CPF:</strong>{" "}
                          {userProfile.cpf || "Não informado"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Email:</strong>{" "}
                          {userProfile.email || "Não informado"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Telefone:</strong>{" "}
                          {userProfile.phoneNumber || "Não informado"}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2">
                          <strong>Estabelecimento:</strong>{" "}
                          {userProfile.businessName ||
                            userProfile.displayName ||
                            "Não informado"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>CNPJ:</strong>{" "}
                          {userProfile.cnpj || "Não informado"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Email:</strong>{" "}
                          {userProfile.email || "Não informado"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Telefone:</strong>{" "}
                          {userProfile.phone || "Não informado"}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            {/* Resumo dos termos */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
                Resumo dos Principais Pontos
              </Typography>
              <Box sx={{ pl: 2 }}>
                {userType === "driver" ? (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Relação:</strong> Prestação de serviço autônoma,
                      sem vínculo empregatício
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Responsabilidade:</strong> Você é responsável
                      pelas entregas realizadas
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Liberdade:</strong> Pode aceitar ou recusar
                      qualquer solicitação
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Dados:</strong> Seus dados pessoais serão
                      protegidos conforme LGPD
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Cancelamentos:</strong> Cancelamentos excessivos
                      podem resultar em advertências
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Valor mensal:</strong> R${" "}
                      {userProfile?.billingOptions?.monthlyFee.toFixed(2) ||
                        "não informado"}{" "}
                      (pago todo dia 05)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Taxa por entrega:</strong> R${" "}
                      {userProfile?.billingOptions?.motoBoyFee.toFixed(2) ||
                        "não informado"}{" "}
                      por acionamento de motoboy
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Prazo:</strong> Contrato por prazo indeterminado
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Rescisão:</strong> 30 dias de aviso prévio
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • <strong>Confidencialidade:</strong> Informações
                      protegidas por acordo de NDA
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            {/* Link para termos completos */}
            <Box sx={{ mb: 3, textAlign: "center" }}>
              <Link
                component="button"
                variant="body1"
                onClick={openTermsPage}
                sx={{ textDecoration: "underline" }}
              >
                📄 Clique aqui para ler os termos completos em uma nova aba
              </Link>
            </Box>

            {/* Checkbox de concordância */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    Eu li, compreendi e concordo com os{" "}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={openTermsPage}
                      sx={{ textDecoration: "underline" }}
                    >
                      {userType === "driver"
                        ? "Termos de Uso"
                        : "Termos do Contrato"}
                    </Link>{" "}
                    da Gringo Delivery.
                  </Typography>
                }
              />
            </Box>

            {/* Mensagem de erro */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={handleAccept}
          variant="contained"
          disabled={!agreed || accepting || loading}
          startIcon={
            accepting ? <CircularProgress size={20} /> : <CheckCircleIcon />
          }
        >
          {accepting ? "Processando..." : "Aceitar e Continuar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsServiceModal;
