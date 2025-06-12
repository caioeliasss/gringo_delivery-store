import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
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
  Divider,
  Chip,
  Badge,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GoogleIcon from "@mui/icons-material/Google";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import api from "../../../services/api";

const LoginAdmin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const responseUser = await login(email, password);
      const user = responseUser.user;
      const response = await api.get(`/support/firebase/${user.uid}`);
      if (!response.data) {
        setError("Email não encontrado");
        return;
      }
      if (!response.data.active) {
        setError("Usuário pendente");
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      console.error("Erro no login:", error.message);
      setError(
        error.code === "auth/invalid-credential"
          ? "Email ou senha incorretos"
          : "Falha ao fazer login. Tente novamente."
      );
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
        {/* Logo com badge de Admin */}
        <Box sx={{ mb: 2, position: "relative" }}>
          <img
            src="https://i.imgur.com/8jOdfcO.png"
            alt="Gringo Delivery"
            style={{ height: 80 }}
          />
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              <AdminPanelSettingsIcon
                sx={{
                  fontSize: 32,
                  color: "#fff",
                  bgcolor: "primary.main",
                  borderRadius: "50%",
                  p: 0.5,
                  border: "2px solid #fff",
                }}
              />
            }
          ></Badge>
        </Box>

        {/* Área de Admin - Banner */}
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            py: 1,
            px: 3,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 3,
            boxShadow: 2,
          }}
        >
          <AdminPanelSettingsIcon />
          <Typography variant="h6" fontWeight="bold">
            Área de Administração
          </Typography>
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
            borderTop: "4px solid",
            borderColor: "primary.main",
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
            <AdminPanelSettingsIcon
              fontSize="large"
              style={{ marginTop: "4px" }}
            />
          </Box>

          <Typography component="h1" variant="h5" fontWeight="bold" mb={1}>
            Acesso à Administração
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            mb={2}
          >
            Acesse o painel para administrar o Gringo Delivery
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ width: "100%" }}>
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
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
              startIcon={!loading && <AdminPanelSettingsIcon />}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Entrar na Administração"
              )}
            </Button>
          </Box>

          <Box sx={{ mt: 2, mb: 1, width: "100%" }}>
            <Divider>
              <Chip
                label="Exclusivo para equipe de Administração"
                size="small"
                sx={{ bgcolor: "#f8f9fa" }}
              />
            </Divider>
          </Box>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2">
              Não tem uma conta?{" "}
              <MuiLink
                component={Link}
                to="/register"
                variant="body2"
                fontWeight="bold"
                color="primary"
              >
                Registre-se
              </MuiLink>
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Área restrita para membros da equipe de administração do Gringo
            Delivery
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginAdmin;
