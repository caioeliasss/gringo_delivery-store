const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: [String],
      required: true,
      index: true, // Adicionar índice para melhorar consultas
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
      index: true, // Facilita consultas por status
    },
    lastMessage: {
      text: String,
      sender: String,
      timestamp: Date,
    },
    participants: [
      {
        firebaseUid: String,
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
    metadata: {
      // Campos opcionais relacionados ao chat
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

// Atualizar timestamp e últimas informações de mensagens
chatSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Método para marcar mensagens como lidas para um usuário
chatSchema.methods.markAsRead = async function (firebaseUid) {
  const participant = this.participants.find(
    (p) => p.firebaseUid === firebaseUid
  );
  if (participant) {
    participant.unreadCount = 0;
    participant.lastRead = new Date();
    await this.save();
    return true;
  }
  return false;
};

// Método para atualizar a última mensagem
chatSchema.methods.updateLastMessage = async function (messageText, sender) {
  this.lastMessage = {
    text: messageText,
    sender: sender,
    timestamp: new Date(),
  };

  // Incrementar contadores de não lidos para todos exceto o remetente
  this.participants.forEach((participant) => {
    if (participant.firebaseUid !== sender) {
      participant.unreadCount += 1;
    }
  });

  await this.save();
};

module.exports = mongoose.model("Chat", chatSchema);
