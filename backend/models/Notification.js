// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  motoboyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Motoboy",
    required: false,
  },
  firebaseUid: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    enum: [
      "DELIVERY_REQUEST",
      "ORDER_CANCELED",
      "ORDER_UPDATED",
      "SYSTEM",
      "SUPPORT_ALERT",
      "MOTOBOY",
      "SUPPORT",
      "CHAT_MESSAGE",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    default: {},
  },
  status: {
    type: String,
    enum: ["PENDING", "READ", "ACCEPTED", "REJECTED", "EXPIRED"],
    default: "PENDING",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  respondedAt: {
    type: Date,
  },
});

// Criar índice para expiração automática
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);
