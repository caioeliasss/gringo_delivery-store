// src/utils/test429Error.js

// Versão standalone para teste no console do navegador
const testRateLimitMessage = () => {
  console.log("🧪 Simulando erro 429...");
  console.warn(
    "Sistema temporariamente instável. Voltará ao normal em instantes."
  );

  // Se estivermos no contexto do navegador, mostrar um alert também
  if (typeof window !== "undefined") {
    alert("Sistema temporariamente instável. Voltará ao normal em instantes.");
  }
};

// Versão que usa o módulo real (para uso na aplicação)
let realShowRateLimitMessage = null;

// Função para importar dinamicamente quando necessário
const initializeWithRealModule = async () => {
  try {
    const { showRateLimitMessage } = await import("./systemMessageNotifier.js");
    realShowRateLimitMessage = showRateLimitMessage;
    return true;
  } catch (error) {
    console.warn(
      "Não foi possível importar systemMessageNotifier:",
      error.message
    );
    return false;
  }
};

// Função para testar manualmente a mensagem de erro 429
export const test429Message = async () => {
  console.log("🧪 Simulando erro 429...");

  // Tentar usar o módulo real primeiro
  if (!realShowRateLimitMessage) {
    await initializeWithRealModule();
  }

  if (realShowRateLimitMessage) {
    realShowRateLimitMessage();
  } else {
    // Fallback para versão standalone
    testRateLimitMessage();
  }
};

// Função para teste simples no console
export const testSimple429 = () => {
  testRateLimitMessage();
};

// Adicionar ao window para facilitar o teste via console do navegador
if (typeof window !== "undefined") {
  window.test429Message = test429Message;
  window.testSimple429 = testSimple429;

  // Instrução para o usuário
  console.log(`
🧪 Para testar o erro 429, use no console do navegador:
- test429Message() - versão completa
- testSimple429() - versão simples
  `);
}
