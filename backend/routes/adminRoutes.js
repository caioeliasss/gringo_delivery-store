const Admin = require("../models/Admin");
const express = require("express");
const router = express.Router();

const createAdmin = async (req, res) => {
  const { firebaseUid, name, email, role, permissions } = req.body;
  try {
    const admin = new Admin({
      firebaseUid,
      name,
      email,
      role,
      permissions,
    });
    await admin.save();
    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdmin = async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const admin = await Admin.findOne({ firebaseUid });
    if (!admin) {
      return res.status(404).json({ message: "Admin não encontrado" });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.post("/create", createAdmin);
router.get("/firebase/:firebaseUid", getAdmin);

module.exports = router;
