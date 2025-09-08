// Teste standalone para erro 429
// Execute com: node test-standalone.js

console.log("🧪 Teste de simulação de erro 429");
console.log("🔄 Simulando mensagem de rate limit...");
console.warn(
  "Sistema temporariamente instável. Voltará ao normal em instantes."
);
console.log("✅ Teste concluído!");

// Simular diferentes tipos de mensagens
const messages = [
  "Sistema temporariamente instável. Voltará ao normal em instantes.",
  "Muitas requisições detectadas. Aguarde um momento...",
  "Conectividade limitada. Tentando novamente em breve...",
  "Servidor ocupado. Reprocessando automaticamente...",
];

console.log("\n📝 Exemplos de mensagens possíveis:");
messages.forEach((msg, index) => {
  console.log(`${index + 1}. ${msg}`);
});
