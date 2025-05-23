const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    sender: {
      type: String,
      required: true,
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

chatMessageSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
