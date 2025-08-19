const mongoose = require("mongoose");

function getNextWeekThursday() {
  const today = new Date();
  const currentDay = today.getDay();

  // Calcular dias até próxima semana + quinta-feira
  const daysToNextWeek = 7 - currentDay; // Dias até domingo da próxima semana
  const daysToThursday = daysToNextWeek + 4; // Mais 4 dias para quinta

  // Se hoje é domingo (0), ajustar cálculo
  const daysToAdd = currentDay === 0 ? 4 : daysToThursday;

  const nextThursday = new Date(today);
  nextThursday.setDate(today.getDate() + daysToAdd);
  nextThursday.setHours(0o1, 59, 59, 999);

  return nextThursday;
}

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
  exit_store: {
    type: Date,
    required: false,
  },
  added_minutes: {
    type: Number,
    required: false,
  },
  added_value: {
    type: Number,
    required: false,
  },
  arrival_store: {
    type: Date,
    required: false,
  },
  arrival_store_manually: {
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
        return getNextWeekThursday(); // 7 dias a partir de agora
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

travelSchema.methods.getCurrentPrice = function () {
  const now = new Date();
  const priceIncreaseStart = new Date(
    this.arrival_store_manually.getTime() + 15 * 60 * 1000
  );

  if (now < priceIncreaseStart) {
    return this.originalPrice || this.price;
  }

  // Calcular quantos minutos se passaram desde o início do aumento
  const minutesPassed = Math.floor((now - priceIncreaseStart) / (60 * 1000));

  // Aumento de R$ 0,02 por minuto (2 centavos)
  const priceIncrease = minutesPassed * 0.02;

  return this.price + priceIncrease;
};

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

// Middleware adicional para updateOne, updateMany, etc.
travelSchema.pre(
  ["updateOne", "updateMany", "findByIdAndUpdate"],
  function (next) {
    const update = this.getUpdate();

    // Atualizar finance.value se price foi alterado
    if (update.price && !update["finance.value"]) {
      this.set({ "finance.value": update.price });
    }

    // Atualizar status financeiro se a viagem foi cancelada
    if (update.status === "cancelado" && !update["finance.status"]) {
      this.set({ "finance.status": "cancelado" });
    }

    next();
  }
);

module.exports = mongoose.model("Travel", travelSchema);
