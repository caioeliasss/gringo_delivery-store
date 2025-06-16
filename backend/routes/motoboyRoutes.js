const Motoboy = require("../models/Motoboy");
const Order = require("../models/Order");
const express = require("express");
const router = express.Router();
const motoboyServices = require("../services/motoboyServices");
const sendNotification = require("../services/fcmService");
const createNotificationGeneric = require("../routes/notificationRoutes");

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
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

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

    createNotificationGeneric({
      motoboyId: newMotoboy._id,
      type: "SYSTEM",
      title: "Documentos pendentes",
      message:
        "Seu cadastro está pendente, precisamos de seus documentos (CNH, RG)",
      status: "PENDING",
    });
    res.status(201).json(newMotoboy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update user
const updateMotoboy = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      cpf,
      cnh,
      isApproved,
      isAvailable,
      race,
      coordinates,
      score,
    } = req.body;
    const user = await Motoboy.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Cria um objeto de atualização
    const updateObj = {};

    // Só adiciona campos ao objeto de atualização se eles estiverem definidos
    if (name !== undefined) updateObj.name = name;
    if (email !== undefined) updateObj.email = email;
    if (phoneNumber !== undefined) updateObj.phoneNumber = phoneNumber;
    if (cpf !== undefined) updateObj.cpf = cpf;
    if (cnh !== undefined) updateObj.cnh = cnh;
    if (isApproved !== undefined) updateObj.isApproved = isApproved;
    if (isAvailable !== undefined) updateObj.isAvailable = isAvailable;
    if (score !== undefined) updateObj.score = score;
    if (coordinates !== undefined) updateObj.coordinates = coordinates;

    // Verifica se race existe e tem as propriedades necessárias
    if (race !== undefined) {
      updateObj.race = {
        active: race.active !== undefined ? race.active : user.race?.active,
        orderId: race.orderId !== undefined ? race.orderId : user.race?.orderId,
        travelId:
          race.travelId !== undefined ? race.travelId : user.race?.travelId,
      };
    }

    // Adiciona o timestamp
    updateObj.updatedAt = Date.now();

    // Atualiza o documento
    const motoboy = await Motoboy.findByIdAndUpdate(user._id, updateObj, {
      new: true,
      runValidators: true,
    });

    res.json(motoboy);
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

    // console.log("motoboys:", motoboys);

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

const updateFCMToken = async (req, res) => {
  try {
    const user = await Motoboy.findOne({
      firebaseUid: req.user.uid,
    });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    // Atualiza o token FCM
    user.fcmToken = req.body.token;
    const updatedMotoboy = await user.save();
    res.json(updatedMotoboy);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao atualizar token FCM",
      error: error.message,
    });
  }
};

const removeMotoboyFromOrder = async (req, res) => {
  try {
    const { orderId, motoboyId } = req.params;

    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    motoboy.race = {
      active: false,
      orderId: null,
      travelId: null,
    };

    await motoboy.save();

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    order.motoboy.motoboyId = null;
    order.motoboy.rated = false;
    order.motoboy.name = null;

    await order.save();
    res.status(200).json({ message: "Motoboy removido do pedido com sucesso" });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao remover motoboy do pedido",
      error: error.message,
    });
  }
};

const updatePushToken = async (req, res) => {
  try {
    const { firebaseUid, pushToken } = req.body;

    if (!firebaseUid || !pushToken) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const motoboy = await Motoboy.findOne({ firebaseUid: firebaseUid });
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    motoboy.pushToken = pushToken;
    await motoboy.save();

    res.status(200).json({ message: "Push token atualizado com sucesso" });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao atualizar push token",
      error: error.message,
    });
  }
};

router.get("/", async (req, res) => {
  try {
    const motoboys = await Motoboy.find({}).select(
      "name email phoneNumber cpf isApproved isAvailable coordinates score race firebaseUid pushToken"
    );
    if (!motoboys || motoboys.length === 0) {
      return res.status(404).json({ message: "Nenhum motoboy encontrado" });
    }
    res.json(motoboys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.delete(
  "/removeMotoboyFromOrder/:orderId/:motoboyId",
  removeMotoboyFromOrder
);
router.put("/update-push-token", updatePushToken);
router.get("/id/:id", getMotoboyById);
router.get("/firebase/:firebaseUid", getMotoboyByFirebaseUid);
router.get("/find", findMotoboys);
// router.get("/", getMotoboys);
router.get("/me", getMotoboyMe);
router.post("/", createMotoboy);
router.put("/", updateMotoboy);
router.post("/updateFCMToken", updateFCMToken);

module.exports = router;
