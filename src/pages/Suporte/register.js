import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { createUserProfile } from "../../services/api";
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
  InputAdornment,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import BadgeIcon from "@mui/icons-material/Badge";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import { buscarCnpj } from "../../services/cnpj";
import api from "../../services/api";
import PersonIcon from "@mui/icons-material/Person";

const RegisterSupport = () => {
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, login } = useAuth();
  const [nome, setNome] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      setError("");
      setLoading(true);

      let user = await login(email, password);
      if (!user) {
        user = await signup(email, password);
      }

      try {
        await api.post("/support", {
          email: email,
          name: nome,
          phone: phone,
          firebaseUid: user.user.uid,
        });
        navigate("/suporte/login");
      } catch (profileError) {
        console.error("Erro ao criar perfil:", profileError);
        setError(
          "Conta criada, mas ocorreu um erro ao salvar os dados do perfil."
        );
      }
    } catch (error) {
      console.error("Erro no registro:", error.message);

      let errorMessage = "Falha ao criar conta. Tente novamente.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está em uso";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
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
            maxWidth: 450,
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
            <PersonAddIcon fontSize="large" style={{ marginTop: "4px" }} />
          </Box>

          <Typography component="h1" variant="h5" fontWeight="bold" mb={3}>
            Criar Conta
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleRegister}
            sx={{ width: "100%" }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Nome"
              name="nome"
              autoComplete="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="phone"
              label="Celular"
              name="phone"
              autoComplete="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Senha"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
              }}
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
                "Criar Conta"
              )}
            </Button>

            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="body2">
                Já possui uma conta?{" "}
                <MuiLink
                  component={Link}
                  to="/suporte/login"
                  variant="body2"
                  fontWeight="bold"
                  color="primary"
                >
                  Faça login
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterSupport;
