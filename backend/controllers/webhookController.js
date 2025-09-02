const OrderImportService = require("../services/orderImportService");
const Order = require("../models/Order");
const OrderService = require("../services/orderService");
const ScheduledOrderService = require("../services/scheduledOrderService");

class WebhookController {
  constructor(orderService) {
    this.orderImportService = new OrderImportService(orderService);
    this.scheduledOrderService = new ScheduledOrderService();
  }

  async handleIfoodWebhook(req, res) {
    try {
      const { fullCode, orderId } = req.body;

      if (fullCode === "PLACED") {
        //só em modo desenvolvimento

        // Primeiro, tentar identificar o store pelo pedido existente
        let storeFirebaseUid = null;
        const verifyOrder = await Order.findOne({
          ifoodId: orderId,
        }).populate("store");

        if (verifyOrder && verifyOrder.store && verifyOrder.store.firebaseUid) {
          storeFirebaseUid = verifyOrder.store.firebaseUid;
          console.log("[IFOOD] Pedido já existente:", verifyOrder);
        }

        // Se não encontrou o store, terá que tentar com as credenciais globais
        const IfoodService = require("../services/ifoodService");
        const ifoodService = new IfoodService();

        const orderDetails = await ifoodService.getOrderDetails(
          orderId,
          storeFirebaseUid
        );

        // Verificar se é um pedido agendado
        const isScheduled = orderDetails.orderTiming === "SCHEDULED";

        console.log(
          `[IFOOD] Pedido ${orderId} - Tipo: ${orderDetails.orderType}, Timing: ${orderDetails.orderTiming}, Agendado: ${isScheduled}`
        );

        if (isScheduled && orderDetails.scheduledDateTime) {
          console.log(
            `[IFOOD] Data de agendamento: ${orderDetails.scheduledDateTime}`
          );
        }

        const localOrder =
          await this.orderImportService.convertIfoodOrderToLocal(orderDetails);
        await this.orderImportService.orderService.createOrder(localOrder);

        // Se é pedido agendado, agendar processamento para o horário correto
        if (isScheduled && orderDetails.scheduledDateTime) {
          const createdOrder = await Order.findOne({ ifoodId: orderId });
          if (createdOrder) {
            await this.scheduledOrderService.scheduleOrder(
              createdOrder,
              orderDetails.scheduledDateTime
            );
          }
        }

        // const confirmOrder = await ifoodService.confirmOrder(
        //   orderId,
        //   storeFirebaseUid
        // );
        // console.log("[IFOOD] Pedido confirmado:");
      }

      if (fullCode === "CONFIRMED") {
        // Importar o novo pedido
        // Primeiro tentar identificar o store do pedido
        const IfoodService = require("../services/ifoodService");
        let ifoodService = new IfoodService();
        let storeFirebaseUid = await ifoodService.getStoreFromOrderId(orderId);

        if (storeFirebaseUid) {
          ifoodService = await IfoodService.createForStore(storeFirebaseUid);
        }

        const orderIdSystem = await Order.findOne({ ifoodId: orderId });

        const orderService = new OrderService();

        // Se é pedido agendado, ainda não começar preparo
        if (orderIdSystem.isScheduled) {
          console.log(
            `[IFOOD] Pedido agendado ${orderId} confirmado, aguardando horário: ${orderIdSystem.scheduledDateTime}`
          );
          await orderService.updateOrderStatus(orderIdSystem._id, "agendado");
        } else {
          // Pedido normal - seguir fluxo padrão
          if (orderIdSystem.deliveryMode !== "entrega") {
            orderService.updateOrderStatus(orderIdSystem._id, "ready_takeout");
          } else {
            await orderService.findDriverForOrder(orderIdSystem);
          }
        }
      }
      if (fullCode === "SEPARATION_ENDED") {
        const orderService = new (require("../services/orderService"))();
        let storeFirebaseUid = null;
        const verifyOrder = await Order.findOne({
          ifoodId: orderId,
        }).populate("store");

        // Se não encontrou o store, terá que tentar com as credenciais globais
        const IfoodService = require("../services/ifoodService");
        const ifoodService = new IfoodService();

        const orderDetails = await ifoodService.getOrderDetails(
          orderId,
          storeFirebaseUid
        );

        if (verifyOrder.deliveryMode !== "entrega") {
          orderService.updateOrderStatus(verifyOrder._id, "ready_takeout");
        } else {
          await orderService.updateOrderStatus(verifyOrder._id, "pronto");
        }
      }

      if (fullCode === "CANCELLATION_REQUESTED") {
        const orderService = new (require("../services/orderService"))();
        await orderService.updateOrderStatus(orderId, "cancelado");
      }
      if (fullCode === "CANCELLED") {
        const orderService = new (require("../services/orderService"))();
        await orderService.updateOrderStatus(orderId, "cancelado");
      }
      if (fullCode === "CONCLUDED") {
        const orderService = new (require("../services/orderService"))();
        await orderService.updateOrderStatus(orderId, "entregue");
      }
      res.status(200).json({ message: "Webhook processado com sucesso" });
    } catch (error) {
      console.error("Erro no webhook:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Novo método para agendar processamento de pedidos
  async scheduleOrderProcessing(order, scheduledDateTime) {
    const scheduledTime = new Date(scheduledDateTime);
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay > 0) {
      console.log(
        `[IFOOD] Agendando processamento do pedido ${order.ifoodId} para ${scheduledTime}`
      );

      setTimeout(async () => {
        try {
          console.log(
            `[IFOOD] Iniciando processamento do pedido agendado ${order.ifoodId}`
          );

          // Buscar pedido atualizado do banco
          const currentOrder = await Order.findOne({ ifoodId: order.ifoodId });

          if (!currentOrder) {
            console.log(`[IFOOD] Pedido ${order.ifoodId} não encontrado`);
            return;
          }

          if (currentOrder.status === "cancelado") {
            console.log(`[IFOOD] Pedido ${order.ifoodId} foi cancelado`);
            return;
          }

          // Confirmar pedido no iFood se ainda não foi confirmado
          const IfoodService = require("../services/ifoodService");
          const ifoodService = new IfoodService();

          try {
            await ifoodService.confirmOrder(order.ifoodId);
            console.log(
              `[IFOOD] Pedido agendado ${order.ifoodId} confirmado automaticamente`
            );
          } catch (confirmError) {
            console.log(
              `[IFOOD] Erro ao confirmar pedido agendado: ${confirmError.message}`
            );
          }

          // Atualizar status para em_preparo e iniciar fluxo normal
          const OrderService = require("../services/orderService");
          const orderService = new OrderService();

          await orderService.updateOrderStatus(currentOrder._id, "em_preparo");

          // Se é delivery, buscar motorista
          if (currentOrder.deliveryMode === "entrega") {
            await orderService.findDriverForOrder(currentOrder);
          } else {
            // Se é retirada, marcar como pronto
            await orderService.updateOrderStatus(
              currentOrder._id,
              "ready_takeout"
            );
          }
        } catch (error) {
          console.error(
            `[IFOOD] Erro ao processar pedido agendado ${order.ifoodId}:`,
            error
          );
        }
      }, delay);
    } else {
      console.log(
        `[IFOOD] Pedido ${order.ifoodId} agendado para o passado, processando imediatamente`
      );
      // Se o horário já passou, processar imediatamente
      const OrderService = require("../services/orderService");
      const orderService = new OrderService();
      await orderService.updateOrderStatus(order._id, "em_preparo");
    }
  }
}

module.exports = WebhookController;
