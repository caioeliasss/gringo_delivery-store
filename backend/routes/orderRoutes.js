const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');
const Order = require('../models/Order');

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido ou expirado' });
  }
};

// Listar todos os pedidos do estabelecimento
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário tem um CNPJ aprovado
    if (!user.cnpj || !user.cnpj_approved) {
      return res.status(403).json({ message: 'CNPJ não aprovado ou não fornecido' });
    }
    
    const orders = await Order.find({ cnpj: user.cnpj }).sort({ orderDate: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ message: 'Erro ao listar pedidos', error: error.message });
  }
});

// Obter pedido por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const order = await Order.findOne({ _id: req.params.id, cnpj: user.cnpj });
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ message: 'Erro ao buscar pedido', error: error.message });
  }
});

// Atualizar status do pedido
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status não fornecido' });
    }
    
    // Validar se o status é válido
    const validStatus = ['pendente', 'em_preparo', 'em_entrega', 'entregue', 'cancelado'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }
    
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const order = await Order.findOne({ _id: req.params.id, cnpj: user.cnpj });
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Se o pedido já estiver entregue ou cancelado, não permitir alteração
    if (order.status === 'entregue' || order.status === 'cancelado') {
      return res.status(400).json({ 
        message: `Pedido já ${order.status === 'entregue' ? 'entregue' : 'cancelado'}, não é possível alterar o status` 
      });
    }
    
    // Atualizar status
    order.status = status;
    await order.save();
    
    res.status(200).json({ message: 'Status do pedido atualizado com sucesso', order });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do pedido', error: error.message });
  }
});

// Criar novo pedido (para uso do app do cliente)
router.post('/', async (req, res) => {
  try {
    const { 
      cnpj, 
      customer, 
      items, 
      total, 
      payment, 
      notes 
    } = req.body;
    
    if (!cnpj || !customer || !items || !total || !payment) {
      return res.status(400).json({ message: 'Dados obrigatórios não fornecidos' });
    }
    
    // Gerar número do pedido (formato: PD + timestamp)
    const orderNumber = 'PD' + Date.now().toString().substr(-6);
    
    // Criar novo pedido
    const newOrder = new Order({
      cnpj,
      orderNumber,
      customer,
      items,
      total,
      payment,
      notes: notes || '',
      status: 'pendente'
    });
    
    await newOrder.save();
    
    // Aqui você poderia implementar notificações push para o estabelecimento
    
    res.status(201).json({ message: 'Pedido criado com sucesso', order: newOrder });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ message: 'Erro ao criar pedido', error: error.message });
  }
});

// Endpoint para estatísticas de pedidos
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Obter data de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Obter data de 30 dias atrás
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Total de pedidos
    const totalOrders = await Order.countDocuments({ cnpj: user.cnpj });
    
    // Pedidos hoje
    const todayOrders = await Order.countDocuments({
      cnpj: user.cnpj,
      orderDate: { $gte: today }
    });
    
    // Pedidos nos últimos 30 dias
    const last30DaysOrders = await Order.countDocuments({
      cnpj: user.cnpj,
      orderDate: { $gte: thirtyDaysAgo }
    });
    
    // Pedidos por status
    const ordersByStatus = await Order.aggregate([
      { $match: { cnpj: user.cnpj } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Formatar resultado dos pedidos por status
    const statusCount = {
      pendente: 0,
      em_preparo: 0,
      em_entrega: 0,
      entregue: 0,
      cancelado: 0
    };
    
    ordersByStatus.forEach(item => {
      statusCount[item._id] = item.count;
    });
    
    // Receita total (apenas pedidos entregues)
    const totalRevenue = await Order.aggregate([
      { 
        $match: { 
          cnpj: user.cnpj,
          status: 'entregue'
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$total' } 
        } 
      }
    ]);
    
    // Receita nos últimos 30 dias
    const last30DaysRevenue = await Order.aggregate([
      { 
        $match: { 
          cnpj: user.cnpj,
          status: 'entregue',
          orderDate: { $gte: thirtyDaysAgo }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$total' } 
        } 
      }
    ]);
    
    res.status(200).json({
      totalOrders,
      todayOrders,
      last30DaysOrders,
      statusCount,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      last30DaysRevenue: last30DaysRevenue.length > 0 ? last30DaysRevenue[0].total : 0
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas', error: error.message });
  }
});

module.exports = router;