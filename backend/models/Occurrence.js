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
      "MOTOBOY",
    ],
    default: "OUTRO",
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
});

occurrenceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Occurrence = mongoose.model("Occurrence", occurrenceSchema);
module.exports = Occurrence;
