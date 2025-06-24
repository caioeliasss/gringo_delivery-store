const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Store = require("../models/Store");
const Order = require("../models/Order");
const Motoboy = require("../models/Motoboy");
const axios = require("axios");
const geolib = require("geolib");
const DeliveryPrice = require("../models/DeliveryPrice");
const mongoose = require("mongoose");

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

const buscarCep = async (cep) => {
  const API_URL = `https://viacep.com.br/ws/${cep}/json/`;

  const api = axios.create({
    baseURL: API_URL,
  });

  return api.get(`/`);
};
const buscarCoord = async (logradouro, cidade, estado) => {
  try {
    // Obter a API key do Google Maps das variáveis de ambiente
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!API_KEY) {
      console.warn(
        "API Key do Google Maps não configurada, usando geocodificação fallback"
      );
      return await geocodeAddressFallback(logradouro, cidade, estado);
    }

    // Formatar o endereço completo
    const address = encodeURIComponent(
      `${logradouro}, ${cidade}, ${estado}, Brasil`
    );

    // Fazer requisição para a API do Google Maps
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${API_KEY}`
    );

    // Verificar se a resposta foi bem-sucedida
    if (response.data.status === "OK" && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;

      return {
        data: [
          {
            lat: location.lat.toString(),
            lon: location.lng.toString(),
          },
        ],
      };
    } else {
      console.warn(`Google Maps API retornou status: ${response.data.status}`);
      return await geocodeAddressFallback(logradouro, cidade, estado);
    }
  } catch (error) {
    console.error("Erro ao buscar coordenadas com Google Maps:", error.message);
    return await geocodeAddressFallback(logradouro, cidade, estado);
  }
};

// Função de fallback para quando a API do Google Maps falhar
const geocodeAddressFallback = async (logradouro, cidade, estado) => {
  console.log("Usando geocodificação de fallback para", cidade);

  // Mapa de coordenadas aproximadas das principais cidades brasileiras
  const cidadesCoords = {
    "São Paulo": { lat: -23.5505, lon: -46.6333 },
    "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
    "Belo Horizonte": { lat: -19.9167, lon: -43.9345 },
    Brasília: { lat: -15.7801, lon: -47.9292 },
    Salvador: { lat: -12.9714, lon: -38.5014 },
    Fortaleza: { lat: -3.7172, lon: -38.5433 },
    Recife: { lat: -8.0476, lon: -34.877 },
    "Porto Alegre": { lat: -30.0346, lon: -51.2177 },
    Manaus: { lat: -3.119, lon: -60.0217 },
    Curitiba: { lat: -25.4296, lon: -49.2719 },
  };

  // Verifica se a cidade existe no mapa, senão usa São Paulo como fallback
  const baseCoords = cidadesCoords[cidade] || cidadesCoords["São Paulo"];

  // Adiciona uma pequena variação para endereços diferentes
  const lat = baseCoords.lat + (Math.random() - 0.5) * 0.01;
  const lon = baseCoords.lon + (Math.random() - 0.5) * 0.01;

  return {
    data: [
      {
        lat: lat.toString(),
        lon: lon.toString(),
      },
    ],
  };
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
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado", id: id });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    res.status(500).json({
      message: "Erro ao buscar pedido",
      error: error.message,
    });
  }
});

// Atualizar status do pedido
// backend/routes/orderRoutes.js - modificar a rota de atualização de status

router.put("/status", authenticateToken, async (req, res) => {
  try {
    const { status, id } = req.body;
    if (!status || !id) {
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

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    const user = await Store.findOne({ cnpj: order.store.cnpj });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Se o pedido já estiver entregue ou cancelado, não permitir alteração
    if (order.status === "entregue" || order.status === "cancelado") {
      return res.status(400).json({
        message: `Pedido já ${
          order.status === "entregue" ? "entregue" : "cancelado"
        }, não é possível alterar o status`,
      });
    }

    // Guardar status anterior para comparação
    const previousStatus = order.status;

    // Atualizar status
    order.status = status;
    await order.save();

    // console.log(
    //   `Pedido ${order._id} atualizado: ${previousStatus} -> ${status}`
    // );

    // Se o status mudou, enviar notificação via SSE
    if (previousStatus !== status) {
      // console.log("Tentando enviar notificação SSE...");
      // console.log("User UID para notificação:", user.firebaseUid);

      // Verificar se a função de notificação existe
      if (!req.app.locals.sendEventToStore) {
        console.error(
          "ERRO: função sendEventToStore não encontrada em app.locals"
        );
        return res.status(200).json({
          message:
            "Status do pedido atualizado com sucesso, mas notificação falhou",
          order,
        });
      }

      // Preparar dados do pedido para a notificação
      const orderData = {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        customer: {
          name: order.customer.name,
        },
        total: order.total,
        orderDate: order.orderDate,
      };

      // console.log("Dados para enviar:", JSON.stringify(orderData));

      // Tentar enviar a notificação
      try {
        const notified = req.app.locals.sendEventToStore(
          user.firebaseUid,
          "orderUpdate",
          orderData
        );

        // console.log(`Notificação SSE ${notified ? "ENVIADA" : "FALHOU"}`);
      } catch (notifyError) {
        console.error("Erro ao enviar notificação SSE:", notifyError);
      }
    }

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
    const googleMapsApiKey = process.env.GOOGLE_EXPO_PUBLIC_MAPS_API_KEY;
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
    const {
      store,
      customer,
      items,
      total,
      payment,
      notes,
      driveBack,
      findDriverAuto,
    } = req.body;

    if (!store.cnpj || !customer || !items || !total || !payment) {
      return res
        .status(400)
        .json({ message: "Dados obrigatórios não fornecidos" });
    }

    const cnpj = store.cnpj;

    // Gerar número do pedido (formato: PD + timestamp)
    const orderNumber = "PD" + Date.now().toString().substr(-6);

    const getCep = async (cnpj) => {
      const response = await buscarCnpj(cnpj);
      const cep = response.data.cep;

      let storeName = response.data.nome_fantasia;
      if (!storeName) {
        storeName = response.data.razao_social;
      }

      return { cep, storeName };
    };

    const calculatePrice = async (coordFrom, cep, driveBack) => {
      const response = await buscarCep(cep);
      const addressCustomer = response.data;

      const responseCoord = await buscarCoord(
        addressCustomer.logradouro,
        addressCustomer.localidade,
        addressCustomer.uf
      );

      const { lat, lon } = responseCoord.data[0];
      const coordTo = { latitude: parseFloat(lat), longitude: parseFloat(lon) };

      let distance = geolib.getDistance(
        { latitude: coordFrom[1], longitude: coordFrom[0] },
        coordTo
      );
      distance = distance / 1000;

      const priceList = await DeliveryPrice.findOne();

      if (!priceList) {
        console.log("Price List nao encontrado");
        return;
      }

      let cost;
      let valorFixo;

      try {
        const getWeather = require("../services/weatherService").getWeather;
        const weatherResponse = getWeather(coordTo.latitude, coordTo.longitude);
        const weatherData = await weatherResponse;
        if (weatherData.current.weather_code > 60) {
          priceList.isRain = true;
        }
      } catch (error) {
        console.error("Erro ao obter dados do clima:", error.message);
        priceList.isRain = false; // Definir como falso se houver erro na API de
      }

      if (priceList.isRain) {
        valorFixo = priceList.priceRain;
      } else if (priceList.isHighDemand) {
        valorFixo = priceList.fixedPriceHigh;
      } else {
        valorFixo = priceList.fixedPrice;
      }

      if (distance > priceList.fixedKm) {
        let bonusDistance = valorFixo - distance;
        cost = bonusDistance * priceList.bonusKm;
        cost = cost + valorFixo;
      } else {
        cost = valorFixo;
      }
      if (driveBack) {
        cost = distance * priceList.driveBack + cost;
      }

      return { cost, distance, coordTo, priceList };
    };

    const { cost, distance, coordTo, priceList } = await calculatePrice(
      store.coordinates,
      customer.customerAddress.cep,
      driveBack || false
    );
    const { cep, storeName } = await getCep(cnpj);

    const newOrder = new Order({
      store: {
        name: storeName,
        cnpj: cnpj,
        coordinates: store.coordinates,
        address: store.address,
        cep: cep,
      },
      orderNumber,
      customer: {
        ...customer,
        customerAddress: {
          ...customer.customerAddress,
          coordinates: [coordTo.longitude, coordTo.latitude],
        },
      },
      items,
      total,
      payment,
      notes: notes || "",
      status: "pendente",
      cliente_cod: customer.phone.replace(/\D/g, "").slice(-4),
      delivery: {
        distance: distance,
        priceList: priceList || {},
      },
      motoboy: {
        price: cost,
        motoboyId: null,
        name: "",
        phone: null,
        location: {
          distance: 0,
          estimatedTime: 0,
        },
      },
    });

    await newOrder.save();

    // NOVO: Automaticamente iniciar busca por motoboys após criar o pedido
    if (findDriverAuto) {
      try {
        // Importar o serviço de motoboys
        const motoboyServices = require("../services/motoboyServices");

        // Buscar motoboys próximos usando as coordenadas da loja
        const motoboys = await motoboyServices.findBestMotoboys(
          store.coordinates
        );

        // console.log(`Encontrados ${motoboys}`);

        if (motoboys && motoboys.length > 0) {
          // Processar a fila de motoboys para enviar notificações
          await motoboyServices.processMotoboyQueue(motoboys, newOrder);
        } else {
        }
      } catch (motoboyError) {
        // Se houver erro na busca de motoboys, apenas logar mas não falhar a criação do pedido
        console.error("Erro ao buscar motoboys:", motoboyError);
      }
    }

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

router.put("/:id/accept", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { motoboyId } = req.body;
    if (!motoboyId) {
      return res.status(400).json({ message: "ID do motoboy não fornecido" });
    }
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }
    const motoboy = await Motoboy.findById(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    // Verificar se o pedido já foi aceito por outro motoboy
    if (order.motoboy.motoboyId) {
      return res
        .status(400)
        .json({ message: "Este pedido já foi aceito por outro motoboy" });
    }

    // Atribuir motoboy ao pedido
    order.motoboy = {
      ...order.motoboy,
      motoboyId: motoboy._id,
      name: motoboy.name,
      phone: motoboy.phone,
      profileImage: motoboy.profileImage,
    };
    // Atualizar status do pedido para "em_preparo"
    order.status = "em_preparo";

    await order.save();

    // Atualizar disponibilidade do motoboy
    motoboy.isAvailable = false;
    await motoboy.save();

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

router.post("/:id/rated", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Busca o pedido
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    // Atualiza apenas o campo rated dentro de motoboy, mantendo os outros dados
    order.motoboy = {
      ...order.motoboy,
      rated: true,
    };

    await order.save();

    res.status(200).json({ message: "Avaliação enviada com sucesso" });
  } catch (error) {
    console.error("Erro ao enviar avaliação:", error);
    res.status(500).json({
      message: "Erro ao enviar avaliação",
      error: error.message,
    });
  }
});

module.exports = router;
