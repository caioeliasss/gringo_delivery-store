const Store = require("../models/Store");
const IfoodService = require("./ifoodService");

class OrderImportService {
  constructor(orderService, storeFirebaseUid = null) {
    this.storeFirebaseUid = storeFirebaseUid;
    this.ifoodService = storeFirebaseUid
      ? null // Será criado quando necessário
      : new IfoodService();
    this.orderService = orderService;
  }

  async getIfoodService() {
    if (this.storeFirebaseUid && !this.ifoodService) {
      this.ifoodService = await IfoodService.createForStore(
        this.storeFirebaseUid
      );
    } else if (!this.ifoodService) {
      this.ifoodService = new IfoodService();
    }
    return this.ifoodService;
  }

  async importIfoodOrders(storeFirebaseUid = null) {
    try {
      const targetStoreUid = storeFirebaseUid || this.storeFirebaseUid;
      const ifoodService = await this.getIfoodService();

      const ifoodOrders = await ifoodService.getOrders(targetStoreUid);
      const importedOrders = [];

      for (const ifoodOrder of ifoodOrders) {
        // Verificar se o pedido já foi importado
        const existingOrder = await this.orderService.findByIfoodId(
          ifoodOrder.id
        );

        if (!existingOrder) {
          const orderDetails = await ifoodService.getOrderDetails(
            ifoodOrder.id,
            targetStoreUid
          );
          const localOrder = await this.convertIfoodOrderToLocal(orderDetails);
          const createdOrder = await this.orderService.createOrder(localOrder);
          importedOrders.push(createdOrder);
        }
      }

      return importedOrders;
    } catch (error) {
      console.error("Erro ao importar pedidos do iFood:", error);
      throw error;
    }
  }

  async convertIfoodOrderToLocal(ifoodOrder) {
    const { latitude, longitude } =
      ifoodOrder.delivery?.deliveryAddress?.coordinates || {};

    const store = await Store.findOne({ merchantId: ifoodOrder.merchant?.id });
    if (!store) {
      throw new Error(
        `Loja não encontrada para o ID do iFood: ${ifoodOrder.merchant?.id}`
      );
    }

    // Processar informações de agendamento
    const isScheduled = ifoodOrder.orderTiming === "SCHEDULED";
    const scheduledDateTime =
      isScheduled && ifoodOrder.scheduledDateTime
        ? new Date(ifoodOrder.scheduledDateTime)
        : null;

    // Processar informações de pagamento
    const paymentInfo = this.processPaymentInfo(ifoodOrder.payment);
    return {
      // Número do pedido (pode ser gerado automaticamente ou usar o ID do iFood)
      orderNumber: `IFOOD-${ifoodOrder.id}`,

      // ID do iFood para controle
      ifoodId: ifoodOrder.id,

      deliveryMode:
        ifoodOrder.orderType === "DELIVERY" ? "entrega" : "retirada",

      // Campos de agendamento
      orderType: ifoodOrder.orderType || "IMMEDIATE",
      orderTiming: ifoodOrder.orderTiming || "IMMEDIATE",
      isScheduled: isScheduled,
      scheduledDateTime: scheduledDateTime,
      scheduledDeliveryTime: scheduledDateTime,

      // Informações da loja (você pode definir valores padrão ou buscar do banco)
      store: {
        name: store.businessName,
        ifoodId: ifoodOrder.merchant?.id || "00000000000000",
        cnpj: store?.cnpj || "00000000000191",
        coordinates: [
          store.geolocation.coordinates[0],
          store.geolocation.coordinates[1],
        ],
        address: {
          address: store?.address?.address || "",
          addressNumber: store?.address?.addressNumber || "",
          bairro: store?.address?.bairro || "",
          cidade: store?.address?.cidade || "",
          cep: store?.address?.cep || "",
        },
        // Você pode adicionar outras informações da loja se necessário
      },

      // Informações do cliente
      customer: [
        {
          name: ifoodOrder.customer.name,
          phone: ifoodOrder.customer.phone.number || "",
          customerAddress: {
            cep: this.extractCepFromAddress(
              ifoodOrder.delivery?.deliveryAddress?.postalCode
            ),
            address: ifoodOrder.delivery?.deliveryAddress?.streetName || "",
            addressNumber:
              ifoodOrder.delivery?.deliveryAddress?.streetNumber || "",
            bairro:
              ifoodOrder.delivery?.deliveryAddress?.district || "Sem Bairro",
            cidade: ifoodOrder.delivery?.deliveryAddress?.city || "",
            coordinates: [longitude, latitude],
          },
          geolocation: this.createGeoLocation(
            ifoodOrder.delivery?.deliveryAddress
          ),
        },
      ],

      // Items do pedido
      items:
        ifoodOrder.orderItems?.map((item) => ({
          productId: null, // Será null pois vem do iFood, você pode implementar matching depois
          productName: item.name,
          quantity: item.quantity,
          price: item.totalPrice || item.unitPrice,
        })) || [],

      // Status do pedido - pedidos agendados começam como 'agendado'
      status: isScheduled
        ? "agendado"
        : this.mapIfoodStatus(ifoodOrder.orderStatus),

      // Total do pedido
      total: ifoodOrder.total?.orderAmount || 0,

      // Data do pedido
      orderDate: new Date(ifoodOrder.createdAt),

      // Método de pagamento
      payment: paymentInfo,

      // Informações de entrega
      delivery: {
        estimatedTime: ifoodOrder.delivery?.estimatedDeliveryTime || null,
        distance: null, // iFood pode não fornecer essa informação
        startTime: null,
        endTime: null,
      },

      phoneLocalizer: ifoodOrder.phone?.localizer,
      // Observações
      notes: ifoodOrder.orderNotes || ifoodOrder.observations || "",
      findDriverAuto: false,
      ifoodId: ifoodOrder.id,
      // Timestamps
      createdAt: new Date(ifoodOrder.createdAt),
      updatedAt: new Date(),
    };
  }

  processPaymentInfo(paymentData) {
    if (
      !paymentData ||
      !paymentData.methods ||
      paymentData.methods.length === 0
    ) {
      return {
        method: "erro",
        change: 0,
        cardBrand: null,
        cardProvider: null,
        details: null,
      };
    }

    // Se houver múltiplos métodos de pagamento
    if (paymentData.methods.length > 1) {
      const hasCard = paymentData.methods.some(
        (method) =>
          method.name &&
          (method.name.toLowerCase().includes("cartão") ||
            method.name.toLowerCase().includes("card") ||
            method.name.toLowerCase().includes("crédito") ||
            method.name.toLowerCase().includes("débito"))
      );

      const hasCash = paymentData.methods.some(
        (method) =>
          method.name && method.name.toLowerCase().includes("dinheiro")
      );

      if (hasCard && hasCash) {
        return {
          method: "diversos",
          change: this.extractChangeValue(paymentData),
          cardBrand: this.extractCardBrand(paymentData),
          cardProvider: this.extractCardProvider(paymentData),
          details: this.extractPaymentDetails(paymentData.methods),
        };
      }
    }

    // Processar método único ou principal
    const primaryMethod = paymentData.methods[0];
    const methodType = this.mapPaymentMethod(
      primaryMethod.name || primaryMethod.method
    );

    const result = {
      method: methodType,
      change: 0,
      cardBrand: null,
      cardProvider: null,
      details: null,
    };

    // Se for dinheiro, extrair valor do troco
    if (methodType === "dinheiro") {
      result.change = this.extractChangeValue(paymentData);
    }

    // Se for cartão, extrair bandeira e provedor
    if (methodType === "cartao") {
      result.cardBrand = this.extractCardBrand(paymentData);
      result.cardProvider = this.extractCardProvider(paymentData);
    }

    // Adicionar detalhes completos do pagamento
    result.details = this.extractPaymentDetails(paymentData.methods);

    return result;
  }

  extractChangeValue(paymentData) {
    // Procurar por informações de troco nos métodos de pagamento
    for (const method of paymentData.methods || []) {
      // Verificar se existe informação de troco no método
      if (method.cashChangeFor && method.cashChangeFor.value) {
        return parseFloat(method.cashChangeFor.value) || 0;
      }

      // Verificar outras possíveis estruturas de troco
      if (method.changeFor && method.changeFor.value) {
        return parseFloat(method.changeFor.value) || 0;
      }

      // Se o método tem amount e é dinheiro, pode haver troco
      if (method.name && method.name.toLowerCase().includes("dinheiro")) {
        if (method.changeValue) {
          return parseFloat(method.changeValue) || 0;
        }
      }
    }

    // Verificar na raiz do objeto payment
    if (paymentData.cashChangeFor && paymentData.cashChangeFor.value) {
      return parseFloat(paymentData.cashChangeFor.value) || 0;
    }

    return 0;
  }

  extractCardBrand(paymentData) {
    for (const method of paymentData.methods || []) {
      // Verificar se existe informação da bandeira do cartão
      if (method.card && method.card.brand) {
        return method.card.brand;
      }

      if (method.cardBrand) {
        return method.cardBrand;
      }

      // Tentar extrair da descrição do método
      if (method.name) {
        const name = method.name.toLowerCase();
        if (name.includes("visa")) return "Visa";
        if (name.includes("master")) return "MasterCard";
        if (name.includes("american") || name.includes("amex"))
          return "American Express";
        if (name.includes("elo")) return "Elo";
        if (name.includes("hipercard")) return "Hipercard";
        if (name.includes("diners")) return "Diners Club";
      }
    }
    return null;
  }

  extractCardProvider(paymentData) {
    for (const method of paymentData.methods || []) {
      // Verificar se existe informação do provedor do cartão
      if (method.card && method.card.provider) {
        return method.card.provider;
      }

      if (method.cardProvider) {
        return method.cardProvider;
      }

      if (method.provider) {
        return method.provider;
      }
    }
    return null;
  }

  extractPaymentDetails(methods) {
    return methods.map((method) => ({
      name: method.name || "Não informado",
      amount: method.amount
        ? parseFloat(method.amount.value || method.amount)
        : null,
      currency: method.amount ? method.amount.currency : null,
      inPerson: method.inPerson || false,
      liability: method.liability || null,
      cardBrand: method.card ? method.card.brand : null,
      cardProvider: method.card ? method.card.provider : null,
      walletProvider: method.wallet ? method.wallet.provider : null,
      digitalData: method.digitalData || null,
    }));
  }

  mapIfoodStatus(ifoodStatus) {
    const statusMap = {
      PLACED: "pendente",
      CONFIRMED: "em_preparo",
      PREPARATION: "em_preparo",
      READY_FOR_PICKUP: "em_preparo",
      DISPATCHED: "em_entrega",
      DELIVERED: "entregue",
      CANCELLED: "cancelado",
      SCHEDULED: "agendado", // Novo status para pedidos agendados
    };

    return statusMap[ifoodStatus] || "pendente";
  }

  mapPaymentMethod(ifoodPaymentMethod) {
    if (!ifoodPaymentMethod) return "erro";

    const method = ifoodPaymentMethod.toLowerCase();

    // Mapeamento para diferentes variações de nomes
    if (
      method.includes("credit") ||
      method.includes("crédito") ||
      method.includes("cartão de crédito")
    ) {
      return "cartao";
    }

    if (
      method.includes("debit") ||
      method.includes("débito") ||
      method.includes("cartão de débito")
    ) {
      return "cartao";
    }

    if (
      method.includes("cash") ||
      method.includes("dinheiro") ||
      method.includes("espécie")
    ) {
      return "dinheiro";
    }

    if (method.includes("pix")) {
      return "pix";
    }

    if (
      method.includes("voucher") ||
      method.includes("vale") ||
      method.includes("ticket")
    ) {
      return "cartao";
    }

    // Fallback para os valores originais do iFood
    const paymentMap = {
      CREDIT_CARD: "cartao",
      DEBIT_CARD: "cartao",
      CASH: "dinheiro",
      PIX: "pix",
      VOUCHER: "cartao",
      MEAL_VOUCHER: "cartao",
    };

    return paymentMap[ifoodPaymentMethod] || "cartao";
  }

  extractCepFromAddress(postalCode) {
    if (!postalCode) return null;

    // Remove caracteres não numéricos e converte para número
    const cleanCep = postalCode.replace(/\D/g, "");
    return cleanCep ? parseInt(cleanCep) : null;
  }

  extractCoordinates(deliveryAddress) {
    if (deliveryAddress?.coordinates) {
      return [
        parseFloat(deliveryAddress.coordinates.longitude),
        parseFloat(deliveryAddress.coordinates.latitude),
      ];
    }
    return [0, 0]; // Coordenadas padrão se não houver
  }

  createGeoLocation(deliveryAddress) {
    const coordinates = this.extractCoordinates(deliveryAddress);

    // Só criar geolocation se tiver coordenadas válidas
    if (coordinates[0] !== 0 || coordinates[1] !== 0) {
      return {
        type: "Point",
        coordinates: coordinates,
      };
    }

    return null; // Opcional no schema
  }

  // Método para atualizar pedido existente com dados do iFood
  async updateIfoodOrder(existingOrder, ifoodOrder) {
    try {
      const updatedData = {
        status: this.mapIfoodStatus(ifoodOrder.orderStatus),
        updatedAt: new Date(),
      };

      // Atualizar timestamps de entrega se necessário
      if (
        ifoodOrder.orderStatus === "DISPATCHED" &&
        !existingOrder.delivery.startTime
      ) {
        updatedData["delivery.startTime"] = new Date();
      }

      if (
        ifoodOrder.orderStatus === "DELIVERED" &&
        !existingOrder.delivery.endTime
      ) {
        updatedData["delivery.endTime"] = new Date();
      }

      return await this.orderService.update(existingOrder._id, updatedData);
    } catch (error) {
      console.error("Erro ao atualizar pedido do iFood:", error);
      throw error;
    }
  }

  // Método para sincronizar status de pedidos existentes
  async syncIfoodOrdersStatus() {
    try {
      // Buscar pedidos do iFood que não estão finalizados
      const pendingOrders = await this.orderService.findAll({
        status: { $in: ["pendente", "em_preparo", "em_entrega"] },
      });

      const syncedOrders = [];

      for (const order of pendingOrders.orders) {
        if (order.ifoodId) {
          try {
            const ifoodService = await this.getIfoodService();
            const ifoodOrderDetails = await ifoodService.getOrderDetails(
              order.ifoodId,
              this.storeFirebaseUid
            );
            const updatedOrder = await this.updateIfoodOrder(
              order,
              ifoodOrderDetails
            );
            syncedOrders.push(updatedOrder);
          } catch (error) {
            console.error(
              `Erro ao sincronizar pedido ${order.orderNumber}:`,
              error
            );
          }
        }
      }

      return syncedOrders;
    } catch (error) {
      console.error("Erro ao sincronizar status dos pedidos:", error);
      throw error;
    }
  }
}

module.exports = OrderImportService;
