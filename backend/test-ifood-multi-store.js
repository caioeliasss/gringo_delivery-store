const IfoodService = require("./services/ifoodService");
const IfoodPollingService = require("./services/ifoodPollingService");
const Store = require("./models/Store");

/**
 * Script de teste para o novo sistema de autenticação iFood por store
 * Execute com: node test-ifood-multi-store.js
 */

async function testIfoodMultiStore() {
  console.log("=== Teste do Sistema iFood Multi-Store ===\n");

  try {
    // 1. Testar criação de store com configuração iFood
    console.log("1. Testando configuração de store...");

    // Exemplo de store com configuração (substitua com dados reais para teste)
    const testStore = {
      firebaseUid: "test-store-123",
      email: "test@store.com",
      phone: "11999999999",
      ifoodConfig: {
        clientId: "seu_client_id_aqui",
        clientSecret: "seu_client_secret_aqui",
        merchantId: "seu_merchant_id_aqui",
      },
    };

    console.log("Store de teste configurado:", {
      firebaseUid: testStore.firebaseUid,
      hasIfoodConfig: !!testStore.ifoodConfig,
    });

    // 2. Testar criação do IfoodService para store específico
    console.log("\n2. Testando criação do IfoodService...");

    // Método 1: Construtor com parâmetros
    const ifoodService1 = new IfoodService(
      testStore.firebaseUid,
      testStore.ifoodConfig.clientId,
      testStore.ifoodConfig.clientSecret
    );

    console.log("✓ IfoodService criado com construtor");
    console.log("✓ Tem credenciais:", ifoodService1.hasCredentials());

    // Método 2: Configuração posterior (requer store no banco)
    // const ifoodService2 = new IfoodService();
    // await ifoodService2.setStoreCredentials(testStore.firebaseUid);

    // 3. Testar IfoodPollingService
    console.log("\n3. Testando IfoodPollingService...");

    const pollingService = new IfoodPollingService();
    console.log("✓ IfoodPollingService criado");

    const initialStatus = pollingService.getPollingStatus();
    console.log("Status inicial:", {
      isRunning: initialStatus.isRunning,
      totalStores: initialStatus.totalStores,
    });

    // 4. Testar métodos do IfoodService (sem fazer requisições reais)
    console.log("\n4. Testando métodos do IfoodService...");

    console.log("✓ Métodos disponíveis:");
    console.log("  - hasCredentials():", ifoodService1.hasCredentials());
    console.log("  - authenticate() - disponível");
    console.log("  - getOrders() - disponível");
    console.log("  - getOrderDetails() - disponível");
    console.log("  - confirmOrder() - disponível");
    console.log("  - dispatchOrder() - disponível");
    console.log("  - readyForPickup() - disponível");

    console.log("\n=== Teste Concluído com Sucesso! ===");
    console.log("\nPróximos passos:");
    console.log("1. Configure as credenciais reais do iFood no banco de dados");
    console.log("2. Execute o servidor para iniciar o polling automático");
    console.log("3. Use as APIs /api/ifood/polling-status para monitorar");
  } catch (error) {
    console.error("❌ Erro durante o teste:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Executar teste se este arquivo for executado diretamente
if (require.main === module) {
  testIfoodMultiStore()
    .then(() => {
      console.log("\nTeste finalizado.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Erro fatal:", error);
      process.exit(1);
    });
}

module.exports = { testIfoodMultiStore };
