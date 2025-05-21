// backend/models/File.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const fileSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "Sem descrição",
  },
  type: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  storagePath: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  // Campos opcionais para metadados adicionais
  thumbnailUrl: {
    type: String,
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false,
  },
});

// Índices para melhorar a performance das consultas
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ uploadedAt: -1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ isPublic: 1 });

module.exports = mongoose.model("File", fileSchema);
