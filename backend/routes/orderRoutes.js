const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Store = require("../models/Store");
const Order = require("../models/Order");
const Motoboy = require("../models/Motoboy");
const axios = require("axios");

const buscarCnpj = async (cnpj) => {
  const API_URL = "https://brasilapi.com.br/api/cnpj/v1";

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer 123",
    },
  });

  return api.get(`/${cnpj}`);
};

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

// Listar todos os pedidos do estabelecimento
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se o usuário tem um CNPJ aprovado
    if (!user.cnpj || !user.cnpj_approved) {
      return res
        .status(403)
        .json({ message: "CNPJ não aprovado ou não fornecido" });
    }

    const orders = await Order.find({ "store.cnpj": user.cnpj }).sort({
      orderDate: -1,
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar pedidos", error: error.message });
  }
});

// Obter pedido por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const order = await Order.findOne({ _id: req.params.id, cnpj: user.cnpj });
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar pedido", error: error.message });
  }
});

// Atualizar status do pedido
router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status não fornecido" });
    }

    // Validar se o status é válido
    const validStatus = [
      "pendente",
      "em_preparo",
      "em_entrega",
      "entregue",
      "cancelado",
    ];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const order = await Order.findOne({ _id: req.params.id, cnpj: user.cnpj });
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    // Se o pedido já estiver entregue ou cancelado, não permitir alteração
    if (order.status === "entregue" || order.status === "cancelado") {
      return res.status(400).json({
        message: `Pedido já ${
          order.status === "entregue" ? "entregue" : "cancelado"
        }, não é possível alterar o status`,
      });
    }

    // Atualizar status
    order.status = status;
    await order.save();

    res
      .status(200)
      .json({ message: "Status do pedido atualizado com sucesso", order });
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    res.status(500).json({
      message: "Erro ao atualizar status do pedido",
      error: error.message,
    });
  }
});

// Função auxiliar para geocodificar um endereço usando Google Maps API
const geocodeAddress = async (address) => {
  try {
    // Em ambiente de produção, você deve usar um serviço como Google Maps API
    // Esta é uma implementação simplificada para simulação

    // Simular uma resposta de geocodificação
    return {
      type: "Point",
      coordinates: [
        -46.6333 + (Math.random() - 0.5) * 0.1, // Longitude (São Paulo + aleatoriedade)
        -23.5505 + (Math.random() - 0.5) * 0.1, // Latitude (São Paulo + aleatoriedade)
      ],
    };

    // Em um ambiente real, você usaria algo como:
    /*
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`
    );
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      };
    }
    
    throw new Error('Não foi possível geocodificar o endereço');
    */
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    throw error;
  }
};

const customerGeolocation = async (address) => {
  const url = `https://www.cepaberto.com/api/v3/cep?cep=${address}`;
  const headers = {
    headers: {
      Authorization: "Token token=4a63e414a4b85704bbe354a6ccda8aad",
    },
  };

  try {
    const response = await fetch(url, headers);

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao obter geolocalização:", error);
    throw error;
  }
};
// Criar novo pedido (para uso do app do cliente)
// Criar novo pedido (para uso do app do cliente)
router.post("/", async (req, res) => {
  try {
    const { cnpj, customer, items, total, payment, notes, coordinates } =
      req.body;

    if (!cnpj || !customer || !items || !total || !payment) {
      return res
        .status(400)
        .json({ message: "Dados obrigatórios não fornecidos" });
    }

    // console.log(
    //   "Dados recebidos:",
    //   cnpj,
    //   customer,
    //   items,
    //   total,
    //   payment,
    //   geolocation
    // );

    // Gerar número do pedido (formato: PD + timestamp)
    const orderNumber = "PD" + Date.now().toString().substr(-6);

    // Criar novo pedido sem geolocalização

    const getCep = async () => {
      const response = await buscarCnpj(cnpj);
      const cep = response.data.cep;
      return cep;
    };

    const cep = await getCep();

    const newOrder = new Order({
      store: {
        cnpj: cnpj,
        coordinates: coordinates,
        cep: cep,
      },
      orderNumber,
      customer: {
        ...customer,
      },
      items,
      total,
      payment,
      notes: notes || "",
      status: "pendente",
      cliente_cod: customer.phone.replace(/\D/g, "").slice(-4),
      motoboy: {
        motoboyId: null,
        name: "",
        phone: null,
      },
    });

    // console.log(newOrder);
    await newOrder.save();

    res
      .status(201)
      .json({ message: "Pedido criado com sucesso", order: newOrder });
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar pedido", error: error.message });
  }
});

// Buscar motoboys próximos para atribuir a um pedido
router.get("/:id/nearby-motoboys", authenticateToken, async (req, res) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const order = await Order.findOne({ _id: req.params.id, cnpj: user.cnpj });
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    if (!order.customer.geolocation) {
      return res
        .status(400)
        .json({ message: "Este pedido não possui geolocalização definida" });
    }

    // Buscar motoboys disponíveis próximos ao endereço de entrega
    const { coordinates } = order.customer.geolocation;
    const maxDistance = req.query.maxDistance || 5000; // 5km padrão

    const nearbyMotoboys = await Motoboy.find({
      isAvailable: true,
      register_approved: true,
      geolocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coordinates,
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    }).select("name phone geolocation score profileImage");

    res.status(200).json(nearbyMotoboys);
  } catch (error) {
    console.error("Erro ao buscar motoboys próximos:", error);
    res.status(500).json({
      message: "Erro ao buscar motoboys próximos",
      error: error.message,
    });
  }
});

// Atribuir motoboy a um pedido
router.post("/:id/assign-motoboy", authenticateToken, async (req, res) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const order = await Order.findOne({ _id: req.params.id, cnpj: user.cnpj });
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    const { motoboyId } = req.body;
    if (!motoboyId) {
      return res.status(400).json({ message: "ID do motoboy não fornecido" });
    }

    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    // Verificar se motoboy está disponível
    if (!motoboy.isAvailable) {
      return res
        .status(400)
        .json({ message: "Motoboy não está disponível no momento" });
    }

    // Atribuir motoboy ao pedido
    order.motoboy = {
      motoboyId: motoboy._id,
      name: motoboy.name,
      phone: motoboy.phone,
    };

    // Atualizar status do pedido para "em entrega"
    if (order.status === "em_preparo") {
      order.status = "em_entrega";
    }

    // Calcular estimativa de entrega
    if (order.customer.geolocation && motoboy.geolocation) {
      // Cálculo simplificado de distância euclidiana
      const startLat = motoboy.geolocation.coordinates[1];
      const startLng = motoboy.geolocation.coordinates[0];
      const endLat = order.customer.geolocation.coordinates[1];
      const endLng = order.customer.geolocation.coordinates[0];

      // Cálculo de distância usando a fórmula de Haversine
      const R = 6371e3; // Raio da Terra em metros
      const φ1 = (startLat * Math.PI) / 180; // φ, λ em radianos
      const φ2 = (endLat * Math.PI) / 180;
      const Δφ = ((endLat - startLat) * Math.PI) / 180;
      const Δλ = ((endLng - startLng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c; // em metros

      // Estimar tempo baseado em uma velocidade média de 20 km/h
      const estimatedTimeMinutes = Math.ceil(distance / (20000 / 60));

      order.delivery = {
        estimatedTime: estimatedTimeMinutes,
        distance: Math.round(distance),
        startTime: new Date(),
      };
    }

    await order.save();

    res.status(200).json({
      message: "Motoboy atribuído ao pedido com sucesso",
      order,
    });
  } catch (error) {
    console.error("Erro ao atribuir motoboy ao pedido:", error);
    res.status(500).json({
      message: "Erro ao atribuir motoboy ao pedido",
      error: error.message,
    });
  }
});

// Endpoint para estatísticas de pedidos
router.get("/stats/summary", authenticateToken, async (req, res) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
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
      orderDate: { $gte: today },
    });

    // Pedidos nos últimos 30 dias
    const last30DaysOrders = await Order.countDocuments({
      cnpj: user.cnpj,
      orderDate: { $gte: thirtyDaysAgo },
    });

    // Pedidos por status
    const ordersByStatus = await Order.aggregate([
      { $match: { cnpj: user.cnpj } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Formatar resultado dos pedidos por status
    const statusCount = {
      pendente: 0,
      em_preparo: 0,
      em_entrega: 0,
      entregue: 0,
      cancelado: 0,
    };

    ordersByStatus.forEach((item) => {
      statusCount[item._id] = item.count;
    });

    // Receita total (apenas pedidos entregues)
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          cnpj: user.cnpj,
          status: "entregue",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
        },
      },
    ]);

    // Receita nos últimos 30 dias
    const last30DaysRevenue = await Order.aggregate([
      {
        $match: {
          cnpj: user.cnpj,
          status: "entregue",
          orderDate: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
        },
      },
    ]);

    // Estatísticas de entrega (distância média, tempo médio)
    const deliveryStats = await Order.aggregate([
      {
        $match: {
          cnpj: user.cnpj,
          status: "entregue",
          "delivery.distance": { $exists: true },
          "delivery.estimatedTime": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgDistance: { $avg: "$delivery.distance" },
          avgTime: { $avg: "$delivery.estimatedTime" },
          totalDeliveries: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      totalOrders,
      todayOrders,
      last30DaysOrders,
      statusCount,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      last30DaysRevenue:
        last30DaysRevenue.length > 0 ? last30DaysRevenue[0].total : 0,
      deliveryStats:
        deliveryStats.length > 0
          ? {
              avgDistance: Math.round(deliveryStats[0].avgDistance),
              avgTime: Math.round(deliveryStats[0].avgTime),
              totalDeliveries: deliveryStats[0].totalDeliveries,
            }
          : null,
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res
      .status(500)
      .json({ message: "Erro ao obter estatísticas", error: error.message });
  }
});

module.exports = router;
