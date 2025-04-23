const mongoose = require("mongoose");

const deliveryPriceSchema = new mongoose.Schema({
  fixedPrice: {
    type: Number,
    required: false,
  },
  pricePerKm: {
    type: Number,
    required: false,
  },
});
