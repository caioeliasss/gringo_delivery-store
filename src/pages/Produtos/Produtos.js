import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  Alert
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  ShoppingBag as ShoppingBagIcon
} from '@mui/icons-material';

const Produtos = () => {
  const { currentUser } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduto, setCurrentProduto] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Estados para o formulário
  const [produtoForm, setProdutoForm] = useState({
    productName: '',
    description: '',
    priceFull: '',
    priceOnSale: '',
    image: '',
    superPromo: false
  });

  // Carregar produtos do usuário
  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products');
        setProdutos(response.data);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
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
      
      {/* Produtos */}
      {loading && produtos.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : produtos.length === 0 ? (
        renderEmptyState()
      ) : (
        <Grid container spacing={3}>
          {produtos.map((produto) => (
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
                    color="warning"
                    sx={{ 
                      position: 'absolute', 
                      top: 10, 
                      right: 10,
                      zIndex: 1
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
                        textDecoration: produto.priceOnSale ? 'line-through' : 'none',
                        color: produto.priceOnSale ? 'text.secondary' : 'text.primary',
                        mr: 1
                      }}
                    >
                      R$ {produto.priceFull.toFixed(2)}
                    </Typography>
                    {produto.priceOnSale && (
                      <Typography variant="h6" color="green" sx={{ fontWeight: 'bold' }}>
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
        <DialogTitle>
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
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={produtoForm.superPromo}
                  onChange={handleFormChange}
                  name="superPromo"
                  color="primary"
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
              {loading ? <CircularProgress size={24} /> : 'Salvar'}
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
  );
};

export default Produtos;