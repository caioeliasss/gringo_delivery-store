const mongoose = require("mongoose");
const billingSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: false,
    },
    firebaseUid: {
      type: String,
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store", // ← Referência ao modelo Store
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    asaasInvoiceId: {
      type: String,
      required: false,
    },
    dueDate: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      },
    },
    period: {
      type: String,
      enum: ["MONTHLY", "WEEKLY", "YEARLY"],
      default: "MONTHLY",
    },
    type: {
      type: String,
      enum: ["SUBSCRIPTION", "MOTOBOY_FEE", "MOTOBOY_BILLING", "EARNING"],
      default: "SUBSCRIPTION",
    },
    description: {
      type: String,
      required: false,
    },
    paymentMethod: {
      type: String,
      enum: ["PIX", "BOLETO", "CREDIT_CARD"],
      default: "PIX",
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "CONFIRMED", "OVERDUE", "CANCELLED", "ERROR"],
      default: "PENDING",
    },
    paidAt: {
      type: Date,
      required: false,
    },
    confirmedAt: {
      type: Date,
      required: false,
    },
    overdueAt: {
      type: Date,
      required: false,
    },
    asaasData: {
      type: Object,
      required: false, // Dados completos do webhook
    },
  },
  {
    timestamps: true,
  }
);

billingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
module.exports = mongoose.model("Billing", billingSchema);
