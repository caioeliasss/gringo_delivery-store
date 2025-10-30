const mongoose = require("mongoose");

// Definindo o schema GeoJSON Point para localização (mesmo que no modelo Motoboy)
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const storeAddress = new mongoose.Schema({
  cep: {
    type: String,
    required: false, // Mudando para false para evitar erros
  },
  address: {
    type: String,
    required: false, // Mudando para false para evitar erros
  },
  addressNumber: {
    type: String,
    required: false,
  },
  bairro: {
    type: String,
    required: false, // Mudando para false para evitar erros
  },
  cidade: {
    type: String,
    required: false, // Mudando para false para evitar erros
  },
  coordinates: {
    type: [Number],
    required: false,
  },
});

const ifoodConfigSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: false,
  },
  clientSecret: {
    type: String,
    required: false,
  },
  merchantId: {
    type: String,
    required: false,
  },
  access_token: {
    type: String,
    required: false,
  },
  scheduleTime: {
    type: Number,
    required: false,
    default: 5, // Tempo em minutos para agendamento padrão
  },
});

const storeSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: false, // Mudando para false para evitar erros de validação
  },
  freeToNavigate: {
    type: Boolean,
    default: false,
  },
  ifoodConfig: ifoodConfigSchema,
  asaasCustomerId: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Permite valores null únicos
  },
  coordinates: {
    type: [Number],
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  cnpj: {
    type: String,
    required: false,
    default: "",
    sparse: true, // Permite valores vazios únicos
  },
  cnpj_approved: {
    type: Boolean,
    required: false,
    default: false,
  },
  displayName: {
    type: String,
    required: false,
  },
  photoURL: {
    type: String,
    required: false,
  },
  perfil_url: {
    type: String,
    required: false,
  },
  // Novos campos adicionados
  businessName: {
    type: String,
    required: false,
  },
  address: {
    type: storeAddress,
    required: false,
  },
  // Campo de geolocalização
  geolocation: {
    type: pointSchema,
    required: false, // Tornando opcional
    index: "2dsphere", // Índice espacial para consultas de proximidade
  },
  businessHours: {
    type: String,
    required: false,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  termsAccepted: {
    type: Boolean,
    default: false,
  },
  termsAcceptedAt: {
    type: Date,
    default: null,
  },
  billingOptions: {
    monthlyFee: {
      type: Number,
      required: false,
      default: 150,
    },
    motoBoyFee: {
      type: Number,
      required: false,
      default: 2,
    },
  },
  orderType: {
    type: String,
    enum: ["DELIVERY", "PICKUP"],
    default: "DELIVERY",
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
storeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Store", storeSchema);
