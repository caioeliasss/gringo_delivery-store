const Billing = require("../models/Billing");
const express = require("express");
const router = express.Router();
const asaasService = require("../services/asaasService");
const { default: mongoose } = require("mongoose");
const notificationService = require("../services/notificationService");
const emailService = require("../services/emailService");

// Criar fatura
const createBilling = async (req, res) => {
  const {
    customerId: incomingCustomerId,
    firebaseUid,
    storeId,
    amount,
    dueDate,
    period,
    type,
    description,
    paymentMethod,
  } = req.body;

  try {
    if (!firebaseUid || !storeId || !amount) {
      return res.status(400).json({
        message: "Campos obrigatórios: firebaseUid, storeId, amount",
      });
    }

    // Garantir customerId (Asaas) se não vier do frontend
    let finalCustomerId = incomingCustomerId;
    if (!finalCustomerId) {
      const Store = require("../models/Store");
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store não encontrada" });
      }
      // Usa ensureCustomer para criar/obter
      const ensured = await asaasService.ensureCustomer(store.toObject());
      finalCustomerId = ensured.id;
      if (!store.asaasCustomerId) {
        store.asaasCustomerId = finalCustomerId;
        await store.save();
      }
    }

    const billing = new Billing({
      customerId: finalCustomerId,
      firebaseUid,
      storeId,
      amount,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      period: period || "MONTHLY",
      type: type || "SUBSCRIPTION",
      description: description || "Fatura mensal",
      paymentMethod: paymentMethod || "PIX",
    });

    // Cria fatura no Asaas
    const asaasInvoice = await asaasService.createInvoice({
      customerId: billing.customerId,
      amount: billing.amount,
      dueDate: billing.dueDate.toISOString().split("T")[0],
      description: billing.description,
      paymentMethod: billing.paymentMethod,
    });

    // Persistir id da fatura Asaas se retornar
    if (asaasInvoice?.id) {
      billing.asaasInvoiceId = asaasInvoice.id;
      billing.asaasData = asaasInvoice;
      await billing.save();

      notificationService.createGenericNotification({
        title: "Novo boleto pendente",
        message: `Uma nova fatura foi criada para você`,
        firebaseUid: billing.firebaseUid,
        type: "BILLING",
      });
    }

    res.status(201).json({ billing, asaasInvoice });
  } catch (error) {
    console.error("Erro ao criar fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

// Listar faturas
const listBillings = async (req, res) => {
  try {
    const billings = await Billing.find({ firebaseUid: req.user.uid });
    res.status(200).json(billings);
  } catch (error) {
    console.error("Erro ao listar faturas:", error);
    res.status(500).json({ message: error.message });
  }
};

// Consultar fatura
const getBilling = async (req, res) => {
  const { id } = req.params;

  try {
    const billing = await Billing.findById(id);
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }
    res.status(200).json(billing);
  } catch (error) {
    console.error("Erro ao consultar fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

const getBillingOverdue = async (req, res) => {
  const { storeId } = req.params;
  try {
    const billing = await Billing.find({
      status: "OVERDUE",
    });
    const billingWithStore = billing.filter(
      (bill) => bill.storeId.toString() === storeId
    );

    res.status(200).json(billingWithStore);
  } catch (error) {
    console.error("Erro ao consultar fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

const getPaymentQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    // Chama o serviço Asaas para gerar o QR Code
    const asaasInvoice = await asaasService.getQRcodePayments(id);
    if (!asaasInvoice) {
      return res.status(404).json({ message: "QR Code não encontrado" });
    }

    res.status(200).json({ asaasInvoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Atualizar fatura
const updateBilling = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const billing = await Billing.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }

    // Se a fatura foi marcada como vencida, verificar se deve restringir acesso
    if (updates.status === "OVERDUE") {
      const Store = require("../models/Store");
      const store = await Store.findById(billing.storeId);
      if (store && store.freeToNavigate === true) {
        store.freeToNavigate = false;
        await store.save();
        console.log(
          `🚫 Acesso restringido para ${store.businessName} - fatura vencida`
        );

        // Notificar sobre suspensão
        try {
          await emailService.notifyUserAccessReproval(store);
        } catch (notifError) {
          console.warn(
            "Erro ao enviar notificação de suspensão:",
            notifError.message
          );
        }
      }
    }
    // Se a fatura foi paga, verificar se deve liberar acesso
    else if (updates.status === "PAID") {
      // Verificar se ainda há outras faturas vencidas
      const overdueCount = await Billing.countDocuments({
        storeId: billing.storeId,
        status: "OVERDUE",
      });

      if (overdueCount === 0) {
        const Store = require("../models/Store");
        const store = await Store.findById(billing.storeId);
        if (
          store &&
          store.freeToNavigate === false &&
          store.cnpj_approved === true
        ) {
          store.freeToNavigate = true;
          await store.save();
          console.log(
            `✅ Acesso liberado para ${store.businessName} - sem faturas vencidas`
          );

          // Notificar sobre reativação
          try {
            await emailService.notifyUserAccessLiberation(store);
          } catch (notifError) {
            console.warn(
              "Erro ao enviar notificação de reativação:",
              notifError.message
            );
          }
        }
      }
    }

    res.status(200).json(billing);
  } catch (error) {
    console.error("Erro ao atualizar fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

// Verificar status da fatura no Asaas
const checkBillingStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const billing = await Billing.findById(id);
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }

    if (billing.asaasInvoiceId) {
      const asaasInvoice = await asaasService.getInvoice(
        billing.asaasInvoiceId
      );

      // Atualizar status local se necessário
      if (asaasInvoice.status !== billing.status) {
        billing.status =
          asaasInvoice.status === "RECEIVED" ? "PAID" : billing.status;
        await billing.save();
      }

      res.status(200).json({ billing, asaasInvoice });
    } else {
      res.status(200).json({ billing });
    }
  } catch (error) {
    console.error("Erro ao verificar status da fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

// Deletar fatura
const deleteBilling = async (req, res) => {
  const { id } = req.params;

  try {
    const billing = await Billing.findById(id);
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }

    // Verificar se a fatura pode ser excluída (apenas pendentes ou vencidas)
    if (
      !["PENDING", "OVERDUE", "ERROR", "CANCELLED"].includes(billing.status)
    ) {
      return res.status(400).json({
        message: "Apenas cobranças pendentes ou vencidas podem ser excluídas",
      });
    }

    // Se houver ID do Asaas, tentar cancelar lá primeiro
    if (billing.asaasInvoiceId) {
      try {
        await asaasService.cancelInvoice(billing.asaasInvoiceId);
        console.log("Fatura cancelada no Asaas:", billing.asaasInvoiceId);
      } catch (asaasError) {
        console.warn(
          "Erro ao cancelar no Asaas (continuando):",
          asaasError.message
        );
        // Continua mesmo se falhar no Asaas, para permitir limpeza do banco local
      }
    }

    // Remover do banco de dados local
    await Billing.findByIdAndDelete(id);

    // Notificar a loja sobre o cancelamento
    try {
      await notificationService.createGenericNotification({
        title: "Cobrança cancelada",
        message: `Uma cobrança de ${billing.amount} foi cancelada pelo administrador`,
        firebaseUid: billing.firebaseUid,
        type: "BILLING",
      });
    } catch (notifError) {
      console.warn("Erro ao enviar notificação:", notifError.message);
    }

    res.status(200).json({
      message: "Cobrança excluída com sucesso",
      deletedBilling: {
        id: billing._id,
        amount: billing.amount,
        status: billing.status,
      },
    });
  } catch (error) {
    console.error("Erro ao excluir fatura:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// ✅ ADICIONAR: Função para buscar faturas pendentes
const getBillingPending = async (req, res) => {
  const { storeId } = req.params;
  try {
    const billing = await Billing.find({
      status: "PENDING",
    });
    const billingWithStore = billing.filter(
      (bill) => bill.storeId.toString() === storeId
    );

    res.status(200).json(billingWithStore);
  } catch (error) {
    console.error("Erro ao consultar fatura:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ NOVA FUNÇÃO: Alterar status do billing
const updateBillingStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    // Validar parâmetros obrigatórios
    if (!status) {
      return res.status(400).json({
        message: "Status é obrigatório",
      });
    }

    // Validar status permitidos
    const allowedStatuses = [
      "PENDING",
      "PAID",
      "OVERDUE",
      "CANCELLED",
      "ERROR",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status inválido. Valores permitidos: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    // Buscar a fatura
    const billing = await Billing.findById(id);
    if (!billing) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }

    // Verificar se o status já é o mesmo
    if (billing.status === status) {
      return res.status(400).json({
        message: `A fatura já possui o status: ${status}`,
      });
    }

    // Armazenar status anterior para log
    const previousStatus = billing.status;

    // Atualizar o status
    billing.status = status;
    billing.lastStatusUpdate = new Date();

    // Adicionar motivo se fornecido
    if (reason) {
      billing.statusReason = reason;
    }

    await billing.save();

    console.log(
      `📋 Status da fatura ${
        billing._id
      } alterado de ${previousStatus} para ${status}${
        reason ? ` - Motivo: ${reason}` : ""
      }`
    );

    // Lógica específica para cada status
    if (status === "OVERDUE") {
      // Se marcado como vencido, verificar se deve restringir acesso
      const Store = require("../models/Store");
      const store = await Store.findById(billing.storeId);
      if (store && store.freeToNavigate === true) {
        store.freeToNavigate = false;
        await store.save();
        console.log(
          `🚫 Acesso restringido para ${store.businessName} - fatura vencida`
        );

        // Notificar sobre suspensão
        try {
          await emailService.notifyUserAccessReproval(store);
        } catch (notifError) {
          console.warn(
            "Erro ao enviar notificação de suspensão:",
            notifError.message
          );
        }
      }

      // Notificar usuário sobre vencimento
      try {
        await notificationService.createGenericNotification({
          title: "Fatura vencida",
          message: `Sua fatura de ${billing.amount} está vencida. Regularize para manter o acesso.`,
          firebaseUid: billing.firebaseUid,
          type: "BILLING",
        });
      } catch (notifError) {
        console.warn("Erro ao enviar notificação:", notifError.message);
      }
    } else if (status === "PAID") {
      // Se marcado como pago, verificar se deve liberar acesso
      const overdueCount = await Billing.countDocuments({
        storeId: billing.storeId,
        status: "OVERDUE",
      });

      if (overdueCount === 0) {
        const Store = require("../models/Store");
        const store = await Store.findById(billing.storeId);
        if (
          store &&
          store.freeToNavigate === false &&
          store.cnpj_approved === true
        ) {
          store.freeToNavigate = true;
          await store.save();
          console.log(
            `✅ Acesso liberado para ${store.businessName} - sem faturas vencidas`
          );

          // Notificar sobre reativação
          try {
            await emailService.notifyUserAccessLiberation(store);
          } catch (notifError) {
            console.warn(
              "Erro ao enviar notificação de reativação:",
              notifError.message
            );
          }
        }
      }

      // Notificar usuário sobre pagamento
      try {
        await notificationService.createGenericNotification({
          title: "Pagamento confirmado",
          message: `Seu pagamento de ${billing.amount} foi confirmado. Obrigado!`,
          firebaseUid: billing.firebaseUid,
          type: "BILLING",
        });
      } catch (notifError) {
        console.warn("Erro ao enviar notificação:", notifError.message);
      }
    } else if (status === "CANCELLED") {
      // Se cancelado, notificar usuário
      try {
        await notificationService.createGenericNotification({
          title: "Fatura cancelada",
          message: `Sua fatura de ${billing.amount} foi cancelada pelo administrador.`,
          firebaseUid: billing.firebaseUid,
          type: "BILLING",
        });
      } catch (notifError) {
        console.warn("Erro ao enviar notificação:", notifError.message);
      }
    }

    // Buscar fatura atualizada com dados completos
    const updatedBilling = await Billing.findById(id);

    res.status(200).json({
      message: "Status da fatura atualizado com sucesso",
      billing: updatedBilling,
      changes: {
        previousStatus,
        newStatus: status,
        reason: reason || null,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar status da fatura:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
};

// ✅ ADICIONAR: Registrar as rotas
router.get("/overdue/:storeId", getBillingOverdue);
router.get("/pending/:storeId", getBillingPending); // ← Nova rota
router.get("/qrcode/:id", getPaymentQRCode);
router.get("/:id/status", checkBillingStatus);
router.patch("/:id/status", updateBillingStatus); // ← Nova rota para alterar status
router.post("/", createBilling);
router.get("/", listBillings);
router.get("/:id", getBilling);
router.put("/:id", updateBilling);
router.delete("/:id", deleteBilling); // ← Nova rota para deletar

// ✅ NOVA ROTA: Verificar e atualizar status de acesso baseado em faturas
router.post("/update-access-status/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({
        message: "storeId é obrigatório",
      });
    }

    // Verificar se existe a loja
    const Store = require("../models/Store");
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    // Buscar faturas vencidas
    const overdueInvoices = await Billing.find({
      storeId: storeId,
      status: "OVERDUE",
    });

    // Determinar se deve restringir ou liberar acesso
    const shouldRestrict = overdueInvoices.length > 0;

    // Atualizar freeToNavigate se necessário
    if (shouldRestrict && store.freeToNavigate === true) {
      store.freeToNavigate = false;
      await store.save();

      console.log(
        `🚫 Acesso restringido para loja ${store.businessName} - ${overdueInvoices.length} faturas vencidas`
      );
    } else if (!shouldRestrict && store.freeToNavigate === false) {
      store.freeToNavigate = true;
      await store.save();

      console.log(
        `✅ Acesso liberado para loja ${store.businessName} - sem faturas vencidas`
      );
    }

    res.status(200).json({
      message: "Status de acesso atualizado",
      store: {
        _id: store._id,
        businessName: store.businessName,
        freeToNavigate: store.freeToNavigate,
      },
      overdueCount: overdueInvoices.length,
      accessRestricted: !store.freeToNavigate,
    });
  } catch (error) {
    console.error("Erro ao atualizar status de acesso:", error);
    res.status(500).json({
      message: "Erro ao atualizar status de acesso",
      error: error.message,
    });
  }
});

// ✅ NOVA ROTA: Verificar status de todas as lojas (para jobs automáticos)
router.post("/check-all-stores-access", async (req, res) => {
  try {
    const Store = require("../models/Store");
    const stores = await Store.find({});

    const results = [];

    for (const store of stores) {
      // Buscar faturas vencidas para cada loja
      const overdueInvoices = await Billing.find({
        storeId: store._id,
        status: "OVERDUE",
      });

      const shouldRestrict = overdueInvoices.length > 0;
      let updated = false;

      // Atualizar se necessário
      if (shouldRestrict && store.freeToNavigate === true) {
        store.freeToNavigate = false;
        await store.save();
        updated = true;
        console.log(`🚫 Acesso restringido: ${store.businessName}`);
      } else if (!shouldRestrict && store.freeToNavigate === false) {
        // Só liberar se não há outras restrições (ex: CNPJ não aprovado)
        if (store.cnpj_approved === true) {
          store.freeToNavigate = true;
          await store.save();
          updated = true;
          console.log(`✅ Acesso liberado: ${store.businessName}`);
        }
      }

      results.push({
        storeId: store._id,
        storeName: store.businessName,
        overdueCount: overdueInvoices.length,
        freeToNavigate: store.freeToNavigate,
        updated: updated,
      });
    }

    res.status(200).json({
      message: "Verificação concluída",
      totalStores: stores.length,
      updatedStores: results.filter((r) => r.updated).length,
      results: results,
    });
  } catch (error) {
    console.error("Erro ao verificar todas as lojas:", error);
    res.status(500).json({
      message: "Erro ao verificar lojas",
      error: error.message,
    });
  }
});

module.exports = router;
