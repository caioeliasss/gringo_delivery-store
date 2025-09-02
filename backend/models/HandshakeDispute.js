const mongoose = require("mongoose");

// Schema para Amount
const amountSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: "BRL",
  },
});

// Schema para Media
const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["IMAGE", "VIDEO", "DOCUMENT"],
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
});

// Schema para GarnishItem
const garnishItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: amountSchema,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
});

// Schema para Item
const itemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: amountSchema,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  garnishItems: [garnishItemSchema],
  observation: {
    type: String,
    required: false,
  },
});

// Schema para SelectedDisputeAlternative
const selectedDisputeAlternativeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["REFUND", "PARTIAL_REFUND", "REPLACEMENT", "VOUCHER", "CUSTOM"],
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  amount: {
    type: amountSchema,
    required: false,
  },
  items: [itemSchema],
  media: [mediaSchema],
  selectedAt: {
    type: Date,
    default: Date.now,
  },
});

// Schema para DisputeAlternative
const disputeAlternativeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["REFUND", "PARTIAL_REFUND", "REPLACEMENT", "VOUCHER", "CUSTOM"],
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  amount: {
    type: amountSchema,
    required: false,
  },
  items: [itemSchema],
  media: [mediaSchema],
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

// Schema principal para HandshakeDispute
const handshakeDisputeSchema = new mongoose.Schema(
  {
    // Identificadores
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    disputeId: {
      type: String,
      required: true,
    },
    merchantId: {
      type: String,
      required: true,
    },
    storeFirebaseUid: {
      type: String,
      required: false,
    },

    // Dados da disputa
    disputeType: {
      type: String,
      enum: ["QUALITY", "MISSING_ITEMS", "WRONG_ITEMS", "DELAY", "OTHER"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    customerComplaint: {
      type: String,
      required: false,
    },

    // Evidências
    media: [mediaSchema],

    // Itens em disputa
    disputedItems: [itemSchema],

    // Alternativas disponíveis
    availableAlternatives: [disputeAlternativeSchema],

    // Alternativa selecionada (se houver)
    selectedAlternative: {
      type: selectedDisputeAlternativeSchema,
      required: false,
    },

    // Status da disputa
    status: {
      type: String,
      enum: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "COUNTER_PROPOSED",
        "SETTLED",
        "EXPIRED",
      ],
      default: "PENDING",
    },

    // Timestamps
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      required: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },

    // Resposta do merchant
    merchantResponse: {
      type: {
        type: String,
        enum: ["ACCEPT", "REJECT", "ALTERNATIVE"],
        required: false,
      },
      reason: {
        type: String,
        required: false,
      },
      proposedAlternative: {
        type: disputeAlternativeSchema,
        required: false,
      },
      respondedBy: {
        type: String,
        required: false,
      },
    },

    // Metadados
    metadata: {
      platform: {
        type: String,
        default: "IFOOD",
      },
      version: {
        type: String,
        default: "1.0",
      },
      source: {
        type: String,
        default: "POLLING",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Índices para performance
handshakeDisputeSchema.index({ eventId: 1 });
handshakeDisputeSchema.index({ orderId: 1 });
handshakeDisputeSchema.index({ disputeId: 1 });
handshakeDisputeSchema.index({ merchantId: 1 });
handshakeDisputeSchema.index({ storeFirebaseUid: 1 });
handshakeDisputeSchema.index({ status: 1 });
handshakeDisputeSchema.index({ receivedAt: -1 });
handshakeDisputeSchema.index({ expiresAt: 1 });

// Middleware para verificar expiração
handshakeDisputeSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Middleware para calcular tempo restante
handshakeDisputeSchema.methods.getTimeRemaining = function () {
  const now = new Date();
  const timeRemaining = this.expiresAt - now;
  return Math.max(0, timeRemaining);
};

// Virtual para tempo restante em minutos
handshakeDisputeSchema.virtual("timeRemainingMinutes").get(function () {
  return Math.floor(this.getTimeRemaining() / (1000 * 60));
});

module.exports = mongoose.model("HandshakeDispute", handshakeDisputeSchema);
