const OrderImportService = require("../services/orderImportService");
const Order = require("../models/Order");
class WebhookController {
  constructor(orderService) {
    this.orderImportService = new OrderImportService(orderService);
  }

  async handleIfoodWebhook(req, res) {
    try {
      const { fullCode, orderId } = req.body;

      if (fullCode === "PLACED") {
        const ifoodService = new (require("../services/ifoodService"))();
        const verifyOrder = await Order.find({ ifoodId: orderId });
        if (verifyOrder.length > 0) {
          console.log("[IFOOD] Pedido já existente:", verifyOrder);
        }
        const confirmOrder = await ifoodService.confirmOrder(orderId);
        console.log("[IFOOD] Pedido confirmado:");
      }

      if (fullCode === "CONFIRMED") {
        // Importar o novo pedido
        const ifoodService = new (require("../services/ifoodService"))();
        const orderDetails = await ifoodService.getOrderDetails(orderId);
        const localOrder =
          await this.orderImportService.convertIfoodOrderToLocal(orderDetails);
        await this.orderImportService.orderService.createOrder(localOrder);
      }

      if (fullCode === "CANCELLATION_REQUESTED") {
        const orderService = new (require("../services/orderService"))();
        await orderService.updateOrderStatus(orderId, "cancelado");
        console.log("[IFOOD] Pedido cancelado:", orderId);
      }
      res.status(200).json({ message: "Webhook processado com sucesso" });
    } catch (error) {
      console.error("Erro no webhook:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
}

module.exports = WebhookController;
