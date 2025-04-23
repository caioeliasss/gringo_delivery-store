const mongoose = require("mongoose");

const travelSchema = mongoose.Schema({
  price: {
    type: Number,
    required: true,
  },
  rain: {
    type: Boolean,
    required: false,
  },
  distance: {
    type: Number,
    required: false,
  },
  estimateTravelTime: {
    type: Number,
    required: false,
  },
  coordinatesFrom: {
    type: [Number],
    required: false,
  },
  coordinatesTo: {
    type: [Number],
    required: false,
  },
  store: {
    type: Object,
    default: {},
  },
  order: {
    type: Object,
    default: {},
  },
});
