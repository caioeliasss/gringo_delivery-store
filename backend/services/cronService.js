const cron = require("cron");
const Billing = require("../models/Billing");
const Order = require("../models/Order");
const asaasService = require("./asaasService");
const { response } = require("express");

class CronService {
  constructor() {
    this.jobs = [];
  }

  // Agendar criação automática de faturas no dia 01 de cada mês
  scheduleMonthlyBilling() {
    // Executa todo dia 01 às 09:00
    const job = new cron.CronJob(
      "0 9 1 * *", // segundo minuto hora dia mês ano
      this.createMonthlyBillings.bind(this),
      null,
      true,
      "America/Sao_Paulo"
    );

    this.jobs.push(job);
    console.log("✅ Agendamento de faturas mensais ativado");
    return job;
  }

  // Função para criar faturas mensais
  async createMonthlyBillings() {
    try {
      console.log("🔄 Iniciando criação de faturas mensais...");

      // Buscar todos os estabelecimentos ativos
      // Assumindo que você tem um modelo Store ou similar
      const stores = await this.getActiveStores();

      const results = {
        success: [],
        errors: [],
        type: "BILLING_MONTHLY",
      };

      for (const store of stores) {
        try {
          await this.createBillingForStore(store);
          results.success.push(store.firebaseUid);
        } catch (error) {
          console.error(
            `❌ Erro ao criar fatura para loja ${store.firebaseUid}:`,
            error
          );
          results.errors.push({
            storeId: store.firebaseUid,
            error: error.message,
          });
        }
      }
      await this.sendBillingReport(results);
    } catch (error) {
      console.error("❌ Erro crítico na criação de faturas mensais:", error);
    }
  }

  // Criar fatura para uma loja específica
  async createBillingForStore(store) {
    const currentDate = new Date();
    const dueDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      5
    ); // Vencimento dia 10

    // Calcular valor baseado no plano da loja
    const amount = this.calculateBillingAmount(store);

    let cusId = { id: store.asaasCustomerId };
    // Criar registro no banco
    if (!store.asaasCustomerId) {
      const cnpj = String(store.cnpj);
      const response = await asaasService.createCustomer({
        name: store.businessName || store.email,
        email: store.email,
        cpfCnpj: cnpj,
        phone: store.phone || "",
      });
      cusId = { id: response.data.id };
    }
    if (!cusId.id) {
      throw new Error(
        `Loja ${store.businessName} não possui ID de cliente Asaas configurado`
      );
    }

    const billing = new Billing({
      customerId: cusId.id,
      firebaseUid: store.firebaseUid,
      storeId: store._id,
      amount: amount,
      dueDate: dueDate,
      period: "MONTHLY",
      type: "SUBSCRIPTION",
      description: `Assinatura mensal - ${currentDate.toLocaleDateString(
        "pt-BR",
        { month: "long", year: "numeric" }
      )}`,
      paymentMethod: "PIX",
    });

    await billing.save();

    // Criar fatura no Asaas
    if (cusId.id) {
      const asaasInvoice = await asaasService.createInvoice({
        customerId: cusId.id,
        amount: billing.amount,
        dueDate: billing.dueDate.toISOString().split("T")[0],
        description: billing.description,
        paymentMethod: billing.paymentMethod,
      });

      // Atualizar com ID do Asaas
      billing.asaasInvoiceId = asaasInvoice.id;
      await billing.save();
    }

    return billing;
  }

  // Calcular valor da fatura baseado no plano
  calculateBillingAmount(store) {
    // Implementar lógica de preços baseada no plano
    const plans = store.billingOptions.monthlyFee;

    return plans || 0;
  }

  // Buscar lojas ativas (implementar conforme seu modelo)
  async getActiveStores() {
    try {
      const Store = require("../models/Store");
      return await Store.find({ cnpj_approved: true });
    } catch (error) {
      console.error("Erro ao buscar lojas ativas:", error);
      return [];
    }
  }

  // Enviar relatório de cobrança
  async sendBillingReport(results) {
    // Implementar envio de relatório
    const Report = require("../models/Report");
    const report = new Report({
      type: results.type,
      success: results.success,
      errors: results.errors,
      createdAt: new Date(),
    });
    await report.save();

    // Exemplo: enviar por webhook ou email
    // await this.sendWebhook(results);
  }

  // Verificar faturas vencidas (executar diariamente)
  scheduleOverdueCheck() {
    // Executa todos os dias às 10:00
    const job = new cron.CronJob(
      "0 10 * * *",
      this.checkOverdueBillings.bind(this),
      null,
      true,
      "America/Sao_Paulo"
    );

    this.jobs.push(job);
    console.log("✅ Verificação de faturas vencidas ativada");
    return job;
  }

  // Verificar e atualizar faturas vencidas
  async checkOverdueBillings() {
    try {
      console.log("🔍 Verificando faturas vencidas...");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueBillings = await Billing.find({
        dueDate: { $lt: today },
        status: "PENDING",
      });

      let updated = 0;
      for (const billing of overdueBillings) {
        billing.status = "OVERDUE";
        await billing.save();
        updated++;
      }

      console.log(`✅ ${updated} faturas marcadas como vencidas`);
    } catch (error) {
      console.error("❌ Erro ao verificar faturas vencidas:", error);
    }
  }

  // ADICIONAR: Agendar cobrança de taxa de motoboy (todo dia 1 às 11:00)
  scheduleMotoboyFeeBilling() {
    const job = new cron.CronJob(
      "0 11 1 * *", // Todo dia 1 às 11:00
      this.createMotoboyFeeBillings.bind(this),
      null,
      true,
      "America/Sao_Paulo"
    );

    this.jobs.push(job);
    console.log("✅ Agendamento de taxa de motoboy ativado");
    return job;
  }

  // ADICIONAR: Criar cobrança de taxa de motoboy
  async createMotoboyFeeBillings() {
    try {
      console.log("🏍️ Iniciando cobrança de taxa de motoboy...");

      // Buscar todas as lojas ativas
      const stores = await this.getActiveStores();

      const results = {
        success: [],
        errors: [],
        type: "BILLING_MOTOBOYFEE",
        noDeliveries: [],
        totalAmount: 0,
      };

      for (const store of stores) {
        try {
          const billing = await this.createMotoboyFeeBillingForStore(store);

          if (billing) {
            results.success.push({
              storeId: store._id,
              storeName: store.businessName,
              deliveries: billing.deliveryCount,
              amount: billing.amount,
            });
            results.totalAmount += billing.amount;
          } else {
            results.noDeliveries.push({
              storeId: store._id,
              storeName: store.businessName,
            });
          }
        } catch (error) {
          console.error(
            `❌ Erro ao criar taxa de motoboy para loja ${store.businessName}:`,
            error
          );
          results.errors.push({
            storeId: store._id,
            storeName: store.businessName,
            error: error.message,
          });
        }
      }

      // Enviar relatório
      await this.sendBillingReport(results);
    } catch (error) {
      console.error("❌ Erro crítico na cobrança de taxa de motoboy:", error);
    }
  }

  // ADICIONAR: Criar taxa de motoboy para uma loja específica (SEMANAL)
  async createMotoboyFeeBillingForStore(store) {
    try {
      // Calcular período da semana anterior (segunda a domingo)
      const now = new Date();

      // Encontrar o último domingo (fim da semana anterior)
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - now.getDay());
      lastSunday.setHours(23, 59, 59, 999);

      // Encontrar a segunda-feira da semana anterior (início da semana anterior)
      const lastMonday = new Date(lastSunday);
      lastMonday.setDate(lastSunday.getDate() - 6);
      lastMonday.setHours(0, 0, 0, 0);

      console.log(
        `📅 Buscando entregas de ${lastMonday.toLocaleDateString()} até ${lastSunday.toLocaleDateString()} para ${
          store.businessName
        }`
      );

      // Buscar entregas da semana anterior com status "entregue"
      const deliveredOrders = await Order.find({
        "store.cnpj": store.cnpj,
        status: "entregue",
        createdAt: {
          $gte: lastMonday,
          $lte: lastSunday,
        },
      }).sort({ "delivery.endTime": 1 });

      console.log(
        `📦 Encontradas ${deliveredOrders.length} entregas para ${store.businessName} na semana passada`
      );

      // Se não há entregas, não criar fatura
      if (deliveredOrders.length === 0) {
        console.log(
          `⏭️ Nenhuma entrega encontrada para ${store.businessName} na semana anterior`
        );
        return null;
      }

      // Verificar se já existe fatura de taxa de motoboy para esta semana
      const existingBilling = await Billing.findOne({
        storeId: store._id,
        type: "MOTOBOY_FEE",
        period: "WEEKLY",
        "metadata.periodStart": {
          $gte: lastMonday,
          $lte: lastSunday,
        },
      });

      if (existingBilling) {
        console.log(
          `⏭️ Taxa de motoboy já existe para ${store.businessName} desta semana`
        );
        return null;
      }

      // Calcular valor total
      const motoboyFee = store.billingOptions?.motoBoyFee || 0;
      const totalAmount = deliveredOrders.length * motoboyFee;

      // Data de vencimento (5 dias após criação)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5);

      // Criar descrição detalhada
      const description = this.generateMotoboyFeeDescription(
        store,
        deliveredOrders.length,
        motoboyFee,
        lastMonday,
        lastSunday
      );

      // Criar registro no banco
      const billing = new Billing({
        customerId: store.asaasCustomerId,
        firebaseUid: store.firebaseUid,
        storeId: store._id,
        amount: totalAmount,
        dueDate: dueDate,
        period: "WEEKLY", // ALTERADO: de MONTHLY para WEEKLY
        type: "MOTOBOY_FEE",
        description: description,
        paymentMethod: store.preferredPaymentMethod || "PIX",
        status: "PENDING",
        metadata: {
          deliveryCount: deliveredOrders.length,
          feePerDelivery: motoboyFee,
          periodStart: lastMonday, // ALTERADO: início da semana
          periodEnd: lastSunday, // ALTERADO: fim da semana
          orderIds: deliveredOrders.map((order) => order._id),
        },
      });

      await billing.save();

      // Criar fatura no Asaas se configurado
      if (store.asaasCustomerId && totalAmount > 0) {
        try {
          const asaasInvoice = await asaasService.createInvoice({
            customerId: store.asaasCustomerId,
            amount: billing.amount,
            dueDate: billing.dueDate.toISOString().split("T")[0],
            description: billing.description,
            paymentMethod: billing.paymentMethod,
          });

          // Salvar ID do Asaas
          billing.asaasInvoiceId = asaasInvoice.id;
          await billing.save();

          console.log(
            `✅ Taxa de motoboy semanal criada: ${store.businessName} - ${
              deliveredOrders.length
            } entregas - R$ ${totalAmount.toFixed(2)}`
          );
        } catch (asaasError) {
          console.error(
            `❌ Erro no Asaas para taxa de motoboy ${store.businessName}:`,
            asaasError.message
          );
          billing.status = "ERROR";
          billing.errorMessage = asaasError.message;
          await billing.save();
        }
      }

      return {
        billing,
        deliveryCount: deliveredOrders.length,
        amount: totalAmount,
      };
    } catch (error) {
      console.error(
        `❌ Erro ao processar taxa de motoboy para ${store.businessName}:`,
        error
      );
      throw error;
    }
  }

  // ADICIONAR: Gerar descrição da taxa de motoboy (SEMANAL)
  generateMotoboyFeeDescription(
    store,
    deliveryCount,
    feePerDelivery,
    startDate,
    endDate
  ) {
    // Formatar datas da semana
    const weekText = `${startDate.toLocaleDateString(
      "pt-BR"
    )} a ${endDate.toLocaleDateString("pt-BR")}`;

    return `Taxa de Uso de Motoboy - ${store.businessName}
Período: Semana de ${weekText}
Entregas realizadas: ${deliveryCount}
Taxa por entrega: R$ ${feePerDelivery.toFixed(2)}
Total: R$ ${(deliveryCount * feePerDelivery).toFixed(2)}`;
  }

  // OPCIONAL: Atualizar agendamento para executar semanalmente
  scheduleMotoboyFeeBilling() {
    const job = new cron.CronJob(
      "0 8 * * 1", // ALTERADO: Toda segunda-feira às 8:00 (processa semana anterior)
      this.createMotoboyFeeBillings.bind(this),
      null,
      true,
      "America/Sao_Paulo"
    );

    this.jobs.push(job);
    console.log("✅ Agendamento SEMANAL de taxa de motoboy ativado");
    return job;
  }

  // ATUALIZAR: Método startAll para incluir taxa de motoboy
  startAll() {
    this.scheduleMonthlyBilling();
    this.scheduleMotoboyFeeBilling(); // ADICIONAR esta linha
    this.scheduleOverdueCheck();
    console.log("🚀 Todos os agendamentos iniciados");
  }

  // Parar todos os agendamentos
  stopAll() {
    this.jobs.forEach((job) => {
      job.stop();
    });
    this.jobs = [];
    console.log("⏹️ Todos os agendamentos parados");
  }
}

module.exports = new CronService();
