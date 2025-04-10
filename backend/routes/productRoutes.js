const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');
const Product = require('../models/Product');

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

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { productName, priceFull, priceOnSale, image, description, superPromo  } = req.body;
    
    let user = await User.findOne({ firebaseUid: req.user.uid });
    let product = await Product.findOne({productName: productName});

    if (product) {
      // Atualizar usuário existente
      product.productName = productName || product.productName;
      product.priceFull = priceFull || product.priceFull;
      product.priceOnSale = priceOnSale || product.priceOnSale;
      product.image = image || product.image;
      product.description = description || product.description;
      product.superPromo = superPromo || product.superPromo;
      product.cnpj = user.cnpj; // Atualizar CNPJ se fornecido
      await product.save();
    } else {
      // Criar novo usuário
      product = new Product({
        productName: productName,
        priceFull: priceFull || 0 ,
        priceOnSale: priceOnSale || 0,
        image: image,
        description: description || "Sem descrição",
        superPromo: superPromo || false,
        cnpj: user.cnpj
      });
      await product.save();
    }
    
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar produto', error: error.message });
  }
});