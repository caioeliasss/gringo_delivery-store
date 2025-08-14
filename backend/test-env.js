const fs = require("fs");
const path = require("path");

console.log("🧪 SIMULANDO AMBIENTE DE PRODUÇÃO\n");

// Simular diferentes cenários de NODE_ENV
const testScenarios = [
  {
    NODE_ENV: undefined,
    description: "NODE_ENV não definido (seu caso atual)",
  },
  { NODE_ENV: "production", description: "NODE_ENV=production" },
  { NODE_ENV: "development", description: "NODE_ENV=development" },
];

// Função copiada do seu server.js
const resolveEnvFile = (nodeEnv) => {
  const requestedRaw = nodeEnv;
  const requested = requestedRaw?.toLowerCase() || "";
  const priority = [];

  if (!requested) {
    // Sem NODE_ENV definido: preferir produção se existir
    priority.push(".env.production", ".env.development");
  } else if (requested === "production") {
    priority.push(".env.production");
  } else if (requested === "test") {
    priority.push(".env.test");
  } else {
    priority.push(".env.development");
  }

  // Por fim o genérico
  priority.push(".env");

  for (const file of priority) {
    if (fs.existsSync(path.join(__dirname, file))) {
      return file;
    }
  }
  return null;
};

// Simular AsaasService
const simulateAsaasService = (envVars) => {
  const rawEnv = (envVars.ASAAS_ENVIRONMENT || "").trim().toLowerCase();
  const apiKey = envVars.ASAAS_API_KEY || "";

  // Lógica do AsaasService atualizado
  const hasProductionKey = apiKey.includes("$aact_prod_");
  const isExplicitProd = rawEnv === "production";
  const isProd = hasProductionKey || isExplicitProd;

  const environment = isProd ? "production" : "sandbox";
  const baseURL = isProd
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

  return {
    environment,
    baseURL,
    hasProductionKey,
    isExplicitProd,
    rawEnv,
    apiKey: apiKey.slice(0, 20) + "...", // Mostrar só o início por segurança
  };
};

// Listar arquivos .env disponíveis
console.log("📁 ARQUIVOS .env ENCONTRADOS:");
const envFiles = [".env", ".env.development", ".env.production", ".env.test"];
envFiles.forEach((file) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? "✅" : "❌"} ${file}`);
});

console.log("\n" + "=".repeat(60) + "\n");

// Testar cada cenário
testScenarios.forEach((scenario, index) => {
  console.log(`🎯 CENÁRIO ${index + 1}: ${scenario.description}`);

  // Resolver qual arquivo seria carregado
  const chosenFile = resolveEnvFile(scenario.NODE_ENV);
  console.log(`📄 Arquivo escolhido: ${chosenFile || "NENHUM"}`);

  if (chosenFile) {
    // Carregar variáveis do arquivo
    const envPath = path.join(__dirname, chosenFile);
    const envContent = fs.readFileSync(envPath, "utf8");
    const envVars = {};

    // Parser simples de .env
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join("=");
        }
      }
    });

    console.log(
      `🌐 MONGODB_URI: ${envVars.MONGODB_URI ? "✅ Definido" : "❌ Ausente"}`
    );
    console.log(
      `🔑 ASAAS_ENVIRONMENT: ${envVars.ASAAS_ENVIRONMENT || "(não definido)"}`
    );
    console.log(
      `🗝️ ASAAS_API_KEY: ${
        envVars.ASAAS_API_KEY ? "✅ Definido" : "❌ Ausente"
      }`
    );

    // Simular AsaasService
    if (envVars.ASAAS_API_KEY) {
      console.log("\n🔧 SIMULAÇÃO ASAAS SERVICE:");
      const asaasResult = simulateAsaasService(envVars);

      console.log(`  Environment detectado: ${asaasResult.environment}`);
      console.log(`  BaseURL: ${asaasResult.baseURL}`);
      console.log(`  Chave é de produção: ${asaasResult.hasProductionKey}`);
      console.log(`  Ambiente explícito prod: ${asaasResult.isExplicitProd}`);
      console.log(`  ASAAS_ENVIRONMENT raw: "${asaasResult.rawEnv}"`);

      // Diagnóstico
      if (
        asaasResult.environment === "sandbox" &&
        asaasResult.hasProductionKey
      ) {
        console.log("  ⚠️ ATENÇÃO: Chave de produção mas ambiente sandbox!");
      } else if (asaasResult.environment === "production") {
        console.log("  ✅ CORRETO: Ambiente de produção configurado!");
      }
    }
  } else {
    console.log("❌ ERRO: Nenhum arquivo .env encontrado!");
  }

  console.log("\n" + "-".repeat(40) + "\n");
});

// Recomendações finais
console.log("💡 RECOMENDAÇÕES:");
console.log(
  "1. Para forçar produção: certifique-se que .env.production existe e contém ASAAS_ENVIRONMENT=production"
);
console.log(
  "2. Ou use chave que contém '$aact_prod_' (será detectada automaticamente)"
);
console.log(
  "3. Defina NODE_ENV=production para garantir que .env.production seja usado"
);
console.log("\n🚀 Execute: node test-env.js");
