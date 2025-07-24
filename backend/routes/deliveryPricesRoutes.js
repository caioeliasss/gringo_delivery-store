const express = require("express");
const router = express.Router();
const {
  getDeliveryPrice,
  updateDeliveryPrice,
  createDeliveryPrice,
  resetDeliveryPrice,
} = require("../controllers/deliveryPriceController");

// Importar a função de notificação e modelos necessários
const Motoboy = require("../models/Motoboy");
const fullScreenNotificationService = require("../services/fullScreenNotificationService");

// Função auxiliar para notificar motoboys (duplicada do controller para usar nas rotas)
const notifyMotoboysAboutPriceChange = async (
  changeType,
  isActive,
  priceValue
) => {
  try {
    const motoboys = await Motoboy.find({
      isApproved: true,
      $or: [
        { fcmToken: { $exists: true, $ne: null } },
        { firebaseUid: { $exists: true, $ne: null } },
      ],
    });

    if (motoboys.length === 0) return;

    let title, message;

    if (changeType === "rain") {
      if (isActive) {
        title = "🌧️ MODO CHUVA ATIVADO!";
        message = `Agora você ganha R$ ${priceValue.toFixed(
          2
        )} a mais por entrega! 💰`;
      } else {
        title = "☀️ Modo Chuva Desativado";
        message = "O bônus de chuva não está mais ativo";
      }
    } else if (changeType === "highDemand") {
      if (isActive) {
        title = "🔥 ALTA DEMANDA ATIVADA!";
        message = `Preço fixo aumentado para R$ ${priceValue.toFixed(
          2
        )}! Aproveite! 🚀`;
      } else {
        title = "📉 Alta Demanda Desativada";
        message = "O preço voltou ao normal";
      }
    }

    const notifications = motoboys.map(async (motoboy) => {
      try {
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
            priority: "high",
            showAsPopup: true,
          },
          timeoutSeconds: 15,
        });
      } catch (error) {
        console.error(`❌ Erro ao notificar ${motoboy.name}:`, error.message);
      }
    });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error("❌ Erro ao notificar motoboys:", error);
  }
};

// GET /api/delivery-price - Obter configurações atuais de precificação
router.get("/", getDeliveryPrice);

// PUT /api/delivery-price - Atualizar configurações de precificação
router.put("/", updateDeliveryPrice);

// POST /api/delivery-price - Criar nova configuração de precificação
router.post("/", createDeliveryPrice);

// DELETE /api/delivery-price - Resetar configurações para valores padrão
router.delete("/", resetDeliveryPrice);

// GET /api/delivery-price/status - Verificar status das configurações especiais
router.get("/status", async (req, res) => {
  try {
    const DeliveryPrice = require("../models/DeliveryPrice");
    const deliveryPrice = await DeliveryPrice.findOne().sort({ updatedAt: -1 });

    if (!deliveryPrice) {
      return res.status(404).json({
        message: "Configurações de precificação não encontradas",
      });
    }

    res.status(200).json({
      isRain: deliveryPrice.isRain,
      isHighDemand: deliveryPrice.isHighDemand,
      rainPrice: deliveryPrice.priceRain,
      highDemandPrice: deliveryPrice.fixedPriceHigh,
      lastUpdated: deliveryPrice.updatedAt,
    });
  } catch (error) {
    console.error("Erro ao buscar status das configurações:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
});

// PATCH /api/delivery-price/toggle-rain - Toggle do modo chuva
router.patch("/toggle-rain", async (req, res) => {
  try {
    const DeliveryPrice = require("../models/DeliveryPrice");
    let deliveryPrice = await DeliveryPrice.findOne().sort({ updatedAt: -1 });

    if (!deliveryPrice) {
      return res.status(404).json({
        message: "Configurações de precificação não encontradas",
      });
    }

    const oldRainStatus = deliveryPrice.isRain;
    deliveryPrice.isRain = !deliveryPrice.isRain;
    await deliveryPrice.save();

    // Notificar motoboys sobre a mudança
    console.log(`🌧️ Toggle chuva: ${oldRainStatus} -> ${deliveryPrice.isRain}`);
    notifyMotoboysAboutPriceChange(
      "rain",
      deliveryPrice.isRain,
      deliveryPrice.priceRain
    ).catch((error) =>
      console.error("Erro ao notificar sobre toggle chuva:", error)
    );

    res.status(200).json({
      message: `Modo chuva ${
        deliveryPrice.isRain ? "ativado" : "desativado"
      } com sucesso`,
      isRain: deliveryPrice.isRain,
      priceRain: deliveryPrice.priceRain,
    });
  } catch (error) {
    console.error("Erro ao alternar modo chuva:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
});

// PATCH /api/delivery-price/toggle-high-demand - Toggle do modo alta demanda
router.patch("/toggle-high-demand", async (req, res) => {
  try {
    const DeliveryPrice = require("../models/DeliveryPrice");
    let deliveryPrice = await DeliveryPrice.findOne().sort({ updatedAt: -1 });

    if (!deliveryPrice) {
      return res.status(404).json({
        message: "Configurações de precificação não encontradas",
      });
    }

    const oldHighDemandStatus = deliveryPrice.isHighDemand;
    deliveryPrice.isHighDemand = !deliveryPrice.isHighDemand;
    await deliveryPrice.save();

    // Notificar motoboys sobre a mudança
    console.log(
      `🔥 Toggle alta demanda: ${oldHighDemandStatus} -> ${deliveryPrice.isHighDemand}`
    );
    notifyMotoboysAboutPriceChange(
      "highDemand",
      deliveryPrice.isHighDemand,
      deliveryPrice.fixedPriceHigh
    ).catch((error) =>
      console.error("Erro ao notificar sobre toggle alta demanda:", error)
    );

    res.status(200).json({
      message: `Modo alta demanda ${
        deliveryPrice.isHighDemand ? "ativado" : "desativado"
      } com sucesso`,
      isHighDemand: deliveryPrice.isHighDemand,
      fixedPriceHigh: deliveryPrice.fixedPriceHigh,
    });
  } catch (error) {
    console.error("Erro ao alternar modo alta demanda:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
});

// POST /api/delivery-price/notify-motoboys - Enviar notificação manual para todos os motoboys
router.post("/notify-motoboys", async (req, res) => {
  try {
    const {
      title,
      message,
      changeType = "manual",
      includeCurrentPrices = true,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Título e mensagem são obrigatórios",
      });
    }

    let finalMessage = message;

    // Se solicitado, incluir preços atuais na mensagem
    if (includeCurrentPrices) {
      const DeliveryPrice = require("../models/DeliveryPrice");
      const currentPrices = await DeliveryPrice.findOne().sort({
        updatedAt: -1,
      });

      if (currentPrices) {
        const priceInfo = [];
        if (currentPrices.isRain && currentPrices.priceRain > 0) {
          priceInfo.push(`🌧️ Chuva: +R$ ${currentPrices.priceRain.toFixed(2)}`);
        }
        if (currentPrices.isHighDemand && currentPrices.fixedPriceHigh > 0) {
          priceInfo.push(
            `🔥 Alta Demanda: R$ ${currentPrices.fixedPriceHigh.toFixed(2)}`
          );
        }
        if (priceInfo.length > 0) {
          finalMessage += `\n\n${priceInfo.join(" | ")}`;
        }
      }
    }

    // Buscar todos os motoboys
    const motoboys = await Motoboy.find({
      isApproved: true,
      $or: [
        { fcmToken: { $exists: true, $ne: null } },
        { firebaseUid: { $exists: true, $ne: null } },
      ],
    });

    if (motoboys.length === 0) {
      return res.status(404).json({
        message: "Nenhum motoboy encontrado para notificar",
      });
    }

    // Enviar notificações
    const notifications = motoboys.map(async (motoboy) => {
      try {
        await fullScreenNotificationService.createFullScreenNotification({
          recipientId: motoboy._id,
          recipientType: "motoboy",
          title: title,
          message: finalMessage,
          callType: "manual_notification",
          data: {
            changeType,
            isManual: true,
            priority: "normal",
          },
          timeoutSeconds: 20,
        });
        return { success: true, motoboyId: motoboy._id, name: motoboy.name };
      } catch (error) {
        console.error(`❌ Erro ao notificar ${motoboy.name}:`, error.message);
        return {
          success: false,
          motoboyId: motoboy._id,
          name: motoboy.name,
          error: error.message,
        };
      }
    });

    const results = await Promise.allSettled(notifications);
    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    res.status(200).json({
      message: `Notificação enviada para ${successCount} de ${motoboys.length} motoboys`,
      totalMotoboys: motoboys.length,
      successCount,
      details: results.map((r) =>
        r.status === "fulfilled" ? r.value : { success: false, error: r.reason }
      ),
    });
  } catch (error) {
    console.error("❌ Erro ao enviar notificação manual:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
});

module.exports = router;
