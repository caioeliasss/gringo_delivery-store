const mongoose = require("mongoose");

const deliveryPriceSchema = new mongoose.Schema(
  {
    fixedKm: {
      type: Number,
      required: false,
    },
    fixedPriceHigh: {
      type: Number,
      required: false,
    },
    fixedPrice: {
      type: Number,
      required: false,
    },
    bonusKm: {
      type: Number,
      required: false,
    },
    priceRain: {
      type: Number,
      required: false,
    },
    isRain: {
      type: Boolean,
      required: false,
    },
    isHighDemand: {
      type: Boolean,
      required: false,
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

deliveryPriceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("DeliveryPrice", deliveryPriceSchema);
