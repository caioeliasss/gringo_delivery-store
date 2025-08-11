const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true, // Importante para buscar mensagens por chat
    },
    message: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "FILE", "SYSTEM", "LOCATION"],
      default: "TEXT",
    },
    sender: {
      type: String, // firebaseUid do remetente
      required: true,
      index: true, // Útil para consultar mensagens de um usuário específico
    },
    readBy: [
      {
        firebaseUid: String,
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    attachments: [
      {
        url: String,
        type: String,
        name: String,
        size: Number,
      },
    ],
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileType: String,
    metadata: {
      // Dados adicionais específicos de cada tipo de mensagem
      // Por exemplo, para mensagens de localização:
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
      // Para mensagens de sistema:
      systemAction: String,
      // Para referências a outras mensagens:
      replyTo: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas comuns
chatMessageSchema.index({ chatId: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, chatId: 1 });

// Método para marcar como lida por um usuário específico
chatMessageSchema.methods.markAsRead = async function (firebaseUid) {
  // Verifica se já foi lida por este usuário
  const alreadyRead = this.readBy.some(
    (read) => read.firebaseUid === firebaseUid
  );

  if (!alreadyRead) {
    this.readBy.push({
      firebaseUid: firebaseUid,
      readAt: new Date(),
    });
    await this.save();
  }

  return !alreadyRead;
};

// Hook para atualizar o chat após criar/salvar mensagens
chatMessageSchema.post("save", async function (doc) {
  try {
    const Chat = mongoose.model("Chat");
    const chat = await Chat.findById(doc.chatId);

    if (chat) {
      // await chat.updateLastMessage(doc.message, doc.sender);
    }
  } catch (error) {
    console.error("Erro ao atualizar última mensagem do chat:", error);
  }
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
