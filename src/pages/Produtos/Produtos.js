import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions, 
  IconButton, 
  Chip, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
  Paper,
  InputAdornment,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Receipt as OrdersIcon,
  Edit as EditIcon, 
  Delete as DeleteIcon,
  ShoppingBag as ShoppingBagIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  LocalOffer as LocalOfferIcon,
  Image as ImageIcon,
  ImageNotSupported as ImageNotSupportedIcon,
  Clear as ClearIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const Produtos = () => {
  const { currentUser, logout } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduto, setCurrentProduto] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  
  // Estados para o formulário
  const [produtoForm, setProdutoForm] = useState({
    productName: '',
    description: '',
    priceFull: '',
    priceOnSale: '',
    image: '',
    superPromo: false
  });

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSuperPromo, setFilterSuperPromo] = useState(false);
  const [filterImage, setFilterImage] = useState('all'); // 'all', 'with', 'without'

  // Carregar produtos do usuário
  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products');
        setProdutos(response.data);
        setFilteredProdutos(response.data);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar produtos:', err);
        setError('Não foi possível carregar os produtos. Tente novamente mais tarde.');
        setSnackbar({
          open: true,
          message: 'Erro ao carregar produtos',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProdutos();
  }, []);

  // Efeito para aplicar filtros
  useEffect(() => {
    let result = [...produtos];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      result = result.filter(produto => 
        produto.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por super promoção
    if (filterSuperPromo) {
      result = result.filter(produto => produto.superPromo);
    }
    
    // Filtrar por imagem
    if (filterImage === 'with') {
      result = result.filter(produto => produto.image && produto.image !== 'https://www.svgrepo.com/show/491915/food-color-pizza-slice.svg');
    } else if (filterImage === 'without') {
      result = result.filter(produto => !produto.image || produto.image === 'https://www.svgrepo.com/show/491915/food-color-pizza-slice.svg');
    }
    
    setFilteredProdutos(result);
  }, [produtos, searchTerm, filterSuperPromo, filterImage]);

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
    setFilterSuperPromo(false);
    setFilterImage('all');
  };

  // Abrir modal para adicionar novo produto
  const handleAddProduto = () => {
    setCurrentProduto(null);
    setProdutoForm({
      productName: '',
      description: '',
      priceFull: '',
      priceOnSale: '',
      image: '',
      superPromo: false
    });
    setOpenDialog(true);
  };

  // Abrir modal para editar produto existente
  const handleEditProduto = (produto) => {
    setCurrentProduto(produto);
    setProdutoForm({
      productName: produto.productName,
      description: produto.description,
      priceFull: produto.priceFull,
      priceOnSale: produto.priceOnSale || '',
      image: produto.image || '',
      superPromo: produto.superPromo || false
    });
    setOpenDialog(true);
  };

  // Atualizar campo do formulário
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProdutoForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Enviar formulário
  const handleSubmitProduto = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const produtoData = {
        ...produtoForm,
        priceFull: parseFloat(produtoForm.priceFull),
        priceOnSale: produtoForm.priceOnSale ? parseFloat(produtoForm.priceOnSale) : undefined
      };
      
      let response;
      
      if (currentProduto) {
        // Atualizar produto existente
        response = await api.put(`/products/${currentProduto._id}`, produtoData);
        
        // Atualizar a lista de produtos
        setProdutos(prev => 
          prev.map(p => p._id === currentProduto._id ? response.data.product : p)
        );
        
        setSnackbar({
          open: true,
          message: 'Produto atualizado com sucesso',
          severity: 'success'
        });
      } else {
        // Criar novo produto
        response = await api.post('/products/create', produtoData);
        
        // Adicionar à lista de produtos
        setProdutos(prev => [...prev, response.data.product]);
        
        setSnackbar({
          open: true,
          message: 'Produto criado com sucesso',
          severity: 'success'
        });
      }
      
      setOpenDialog(false);
      setError(null);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      setError('Não foi possível salvar o produto. Verifique os dados e tente novamente.');
      setSnackbar({
        open: true,
        message: 'Erro ao salvar produto',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Excluir produto
  const handleDeleteProduto = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/products/${id}`);
      
      // Remover da lista de produtos
      setProdutos(prev => prev.filter(p => p._id !== id));
      setError(null);
      
      setSnackbar({
        open: true,
        message: 'Produto excluído com sucesso',
        severity: 'success'
      });
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      setError('Não foi possível excluir o produto. Tente novamente mais tarde.');
      setSnackbar({
        open: true,
        message: 'Erro ao excluir produto',
        severity: 'error'
      });
    } finally {
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

  // Drawer content
  const drawerItems = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <img 
          src="https://i.imgur.com/8jOdfcO.png"
          style={{ height: 50, marginBottom: 16 }}
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
            <ShoppingBagIcon />
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

  // Renderizar estado vazio (sem produtos)
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
      <ShoppingBagIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
        Nenhum produto cadastrado
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Comece a adicionar seus produtos para exibi-los aqui.
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleAddProduto}
      >
        Adicionar Produto
      </Button>
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
        Nenhum produto encontrado com esses filtros
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
              Meus Produtos
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleAddProduto}
            >
              Adicionar Produto
            </Button>
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
                    placeholder="Buscar produtos"
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
                <Grid item xs={6} md={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filterSuperPromo}
                        onChange={(e) => setFilterSuperPromo(e.target.checked)}
                        color="primary"
                        icon={<LocalOfferIcon color="disabled" />}
                        checkedIcon={<LocalOfferIcon color="secondary" />}
                      />
                    }
                    label="Super Promoções"
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="image-filter-label">Filtrar por imagem</InputLabel>
                    <Select
                      labelId="image-filter-label"
                      value={filterImage}
                      onChange={(e) => setFilterImage(e.target.value)}
                      label="Filtrar por imagem"
                    >
                      <MenuItem value="all">Todos os produtos</MenuItem>
                      <MenuItem value="with">Com imagem personalizada</MenuItem>
                      <MenuItem value="without">Sem imagem personalizada</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
            
            {/* Exibir resumo dos filtros ativos e botão para limpar */}
            {(searchTerm || filterSuperPromo || filterImage !== 'all') && (
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
                
                {filterSuperPromo && (
                  <Chip 
                    label="Super Promoções" 
                    size="small" 
                    color="secondary"
                    icon={<LocalOfferIcon />}
                    onDelete={() => setFilterSuperPromo(false)}
                  />
                )}
                
                {filterImage !== 'all' && (
                  <Chip 
                    label={filterImage === 'with' ? 'Com imagem personalizada' : 'Sem imagem personalizada'} 
                    size="small"
                    icon={filterImage === 'with' ? <ImageIcon /> : <ImageNotSupportedIcon />}
                    onDelete={() => setFilterImage('all')}
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
          
          {/* Contagem de produtos */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Exibindo {filteredProdutos.length} produto{filteredProdutos.length !== 1 ? 's' : ''} {filteredProdutos.length !== produtos.length && `de ${produtos.length} total`}
            </Typography>
          </Box>
          
          {/* Produtos */}
          {loading && produtos.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : produtos.length === 0 ? (
            renderEmptyState()
          ) : filteredProdutos.length === 0 ? (
            renderEmptyFilterState()
          ) : (
            <Grid container spacing={3}>
              {filteredProdutos.map((produto) => (
                <Grid item xs={12} sm={6} md={4} key={produto._id}>
                  <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}>
                    {produto.superPromo && (
                      <Chip 
                        label="Super Promo" 
                        color="secondary"
                        sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          right: 10,
                          zIndex: 1,
                          fontWeight: 'bold'
                        }} 
                      />
                    )}
                    <CardMedia
                      component="img"
                      height="200"
                      image={produto.image || 'https://www.svgrepo.com/show/491915/food-color-pizza-slice.svg'}
                      alt={produto.productName}
                      sx={{ 
                        objectFit: 'contain',
                        p: 2
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                        {produto.productName}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          mb: 2,
                          height: 40
                        }}
                      >
                        {produto.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            textDecoration: produto.priceOnSale > 0 ? 'line-through' : 'none',
                            color: produto.priceOnSale > 0 ? 'text.secondary' : 'text.primary',
                            fontWeight: "bold",
                            fontSize: produto.priceOnSale > 0 ? "14px" : "20px",
                            mr: 1
                          }}
                        >
                          R$ {produto.priceFull.toFixed(2)}
                        </Typography>
                        {produto.priceOnSale > 0 && (
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                            R$ {produto.priceOnSale.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                      <IconButton 
                        color="primary" 
                        size="small" 
                        onClick={() => handleEditProduto(produto)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => handleDeleteProduto(produto._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Modal para adicionar/editar produto */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>
              {currentProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <form onSubmit={handleSubmitProduto}>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  name="productName"
                  label="Nome do Produto"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={produtoForm.productName}
                  onChange={handleFormChange}
                  required
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  name="description"
                  label="Descrição"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={produtoForm.description}
                  onChange={handleFormChange}
                  required
                  multiline
                  rows={4}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  name="priceFull"
                  label="Preço Normal"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={produtoForm.priceFull}
                  onChange={handleFormChange}
                  required
                  inputProps={{ step: "0.01", min: "0" }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  name="priceOnSale"
                  label="Preço Promocional"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={produtoForm.priceOnSale}
                  onChange={handleFormChange}
                  inputProps={{ step: "0.01", min: "0" }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  name="image"
                  label="URL da Imagem"
                  type="url"
                  fullWidth
                  variant="outlined"
                  value={produtoForm.image}
                  onChange={handleFormChange}
                  sx={{ mb: 2 }}
                  helperText="Deixe em branco para usar a imagem padrão"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={produtoForm.superPromo}
                      onChange={handleFormChange}
                      name="superPromo"
                      color="secondary"
                    />
                  }
                  label="Super Promoção"
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
                </Button>
              </DialogActions>
            </form>
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

export default Produtos;