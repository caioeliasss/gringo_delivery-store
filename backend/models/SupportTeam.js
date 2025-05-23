const mongoose = require("mongoose");

const supportTeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    whatsapp: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
    firebaseUid: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

supportTeamSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const SupportTeam = mongoose.model(
  "SupportTeam",
  supportTeamSchema,
  "support-team"
);

module.exports = SupportTeam;
