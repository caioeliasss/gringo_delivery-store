const mongoose = require("mongoose");

// Importar schemas reutilizáveis do HandshakeDispute
const { Schema } = mongoose;

// Schema para Amount (reutilizando)
const amountSchema = new Schema({
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

// Schema para Media (reutilizando)
const mediaSchema = new Schema({
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

// Schema para GarnishItem (reutilizando)
const garnishItemSchema = new Schema({
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

// Schema para Item (reutilizando)
const itemSchema = new Schema({
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

// Schema para Settlement Details
const settlementDetailsSchema = new Schema({
  type: {
    type: String,
    enum: [
      "REFUND",
      "PARTIAL_REFUND",
      "REPLACEMENT",
      "VOUCHER",
      "CUSTOM",
      "NO_ACTION",
    ],
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
  processingTime: {
    type: String,
    required: false,
  },
  estimatedCompletionDate: {
    type: Date,
    required: false,
  },
});

// Schema principal para HandshakeSettlement
const handshakeSettlementSchema = new Schema(
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

    // Referência ao dispute original
    originalDisputeEventId: {
      type: String,
      required: true,
    },

    // Resultado da negociação
    settlementResult: {
      type: String,
      enum: [
        "ACCEPTED",
        "REJECTED",
        "ALTERNATIVE_ACCEPTED",
        "AUTOMATIC_TIMEOUT",
      ],
      required: true,
    },

    // Detalhes da resolução
    settlementDetails: {
      type: settlementDetailsSchema,
      required: true,
    },

    // Informações sobre a decisão
    decisionMaker: {
      type: String,
      enum: ["MERCHANT", "PLATFORM", "CUSTOMER"],
      required: true,
    },

    // Timestamps da negociação
    negotiationTimeline: {
      disputeCreatedAt: {
        type: Date,
        required: true,
      },
      merchantRespondedAt: {
        type: Date,
        required: false,
      },
      settlementReachedAt: {
        type: Date,
        required: true,
      },
      totalNegotiationTime: {
        type: Number, // em minutos
        required: false,
      },
    },

    // Status do settlement
    status: {
      type: String,
      enum: ["PROCESSED", "PROCESSING", "FAILED", "PENDING_EXECUTION"],
      default: "PROCESSED",
    },

    // Informações financeiras
    financialImpact: {
      merchantLiability: {
        type: amountSchema,
        required: false,
      },
      platformLiability: {
        type: amountSchema,
        required: false,
      },
      customerCompensation: {
        type: amountSchema,
        required: false,
      },
    },

    // Feedback e métricas
    customerSatisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: false,
      },
      feedback: {
        type: String,
        required: false,
      },
    },

    // Timestamps
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      required: false,
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
      processingDetails: {
        type: Schema.Types.Mixed,
        required: false,
      },
    },

    // Relação com o dispute original
    relatedDispute: {
      type: Schema.Types.ObjectId,
      ref: "HandshakeDispute",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para performance
handshakeSettlementSchema.index({ eventId: 1 });
handshakeSettlementSchema.index({ orderId: 1 });
handshakeSettlementSchema.index({ disputeId: 1 });
handshakeSettlementSchema.index({ merchantId: 1 });
handshakeSettlementSchema.index({ storeFirebaseUid: 1 });
handshakeSettlementSchema.index({ originalDisputeEventId: 1 });
handshakeSettlementSchema.index({ settlementResult: 1 });
handshakeSettlementSchema.index({ status: 1 });
handshakeSettlementSchema.index({ receivedAt: -1 });
handshakeSettlementSchema.index({
  "negotiationTimeline.settlementReachedAt": -1,
});

// Métodos úteis
handshakeSettlementSchema.methods.calculateNegotiationTime = function () {
  if (
    this.negotiationTimeline.disputeCreatedAt &&
    this.negotiationTimeline.settlementReachedAt
  ) {
    const timeDiff =
      this.negotiationTimeline.settlementReachedAt -
      this.negotiationTimeline.disputeCreatedAt;
    this.negotiationTimeline.totalNegotiationTime = Math.floor(
      timeDiff / (1000 * 60)
    ); // em minutos
  }
  return this.negotiationTimeline.totalNegotiationTime;
};

handshakeSettlementSchema.methods.getFinancialSummary = function () {
  return {
    merchantLiability: this.financialImpact.merchantLiability?.value || 0,
    platformLiability: this.financialImpact.platformLiability?.value || 0,
    customerCompensation: this.financialImpact.customerCompensation?.value || 0,
    currency: this.financialImpact.merchantLiability?.currency || "BRL",
  };
};

// Middleware para calcular tempo de negociação automaticamente
handshakeSettlementSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("negotiationTimeline")) {
    this.calculateNegotiationTime();
  }
  next();
});

module.exports = mongoose.model(
  "HandshakeSettlement",
  handshakeSettlementSchema
);
