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
