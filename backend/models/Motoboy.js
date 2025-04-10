const mongoose = require('mongoose');

// Definindo o schema GeoJSON Point para localização
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
});

const motoboySchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  cpf: {
    type: String,
    required: true,
    unique: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true
  },
  vehicleModel: {
    type: String,
    required: true
  },
  vehicleYear: {
    type: Number,
    required: true
  },
  geolocation: {
    type: pointSchema,
    index: '2dsphere' // Índice espacial para consultas de proximidade
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  register_approved: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 5.0, // Escala de 0 a 5, por exemplo
    min: 0,
    max: 5
  },
  profileImage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar o campo updatedAt antes de salvar
motoboySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Motoboy', motoboySchema);