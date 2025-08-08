// Script para testar os novos endpoints de busca
// Execute com: node test_search_endpoints.js

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api"; // Ajuste conforme sua configuração

// Função para testar busca de motoboys
async function testMotoboySearch() {
  console.log("\n🔍 Testando busca de motoboys...");

  try {
    // Teste 1: Busca simples
    const response1 = await axios.get(`${BASE_URL}/motoboys/search?q=joão`);
    console.log('✅ Busca por "joão":', response1.data.length, "resultados");

    // Teste 2: Busca com filtros
    const response2 = await axios.get(
      `${BASE_URL}/motoboys/search?q=silva&approved=true&available=true`
    );
    console.log(
      '✅ Busca por "silva" (aprovados e disponíveis):',
      response2.data.length,
      "resultados"
    );

    // Teste 3: Busca por CPF
    const response3 = await axios.get(
      `${BASE_URL}/motoboys/search?q=123456789`
    );
    console.log(
      '✅ Busca por CPF "123456789":',
      response3.data.length,
      "resultados"
    );

    // Teste 4: Busca por telefone
    const response4 = await axios.get(`${BASE_URL}/motoboys/search?q=11999`);
    console.log(
      '✅ Busca por telefone "11999":',
      response4.data.length,
      "resultados"
    );
  } catch (error) {
    console.error(
      "❌ Erro na busca de motoboys:",
      error.response?.data || error.message
    );
  }
}

// Função para testar busca de estabelecimentos
async function testStoreSearch() {
  console.log("\n🔍 Testando busca de estabelecimentos...");

  try {
    // Teste 1: Busca por nome comercial
    const response1 = await axios.get(`${BASE_URL}/stores/search?q=pizzaria`);
    console.log(
      '✅ Busca por "pizzaria":',
      response1.data.length,
      "resultados"
    );

    // Teste 2: Busca com filtros
    const response2 = await axios.get(
      `${BASE_URL}/stores/search?q=lanchonete&approved=true&available=true`
    );
    console.log(
      '✅ Busca por "lanchonete" (aprovadas e disponíveis):',
      response2.data.length,
      "resultados"
    );

    // Teste 3: Busca por CNPJ
    const response3 = await axios.get(
      `${BASE_URL}/stores/search?q=12345678000`
    );
    console.log(
      '✅ Busca por CNPJ "12345678000":',
      response3.data.length,
      "resultados"
    );

    // Teste 4: Busca por endereço
    const response4 = await axios.get(
      `${BASE_URL}/stores/search?q=rua das flores`
    );
    console.log(
      '✅ Busca por endereço "rua das flores":',
      response4.data.length,
      "resultados"
    );

    // Teste 5: Busca por bairro
    const response5 = await axios.get(`${BASE_URL}/stores/search?q=centro`);
    console.log(
      '✅ Busca por bairro "centro":',
      response5.data.length,
      "resultados"
    );
  } catch (error) {
    console.error(
      "❌ Erro na busca de estabelecimentos:",
      error.response?.data || error.message
    );
  }
}

// Função para testar query inválida
async function testInvalidQueries() {
  console.log("\n⚠️  Testando queries inválidas...");

  try {
    // Query muito pequena
    const response1 = await axios.get(`${BASE_URL}/motoboys/search?q=a`);
  } catch (error) {
    console.log("✅ Query muito pequena rejeitada corretamente");
  }

  try {
    // Query vazia
    const response2 = await axios.get(`${BASE_URL}/stores/search?q=`);
  } catch (error) {
    console.log("✅ Query vazia rejeitada corretamente");
  }
}

// Função para configurar índices (executar apenas uma vez)
async function setupIndexes() {
  console.log("\n⚙️  Configurando índices de busca...");

  try {
    await axios.post(`${BASE_URL}/motoboys/setup-search-indexes`);
    console.log("✅ Índices de motoboys criados");

    await axios.post(`${BASE_URL}/stores/setup-search-indexes`);
    console.log("✅ Índices de estabelecimentos criados");
  } catch (error) {
    console.error(
      "❌ Erro ao criar índices:",
      error.response?.data || error.message
    );
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log("🚀 Iniciando testes dos endpoints de busca...");

  // Configurar índices primeiro (comentar após primeira execução)
  // await setupIndexes();

  await testMotoboySearch();
  await testStoreSearch();
  await testInvalidQueries();

  console.log("\n✅ Todos os testes concluídos!");
}

// Executar testes se este arquivo for chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testMotoboySearch,
  testStoreSearch,
  testInvalidQueries,
  setupIndexes,
};
