const IfoodService = require("./ifoodService");
const Store = require("../models/Store");

class IfoodPollingService {
  constructor() {
    this.activePollings = new Map(); // Map<storeFirebaseUid, PollingInfo>
    this.isRunning = false;
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  async startPollingForAllStores() {
    if (this.isDevelopment) {
      console.log(
        "🚫 [DEV MODE] iFood polling desabilitado em ambiente de desenvolvimento"
      );
      console.log("💡 Para habilitar, altere NODE_ENV para 'production'");
      return;
    }

    if (this.isRunning) {
      console.log("[IFOOD POLLING] Polling já está em execução");
      return;
    }

    this.isRunning = true;
    console.log("[IFOOD POLLING] Iniciando polling para todos os stores");

    try {
      // Buscar todos os stores que têm configuração iFood
      const stores = await Store.find({
        "ifoodConfig.clientId": { $exists: true, $ne: "" },
        "ifoodConfig.clientSecret": { $exists: true, $ne: "" },
      });

      console.log(
        `[IFOOD POLLING] Encontrados ${stores.length} stores com configuração iFood`
      );

      for (const store of stores) {
        await this.startPollingForStore(store.firebaseUid);
      }
    } catch (error) {
      console.error(
        "[IFOOD POLLING] Erro ao iniciar polling para todos os stores:",
        error
      );
      this.isRunning = false;
    }
  }

  async startPollingForStore(storeFirebaseUid) {
    if (this.isDevelopment) {
      console.log(
        `🚫 [DEV MODE] Polling desabilitado para store: ${storeFirebaseUid}`
      );
      return;
    }

    try {
      if (this.activePollings.has(storeFirebaseUid)) {
        console.log(
          `[IFOOD POLLING] Polling já ativo para store: ${storeFirebaseUid}`
        );
        return;
      }

      console.log(
        `[IFOOD POLLING] Iniciando polling para store: ${storeFirebaseUid}`
      );

      const ifoodService = await IfoodService.createForStore(storeFirebaseUid);

      const pollingInfo = {
        service: ifoodService,
        isActive: true,
        lastPoll: null,
        errorCount: 0,
      };

      this.activePollings.set(storeFirebaseUid, pollingInfo);

      // Iniciar polling recursivo para este store
      this.pollStore(storeFirebaseUid);
    } catch (error) {
      console.error(
        `[IFOOD POLLING] Erro ao iniciar polling para store ${storeFirebaseUid}:`,
        error
      );
    }
  }

  async pollStore(storeFirebaseUid) {
    const pollingInfo = this.activePollings.get(storeFirebaseUid);

    if (!pollingInfo || !pollingInfo.isActive) {
      console.log(
        `[IFOOD POLLING] Polling parado para store: ${storeFirebaseUid}`
      );
      return;
    }

    try {
      const events = await pollingInfo.service.pollingIfood(storeFirebaseUid);
      pollingInfo.lastPoll = new Date();
      pollingInfo.errorCount = 0;

      if (events && events.length > 0) {
        console.log(
          `[IFOOD POLLING] ${events.length} eventos recebidos para store: ${storeFirebaseUid}`
        );
        // Aqui você pode processar os eventos recebidos
        await this.processEvents(events, storeFirebaseUid);
      }
    } catch (error) {
      pollingInfo.errorCount++;
      console.error(
        `[IFOOD POLLING] Erro no polling para store ${storeFirebaseUid} (erro ${pollingInfo.errorCount}):`,
        error
      );

      // Se houver muitos erros consecutivos, pausar temporariamente
      if (pollingInfo.errorCount >= 5) {
        console.warn(
          `[IFOOD POLLING] Muitos erros para store ${storeFirebaseUid}, pausando por 5 minutos`
        );
        pollingInfo.isActive = false;
        setTimeout(() => {
          if (this.activePollings.has(storeFirebaseUid)) {
            pollingInfo.isActive = true;
            pollingInfo.errorCount = 0;
            this.pollStore(storeFirebaseUid);
          }
        }, 5 * 60 * 1000); // 5 minutos
        return;
      }
    }

    // Agendar próximo polling
    setTimeout(() => {
      this.pollStore(storeFirebaseUid);
    }, 30000); // 30 segundos
  }

  async processEvents(events, storeFirebaseUid) {
    // Importar o WebhookController para processar eventos
    const WebhookController = require("../controllers/webhookController");
    const OrderService = require("./orderService");

    // Processar eventos do iFood usando a mesma lógica do webhook
    for (const event of events) {
      try {
        console.log(
          `[IFOOD POLLING] Processando evento para store ${storeFirebaseUid}:`,
          event
        );

        // Simular o body do webhook para usar a mesma lógica
        const webhookBody = {
          fullCode: event.code || event.fullCode,
          orderId: event.orderId || event.id,
        };

        // Criar uma requisição falsa para o webhook controller
        const fakeReq = {
          body: webhookBody,
          storeFirebaseUid: storeFirebaseUid, // adicionar contexto do store
        };

        const fakeRes = {
          status: (code) => ({
            json: (data) => console.log(`Response ${code}:`, data),
          }),
          json: (data) => console.log("Response:", data),
        };

        // Usar o mesmo controller do webhook
        const orderService = new OrderService();
        const webhookController = new WebhookController(orderService);
        await webhookController.handleIfoodWebhook(fakeReq, fakeRes);
      } catch (error) {
        console.error(
          `[IFOOD POLLING] Erro ao processar evento para store ${storeFirebaseUid}:`,
          error
        );
      }
    }
  }

  stopPollingForStore(storeFirebaseUid) {
    const pollingInfo = this.activePollings.get(storeFirebaseUid);
    if (pollingInfo) {
      pollingInfo.isActive = false;
      this.activePollings.delete(storeFirebaseUid);
      console.log(
        `[IFOOD POLLING] Polling parado para store: ${storeFirebaseUid}`
      );
    }
  }

  stopAllPolling() {
    console.log("[IFOOD POLLING] Parando todo o polling");
    for (const [storeFirebaseUid, pollingInfo] of this.activePollings) {
      pollingInfo.isActive = false;
    }
    this.activePollings.clear();
    this.isRunning = false;
  }

  getPollingStatus() {
    const status = {
      isRunning: this.isRunning,
      activeStores: [],
      totalStores: this.activePollings.size,
    };

    for (const [storeFirebaseUid, pollingInfo] of this.activePollings) {
      status.activeStores.push({
        storeFirebaseUid,
        isActive: pollingInfo.isActive,
        lastPoll: pollingInfo.lastPoll,
        errorCount: pollingInfo.errorCount,
      });
    }

    return status;
  }

  // Método para adicionar novo store em tempo real
  async addStore(storeFirebaseUid) {
    if (this.isRunning) {
      await this.startPollingForStore(storeFirebaseUid);
    }
  }

  // Método para remover store em tempo real
  removeStore(storeFirebaseUid) {
    this.stopPollingForStore(storeFirebaseUid);
  }
}

module.exports = IfoodPollingService;
