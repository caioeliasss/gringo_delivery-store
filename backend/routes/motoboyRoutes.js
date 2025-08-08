const Motoboy = require("../models/Motoboy");
const Order = require("../models/Order");
const express = require("express");
const router = express.Router();
const admin = require("../config/firebase-admin");
const motoboyServices = require("../services/motoboyServices");
const { sendNotification } = require("../services/fcmService");
const NotificationService = require("../services/notificationService");
const OccurrenceService = require("../services/OccurrenceService");
const Travel = require("../models/Travel");
const FullScreenNotificationService = require("../services/fullScreenNotificationService");

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
    const { name, email, phoneNumber, cpf, firebaseUid } = req.body;
    // Check if user with firebaseUid already exists
    const existingMotoboy = await Motoboy.findOne({
      firebaseUid: req.body.firebaseUid,
    });
    if (existingMotoboy) {
      return res.status(400).json({ message: "Usuário já existe" });
    }

    const user = new Motoboy({
      name: name,
      email: email,
      phoneNumber: phoneNumber,
      cpf: cpf,
      firebaseUid: firebaseUid,
    });

    const newMotoboy = await user.save();

    FullScreenNotificationService.createFullScreenNotification({
      motoboyId: newMotoboy._id,
      recipientId: newMotoboy._id,
      recipientType: "motoboy",
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
    // console.log(order);
    let count = 0;
    let motoboyRequest;
    let motoboys;
    do {
      motoboys = await motoboyServices.findBestMotoboys(storeCoordinates);

      motoboyRequest = await motoboyServices.processMotoboyQueue(
        motoboys,
        order
      );
      count++;
      if (count === 1 && motoboyRequest.success === false) {
        console.log(`ERRO Tentativa ${count}`);
        OccurrenceService.createOccurrence({
          orderId: order._id,
          storeId: order.store._id,
          type: "MOTOBOY",
          amount: 0,
          description: `Tentativa de encontrar motoboy falhou e já reniciamos a fila automaticamente.
          `,
          firebaseUid: "system",
          expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Expira em 30 dias
        });
      }
    } while (motoboyRequest.success === true && count < 3);

    res.status(200).json({
      success: true,
      motoboy: motoboys || [],
      order_sucess: motoboyRequest.success || false,
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
      firebaseUid: req.user.uid || req.body.firebaseUid,
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
    if (!orderId || !motoboyId) {
      return res
        .status(400)
        .json({ message: "Order ID e Motoboy ID são necessários" });
    }
    const result = await motoboyServices.removeMotoboyFromOrder(
      orderId,
      motoboyId
    );
    res.status(200).json(result);
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
const assignMotoboy = async (req, res) => {
  try {
    const { motoboyId, orderId } = req.body;

    // Validação inicial
    if (!motoboyId || !orderId) {
      return res
        .status(400)
        .json({ message: "Motoboy ID e Order ID são necessários" });
    }

    // Buscar motoboy
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    // Verificar se motoboy está disponível
    if (!motoboy.isAvailable || !motoboy.isApproved) {
      return res.status(400).json({
        message: "Motoboy não está disponível ou não foi aprovado",
      });
    }

    // Verificar se motoboy já está em uma corrida
    if (motoboy.race && motoboy.race.active) {
      return res.status(400).json({
        message: "Motoboy já está atribuído a outro pedido",
      });
    }

    // Buscar pedido
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    // Verificar se pedido já tem motoboy
    if (order.motoboy && order.motoboy.motoboyId) {
      return res
        .status(400)
        .json({ message: "Pedido já tem um motoboy atribuído" });
    }

    // Função helper para obter coordenadas do cliente
    const getCustomerCoordinates = (order) => {
      try {
        // Verificar se existe customer como array
        if (Array.isArray(order.customer) && order.customer.length > 0) {
          const customer = order.customer[0];
          if (
            customer.customerAddress &&
            Array.isArray(customer.customerAddress.coordinates)
          ) {
            return customer.customerAddress.coordinates;
          }
        }

        // Verificar se existe customer como objeto único
        if (order.customer && !Array.isArray(order.customer)) {
          if (
            order.customer.customerAddress &&
            Array.isArray(order.customer.customerAddress.coordinates)
          ) {
            return order.customer.customerAddress.coordinates;
          }
        }

        // Verificar se existe deliveryAddress diretamente no order
        if (
          order.deliveryAddress &&
          Array.isArray(order.deliveryAddress.coordinates)
        ) {
          return order.deliveryAddress.coordinates;
        }

        console.warn(
          "Coordenadas do cliente não encontradas, usando coordenadas padrão"
        );
        return [0, 0];
      } catch (error) {
        console.error("Erro ao obter coordenadas do cliente:", error);
        return [0, 0];
      }
    };

    // Atribuir motoboy ao pedido
    order.motoboy = {
      ...order.motoboy,
      motoboyId: motoboy._id,
      name: motoboy.name,
      phone: motoboy.phoneNumber,
      rated: false,
      timer: Date.now(),
    };

    // Alterar status do pedido para "em_preparo" quando motoboy é atribuído
    order.status = "em_preparo";

    // Criar dados da viagem
    const travelData = {
      motoboyId: motoboy._id,
      price: order.motoboy.price || 0,
      rain: order.delivery?.priceList?.isRain || false,
      distance: order.delivery?.distance || 0,
      coordinatesFrom: order.store?.coordinates || [0, 0],
      coordinatesTo: getCustomerCoordinates(order),
      order: order,
      status: "em_entrega",
    };

    // Criar viagem
    const travel = new Travel(travelData);
    await travel.save();

    // Atualizar status do motoboy
    motoboy.race = {
      active: true,
      orderId: order._id,
      travelId: travel._id,
    };

    // Salvar todas as alterações
    await motoboy.save();
    await order.save();

    // Enviar notificação para o motoboy

    if (motoboy.fcmToken) {
      NotificationService.createGenericNotification({
        motoboyId: motoboy._id,
        token: motoboy.fcmToken,
        title: "Novo pedido atribuído",
        message: `Você foi atribuído ao pedido ${order.orderNumber}.`,
        data: {
          orderId: order._id,
          travelId: travel._id,
          type: "SYSTEM",
          screen: "/(tabs)",
        },
      });
    } else {
      console.warn("Motoboy não possui token FCM");
    }

    const notificationSent = global.sendSocketNotification(
      motoboy.firebaseUid,
      "AssignedMotoboy",
      order
    );

    res.status(200).json({
      message: "Motoboy atribuído ao pedido com sucesso",
      motoboy: {
        motoboyId: motoboy._id,
        name: motoboy.name,
        phone: motoboy.phoneNumber,
        coordinates: motoboy.coordinates,
      },
    });
  } catch (error) {
    console.error("Erro ao atribuir motoboy:", error);
    res.status(500).json({
      message: "Erro interno do servidor ao atribuir motoboy",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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

// Endpoint de busca para motoboys
router.get("/search", async (req, res) => {
  try {
    const { q, approved, available, limit = 50 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        message: "Query de busca deve ter pelo menos 2 caracteres",
      });
    }

    const searchTerm = q.trim();
    const regex = new RegExp(searchTerm, "i"); // Case insensitive

    // Construir query de busca
    const searchQuery = {
      $or: [
        { name: regex },
        { email: regex },
        { phoneNumber: regex },
        { cpf: regex },
      ],
    };

    // Adicionar filtros opcionais
    if (approved !== undefined) {
      searchQuery.isApproved = approved === "true";
    }

    if (available !== undefined) {
      searchQuery.isAvailable = available === "true";
    }

    // Buscar motoboys por múltiplos campos
    const motoboys = await Motoboy.find(searchQuery)
      .select(
        "name email phoneNumber cpf isApproved isAvailable coordinates firebaseUid score createdAt race"
      )
      .limit(parseInt(limit)) // Limitar resultados para performance
      .sort({ name: 1 }) // Ordenar por nome
      .lean(); // Para melhor performance

    // Adicionar informações de status mais detalhadas
    const motoboyWithStatus = motoboys.map((motoboy) => ({
      ...motoboy,
      statusText: motoboy.isApproved
        ? motoboy.isAvailable
          ? "Disponível"
          : "Indisponível"
        : "Aguardando aprovação",
      isInRace: motoboy.race?.active || false,
    }));

    res.status(200).json(motoboyWithStatus);
  } catch (error) {
    console.error("Erro na busca de motoboys:", error);
    res.status(500).json({
      message: "Erro ao buscar motoboys",
      error: error.message,
    });
  }
});

const approveMotoboy = async (req, res) => {
  try {
    const { motoboyId } = req.params;

    if (!motoboyId) {
      return res.status(400).json({ message: "Motoboy ID é necessário" });
    }

    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    motoboy.isApproved = true;
    await motoboy.save();

    res.status(200).json({ message: "Motoboy aprovado com sucesso", motoboy });
  } catch (error) {
    console.error("Erro ao aprovar motoboy:", error);
    res.status(500).json({
      message: "Erro interno do servidor ao aprovar motoboy",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const repproveMotoboy = async (req, res) => {
  try {
    const { motoboyId } = req.params;

    if (!motoboyId) {
      return res.status(400).json({ message: "Motoboy ID é necessário" });
    }

    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    motoboy.isApproved = false;
    await motoboy.save();

    res.status(200).json({ message: "Motoboy reprovado com sucesso", motoboy });
  } catch (error) {
    console.error("Erro ao reprovar motoboy:", error);
    res.status(500).json({
      message: "Erro interno do servidor ao reprovar motoboy",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const acceptTerms = async (req, res) => {
  try {
    const motoboy = await Motoboy.findOne({ firebaseUid: req.user.uid });
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    // Atualizar status de aceitação dos termos
    motoboy.termsAccepted = true;
    motoboy.termsAcceptedAt = new Date();
    await motoboy.save();

    res.status(200).json({
      message: "Termos aceitos com sucesso",
      termsAccepted: motoboy.termsAccepted,
      termsAcceptedAt: motoboy.termsAcceptedAt,
    });
  } catch (error) {
    console.error("Erro ao aceitar termos:", error);
    res.status(500).json({
      message: "Erro ao aceitar termos",
      error: error.message,
    });
  }
};

const arrivedAtStore = async (req, res) => {
  try {
    const { motoboyId, arrivedAt } = req.body;
    if (!motoboyId || !arrivedAt) {
      return res
        .status(400)
        .json({ message: "Motoboy ID e hora de chegada são necessários" });
    }
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }
    const order = await Order.findById(motoboy.race?.orderId);
    if (!order) {
      return res
        .status(404)
        .json({ message: "Pedido não encontrado para este motoboy" });
    }
    order.motoboy.hasArrived = true;
    await order.save();
    res.status(200).json({ message: "Chegada na loja registrada com sucesso" });
  } catch (error) {
    console.error("Erro ao registrar chegada na loja:", error);
    res.status(500).json({
      message: "Erro ao registrar chegada na loja",
      error: error.message,
    });
  }
};

router.post("/arrived", authenticateToken, arrivedAtStore);
router.post("/accept-terms", authenticateToken, acceptTerms);
router.delete(
  "/removeMotoboyFromOrder/:orderId/:motoboyId",
  removeMotoboyFromOrder
);
router.put("/update-push-token", authenticateToken, updatePushToken);
router.get("/id/:id", authenticateToken, getMotoboyById);
router.get("/firebase/:firebaseUid", getMotoboyByFirebaseUid);
router.get("/find", authenticateToken, findMotoboys);
// router.get("/", getMotoboys);
router.get("/me", authenticateToken, getMotoboyMe);
router.post("/", createMotoboy);
router.put("/", authenticateToken, updateMotoboy);
router.put("/updateFCMToken", authenticateToken, updateFCMToken);
// Rota para marcar motoboy como chegado
const markMotoboyArrived = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId é obrigatório" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    if (!order.motoboy || !order.motoboy.motoboyId) {
      return res
        .status(400)
        .json({ message: "Pedido não tem motoboy atribuído" });
    }

    // Marcar como chegado
    order.motoboy.hasArrived = true;
    await order.save();

    // Cancelar timer ativo
    motoboyServices.markMotoboyAsArrived(orderId);

    res.json({
      message: "Motoboy marcado como chegado",
      orderId,
      hasArrived: true,
    });
  } catch (error) {
    console.error("Erro ao marcar motoboy como chegado:", error);
    res.status(500).json({ message: error.message });
  }
};

// Rotas de teste para o timer
const testTimer = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId é obrigatório" });
    }

    const result = motoboyServices.timerCounting(orderId);

    res.json({
      message: "Timer de teste iniciado",
      result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActiveTimers = (req, res) => {
  try {
    const timers = motoboyServices.getActiveTimers();

    res.json({
      message: "Timers ativos",
      count: timers.length,
      timers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearTimer = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId é obrigatório" });
    }

    const cleared = motoboyServices.clearTimer(orderId);

    res.json({
      message: cleared ? "Timer cancelado" : "Timer não encontrado",
      orderId,
      cleared,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Endpoint de debug para verificar usuários conectados via socket
const getConnectedUsers = async (req, res) => {
  try {
    if (!global.socketManager) {
      return res.status(500).json({
        message: "SocketManager não disponível",
      });
    }

    const connectedUsers = global.socketManager.getConnectedUsers();
    const stats = global.socketManager.getConnectionStats();

    res.json({
      stats,
      connectedUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Função de teste para simular atribuição de motoboy
const testAssignMotoboy = async (req, res) => {
  try {
    const { orderId, motoboyId } = req.body;

    if (!orderId || !motoboyId) {
      return res.status(400).json({
        message: "orderId e motoboyId são obrigatórios",
      });
    }

    // Buscar ou criar um pedido de teste
    let order = await Order.findById(orderId);
    if (!order) {
      // Criar um pedido de teste se não existir
      order = new Order({
        _id: orderId,
        store: {
          name: "Loja Teste",
          cnpj: "12345678000199",
          coordinates: [-46.6333, -23.5505],
        },
        orderNumber: "TEST" + Date.now(),
        customer: [
          {
            name: "Cliente Teste",
            phone: "11999999999",
            customerAddress: {
              cep: "01234567",
              address: "Rua Teste",
              addressNumber: "123",
              bairro: "Bairro Teste",
              cidade: "São Paulo",
              coordinates: [-46.6333, -23.5505],
            },
          },
        ],
        items: [
          {
            productName: "Produto Teste",
            quantity: 1,
            price: 10.0,
          },
        ],
        total: 10.0,
        payment: {
          method: "dinheiro",
          change: 0,
        },
        motoboy: {
          price: 5.0,
          blacklist: [],
          queue: {
            motoboys: [],
            motoboy_status: [],
            status: "pendente",
          },
        },
      });
    }

    console.log(
      `🧪 Teste: Atribuindo motoboy ${motoboyId} ao pedido ${orderId}`
    );

    // Atribuir o motoboy - isso deve disparar o middleware do Order.js
    order.motoboy.motoboyId = motoboyId;
    order.motoboy.name = "Motoboy Teste";
    order.motoboy.phone = "11888888888";

    await order.save();

    res.json({
      message:
        "Motoboy atribuído com sucesso - timer deve ter sido iniciado automaticamente",
      orderId: order._id,
      motoboyId: motoboyId,
      testNote:
        "Verifique os logs do servidor para confirmar se o timer foi iniciado",
    });
  } catch (error) {
    console.error("Erro no teste de atribuição:", error);
    res.status(500).json({ message: error.message });
  }
};

router.put("/assign", authenticateToken, assignMotoboy);
router.post("/approve/:motoboyId", authenticateToken, approveMotoboy);
router.post("/repprove/:motoboyId", authenticateToken, repproveMotoboy);

// Novas rotas
router.post("/mark-arrived", markMotoboyArrived);
router.post("/test/timer", testTimer);
router.get("/test/timers", getActiveTimers);
router.post("/test/clear-timer", clearTimer);
router.post("/test/assign-motoboy", testAssignMotoboy);
router.get("/test/connected-users", getConnectedUsers);

// Endpoint para criar índices de busca (usar apenas uma vez para setup)
router.post("/setup-search-indexes", async (req, res) => {
  try {
    // Criar índices compostos para melhorar performance de busca
    await Motoboy.collection.createIndex(
      {
        name: "text",
        email: "text",
        phoneNumber: "text",
        cpf: "text",
      },
      {
        name: "motoboy_search_index",
      }
    );

    // Índices individuais para filtros
    await Motoboy.collection.createIndex({ isApproved: 1 });
    await Motoboy.collection.createIndex({ isAvailable: 1 });
    await Motoboy.collection.createIndex({ name: 1 });
    await Motoboy.collection.createIndex({ "race.active": 1 });

    res.status(200).json({
      message: "Índices de busca criados com sucesso para motoboys",
    });
  } catch (error) {
    console.error("Erro ao criar índices:", error);
    res.status(500).json({
      message: "Erro ao criar índices de busca",
      error: error.message,
    });
  }
});

module.exports = router;
