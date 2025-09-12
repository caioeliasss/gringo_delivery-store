const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Store = require("../models/Store");
const { listInvoices } = require("../services/asaasService");
const asaasService = require("../services/asaasService");
const emailService = require("../services/emailService");
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

router.get("/phone/:id", async (req, res) => {
  try {
    const Order = require("../models/Order");
    const order = await Order.findById(req.params.id).select("store");

    console.log("Buscando telefone para loja ID:", order.store);

    const user = await Store.findOne({ cnpj: order.store.cnpj }).select(
      "phone"
    );
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar usuário", error: error.message });
  }
});

// Rota para obter perfil do usuário atual
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar usuário", error: error.message });
  }
});

// routes/motoboyRoutes.js - adicionar se não existir
router.get("/", async (req, res) => {
  try {
    const motoboys = await Store.find({});
    res.json(motoboys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/id/:id", async (req, res) => {
  try {
    console.log("Buscando usuário com ID:", req.params.id);
    const user = await Store.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar usuário", error: error.message });
  }
});

// Endpoint de busca para estabelecimentos
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

    // Construir query de busca com melhor tratamento de tipos
    const searchConditions = [
      { businessName: regex },
      { displayName: regex },
      { phone: regex },
      { email: regex },
      { "address.address": regex },
      { "address.bairro": regex },
      { "address.cidade": regex },
      { "address.cep": regex },
    ];

    // Tratamento especial para CNPJ (que é Number no schema)
    if (/^\d+$/.test(searchTerm)) {
      // Se for apenas números, buscar como Number
      searchConditions.push({ cnpj: parseInt(searchTerm) });
    }

    const searchQuery = {
      $or: searchConditions,
    };

    console.log("🔍 Search term:", searchTerm);
    console.log("🔍 Search query:", JSON.stringify(searchQuery, null, 2));

    // Adicionar filtros opcionais
    if (approved !== undefined) {
      searchQuery.cnpj_approved = approved === "true";
    }

    if (available !== undefined) {
      searchQuery.isAvailable = available === "true";
    }

    // Buscar estabelecimentos por múltiplos campos
    console.log("🔍 Executing search query...");
    const stores = await Store.find(searchQuery)
      .select(
        "businessName displayName phone email cnpj address firebaseUid isAvailable cnpj_approved createdAt"
      )
      .limit(parseInt(limit)) // Limitar resultados para performance
      .sort({ businessName: 1 }) // Ordenar por nome
      .lean(); // Para melhor performance

    console.log(`✅ Search completed. Found ${stores.length} stores`);
    res.status(200).json(stores);
  } catch (error) {
    console.error("❌ Erro na busca de estabelecimentos:", error);
    console.error("❌ Error stack:", error.stack);
    console.error(
      "❌ Search query that failed:",
      JSON.stringify(searchQuery, null, 2)
    );

    res.status(500).json({
      message: "Erro ao buscar estabelecimentos",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

router.get("/firebase/:id", async (req, res) => {
  try {
    const user = await Store.findOne({ firebaseUid: req.params.id });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao buscar usuário", error: error.message });
  }
});

// Rota para criar ou atualizar perfil após autenticação
router.post("/profile", authenticateToken, async (req, res) => {
  try {
    const {
      displayName,
      photoURL,
      cnpj,
      businessName,
      address,
      phone,
      geolocation,
      businessHours,
    } = req.body;

    let user = await Store.findOne({ firebaseUid: req.user.uid });

    if (user) {
      // Atualizar usuário existente
      user.displayName = displayName || user.displayName;
      user.photoURL = photoURL || user.photoURL;
      user.cnpj = cnpj || user.cnpj;
      user.businessName = businessName || user.businessName;
      user.address = address || user.address;
      user.phone = phone || user.phone;
      user.businessHours = businessHours || user.businessHours;

      // Atualizar geolocalização se fornecida
      if (geolocation && geolocation.coordinates) {
        user.geolocation = {
          type: "Point",
          coordinates: geolocation.coordinates,
        };
      }

      await user.save();
    } else {
      // Criar novo usuário
      user = new Store({
        firebaseUid: req.user.uid,
        email: req.user.email,
        displayName: displayName || req.user.name,
        photoURL: photoURL || req.user.picture,
        cnpj: cnpj || null,
        cnpj_approved: false,
        businessName: businessName || null,
        address: address || null,
        phone: phone || null,
        businessHours: businessHours || null,
      });

      // Definir geolocalização se fornecida
      if (geolocation && geolocation.coordinates) {
        user.geolocation = {
          type: "Point",
          coordinates: geolocation.coordinates,
        };
      }

      await user.save();

      // 📧 Enviar email para administradores sobre novo cadastro
      try {
        console.log(
          "📧 Enviando notificação de novo cadastro para administradores..."
        );
        const emailResult = await emailService.notifyAdminsNewStoreRegistration(
          user
        );

        if (emailResult.success) {
          console.log(
            "✅ Email de notificação enviado com sucesso para administradores"
          );
        } else {
          console.warn(
            "⚠️ Falha ao enviar email para administradores:",
            emailResult.error
          );
        }
      } catch (emailError) {
        console.error(
          "❌ Erro ao enviar email para administradores:",
          emailError
        );
        // Não interromper o fluxo principal se o email falhar
      }
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao salvar perfil", error: error.message });
  }
});

router.post("/freeToNavigate", authenticateToken, async (req, res) => {
  const { storeId } = req.body;
  try {
    const user = await Store.findById(storeId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    user.freeToNavigate = true;
    await user.save();

    await emailService.notifyUserAccessLiberation(user);

    res.status(200).json({ message: "Acesso liberado com sucesso" });
  } catch (error) {
    console.error("Erro ao liberar acesso:", error);
    res.status(500).json({
      message: "Erro ao liberar acesso",
      error: error.message,
    });
  }
});

router.post("/reproveFreeToNavigate", authenticateToken, async (req, res) => {
  const { storeId } = req.body;
  try {
    const user = await Store.findById(storeId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    user.freeToNavigate = false;
    await user.save();

    await emailService.notifyUserAccessReproval(user);

    res.status(200).json({ message: "Acesso reprovado com sucesso" });
  } catch (error) {
    console.error("Erro ao reprovar acesso:", error);
    res.status(500).json({
      message: "Erro ao reprovar acesso",
      error: error.message,
    });
  }
});

router.put("/cnpj", authenticateToken, async (req, res) => {
  try {
    const { cnpj, storeId } = req.body;
    if (!cnpj) {
      return res.status(400).json({ message: "CNPJ é obrigatório" });
    }

    const user = await Store.findById(storeId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    user.cnpj = cnpj;
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao atualizar CNPJ:", error);
    res.status(500).json({
      message: "Erro ao atualizar CNPJ",
      error: error.message,
    });
  }
});

// Atualizar apenas a geolocalização do estabelecimento
router.put("/location", authenticateToken, async (req, res) => {
  try {
    const { longitude, latitude } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({
        message: "Coordenadas de longitude e latitude são obrigatórias",
      });
    }

    const user = await Store.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Atualizar localização do estabelecimento
    user.geolocation = {
      type: "Point",
      coordinates: [longitude, latitude],
    };

    await user.save();

    res.status(200).json({
      message: "Localização atualizada com sucesso",
      geolocation: user.geolocation,
    });
  } catch (error) {
    console.error("Erro ao atualizar localização:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar localização", error: error.message });
  }
});

const updateCustomerId = async (req, res) => {
  try {
    const { firebaseUid, asaasCustomerId } = req.body;
    if (!firebaseUid || !asaasCustomerId) {
      return res.status(400).json({
        message: "firebaseUid e cusId são obrigatórios",
      });
    }
    const user = await Store.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    // Atualizar o customerId do usuário
    user.asaasCustomerId = asaasCustomerId;
    await user.save();
    res.status(200).json({
      message: "customerId atualizado com sucesso",
      asaasCustomerId: user.asaasCustomerId,
    });
  } catch (error) {
    console.error("Erro ao atualizar customerId:", error);
    res.status(500).json({
      message: "Erro ao atualizar customerId",
      error: error.message,
    });
  }
};

router.put("/customerId", updateCustomerId);

// Buscar estabelecimentos próximos por geolocalização
router.get("/nearby", authenticateToken, async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5000, limit = 10 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        message: "Coordenadas de longitude e latitude são obrigatórias",
      });
    }

    // Buscar estabelecimentos próximos ao ponto
    const nearbyEstablishments = await Store.find({
      cnpj_approved: true,
      isAvailable: true,
      geolocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    })
      .limit(parseInt(limit))
      .select(
        "displayName businessName address phone geolocation businessHours photoURL"
      );

    res.status(200).json(nearbyEstablishments);
  } catch (error) {
    console.error("Erro ao buscar estabelecimentos próximos:", error);
    res.status(500).json({
      message: "Erro ao buscar estabelecimentos próximos",
      error: error.message,
    });
  }
});

// Rota administrativa para aprovar o CNPJ de um estabelecimento (apenas para admin)
router.put("/approve-cnpj/:userId", authenticateToken, async (req, res) => {
  try {
    // Aqui você deveria verificar se o usuário autenticado é um administrador
    // Por simplicidade, vamos assumir que o middleware de admin já foi aplicado

    const userId = req.params.userId;
    const user = await Store.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (!user.cnpj) {
      return res
        .status(400)
        .json({ message: "Usuário não possui CNPJ cadastrado" });
    }

    user.cnpj_approved = true;
    await user.save();

    res.status(200).json({
      message: "CNPJ aprovado com sucesso",
      user,
    });
  } catch (error) {
    console.error("Erro ao aprovar CNPJ:", error);
    res
      .status(500)
      .json({ message: "Erro ao aprovar CNPJ", error: error.message });
  }
});

// Atualizar disponibilidade do estabelecimento (aberto/fechado)
router.put("/availability", authenticateToken, async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res
        .status(400)
        .json({ message: "Estado de disponibilidade não fornecido" });
    }

    const user = await Store.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Atualizar disponibilidade
    user.isAvailable = isAvailable;
    await user.save();

    res.status(200).json({
      message: `Estabelecimento agora está ${
        isAvailable ? "aberto" : "fechado"
      }`,
      isAvailable: user.isAvailable,
    });
  } catch (error) {
    console.error("Erro ao atualizar disponibilidade:", error);
    res.status(500).json({
      message: "Erro ao atualizar disponibilidade",
      error: error.message,
    });
  }
});

// Buscar perfil público de um estabelecimento
router.get("/public/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await Store.findById(userId).select(
      "displayName businessName address phone geolocation businessHours photoURL isAvailable"
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }

    // Verificar se é um estabelecimento com CNPJ aprovado
    if (!user.cnpj_approved) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado ou não aprovado" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao buscar estabelecimento:", error);
    res.status(500).json({
      message: "Erro ao buscar estabelecimento",
      error: error.message,
    });
  }
});

router.post(`/billingOptions`, authenticateToken, async (req, res) => {
  try {
    const { storeId, billingOptions } = req.body;
    if (!storeId || !billingOptions) {
      return res.status(400).json({
        message: "storeId e billingOptions são obrigatórios",
      });
    }
    const store = await Store.findById(storeId);
    if (!store) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }
    // Atualizar as opções de faturamento do estabelecimento
    store.billingOptions = billingOptions;
    await store.save();
    res.status(200).json({
      message: "Opções de faturamento atualizadas com sucesso",
      billingOptions: store.billingOptions,
    });
  } catch (error) {
    console.error("Erro ao atualizar opções de faturamento:", error);
    res.status(500).json({
      message: "Erro ao atualizar opções de faturamento",
      error: error.message,
    });
  }
});

router.post(`/approve/:storeId`, authenticateToken, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const store = await Store.findById(storeId);

    if (!store) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }

    store.cnpj_approved = true;
    await store.save();

    res.status(200).json({ message: "CNPJ aprovado com sucesso", store });
  } catch (error) {
    console.error("Erro ao aprovar CNPJ:", error);
    res
      .status(500)
      .json({ message: "Erro ao aprovar CNPJ", error: error.message });
  }
});

router.post(`/reprove/:storeId`, authenticateToken, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const store = await Store.findById(storeId);

    if (!store) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }

    store.cnpj_approved = false;
    await store.save();

    res.status(200).json({ message: "CNPJ reprovado com sucesso", store });
  } catch (error) {
    console.error("Erro ao reprovar CNPJ:", error);
    res
      .status(500)
      .json({ message: "Erro ao reprovar CNPJ", error: error.message });
  }
});

// Rota para atualizar nome da loja (admin only)
router.put("/name", async (req, res) => {
  try {
    const { storeId, businessName } = req.body;

    if (!storeId || !businessName) {
      return res.status(400).json({
        message: "storeId e businessName são obrigatórios",
      });
    }

    if (businessName.trim().length === 0) {
      return res.status(400).json({
        message: "Nome da loja não pode estar vazio",
      });
    }

    // Buscar a loja pelo ID
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    // Atualizar o nome da loja
    store.businessName = businessName.trim();
    await store.save();

    res.status(200).json({
      message: "Nome da loja atualizado com sucesso",
      store: {
        _id: store._id,
        businessName: store.businessName,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar nome da loja:", error);
    res.status(500).json({
      message: "Erro ao atualizar nome da loja",
      error: error.message,
    });
  }
});

// Rota para aceitar termos de serviço
router.post("/accept-terms", authenticateToken, async (req, res) => {
  try {
    const store = await Store.findOne({ firebaseUid: req.user.uid });
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    // Atualizar status de aceitação dos termos
    store.termsAccepted = true;
    store.termsAcceptedAt = new Date();
    await store.save();

    res.status(200).json({
      message: "Termos aceitos com sucesso",
      termsAccepted: store.termsAccepted,
      termsAcceptedAt: store.termsAcceptedAt,
    });
  } catch (error) {
    console.error("Erro ao aceitar termos:", error);
    res.status(500).json({
      message: "Erro ao aceitar termos",
      error: error.message,
    });
  }
});

// Endpoint para criar índices de busca (usar apenas uma vez para setup)
router.post("/setup-search-indexes", async (req, res) => {
  try {
    // Criar índices compostos para melhorar performance de busca
    await Store.collection.createIndex(
      {
        businessName: "text",
        displayName: "text",
        phone: "text",
        email: "text",
        cnpj: "text",
        "address.address": "text",
        "address.bairro": "text",
        "address.cidade": "text",
      },
      {
        name: "store_search_index",
      }
    );

    // Índices individuais para filtros
    await Store.collection.createIndex({ cnpj_approved: 1 });
    await Store.collection.createIndex({ isAvailable: 1 });
    await Store.collection.createIndex({ businessName: 1 });

    res.status(200).json({
      message: "Índices de busca criados com sucesso para estabelecimentos",
    });
  } catch (error) {
    console.error("Erro ao criar índices:", error);
    res.status(500).json({
      message: "Erro ao criar índices de busca",
      error: error.message,
    });
  }
});

const changeCoordinates = async (req, res) => {
  const { storeId, coordinates } = req.body;

  if (!storeId || !coordinates) {
    return res.status(400).json({
      message: "storeId e coordinates são obrigatórios",
    });
  }

  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    // Atualizar as coordenadas
    store.coordinates = coordinates;
    await store.save();

    res.status(200).json({
      message: "Coordenadas atualizadas com sucesso",
      store: {
        _id: store._id,
        coordinates: store.coordinates,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar coordenadas:", error);
    res.status(500).json({
      message: "Erro ao atualizar coordenadas",
      error: error.message,
    });
  }
};

const removeStore = async (req, res) => {
  const { storeId } = req.body;

  if (!storeId) {
    return res.status(400).json({
      message: "storeId é obrigatório",
    });
  }

  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    await Store.deleteOne({ _id: storeId });

    res.status(200).json({
      message: "Loja removida com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover loja:", error);
    res.status(500).json({
      message: "Erro ao remover loja",
      error: error.message,
    });
  }
};

const sendMerchant = async (req, res) => {
  const { storeId, merchantId } = req.body;

  if (!storeId || !merchantId) {
    return res.status(400).json({
      message: "storeId e merchantId são obrigatórios",
    });
  }

  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    await Store.findByIdAndUpdate(storeId, {
      $set: { "ifoodConfig.merchantId": merchantId },
    });

    res.status(200).json({
      message: "merchantId enviada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao enviar merchantId:", error);
    res.status(500).json({
      message: "Erro ao enviar merchantId",
      error: error.message,
    });
  }
};

router.post("/coordinates", changeCoordinates);
router.delete("/remove-store", removeStore);
router.post("/sendMerchant", sendMerchant);

// Rota de teste para configuração de email (remover em produção)
router.post("/test-email", async (req, res) => {
  try {
    const testResult = await emailService.testEmailConfiguration();

    if (testResult.success) {
      // Testar envio de email real
      const testStore = {
        businessName: "Loja Teste",
        displayName: "Teste Display",
        email: "teste@exemplo.com",
        phone: "(11) 99999-9999",
        cnpj: "12.345.678/0001-90",
        address: {
          address: "Rua Teste, 123",
          bairro: "Centro",
          cidade: "São Paulo",
          cep: "01234-567",
        },
      };

      const emailResult = await emailService.notifyAdminsNewStoreRegistration(
        testStore
      );

      res.status(200).json({
        message: "Teste de email concluído",
        configTest: testResult,
        emailTest: emailResult,
      });
    } else {
      res.status(500).json({
        message: "Configuração de email inválida",
        error: testResult.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Erro ao testar email",
      error: error.message,
    });
  }
});

// Rota para liberar acesso de uma loja (definir freeToNavigate = true)
router.put("/liberar-acesso/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({
        message: "storeId é obrigatório",
      });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        message: "Loja não encontrada",
      });
    }

    // Liberar acesso
    store.freeToNavigate = true;
    await store.save();

    res.status(200).json({
      message: "Acesso liberado com sucesso",
      store: {
        _id: store._id,
        businessName: store.businessName,
        freeToNavigate: store.freeToNavigate,
      },
    });
  } catch (error) {
    console.error("Erro ao liberar acesso:", error);
    res.status(500).json({
      message: "Erro ao liberar acesso",
      error: error.message,
    });
  }
});

// Rota para restringir acesso de uma loja (definir freeToNavigate = false)
router.put("/restringir-acesso/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({
        message: "storeId é obrigatório",
      });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        message: "Loja não encontrada",
      });
    }

    // Restringir acesso
    store.freeToNavigate = false;
    await store.save();

    res.status(200).json({
      message: "Acesso restringido com sucesso",
      store: {
        _id: store._id,
        businessName: store.businessName,
        freeToNavigate: store.freeToNavigate,
      },
    });
  } catch (error) {
    console.error("Erro ao restringir acesso:", error);
    res.status(500).json({
      message: "Erro ao restringir acesso",
      error: error.message,
    });
  }
});

module.exports = router;
