const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  cnpj: {
    type: String,
    required: false, // Pode ser opcional ou obrigatório, conforme sua necessidade
    default: null
  },
  cnpj_approved: {
    type: Boolean,
    required: false
  },
  displayName: {
    type: String,
    required: false
  },
  photoURL: {
    type: String,
    required: false
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);