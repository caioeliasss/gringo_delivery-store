const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: [String], // Definir explicitamente como array de strings
      required: true,
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatMessage",
      },
    ],
  },
  {
    timestamps: true,
  }
);

chatSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Chat", chatSchema);
