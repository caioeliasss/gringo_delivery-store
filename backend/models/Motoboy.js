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
  // Histórico de entregas
  deliveryStats: {
    totalDeliveries: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    canceledDeliveries: {
      type: Number,
      default: 0
    },
    averageDeliveryTime: {
      type: Number,
      default: 0
    }
  },
  // Status da conta
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'pending_approval'
  },
  // Documentação verificada
  documentsVerified: {
    type: Boolean,
    default: false
  },
  // Lista de documentos submetidos
  documents: [{
    type: {
      type: String,
      enum: ['id', 'license', 'vehicle_registration', 'other']
    },
    url: String,
    approved: {
      type: Boolean,
      default: false
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  // Informações bancárias para pagamentos
  bankInfo: {
    bankName: String,
    accountType: String,
    accountNumber: String,
    branch: String,
    pixKey: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar o campo updatedAt antes de salvar
motoboySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para atualizar estatísticas após uma entrega
motoboySchema.methods.updateDeliveryStats = function(deliveryTime, success) {
  // Incrementar entregas totais
  this.deliveryStats.totalDeliveries += 1;
  
  if (success) {
    // Incrementar entregas bem-sucedidas
    this.deliveryStats.successfulDeliveries += 1;
    
    // Atualizar tempo médio de entrega
    const currentTotal = this.deliveryStats.averageDeliveryTime * (this.deliveryStats.successfulDeliveries - 1);
    const newAverage = (currentTotal + deliveryTime) / this.deliveryStats.successfulDeliveries;
    this.deliveryStats.averageDeliveryTime = Math.round(newAverage);
  } else {
    // Incrementar entregas canceladas
    this.deliveryStats.canceledDeliveries += 1;
  }
  
  // Atualizar última atividade
  this.lastActive = Date.now();
  
  return this.save();
};

// Método para calcular e atualizar pontuação com base no histórico
motoboySchema.methods.updateScore = function(newRating) {
  // Pontuação é a média de todas as avaliações
  // Aqui, estamos simulando um histórico de avaliações com o score atual
  const currentSuccessfulDeliveries = this.deliveryStats.successfulDeliveries || 1;
  const currentScore = this.score;
  
  // Calculamos a nova pontuação ponderada
  this.score = ((currentScore * currentSuccessfulDeliveries) + newRating) / (currentSuccessfulDeliveries + 1);
  
  // Limitar a pontuação entre 0 e 5
  if (this.score > 5) this.score = 5;
  if (this.score < 0) this.score = 0;
  
  // Arredondar para uma casa decimal
  this.score = Math.round(this.score * 10) / 10;
  
  return this.save();
};

module.exports = mongoose.model('Motoboy', motoboySchema);