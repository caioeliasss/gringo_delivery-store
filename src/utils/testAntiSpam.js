// src/utils/testAntiSpam.js
// Teste para verificar se a proteção anti-spam está funcionando

import webPushService from "../services/webPushService.js";

export const testAntiSpamProtection = async () => {
  console.log("🧪 Iniciando teste de proteção anti-spam...");

  // Teste 1: Verificações rápidas consecutivas de status
  console.log("\n1️⃣ Testando verificações consecutivas de status:");
  for (let i = 0; i < 5; i++) {
    console.log(`Tentativa ${i + 1}:`);
    const result = await webPushService.checkCurrentStatus();
    console.log(result ? "✅ Executado" : "⏳ Bloqueado");

    // Pequena pausa para ver o comportamento
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Teste 2: Diagnósticos consecutivos
  console.log("\n2️⃣ Testando diagnósticos consecutivos:");
  for (let i = 0; i < 3; i++) {
    console.log(`Tentativa ${i + 1}:`);
    const result = webPushService.getDiagnostics();
    console.log(result ? "✅ Executado" : "⏳ Bloqueado");

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Teste 3: Inicializações consecutivas
  console.log("\n3️⃣ Testando inicializações consecutivas:");
  for (let i = 0; i < 3; i++) {
    console.log(`Tentativa ${i + 1}:`);
    const result = await webPushService.initialize();
    console.log(result ? "✅ Executado" : "⏳ Bloqueado");

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Teste 4: Estatísticas
  console.log("\n4️⃣ Estatísticas anti-spam:");
  const stats = webPushService.getAntiSpamStats();
  console.table(stats);

  console.log("\n✅ Teste de proteção anti-spam concluído!");
  console.log(
    "💡 Se você viu mensagens de bloqueio, a proteção está funcionando corretamente!"
  );
};

// Teste simples para usar no console
export const quickAntiSpamTest = () => {
  console.log("🧪 Teste rápido - executando 3 verificações de status:");

  for (let i = 0; i < 3; i++) {
    setTimeout(async () => {
      console.log(`Verificação ${i + 1}:`);
      const result = await webPushService.checkCurrentStatus();
      console.log(result ? "✅ Permitido" : "⏳ Bloqueado");
    }, i * 500);
  }
};

// Disponibilizar no console do navegador
if (typeof window !== "undefined") {
  window.testAntiSpam = testAntiSpamProtection;
  window.quickAntiSpamTest = quickAntiSpamTest;

  console.log(`
🧪 Testes de proteção anti-spam disponíveis:
- testAntiSpam() - teste completo
- quickAntiSpamTest() - teste rápido
  `);
}

export default {
  testAntiSpamProtection,
  quickAntiSpamTest,
};
