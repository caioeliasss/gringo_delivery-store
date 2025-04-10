const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  cnpj: {
    type: Number,
    required: false, // Pode ser opcional ou obrigatório, conforme sua necessidade
    default: null
  },
  productName: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
    default: "https://www.svgrepo.com/show/380889/product-quality-internet-marketing-project.svg"
  },
  description : { 
    type: String,
    required: true,
  },
  priceFull: {
    type: Number,
    required: true,
  },
  priceOnSale: {
    type: Number,
    required: false,
  },
  superPromo: {
    type: Boolean,
    required: true,
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