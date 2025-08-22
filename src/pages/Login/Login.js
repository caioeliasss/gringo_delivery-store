import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Divider,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GoogleIcon from "@mui/icons-material/Google";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Detectar iPhone
  useEffect(() => {
    const iPhoneDetected = /iPhone|iPod/.test(navigator.userAgent);
    setIsIPhone(iPhoneDetected);

    if (iPhoneDetected) {
      console.log("📱 iPhone detectado no Login component");

      // Debug específico para iPhone
      if (window.showDebug) {
        window.showDebug("Login component carregado no iPhone");
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    try {
      setError("");
      setMessage("");
      setLoading(true);

      // Log específico para iPhone
      if (isIPhone) {
        console.log("📱 iPhone: Iniciando login...");
        if (window.showDebug) {
          window.showDebug("Tentando fazer login...");
        }
      }

      await login(email, password);

      if (isIPhone) {
        console.log("📱 iPhone: Login bem-sucedido");
        if (window.showDebug) {
          window.showDebug("Login realizado com sucesso!");
        }
      }

      navigate("/dashboard");
    } catch (error) {
      // Log específico para iPhone
      if (isIPhone) {
        console.error("📱 iPhone Login Error:", error);
        if (window.showDebug) {
          window.showDebug(`Erro no login: ${error.code || error.message}`);
        }
      }

      // Tratamento de erro melhorado para Safari/iPhone
      let errorMessage = "Falha ao fazer login. Tente novamente.";

      if (error.code === "auth/invalid-credential") {
        errorMessage = "Email ou senha incorretos";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "Usuário não encontrado";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Senha incorreta";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "Conta desabilitada";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
      } else if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage = isIPhone
          ? "Erro de conexão no iPhone. Verifique se está conectado à internet e tente novamente."
          : "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (error.message && error.message.includes("CORS")) {
        errorMessage = isIPhone
          ? "Erro de segurança no iPhone. Tente usar HTTPS ou outro navegador."
          : "Erro de segurança. Tente recarregar a página.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setMessage("");
      setLoading(true);
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (error) {
      // Tratamento de erro melhorado para Safari
      let errorMessage = "Falha ao fazer login com Google";

      if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup bloqueado. Permita popups para este site.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Login cancelado pelo usuário";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
      } else if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage =
          "Erro de conexão. Verifique sua internet e tente novamente.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Por favor, digite seu email para recuperar a senha");
      return;
    }

    try {
      setError("");
      setMessage("");
      setLoading(true);
      await resetPassword(email);
      setMessage(
        "Email de recuperação enviado! Verifique sua caixa de entrada."
      );
      setShowPasswordReset(false);
    } catch (error) {
      // Tratamento de erro melhorado para Safari
      let errorMessage = "Falha ao enviar email de recuperação";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Email não encontrado";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
      } else if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage =
          "Erro de conexão. Verifique sua internet e tente novamente.";
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
          // CSS específico para iPhone
          ...(isIPhone && {
            minHeight: "calc(var(--vh, 1vh) * 100)",
            marginTop: 4,
          }),
        }}
      >
        {/* Logo */}
        <Box sx={{ mb: 4 }}>
          <img
            src="https://i.imgur.com/8jOdfcO.png"
            alt="Gringo Delivery"
            style={{
              height: 80,
              display: "block",
              margin: "0 auto",
            }}
            onError={(e) => {
              e.target.style.display = "none";
              console.log("Erro ao carregar logo");
              if (isIPhone && window.showDebug) {
                window.showDebug("Erro ao carregar logo do servidor");
              }
            }}
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
            <LockOutlinedIcon fontSize="large" style={{ marginTop: "4px" }} />
          </Box>

          <Typography component="h1" variant="h5" fontWeight="bold" mb={3}>
            {showPasswordReset ? "Recuperar Senha" : "Login"}
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

          {showPasswordReset ? (
            // Formulário de recuperação de senha
            <Box
              component="form"
              onSubmit={handlePasswordReset}
              sx={{ width: "100%" }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email para recuperação"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined"
                helperText="Digite o email da sua conta para receber o link de recuperação"
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
                  "Enviar Email de Recuperação"
                )}
              </Button>

              <Button
                fullWidth
                variant="text"
                sx={{ mb: 2 }}
                onClick={() => {
                  setShowPasswordReset(false);
                  setError("");
                  setMessage("");
                }}
                disabled={loading}
              >
                Voltar ao Login
              </Button>
            </Box>
          ) : (
            // Formulário de login normal
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

              {/* Link para recuperação de senha */}
              <Box sx={{ textAlign: "right", mt: 1, mb: 1 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setShowPasswordReset(true);
                    setError("");
                    setMessage("");
                  }}
                  disabled={loading}
                  sx={{ textTransform: "none", fontSize: "0.875rem", mr: 1 }}
                >
                  Esqueceu sua senha?
                </Button>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Entrar"
                )}
              </Button>

              <Divider sx={{ my: 2 }}>ou</Divider>

              {/* Botão de login com Google (comentado) */}
              {false && (
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2, py: 1.5 }}
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  Entrar com Google
                </Button>
              )}

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
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
