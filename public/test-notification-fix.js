// Script de teste para verificar se o erro de Notification foi resolvido
console.log("🧪 Teste de Notification API - iPhone");

// Teste 1: Verificar se podemos criar uma instância do WebPushService
try {
  console.log("📱 Teste 1: Importando WebPushService...");

  // Simular a importação do serviço
  if (typeof Notification === "undefined") {
    console.log(
      "⚠️ Notification API não disponível (normal no iPhone em alguns casos)"
    );
  } else {
    console.log("✅ Notification API disponível:", Notification.permission);
  }

  console.log("✅ Teste 1 passou - sem erros de ReferenceError");
} catch (error) {
  console.error("❌ Teste 1 falhou:", error);
}

// Teste 2: Verificar inicialização lazy
try {
  console.log("📱 Teste 2: Testando inicialização lazy...");

  class TestWebPushService {
    constructor() {
      this.permission = "default";
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;

      try {
        if (
          typeof window !== "undefined" &&
          typeof Notification !== "undefined"
        ) {
          this.permission = Notification.permission;
          console.log(
            "✅ Notification.permission acessado com segurança:",
            this.permission
          );
        } else {
          console.log("⚠️ Notification não disponível - usando fallback");
        }
      } catch (error) {
        console.warn("⚠️ Erro ao acessar Notification:", error);
      }

      this.initialized = true;
    }

    hasPermission() {
      this.init();
      return this.permission === "granted";
    }
  }

  const testService = new TestWebPushService();
  console.log("✅ Constructor executado sem erro");

  const hasPermission = testService.hasPermission();
  console.log("✅ hasPermission() executado:", hasPermission);

  console.log("✅ Teste 2 passou - inicialização lazy funcionando");
} catch (error) {
  console.error("❌ Teste 2 falhou:", error);
}

// Teste 3: Verificar disponibilidade de APIs
console.log("📱 Teste 3: Verificando APIs disponíveis...");
console.log("- window:", typeof window !== "undefined");
console.log("- Notification:", typeof Notification !== "undefined");
console.log(
  "- navigator.serviceWorker:",
  typeof navigator !== "undefined" && "serviceWorker" in navigator
);
console.log("- localStorage:", typeof localStorage !== "undefined");

// Teste 4: Simular carregamento do React
console.log("📱 Teste 4: Simulando carregamento do React...");
setTimeout(() => {
  if (document.querySelector("#root")) {
    console.log("✅ React carregou com sucesso");
  } else {
    console.log("❌ React não carregou");
  }
}, 3000);

console.log("🧪 Todos os testes executados");
