// backend/server.js - Exemplo de integração
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

// Middleware para adicionar socketManager ao req
app.use((req, res, next) => {
  req.socketManager = socketManager;
  next();
});

// Suas rotas existentes
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

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

// Limpeza periódica de conexões inativas (a cada 15 minutos)
setInterval(() => {
  socketManager.cleanupInactiveConnections(30);
}, 15 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log("Socket.IO configurado e funcionando");
});

module.exports = { app, server, io, socketManager };
