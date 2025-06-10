// CRIAR: routes/webhookRoutes.js
const express = require("express");
const router = express.Router();
const Billing = require("../models/Billing");
const Store = require("../models/Store");
const crypto = require("crypto");

// Middleware para verificar assinatura do webhook (segurança)
const verifyAsaasWebhook = (req, res, next) => {
  try {
    // Asaas envia token de acesso no header
    const asaasAccessToken = req.headers["asaas-access-token"];

    // Verificar se é uma requisição válida do Asaas
    if (
      !asaasAccessToken ||
      asaasAccessToken !== process.env.ASAAS_WEBHOOK_TOKEN
    ) {
      console.log("❌ Webhook não autorizado");
      return res.status(401).json({ error: "Não autorizado" });
    }

    next();
  } catch (error) {
    console.error("❌ Erro na verificação do webhook:", error);
    res.status(400).json({ error: "Erro na verificação" });
  }
};

// Webhook principal do Asaas
router.post("/asaas", verifyAsaasWebhook, async (req, res) => {
  try {
    const { event, payment } = req.body;

    console.log("🔔 Webhook recebido:", {
      event,
      paymentId: payment.id,
      value: payment.value,
      status: payment.status,
      customer: payment.customer,
    });

    // Processar diferentes tipos de eventos
    switch (event) {
      case "PAYMENT_RECEIVED":
        await handlePaymentReceived(payment);
        break;

      case "PAYMENT_CONFIRMED":
        await handlePaymentConfirmed(payment);
        break;

      case "PAYMENT_OVERDUE":
        await handlePaymentOverdue(payment);
        break;

      default:
        console.log(`ℹ️ Evento não processado: ${event}`);
    }

    // Sempre retornar 200 para o Asaas
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Função para processar pagamento recebido
async function handlePaymentReceived(payment) {
  try {
    console.log("💰 Processando pagamento recebido:", payment.id);

    // Buscar a fatura no banco local
    const billing = await Billing.findOne({
      asaasInvoiceId: payment.id,
    });

    if (!billing) {
      console.log("⚠️ Fatura não encontrada no banco local:", payment.id);
      return;
    }

    // Atualizar status da fatura
    billing.status = "PAID";
    billing.paidAt = new Date(payment.dateReceived || new Date());
    billing.paymentMethod = payment.billingType;
    billing.asaasData = payment; // Salvar dados completos do Asaas

    await billing.save();

    console.log(`✅ Fatura ${billing._id} marcada como paga`);

    // Buscar dados da loja
    const store = await Store.findById(billing.storeId);
    if (store) {
      // Enviar notificação para a loja
      await sendPaymentNotification(store, billing, payment);

      // Atualizar status da loja se necessário
      if (billing.type === "SUBSCRIPTION") {
        await updateStoreSubscriptionStatus(store, billing);
      }
    }
  } catch (error) {
    console.error("❌ Erro ao processar pagamento recebido:", error);
  }
}

// Função para processar pagamento confirmado
async function handlePaymentConfirmed(payment) {
  try {
    console.log("✅ Processando pagamento confirmado:", payment.id);

    // Similar ao received, mas com confirmação final
    const billing = await Billing.findOne({
      asaasInvoiceId: payment.id,
    });

    if (billing) {
      billing.status = "CONFIRMED";
      billing.confirmedAt = new Date();
      await billing.save();

      console.log(`✅ Fatura ${billing._id} confirmada`);
    }
  } catch (error) {
    console.error("❌ Erro ao processar confirmação:", error);
  }
}

// Função para processar pagamento vencido
async function handlePaymentOverdue(payment) {
  try {
    console.log("⏰ Processando pagamento vencido:", payment.id);

    const billing = await Billing.findOne({
      asaasInvoiceId: payment.id,
    });

    if (billing) {
      billing.status = "OVERDUE";
      billing.overdueAt = new Date();
      await billing.save();

      console.log(`⏰ Fatura ${billing._id} marcada como vencida`);

      // Enviar notificação de vencimento
      const store = await Store.findById(billing.storeId);
      if (store) {
        await sendOverdueNotification(store, billing);
      }
    }
  } catch (error) {
    console.error("❌ Erro ao processar vencimento:", error);
  }
}

// Enviar notificação de pagamento para a loja
async function sendPaymentNotification(store, billing, payment) {
  try {
    console.log(
      `📧 Enviando notificação de pagamento para ${store.businessName}`
    );

    // Implementar envio de email, SMS, push notification, etc.
    // Exemplo com email:
    /*
    const emailService = require('../services/emailService');
    await emailService.sendPaymentConfirmation({
      to: store.email,
      storeName: store.businessName,
      amount: billing.amount,
      paidAt: billing.paidAt,
      description: billing.description
    });
    */

    // Ou webhook para o sistema da loja:
    /*
    if (store.webhookUrl) {
      await fetch(store.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment_received',
          billing: billing,
          payment: payment
        })
      });
    }
    */
  } catch (error) {
    console.error("❌ Erro ao enviar notificação:", error);
  }
}

// Atualizar status da assinatura da loja
async function updateStoreSubscriptionStatus(store, billing) {
  try {
    if (billing.type === "SUBSCRIPTION") {
      // Calcular próxima data de vencimento
      const nextBillingDate = new Date(billing.dueDate);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      // Atualizar loja
      store.subscriptionStatus = "ACTIVE";
      store.nextBillingDate = nextBillingDate;
      store.lastPaymentDate = billing.paidAt;

      await store.save();

      console.log(`📊 Status da loja atualizado: ${store.businessName}`);
    }
  } catch (error) {
    console.error("❌ Erro ao atualizar status da loja:", error);
  }
}

// Enviar notificação de vencimento
async function sendOverdueNotification(store, billing) {
  try {
    console.log(
      `⚠️ Enviando notificação de vencimento para ${store.businessName}`
    );

    // Implementar notificação de vencimento
    // Email, SMS, etc.
  } catch (error) {
    console.error("❌ Erro ao enviar notificação de vencimento:", error);
  }
}

// Rota para testar webhook manualmente
router.post("/test-webhook", async (req, res) => {
  try {
    // Simular webhook do Asaas
    const mockPayment = {
      id: "pay_test_123",
      value: 89.9,
      status: "RECEIVED",
      billingType: "BOLETO",
      dateReceived: new Date().toISOString(),
      customer: "cus_test_123",
    };

    await handlePaymentReceived(mockPayment);

    res.json({
      success: true,
      message: "Webhook de teste processado",
      payment: mockPayment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
