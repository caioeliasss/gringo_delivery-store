const mongoose = require("mongoose");

// Definindo o schema GeoJSON Point para localização
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
    required: false, // mudar para false para tornar opcional
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: false, // mudar para false para tornar opcional
  },
});

const customerAddress = new mongoose.Schema({
  cep: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  addressNumber: {
    type: String,
    required: true,
  },
  bairro: {
    type: String,
    required: true,
  },
  cidade: {
    type: String,
    required: true,
  },
});

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  cnpj: {
    type: String,
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
  },
  customer: {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    customerAddress: customerAddress,
    // Adição de geolocalização como opcional para o endereço de entrega
    geolocation: {
      type: pointSchema,
      index: "2dsphere", // Índice espacial para consultas de proximidade
      required: false, // Tornar explicitamente opcional
    },
  },
  // Campo para registrar qual motoboy está atendendo o pedido
  motoboy: {
    motoboyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Motoboy",
      required: false,
    },
    name: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ["pendente", "em_preparo", "em_entrega", "entregue", "cancelado"],
    default: "pendente",
  },
  total: {
    type: Number,
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  payment: {
    method: {
      type: String,
      enum: ["dinheiro", "cartao", "pix"],
      required: true,
    },
    change: {
      type: Number,
      default: 0,
    },
  },
  // Campo para rastrear informações sobre a entrega
  delivery: {
    estimatedTime: {
      type: Number, // em minutos
      required: false,
    },
    distance: {
      type: Number, // em metros
      required: false,
    },
    startTime: {
      type: Date,
      required: false,
    },
    endTime: {
      type: Date,
      required: false,
    },
  },
  notes: {
    type: String,
    default: "",
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: false, // mudar para false para tornar opcional
  },
  // geolocation: {
  //   type: pointSchema,
  //   index: "2dsphere", // Índice espacial para consultas de proximidade
  //   required: false, // Tornar explicitamente opcional
  // },
  cliente_cod: {
    type: Number,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware para atualizar o campo updatedAt antes de salvar
orderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Order", orderSchema);
