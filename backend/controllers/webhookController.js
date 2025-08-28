const OrderImportService = require("../services/orderImportService");
const Order = require("../models/Order");
const OrderService = require("../services/orderService");
class WebhookController {
  constructor(orderService) {
    this.orderImportService = new OrderImportService(orderService);
  }

  async handleIfoodWebhook(req, res) {
    try {
      const { fullCode, orderId } = req.body;

      if (fullCode === "PLACED") {
        //só em modo desenvovimento

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
        const ifoodService = storeFirebaseUid
          ? await IfoodService.createForStore(storeFirebaseUid)
          : new IfoodService();

        if (storeFirebaseUid) {
          ifoodService = await IfoodService.createForStore(storeFirebaseUid);
        }

        const orderDetails = await ifoodService.getOrderDetails(
          orderId,
          storeFirebaseUid
        );
        const localOrder =
          await this.orderImportService.convertIfoodOrderToLocal(orderDetails);
        await this.orderImportService.orderService.createOrder(localOrder);

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
        if (orderIdSystem.deliveryMode !== "delivery") {
          orderService.updateOrderStatus(orderIdSystem._id, "ready_takeout");
        } else {
          await orderService.findDriverForOrder(orderIdSystem);
        }
      }

      if (fullCode === "CANCELLATION_REQUESTED") {
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
}

module.exports = WebhookController;
