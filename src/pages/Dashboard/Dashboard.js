import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile } from '../../services/api';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await getUserProfile();
        setUserProfile(response.data);
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: 250,
          flexShrink: 0,
          bgcolor: 'primary.main',
          color: 'white',
          boxShadow: 3
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Minha Loja
          </Typography>
        </Box>
        <Divider sx={{ bgcolor: 'primary.light' }} />
        <List component="nav">
          <ListItem 
            style={{color:"white"}}
            button 
            component={Link} 
            to="/dashboard" 
            selected={true}
            sx={{ 
              '&.Mui-selected': { 
                bgcolor: 'primary.dark',
                '&:hover': { bgcolor: 'primary.dark' } 
              },
              '&:hover': { bgcolor: 'primary.light' }
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem 
            style={{color:"white"}}
            button 
            component={Link} 
            to="/produtos"
            sx={{ '&:hover': { bgcolor: 'primary.light' } }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <ProductsIcon />
            </ListItemIcon>
            <ListItemText primary="Produtos" />
          </ListItem>
        </List>
        <Box sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
          <Divider sx={{ bgcolor: 'primary.light' }} />
          <ListItem 
            button 
            onClick={handleLogout}
            sx={{ '&:hover': { bgcolor: 'primary.light' } }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sair" />
          </ListItem>
        </Box>
      </Box>
      
      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Container maxWidth="md">
          <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
            Dashboard
          </Typography>
          
          <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              {userProfile?.photoURL ? (
                <Avatar 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName || currentUser?.email}
                  sx={{ width: 80, height: 80, mr: 3 }}
                />
              ) : (
                <Avatar 
                  sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
                >
                  {(userProfile?.displayName || currentUser?.email || '?').charAt(0).toUpperCase()}
                </Avatar>
              )}
              <Box>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                  Bem-vindo, {userProfile?.displayName || currentUser?.email}!
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mr: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Email:
                  </Typography>
                  <Typography variant="body1">
                    {currentUser?.email}
                  </Typography>
                </Box>
              </Grid>
              
              {userProfile?.cnpj && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mr: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      CNPJ:
                    </Typography>
                    <Typography variant="body1">
                      {userProfile.cnpj}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                  <Box sx={{ mr: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Cadastro Aprovado:
                    </Typography>
                    <Typography variant="body1" 
                      color={userProfile.cnpj_approved ? "success" : "error"} >
                      {userProfile.cnpj_approved ? "Aprovado" : "Pendente"}
                    </Typography>
                  </Box>
                </Grid>
            </Grid>
          </Paper>
          
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
              Acesso Rápido
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Button 
                  variant="outlined" 
                  component={Link}
                  to="/produtos"
                  startIcon={<ProductsIcon />}
                  fullWidth
                  sx={{ p: 2, height: '100%' }}
                >
                  Gerenciar Produtos
                </Button>
              </Grid>
              {/* Adicione outros botões de acesso rápido conforme necessário */}
            </Grid>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;