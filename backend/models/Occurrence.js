const mongoose = require("mongoose");
const occurrenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
  },
  firebaseUid: {
    type: String,
    required: true,
    trim: true,
  },
  answerAi: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: false,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "CLIENTE",
      "ENTREGA",
      "PAGAMENTO",
      "EVENTO",
      "APP",
      "OUTRO",
      "ESTABELECIMENTO",
      "PRODUTO",
      "PEDIDO",
      "MOTOBOY",
      "ENTREGADOR",
    ],
    default: "OUTRO",
  },
  role: {
    type: [String],
    required: false,
    enum: ["admin", "general", "finances", "logistics"],
    default: ["admin"],
  },
  status: {
    type: String,
    required: true,
    enum: ["ABERTO", "FECHADO", "PENDENTE"],
    default: "ABERTO",
  },
  motoboyId: {
    type: String,
    required: false,
  },
  storeId: {
    type: String,
    required: false,
  },
  customerId: {
    type: String,
    required: false,
  },
  orderId: {
    type: String,
    required: false,
  },
  travelId: {
    type: String,
    required: false,
  },
  date: {
    type: Date,
    required: true,
  },
  coordinates: {
    type: [Number],
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: function () {
      // Define expiration as 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
  },
});

occurrenceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

occurrenceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Occurrence = mongoose.model("Occurrence", occurrenceSchema);
module.exports = Occurrence;
