/**
 * Simulador de Polling iFood - Handshake Events
 *
 * Este script simula eventos HANDSHAKE_DISPUTE e HANDSHAKE_SETTLEMENT
 * chegando via polling do iFood para testar o sistema de negociação.
 *
 * Uso:
 * node simulate-ifood-polling.js
 *
 * O script irá:
 * 1. Gerar eventos fictícios de dispute e settlement
 * 2. Chamar o processamento como se fossem eventos reais do iFood
 * 3. Salvar no banco de dados MongoDB
 * 4. Gerar notificações via WebSocket (se configurado)
 */

const mongoose = require("mongoose");
const IfoodService = require("./services/ifoodService");
const HandshakeDispute = require("./models/HandshakeDispute");
const HandshakeSettlement = require("./models/HandshakeSettlement");
const Store = require("./models/Store");
require("dotenv").config();

class IfoodPollingSimulator {
  constructor() {
    this.ifoodService = new IfoodService();
    this.isRunning = false;
    this.eventCounter = 1;
  }

  // Conectar ao MongoDB
  async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ Conectado ao MongoDB");
    } catch (error) {
      console.error("❌ Erro ao conectar ao MongoDB:", error);
      throw error;
    }
  }

  // Gerar evento HANDSHAKE_DISPUTE fictício
  generateHandshakeDispute(storeFirebaseUid, customData = {}) {
    const disputeTypes = [
      "QUALITY",
      "MISSING_ITEMS",
      "WRONG_ITEMS",
      "DELAY",
      "OTHER",
    ];
    const disputeType =
      customData.disputeType ||
      disputeTypes[Math.floor(Math.random() * disputeTypes.length)];

    const orderId =
      customData.orderId || `ORDER_${Date.now()}_${this.eventCounter}`;
    const disputeId =
      customData.disputeId || `DISPUTE_${Date.now()}_${this.eventCounter}`;

    const descriptions = {
      QUALITY:
        "Produto chegou com qualidade abaixo do esperado, frio e sem sabor",
      MISSING_ITEMS: "Faltaram itens no pedido conforme reclamação do cliente",
      WRONG_ITEMS: "Cliente recebeu produtos diferentes do que foi pedido",
      DELAY: "Pedido chegou com atraso significativo ao cliente",
      OTHER: "Outros problemas relatados pelo cliente",
    };

    const customerComplaints = {
      QUALITY: "A pizza chegou completamente fria e o sabor estava ruim",
      MISSING_ITEMS: "Pedi 2 refrigerantes mas só veio 1",
      WRONG_ITEMS: "Pedi pizza de calabresa mas veio de margherita",
      DELAY: "O pedido demorou mais de 1 hora para chegar",
      OTHER: "Produto veio com embalagem danificada",
    };

    return {
      id: `event_handshake_dispute_${this.eventCounter++}`,
      eventType: "HANDSHAKE_DISPUTE",
      orderId: orderId,
      disputeId: disputeId,
      merchantId: customData.merchantId || "MERCHANT_TEST_123",
      disputeType: disputeType,
      description: customData.description || descriptions[disputeType],
      customerComplaint:
        customData.customerComplaint || customerComplaints[disputeType],
      media: customData.media || [
        {
          url: "https://example.com/evidence1.jpg",
          type: "IMAGE",
          description: "Foto do produto recebido",
        },
      ],
      disputedItems: customData.disputedItems || [
        {
          id: "item_123",
          name: "Pizza Margherita",
          quantity: 1,
          price: {
            value: 25.9,
            currency: "BRL",
          },
        },
      ],
      availableAlternatives: customData.availableAlternatives || [
        {
          type: "REFUND",
          description: "Reembolso total",
        },
        {
          type: "PARTIAL_REFUND",
          description: "Reembolso parcial",
          amount: {
            value: 12.95,
            currency: "BRL",
          },
        },
        {
          type: "VOUCHER",
          description: "Voucher para próxima compra",
        },
      ],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      createdAt: new Date(),
      ...customData,
    };
  }

  // Gerar evento HANDSHAKE_SETTLEMENT fictício
  generateHandshakeSettlement(disputeId, customData = {}) {
    const settlementResults = [
      "ACCEPTED",
      "REJECTED",
      "ALTERNATIVE_ACCEPTED",
      "AUTOMATIC_TIMEOUT",
    ];
    const settlementResult =
      customData.settlementResult ||
      settlementResults[Math.floor(Math.random() * settlementResults.length)];

    const settlementDetails = {
      ACCEPTED: {
        type: "REFUND",
        description: "Reembolso total aprovado",
        amount: { value: 25.9, currency: "BRL" },
      },
      REJECTED: {
        type: "NO_ACTION",
        description: "Disputa rejeitada - sem ação necessária",
        amount: { value: 0, currency: "BRL" },
      },
      ALTERNATIVE_ACCEPTED: {
        type: "PARTIAL_REFUND",
        description: "Reembolso parcial aceito",
        amount: { value: 12.95, currency: "BRL" },
      },
      AUTOMATIC_TIMEOUT: {
        type: "REFUND",
        description: "Reembolso automático por timeout",
        amount: { value: 25.9, currency: "BRL" },
      },
    };

    return {
      id: `event_handshake_settlement_${this.eventCounter++}`,
      eventType: "HANDSHAKE_SETTLEMENT",
      orderId: customData.orderId || `ORDER_${Date.now()}`,
      disputeId: disputeId,
      merchantId: customData.merchantId || "MERCHANT_TEST_123",
      originalDisputeEventId:
        customData.originalDisputeEventId ||
        `event_handshake_dispute_${this.eventCounter - 2}`,
      settlementResult: settlementResult,
      settlementDetails:
        customData.settlementDetails || settlementDetails[settlementResult],
      decisionMaker:
        customData.decisionMaker ||
        (settlementResult === "AUTOMATIC_TIMEOUT" ? "PLATFORM" : "MERCHANT"),
      negotiationTimeline: {
        disputeCreatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
        merchantRespondedAt:
          settlementResult !== "AUTOMATIC_TIMEOUT"
            ? new Date(Date.now() - 30 * 60 * 1000)
            : null, // 30 min atrás
        settlementReachedAt: new Date(),
        totalNegotiationTime:
          settlementResult !== "AUTOMATIC_TIMEOUT" ? 90 : 120, // minutos
      },
      financialImpact: {
        merchantLiability: { value: 15.0, currency: "BRL" },
        platformLiability: { value: 10.9, currency: "BRL" },
        customerCompensation: { value: 25.9, currency: "BRL" },
      },
      createdAt: new Date(),
      ...customData,
    };
  }

  // Simular recebimento de eventos via polling
  async simulatePollingEvents(storeFirebaseUid = null, eventCount = 1) {
    console.log(
      `🔄 Simulando ${eventCount} evento(s) de polling para store: ${
        storeFirebaseUid || "global"
      }`
    );

    const events = [];

    for (let i = 0; i < eventCount; i++) {
      // 70% de chance de ser DISPUTE, 30% de ser SETTLEMENT
      const isDispute = Math.random() < 0.7;

      if (isDispute) {
        const dispute = this.generateHandshakeDispute(storeFirebaseUid);
        events.push(dispute);
        console.log(
          `📨 Evento gerado: HANDSHAKE_DISPUTE - ${dispute.disputeId}`
        );
      } else {
        // Para settlement, buscar um dispute existente ou criar um novo
        const existingDispute = await HandshakeDispute.findOne({}).sort({
          createdAt: -1,
        });
        const disputeId = existingDispute
          ? existingDispute.disputeId
          : `DISPUTE_${Date.now()}_AUTO`;

        const settlement = this.generateHandshakeSettlement(disputeId);
        events.push(settlement);
        console.log(
          `📨 Evento gerado: HANDSHAKE_SETTLEMENT - ${settlement.disputeId}`
        );
      }
    }

    // Processar eventos usando o IfoodService
    if (events.length > 0) {
      console.log(`⚙️ Processando ${events.length} eventos...`);
      await this.ifoodService.processEvents(events, storeFirebaseUid);
      console.log(`✅ Todos os eventos foram processados!`);
    }

    return events;
  }

  // Cenário específico: Dispute urgente (expira em 1 hora)
  async simulateUrgentDispute(storeFirebaseUid) {
    console.log("🚨 Simulando DISPUTE URGENTE (expira em 1 hora)");

    const urgentDispute = this.generateHandshakeDispute(storeFirebaseUid, {
      disputeType: "QUALITY",
      description: "URGENTE: Cliente reclama de produto estragado",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    });

    await this.ifoodService.processEvents([urgentDispute], storeFirebaseUid);
    return urgentDispute;
  }

  // Cenário específico: Dispute crítico (expira em 15 minutos)
  async simulateCriticalDispute(storeFirebaseUid) {
    console.log("💥 Simulando DISPUTE CRÍTICO (expira em 15 minutos)");

    const criticalDispute = this.generateHandshakeDispute(storeFirebaseUid, {
      disputeType: "QUALITY",
      description: "CRÍTICO: Produto com problema grave de qualidade",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
    });

    await this.ifoodService.processEvents([criticalDispute], storeFirebaseUid);
    return criticalDispute;
  }

  // Cenário: Fluxo completo (Dispute + Settlement)
  async simulateCompleteNegotiation(storeFirebaseUid) {
    console.log("🔄 Simulando negociação completa (Dispute → Settlement)");

    // 1. Criar dispute
    const dispute = this.generateHandshakeDispute(storeFirebaseUid, {
      disputeType: "MISSING_ITEMS",
      description: "Faltaram itens no pedido",
    });

    await this.ifoodService.processEvents([dispute], storeFirebaseUid);
    console.log(`📨 Dispute criado: ${dispute.disputeId}`);

    // 2. Aguardar um pouco
    console.log("⏳ Aguardando 2 segundos...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Criar settlement
    const settlement = this.generateHandshakeSettlement(dispute.disputeId, {
      orderId: dispute.orderId,
      settlementResult: "ALTERNATIVE_ACCEPTED",
      originalDisputeEventId: dispute.id,
    });

    await this.ifoodService.processEvents([settlement], storeFirebaseUid);
    console.log(`✅ Settlement criado: ${settlement.disputeId}`);

    return { dispute, settlement };
  }

  // Polling contínuo simulado
  async startContinuousPolling(storeFirebaseUid = null, intervalSeconds = 30) {
    if (this.isRunning) {
      console.log("⚠️ Polling já está rodando");
      return;
    }

    this.isRunning = true;
    console.log(
      `🚀 Iniciando polling contínuo para store: ${
        storeFirebaseUid || "global"
      }`
    );
    console.log(`⏰ Intervalo: ${intervalSeconds} segundos`);

    const pollLoop = async () => {
      if (!this.isRunning) return;

      try {
        // 50% de chance de ter eventos a cada polling
        if (Math.random() < 0.5) {
          const eventCount = Math.random() < 0.8 ? 1 : 2; // 80% chance de 1 evento, 20% de 2
          await this.simulatePollingEvents(storeFirebaseUid, eventCount);
        } else {
          console.log("📭 Polling sem eventos");
        }
      } catch (error) {
        console.error("❌ Erro no polling simulado:", error);
      }

      // Agendar próximo polling
      setTimeout(pollLoop, intervalSeconds * 1000);
    };

    pollLoop();
  }

  // Parar polling
  stopPolling() {
    this.isRunning = false;
    console.log("⏹️ Polling simulado parado");
  }

  // Verificar dados no banco
  async checkDatabase() {
    const disputeCount = await HandshakeDispute.countDocuments();
    const settlementCount = await HandshakeSettlement.countDocuments();
    const pendingDisputes = await HandshakeDispute.countDocuments({
      status: "PENDING",
    });

    console.log("📊 Status do banco de dados:");
    console.log(`   Disputes: ${disputeCount} (${pendingDisputes} pendentes)`);
    console.log(`   Settlements: ${settlementCount}`);

    return { disputeCount, settlementCount, pendingDisputes };
  }

  // Limpar dados de teste
  async clearTestData() {
    const disputeResult = await HandshakeDispute.deleteMany({
      disputeId: { $regex: /^DISPUTE_.*/ },
    });

    const settlementResult = await HandshakeSettlement.deleteMany({
      eventId: { $regex: /^event_handshake_.*/ },
    });

    console.log(`🗑️ Dados de teste removidos:`);
    console.log(`   Disputes: ${disputeResult.deletedCount}`);
    console.log(`   Settlements: ${settlementResult.deletedCount}`);
  }

  // Menu interativo
  async showMenu() {
    console.log("\n" + "=".repeat(60));
    console.log("🧪 SIMULADOR DE POLLING IFOOD - HANDSHAKE EVENTS");
    console.log("=".repeat(60));
    console.log("1. Simular 1 evento aleatório");
    console.log("2. Simular dispute URGENTE (1h)");
    console.log("3. Simular dispute CRÍTICO (15min)");
    console.log("4. Simular negociação completa");
    console.log("5. Iniciar polling contínuo");
    console.log("6. Parar polling");
    console.log("7. Verificar banco de dados");
    console.log("8. Limpar dados de teste");
    console.log("9. Sair");
    console.log("=".repeat(60));
  }
}

// Função principal
async function main() {
  const simulator = new IfoodPollingSimulator();

  try {
    await simulator.connectDatabase();

    // Se argumentos foram passados via linha de comando
    const args = process.argv.slice(2);

    if (args.length > 0) {
      const command = args[0];
      const storeUid = args[1] || null;

      switch (command) {
        case "random":
          await simulator.simulatePollingEvents(storeUid, 1);
          break;
        case "urgent":
          await simulator.simulateUrgentDispute(storeUid);
          break;
        case "critical":
          await simulator.simulateCriticalDispute(storeUid);
          break;
        case "complete":
          await simulator.simulateCompleteNegotiation(storeUid);
          break;
        case "continuous":
          await simulator.startContinuousPolling(storeUid, 30);
          break;
        case "check":
          await simulator.checkDatabase();
          break;
        case "clear":
          await simulator.clearTestData();
          break;
        default:
          console.log("❌ Comando não reconhecido");
          console.log(
            "Comandos disponíveis: random, urgent, critical, complete, continuous, check, clear"
          );
      }
    } else {
      // Menu interativo
      await simulator.showMenu();
      console.log(
        "\n💡 Use: node simulate-ifood-polling.js [comando] [storeUid]"
      );
      console.log("Exemplo: node simulate-ifood-polling.js random store123");
      console.log("Exemplo: node simulate-ifood-polling.js continuous");
    }
  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    if (!simulator.isRunning) {
      process.exit(0);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = IfoodPollingSimulator;
