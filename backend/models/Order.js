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
    type: String,
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
  coordinates: {
    type: [Number],
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
    required: false,
  },
  quantity: {
    type: Number,
    required: false,
    min: 1,
  },
  price: {
    type: Number,
    required: false,
  },
  notes: {
    type: String,
    default: "-",
  },
});

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
  ifoodId: {
    type: String,
    required: false,
  },
  cnpj: {
    type: String,
    required: true,
  },
  location: {
    type: customerAddress,
    required: false,
  },
  cep: {
    type: String,
    required: false,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: false,
  },
  address: {
    type: customerAddress,
    required: false,
  },
});

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  documentNumber: {
    type: String,
    required: false,
  },
  customerAddress: customerAddress,
});

const queueSchema = new mongoose.Schema({
  motoboys: [
    {
      type: Object,
      required: false,
    },
  ],
  restartCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pendente", "buscando", "confirmado", "cancelado"],
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  store: {
    type: storeSchema,
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
  },
  ifoodId: {
    type: String,
    required: false,
  },
  phoneLocalizer: {
    type: String,
    required: false,
  },
  pickupCode: {
    type: String,
    required: false,
  },
  arrivedDestination: {
    type: Boolean,
    default: false,
  },
  customer: [customerSchema],
  motoboy: {
    blacklist: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Motoboy",
      default: [],
    },
    rated: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      required: true,
    },
    priceAdded: {
      type: Number,
      default: 0,
    },
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
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    timer: {
      type: Date,
      default: Date.now,
    },
    hasArrived: {
      type: Boolean,
      default: false,
    },
    queue: {
      type: queueSchema,
      required: false,
    },
    location: {
      type: Object,
      required: false,
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
    payment: {
      type: Number,
      required: false,
    },
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: [
      "pendente",
      "agendado",
      "em_preparo",
      "pronto",
      "ready_takeout",
      "em_entrega",
      "codigo_pronto",
      "entregue",
      "cancelado",
    ],
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
      required: true,
    },
    change: {
      type: Number,
      default: 0,
    },
    cardBrand: {
      type: String,
      required: false,
    },
    cardProvider: {
      type: String,
      required: false,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  deliveryMode: {
    type: String,
    enum: ["entrega", "retirada"],
    default: "entrega",
  },
  // Campos para pedidos agendados
  orderType: {
    type: String,
    enum: ["IMMEDIATE", "SCHEDULED", "DELIVERY", "TAKEOUT"],
    default: "IMMEDIATE",
  },
  orderTiming: {
    type: String,
    enum: ["IMMEDIATE", "SCHEDULED"],
    default: "IMMEDIATE",
  },
  scheduledDateTime: {
    type: Date,
    required: false,
  },
  scheduledDeliveryTime: {
    type: Date,
    required: false,
  },
  isScheduled: {
    type: Boolean,
    default: false,
  },
  delivery: {
    estimatedTime: {
      type: Number, // em minutos
      required: false,
    },
    priceList: {
      type: Object,
      default: false,
    },
    distance: {
      type: Number, // em metros
      required: false,
    },
    driveBack: {
      type: Boolean,
      default: false,
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
  benefits: {
    type: [Object],
    default: [],
  },
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
  this.motoboy.updatedAt = Date.now();

  // Verificar se um motoboy foi atribuído (motoboyId foi definido)
  if (this.isModified("motoboy.motoboyId") && this.motoboy.motoboyId) {
    console.log(
      `🔄 Motoboy atribuído ao pedido ${this._id}, iniciando timer...`
    );
    this.motoboy.timer = Date.now();

    // Importar o serviço de motoboy e iniciar o timer
    const motoboyServices = require("../services/motoboyServices");

    // Usar setImmediate para executar após o save
    setImmediate(() => {
      motoboyServices.timerCounting(this._id.toString());
    });
  }

  next();
});

module.exports = mongoose.model("Order", orderSchema);
