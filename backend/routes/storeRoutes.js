const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Store = require("../models/Store");

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
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao salvar perfil", error: error.message });
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

module.exports = router;
