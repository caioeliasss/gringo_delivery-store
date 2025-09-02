const cron = require("node-cron");
const HandshakeNegotiationService = require("./handshakeNegotiationService");
const IfoodService = require("./ifoodService");

class HandshakeMonitoringService {
  constructor() {
    this.handshakeService = new HandshakeNegotiationService();
    this.ifoodService = new IfoodService();
    this.isRunning = false;
  }

  // Iniciar monitoramento automático
  start() {
    if (this.isRunning) {
      // console.log("[HANDSHAKE MONITOR] Serviço já está em execução");
      return;
    }

    // console.log("[HANDSHAKE MONITOR] 🚀 Iniciando serviço de monitoramento");

    // Verificar disputes expirados a cada 5 minutos
    this.expiredDisputesJob = cron.schedule(
      "*/5 * * * *",
      async () => {
        await this.checkExpiredDisputes();
      },
      {
        scheduled: true,
        timezone: "America/Sao_Paulo",
      }
    );

    // Gerar relatório diário às 9h
    this.dailyReportJob = cron.schedule(
      "0 9 * * *",
      async () => {
        await this.generateDailyReport();
      },
      {
        scheduled: true,
        timezone: "America/Sao_Paulo",
      }
    );

    // Limpeza de dados antigos - todo domingo às 3h
    this.cleanupJob = cron.schedule(
      "0 3 * * 0",
      async () => {
        await this.cleanupOldData();
      },
      {
        scheduled: true,
        timezone: "America/Sao_Paulo",
      }
    );

    this.isRunning = true;
    // console.log("[HANDSHAKE MONITOR] ✅ Serviço iniciado com sucesso");
    // console.log(
    //   "[HANDSHAKE MONITOR] - Verificação de expiração: a cada 5 minutos"
    // );
    // console.log("[HANDSHAKE MONITOR] - Relatório diário: 9h00");
    // console.log("[HANDSHAKE MONITOR] - Limpeza de dados: domingos 3h00");
  }

  // Parar monitoramento
  stop() {
    if (!this.isRunning) {
      // console.log("[HANDSHAKE MONITOR] Serviço não está em execução");
      return;
    }

    // console.log("[HANDSHAKE MONITOR] 🛑 Parando serviço de monitoramento");

    if (this.expiredDisputesJob) this.expiredDisputesJob.stop();
    if (this.dailyReportJob) this.dailyReportJob.stop();
    if (this.cleanupJob) this.cleanupJob.stop();

    this.isRunning = false;
    // console.log("[HANDSHAKE MONITOR] ✅ Serviço parado");
  }

  // Verificar disputes expirados
  async checkExpiredDisputes() {
    try {
      // console.log("[HANDSHAKE MONITOR] 🔍 Verificando disputes expirados...");

      const expiredCount =
        await this.handshakeService.checkAndUpdateExpiredDisputes();

      if (expiredCount > 0) {
        // console.log(
        //   `[HANDSHAKE MONITOR] ⚠️ ${expiredCount} disputes expiraram`
        // );
        // TODO: Implementar notificações para o suporte/admin
        // await this.notifyAdminOfExpiredDisputes(expiredCount);
      } else {
        // console.log(
        //   "[HANDSHAKE MONITOR] ✅ Nenhum dispute expirado encontrado"
        // );
      }
    } catch (error) {
      console.error(
        "[HANDSHAKE MONITOR] ❌ Erro ao verificar disputes expirados:",
        error
      );
    }
  }

  // Gerar relatório diário
  async generateDailyReport() {
    try {
      // console.log("[HANDSHAKE MONITOR] 📊 Gerando relatório diário...");

      const HandshakeDispute = require("../models/HandshakeDispute");
      const HandshakeSettlement = require("../models/HandshakeSettlement");

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      // Estatísticas do dia anterior
      const [yesterdayDisputes, yesterdaySettlements] = await Promise.all([
        HandshakeDispute.countDocuments({
          receivedAt: {
            $gte: yesterday,
            $lt: todayStart,
          },
        }),
        HandshakeSettlement.countDocuments({
          receivedAt: {
            $gte: yesterday,
            $lt: todayStart,
          },
        }),
      ]);

      // Disputes pendentes por tempo restante
      const pendingDisputes = await HandshakeDispute.aggregate([
        {
          $match: {
            status: "PENDING",
            expiresAt: { $gt: new Date() },
          },
        },
        {
          $addFields: {
            timeRemainingHours: {
              $divide: [
                { $subtract: ["$expiresAt", new Date()] },
                1000 * 60 * 60,
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                { $lte: ["$timeRemainingHours", 1] },
                "critical",
                {
                  $cond: [
                    { $lte: ["$timeRemainingHours", 4] },
                    "urgent",
                    "normal",
                  ],
                },
              ],
            },
            count: { $sum: 1 },
          },
        },
      ]);

      const report = {
        date: yesterday.toISOString().split("T")[0],
        disputes: {
          received: yesterdayDisputes,
          pending: {
            critical:
              pendingDisputes.find((p) => p._id === "critical")?.count || 0,
            urgent: pendingDisputes.find((p) => p._id === "urgent")?.count || 0,
            normal: pendingDisputes.find((p) => p._id === "normal")?.count || 0,
          },
        },
        settlements: {
          processed: yesterdaySettlements,
        },
        generated_at: new Date().toISOString(),
      };

      console.log(
        // "[HANDSHAKE MONITOR] 📋 Relatório diário gerado:",
        JSON.stringify(report, null, 2)
      );

      // TODO: Enviar relatório por email ou salvar em local específico
      // await this.sendDailyReportEmail(report);
    } catch (error) {
      console.error(
        "[HANDSHAKE MONITOR] ❌ Erro ao gerar relatório diário:",
        error
      );
    }
  }

  // Limpeza de dados antigos
  async cleanupOldData() {
    try {
      // console.log(
      //   "[HANDSHAKE MONITOR] 🧹 Iniciando limpeza de dados antigos..."
      // );

      const HandshakeDispute = require("../models/HandshakeDispute");
      const HandshakeSettlement = require("../models/HandshakeSettlement");

      // Remover disputes resolvidos com mais de 90 dias
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const [removedDisputes, removedSettlements] = await Promise.all([
        HandshakeDispute.deleteMany({
          status: { $in: ["SETTLED", "EXPIRED"] },
          updatedAt: { $lt: ninetyDaysAgo },
        }),
        HandshakeSettlement.deleteMany({
          createdAt: { $lt: ninetyDaysAgo },
        }),
      ]);

      // console.log(`[HANDSHAKE MONITOR] 🗑️ Limpeza concluída:`);
      console.log(`  - Disputes removidos: ${removedDisputes.deletedCount}`);
      console.log(
        `  - Settlements removidos: ${removedSettlements.deletedCount}`
      );
    } catch (error) {
      console.error("[HANDSHAKE MONITOR] ❌ Erro na limpeza de dados:", error);
    }
  }

  // Obter estatísticas do serviço
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      jobs: {
        expiredDisputes: this.expiredDisputesJob
          ? {
              scheduled: this.expiredDisputesJob.scheduled,
              timezone: this.expiredDisputesJob.timezone,
            }
          : null,
        dailyReport: this.dailyReportJob
          ? {
              scheduled: this.dailyReportJob.scheduled,
              timezone: this.dailyReportJob.timezone,
            }
          : null,
        cleanup: this.cleanupJob
          ? {
              scheduled: this.cleanupJob.scheduled,
              timezone: this.cleanupJob.timezone,
            }
          : null,
      },
      lastCheck: new Date().toISOString(),
    };
  }

  // Executar verificação manual
  async runManualCheck() {
    // console.log("[HANDSHAKE MONITOR] 🔧 Executando verificação manual...");
    await this.checkExpiredDisputes();
    // console.log("[HANDSHAKE MONITOR] ✅ Verificação manual concluída");
  }

  // Executar relatório manual
  async runManualReport() {
    // console.log("[HANDSHAKE MONITOR] 📊 Executando relatório manual...");
    await this.generateDailyReport();
    // console.log("[HANDSHAKE MONITOR] ✅ Relatório manual concluído");
  }

  // Executar limpeza manual
  async runManualCleanup() {
    // console.log("[HANDSHAKE MONITOR] 🧹 Executando limpeza manual...");
    await this.cleanupOldData();
    // console.log("[HANDSHAKE MONITOR] ✅ Limpeza manual concluída");
  }
}

module.exports = HandshakeMonitoringService;
