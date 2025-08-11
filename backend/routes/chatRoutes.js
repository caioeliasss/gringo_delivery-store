const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const ChatMessage = require("../models/ChatMessage");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configurar o multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/chat-files");

    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = file.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  },
});

// Validação de arquivos
const fileFilter = (req, file, cb) => {
  // Tipos permitidos
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo não permitido"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter,
});

// Função para upload de arquivos do chat
const uploadChatFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
    }

    const { chatId, sender } = req.body;

    // Validar dados obrigatórios
    if (!chatId || !sender) {
      // Remover arquivo se validação falhar
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: "chatId e sender são obrigatórios",
      });
    }

    // Verificar se o chat existe
    const chat = await Chat.findById(chatId);
    if (!chat) {
      // Remover arquivo se chat não existir
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    // Verificar se o remetente faz parte do chat
    if (!chat.participants.some((p) => p.firebaseUid === sender)) {
      // Remover arquivo se usuário não autorizado
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        message: "Remetente não faz parte deste chat",
      });
    }

    // Gerar URL do arquivo
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`;
    const fileUrl = `${baseUrl}/uploads/chat-files/${req.file.filename}`;

    // Informações do arquivo para retornar
    const fileInfo = {
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      filePath: req.file.path,
      uploadedAt: new Date(),
    };

    console.log("Arquivo carregado com sucesso:", {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      chatId,
      sender,
    });

    res.status(200).json(fileInfo);
  } catch (error) {
    // Remover arquivo em caso de erro
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error("Erro no upload de arquivo:", error);
    res.status(500).json({
      message: "Erro interno do servidor no upload",
      error: error.message,
    });
  }
};

// Criar um novo chat
const createChat = async (req, res) => {
  try {
    const { firebaseUid, chatType, title, metadata } = req.body;

    if (!firebaseUid || !Array.isArray(firebaseUid) || firebaseUid.length < 1) {
      return res.status(400).json({
        message: "É necessário fornecer pelo menos um firebaseUid",
      });
    }

    // Buscar nomes de todos os participantes
    const participantNames = {};
    const participantsData = [];

    console.log("Criando chat com participantes:", firebaseUid);

    for (const uid of firebaseUid) {
      const userName = await getUserName(uid);
      participantNames[uid] = userName;

      // Determinar o tipo de usuário
      let userType = "CUSTOMER"; // Padrão
      if (uid === "support") {
        userType = "SUPPORT";
      } else {
        // Verificar se é motoboy ou loja
        const Store = require("../models/Store");
        const Motoboy = require("../models/Motoboy");
        const SupportTeam = require("../models/SupportTeam");

        const store = await Store.findOne({ firebaseUid: uid });
        const motoboy = await Motoboy.findOne({ firebaseUid: uid });
        const supportTeam = await SupportTeam.findOne({ firebaseUid: uid });

        if (store) userType = "STORE";
        if (motoboy) userType = "MOTOBOY";
        if (supportTeam) userType = "SUPPORT";
      }

      participantsData.push({
        firebaseUid: uid,
        name: userName,
        userType: userType,
        unreadCount: 0,
        lastRead: new Date(),
      });
    }

    const chat = new Chat({
      firebaseUid,
      chatType: chatType || "GENERAL",
      status: "ACTIVE",
      participants: participantsData,
      participantNames: participantNames,
      metadata: metadata || {},
    });

    if (title) {
      chat.metadata.title = title;
    }

    await chat.save();

    console.log("Chat criado com participantes:", participantNames);
    res.status(201).json(chat);
  } catch (error) {
    console.error("Erro ao criar chat:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserName = async (firebaseUid) => {
  try {
    if (firebaseUid === "support") {
      return "Suporte Gringo";
    }

    // Buscar no modelo de Store primeiro
    const SupportTeam = require("../models/SupportTeam");
    const supportTeam = await SupportTeam.findOne({ firebaseUid });
    if (supportTeam) {
      return (
        `${supportTeam.name} - Suporte` ||
        `Suporte ${firebaseUid.substring(0, 6)}`
      );
    }

    const Store = require("../models/Store");
    const store = await Store.findOne({ firebaseUid });
    if (store) {
      return (
        store.businessName ||
        store.name ||
        `Loja ${firebaseUid.substring(0, 6)}`
      );
    }

    // Buscar no modelo de Motoboy
    const Motoboy = require("../models/Motoboy");
    const motoboy = await Motoboy.findOne({ firebaseUid });
    if (motoboy) {
      return motoboy.name || `Motoboy ${firebaseUid.substring(0, 6)}`;
    }

    // Se não encontrar, retornar um nome padrão
    return `Usuário ${firebaseUid.substring(0, 6)}`;
  } catch (error) {
    console.error(`Erro ao buscar nome do usuário ${firebaseUid}:`, error);
    return `Usuário ${firebaseUid.substring(0, 6)}`;
  }
};

// Obter chats de um usuário com contagem de não lidos
const getUserChats = async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    // Consulta eficiente usando índices
    const chats = await Chat.find({
      "participants.firebaseUid": firebaseUid,
      status: "ACTIVE",
    }).sort({ updatedAt: -1 });

    // Não precisamos de consulta separada para mensagens não lidas
    // pois isso já está no documento do chat

    res.json(chats);
  } catch (error) {
    console.error("Erro ao buscar chats:", error);
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

const updateParticipantNames = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { participantData } = req.body; // { firebaseUid: nome }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    await chat.updateParticipantNames(participantData);

    res.json({
      message: "Nomes dos participantes atualizados com sucesso",
      chat,
    });
  } catch (error) {
    console.error("Erro ao atualizar nomes dos participantes:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (!status || !["ACTIVE", "CLOSED", "DELETED"].includes(status)) {
      return res.status(400).json({
        message: "Status inválido. Use ACTIVE, CLOSED ou DELETED.",
      });
    }
    const chat = await Chat.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    );
    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }
    res.json(chat);
  } catch (error) {
    console.error("Erro ao atualizar status do chat:", error);
    res.status(500).json({ message: error.message });
  }
};

// Enviar mensagem
const sendMessage = async (req, res) => {
  try {
    const {
      chatId,
      message,
      sender,
      messageType,
      metadata,
      attachments,
      fileUrl,
      fileName,
      fileSize,
      fileType,
    } = req.body;

    if (!chatId || !message || !sender) {
      return res.status(400).json({
        message: "chatId, message e sender são obrigatórios",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    // Verificar se o remetente faz parte do chat
    if (!chat.participants.some((p) => p.firebaseUid === sender)) {
      return res
        .status(403)
        .json({ message: "Remetente não faz parte deste chat" });
    }

    // Criar nova mensagem
    const newMessageData = {
      chatId,
      message,
      sender,
      messageType: messageType || "TEXT",
      readBy: [{ firebaseUid: sender }], // Já marcada como lida pelo remetente
      metadata: metadata || {},
      attachments: attachments || [],
    };

    // Se for arquivo, adicionar os campos de arquivo
    if (messageType === "FILE") {
      if (fileUrl) newMessageData.fileUrl = fileUrl;
      if (fileName) newMessageData.fileName = fileName;
      if (fileSize) newMessageData.fileSize = fileSize;
      if (fileType) newMessageData.fileType = fileType;

      // Também adicionar no metadata para compatibilidade
      newMessageData.metadata = {
        ...newMessageData.metadata,
        fileUrl,
        fileName,
        fileSize,
        fileType,
      };
    }

    const newMessage = new ChatMessage(newMessageData);
    await newMessage.save();
    // O hook post-save já atualiza o chat com a última mensagem

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
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
  try {
    const { chatId, firebaseUid } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    // Usar o método definido no esquema
    await chat.markAsRead(firebaseUid);

    // Também marcar todas as mensagens individuais como lidas
    await ChatMessage.updateMany(
      {
        chatId,
        "readBy.firebaseUid": { $ne: firebaseUid },
      },
      {
        $push: {
          readBy: {
            firebaseUid: firebaseUid,
            readAt: new Date(),
          },
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao marcar mensagens como lidas:", error);
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
router.post("/upload", upload.single("file"), uploadChatFile);
router.post("/", createChat);
router.get("/", getUserChats);
router.get("/:id", getChatById);
router.get("/user/:userId", getChatsByUserId);
router.put("/:id", updateChat);
router.put("/:id/add-user", addUserToChat);
router.put("/:id/remove-user/:userId", removeUserFromChat);
router.put("/:id/status", updateStatus);
// router.put("/:chatId/participants/names", updateParticipantNames);
router.delete("/:id", deleteChat);

router.post("/message", sendMessage);
router.get("/message/all", getAllChatMessages);
router.get("/message/:chatId", getChatMessagesByChatId);
router.put("/message/:chatId/read/:userId", markMessagesAsRead);
router.get("/message/unread/:userId", getUnreadMessageCount);

module.exports = router;
