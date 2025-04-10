const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  cnpj: {
    type: String,
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pendente', 'em_preparo', 'em_entrega', 'entregue', 'cancelado'],
    default: 'pendente'
  },
  total: {
    type: Number,
    required: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  payment: {
    method: {
      type: String,
      enum: ['dinheiro', 'cartao', 'pix'],
      required: true
    },
    change: {
      type: Number,
      default: 0
    }
  },
  notes: {
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
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);