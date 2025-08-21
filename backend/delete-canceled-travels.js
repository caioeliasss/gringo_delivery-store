#!/usr/bin/env node

/**
 * Script Simples: Deletar Viagens Canceladas
 *
 * Remove todas as viagens com status "cancelado" de um motoboy específico
 *
 * Uso: node delete-canceled-travels.js
 */

require("dotenv").config({ path: ".env.production" });
const mongoose = require("mongoose");
const readline = require("readline");

const MONGODB_URI = process.env.MONGODB_URI;

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function deleteCanceledTravels() {
  try {
    console.log("🚀 Script para deletar viagens canceladas...");

    // Verificar se a URI foi carregada
    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI não encontrada!");
      console.log("📋 Variáveis de ambiente disponíveis:");
      console.log("   NODE_ENV:", process.env.NODE_ENV);
      console.log(
        "   MONGODB_URI:",
        process.env.MONGODB_URI ? "definida" : "undefined"
      );
      console.log(
        "\n🔍 Certifique-se que o arquivo .env.production existe e contém MONGODB_URI"
      );
      process.exit(1);
    }

    console.log("🔗 Conectando ao MongoDB...");

    // Conectar
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado ao MongoDB");

    // Pedir o ID do motoboy
    const motoboyId = await askQuestion("\n📝 Digite o ID do motoboy: ");
    const status = await askQuestion("\n📝 Digite o status da viagem: ");

    if (!motoboyId) {
      console.log("❌ ID do motoboy é obrigatório!");
      process.exit(1);
    }

    console.log(`\n🔍 Buscando viagens canceladas do motoboy: ${motoboyId}`);

    // Buscar viagens canceladas do motoboy
    const canceledTravels = await mongoose.connection.db
      .collection("travels")
      .find({
        motoboyId: motoboyId,
        "finance.status": status,
      })
      .toArray();

    console.log(`📊 Encontradas ${canceledTravels.length} viagens canceladas`);

    if (canceledTravels.length === 0) {
      console.log("🎉 Nenhuma viagem cancelada encontrada para este motoboy!");
      return;
    }

    // Mostrar quais serão deletadas
    console.log("\n📋 Viagens que serão DELETADAS:");
    canceledTravels.forEach((travel, i) => {
      const createdAt = new Date(travel.createdAt).toLocaleString("pt-BR");
      const price = travel.price ? `R$ ${travel.price.toFixed(2)}` : "N/A";
      console.log(
        `${i + 1}. ID: ${travel._id} | Preço: ${price} | Data: ${createdAt}`
      );
    });

    console.log(
      `\n⚠️  ATENÇÃO: ${canceledTravels.length} viagens serão PERMANENTEMENTE DELETADAS!`
    );
    const confirm = await askQuestion("Digite 'DELETAR' para confirmar: ");

    if (confirm !== "DELETAR") {
      console.log("❌ Operação cancelada pelo usuário.");
      return;
    }

    console.log("\n🗑️  Deletando viagens...");

    // Deletar as viagens
    const result = await mongoose.connection.db
      .collection("travels")
      .deleteMany({
        motoboyId: motoboyId,
        "finance.status": status,
      });

    console.log(`\n🎉 Operação concluída!`);
    console.log(`   ✅ ${result.deletedCount} viagens deletadas`);

    if (result.deletedCount !== canceledTravels.length) {
      console.log(
        `   ⚠️  Esperado: ${canceledTravels.length}, Deletado: ${result.deletedCount}`
      );
    }
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    rl.close();
    await mongoose.connection.close();
  }
}

// Executar
deleteCanceledTravels();
