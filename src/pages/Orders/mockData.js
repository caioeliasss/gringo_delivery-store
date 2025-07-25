// Mock data para teste da página de pedidos
export const mockOrders = [
  {
    id: "1",
    orderNumber: "001234",
    status: "PENDING",
    createdAt: "2025-01-14T10:30:00Z",
    total: 45.9,
    customer: {
      name: "João Silva",
      phone: "(11) 99999-9999",
      email: "joao@email.com",
    },
    deliveryAddress: "Rua das Flores, 123 - Centro - São Paulo/SP",
    store: {
      name: "Restaurante do João",
      phone: "(11) 3333-3333",
      address: "Av. Principal, 456 - Centro - São Paulo/SP",
    },
    deliveryBoy: null,
    items: [
      { name: "Pizza Margherita", quantity: 1, price: 32.9 },
      { name: "Coca-Cola 2L", quantity: 1, price: 8.0 },
      { name: "Taxa de entrega", quantity: 1, price: 5.0 },
    ],
  },
  {
    id: "2",
    orderNumber: "001235",
    status: "CONFIRMED",
    createdAt: "2025-01-14T09:15:00Z",
    total: 28.5,
    customer: {
      name: "Maria Santos",
      phone: "(11) 88888-8888",
      email: "maria@email.com",
    },
    deliveryAddress: "Rua dos Pássaros, 789 - Vila Nova - São Paulo/SP",
    store: {
      name: "Lanchonete da Esquina",
      phone: "(11) 4444-4444",
      address: "Rua da Esquina, 100 - Vila Nova - São Paulo/SP",
    },
    deliveryBoy: {
      name: "Carlos Moto",
      phone: "(11) 77777-7777",
      vehicle: "Honda CG 160",
    },
    items: [
      { name: "X-Burger", quantity: 2, price: 12.5 },
      { name: "Batata Frita", quantity: 1, price: 8.5 },
    ],
  },
  {
    id: "3",
    orderNumber: "001236",
    status: "PREPARING",
    createdAt: "2025-01-14T08:45:00Z",
    total: 67.8,
    customer: {
      name: "Pedro Oliveira",
      phone: "(11) 66666-6666",
      email: "pedro@email.com",
    },
    deliveryAddress: "Av. Brasil, 2000 - Jardim América - São Paulo/SP",
    store: {
      name: "Pizzaria Italiana",
      phone: "(11) 5555-5555",
      address: "Rua Itália, 50 - Centro - São Paulo/SP",
    },
    deliveryBoy: {
      name: "Ricardo Delivery",
      phone: "(11) 99999-0000",
      vehicle: "Yamaha Factor 125",
    },
    items: [
      { name: "Pizza Quatro Queijos", quantity: 1, price: 38.9 },
      { name: "Pizza Calabresa", quantity: 1, price: 28.9 },
    ],
  },
  {
    id: "4",
    orderNumber: "001237",
    status: "READY",
    createdAt: "2025-01-14T07:30:00Z",
    total: 34.9,
    customer: {
      name: "Ana Costa",
      phone: "(11) 55555-5555",
    },
    deliveryAddress: "Rua das Palmeiras, 567 - Bela Vista - São Paulo/SP",
    store: {
      name: "Sushi Express",
      phone: "(11) 2222-2222",
      address: "Rua Japão, 200 - Liberdade - São Paulo/SP",
    },
    deliveryBoy: {
      name: "Marcos Entrega",
      phone: "(11) 88888-0000",
      vehicle: "Honda Biz 125",
    },
    items: [
      { name: "Combo Sushi", quantity: 1, price: 29.9 },
      { name: "Taxa de entrega", quantity: 1, price: 5.0 },
    ],
  },
  {
    id: "5",
    orderNumber: "001238",
    status: "DELIVERING",
    createdAt: "2025-01-14T06:20:00Z",
    total: 52.3,
    customer: {
      name: "Rafael Lima",
      phone: "(11) 44444-4444",
      email: "rafael@email.com",
    },
    deliveryAddress: "Av. Paulista, 1500 - Bela Vista - São Paulo/SP",
    store: {
      name: "Hamburgueria Gourmet",
      phone: "(11) 6666-6666",
      address: "Rua Augusta, 300 - Consolação - São Paulo/SP",
    },
    deliveryBoy: {
      name: "Felipe Moto",
      phone: "(11) 77777-0000",
      vehicle: "Honda CB 600",
    },
    items: [
      { name: "Burger Gourmet", quantity: 2, price: 19.9 },
      { name: "Batata Rústica", quantity: 1, price: 12.5 },
    ],
  },
  {
    id: "6",
    orderNumber: "001239",
    status: "DELIVERED",
    createdAt: "2025-01-13T20:15:00Z",
    total: 41.7,
    customer: {
      name: "Lucia Fernandes",
      phone: "(11) 33333-3333",
      email: "lucia@email.com",
    },
    deliveryAddress: "Rua dos Três Irmãos, 890 - Vila Madalena - São Paulo/SP",
    store: {
      name: "Comida Caseira",
      phone: "(11) 7777-7777",
      address: "Rua da Casa, 45 - Vila Madalena - São Paulo/SP",
    },
    deliveryBoy: {
      name: "José Entregador",
      phone: "(11) 66666-0000",
      vehicle: "Honda CG 150",
    },
    items: [{ name: "Marmitex Completa", quantity: 2, price: 18.85 }],
  },
  {
    id: "7",
    orderNumber: "001240",
    status: "CANCELLED",
    createdAt: "2025-01-13T19:30:00Z",
    total: 25.9,
    customer: {
      name: "Bruno Alves",
      phone: "(11) 22222-2222",
    },
    deliveryAddress: "Rua Cancelada, 123 - Centro - São Paulo/SP",
    store: {
      name: "Fast Food 24h",
      phone: "(11) 8888-8888",
      address: "Av. 24 Horas, 100 - Centro - São Paulo/SP",
    },
    deliveryBoy: null,
    items: [
      { name: "Combo Fast", quantity: 1, price: 20.9 },
      { name: "Taxa de entrega", quantity: 1, price: 5.0 },
    ],
  },
];
