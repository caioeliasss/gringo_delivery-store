// backend/models/User.js
const mongoose = require("mongoose");

const motoboySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    pushToken: {
      type: String,
      required: false,
      trim: true,
    },
    fcmToken: {
      type: String,
      required: false,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    cpf: {
      type: String,
      required: true,
      unique: true,
    },
    cnh: {
      type: String,
      required: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    coordinates: {
      type: [Number],
      required: false,
    },
    score: {
      type: Number,
      default: 4,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
      default: null,
    },
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    race: {
      active: {
        type: Boolean,
        default: false,
      },
      orderId: {
        type: String,
        default: "",
      },
      travelId: {
        type: String,
        default: "",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    pixData: {
      pixKey: {
        type: String,
        required: false,
      },
      pixKeyType: {
        type: String,
        enum: ["EMAIL", "CPF", "CNPJ", "PHONE", "EVP"],
        required: false,
      },
    },
    asaasCustomerId: {
      type: String,
      required: false,
      trim: true,
    },
    withdrawalSettings: {
      minAmount: {
        type: Number,
        default: 10.0, // Valor mínimo para saque
      },
      autoWithdrawal: {
        type: Boolean,
        default: false, // Saque automático ativado?
      },
      autoWithdrawalAmount: {
        type: Number,
        default: 100.0, // Valor para saque automático
      },
      withdrawalDay: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
    },
  },
  {
    timestamps: true,
  }
);

motoboySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Motoboy", motoboySchema);
