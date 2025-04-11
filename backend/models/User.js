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

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
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
    type: String,
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
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", userSchema);
