// backend/server.js - Exemplo de integração com notificações push
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const SocketManager = require("./utils/socketManager");

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // Configure apropriadamente para produção
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  path: "/socket", // Importante: definir o path para compatibilidade
});

// Criar instância do gerenciador de sockets
const socketManager = new SocketManager(io);

// Configurar socketHandler com o gerenciador
const socketHandler = require("./socket/socketHandler");
socketHandler(io, socketManager);

// Fazer o socketManager disponível globalmente
global.socketManager = socketManager;

// Função global para compatibilidade com código existente
global.sendSocketNotification = (firebaseUid, eventType, data) => {
  return socketManager.sendNotificationToUser(firebaseUid, eventType, data);
};

// Função especializada para notificações de suporte
global.sendSupportNotification = (firebaseUid, title, message, data = {}) => {
  const notificationData = {
    notificationId: `support_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    title,
    message,
    body: message, // Compatibilidade
    type: "SUPPORT_ALERT",
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      priority: data.priority || "normal",
      source: "support",
    },
    timestamp: new Date().toISOString(),
    status: "PENDING",
  };

  // Enviar via WebSocket
  const socketSent = socketManager.sendNotificationToUser(
    firebaseUid,
    "supportNotification",
    notificationData
  );

  console.log(`📨 Notificação de suporte enviada para ${firebaseUid}:`, {
    title,
    socketSent,
    notificationId: notificationData.notificationId,
  });

  return { sent: socketSent, notificationId: notificationData.notificationId };
};

// Função para notificações do sistema
global.sendSystemNotification = (firebaseUid, title, message, data = {}) => {
  const notificationData = {
    notificationId: `system_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    title,
    message,
    body: message,
    type: "SYSTEM",
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      source: "system",
    },
    timestamp: new Date().toISOString(),
    status: "PENDING",
  };

  const socketSent = socketManager.sendNotificationToUser(
    firebaseUid,
    "SYSTEM",
    notificationData
  );

  console.log(`🖥️ Notificação do sistema enviada para ${firebaseUid}:`, {
    title,
    socketSent,
    notificationId: notificationData.notificationId,
  });

  return { sent: socketSent, notificationId: notificationData.notificationId };
};

// Middleware para adicionar socketManager ao req
app.use((req, res, next) => {
  req.socketManager = socketManager;
  next();
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Suas rotas existentes
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

// Rota para testar notificações de suporte
app.post("/api/test/support-notification", (req, res) => {
  const { firebaseUid, title, message, data } = req.body;

  if (!firebaseUid || !title || !message) {
    return res.status(400).json({
      error: "firebaseUid, title e message são obrigatórios",
    });
  }

  const result = sendSupportNotification(firebaseUid, title, message, data);

  res.json({
    success: true,
    message: "Notificação de teste enviada",
    result,
  });
});

// Rota para testar notificações do sistema
app.post("/api/test/system-notification", (req, res) => {
  const { firebaseUid, title, message, data } = req.body;

  if (!firebaseUid || !title || !message) {
    return res.status(400).json({
      error: "firebaseUid, title e message são obrigatórios",
    });
  }

  const result = sendSystemNotification(firebaseUid, title, message, data);

  res.json({
    success: true,
    message: "Notificação de sistema enviada",
    result,
  });
});

// Rota para estatísticas de conexões (útil para debug)
app.get("/api/socket/stats", (req, res) => {
  res.json(socketManager.getConnectionStats());
});

// Rota para verificar se usuário está online
app.get("/api/socket/user/:firebaseUid/status", (req, res) => {
  const { firebaseUid } = req.params;
  const isOnline = socketManager.isUserOnline(firebaseUid);
  res.json({ firebaseUid, isOnline });
});

// Exemplo de como usar as notificações em uma rota de ocorrência
app.post("/api/example/create-occurrence", async (req, res) => {
  try {
    const { description, priority, assignedToUid } = req.body;

    // Criar ocorrência (lógica simulada)
    const occurrence = {
      id: Date.now(),
      description,
      priority,
      assignedTo: assignedToUid,
      createdAt: new Date().toISOString(),
    };

    // Enviar notificação para o usuário designado
    if (assignedToUid) {
      const title =
        priority === "high"
          ? "🚨 Ocorrência Urgente Atribuída"
          : "📋 Nova Ocorrência Atribuída";
      const message = `Uma nova ocorrência foi atribuída a você: ${description.substring(
        0,
        100
      )}${description.length > 100 ? "..." : ""}`;

      sendSupportNotification(assignedToUid, title, message, {
        occurrenceId: occurrence.id,
        priority: priority,
        type: "occurrence_assigned",
        url: `/occurrences/${occurrence.id}`,
      });
    }

    res.json({
      success: true,
      occurrence,
      message: "Ocorrência criada e notificação enviada",
    });
  } catch (error) {
    console.error("Erro ao criar ocorrência:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Limpeza periódica de conexões inativas (a cada 15 minutos)
setInterval(() => {
  socketManager.cleanupInactiveConnections(30);
}, 15 * 60 * 1000);

const PORT = process.env.PORT || 8080; // Mudança para 8080 para compatibilidade
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log("📱 Socket.IO configurado com suporte a notificações push");
  console.log("🔔 Notificações de suporte e sistema habilitadas");
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/socket`);
});

module.exports = { app, server, io, socketManager };
