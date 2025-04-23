const mongoose = require("mongoose");

const deliveryPriceSchema = new mongoose.Schema(
  {
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
