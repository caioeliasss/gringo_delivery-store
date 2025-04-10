import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Produtos.css';

const Produtos = () => {
  const { currentUser } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentProduto, setCurrentProduto] = useState(null);
  
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
    setShowModal(true);
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
    setShowModal(true);
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
      } else {
        // Criar novo produto
        response = await api.post('/products/create', produtoData);
        
        // Adicionar à lista de produtos
        setProdutos(prev => [...prev, response.data.product]);
      }
      
      setShowModal(false);
      setError(null);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      setError('Não foi possível salvar o produto. Verifique os dados e tente novamente.');
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
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      setError('Não foi possível excluir o produto. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar modal de formulário
  const renderModal = () => {
    if (!showModal) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <span className="modal-close" onClick={() => setShowModal(false)}>×</span>
          
          <h2 className="form-title">
            {currentProduto ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          
          <form onSubmit={handleSubmitProduto}>
            <div className="form-group">
              <label className="form-label">Nome do Produto*</label>
              <input
                type="text"
                name="productName"
                value={produtoForm.productName}
                onChange={handleFormChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Descrição*</label>
              <textarea
                name="description"
                value={produtoForm.description}
                onChange={handleFormChange}
                className="form-textarea"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Preço Normal*</label>
              <input
                type="number"
                name="priceFull"
                value={produtoForm.priceFull}
                onChange={handleFormChange}
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Preço Promocional</label>
              <input
                type="number"
                name="priceOnSale"
                value={produtoForm.priceOnSale}
                onChange={handleFormChange}
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">URL da Imagem</label>
              <input
                type="url"
                name="image"
                value={produtoForm.image}
                onChange={handleFormChange}
                className="form-input"
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            
            <div className="form-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  name="superPromo"
                  checked={produtoForm.superPromo}
                  onChange={handleFormChange}
                  id="superPromo"
                />
                <label htmlFor="superPromo">Super Promoção</label>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="form-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="form-submit"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Renderizar estado vazio (sem produtos)
  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">🛍️</div>
      <h3 className="empty-state-title">Nenhum produto cadastrado</h3>
      <p className="empty-state-text">Comece a adicionar seus produtos para exibi-los aqui.</p>
      <button 
        className="add-produto-button"
        onClick={handleAddProduto}
      >
        Adicionar Produto
      </button>
    </div>
  );

  // Renderizar lista de produtos
  const renderProdutosList = () => (
    <>
      <div className="produtos-header">
        <h1 className="produtos-title">Meus Produtos</h1>
        <button 
          className="add-produto-button"
          onClick={handleAddProduto}
        >
          Adicionar Produto
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="produtos-grid">
        {produtos.map(produto => (
          <div className="produto-card" key={produto._id}>
            <img 
            style={{width: "100px",height: "100px", marginTop: "20px"}}
              src={produto.image || 'https://www.svgrepo.com/show/380889/product-quality-internet-marketing-project.svg'} 
              alt={produto.productName}
              className="produto-image"
            />
            
            {produto.superPromo && (
              <div className="produto-badge">Super Promo</div>
            )}
            
            <div className="produto-details">
              <h3 className="produto-name">{produto.productName}</h3>
              <p className="produto-description">{produto.description}</p>
              
              <div className="produto-price">
                <span className="produto-full-price">
                  R$ {produto.priceFull.toFixed(2)}
                </span>
                
                {produto.priceOnSale && (
                  <span className="produto-sale-price">
                    R$ {produto.priceOnSale.toFixed(2)}
                  </span>
                )}
              </div>
              
              <div className="produto-actions">
                <button 
                  className="produto-action-button produto-edit-button"
                  onClick={() => handleEditProduto(produto)}
                >
                  Editar
                </button>
                <button 
                  className="produto-action-button produto-delete-button"
                  onClick={() => handleDeleteProduto(produto._id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="produtos-container">
      <div className="produtos-content">
        {loading && produtos.length === 0 ? (
          <div className="loading-spinner">Carregando...</div>
        ) : produtos.length === 0 ? (
          renderEmptyState()
        ) : (
          renderProdutosList()
        )}
        
        {renderModal()}
      </div>
    </div>
  );
};

export default Produtos;