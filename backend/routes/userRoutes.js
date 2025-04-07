const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');

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

router.post('/create', async (req, res) => {
    try {
      const { firebaseUid, email, displayName, photoURL } = req.body;
      
      // Verificar se dados obrigatórios foram fornecidos
      if (!firebaseUid || !email) {
        return res.status(400).json({ message: 'Firebase UID e email são obrigatórios' });
      }
      
      // Verificar se usuário já existe
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Este email já está em uso' });
      }
      
      // Criar novo usuário
      const newUser = new User({
        firebaseUid,
        email,
        displayName: displayName || null,
        photoURL: photoURL || null
      });
      
      // Salvar no banco de dados
      await newUser.save();
      
      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: newUser
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ 
        message: 'Erro ao criar usuário', 
        error: error.message 
      });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const users = await User.find().select('-__v');
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
    }
  });

// Rota para obter perfil do usuário atual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
  }
});

// Rota para criar ou atualizar perfil após autenticação
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, photoURL } = req.body;
    
    let user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (user) {
      // Atualizar usuário existente
      user.displayName = displayName || user.displayName;
      user.photoURL = photoURL || user.photoURL;
      await user.save();
    } else {
      // Criar novo usuário
      user = new User({
        firebaseUid: req.user.uid,
        email: req.user.email,
        displayName: displayName || req.user.name,
        photoURL: photoURL || req.user.picture
      });
      await user.save();
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar perfil', error: error.message });
  }
});

module.exports = router;