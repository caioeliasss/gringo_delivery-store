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
    enum: ["em_entrega", "entregue", "cancelado", "pago"],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Travel", travelSchema);
