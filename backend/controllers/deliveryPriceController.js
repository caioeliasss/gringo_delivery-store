const DeliveryPrice = require("../models/DeliveryPrice");
const Motoboy = require("../models/Motoboy");
const fullScreenNotificationService = require("../services/fullScreenNotificationService");

// Função para enviar notificações para todos os motoboys
const notifyAllMotoboysAboutPriceChange = async (
  changeType,
  isActive,
  priceValue
) => {
  try {
    // Buscar todos os motoboys aprovados
    const motoboys = await Motoboy.find({
      isApproved: true,
      $or: [
        { fcmToken: { $exists: true, $ne: null } },
        { firebaseUid: { $exists: true, $ne: null } },
      ],
    });

    if (motoboys.length === 0) {
      console.log("Nenhum motoboy encontrado para notificar");
      return;
    }

    let title, message, emoji;

    if (changeType === "rain") {
      if (isActive) {
        title = "🌧️ MODO CHUVA ATIVADO!";
        message = `Agora você ganha R$ ${priceValue.toFixed(
          2
        )} a mais por entrega! 💰`;
        emoji = "🌧️💰";
      } else {
        title = "☀️ Modo Chuva Desativado";
        message = "O bônus de chuva não está mais ativo";
        emoji = "☀️";
      }
    } else if (changeType === "highDemand") {
      if (isActive) {
        title = "🔥 ALTA DEMANDA ATIVADA!";
        message = `Preço fixo aumentado para R$ ${priceValue.toFixed(
          2
        )}! Aproveite! 🚀`;
        emoji = "🔥🚀";
      } else {
        title = "📉 Alta Demanda Desativada";
        message = "O preço voltou ao normal";
        emoji = "📉";
      }
    }

    console.log(
      `📢 Enviando notificação para ${motoboys.length} motoboys: ${title}`
    );

    // Enviar notificação para cada motoboy
    const notifications = motoboys.map(async (motoboy) => {
      try {
        // Usando o serviço de notificação fullscreen existente
        await fullScreenNotificationService.createFullScreenNotification({
          recipientId: motoboy._id,
          recipientType: "motoboy",
          title: title,
          message: message,
          callType: "price_update",
          data: {
            changeType,
            isActive,
            priceValue,
            emoji,
            priority: "high",
            showAsPopup: true,
          },
          timeoutSeconds: 15, // Notificação mais curta
        });

        console.log(`✅ Notificação enviada para ${motoboy.name}`);
      } catch (error) {
        console.error(`❌ Erro ao notificar ${motoboy.name}:`, error.message);
      }
    });

    await Promise.allSettled(notifications);
    console.log(
      `📱 Processo de notificação concluído para ${motoboys.length} motoboys`
    );
  } catch (error) {
    console.error(
      "❌ Erro ao notificar motoboys sobre mudança de preço:",
      error
    );
  }
};

// GET - Obter configurações de precificação
const getDeliveryPrice = async (req, res) => {
  try {
    // Busca a configuração mais recente (deveria ter apenas uma)
    let deliveryPrice = await DeliveryPrice.findOne().sort({ updatedAt: -1 });

    // Se não existir nenhuma configuração, cria uma padrão
    if (!deliveryPrice) {
      deliveryPrice = new DeliveryPrice({
        fixedKm: 0,
        fixedPriceHigh: 0,
        fixedPrice: 0,
        bonusKm: 0,
        priceRain: 0,
        isRain: false,
        isHighDemand: false,
        driveBack: 0,
      });
      await deliveryPrice.save();
    }

    res.status(200).json(deliveryPrice);
  } catch (error) {
    console.error("Erro ao buscar configuração de preços:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
};

// PUT - Atualizar configurações de precificação
const updateDeliveryPrice = async (req, res) => {
  try {
    const {
      fixedKm,
      fixedPriceHigh,
      fixedPrice,
      bonusKm,
      priceRain,
      isRain,
      isHighDemand,
      driveBack,
    } = req.body;

    // Validação dos dados
    const numericFields = {
      fixedKm,
      fixedPriceHigh,
      fixedPrice,
      bonusKm,
      priceRain,
      driveBack,
    };
    for (const [field, value] of Object.entries(numericFields)) {
      if (value !== undefined && (isNaN(value) || value < 0)) {
        return res.status(400).json({
          message: `O campo ${field} deve ser um número positivo`,
        });
      }
    }

    if (isRain !== undefined && typeof isRain !== "boolean") {
      return res.status(400).json({
        message: "O campo isRain deve ser um valor booleano",
      });
    }

    if (isHighDemand !== undefined && typeof isHighDemand !== "boolean") {
      return res.status(400).json({
        message: "O campo isHighDemand deve ser um valor booleano",
      });
    }

    // Busca a configuração existente
    let deliveryPrice = await DeliveryPrice.findOne().sort({ updatedAt: -1 });

    // Variáveis para detectar mudanças que precisam de notificação
    let rainChanged = false;
    let highDemandChanged = false;
    let oldRainStatus = false;
    let oldHighDemandStatus = false;

    if (!deliveryPrice) {
      // Se não existe, cria uma nova
      deliveryPrice = new DeliveryPrice({
        fixedKm: fixedKm || 0,
        fixedPriceHigh: fixedPriceHigh || 0,
        fixedPrice: fixedPrice || 0,
        bonusKm: bonusKm || 0,
        priceRain: priceRain || 0,
        isRain: isRain || false,
        isHighDemand: isHighDemand || false,
        driveBack: driveBack || 0,
      });

      // Se está criando pela primeira vez e ativando modo chuva/alta demanda
      if (isRain === true) rainChanged = true;
      if (isHighDemand === true) highDemandChanged = true;
    } else {
      // Detectar mudanças nos campos que precisam de notificação
      oldRainStatus = deliveryPrice.isRain;
      oldHighDemandStatus = deliveryPrice.isHighDemand;

      if (isRain !== undefined && isRain !== oldRainStatus) {
        rainChanged = true;
      }
      if (isHighDemand !== undefined && isHighDemand !== oldHighDemandStatus) {
        highDemandChanged = true;
      }

      // Atualiza os campos fornecidos
      if (fixedKm !== undefined) deliveryPrice.fixedKm = fixedKm;
      if (fixedPriceHigh !== undefined)
        deliveryPrice.fixedPriceHigh = fixedPriceHigh;
      if (fixedPrice !== undefined) deliveryPrice.fixedPrice = fixedPrice;
      if (bonusKm !== undefined) deliveryPrice.bonusKm = bonusKm;
      if (priceRain !== undefined) deliveryPrice.priceRain = priceRain;
      if (isRain !== undefined) deliveryPrice.isRain = isRain;
      if (isHighDemand !== undefined) deliveryPrice.isHighDemand = isHighDemand;
      if (driveBack !== undefined) deliveryPrice.driveBack = driveBack;
    }

    await deliveryPrice.save();

    // Enviar notificações se houve mudanças relevantes
    if (rainChanged) {
      console.log(
        `🌧️ Modo chuva ${
          deliveryPrice.isRain ? "ATIVADO" : "DESATIVADO"
        } - Notificando motoboys...`
      );
      // Não aguardar a notificação para não bloquear a resposta
      notifyAllMotoboysAboutPriceChange(
        "rain",
        deliveryPrice.isRain,
        deliveryPrice.priceRain
      ).catch((error) =>
        console.error("Erro ao notificar sobre chuva:", error)
      );
    }

    if (highDemandChanged) {
      console.log(
        `🔥 Alta demanda ${
          deliveryPrice.isHighDemand ? "ATIVADA" : "DESATIVADA"
        } - Notificando motoboys...`
      );
      // Não aguardar a notificação para não bloquear a resposta
      notifyAllMotoboysAboutPriceChange(
        "highDemand",
        deliveryPrice.isHighDemand,
        deliveryPrice.fixedPriceHigh
      ).catch((error) =>
        console.error("Erro ao notificar sobre alta demanda:", error)
      );
    }

    res.status(200).json({
      message: "Configurações de precificação atualizadas com sucesso",
      data: deliveryPrice,
    });
  } catch (error) {
    console.error("Erro ao atualizar configuração de preços:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
};

// POST - Criar nova configuração de precificação (sobrescreve a existente)
const createDeliveryPrice = async (req, res) => {
  try {
    const {
      fixedKm,
      fixedPriceHigh,
      fixedPrice,
      bonusKm,
      priceRain,
      isRain,
      isHighDemand,
      driveBack,
    } = req.body;

    // Validação dos dados obrigatórios (se necessário)
    const numericFields = {
      fixedKm,
      fixedPriceHigh,
      fixedPrice,
      bonusKm,
      priceRain,
      driveBack,
    };
    for (const [field, value] of Object.entries(numericFields)) {
      if (value !== undefined && (isNaN(value) || value < 0)) {
        return res.status(400).json({
          message: `O campo ${field} deve ser um número positivo`,
        });
      }
    }

    // Remove a configuração existente (mantém apenas uma)
    await DeliveryPrice.deleteMany({});

    // Cria a nova configuração
    const deliveryPrice = new DeliveryPrice({
      fixedKm: fixedKm || 0,
      fixedPriceHigh: fixedPriceHigh || 0,
      fixedPrice: fixedPrice || 0,
      bonusKm: bonusKm || 0,
      priceRain: priceRain || 0,
      isRain: isRain || false,
      isHighDemand: isHighDemand || false,
      driveBack: driveBack || 0,
    });

    await deliveryPrice.save();

    res.status(201).json({
      message: "Configuração de precificação criada com sucesso",
      data: deliveryPrice,
    });
  } catch (error) {
    console.error("Erro ao criar configuração de preços:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
};

// DELETE - Resetar configurações para valores padrão
const resetDeliveryPrice = async (req, res) => {
  try {
    // Remove todas as configurações existentes
    await DeliveryPrice.deleteMany({});

    // Cria uma nova configuração com valores padrão
    const deliveryPrice = new DeliveryPrice({
      fixedKm: 0,
      fixedPriceHigh: 0,
      fixedPrice: 0,
      bonusKm: 0,
      priceRain: 0,
      isRain: false,
      isHighDemand: false,
      driveBack: 0,
    });

    await deliveryPrice.save();

    res.status(200).json({
      message: "Configurações de precificação resetadas para valores padrão",
      data: deliveryPrice,
    });
  } catch (error) {
    console.error("Erro ao resetar configuração de preços:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getDeliveryPrice,
  updateDeliveryPrice,
  createDeliveryPrice,
  resetDeliveryPrice,
};
