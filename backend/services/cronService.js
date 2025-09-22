const cron = require("cron");
const Billing = require("../models/Billing");
const Order = require("../models/Order");
const asaasService = require("./asaasService");
const { response } = require("express");
const enviromentUtils = require("../utils/environmentUtils");
class CronService {
  constructor() {
    this.jobs = [];
    this.isDevelopment = enviromentUtils.isDevelopment();
    console.log(
      `🔧 CronService initialized - isDevelopment: ${this.isDevelopment}`
    );
  }

  // Verificar se deve executar em ambiente de desenvolvimento
  shouldSkipInDevelopment(functionName = "função") {
    if (this.isDevelopment) {
      console.log(
        `⏭️ [DEV MODE] Pulando execução de ${functionName} em ambiente de desenvolvimento`
      );
      return true;
    }
    return false;
  }

  // Agendar criação automática de faturas no dia 01 de cada mês
  scheduleMonthlyBilling() {
    if (this.shouldSkipInDevelopment("agendamento de faturas mensais")) {
      return null;
    }

    const job = new cron.CronJob(
      "0 9 5 * *", // Executa todo dia 05 às 09:00
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
    if (this.shouldSkipInDevelopment("criação de faturas mensais")) {
      return;
    }

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
      currentDate.getMonth(),
      10
    ); // Vencimento dia 10 do mês

    // Calcular valor baseado no plano da loja
    let amount = this.calculateBillingAmount(store);
    if (amount > 0 && amount < 5) {
      amount = 6.5;
    }
    // ATUALIZAR: Usar nova função ensureCustomer
    const cusId = await asaasService.ensureCustomer(store);

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
      paymentMethod: "BOLETO",
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
      billing.asaasData = asaasInvoice;
      await billing.save();
    }

    return billing;
  }

  // Calcular valor da fatura baseado no plano
  calculateBillingAmount(store) {
    // Implementar lógica de preços baseada no plano
    const plans = store.billingOptions.monthlyFee;
    const additionalFee = 1.89;

    return plans + additionalFee || 0;
  }

  // Buscar lojas ativas (implementar conforme seu modelo)
  async getActiveStores() {
    try {
      const Store = require("../models/Store");
      return await Store.find({});
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
    if (
      this.shouldSkipInDevelopment(
        "agendamento de verificação de faturas vencidas"
      )
    ) {
      return null;
    }

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
    if (this.shouldSkipInDevelopment("verificação de faturas vencidas")) {
      return;
    }

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

  // Verificar e atualizar status financeiro das viagens
  async checkTravelFinanceStatus() {
    if (
      this.shouldSkipInDevelopment(
        "verificação de status financeiro das viagens"
      )
    ) {
      return;
    }

    try {
      console.log("🚚 Verificando status financeiro das viagens...");

      const Travel = require("../models/Travel");
      const now = new Date();

      // Buscar viagens com status "entregue" e finance.status "pendente"
      // que já passaram da data de vencimento (dueDate)
      const travelsPendingRelease = await Travel.find({
        status: "entregue",
        "finance.status": "pendente",
        "finance.dueDate": { $lte: now },
      });

      let updated = 0;
      for (const travel of travelsPendingRelease) {
        // Atualizar status financeiro para "liberado"
        travel.finance.status = "liberado";
        await travel.save();
        updated++;
      }

      console.log(`✅ ${updated} viagens liberadas para pagamento`);

      // Também verificar viagens canceladas para cancelar o financeiro
      const cancelledTravels = await Travel.find({
        status: "cancelado",
        "finance.status": { $ne: "cancelado" },
      });

      let cancelled = 0;
      for (const travel of cancelledTravels) {
        travel.finance.status = "cancelado";
        await travel.save();
        cancelled++;
      }

      if (cancelled > 0) {
        console.log(
          `✅ ${cancelled} viagens canceladas tiveram o financeiro cancelado`
        );
      }
    } catch (error) {
      console.error(
        "❌ Erro ao verificar status financeiro das viagens:",
        error
      );
    }
  }

  // Agendar verificação de status financeiro das viagens
  scheduleTravelFinanceCheck() {
    if (
      this.shouldSkipInDevelopment(
        "agendamento de verificação financeira das viagens"
      )
    ) {
      return null;
    }

    // Executa todos os dias às 04:00 e 18:00
    const job = new cron.CronJob(
      "0 4,18 * * *",
      this.checkTravelFinanceStatus.bind(this),
      null,
      true,
      "America/Sao_Paulo"
    );

    this.jobs.push(job);
    console.log("✅ Verificação de status financeiro das viagens ativada");
    return job;
  }

  // ADICIONAR: Criar cobrança de taxa de motoboy
  async createMotoboyFeeBillings() {
    if (
      this.shouldSkipInDevelopment("criação de cobrança de taxa de motoboy")
    ) {
      return;
    }

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

      // console.log(
      //   `📦 Encontradas ${deliveredOrders.length} entregas para ${store.businessName} na semana passada`
      // );

      // Se não há entregas, não criar fatura
      if (deliveredOrders.length === 0) {
        // console.log(
        //   `⏭️ Nenhuma entrega encontrada para ${store.businessName} na semana anterior`
        // );
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
      let totalAmount = deliveredOrders.length * motoboyFee;
      if (totalAmount > 0 && totalAmount < 5) {
        totalAmount = 6.5;
      }

      // Data de vencimento (próxima quarta-feira às 12h)
      const dueDate = new Date();
      const currentDay = dueDate.getDay(); // 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, etc.
      const daysUntilWednesday =
        currentDay <= 3 ? 3 - currentDay : 7 - currentDay + 3;
      dueDate.setDate(dueDate.getDate() + daysUntilWednesday);
      dueDate.setHours(12, 0, 0, 0); // 12:00:00.000

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
        paymentMethod: store.preferredPaymentMethod || "BOLETO",
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
      if (totalAmount > 0) {
        try {
          // Garantir que a loja tem customer no Asaas
          const customerInfo = await asaasService.ensureCustomer(store);

          const asaasInvoice = await asaasService.createInvoice({
            customerId: customerInfo.id,
            amount: billing.amount,
            dueDate: billing.dueDate.toISOString().split("T")[0],
            description: billing.description,
            paymentMethod: billing.paymentMethod,
          });

          // Salvar ID do Asaas
          billing.asaasInvoiceId = asaasInvoice.id;
          billing.asaasData = asaasInvoice;
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

  async createTravelsBilling() {
    if (this.shouldSkipInDevelopment("criação de cobrança de travels")) {
      return;
    }

    try {
      console.log("🏍️ Iniciando cobrança de taxa de motoboy...");

      // Buscar todas as lojas ativas
      const stores = await this.getActiveStores();

      const results = {
        success: [],
        errors: [],
        type: "BILLING_MOTOBOY",
        noDeliveries: [],
        totalAmount: 0,
      };

      for (const store of stores) {
        try {
          const billing = await this.createTravelsBillingForStore(store);

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

  async createTravelsBillingForStore(store) {
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

      // console.log(
      //   `📅 Buscando entregas de ${lastMonday.toLocaleDateString()} até ${lastSunday.toLocaleDateString()} para ${
      //     store.businessName
      //   }`
      // );

      // Buscar entregas da semana anterior com status "entregue"
      const Travel = require("../models/Travel");
      const deliveredOrders = await Travel.find({
        "order.store.cnpj": String(store.cnpj),
        status: "entregue",
        createdAt: {
          $gte: lastMonday,
          $lte: lastSunday,
        },
      }).sort({ createdAt: 1 });

      // console.log(
      //   `📦 Encontradas ${deliveredOrders.length} entregas para ${store.businessName} na semana passada`
      // );

      // Se não há entregas, não criar fatura
      if (deliveredOrders.length === 0) {
        // console.log(
        //   `⏭️ Nenhuma entrega encontrada para ${store.businessName} na semana anterior`
        // );
        return null;
      }

      // Verificar se já existe fatura de taxa de motoboy para esta semana
      const existingBilling = await Billing.findOne({
        storeId: store._id,
        type: "MOTOBOY_BILLING",
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

      const totalAmount = deliveredOrders.reduce((sum, order) => {
        const amount = order.price || 0; // Supondo que cada entrega tem um preço
        return sum + amount;
      }, 0);

      // Data de vencimento (5 dias após criação)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      // Criar descrição detalhada
      const description = this.generateMotoboyBillDescription(
        store,
        deliveredOrders.length,
        totalAmount,
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
        type: "MOTOBOY_BILLING",
        description: description,
        paymentMethod: store.preferredPaymentMethod || "BOLETO",
        status: "PENDING",
        metadata: {
          deliveryCount: deliveredOrders.length,
          totalAmount: totalAmount,
          periodStart: lastMonday, // ALTERADO: início da semana
          periodEnd: lastSunday, // ALTERADO: fim da semana
          orderIds: deliveredOrders.map((order) => order._id),
        },
      });

      await billing.save();

      // Criar fatura no Asaas se configurado
      if (totalAmount > 0) {
        try {
          // Garantir que a loja tem customer no Asaas
          const customerInfo = await asaasService.ensureCustomer(store);

          const asaasInvoice = await asaasService.createInvoice({
            customerId: customerInfo.id,
            amount: billing.amount,
            dueDate: billing.dueDate.toISOString().split("T")[0],
            description: billing.description,
            paymentMethod: billing.paymentMethod,
          });

          // Salvar ID do Asaas
          billing.asaasInvoiceId = asaasInvoice.id;
          billing.asaasData = asaasInvoice;
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

  generateMotoboyBillDescription(
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

    return `Entregas de Motoboy - ${store.businessName}
Período: Semana de ${weekText}
Entregas realizadas: ${deliveryCount}
Total: R$ ${feePerDelivery.toFixed(2)}`;
  }

  // OPCIONAL: Atualizar agendamento para executar semanalmente
  scheduleMotoboyFeeBilling() {
    if (this.shouldSkipInDevelopment("agendamento de taxa de motoboy")) {
      return null;
    }

    const job = new cron.CronJob(
      "0 8 * * 1", // Every Monday at 8:00 AM
      async () => {
        await this.createMotoboyFeeBillings();
        await this.createTravelsBilling();
      },
      null,
      true,
      "America/Sao_Paulo"
    );

    this.jobs.push(job);
    console.log(
      "✅ Weekly scheduling for motoboy fees and travels billing activated"
    );
    return job;
  }

  // ATUALIZAR: Método startAll para incluir taxa de motoboy
  startAll() {
    console.log(`🚀 Iniciando CronService...`);
    console.log(`🔧 NODE_ENV: "${process.env.NODE_ENV}"`);
    console.log(`🔧 isDevelopment: ${this.isDevelopment}`);

    if (this.isDevelopment) {
      console.log(
        "🚫 [DEV MODE] Cron jobs desabilitados em ambiente de desenvolvimento"
      );
      console.log("💡 Para habilitar, altere NODE_ENV para 'production'");
      return;
    }

    console.log("✅ Ambiente de produção detectado - iniciando cron jobs...");
    this.scheduleMonthlyBilling();
    this.scheduleMotoboyFeeBilling(); // ADICIONAR esta linha
    this.scheduleOverdueCheck();
    this.scheduleTravelFinanceCheck(); // NOVO: Verificação de status financeiro das viagens
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
