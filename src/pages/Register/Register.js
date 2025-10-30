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
import PhoneIcon from "@mui/icons-material/Phone";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import BadgeIcon from "@mui/icons-material/Badge";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import { buscarCnpj } from "../../services/cnpj";

const Register = () => {
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleCnpjChange = (e) => {
    // Aceita apenas números
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 14) {
      setCnpj(value);
    }
  };

  const formatCnpj = (value) => {
    if (!value) return "";

    // Formata o CNPJ enquanto o usuário digita (XX.XXX.XXX/XXXX-XX)
    const cnpjMask = value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");

    return cnpjMask;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const cnpjNumbers = cnpj.replace(/\D/g, "");

    if (!cnpjNumbers || !email || !password || !confirmPassword || !phone) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    if (cnpjNumbers.length !== 14) {
      setError("CNPJ inválido, o CNPJ deve ter 14 dígitos");
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
      // Registrar no Firebase
      await signup(email, password);

      // Obter a geolocalização do navegador
      let geolocation = null;

      // Função para obter a localização atual do navegador (compatível com Safari)
      const getCurrentPosition = () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            resolve(null); // Resolver com null em vez de rejeitar
            return;
          }

          const timeoutId = setTimeout(() => {
            reject(new Error("Timeout na geolocalização"));
          }, 5000);

          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutId);
              resolve(position);
            },
            (error) => {
              clearTimeout(timeoutId);
              resolve(null); // Resolver com null em caso de erro
            },
            {
              enableHighAccuracy: false, // Safari funciona melhor com false
              timeout: 10000, // Timeout maior para Safari
              maximumAge: 60000, // Cache por 1 minuto
            }
          );
        });
      };

      try {
        const position = await getCurrentPosition();
        if (position && position.coords) {
          geolocation = {
            type: "Point",
            coordinates: [
              position.coords.longitude, // Longitude primeiro
              position.coords.latitude, // Latitude depois
            ],
          };
        }
      } catch (geoError) {
        // Silencioso no Safari para evitar travamentos
        geolocation = null;
      }

      let storeAddress = null;
      let businessName = null;
      try {
        const response = await buscarCnpj(cnpjNumbers);
        if (response && response.data) {
          const data = response.data;
          businessName = data.nome_fantasia || data.razao_social || null;
          storeAddress = {
            cep: data.cep || "",
            address: data.logradouro || "",
            bairro: data.bairro || "",
            addressNumber: data.numero || "",
            cidade: data.municipio || "",
          };
        }
      } catch (error) {
        // Silencioso para compatibilidade com Safari
        storeAddress = null;
        businessName = null;
      }

      // Após registro no Firebase, criar perfil no backend com CNPJ
      try {
        console.log("📤 Enviando dados do perfil:", {
          displayName: businessName || email.split("@")[0],
          email: email,
          cnpj: cnpjNumbers,
          location: geolocation,
          address: storeAddress,
          businessName: businessName,
          phone: phone,
        });

        const response = await createUserProfile({
          displayName: businessName || email.split("@")[0], // Fallback para nome baseado no email
          email: email,
          cnpj: cnpjNumbers,
          location: geolocation,
          address: storeAddress,
          businessName: businessName,
          phone: phone,
        });

        console.log("✅ Perfil criado com sucesso:", response.data);
        navigate("/dashboard");
      } catch (profileError) {
        console.error("❌ Erro ao criar perfil:", profileError);

        // Tratamento de erro mais robusto
        let errorMessage =
          "Conta criada, mas ocorreu um erro ao salvar os dados do perfil.";

        // Verificar se há resposta do servidor
        if (profileError.response?.data?.message) {
          errorMessage = `Erro: ${profileError.response.data.message}`;
        } else if (profileError.response?.status === 409) {
          errorMessage =
            "Já existe uma conta cadastrada com este email ou CNPJ.";
        } else if (profileError.response?.status === 400) {
          errorMessage =
            "Dados inválidos. Verifique se todos os campos estão preenchidos corretamente.";
        } else if (profileError.response?.status >= 500) {
          errorMessage =
            "Erro interno do servidor. Tente novamente em alguns minutos.";
        } else if (
          profileError.name === "TypeError" &&
          profileError.message.includes("Failed to fetch")
        ) {
          errorMessage =
            "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (profileError.code === "NETWORK_ERROR") {
          errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
        }

        setError(errorMessage);
      }
    } catch (error) {
      // Tratamento de erro melhorado para Safari
      let errorMessage = "Falha ao criar conta. Tente novamente.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está em uso";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Senha muito fraca";
      } else if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage =
          "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
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
              id="cnpj"
              label="CNPJ"
              name="cnpj"
              autoComplete="cnpj"
              autoFocus
              value={formatCnpj(cnpj)}
              onChange={handleCnpjChange}
              variant="outlined"
              placeholder="XX.XXX.XXX/XXXX-XX"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="phone"
              label="Telefone"
              name="phone"
              autoComplete="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              variant="outlined"
              placeholder="(XX) XXXXX-XXXX"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="primary" />
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
                  to="/login"
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

export default Register;
