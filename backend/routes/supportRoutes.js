const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const SupportTeam = require("../models/SupportTeam");

const createSupportTeam = async (req, res) => {
  const { name, email, phone, whatsapp, firebaseUid } = req.body;
  try {
    const supportTeam = new SupportTeam({
      name: name,
      firebaseUid: firebaseUid,
      email: email,
      phone: phone,
      whatsapp: whatsapp || "",
    });
    await supportTeam.save();
    res.json(supportTeam);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.response.data });
  }
};
const updateSupportTeam = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, whatsapp } = req.body;
  try {
    const supportTeam = await SupportTeam.findByIdAndUpdate(
      id,
      {
        name: name,
        email: email,
        phone: phone,
        whatsapp: whatsapp,
      },
      { new: true }
    );
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getSupportTeam = async (req, res) => {
  try {
    const supportTeam = await SupportTeam.find();
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getSupportTeamById = async (req, res) => {
  const { id } = req.params;
  try {
    const supportTeam = await SupportTeam.findById(id);
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupportTeamByFirebaseUid = async (req, res) => {
  const { firebaseUid } = req.params;
  try {
    const firebaseUidTrimmed = firebaseUid.trim();
    const supportTeam = await SupportTeam.findOne({
      firebaseUid: firebaseUidTrimmed,
    });
    if (!supportTeam) {
      return res.status(404).json({ message: "Support team not found" });
    }

    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupportTeamByEmail = async (req, res) => {
  const { email } = req.params;
  try {
    const supportTeam = await SupportTeam.findOne({ email: email });
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSupportTeam = async (req, res) => {
  const { id } = req.params;
  try {
    const supportTeam = await SupportTeam.findByIdAndDelete(id);
    res.json(supportTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.post("/", createSupportTeam);
router.put("/:id", updateSupportTeam);
router.get("/", getSupportTeam);
router.get("/:id", getSupportTeamById);
router.get("/email/:email", getSupportTeamByEmail);
router.get("/firebase/:firebaseUid", getSupportTeamByFirebaseUid);
router.delete("/:id", deleteSupportTeam);

module.exports = router;
