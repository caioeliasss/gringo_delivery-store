import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Produtos from "./pages/Produtos/Produtos";
import Pedidos from "./pages/Pedidos/pedidos";
import SuporteLogin from "./pages/Suporte/login";
import SuporteDashboard from "./pages/Suporte/dashboard";
import "./App.css";
import RegisterSupport from "./pages/Suporte/register";
import Occurrences from "./pages/Suporte/occurrences";
import ChatPage from "./pages/Suporte/chat";

// Definir tema personalizado com a paleta de cores da Gringo Delivery
const theme = createTheme({
  typography: {
    fontFamily: ["Poppins", "Roboto", "Arial", "sans-serif"].join(","),
    h1: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 700,
    },
    h2: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 700,
    },
    h3: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 600,
    },
    h4: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 600,
    },
    h5: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 500,
    },
    h6: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 500,
    },
    subtitle1: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 500,
    },
    subtitle2: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 500,
    },
    body1: {
      fontFamily: "Poppins, sans-serif",
    },
    body2: {
      fontFamily: "Poppins, sans-serif",
    },
    button: {
      fontFamily: "Poppins, sans-serif",
      fontWeight: 500,
      textTransform: "none",
    },
  },
  palette: {
    primary: {
      main: "#EB2E3E", // Vermelho Gringo
      contrastText: "#FFFFFF",
      light: "#f15a68",
      dark: "#d12535",
      lightest: "#fde8ea", // Para backgrounds suaves
    },
    secondary: {
      main: "#FBBF24", // Amarelo Gringo
      contrastText: "#FFFFFF",
      light: "#fcd04b",
      dark: "#e6ad20",
      lightest: "#fef7e6", // Para backgrounds suaves
    },
    background: {
      default: "#f5f5f5",
      paper: "#FFFFFF",
    },
    error: {
      main: "#f44336",
      light: "#f6685e",
      dark: "#d32f2f",
      lightest: "#feeaea", // Para backgrounds suaves
    },
    warning: {
      main: "#FBBF24", // Amarelo Gringo
      light: "#fcd04b",
      dark: "#e6ad20",
      lightest: "#fef7e6", // Para backgrounds suaves
    },
    info: {
      main: "#2196f3",
      light: "#4dabf5",
      dark: "#1976d2",
      lightest: "#e6f4fe", // Para backgrounds suaves
    },
    success: {
      main: "#4caf50",
      light: "#6fbf73",
      dark: "#3b873e",
      lightest: "#ebf7ec", // Para backgrounds suaves
    },
    text: {
      primary: "#333333",
      secondary: "#666666",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#d12535", // Vermelho mais escuro
          },
        },
        containedSecondary: {
          "&:hover": {
            backgroundColor: "#e6ad20", // Amarelo mais escuro
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          overflow: "hidden",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#EB2E3E",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: "#EB2E3E",
        },
        colorSecondary: {
          backgroundColor: "#FBBF24",
        },
      },
    },
  },
});

// Componente para rotas protegidas
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/produtos"
              element={
                <PrivateRoute>
                  <Produtos />
                </PrivateRoute>
              }
            />
            <Route
              path="/pedidos"
              element={
                <PrivateRoute>
                  <Pedidos />
                </PrivateRoute>
              }
            />
            <Route
              path="/suporte"
              element={
                <PrivateRoute>
                  <SuporteLogin />
                </PrivateRoute>
              }
            />
            <Route
              path="/suporte/login"
              element={
                <PrivateRoute>
                  <SuporteLogin />
                </PrivateRoute>
              }
            />
            <Route
              path="/suporte/dashboard"
              element={
                <PrivateRoute>
                  <SuporteDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/suporte/register"
              element={
                <PrivateRoute>
                  <RegisterSupport />
                </PrivateRoute>
              }
            />
            <Route
              path="/suporte/ocorrencias"
              element={
                <PrivateRoute>
                  <Occurrences />
                </PrivateRoute>
              }
            />
            <Route
              path="/suporte/chat"
              element={
                <PrivateRoute>
                  <ChatPage />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
