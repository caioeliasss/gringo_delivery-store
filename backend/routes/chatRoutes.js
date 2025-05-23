const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const ChatMessage = require("../models/ChatMessage");
const mongoose = require("mongoose");

// Criar um novo chat
const createChat = async (req, res) => {
  const { firebaseUid } = req.body;

  try {
    if (
      !firebaseUid ||
      !Array.isArray(firebaseUid) ||
      firebaseUid.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Pelo menos um ID de usuário é necessário" });
    }

    const chat = new Chat({
      firebaseUid: firebaseUid,
      messages: [],
    });

    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obter todos os chats
const getChats = async (req, res) => {
  try {
    const chats = await Chat.find().sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obter chat por ID
const getChatById = async (req, res) => {
  const { id } = req.params;

  try {
    const chat = await Chat.findById(id);

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obter chats por firebaseUid
const getChatsByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const chats = await Chat.find({ firebaseUid: userId }).sort({
      updatedAt: -1,
    });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Atualizar chat
const updateChat = async (req, res) => {
  const { id } = req.params;
  const { firebaseUid } = req.body;

  try {
    if (
      !firebaseUid ||
      !Array.isArray(firebaseUid) ||
      firebaseUid.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Pelo menos um ID de usuário é necessário" });
    }

    const chat = await Chat.findByIdAndUpdate(
      id,
      { firebaseUid: firebaseUid },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Adicionar participante ao chat
const addUserToChat = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "ID de usuário é necessário" });
    }

    const chat = await Chat.findById(id);

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    if (!chat.firebaseUid.includes(userId)) {
      chat.firebaseUid.push(userId);
      await chat.save();
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remover participante do chat
const removeUserFromChat = async (req, res) => {
  const { id, userId } = req.params;

  try {
    const chat = await Chat.findById(id);

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    chat.firebaseUid = chat.firebaseUid.filter((uid) => uid !== userId);

    if (chat.firebaseUid.length === 0) {
      return res
        .status(400)
        .json({ message: "Não é possível remover o último participante" });
    }

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Excluir chat
const deleteChat = async (req, res) => {
  const { id } = req.params;

  try {
    const chat = await Chat.findById(id);

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    // Excluir todas as mensagens associadas ao chat
    await ChatMessage.deleteMany({ chatId: id });

    // Excluir o chat
    await Chat.findByIdAndDelete(id);

    res.json({ message: "Chat e mensagens excluídos com sucesso" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Criar mensagem de chat
const createChatMessage = async (req, res) => {
  const { chatId, message, sender } = req.body;

  try {
    if (!chatId || !message || !sender) {
      return res
        .status(400)
        .json({ message: "chatId, message e sender são obrigatórios" });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    const chatMessage = new ChatMessage({
      chatId,
      message,
      sender,
      read: false,
    });

    const savedMessage = await chatMessage.save();

    // Adicionar a mensagem ao array de mensagens do chat
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: savedMessage._id },
      updatedAt: Date.now(),
    });

    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obter todas as mensagens
const getAllChatMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obter mensagens por chatId
const getChatMessagesByChatId = async (req, res) => {
  const { chatId } = req.params;

  try {
    const messages = await ChatMessage.find({ chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Marcar mensagens como lidas
const markMessagesAsRead = async (req, res) => {
  const { chatId, userId } = req.params;

  try {
    const result = await ChatMessage.updateMany(
      {
        chatId,
        sender: { $ne: userId },
        read: false,
      },
      { read: true }
    );

    res.json({
      message: `${result.modifiedCount} mensagens marcadas como lidas`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obter contagem de mensagens não lidas
const getUnreadMessageCount = async (req, res) => {
  const { userId } = req.params;

  try {
    // Encontrar todos os chats dos quais o usuário é participante
    const chats = await Chat.find({ firebaseUid: userId });
    const chatIds = chats.map((chat) => chat._id);

    // Contar mensagens não lidas em cada chat
    const unreadCounts = await Promise.all(
      chatIds.map(async (chatId) => {
        const count = await ChatMessage.countDocuments({
          chatId: chatId.toString(),
          sender: { $ne: userId },
          read: false,
        });

        return { chatId: chatId.toString(), count };
      })
    );

    // Filtrar apenas chats com mensagens não lidas
    const filteredCounts = unreadCounts.filter((item) => item.count > 0);

    res.json({
      totalUnread: filteredCounts.reduce((sum, item) => sum + item.count, 0),
      chats: filteredCounts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Definir rotas
router.post("/", createChat);
router.get("/", getChats);
router.get("/:id", getChatById);
router.get("/user/:userId", getChatsByUserId);
router.put("/:id", updateChat);
router.put("/:id/add-user", addUserToChat);
router.put("/:id/remove-user/:userId", removeUserFromChat);
router.delete("/:id", deleteChat);

router.post("/message", createChatMessage);
router.get("/message/all", getAllChatMessages);
router.get("/message/:chatId", getChatMessagesByChatId);
router.put("/message/:chatId/read/:userId", markMessagesAsRead);
router.get("/message/unread/:userId", getUnreadMessageCount);

module.exports = router;
