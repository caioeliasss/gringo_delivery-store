const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Store = require("../models/Store");
const Motoboy = require("../models/Motoboy");
const Order = require("../models/Order");
const geocodeService = require("../services/geocodeService");

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

//TODO adicionar logica para procurar motoboys disponiveis
// Middleware para verificar se o usuário é um motoboy
const isMotoboyMiddleware = async (req, res, next) => {
  try {
    const motoboy = await Motoboy.findOne({ firebaseUid: req.user.uid });
    if (!motoboy) {
      return res
        .status(403)
        .json({ message: "Acesso permitido apenas para motoboys" });
    }

    // Adicionar motoboy ao objeto de requisição para uso nas rotas
    req.motoboy = motoboy;
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao verificar perfil de motoboy",
      error: error.message,
    });
  }
};

// Middleware para verificar se o usuário é um estabelecimento
const isEstablishmentMiddleware = async (req, res, next) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user || !user.cnpj || !user.cnpj_approved) {
      return res.status(403).json({
        message: "Acesso permitido apenas para estabelecimentos aprovados",
      });
    }

    // Adicionar estabelecimento ao objeto de requisição para uso nas rotas
    req.establishment = user;
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao verificar perfil de estabelecimento",
      error: error.message,
    });
  }
};

// Obter perfil do motoboy autenticado
router.get("/me", authenticateToken, isMotoboyMiddleware, async (req, res) => {
  try {
    // O middleware já carregou o motoboy e colocou em req.motoboy
    res.status(200).json(req.motoboy);
  } catch (error) {
    console.error("Erro ao obter perfil:", error);
    res
      .status(500)
      .json({ message: "Erro ao obter perfil", error: error.message });
  }
});

// Atualizar perfil do motoboy
router.put(
  "/profile",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const { name, phone, profileImage, bankInfo } = req.body;

      // Atualizar apenas campos permitidos
      if (name) req.motoboy.name = name;
      if (phone) req.motoboy.phone = phone;
      if (profileImage) req.motoboy.profileImage = profileImage;
      if (bankInfo) req.motoboy.bankInfo = bankInfo;

      await req.motoboy.save();

      res.status(200).json({
        message: "Perfil atualizado com sucesso",
        motoboy: req.motoboy,
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res
        .status(500)
        .json({ message: "Erro ao atualizar perfil", error: error.message });
    }
  }
);

// Registrar novo motoboy
router.post("/register", authenticateToken, async (req, res) => {
  try {
    const { name, phone, cpf, licensePlate, vehicleModel, vehicleYear } =
      req.body;

    // Verificar campos obrigatórios
    if (
      !name ||
      !phone ||
      !cpf ||
      !licensePlate ||
      !vehicleModel ||
      !vehicleYear
    ) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios" });
    }

    // Verificar se já existe um motoboy com este Firebase UID
    let existingMotoboy = await Motoboy.findOne({ firebaseUid: req.user.uid });
    if (existingMotoboy) {
      return res
        .status(400)
        .json({ message: "Você já possui um registro como motoboy" });
    }

    // Verificar se CPF ou placa já estão em uso
    const cpfExists = await Motoboy.findOne({ cpf });
    if (cpfExists) {
      return res
        .status(400)
        .json({ message: "CPF já está registrado no sistema" });
    }

    const licensePlateExists = await Motoboy.findOne({ licensePlate });
    if (licensePlateExists) {
      return res
        .status(400)
        .json({ message: "Placa já está registrada no sistema" });
    }

    // Criar novo motoboy
    const newMotoboy = new Motoboy({
      firebaseUid: req.user.uid,
      email: req.user.email,
      name,
      phone,
      cpf,
      licensePlate,
      vehicleModel,
      vehicleYear,
      geolocation: {
        type: "Point",
        coordinates: [0, 0], // Coordenadas padrão, serão atualizadas depois
      },
      accountStatus: "pending_approval",
    });

    await newMotoboy.save();

    res.status(201).json({
      message: "Registro de motoboy criado com sucesso. Aguardando aprovação.",
      motoboy: newMotoboy,
    });
  } catch (error) {
    console.error("Erro ao registrar motoboy:", error);
    res
      .status(500)
      .json({ message: "Erro ao registrar motoboy", error: error.message });
  }
});

// Enviar documentos
router.post(
  "/documents",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const { type, url } = req.body;

      if (!type || !url) {
        return res
          .status(400)
          .json({ message: "Tipo e URL do documento são obrigatórios" });
      }

      // Verificar se tipo é válido
      const validTypes = ["id", "license", "vehicle_registration", "other"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Tipo de documento inválido" });
      }

      // Adicionar documento à lista
      req.motoboy.documents.push({
        type,
        url,
        approved: false,
        uploadDate: new Date(),
      });

      await req.motoboy.save();

      res.status(200).json({
        message: "Documento enviado com sucesso",
        documents: req.motoboy.documents,
      });
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      res
        .status(500)
        .json({ message: "Erro ao enviar documento", error: error.message });
    }
  }
);

// Atualizar localização do motoboy
router.put(
  "/location",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const { longitude, latitude } = req.body;

      if (!longitude || !latitude) {
        return res.status(400).json({
          message: "Coordenadas de longitude e latitude são obrigatórias",
        });
      }

      // Atualizar localização
      req.motoboy.geolocation = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };

      // Atualizar última atividade
      req.motoboy.lastActive = new Date();

      await req.motoboy.save();

      res.status(200).json({
        message: "Localização atualizada com sucesso",
        geolocation: req.motoboy.geolocation,
      });
    } catch (error) {
      console.error("Erro ao atualizar localização:", error);
      res.status(500).json({
        message: "Erro ao atualizar localização",
        error: error.message,
      });
    }
  }
);

// Atualizar disponibilidade do motoboy
router.put(
  "/availability",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const { isAvailable } = req.body;

      if (typeof isAvailable !== "boolean") {
        return res
          .status(400)
          .json({ message: "Status de disponibilidade deve ser um booleano" });
      }

      req.motoboy.isAvailable = isAvailable;
      await req.motoboy.save();

      res.status(200).json({
        message: `Status de disponibilidade alterado para ${
          isAvailable ? "disponível" : "indisponível"
        }`,
        isAvailable: req.motoboy.isAvailable,
      });
    } catch (error) {
      console.error("Erro ao atualizar disponibilidade:", error);
      res.status(500).json({
        message: "Erro ao atualizar disponibilidade",
        error: error.message,
      });
    }
  }
);

// Listar pedidos do motoboy
router.get(
  "/orders",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const { status, limit = 10, page = 1 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      let query = { "motoboy.motoboyId": req.motoboy._id };

      // Filtrar por status, se fornecido
      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Order.countDocuments(query);

      res.status(200).json({
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Erro ao listar pedidos:", error);
      res
        .status(500)
        .json({ message: "Erro ao listar pedidos", error: error.message });
    }
  }
);

// Aceitar um pedido (para motoboys)
router.post(
  "/accept-order/:orderId",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const orderId = req.params.orderId;

      // Verificar se o pedido existe e está disponível
      const order = await Order.findOne({
        _id: orderId,
        status: { $in: ["em_preparo", "pendente"] },
        "motoboy.motoboyId": { $exists: false }, // Ainda não tem motoboy atribuído
      });

      if (!order) {
        return res
          .status(404)
          .json({ message: "Pedido não encontrado ou não disponível" });
      }

      // Verificar se o motoboy está disponível
      if (!req.motoboy.isAvailable) {
        return res.status(400).json({
          message: "Você precisa estar disponível para aceitar pedidos",
        });
      }

      // Verificar se o motoboy está aprovado
      if (!req.motoboy.register_approved) {
        return res.status(403).json({
          message: "Seu registro como motoboy ainda não foi aprovado",
        });
      }

      // Atribuir motoboy ao pedido
      order.motoboy = {
        motoboyId: req.motoboy._id,
        name: req.motoboy.name,
        phone: req.motoboy.phone,
      };

      // Atualizar status do pedido
      order.status = "em_entrega";

      // Calcular estimativa de entrega
      if (order.customer.geolocation && req.motoboy.geolocation) {
        const distance = geocodeService.calculateDistance(
          req.motoboy.geolocation.coordinates,
          order.customer.geolocation.coordinates
        );

        const estimatedTimeMinutes =
          geocodeService.estimateTravelTime(distance);

        order.delivery = {
          estimatedTime: estimatedTimeMinutes,
          distance: Math.round(distance),
          startTime: new Date(),
        };
      }

      await order.save();

      res.status(200).json({
        message: "Pedido aceito com sucesso",
        order,
      });
    } catch (error) {
      console.error("Erro ao aceitar pedido:", error);
      res
        .status(500)
        .json({ message: "Erro ao aceitar pedido", error: error.message });
    }
  }
);

// Completar entrega de um pedido
router.put(
  "/complete-order/:orderId",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const orderId = req.params.orderId;

      // Verificar se o pedido existe e está em entrega
      const order = await Order.findOne({
        _id: orderId,
        status: "em_entrega",
        "motoboy.motoboyId": req.motoboy._id,
      });

      if (!order) {
        return res.status(404).json({
          message: "Pedido não encontrado ou não está em entrega por você",
        });
      }

      // Calcular tempo de entrega
      const startTime = order.delivery?.startTime || order.orderDate;
      const endTime = new Date();
      const deliveryTimeMinutes = Math.round((endTime - startTime) / 60000); // Converter ms para minutos

      // Atualizar pedido
      order.status = "entregue";
      order.delivery = {
        ...order.delivery,
        endTime,
      };

      await order.save();

      // Atualizar estatísticas do motoboy
      await req.motoboy.updateDeliveryStats(deliveryTimeMinutes, true);

      res.status(200).json({
        message: "Entrega concluída com sucesso",
        order,
      });
    } catch (error) {
      console.error("Erro ao completar entrega:", error);
      res
        .status(500)
        .json({ message: "Erro ao completar entrega", error: error.message });
    }
  }
);

// Cancelar entrega de um pedido
router.put(
  "/cancel-order/:orderId",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const { reason } = req.body;

      if (!reason) {
        return res
          .status(400)
          .json({ message: "Motivo do cancelamento é obrigatório" });
      }

      // Verificar se o pedido existe e está em entrega
      const order = await Order.findOne({
        _id: orderId,
        status: "em_entrega",
        "motoboy.motoboyId": req.motoboy._id,
      });

      if (!order) {
        return res.status(404).json({
          message: "Pedido não encontrado ou não está em entrega por você",
        });
      }

      // Atualizar pedido para pendente novamente e remover motoboy
      order.status = "pendente";
      order.motoboy = undefined;
      order.delivery = {
        ...order.delivery,
        cancelReason: reason,
        canceledAt: new Date(),
      };

      await order.save();

      // Atualizar estatísticas do motoboy
      await req.motoboy.updateDeliveryStats(0, false);

      res.status(200).json({
        message: "Entrega cancelada com sucesso",
        order,
      });
    } catch (error) {
      console.error("Erro ao cancelar entrega:", error);
      res
        .status(500)
        .json({ message: "Erro ao cancelar entrega", error: error.message });
    }
  }
);

// Buscar motoboys próximos (para estabelecimentos)
router.get(
  "/nearby",
  authenticateToken,
  isEstablishmentMiddleware,
  async (req, res) => {
    try {
      const {
        longitude,
        latitude,
        maxDistance = 5000,
        onlyAvailable = true,
      } = req.query;

      if (!longitude || !latitude) {
        return res.status(400).json({
          message: "Coordenadas de longitude e latitude são obrigatórias",
        });
      }

      // Construir query
      let query = {
        register_approved: true,
        geolocation: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: parseInt(maxDistance),
          },
        },
      };

      // Adicionar filtro de disponibilidade, se solicitado
      if (onlyAvailable === "true") {
        query.isAvailable = true;
      }

      // Buscar motoboys
      const motoboys = await Motoboy.find(query)
        .select(
          "name phone geolocation score profileImage isAvailable lastActive"
        )
        .limit(10);

      // Calcular distância para cada motoboy
      const motoboyWithDistance = motoboys.map((motoboy) => {
        const distanceMeters = geocodeService.calculateDistance(
          motoboy.geolocation.coordinates,
          [parseFloat(longitude), parseFloat(latitude)]
        );

        return {
          _id: motoboy._id,
          name: motoboy.name,
          phone: motoboy.phone,
          score: motoboy.score,
          profileImage: motoboy.profileImage,
          isAvailable: motoboy.isAvailable,
          lastActive: motoboy.lastActive,
          distance: Math.round(distanceMeters),
          estimatedTimeMinutes:
            geocodeService.estimateTravelTime(distanceMeters),
        };
      });

      res.status(200).json(motoboyWithDistance);
    } catch (error) {
      console.error("Erro ao buscar motoboys próximos:", error);
      res.status(500).json({
        message: "Erro ao buscar motoboys próximos",
        error: error.message,
      });
    }
  }
);

// Solicitar entrega a um motoboy específico
router.post(
  "/request-delivery",
  authenticateToken,
  isEstablishmentMiddleware,
  async (req, res) => {
    try {
      const { orderId, motoboyId } = req.body;

      if (!orderId || !motoboyId) {
        return res
          .status(400)
          .json({ message: "ID do pedido e ID do motoboy são obrigatórios" });
      }

      // Verificar se o pedido existe e pertence ao estabelecimento
      const order = await Order.findOne({
        _id: orderId,
        cnpj: req.establishment.cnpj,
        status: { $in: ["pendente", "em_preparo"] },
      });

      if (!order) {
        return res.status(404).json({
          message: "Pedido não encontrado ou não está disponível para entrega",
        });
      }

      // Verificar se o motoboy existe e está disponível
      const motoboy = await Motoboy.findOne({
        _id: motoboyId,
        isAvailable: true,
        register_approved: true,
      });

      if (!motoboy) {
        return res
          .status(404)
          .json({ message: "Motoboy não encontrado ou não está disponível" });
      }

      // Atribuir motoboy ao pedido
      order.motoboy = {
        motoboyId: motoboy._id,
        name: motoboy.name,
        phone: motoboy.phone,
      };

      // Atualizar status do pedido
      order.status = "em_entrega";

      // Calcular estimativa de entrega
      if (order.customer.geolocation && motoboy.geolocation) {
        const distance = geocodeService.calculateDistance(
          motoboy.geolocation.coordinates,
          order.customer.geolocation.coordinates
        );

        const estimatedTimeMinutes =
          geocodeService.estimateTravelTime(distance);

        order.delivery = {
          estimatedTime: estimatedTimeMinutes,
          distance: Math.round(distance),
          startTime: new Date(),
        };
      }

      await order.save();

      // Aqui você poderia implementar notificações push para o motoboy

      res.status(200).json({
        message: "Solicitação de entrega enviada com sucesso",
        order,
      });
    } catch (error) {
      console.error("Erro ao solicitar entrega:", error);
      res
        .status(500)
        .json({ message: "Erro ao solicitar entrega", error: error.message });
    }
  }
);

// Obter estatísticas de entrega do motoboy
router.get(
  "/stats",
  authenticateToken,
  isMotoboyMiddleware,
  async (req, res) => {
    try {
      // Obter pedidos dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentOrders = await Order.find({
        "motoboy.motoboyId": req.motoboy._id,
        orderDate: { $gte: thirtyDaysAgo },
      });

      // Calcular estatísticas
      const totalRecentOrders = recentOrders.length;
      const completedOrders = recentOrders.filter(
        (order) => order.status === "entregue"
      ).length;
      const canceledOrders = recentOrders.filter(
        (order) => order.status === "cancelado"
      ).length;

      // Calcular renda
      // Aqui você precisaria ter um modelo de pagamento para calcular a renda do motoboy
      // Por simplicidade, vamos assumir que o motoboy recebe 10% do valor do pedido
      const earnings = recentOrders
        .filter((order) => order.status === "entregue")
        .reduce((total, order) => total + order.total * 0.1, 0);

      res.status(200).json({
        stats: req.motoboy.deliveryStats,
        recent: {
          totalOrders: totalRecentOrders,
          completedOrders,
          canceledOrders,
          earnings: parseFloat(earnings.toFixed(2)),
        },
      });
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      res
        .status(500)
        .json({ message: "Erro ao obter estatísticas", error: error.message });
    }
  }
);

// Rota administrativa para aprovar um motoboy
router.put("/approve/:motoboyId", authenticateToken, async (req, res) => {
  try {
    // Aqui você deveria verificar se o usuário é um administrador
    // Por simplicidade, vamos pular essa verificação por enquanto

    const motoboyId = req.params.motoboyId;

    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    motoboy.register_approved = true;
    motoboy.accountStatus = "active";

    await motoboy.save();

    res.status(200).json({
      message: "Motoboy aprovado com sucesso",
      motoboy,
    });
  } catch (error) {
    console.error("Erro ao aprovar motoboy:", error);
    res
      .status(500)
      .json({ message: "Erro ao aprovar motoboy", error: error.message });
  }
});

// Rota administrativa para rejeitar um motoboy
router.put("/reject/:motoboyId", authenticateToken, async (req, res) => {
  try {
    // Aqui você deveria verificar se o usuário é um administrador

    const motoboyId = req.params.motoboyId;
    const { reason } = req.body;

    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    motoboy.register_approved = false;
    motoboy.accountStatus = "inactive";

    await motoboy.save();

    res.status(200).json({
      message: "Registro de motoboy rejeitado",
      motoboy,
    });
  } catch (error) {
    console.error("Erro ao rejeitar motoboy:", error);
    res
      .status(500)
      .json({ message: "Erro ao rejeitar motoboy", error: error.message });
  }
});

// Avaliar um motoboy após a entrega
router.post("/rate/:motoboyId", authenticateToken, async (req, res) => {
  try {
    const motoboyId = req.params.motoboyId;
    const { rating, orderId, comment } = req.body;

    if (!rating || !orderId) {
      return res
        .status(400)
        .json({ message: "Avaliação e ID do pedido são obrigatórios" });
    }

    // Verificar se a avaliação é válida (de 1 a 5)
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "A avaliação deve ser um valor entre 1 e 5" });
    }

    // Verificar se o pedido existe e se já foi entregue
    const order = await Order.findOne({
      _id: orderId,
      status: "entregue",
      "motoboy.motoboyId": motoboyId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Pedido não encontrado ou não foi entregue por este motoboy",
      });
    }

    // Verificar se o pedido pertence ao usuário ou estabelecimento
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Para simplificar, vamos assumir que um estabelecimento só pode avaliar
    // um motoboy se o pedido pertencer a ele
    if (order.cnpj !== user.cnpj) {
      return res.status(403).json({
        message:
          "Você não tem permissão para avaliar este motoboy para este pedido",
      });
    }

    // Encontrar o motoboy
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    // Atualizar pontuação do motoboy
    await motoboy.updateScore(rating);

    // Opcionalmente, você pode adicionar o comentário ao pedido
    if (comment) {
      order.delivery = {
        ...order.delivery,
        rating,
        comment,
      };
      await order.save();
    }

    res.status(200).json({
      message: "Avaliação registrada com sucesso",
      newScore: motoboy.score,
    });
  } catch (error) {
    console.error("Erro ao avaliar motoboy:", error);
    res
      .status(500)
      .json({ message: "Erro ao avaliar motoboy", error: error.message });
  }
});

module.exports = router;
