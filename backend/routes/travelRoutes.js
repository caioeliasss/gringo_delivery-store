const express = require("express");
const router = express.Router();
const Travel = require("../models/Travel");

const createTravel = async (req, res) => {
  const { price, rain, distance, coordinatesFrom, coordinatesTo, order } =
    req.body;
  try {
    const travel = new Travel({
      price: price,
      rain: rain,
      distance: distance,
      coordinatesFrom: coordinatesFrom,
      coordinatesTo: coordinatesTo,
      order: order,
    });
    travel.save();
    res.json(travel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.post("/", createTravel);

module.exports = router;
