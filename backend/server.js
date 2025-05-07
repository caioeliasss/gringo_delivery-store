// backend/server.js (modificar arquivo existente)

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");

// Configuração das variáveis de ambiente
dotenv.config();

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(
  cors({
    origin: "*", // Em produção, especifique domínios permitidos //FIXME
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());

// Armazenar clientes SSE conectados
const clients = new Map();

// Rota para eventos SSE
app.get("/api/events", (req, res) => {
  // Obter o ID da loja (firebaseUid) do cabeçalho ou query
  const storeId = req.headers["x-store-id"] || req.query.storeId;

  if (!storeId) {
    return res.status(400).json({ message: "ID da loja não fornecido" });
  }

  // Configurar cabeçalhos para SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Enviar evento inicial para confirmar conexão
  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      message: "Conectado ao servidor de eventos",
    })}\n\n`
  );

  // Armazenar a conexão
  if (!clients.has(storeId)) {
    clients.set(storeId, []);
  }
  clients.get(storeId).push(res);

  // Remover cliente quando a conexão for fechada
  req.on("close", () => {
    if (clients.has(storeId)) {
      const clientsArray = clients.get(storeId);
      const index = clientsArray.indexOf(res);
      if (index !== -1) {
        clientsArray.splice(index, 1);

        // Se não há mais clientes para esta loja, remover entrada
        if (clientsArray.length === 0) {
          clients.delete(storeId);
        }
      }
    }
    console.log(`Cliente SSE desconectado: ${storeId}`);
  });

  console.log(`Cliente SSE conectado: ${storeId}`);
});

// Função para enviar evento para uma loja específica
const sendEventToStore = (storeId, eventType, data) => {
  console.log(`Tentando enviar evento ${eventType} para loja ${storeId}`, data);

  if (!clients.has(storeId)) {
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

  // Enviar evento para todos os clientes da loja
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

// Importar rotas
const storeRoutes = require("./routes/storeRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const motoboyRoutes = require("./routes/motoboyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const travelRoutes = require("./routes/travelRoutes");

app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/motoboys", authenticateToken, motoboyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/travels", travelRoutes);
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
