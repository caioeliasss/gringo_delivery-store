const Order = require("../models/Order");
const OrderService = require("./orderService");
const IfoodService = require("./ifoodService");
const cron = require("node-cron");

class ScheduledOrderService {
  constructor() {
    this.orderService = new OrderService();
    this.scheduledJobs = new Map(); // Para rastrear jobs agendados
    this.startPeriodicCheck(); // Iniciar verificação periódica
  }

  /**
   * Agendar um pedido para processamento futuro
   * @param {Object} order - Pedido a ser agendado
   * @param {Date} scheduledDateTime - Data e hora do agendamento
   */
  async scheduleOrder(order, scheduledDateTime) {
    const scheduledTime = new Date(scheduledDateTime);
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    console.log(
      `📅 [SCHEDULED] Agendando pedido ${
        order.orderNumber
      } para ${scheduledTime.toLocaleString("pt-BR")}`
    );

    if (delay > 0) {
      // Criar timeout para o agendamento
      const timeoutId = setTimeout(async () => {
        await this.processScheduledOrder(order._id || order.ifoodId);
        this.scheduledJobs.delete(order._id || order.ifoodId);
      }, delay);

      // Guardar referência do job para poder cancelar se necessário
      this.scheduledJobs.set(order._id || order.ifoodId, {
        timeoutId,
        scheduledTime,
        order,
      });

      console.log(
        `✅ [SCHEDULED] Pedido ${
          order.orderNumber
        } agendado com sucesso para ${scheduledTime.toLocaleString("pt-BR")}`
      );
    } else {
      console.log(
        `⚡ [SCHEDULED] Pedido ${order.orderNumber} agendado para o passado, processando imediatamente`
      );
      await this.processScheduledOrder(order._id || order.ifoodId);
    }
  }

  /**
   * Processar um pedido agendado
   * @param {String} orderId - ID do pedido
   */
  async processScheduledOrder(orderId) {
    try {
      console.log(
        `🚀 [SCHEDULED] Iniciando processamento do pedido agendado ${orderId}`
      );

      // Buscar pedido no banco
      const order = await Order.findOne({
        $or: [{ _id: orderId }, { ifoodId: orderId }],
      });

      if (!order) {
        console.log(`❌ [SCHEDULED] Pedido ${orderId} não encontrado`);
        return;
      }

      if (order.status === "cancelado") {
        console.log(`❌ [SCHEDULED] Pedido ${orderId} foi cancelado`);
        return;
      }

      // Se ainda está agendado, processar
      if (order.status === "agendado") {
        console.log(
          `📋 [SCHEDULED] Processando pedido agendado ${order.orderNumber}`
        );

        // Confirmar pedido no iFood se for necessário
        if (order.ifoodId) {
          try {
            const ifoodService = new IfoodService();
            await ifoodService.confirmOrder(order.ifoodId);
            console.log(
              `✅ [SCHEDULED] Pedido ${order.ifoodId} confirmado no iFood`
            );
          } catch (confirmError) {
            console.log(
              `⚠️ [SCHEDULED] Erro ao confirmar no iFood: ${confirmError.message}`
            );
          }
        }

        // Atualizar status para em_preparo
        await this.orderService.updateOrderStatus(order._id, "em_preparo");
        console.log(
          `📋 [SCHEDULED] Pedido ${order.orderNumber} movido para 'em_preparo'`
        );

        // Se é delivery, buscar motorista
        if (order.deliveryMode === "entrega") {
          console.log(
            `🏍️ [SCHEDULED] Buscando motorista para pedido ${order.orderNumber}`
          );
          await this.orderService.findDriverForOrder(order);
        } else {
          // Se é retirada, marcar como pronto
          console.log(
            `📦 [SCHEDULED] Marcando pedido ${order.orderNumber} como pronto para retirada`
          );
          await this.orderService.updateOrderStatus(order._id, "ready_takeout");
        }

        console.log(
          `✅ [SCHEDULED] Pedido agendado ${order.orderNumber} processado com sucesso`
        );
      } else {
        console.log(
          `⚠️ [SCHEDULED] Pedido ${order.orderNumber} não está mais agendado (status: ${order.status})`
        );
      }
    } catch (error) {
      console.error(
        `❌ [SCHEDULED] Erro ao processar pedido agendado ${orderId}:`,
        error
      );
    }
  }

  /**
   * Cancelar agendamento de um pedido
   * @param {String} orderId - ID do pedido
   */
  cancelScheduledOrder(orderId) {
    const job = this.scheduledJobs.get(orderId);
    if (job) {
      clearTimeout(job.timeoutId);
      this.scheduledJobs.delete(orderId);
      console.log(
        `🚫 [SCHEDULED] Agendamento cancelado para pedido ${orderId}`
      );
      return true;
    }
    return false;
  }

  /**
   * Verificação periódica para pedidos agendados perdidos
   * Executa a cada 5 minutos
   */
  startPeriodicCheck() {
    // Executa a cada 5 minutos
    cron.schedule("*/5 * * * *", async () => {
      await this.checkMissedScheduledOrders();
    });

    console.log(
      "🔄 [SCHEDULED] Verificação periódica de pedidos agendados iniciada (a cada 5 minutos)"
    );
  }

  /**
   * Verificar pedidos agendados que podem ter sido perdidos
   */
  async checkMissedScheduledOrders() {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Buscar pedidos agendados cuja data já passou
      const missedOrders = await Order.find({
        status: "agendado",
        scheduledDateTime: {
          $lt: now,
          $gte: fiveMinutesAgo, // Só últimos 5 minutos para evitar processar pedidos muito antigos
        },
      });

      if (missedOrders.length > 0) {
        console.log(
          `🔍 [SCHEDULED] Encontrados ${missedOrders.length} pedidos agendados para processar`
        );

        for (const order of missedOrders) {
          await this.processScheduledOrder(order._id);
        }
      }
    } catch (error) {
      console.error("❌ [SCHEDULED] Erro na verificação periódica:", error);
    }
  }

  /**
   * Listar todos os pedidos agendados ativos
   */
  async getScheduledOrders() {
    try {
      const now = new Date();
      const scheduledOrders = await Order.find({
        status: "agendado",
        scheduledDateTime: { $gte: now },
      }).sort({ scheduledDateTime: 1 });

      return scheduledOrders.map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        ifoodId: order.ifoodId,
        scheduledDateTime: order.scheduledDateTime,
        customer: order.customer[0]?.name,
        total: order.total,
        deliveryMode: order.deliveryMode,
        timeUntilScheduled: order.scheduledDateTime - now,
      }));
    } catch (error) {
      console.error("❌ [SCHEDULED] Erro ao listar pedidos agendados:", error);
      return [];
    }
  }

  /**
   * Reagendar um pedido para novo horário
   * @param {String} orderId - ID do pedido
   * @param {Date} newScheduledDateTime - Nova data e hora
   */
  async rescheduleOrder(orderId, newScheduledDateTime) {
    try {
      // Cancelar agendamento atual
      this.cancelScheduledOrder(orderId);

      // Atualizar no banco
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          scheduledDateTime: newScheduledDateTime,
          scheduledDeliveryTime: newScheduledDateTime,
        },
        { new: true }
      );

      if (order) {
        // Reagendar
        await this.scheduleOrder(order, newScheduledDateTime);
        console.log(
          `🔄 [SCHEDULED] Pedido ${
            order.orderNumber
          } reagendado para ${newScheduledDateTime.toLocaleString("pt-BR")}`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        `❌ [SCHEDULED] Erro ao reagendar pedido ${orderId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Obter estatísticas de pedidos agendados
   */
  async getScheduledOrdersStats() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const stats = await Order.aggregate([
        {
          $match: {
            status: "agendado",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalValue: { $sum: "$total" },
            today: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$scheduledDateTime", now] },
                      { $lt: ["$scheduledDateTime", tomorrow] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      return stats[0] || { total: 0, totalValue: 0, today: 0 };
    } catch (error) {
      console.error("❌ [SCHEDULED] Erro ao obter estatísticas:", error);
      return { total: 0, totalValue: 0, today: 0 };
    }
  }
}

module.exports = ScheduledOrderService;
