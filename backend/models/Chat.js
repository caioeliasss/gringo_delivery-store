// backend/models/Chat.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: [String],
      required: true,
      index: true,
    },
    chatType: {
      type: String,
      enum: ["SUPPORT", "OCCURRENCE", "DELIVERY", "GENERAL"],
      default: "GENERAL",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED", "CLOSED"],
      default: "ACTIVE",
      index: true,
    },
    lastMessage: {
      text: String,
      sender: String,
      timestamp: Date,
    },
    participants: [
      {
        firebaseUid: String,
        name: String, // ADICIONAR NOME
        userType: {
          type: String,
          enum: ["SUPPORT", "MOTOBOY", "STORE", "CUSTOMER"],
        },
        unreadCount: {
          type: Number,
          default: 0,
        },
        lastRead: Date,
      },
    ],
    // ADICIONAR CAMPO PARA NOMES DOS PARTICIPANTES
    participantNames: {
      type: Map,
      of: String,
      default: {},
    },
    metadata: {
      occurrenceId: mongoose.Schema.Types.ObjectId,
      deliveryId: mongoose.Schema.Types.ObjectId,
      title: String,
      tags: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Índices compostos para consultas comuns
chatSchema.index({ firebaseUid: 1, status: 1 });
chatSchema.index({ "participants.firebaseUid": 1, status: 1 });

// Método para atualizar nomes dos participantes
chatSchema.methods.updateParticipantNames = async function (participantData) {
  // participantData é um objeto { firebaseUid: nome }
  for (const [uid, name] of Object.entries(participantData)) {
    this.participantNames.set(uid, name);

    // Também atualizar no array de participants
    const participant = this.participants.find((p) => p.firebaseUid === uid);
    if (participant) {
      participant.name = name;
    }
  }
  await this.save();
};

// Método para marcar chat como lido para um usuário específico
chatSchema.methods.markAsRead = async function (firebaseUid) {
  const participant = this.participants.find(
    (p) => p.firebaseUid === firebaseUid
  );
  if (participant) {
    participant.unreadCount = 0;
    participant.lastRead = new Date();
    await this.save();
  }
};

module.exports = mongoose.model("Chat", chatSchema);
