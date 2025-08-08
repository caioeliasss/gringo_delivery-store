import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Link as MuiLink,
  Alert,
  CircularProgress,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Por favor, digite seu email");
      return;
    }

    try {
      setError("");
      setMessage("");
      setLoading(true);
      await resetPassword(email);
      setMessage(
        "Email de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam."
      );
    } catch (error) {
      console.error("Erro ao enviar email de recuperação:", error.message);
      let errorMessage = "Falha ao enviar email de recuperação";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Nenhuma conta encontrada com este email";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        {/* Logo */}
        <Box sx={{ mb: 4 }}>
          <img
            src="https://i.imgur.com/8jOdfcO.png"
            alt="Gringo Delivery"
            style={{ height: 80 }}
          />
        </Box>

        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: 400,
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: "primary.main",
              borderRadius: "100%",
              p: 1,
              mb: 2,
              color: "white",
            }}
          >
            <EmailIcon fontSize="large" style={{ marginTop: "4px" }} />
          </Box>

          <Typography
            component="h1"
            variant="h5"
            fontWeight="bold"
            mb={2}
            textAlign="center"
          >
            Recuperar Senha
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            mb={3}
            textAlign="center"
          >
            Digite seu email para receber um link de recuperação de senha
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleResetPassword}
            sx={{ width: "100%" }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              placeholder="exemplo@email.com"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Enviar Link de Recuperação"
              )}
            </Button>

            <Box sx={{ mt: 2, textAlign: "center" }}>
              <MuiLink
                component={Link}
                to="/login"
                variant="body2"
                fontWeight="bold"
                color="primary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 18, mr: 1 }} />
                Voltar ao Login
              </MuiLink>
            </Box>

            {message && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: "grey.50",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  <strong>Não recebeu o email?</strong>
                  <br />
                  • Verifique sua caixa de spam
                  <br />
                  • Aguarde alguns minutos
                  <br />• Certifique-se de que o email está correto
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
