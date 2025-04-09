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
    const { displayName, photoURL, cnpj } = req.body;
    
    let user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (user) {
      // Atualizar usuário existente
      user.displayName = displayName || user.displayName;
      user.photoURL = photoURL || user.photoURL;
      user.cnpj = cnpj || user.cnpj; // Atualizar CNPJ se fornecido
      await user.save();
    } else {
      // Criar novo usuário
      user = new User({
        firebaseUid: req.user.uid,
        email: req.user.email,
        cnpj: cnpj || null,
        cnpj_approved: false,
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