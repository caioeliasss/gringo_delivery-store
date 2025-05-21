const mongoose = require("mongoose");

const avaliateSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: false,
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
    rating: {
      type: Number,
      required: false,
    },
    feedback: {
      type: String,
      required: false,
    },
    storeName: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

avaliateSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Avaliate", avaliateSchema);
