import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Paper, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Receipt as OrdersIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Clear as ClearIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Schedule as ScheduleIcon,
  LocalShipping as DeliveryIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';

// Mock de dados para simular pedidos
// Isto seria substituído pela integração real com a API de pedidos
const mockPedidos = [
  {
    id: "pd001",
    cliente: "João Silva",
    telefone: "(11) 98765-4321",
    endereco: "Rua das Flores, 123 - São Paulo",
    itens: [
      { nome: "Pizza Grande", quantidade: 1, preco: 45.90 },
      { nome: "Refrigerante 2L", quantidade: 1, preco: 12.00 }
    ],
    status: "pendente",
    total: 57.90,
    data: "2025-04-10T14:30:00",
    pagamento: "dinheiro",
    troco: 2.10,
    observacoes: "Sem cebola na pizza, por favor"
  },
  {
    id: "pd002",
    cliente: "Maria Oliveira",
    telefone: "(11) 91234-5678",
    endereco: "Av. Paulista, 1500 - São Paulo",
    itens: [
      { nome: "Hambúrguer Artesanal", quantidade: 2, preco: 32.90 },
      { nome: "Batata Frita G", quantidade: 1, preco: 18.90 }
    ],
    status: "em_preparo",
    total: 84.70,
    data: "2025-04-10T15:15:00",
    pagamento: "cartao",
    troco: 0,
    observacoes: ""
  },
  {
    id: "pd003",
    cliente: "Pedro Santos",
    telefone: "(11) 99876-5432",
    endereco: "Rua Augusta, 789 - São Paulo",
    itens: [
      { nome: "Macarrão à Carbonara", quantidade: 1, preco: 38.50 },
      { nome: "Água Mineral", quantidade: 1, preco: 5.00 }
    ],
    status: "em_entrega",
    total: 43.50,
    data: "2025-04-10T13:00:00",
    pagamento: "pix",
    troco: 0,
    observacoes: "Entregar na portaria"
  },
  {
    id: "pd004",
    cliente: "Ana Souza",
    telefone: "(11) 97654-3210",
    endereco: "Rua Oscar Freire, 500 - São Paulo",
    itens: [
      { nome: "Salada Caesar", quantidade: 1, preco: 29.90 },
      { nome: "Suco Natural", quantidade: 1, preco: 10.00 }
    ],
    status: "entregue",
    total: 39.90,
    data: "2025-04-10T12:30:00",
    pagamento: "cartao",
    troco: 0,
    observacoes: ""
  },
  {
    id: "pd005",
    cliente: "Carlos Pereira",
    telefone: "(11) 96543-2109",
    endereco: "Alameda Santos, 45 - São Paulo",
    itens: [
      { nome: "Pizza Média", quantidade: 1, preco: 39.90 },
      { nome: "Refrigerante Lata", quantidade: 2, preco: 6.00 }
    ],
    status: "cancelado",
    total: 51.90,
    data: "2025-04-10T11:45:00",
    pagamento: "dinheiro",
    troco: 8.10,
    observacoes: "Cliente desistiu do pedido"
  }
];

const Pedidos = () => {
  const { currentUser, logout } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentPedido, setCurrentPedido] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Carregar pedidos
  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        // Aqui normalmente faríamos uma chamada à API
        // const response = await api.get('/orders');
        // setPedidos(response.data);
        // Usando dados mock por enquanto
        setTimeout(() => {
          setPedidos(mockPedidos);
          setFilteredPedidos(mockPedidos);
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        setError('Não foi possível carregar os pedidos. Tente novamente mais tarde.');
        setSnackbar({
          open: true,
          message: 'Erro ao carregar pedidos',
          severity: 'error'
        });
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  // Efeito para aplicar filtros
  useEffect(() => {
    let result = [...pedidos];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      result = result.filter(pedido => 
        pedido.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.endereco.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por status
    if (filterStatus !== 'todos') {
      result = result.filter(pedido => pedido.status === filterStatus);
    }
    
    setFilteredPedidos(result);
  }, [pedidos, searchTerm, filterStatus]);

  // Controle do drawer
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('todos');
  };

  // Ver detalhes do pedido
  const handleViewPedido = (pedido) => {
    setCurrentPedido(pedido);
    setOpenDialog(true);
  };

  // Atualizar status do pedido
  const handleUpdateStatus = async (pedidoId, newStatus) => {
    try {
      setLoading(true);
      
      // Simulação de chamada à API
      // await api.put(`/orders/${pedidoId}/status`, { status: newStatus });
      
      // Atualizar estado local
      const updatedPedidos = pedidos.map(pedido => 
        pedido.id === pedidoId 
          ? { ...pedido, status: newStatus } 
          : pedido
      );
      
      setPedidos(updatedPedidos);
      
      // Se o pedido atual está aberto, atualizar também
      if (currentPedido && currentPedido.id === pedidoId) {
        setCurrentPedido({ ...currentPedido, status: newStatus });
      }
      
      setSnackbar({
        open: true,
        message: 'Status do pedido atualizado com sucesso',
        severity: 'success'
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao atualizar status do pedido:', err);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status do pedido',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Fazer logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Formatação de data e hora
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Formatação de valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Obter chip colorido de acordo com o status
  const getStatusChip = (status) => {
    const statusConfig = {
      pendente: { color: 'warning', icon: <ScheduleIcon fontSize="small" />, label: 'Pendente' },
      em_preparo: { color: 'primary', icon: <CheckIcon fontSize="small" />, label: 'Em Preparo' },
      em_entrega: { color: 'info', icon: <DeliveryIcon fontSize="small" />, label: 'Em Entrega' },
      entregue: { color: 'success', icon: <DoneAllIcon fontSize="small" />, label: 'Entregue' },
      cancelado: { color: 'error', icon: <CloseIcon fontSize="small" />, label: 'Cancelado' }
    };

    const config = statusConfig[status] || statusConfig.pendente;

    return (
      <Chip 
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  // Drawer content
  const drawerItems = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <img 
          src="https://i.imgur.com/8jOdfcO.png"
          style={{ height: 50, marginBottom: 16 }}
          alt="Gringo Delivery"
        />
      </Box>
      <Divider />
      <List>
        <ListItem 
          button 
          component={Link} 
          to="/dashboard" 
          sx={{ 
            color: 'text.primary',
            '&:hover': { bgcolor: 'primary.light', color: 'white' } 
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem 
          button 
          component={Link} 
          to="/produtos"
          sx={{ 
            color: 'text.primary',
            '&:hover': { bgcolor: 'primary.light', color: 'white' } 
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <ProductsIcon />
          </ListItemIcon>
          <ListItemText primary="Produtos" />
        </ListItem>
        <ListItem 
          button 
          component={Link} 
          to="/pedidos"
          selected={true}
          sx={{ 
            color: 'text.primary',
            '&.Mui-selected': { 
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' } 
            },
            '&:hover': { bgcolor: 'primary.light', color: 'white' } 
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <OrdersIcon />
          </ListItemIcon>
          <ListItemText primary="Pedidos" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem 
          button 
          onClick={handleLogout}
          sx={{ '&:hover': { bgcolor: 'error.light', color: 'white' } }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItem>
      </List>
    </Box>
  );

  // Renderizar estado vazio (sem pedidos)
  const renderEmptyState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        py: 8 
      }}
    >
      <OrdersIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
        Nenhum pedido encontrado
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        Não há pedidos registrados no momento.
        <br />
        Os pedidos aparecerão aqui assim que forem recebidos.
      </Typography>
    </Box>
  );

  // Renderizar estado vazio após filtros
  const renderEmptyFilterState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        py: 8 
      }}
    >
      <FilterListIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
        Nenhum pedido encontrado com esses filtros
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Tente ajustar seus critérios de busca ou limpar os filtros.
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleClearFilters}
        startIcon={<ClearIcon />}
      >
        Limpar Filtros
      </Button>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar para dispositivos móveis */}
      {isMobile && (
        <AppBar position="fixed" sx={{ bgcolor: 'primary.main' }}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              Gringo Delivery
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer para navegação */}
      <Drawer
        anchor="left"
        open={isMobile ? drawerOpen : true}
        onClose={toggleDrawer(false)}
        variant={isMobile ? "temporary" : "permanent"}
        sx={{
          width: 250,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 250,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerItems}
      </Drawer>
      
      {/* Main content */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: 3,
        ml: isMobile ? 0 : '2px',
        mt: isMobile ? '64px' : 0
      }}>
        <Container maxWidth="lg">
          {/* Cabeçalho */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Pedidos
            </Typography>
          </Box>
          
          {/* Filtros */}
          <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                <FilterListIcon sx={{ mr: 1 }} /> Filtros
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder="Buscar pedidos (cliente, ID, endereço)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm ? (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setSearchTerm('')} size="small">
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="status-filter-label">Status do Pedido</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Status do Pedido"
                    >
                      <MenuItem value="todos">Todos os Pedidos</MenuItem>
                      <MenuItem value="pendente">Pendentes</MenuItem>
                      <MenuItem value="em_preparo">Em Preparo</MenuItem>
                      <MenuItem value="em_entrega">Em Entrega</MenuItem>
                      <MenuItem value="entregue">Entregues</MenuItem>
                      <MenuItem value="cancelado">Cancelados</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
            
            {/* Exibir resumo dos filtros ativos e botão para limpar */}
            {(searchTerm || filterStatus !== 'todos') && (
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Filtros ativos:
                </Typography>
                
                {searchTerm && (
                  <Chip 
                    label={`Busca: "${searchTerm}"`} 
                    size="small" 
                    onDelete={() => setSearchTerm('')}
                  />
                )}
                
                {filterStatus !== 'todos' && (
                  <Chip 
                    label={`Status: ${filterStatus === 'pendente' ? 'Pendentes' : 
                           filterStatus === 'em_preparo' ? 'Em Preparo' : 
                           filterStatus === 'em_entrega' ? 'Em Entrega' : 
                           filterStatus === 'entregue' ? 'Entregues' : 'Cancelados'}`} 
                    size="small"
                    color={filterStatus === 'pendente' ? 'warning' : 
                           filterStatus === 'em_preparo' ? 'primary' : 
                           filterStatus === 'em_entrega' ? 'info' : 
                           filterStatus === 'entregue' ? 'success' : 'error'}
                    onDelete={() => setFilterStatus('todos')}
                  />
                )}
                
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                  sx={{ ml: 'auto' }}
                >
                  Limpar filtros
                </Button>
              </Box>
            )}
          </Paper>
          
          {/* Contagem de pedidos */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Exibindo {filteredPedidos.length} pedido{filteredPedidos.length !== 1 ? 's' : ''} {filteredPedidos.length !== pedidos.length && `de ${pedidos.length} total`}
            </Typography>
          </Box>
          
          {/* Pedidos */}
          {loading && pedidos.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : pedidos.length === 0 ? (
            renderEmptyState()
          ) : filteredPedidos.length === 0 ? (
            renderEmptyFilterState()
          ) : (
            <TableContainer component={Paper} sx={{ mb: 4, borderRadius: 2, overflowX: 'auto' }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: 'primary.main' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cliente</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPedidos.map((pedido) => (
                    <TableRow 
                      key={pedido.id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        cursor: 'pointer',
                        bgcolor: 
                          pedido.status === 'pendente' ? 'warning.lightest' : 
                          pedido.status === 'cancelado' ? 'error.lightest' : 
                          pedido.status === 'entregue' ? 'success.lightest' : 
                          'inherit'
                      }}
                      onClick={() => handleViewPedido(pedido)}
                    >
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        {pedido.id}
                      </TableCell>
                      <TableCell>{formatDateTime(pedido.data)}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell>{formatCurrency(pedido.total)}</TableCell>
                      <TableCell>{getStatusChip(pedido.status)}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPedido(pedido);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Dialog para visualizar detalhes do pedido */}
          <Dialog 
            open={openDialog} 
            onClose={() => setOpenDialog(false)}
            maxWidth="md"
            fullWidth
          >
            {currentPedido && (
              <>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Detalhes do Pedido #{currentPedido.id}
                    </Typography>
                    {getStatusChip(currentPedido.status)}
                  </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 3, mt: 2 }}>
                  <Grid container spacing={3}>
                    {/* Informações do Cliente */}
                    <Grid item xs={12} md={6}>
                      <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                          Informações do Cliente
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Nome:</Typography>
                          <Typography variant="body2">{currentPedido.cliente}</Typography>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Telefone:</Typography>
                          <Typography variant="body2">{currentPedido.telefone}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Endereço:</Typography>
                          <Typography variant="body2">{currentPedido.endereco}</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    
                    {/* Informações do Pagamento */}
                    <Grid item xs={12} md={6}>
                      <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                          Informações do Pagamento
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Forma de Pagamento:</Typography>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {currentPedido.pagamento}
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Total:</Typography>
                          <Typography variant="body2">{formatCurrency(currentPedido.total)}</Typography>
                        </Box>
                        {currentPedido.troco > 0 && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Troco para:</Typography>
                            <Typography variant="body2">
                              {formatCurrency(currentPedido.total + currentPedido.troco)}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                    
                    {/* Itens do Pedido */}
                    <Grid item xs={12}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                          Itens do Pedido
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell align="center">Quantidade</TableCell>
                                <TableCell align="right">Preço Unit.</TableCell>
                                <TableCell align="right">Subtotal</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {currentPedido.itens.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.nome}</TableCell>
                                  <TableCell align="center">{item.quantidade}</TableCell>
                                  <TableCell align="right">{formatCurrency(item.preco)}</TableCell>
                                  <TableCell align="right">{formatCurrency(item.preco * item.quantidade)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Total:</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(currentPedido.total)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Grid>
                    
                    {/* Observações */}
                    {currentPedido.observacoes && (
                      <Grid item xs={12}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                            Observações
                          </Typography>
                          <Typography variant="body2">
                            {currentPedido.observacoes || "Nenhuma observação"}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    
                    {/* Atualizar Status */}
                    <Grid item xs={12}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                          Atualizar Status do Pedido
                        </Typography>
                        
                        {currentPedido.status !== 'cancelado' && currentPedido.status !== 'entregue' ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {currentPedido.status === 'pendente' && (
                              <Button
                                variant="contained"
                                color="primary"
                                startIcon={<CheckIcon />}
                                onClick={() => handleUpdateStatus(currentPedido.id, 'em_preparo')}
                              >
                                Iniciar Preparo
                              </Button>
                            )}
                            
                            {currentPedido.status === 'em_preparo' && (
                              <Button
                                variant="contained"
                                color="info"
                                startIcon={<DeliveryIcon />}
                                onClick={() => handleUpdateStatus(currentPedido.id, 'em_entrega')}
                              >
                                Enviar para Entrega
                              </Button>
                            )}
                            
                            {currentPedido.status === 'em_entrega' && (
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<DoneAllIcon />}
                                onClick={() => handleUpdateStatus(currentPedido.id, 'entregue')}
                              >
                                Confirmar Entrega
                              </Button>
                            )}
                            
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<CloseIcon />}
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
                                  handleUpdateStatus(currentPedido.id, 'cancelado')
                                }
                              }}
                              sx={{ ml: 'auto' }}
                            >
                              Cancelar Pedido
                            </Button>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Este pedido não pode ser atualizado pois já foi {currentPedido.status === 'entregue' ? 'entregue' : 'cancelado'}.
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenDialog(false)}>Fechar</Button>
                </DialogActions>
              </>
            )}
          </Dialog>
          
          {/* Snackbar para mensagens */}
          <Snackbar 
            open={snackbar.open} 
            autoHideDuration={6000} 
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleCloseSnackbar} 
              severity={snackbar.severity} 
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </Box>
  );
};

export default Pedidos;