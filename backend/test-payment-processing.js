const OrderImportService = require("./services/orderImportService");

// Mock de um pedido do iFood com pagamento em cartão
const ifoodOrderCard = {
  id: "123456",
  merchant: { id: "merchant123" },
  orderType: "DELIVERY",
  orderTiming: "IMMEDIATE",
  customer: {
    name: "João Silva",
    phone: { number: "11999999999" },
  },
  payment: {
    methods: [
      {
        name: "Cartão de Crédito",
        card: {
          brand: "Visa",
          provider: "Cielo",
        },
        amount: {
          value: 25.9,
          currency: "BRL",
        },
        inPerson: false,
        liability: "merchant",
      },
    ],
  },
  orderItems: [
    {
      name: "Pizza Margherita",
      quantity: 1,
      totalPrice: 25.9,
    },
  ],
  total: { orderAmount: 25.9 },
  createdAt: new Date().toISOString(),
  delivery: {
    deliveryAddress: {
      streetName: "Rua das Flores",
      streetNumber: "123",
      district: "Centro",
      city: "São Paulo",
      postalCode: "01234-567",
      coordinates: {
        latitude: -23.5505,
        longitude: -46.6333,
      },
    },
  },
};

// Mock de um pedido do iFood com pagamento em dinheiro
const ifoodOrderCash = {
  id: "789012",
  merchant: { id: "merchant123" },
  orderType: "DELIVERY",
  orderTiming: "IMMEDIATE",
  customer: {
    name: "Maria Santos",
    phone: { number: "11888888888" },
  },
  payment: {
    methods: [
      {
        name: "Dinheiro",
        cashChangeFor: {
          value: 50.0,
          currency: "BRL",
        },
        amount: {
          value: 32.5,
          currency: "BRL",
        },
        inPerson: true,
        liability: "merchant",
      },
    ],
  },
  orderItems: [
    {
      name: "Hambúrguer Clássico",
      quantity: 1,
      totalPrice: 32.5,
    },
  ],
  total: { orderAmount: 32.5 },
  createdAt: new Date().toISOString(),
  delivery: {
    deliveryAddress: {
      streetName: "Avenida Paulista",
      streetNumber: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      postalCode: "01310-100",
      coordinates: {
        latitude: -23.5618,
        longitude: -46.6558,
      },
    },
  },
};

// Mock de um pedido com múltiplos métodos de pagamento
const ifoodOrderMultiple = {
  id: "345678",
  merchant: { id: "merchant123" },
  orderType: "DELIVERY",
  orderTiming: "IMMEDIATE",
  customer: {
    name: "Pedro Oliveira",
    phone: { number: "11777777777" },
  },
  payment: {
    methods: [
      {
        name: "Cartão de Débito",
        card: {
          brand: "MasterCard",
          provider: "Rede",
        },
        amount: {
          value: 20.0,
          currency: "BRL",
        },
        inPerson: false,
        liability: "merchant",
      },
      {
        name: "Dinheiro",
        cashChangeFor: {
          value: 30.0,
          currency: "BRL",
        },
        amount: {
          value: 15.75,
          currency: "BRL",
        },
        inPerson: true,
        liability: "merchant",
      },
    ],
  },
  orderItems: [
    {
      name: "Combo Executivo",
      quantity: 1,
      totalPrice: 35.75,
    },
  ],
  total: { orderAmount: 35.75 },
  createdAt: new Date().toISOString(),
  delivery: {
    deliveryAddress: {
      streetName: "Rua Augusta",
      streetNumber: "500",
      district: "Consolação",
      city: "São Paulo",
      postalCode: "01305-000",
      coordinates: {
        latitude: -23.5489,
        longitude: -46.6388,
      },
    },
  },
};

// Instanciar o serviço
const orderImportService = new OrderImportService();

console.log("=== TESTE DE PROCESSAMENTO DE PAGAMENTOS ===\n");

// Testar pagamento em cartão
console.log("1. TESTE - Pagamento em Cartão:");
const cardPayment = orderImportService.processPaymentInfo(
  ifoodOrderCard.payment
);
console.log("Resultado:", JSON.stringify(cardPayment, null, 2));
console.log(`Método: ${cardPayment.method}`);
console.log(`Bandeira: ${cardPayment.cardBrand}`);
console.log(`Provedor: ${cardPayment.cardProvider}`);
console.log(`Troco: R$ ${cardPayment.change.toFixed(2)}\n`);

// Testar pagamento em dinheiro
console.log("2. TESTE - Pagamento em Dinheiro:");
const cashPayment = orderImportService.processPaymentInfo(
  ifoodOrderCash.payment
);
console.log("Resultado:", JSON.stringify(cashPayment, null, 2));
console.log(`Método: ${cashPayment.method}`);
console.log(`Troco: R$ ${cashPayment.change.toFixed(2)}\n`);

// Testar múltiplos métodos de pagamento
console.log("3. TESTE - Múltiplos Métodos de Pagamento:");
const multiplePayment = orderImportService.processPaymentInfo(
  ifoodOrderMultiple.payment
);
console.log("Resultado:", JSON.stringify(multiplePayment, null, 2));
console.log(`Método: ${multiplePayment.method}`);
console.log(`Bandeira: ${multiplePayment.cardBrand}`);
console.log(`Provedor: ${multiplePayment.cardProvider}`);
console.log(`Troco: R$ ${multiplePayment.change.toFixed(2)}`);
console.log(`Detalhes:`, multiplePayment.details);

console.log("\n=== TESTES CONCLUÍDOS ===");
