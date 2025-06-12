// backend/models/Withdrawal.js
const mongoose = require("mongoose");

const withdrawalSchema = mongoose.Schema(
  {
    motoboyId: {
      type: String,
      required: true,
      ref: "Motoboy",
    },
    name: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },
    asaasTransferId: {
      type: String,
      required: false,
    },
    pixKey: {
      type: String,
      required: true,
    },
    pixKeyType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "Saque de corridas - Gringo Delivery",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    errorMessage: {
      type: String,
      required: false,
    },
    travels: [
      {
        travelId: {
          type: String,
          ref: "Travel",
        },
        amount: Number,
      },
    ],
    travels: {
      type: [],
      default: [],
    },
    fees: {
      asaasFee: {
        type: Number,
        default: 0,
      },
      platformFee: {
        type: Number,
        default: 0,
      },
    },
    netAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
