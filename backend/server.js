// backend/server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const admin = require("./config/firebase-admin"); // Usar configuração centralizada
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");

// Configuração das variáveis de ambiente baseada no NODE_ENV
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "development"
    ? ".env.development"
    : ".env";

dotenv.config({ path: envFile });

console.log(`🔧 Carregando variáveis do arquivo: ${envFile}`);
console.log(`🌐 BASE_URL configurada: ${process.env.BASE_URL}`);

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 8080;

// Criar servidor HTTP
const server = http.createServer(app);

// Configurar Socket.io com path específico
const io = socketIO(server, {
  cors: {
    origin: "*", // Em produção, especifique os domínios permitidos
    methods: ["GET", "POST"],
  },
  path: "/socket", // Adicionar path específico para Socket.io
  transports: ["websocket", "polling"], // Usar apenas WebSocket para comunicação
});

const isDevelopment = process.env.NODE_ENV !== "production";

app.use(
  cors({
    origin: isDevelopment
      ? "*" // Desenvolvimento: permite qualquer origin
      : ["https://gringodelivery.com.br"], // Produção: apenas seu domínio
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Configurar trust proxy para funcionar corretamente com proxies (GCP, Nginx, etc.)
// Para Google Cloud Run, confiamos apenas no primeiro proxy
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json());

// Middleware CORS específico para arquivos de upload
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// Middleware para servir arquivos estáticos do chat
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Armazenar clientes SSE conectados (mantido para compatibilidade)
const clients = new Map();

// Rota para eventos SSE (mantida para compatibilidade)
app.get("/api/events", (req, res) => {
  const storeId = req.headers["x-store-id"] || req.query.storeId;

  if (!storeId) {
    return res.status(400).json({ message: "ID da loja não fornecido" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      message: "Conectado ao servidor de eventos",
    })}\n\n`
  );

  if (!clients.has(storeId)) {
    clients.set(storeId, []);
  }
  clients.get(storeId).push(res);

  req.on("close", () => {
    if (clients.has(storeId)) {
      const clientsArray = clients.get(storeId);
      const index = clientsArray.indexOf(res);
      if (index !== -1) {
        clientsArray.splice(index, 1);
        if (clientsArray.length === 0) {
          clients.delete(storeId);
        }
      }
    }
    console.log(`Cliente SSE desconectado: ${storeId}`);
  });

  console.log(`Cliente SSE conectado: ${storeId}`);
});

// Função para enviar evento para uma loja específica (SSE)
const sendEventToStore = (storeId, eventType, data) => {
  // console.log(`Tentando enviar evento ${eventType} para loja ${storeId}`, data);
  storeId = storeId.toString();

  if (!clients.has(storeId)) {
    for (let i = 0; i < clients.size; i++) {
      // console.log(`Clientes SSE conectados: ${Array.from(clients.keys())[i]}`);
      // console.log(`é igual?: ${Array.from(clients.keys())[i] === storeId}`);
    }
    console.log(`Nenhum cliente SSE encontrado para loja ${storeId}`);
    return false;
  }

  const clientsArray = clients.get(storeId);
  // console.log(
  //   `Encontrados ${clientsArray.length} clientes para loja ${storeId}`
  // );

  const event = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
  };

  clientsArray.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
      // console.log(`Evento enviado com sucesso para cliente da loja ${storeId}`);
    } catch (error) {
      console.error(
        `Erro ao enviar evento para cliente da loja ${storeId}:`,
        error
      );
    }
  });

  return true;
};

// Expor a função para outros módulos
app.locals.sendEventToStore = sendEventToStore;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Para uso com proxy confiável
  trustProxy: 1, // Confiar no primeiro proxy (Google Cloud Run)
});
app.use(limiter);

// Firebase Admin já está inicializado no import (linha 9)
// Removemos a inicialização duplicada para evitar o erro

// Conexão com MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Conectado ao MongoDB Atlas"))
  .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token de autenticação não fornecido" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido ou expirado" });
  }
};

// Rotas
app.get("/", (req, res) => {
  res.send("API está funcionando");
});

// Configurar SocketManager e handlers
const SocketManager = require("./utils/socketManager");
const socketManager = new SocketManager(io);

// Configurar socketHandler com o gerenciador
const socketHandler = require("./socket/socketHandler");
socketHandler(io, socketManager); // Passando socketManager como parâmetro

// Fazer o socketManager disponível globalmente
global.socketManager = socketManager;

// Função global para compatibilidade com código existente (substitui SSE)
global.sendSocketNotification = (firebaseUid, eventType, data) => {
  return socketManager.sendNotificationToUser(firebaseUid, eventType, data);
};

// Middleware para adicionar socketManager ao req
app.use((req, res, next) => {
  req.socketManager = socketManager;
  req.io = io; // Manter para compatibilidade
  next();
});

// Importar rotas
const storeRoutes = require("./routes/storeRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const motoboyRoutes = require("./routes/motoboyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const travelRoutes = require("./routes/travelRoutes");
const occurrenceRoutes = require("./routes/occurrenceRoutes");
const deliveryPricesRoutes = require("./routes/deliveryPricesRoutes");
const cronService = require("./services/cronService");
cronService.startAll(); // Iniciar serviço de cron

app.use("/api/webhooks", express.raw({ type: "application/json" }));

app.use("/api/stores", authenticateToken, storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/motoboys", motoboyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/travels", travelRoutes);
app.use("/api/delivery-price", authenticateToken, deliveryPricesRoutes);
app.use("/api/avaliates", require("./routes/avaliateRoute"));
app.use("/api/files", authenticateToken, require("./routes/fileRoutes"));
app.use("/api/occurrences", authenticateToken, occurrenceRoutes);
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/chat", authenticateToken, require("./routes/chatRoutes"));
app.use(
  "/api/withdrawal",
  authenticateToken,
  require("./routes/withdrawalRoutes")
);
app.use("/api/billing", require("./routes/billingRoutes"));
app.use("/api/webhooks", require("./routes/webhookRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Rotas de monitoramento WebSocket
app.get("/api/socket/stats", (req, res) => {
  res.json(socketManager.getConnectionStats());
});

app.get("/api/socket/user/:firebaseUid/status", (req, res) => {
  const { firebaseUid } = req.params;
  const isOnline = socketManager.isUserOnline(firebaseUid);
  res.json({
    firebaseUid,
    isOnline,
    connectedUsers: Array.from(socketManager.connectedUsers.keys()),
    connectionStats: socketManager.getConnectionStats(),
  });
});

// Rota de teste para notificações WebSocket (sem autenticação para debug)
app.post("/api/socket/test-notification-debug", (req, res) => {
  const { firebaseUid, eventType, data } = req.body;

  if (!firebaseUid || !eventType) {
    return res.status(400).json({
      success: false,
      message: "firebaseUid e eventType são obrigatórios",
    });
  }

  console.log(
    `🧪 [TEST DEBUG] Testando notificação para ${firebaseUid}, evento: ${eventType}`
  );

  const sent = global.sendSocketNotification(
    firebaseUid,
    eventType,
    data || { message: "Teste de notificação" }
  );

  res.json({
    success: sent,
    message: sent
      ? "Notificação enviada com sucesso"
      : "Usuário não está conectado ou erro ao enviar",
    debug: {
      firebaseUid,
      eventType,
      isOnline: global.socketManager.isUserOnline(firebaseUid),
      connectedUsers: Array.from(global.socketManager.connectedUsers.keys()),
      connectionStats: global.socketManager.getConnectionStats(),
    },
  });
});

// Rota para testar notificação WebSocket
app.post("/api/socket/test-notification", authenticateToken, (req, res) => {
  const { firebaseUid, eventType, data } = req.body;

  if (!firebaseUid || !eventType) {
    return res.status(400).json({
      message: "firebaseUid e eventType são obrigatórios",
    });
  }

  const sent = global.sendSocketNotification(
    firebaseUid,
    eventType,
    data || {}
  );

  res.json({
    success: sent,
    message: sent
      ? "Notificação enviada com sucesso"
      : "Usuário não está conectado ou erro ao enviar",
  });
});
// app.use("/api/webhook/ifood", (req, res) => {
//   const WebhookController = require("./controllers/webhookController");
//   const OrderService = require("./services/orderService");
//   const orderService = new OrderService();
//   const webhookController = new WebhookController(orderService);
//   webhookController.handleIfoodWebhook(req, res);
// });

// Middleware de logging
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Limpeza periódica de conexões inativas (a cada 15 minutos)
setInterval(() => {
  socketManager.cleanupInactiveConnections(30); // Remove conexões inativas há mais de 30 segundos
}, 15 * 60 * 1000);

// IMPORTANTE: Usar server.listen em vez de app.listen para Socket.io funcionar
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} com Socket.io`);
  console.log("✅ WebSocket configurado e funcionando");
  console.log("✅ SocketManager inicializado");
});

process.on("unhandledRejection", (err) => {
  console.log(`Erro: ${err.message}`);
});

// Exportar para testes e uso externo
module.exports = { app, server, io, socketManager };
