#!/usr/bin/env node

/**
 * Script Simples: Deletar Pedidos de uma Store Específica
 *
 * Remove todas as orders de uma store com nome específico
 *
 * Uso: node delete-orders-by-store-name.js
 */

require("dotenv").config({ path: ".env.production" });
const mongoose = require("mongoose");
const readline = require("readline");
const Order = require("./models/Order");

const MONGODB_URI = process.env.MONGODB_URI;

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

async function deleteOrdersByStoreName() {
  try {
    console.log("🚀 Script para deletar pedidos de uma store específica...");

    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI não encontrada!");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado ao MongoDB");

    const storeName = await askQuestion("\n📝 Digite o NOME EXATO da loja: ");
    if (!storeName) {
      console.log("❌ Nome da loja é obrigatório!");
      process.exit(1);
    }

    console.log(`\n🔍 Buscando pedidos da loja: ${storeName}`);
    const orders = await Order.find({ "store.name": storeName });
    console.log(
      `📊 Encontrados ${orders.length} pedidos para a loja '${storeName}'`
    );

    if (orders.length === 0) {
      console.log("🎉 Nenhum pedido encontrado para esta loja!");
      return;
    }

    // Mostrar quais serão deletados
    console.log("\n📋 Pedidos que serão DELETADOS:");
    orders.forEach((order, i) => {
      const createdAt = new Date(order.createdAt).toLocaleString("pt-BR");
      console.log(
        `${i + 1}. ID: ${order._id} | Número: ${
          order.orderNumber
        } | Data: ${createdAt}`
      );
    });

    console.log(
      `\n⚠️  ATENÇÃO: ${orders.length} pedidos serão PERMANENTEMENTE DELETADOS!`
    );
    const confirm = await askQuestion("Digite 'DELETAR' para confirmar: ");

    if (confirm !== "DELETAR") {
      console.log("❌ Operação cancelada pelo usuário.");
      return;
    }

    console.log("\n🗑️  Deletando pedidos...");
    const result = await Order.deleteMany({
      "store.name": storeName,
      status: "pendente",
    });
    console.log(`\n🎉 Operação concluída!`);
    console.log(`   ✅ ${result.deletedCount} pedidos deletados`);
    if (result.deletedCount !== orders.length) {
      console.log(
        `   ⚠️  Esperado: ${orders.length}, Deletado: ${result.deletedCount}`
      );
    }
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    rl.close();
    await mongoose.connection.close();
  }
}

deleteOrdersByStoreName();
