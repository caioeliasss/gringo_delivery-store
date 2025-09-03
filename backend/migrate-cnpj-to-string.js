#!/usr/bin/env node

/**
 * Script Simples: CNPJ Number -> String
 *
 * Converte todos os CNPJs que estão como Number para String
 *
 * Uso: node scripts/migrate-cnpj-to-string.js
 */

require("dotenv").config({ path: ".env.production" });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateCNPJToString() {
  try {
    console.log("🚀 Convertendo CNPJs de Number para String...");

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

    // Buscar stores com CNPJ como Number
    const stores = await mongoose.connection.db
      .collection("stores")
      .find()
      .toArray();

    console.log(`📊 Encontrados ${stores.length} stores com CNPJ como Number`);

    if (stores.length === 0) {
      console.log("🎉 Todos os CNPJs já são String!");
      return;
    }

    // Mostrar quais serão convertidos
    console.log("\n📋 Stores que serão convertidos:");
    stores.forEach((store, i) => {
      console.log(
        `${i + 1}. ${store.businessName || store.email} - CNPJ: ${store.cnpj}`
      );
    });

    console.log(
      "\n⚠️  Pressione Enter para continuar ou Ctrl+C para cancelar..."
    );
    await new Promise((resolve) => process.stdin.once("data", resolve));

    // Converter cada um
    let converted = 0;
    for (const store of stores) {
      const result = await mongoose.connection.db
        .collection("stores")
        .updateOne({ _id: store._id }, { $set: { freeToNavigate: true } });

      if (result.modifiedCount === 1) {
        converted++;
        console.log(
          `✅ ${store.businessName || store.email}: ${store.cnpj} -> "${
            store.cnpj
          }"`
        );
      }
    }

    console.log(`\n🎉 Migração concluída! ${converted} stores convertidos.`);
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Executar
migrateCNPJToString();
