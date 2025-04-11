const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const User = require("../models/User");
const Product = require("../models/Product");

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token de autenticação não fornecido" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido ou expirado" });
  }
};

// Criar ou atualizar produto
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const {
      productName,
      priceFull,
      priceOnSale,
      image,
      description,
      superPromo,
    } = req.body;

    let user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    let product = await Product.findOne({
      productName: productName,
      cnpj: user.cnpj,
    });

    if (product) {
      // Atualizar produto existente
      product.productName = productName || product.productName;
      product.priceFull = priceFull || product.priceFull;
      product.priceOnSale = priceOnSale || product.priceOnSale;
      product.image = image || product.image;
      product.description = description || product.description;
      product.superPromo =
        superPromo !== undefined ? superPromo : product.superPromo;
      await product.save();
      return res
        .status(200)
        .json({ message: "Produto atualizado com sucesso", product });
    } else {
      // Criar novo produto
      product = new Product({
        productName,
        priceFull: priceFull || 0,
        priceOnSale: priceOnSale || 0,
        image,
        description: description || "Sem descrição",
        superPromo: superPromo || false,
        cnpj: user.cnpj,
      });
      await product.save();
      return res
        .status(201)
        .json({ message: "Produto criado com sucesso", product });
    }
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    res
      .status(500)
      .json({ message: "Erro ao salvar produto", error: error.message });
  }
});

// Listar todos os produtos (pelo CNPJ do usuário)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const products = await Product.find({ cnpj: user.cnpj });
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar produtos", error: error.message });
  }
});

// Obter produto por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      cnpj: user.cnpj,
    });
    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar produto", error: error.message });
  }
});

// Atualizar produto
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const {
      productName,
      priceFull,
      priceOnSale,
      image,
      description,
      superPromo,
    } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      cnpj: user.cnpj,
    });
    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    // Atualizar campos
    if (productName) product.productName = productName;
    if (priceFull !== undefined) product.priceFull = priceFull;
    if (priceOnSale !== undefined) product.priceOnSale = priceOnSale;
    if (image) product.image = image;
    if (description) product.description = description;
    if (superPromo !== undefined) product.superPromo = superPromo;

    await product.save();

    res
      .status(200)
      .json({ message: "Produto atualizado com sucesso", product });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar produto", error: error.message });
  }
});

// Excluir produto
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      cnpj: user.cnpj,
    });
    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    await Product.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir produto", error: error.message });
  }
});

// Listar produtos públicos (para showcase)
// !!DANGER pode dar problema eventualemnte
router.get("/public/all", async (req, res) => {
  try {
    // Pode adicionar filtros ou limites aqui
    const products = await Product.find({ superPromo: true }).limit(20);
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro ao listar produtos públicos:", error);
    res.status(500).json({
      message: "Erro ao listar produtos públicos",
      error: error.message,
    });
  }
});

module.exports = router;
