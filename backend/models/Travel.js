const mongoose = require("mongoose");

const travelSchema = mongoose.Schema({
  price: {
    type: Number,
    required: true,
  },
  rain: {
    type: Boolean,
    required: false,
  },
  motoboyId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["em_entrega", "entregue", "cancelado"],
    default: "em_entrega",
  },
  distance: {
    type: Number,
    required: false,
  },
  estimateTravelTime: {
    type: Number,
    required: false,
  },
  coordinatesFrom: {
    type: [Number],
    required: false,
  },
  coordinatesTo: {
    type: [Number],
    required: false,
  },
  arrival_store: {
    type: Date,
    required: false,
  },
  arrival_customer: {
    type: Date,
    required: false,
  },
  order: {
    type: Object,
    default: {},
  },
  orderId: {
    type: String,
    required: false,
  },
  finance: {
    dueDate: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias a partir de agora
      },
    },
    value: {
      type: Number,
      default: function () {
        return this.price || 0;
      },
    },
    status: {
      type: String,
      enum: ["pendente", "liberado", "pago", "cancelado"],
      default: "pendente",
    },
    paymentMethod: {
      type: String,
      enum: ["dinheiro", "cartao", "pix"],
      default: "pix",
    },
    transactionId: {
      type: String,
      required: false,
    },
    transactionDate: {
      type: Date,
      required: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

travelSchema.pre("save", function (next) {
  // Definir finance.value como price
  if (this.price) {
    this.finance.value = this.price;
  }

  // Definir finance.dueDate se não existir (7 dias a partir de agora)
  if (!this.finance.dueDate) {
    this.finance.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  // Definir status financeiro baseado na data de vencimento
  if (this.finance.dueDate && this.finance.dueDate < new Date()) {
    this.finance.status = "liberado";
  } else if (
    this.finance.status !== "pago" &&
    this.finance.status !== "cancelado"
  ) {
    this.finance.status = "pendente";
  }

  // Se a viagem foi cancelada, o financeiro também deve ser cancelado
  if (this.status === "cancelado") {
    this.finance.status = "cancelado";
  }

  next();
});

// Middleware para updates
travelSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  // Atualizar finance.value se price foi alterado
  if (update.price && !update["finance.value"]) {
    this.set({ "finance.value": update.price });
  }

  // Atualizar status financeiro se a viagem foi cancelada
  if (update.status === "cancelado") {
    this.set({ "finance.status": "cancelado" });
  }

  next();
});

module.exports = mongoose.model("Travel", travelSchema);
