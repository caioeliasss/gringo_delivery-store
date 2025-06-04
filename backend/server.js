// backend/server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");
const http = require("http");
const socketIO = require("socket.io");

// Configuração das variáveis de ambiente
dotenv.config();

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

// Middleware
app.use(
  cors({
    origin: "*", // Em produção, especifique domínios permitidos
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());

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
      console.log(`Clientes SSE conectados: ${Array.from(clients.keys())[i]}`);
      console.log(`é igual?: ${Array.from(clients.keys())[i] === storeId}`);
    }
    console.log(`Nenhum cliente SSE encontrado para loja ${storeId}`);
    return false;
  }

  const clientsArray = clients.get(storeId);
  console.log(
    `Encontrados ${clientsArray.length} clientes para loja ${storeId}`
  );

  const event = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
  };

  clientsArray.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
      console.log(`Evento enviado com sucesso para cliente da loja ${storeId}`);
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
});
app.use(limiter);

// Inicializar Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

// Configurar Socket.io handlers
require("./socket/socketHandler")(io);

// Middleware para adicionar io às requisições
app.use((req, res, next) => {
  req.io = io;
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

app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/motoboys", authenticateToken, motoboyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/travels", travelRoutes);
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

// Middleware de logging
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// IMPORTANTE: Usar server.listen em vez de app.listen para Socket.io funcionar
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} com Socket.io`);
});

process.on("unhandledRejection", (err) => {
  console.log(`Erro: ${err.message}`);
});
