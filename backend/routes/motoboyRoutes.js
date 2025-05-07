const Motoboy = require("../models/Motoboy");
const Order = require("../models/Order");
const express = require("express");
const router = express.Router();
const motoboyServices = require("../services/motoboyServices");

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

// Get all users
const getMotoboys = async (req, res) => {
  try {
    const users = await Motoboy.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getMotoboyMe = async (req, res) => {
  try {
    const user = await Motoboy.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar usuário", error: error.message });
  }
};

const getMotoboyOrders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const order = await Order.find({
      // orderDate: { $gte: today },
      status: "pendente",
      "motoboy.motoboyId": null,
    });

    if (!order || order.length === 0) {
      return res.status(404).json({ message: "Não há pedidos disponíveis" });
    }

    res.status(200).json(order);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar pedidos", error: error.message });
  }
};

// Get user by ID
const getMotoboyById = async (req, res) => {
  try {
    const user = await Motoboy.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create user //TODO add Authentication
const createMotoboy = async (req, res) => {
  try {
    // Check if user with firebaseUid already exists
    const existingMotoboy = await Motoboy.findOne({
      firebaseUid: req.body.firebaseUid,
    });
    if (existingMotoboy) {
      return res.status(400).json({ message: "Usuário já existe" });
    }

    const user = new Motoboy({
      name: req.body.name,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      cpf: req.body.cpf,
      firebaseUid: req.body.firebaseUid,
    });

    const newMotoboy = await user.save();
    console.log(newMotoboy);
    res.status(201).json(newMotoboy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update user
const updateMotoboy = async (req, res) => {
  try {
    const user = await Motoboy.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    // Campos básicos
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.phoneNumber) user.phoneNumber = req.body.phoneNumber;
    if (req.body.cpf) user.cpf = req.body.cpf;
    if (req.body.cnh) user.cnh = req.body.cnh;

    // Campos booleanos - verificar se não são undefined antes de atualizar
    if (req.body.isApproved !== undefined)
      user.isApproved = req.body.isApproved;
    if (req.body.isAvailable !== undefined)
      user.isAvailable = req.body.isAvailable;
    if (req.body.race !== undefined) user.race = req.body.race;

    // Campos numéricos
    if (req.body.score !== undefined) user.score = req.body.score;

    // Array de coordenadas
    if (
      req.body.coordinates &&
      Array.isArray(req.body.coordinates) &&
      req.body.coordinates.length === 2
    ) {
      user.coordinates = req.body.coordinates;
    }

    // Atualizar o timestamp manualmente (embora o schema já faça isso automaticamente)
    user.updatedAt = Date.now();

    const updatedMotoboy = await user.save();
    res.json(updatedMotoboy);
  } catch (error) {
    // Tratamento específico para erros de validação do MongoDB
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    // Tratamento para erros de duplicidade (emails ou CPF duplicados)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${
          field === "email" ? "Email" : field === "cpf" ? "CPF" : field
        } já está em uso.`,
      });
    }
    console.log(error.message);

    // Outros erros
    res.status(500).json({
      message: "Erro ao atualizar usuário",
      error: error.message,
    });
  }
};

// Delete user
const deleteMotoboy = async (req, res) => {
  try {
    const user = await Motoboy.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    await user.deleteOne();
    res.json({ message: "Usuário excluído com sucesso" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user by Firebase UID
const getMotoboyByFirebaseUid = async (req, res) => {
  try {
    const user = await Motoboy.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const findMotoboys = async (req, res) => {
  try {
    // Test coordinates (replace with coordinates you know are valid for your environment)
    const testCoordinates = [-46.6333, -23.5505]; // Example: São Paulo
    const { order_id } = req.query || req.params;

    if (!order_id) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = await Order.findById(order_id);
    // console.log("order:", order);

    const storeCoordinates = order.store.coordinates;
    // console.log("storecoord:", storeCoordinates);

    const motoboys = await motoboyServices.findBestMotoboys(storeCoordinates);
    console.log("motoboys:", motoboys);

    const motoboyRequest = await motoboyServices.processMotoboyQueue(
      motoboys,
      order
    );
    // console.log(order);

    res.status(200).json({
      success: true,
      motoboy: motoboys,
      order: motoboyRequest,
    });
  } catch (error) {
    console.error("Test error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

router.get("/find", findMotoboys);
router.get("/", getMotoboys);
router.get("/me", getMotoboyMe);
router.post("/", createMotoboy);
router.put("/", updateMotoboy);

module.exports = router;
