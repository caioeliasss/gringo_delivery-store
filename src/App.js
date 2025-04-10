import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Produtos from './pages/Produtos/Produtos';
import './App.css';

// Definir tema personalizado com a paleta de cores da Gringo Delivery
const theme = createTheme({
  palette: {
    primary: {
      main: '#EB2E3E', // Vermelho Gringo
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FBBF24', // Amarelo Gringo
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#f5f5f5',
      paper: '#FFFFFF',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#FBBF24', // Amarelo Gringo
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#d12535', // Vermelho mais escuro
          },
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#e6ad20', // Amarelo mais escuro
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          overflow: 'hidden',
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
          backgroundColor: '#EB2E3E',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: '#EB2E3E',
        },
        colorSecondary: {
          backgroundColor: '#FBBF24',
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
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;