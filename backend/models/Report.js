const mongoose = require("mongoose");
const { create } = require("./Billing");

const reportSchema = new mongoose.Schema({
  success: {
    type: [],
    required: false,
    default: [],
  },
  errors: {
    type: [],
    required: false,
    default: [],
  },
  type: {
    type: String,
    required: false,
    default: "GENERAL",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model("Report", reportSchema);
module.exports = Report;
