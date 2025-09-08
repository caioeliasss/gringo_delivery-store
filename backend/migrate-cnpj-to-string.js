#!/usr/bin/env node

/**
 * Script Simples: Adicionar Roles às Ocorrências
 *
 * Adiciona roles apropriados a todas as ocorrências baseado no tipo
 *
 * Uso: node migrate-cnpj-to-string.js
 */

require("dotenv").config({ path: ".env.production" });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateCNPJToString() {
  try {
    console.log("🚀 Adicionando roles às ocorrências baseado no tipo...");

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

    // Buscar todas as occurrences
    const occurrences = await mongoose.connection.db
      .collection("occurrences")
      .find()
      .toArray();

    console.log(
      `📊 Encontradas ${occurrences.length} ocorrências para atualizar`
    );

    if (occurrences.length === 0) {
      console.log("🎉 Nenhuma ocorrência encontrada!");
      return;
    }

    // Mostrar quais serão convertidos
    console.log("\n📋 Occurrences que serão atualizados:");
    occurrences.forEach((occurrence, i) => {
      // Preparar roles para mostrar preview
      let previewRoles = ["admin"]; // sempre inclui admin

      // Adicionar roles baseado no type
      if (occurrence.type === "PAGAMENTO") {
        previewRoles.push("finances");
      } else if (
        occurrence.type === "ENTREGA" ||
        occurrence.type === "MOTOBOY" ||
        occurrence.type === "ENTREGADOR"
      ) {
        previewRoles.push("logistics");
        previewRoles.push("general");
      } else {
        // Todos os outros tipos: CLIENTE, APP, OUTRO, ESTABELECIMENTO, PRODUTO, PEDIDO, EVENTO
        previewRoles.push("general");
      }

      console.log(
        `   ${i + 1}. Tipo: ${occurrence.type} -> Roles: [${previewRoles.join(
          ", "
        )}]`
      );
    });

    console.log(
      "\n⚠️  Pressione Enter para continuar ou Ctrl+C para cancelar..."
    );
    await new Promise((resolve) => process.stdin.once("data", resolve));

    // Atualizar cada occurrence
    let converted = 0;
    for (const occurrence of occurrences) {
      // Preparar os roles para esta occurrence
      let roles = ["admin"]; // sempre inclui admin

      if (occurrence.type === "PAGAMENTO") {
        roles.push("finances");
      } else if (
        occurrence.type === "ENTREGA" ||
        occurrence.type === "MOTOBOY" ||
        occurrence.type === "ENTREGADOR"
      ) {
        roles.push("logistics");
        roles.push("general");
      } else {
        // Todos os outros tipos: CLIENTE, APP, OUTRO, ESTABELECIMENTO, PRODUTO, PEDIDO, EVENTO
        roles.push("general");
      }

      const result = await mongoose.connection.db
        .collection("occurrences")
        .updateOne({ _id: occurrence._id }, { $set: { role: roles } });

      if (result.modifiedCount === 1) {
        converted++;
        console.log(
          `✅ Occurrence ${occurrence._id}: Tipo ${
            occurrence.type
          } -> Roles: [${roles.join(", ")}]`
        );
      }
    }

    console.log(
      `\n🎉 Migração concluída! ${converted} occurrences atualizados.`
    );
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Executar
migrateCNPJToString();
