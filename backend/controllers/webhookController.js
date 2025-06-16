const OrderImportService = require("../services/orderImportService");

class WebhookController {
  constructor(orderService) {
    this.orderImportService = new OrderImportService(orderService);
  }

  async handleIfoodWebhook(req, res) {
    try {
      const { eventType, orderId } = req.body;

      if (eventType === "ORDER_PLACED") {
        // Importar o novo pedido
        const ifoodService = new (require("../services/ifoodService"))();
        const orderDetails = await ifoodService.getOrderDetails(orderId);
        const localOrder =
          this.orderImportService.convertIfoodOrderToLocal(orderDetails);
        await this.orderImportService.orderService.create(localOrder);

        console.log(`Pedido ${orderId} importado com sucesso`);
      }

      res.status(200).json({ message: "Webhook processado com sucesso" });
    } catch (error) {
      console.error("Erro no webhook:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
}

module.exports = WebhookController;
