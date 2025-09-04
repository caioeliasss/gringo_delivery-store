// Teste da funcionalidade de alterar status do billing
// Execute com: node test-billing-status.js

const axios = require("axios");

const API_BASE_URL = "http://localhost:8080/api";

// Exemplo de como usar a nova API
async function testBillingStatusUpdate() {
  try {
    console.log("🧪 Testando alteração de status do billing...\n");

    // 1. Primeiro, vamos listar algumas faturas para pegar um ID
    console.log("📋 Listando faturas...");
    const billingsResponse = await axios.get(
      `${API_BASE_URL}/admin/financial/billings`
    );
    const billings = billingsResponse.data.billings;

    if (billings.length === 0) {
      console.log("❌ Nenhuma fatura encontrada para teste");
      return;
    }

    const testBilling = billings[0];
    console.log(`✅ Fatura selecionada: ${testBilling._id}`);
    console.log(`   Status atual: ${testBilling.status}`);
    console.log(`   Valor: R$ ${testBilling.amount}`);
    console.log(`   Loja: ${testBilling.storeName}\n`);

    // 2. Testar alteração de status via admin
    console.log("🔄 Alterando status via admin...");
    const newStatus = testBilling.status === "PENDING" ? "PAID" : "PENDING";

    const updateResponse = await axios.patch(
      `${API_BASE_URL}/admin/financial/billings/${testBilling._id}/status`,
      {
        status: newStatus,
        reason: "Teste automatizado de alteração de status",
      }
    );

    console.log("✅ Status alterado com sucesso!");
    console.log(
      `   Status anterior: ${updateResponse.data.changes.previousStatus}`
    );
    console.log(`   Status novo: ${updateResponse.data.changes.newStatus}`);
    console.log(`   Motivo: ${updateResponse.data.changes.reason}\n`);

    // 3. Testar alteração de status via billing routes (direto)
    console.log("🔄 Testando via billing routes direto...");
    const directUpdateResponse = await axios.patch(
      `${API_BASE_URL}/billing/${testBilling._id}/status`,
      {
        status: testBilling.status, // Voltar para o status original
        reason: "Voltando ao status original",
      }
    );

    console.log("✅ Status revertido com sucesso!");
    console.log(
      `   Status final: ${directUpdateResponse.data.billing.status}\n`
    );

    // 4. Testar validações de erro
    console.log("🚫 Testando validações de erro...");

    try {
      await axios.patch(
        `${API_BASE_URL}/admin/financial/billings/${testBilling._id}/status`,
        {
          status: "INVALID_STATUS",
        }
      );
    } catch (error) {
      console.log("✅ Validação de status inválido funcionando:");
      console.log(`   Erro: ${error.response.data.error}\n`);
    }

    try {
      await axios.patch(
        `${API_BASE_URL}/admin/financial/billings/${testBilling._id}/status`,
        {
          status: testBilling.status, // Mesmo status atual
        }
      );
    } catch (error) {
      console.log("✅ Validação de status igual funcionando:");
      console.log(`   Erro: ${error.response.data.error}\n`);
    }

    console.log("🎉 Todos os testes concluídos com sucesso!");
  } catch (error) {
    console.error(
      "❌ Erro durante o teste:",
      error.response?.data || error.message
    );
  }
}

// Exemplos de uso da API
function printApiExamples() {
  console.log("📖 EXEMPLOS DE USO DA API:\n");

  console.log("1. Via Admin Routes (painel administrativo):");
  console.log("   PATCH /api/admin/financial/billings/{billingId}/status");
  console.log(
    '   Body: { "status": "PAID", "reason": "Pagamento confirmado manualmente" }\n'
  );

  console.log("2. Via Billing Routes (direto):");
  console.log("   PATCH /api/billing/{billingId}/status");
  console.log(
    '   Body: { "status": "OVERDUE", "reason": "Vencimento por falta de pagamento" }\n'
  );

  console.log("3. Status permitidos:");
  console.log("   - PENDING: Pendente");
  console.log("   - PAID: Pago");
  console.log("   - OVERDUE: Vencido");
  console.log("   - CANCELLED: Cancelado");
  console.log("   - ERROR: Erro\n");

  console.log("4. Frontend - AdminService:");
  console.log(
    '   await adminService.updateBillingStatus(billingId, "PAID", "Motivo opcional");\n'
  );

  console.log("5. Funcionalidades automáticas:");
  console.log(
    "   - Status OVERDUE: Restringe acesso da loja (freeToNavigate = false)"
  );
  console.log(
    "   - Status PAID: Libera acesso se não há outras faturas vencidas"
  );
  console.log("   - Notificações automáticas para usuários");
  console.log("   - Logs detalhados no console do servidor\n");
}

// Executar testes se rodado diretamente
if (require.main === module) {
  printApiExamples();

  console.log("⚠️  Para executar os testes reais, certifique-se de que:");
  console.log("   1. O servidor está rodando na porta 8080");
  console.log("   2. Existem faturas no banco de dados");
  console.log("   3. Descomente a linha abaixo:\n");

  // testBillingStatusUpdate();
}

module.exports = { testBillingStatusUpdate, printApiExamples };
