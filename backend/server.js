const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');

// Configuração das variáveis de ambiente
dotenv.config();

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
});
app.use(limiter);

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido ou expirado' });
  }
};

// Rotas
app.get('/', (req, res) => {
  res.send('API está funcionando');
});

// Importar rotas
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});