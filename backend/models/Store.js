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
    required: false,
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
    required: true,
  },
  asaasCustomerId: {
    type: String,
    required: false,
    unique: true,
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
    type: Number,
    required: false,
    default: null,
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
  // Novos campos adicionados
  businessName: {
    type: String,
    required: false,
  },
  address: {
    type: storeAddress,
    required: false,
  },
  phone: {
    type: String,
    required: false,
  },
  // Campo de geolocalização
  geolocation: {
    type: pointSchema,
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
