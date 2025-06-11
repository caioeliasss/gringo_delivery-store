const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true, // Útil para consultas rápidas
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
      default: "ADMIN",
    },
    permissions: {
      type: [String], // Lista de permissões específicas
      default: [],
    },
  },
  {
    timestamps: true, // Cria campos createdAt e updatedAt
  }
);

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
