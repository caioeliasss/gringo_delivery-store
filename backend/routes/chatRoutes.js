const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const ChatMessage = require("../models/ChatMessage");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const notificationService = require("../services/notificationService");
const admin = require("../config/firebase-admin");

// Cache simples em memória para endpoints críticos
const cache = new Map();
const CACHE_TTL = 120000; // 2 minutos

// Função para limpar cache expirado
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now > value.expiresAt) {
      cache.delete(key);
    }
  }
};

// Limpar cache a cada 5 minutos
setInterval(cleanupCache, 300000);

// Wrapper para cache
const cacheWrapper = {
  get: (key) => {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      cache.delete(key);
      return null;
    }

    return item.data;
  },
  set: (key, data, ttl = CACHE_TTL) => {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  },
  delete: (key) => {
    cache.delete(key);
  },
  clear: () => {
    cache.clear();
  },
};

// Rate limiting específico para endpoints de chat
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 30; // máximo 30 requests por minuto por usuário

const chatRateLimit = (req, res, next) => {
  const userId = req.params.userId;
  if (!userId) return next();

  const now = Date.now();
  const userKey = `rateLimit_${userId}`;
  const userLimit = rateLimitMap.get(userKey) || { count: 0, windowStart: now };

  // Se a janela expirou, resetar
  if (now - userLimit.windowStart > RATE_LIMIT_WINDOW) {
    userLimit.count = 0;
    userLimit.windowStart = now;
  }

  userLimit.count++;
  rateLimitMap.set(userKey, userLimit);

  if (userLimit.count > MAX_REQUESTS_PER_WINDOW) {
    console.warn(
      `⚠️ Rate limit excedido para usuário ${userId}: ${userLimit.count} requests`
    );
    return res.status(429).json({
      message: "Muitas requisições. Tente novamente em 1 minuto.",
      retryAfter: Math.ceil(
        (RATE_LIMIT_WINDOW - (now - userLimit.windowStart)) / 1000
      ),
    });
  }

  next();
};

// Limpar rate limit map periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

// Configurar o multer para upload em memória (para Firebase)
const storage = multer.memoryStorage();

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

// Inicializar Firebase Storage bucket com fallback
let bucket;
try {
  // Tentar obter bucket da configuração padrão
  bucket = admin.storage().bucket();
} catch (error) {
  console.log(
    "⚠️ Bucket padrão não encontrado, tentando com nome explícito..."
  );

  // Fallback: usar nome do projeto + .firebasestorage.app
  const app = admin.app();
  const projectId = app.options.projectId;
  const bucketName = `${projectId}.firebasestorage.app`;

  console.log(`🪣 Tentando bucket: ${bucketName}`);
  bucket = admin.storage().bucket(bucketName);
}

// Função para upload de arquivos do chat usando Firebase Storage
const uploadChatFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
    }

    const { chatId, sender } = req.body;

    // Validar dados obrigatórios
    if (!chatId || !sender) {
      return res.status(400).json({
        message: "chatId e sender são obrigatórios",
      });
    }

    // Verificar se o chat existe
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado" });
    }

    // Verificar se o remetente faz parte do chat
    if (!chat.participants.some((p) => p.firebaseUid === sender)) {
      return res.status(403).json({
        message: "Remetente não faz parte deste chat",
      });
    }

    // Gerar nome único para o arquivo no Firebase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = req.file.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );
    const fileName = `chat-files/${chatId}/${timestamp}-${uniqueSuffix}-${sanitizedOriginalName}`;

    console.log(`📁 Iniciando upload para Firebase Storage: ${fileName}`);

    // Criar referência do arquivo no Firebase Storage
    const file = bucket.file(fileName);

    // Upload do arquivo para o Firebase Storage
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          chatId: chatId,
          sender: sender,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Promise para lidar com o upload
    const uploadPromise = new Promise((resolve, reject) => {
      stream.on("error", (error) => {
        console.error("Erro no upload para Firebase Storage:", error);
        reject(error);
      });

      stream.on("finish", async () => {
        try {
          console.log(`✅ Upload concluído: ${fileName}`);

          // Tornar o arquivo público para acesso direto
          await file.makePublic();

          // Gerar URL pública do arquivo
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

          console.log(`🌐 URL pública gerada: ${publicUrl}`);

          resolve(publicUrl);
        } catch (error) {
          console.error("Erro ao tornar arquivo público:", error);
          reject(error);
        }
      });
    });

    // Iniciar o upload
    stream.end(req.file.buffer);

    // Aguardar o upload terminar
    const fileUrl = await uploadPromise;

    // Informações do arquivo para retornar
    const fileInfo = {
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      storagePath: fileName,
      uploadedAt: new Date(),
    };

    console.log("Arquivo carregado com sucesso no Firebase Storage:", {
      originalName: req.file.originalname,
      storagePath: fileName,
      size: req.file.size,
      chatId,
      sender,
      publicUrl: fileUrl,
    });

    res.status(200).json(fileInfo);
  } catch (error) {
    console.error("Erro no upload de arquivo para Firebase Storage:", error);
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

    if (chat.participants.some((p) => p.firebaseUid === sender)) {
      // Se o remetente é um participante, enviar notificação para cada participante
      const otherParticipants = chat.participants.filter(
        (p) => p.firebaseUid !== sender
      );

      // Atualizar a última mensagem e incrementar unreadCount para outros participantes
      await Chat.updateOne(
        { _id: chat._id },
        {
          $set: { lastMessage: newMessage._id },
          $inc: {
            "participants.$[participant].unreadCount": 1,
          },
        },
        {
          arrayFilters: [
            {
              "participant.firebaseUid": {
                $in: otherParticipants.map((p) => p.firebaseUid),
              },
            },
          ],
        }
      );

      // Enviar notificação individual para cada participante
      for (const participant of otherParticipants) {
        try {
          await notificationService.createGenericNotification({
            title: "Nova mensagem",
            message: message.trim(),
            firebaseUid: participant.firebaseUid, // Enviar como string, não array
            screen: "/chat",
            type: "CHAT_MESSAGE",
            chatId: chat._id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expira em 24 hrs
          });
        } catch (notifError) {
          console.error(
            `Erro ao enviar notificação para ${participant.firebaseUid}:`,
            notifError
          );
        }
      }
    }

    // ✅ INVALIDAR CACHE quando nova mensagem é enviada
    // Invalidar cache para todos os participantes
    for (const participant of chat.participants) {
      const cacheKey = `hasUnread_${participant.firebaseUid}`;
      cacheWrapper.delete(cacheKey);
    }

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

    // Zerar o unreadCount para o usuário específico
    await Chat.updateOne(
      { _id: chatId },
      {
        $set: {
          "participants.$[participant].unreadCount": 0,
          "participants.$[participant].lastRead": new Date(),
        },
      },
      {
        arrayFilters: [{ "participant.firebaseUid": firebaseUid }],
      }
    );

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

    // ✅ INVALIDAR CACHE quando mensagens são marcadas como lidas
    const cacheKey = `hasUnread_${firebaseUid}`;
    cacheWrapper.delete(cacheKey);

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao marcar mensagens como lidas:", error);
    res.status(500).json({ message: error.message });
  }
};

// Verificar se há mensagens de chat não lidas (endpoint otimizado)
const hasUnreadChatMessages = async (req, res) => {
  const { userId } = req.params;

  try {
    // Encontrar se existe pelo menos uma mensagem não lida
    const hasUnread = await ChatMessage.exists({
      // Buscar em chats onde o usuário é participante
      chatId: {
        $in: await Chat.distinct("_id", {
          "participants.firebaseUid": userId,
          status: "ACTIVE",
        }),
      },
      sender: { $ne: userId }, // Não contar próprias mensagens
      "readBy.firebaseUid": { $ne: userId }, // Não foi lida pelo usuário
    });

    res.json({
      hasUnreadMessages: !!hasUnread,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erro ao verificar mensagens não lidas:", error);
    res.status(500).json({ message: error.message });
  }
};

// Obter contagem de mensagens não lidas (versão otimizada usando unreadCount)
const getUnreadMessageCountOptimized = async (req, res) => {
  const { userId } = req.params;

  try {
    // Buscar todos os chats onde o usuário é participante
    const chats = await Chat.find({
      "participants.firebaseUid": userId,
      status: "ACTIVE",
    });

    let totalUnreadCount = 0;
    const chatUnreadCounts = {};

    for (const chat of chats) {
      // Encontrar o participante específico no chat
      const participant = chat.participants.find(
        (p) => p.firebaseUid === userId
      );

      if (participant && participant.unreadCount > 0) {
        chatUnreadCounts[chat._id] = participant.unreadCount;
        totalUnreadCount += participant.unreadCount;
      }
    }

    res.json({
      totalUnreadCount,
      chatUnreadCounts,
      chats: chats.length,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar contagem otimizada de mensagens não lidas:",
      error
    );
    res.status(500).json({ message: error.message });
  }
};

// Verificar se há mensagens não lidas (versão ultra otimizada)
const hasUnreadChatMessagesOptimized = async (req, res) => {
  const { userId } = req.params;

  try {
    // Cache no nível do endpoint por 2 minutos
    const cacheKey = `hasUnread_${userId}`;
    const cached = cacheWrapper.get(cacheKey);

    if (cached) {
      return res.json({
        hasUnreadMessages: cached.hasUnread,
        timestamp: cached.timestamp,
        fromCache: true,
      });
    }

    // Usar agregação MongoDB para máxima performance
    const result = await Chat.aggregate([
      {
        $match: {
          "participants.firebaseUid": userId,
          status: "ACTIVE",
        },
      },
      {
        $project: {
          hasUnreadForUser: {
            $gt: [
              {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$participants",
                        cond: { $eq: ["$$this.firebaseUid", userId] },
                      },
                    },
                    in: "$$this.unreadCount",
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          hasUnreadForUser: true,
        },
      },
      {
        $limit: 1, // Só precisa de um resultado para confirmar
      },
    ]);

    const hasUnread = result.length > 0;

    // Cache por 2 minutos
    cacheWrapper.set(cacheKey, {
      hasUnread,
      timestamp: new Date(),
    });

    res.json({
      hasUnreadMessages: hasUnread,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error(
      "Erro ao verificar mensagens não lidas (ultra otimizada):",
      error
    );
    res.status(500).json({ message: error.message });
  }
};

// Endpoint de debug para verificar arquivos no Firebase Storage
const debugFiles = async (req, res) => {
  try {
    const app = admin.app();
    const stats = {
      firebaseStorage: {
        bucketName: bucket.name,
        configured: !!bucket,
        projectId: app.options.projectId,
        credentialType: app.options.credential
          ? "configured"
          : "not configured",
      },
      containerInfo: {
        hostname: process.env.HOSTNAME || "unknown",
        port: process.env.PORT || "unknown",
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        cwd: process.cwd(),
      },
      files: [],
      totalSize: 0,
    };

    try {
      // Listar arquivos na pasta chat-files do Firebase Storage
      const [files] = await bucket.getFiles({
        prefix: "chat-files/",
        maxResults: 100,
      });

      for (const file of files) {
        const [metadata] = await file.getMetadata();

        stats.files.push({
          name: file.name,
          size: parseInt(metadata.size),
          created: metadata.timeCreated,
          updated: metadata.updated,
          contentType: metadata.contentType,
          publicUrl: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
          metadata: metadata.metadata || {},
        });

        stats.totalSize += parseInt(metadata.size);
      }
    } catch (storageError) {
      stats.storageError = storageError.message;
    }

    // Verificar mensagens com arquivos no banco
    try {
      const fileMessages = await ChatMessage.find({
        messageType: "FILE",
      })
        .sort({ createdAt: -1 })
        .limit(20);

      stats.databaseFiles = fileMessages.map((msg) => ({
        id: msg._id,
        fileName: msg.fileName,
        fileUrl: msg.fileUrl,
        createdAt: msg.createdAt,
        chatId: msg.chatId,
        fileSize: msg.fileSize,
        fileType: msg.fileType,
      }));
    } catch (dbError) {
      stats.databaseError = dbError.message;
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
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
router.put("/message/:chatId/read/:firebaseUid", markMessagesAsRead);
router.get(
  "/message/unread/:userId",
  chatRateLimit,
  getUnreadMessageCountOptimized
); // Usando versão otimizada
router.get(
  "/message/has-unread/:userId",
  chatRateLimit,
  hasUnreadChatMessagesOptimized
); // Usando versão otimizada
router.get(
  "/message/unread-info/:userId",
  chatRateLimit,
  hasUnreadChatMessagesOptimized
); // Usando versão otimizada

// Rota de debug para verificar arquivos
router.get("/debug/files", debugFiles);

module.exports = router;
