const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const OrderService = require("../services/orderService");
const ScheduledOrderService = require("../services/scheduledOrderService");

// Instanciar os services
const orderService = new OrderService();
const scheduledOrderService = new ScheduledOrderService();

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

// Listar todos os pedidos do estabelecimento (admin)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar pedidos", error: error.message });
  }
});

// Listar pedidos do usuário autenticado
router.get("/", authenticateToken, async (req, res) => {
  try {
    const orders = await orderService.getOrdersByFirebaseUid(req.user.uid);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar pedidos", error: error.message });
  }
});

// Listar pedidos por Store ID
router.get("/store/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const orders = await orderService.getOrdersByStoreId(storeId);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar pedidos", error: error.message });
  }
});

router.get("/cancelarIfood", async (req, res) => {
  try {
    const { orderId } = req.query; // Corrigido: buscar via query string
    const IfoodService = require("../services/ifoodService");
    const ifoodService = new IfoodService();
    const cancellationReasons = await ifoodService.cancellationReasons(orderId);
    res.status(200).json(cancellationReasons);
  } catch (error) {
    console.error("Erro ao buscar motivos de cancelamento:", error);
    res.status(500).json({
      message: "Erro ao buscar motivos de cancelamento",
      error: error.message,
    });
  }
});

router.post("/cancelarIfood", async (req, res) => {
  try {
    const { orderId, reason } = req.body; // Corrigido: buscar via query string
    const IfoodService = require("../services/ifoodService");
    const ifoodService = new IfoodService();
    const cancellationReasons = await ifoodService.cancelOrder(
      orderId,
      reason.description,
      reason.cancelCodeId
    );
    res.status(200).json(cancellationReasons);
  } catch (error) {
    console.error("Erro ao buscar motivos de cancelamento:", error);
    res.status(500).json({
      message: "Erro ao buscar motivos de cancelamento",
      error: error.message,
    });
  }
});

// Obter pedido por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.findById(id);

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

router.post("/verifyIfoodDeliveryCode", authenticateToken, async (req, res) => {
  try {
    const { orderId, deliveryCode } = req.body;
    const IfoodService = require("../services/ifoodService");
    const ifoodService = new IfoodService();
    const result = await ifoodService.verifyOrderDeliveryCode(
      orderId,
      deliveryCode
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao verificar código de entrega no iFood:", error);
    res.status(500).json({
      message: "Erro ao verificar código de entrega no iFood",
      error: error.message,
    });
  }
});

// Atualizar status do pedido
router.put("/status", authenticateToken, async (req, res) => {
  try {
    const { status, id } = req.body;
    const result = await orderService.updateOrderStatus(
      id,
      status,
      req.user.uid
    );

    // Se o status mudou, enviar notificação via SSE
    if (result.previousStatus !== result.newStatus) {
      // Verificar se a função de notificação existe
      if (req.app.locals.sendEventToStore) {
        // Preparar dados do pedido para a notificação
        const orderData = {
          _id: result.order._id,
          orderNumber: result.order.orderNumber,
          status: result.order.status,
          customer: {
            name: result.order.customer.name || result.order.customer[0]?.name,
          },
          total: result.order.total,
          orderDate: result.order.orderDate,
        };

        // Tentar enviar a notificação
        try {
          const sent = req.app.locals.sendEventToStore(
            req.user.uid,
            "order_status_updated",
            orderData
          );

          if (sent) {
            console.log(`✅ Notificação SSE enviada para ${req.user.uid}`);
          } else {
            console.log(`⚠️ Nenhum cliente SSE conectado para ${req.user.uid}`);
          }
        } catch (notifyError) {
          console.error("❌ Erro ao enviar notificação SSE:", notifyError);
        }
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    res.status(500).json({
      message: "Erro ao atualizar status do pedido",
      error: error.message,
    });
  }
});

// Rota para preview do custo da viagem antes de criar o pedido
router.post("/preview-cost", async (req, res) => {
  try {
    const { store, customer, driveBack } = req.body;
    const result = await orderService.calculatePreviewCost(
      store,
      customer,
      driveBack
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao calcular preview do custo:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao calcular preview do custo",
      error: error.message,
    });
  }
});

// Criar novo pedido
router.post("/", async (req, res) => {
  try {
    const result = await orderService.createOrder(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar pedido", error: error.message });
  }
});

// Nova rota para iniciar busca por motoboy manualmente
router.post("/:id/find-driver", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderService.findDriverForOrder(id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao iniciar busca por motoboy:", error);
    res.status(500).json({
      message: "Erro ao iniciar busca por motoboy",
      error: error.message,
    });
  }
});

// Buscar motoboys próximos para atribuir a um pedido
router.get("/:id/nearby-motoboys", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const maxDistance = req.query.maxDistance || 5000;
    const nearbyMotoboys = await orderService.getNearbyMotoboys(
      id,
      req.user.uid,
      maxDistance
    );
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
    const { id } = req.params;
    const { motoboyId } = req.body;
    const result = await orderService.assignMotoboyToOrder(
      id,
      motoboyId,
      req.user.uid
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao atribuir motoboy ao pedido:", error);
    res.status(500).json({
      message: "Erro ao atribuir motoboy ao pedido",
      error: error.message,
    });
  }
});

// Aceitar pedido (usado pelo motoboy)
router.put("/:id/accept", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { motoboyId } = req.body;
    const result = await orderService.acceptOrder(id, motoboyId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao aceitar pedido:", error);
    res.status(500).json({
      message: "Erro ao aceitar pedido",
      error: error.message,
    });
  }
});

// Endpoint para estatísticas de pedidos
router.get("/stats/summary", authenticateToken, async (req, res) => {
  try {
    const stats = await orderService.getOrdersSummaryStats(req.user.uid);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res
      .status(500)
      .json({ message: "Erro ao obter estatísticas", error: error.message });
  }
});

// Marcar pedido como avaliado
router.post("/:id/rated", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderService.markOrderAsRated(id, req.user.uid);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao enviar avaliação:", error);
    res.status(500).json({
      message: "Erro ao enviar avaliação",
      error: error.message,
    });
  }
});

// Rota de teste para verificar o timer de 15 minutos
router.post("/:id/test-timer", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { testSeconds = 30 } = req.body;

    const order = await orderService.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    if (!order.motoboy?.motoboyId) {
      return res
        .status(400)
        .json({ message: "Pedido não tem motoboy atribuído" });
    }

    const Motoboy = require("../models/Motoboy");
    const motoboy = await Motoboy.findById(order.motoboy.motoboyId);
    if (!motoboy) {
      return res.status(404).json({ message: "Motoboy não encontrado" });
    }

    console.log(
      `🧪 Teste do timer iniciado para pedido ${id} - ${testSeconds}s`
    );

    // Executar timer de teste
    setTimeout(async () => {
      try {
        console.log(
          `⏰ Timer de teste expirado para pedido ${id} após ${testSeconds}s`
        );

        // Simular ações do timer real
        // Aqui você pode adicionar a lógica específica do timer
      } catch (timerError) {
        console.error("❌ Erro no timer de teste:", timerError);
      }
    }, testSeconds * 1000);

    res.status(200).json({
      message: `Timer de teste iniciado - ${testSeconds} segundos`,
      orderId: id,
      motoboyId: motoboy._id,
      travelId: motoboy.race?.travelId,
    });
  } catch (error) {
    console.error("Erro no teste do timer:", error);
    res.status(500).json({
      message: "Erro no teste do timer",
      error: error.message,
    });
  }
});

// ========== ROTAS PARA PEDIDOS AGENDADOS ==========

// Listar pedidos agendados
router.get("/scheduled", authenticateToken, async (req, res) => {
  try {
    const scheduledOrders = await scheduledOrderService.getScheduledOrders();
    res.json({
      success: true,
      data: scheduledOrders,
      count: scheduledOrders.length,
    });
  } catch (error) {
    console.error("Erro ao listar pedidos agendados:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar pedidos agendados",
      error: error.message,
    });
  }
});

// Obter estatísticas de pedidos agendados
router.get("/scheduled/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await scheduledOrderService.getScheduledOrdersStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas de pedidos agendados:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas de pedidos agendados",
      error: error.message,
    });
  }
});

// Reagendar um pedido
router.patch("/:orderId/reschedule", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newScheduledDateTime } = req.body;

    if (!newScheduledDateTime) {
      return res.status(400).json({
        success: false,
        message: "Nova data de agendamento é obrigatória",
      });
    }

    const result = await scheduledOrderService.rescheduleOrder(
      orderId,
      new Date(newScheduledDateTime)
    );

    if (result) {
      res.json({
        success: true,
        message: "Pedido reagendado com sucesso",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Pedido não encontrado ou erro ao reagendar",
      });
    }
  } catch (error) {
    console.error("Erro ao reagendar pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao reagendar pedido",
      error: error.message,
    });
  }
});

// Cancelar agendamento de um pedido
router.delete("/:orderId/schedule", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const cancelled = scheduledOrderService.cancelScheduledOrder(orderId);

    if (cancelled) {
      res.json({
        success: true,
        message: "Agendamento cancelado com sucesso",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Agendamento não encontrado",
      });
    }
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao cancelar agendamento",
      error: error.message,
    });
  }
});

// Processar um pedido agendado imediatamente (força o processamento)
router.post(
  "/:orderId/process-scheduled",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;

      await scheduledOrderService.processScheduledOrder(orderId);

      res.json({
        success: true,
        message: "Pedido agendado processado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao processar pedido agendado:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao processar pedido agendado",
        error: error.message,
      });
    }
  }
);

router.post("/arrivedDestination", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "ID do pedido é obrigatório",
      });
    }

    const result = await orderService.arrivedDestination(orderId);

    res.json({
      success: true,
      message: result.message,
      data: result.order,
    });
  } catch (error) {
    console.error("Erro ao marcar pedido como entregue:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao marcar pedido como entregue",
      error: error.message,
    });
  }
});

module.exports = router;
