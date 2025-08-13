import axios from "axios";
import { auth } from "../firebase";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

console.log(process.env.REACT_APP_API_URL);

// Sistema de cache TTL para evitar sobrecarregamento
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos padrão
  }

  // Gerar chave única para a requisição
  generateKey(config) {
    const { method = "GET", url, params, data } = config;
    const key = `${method.toUpperCase()}:${url}`;

    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&");
      return `${key}?${sortedParams}`;
    }

    if (
      data &&
      (method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD")
    ) {
      return `${key}:${JSON.stringify(data)}`;
    }

    return key;
  }

  // Verificar se deve usar cache para esta requisição
  shouldCache(config) {
    const method = (config.method || "GET").toUpperCase();

    // Apenas cachear GET requests por padrão
    if (method !== "GET") return false;

    // Não cachear se explicitamente desabilitado
    if (config.noCache === true) return false;

    // Não cachear requisições com parâmetros sensíveis
    const url = config.url || "";
    const sensitiveEndpoints = ["/auth", "/login", "/logout", "/token"];
    if (sensitiveEndpoints.some((endpoint) => url.includes(endpoint)))
      return false;

    return true;
  }

  // Obter TTL específico baseado no endpoint
  getTTL(config) {
    const url = config.url || "";

    // TTLs específicos para diferentes tipos de dados
    const ttlConfig = {
      // Dados que mudam raramente - TTL longo
      "/stores/me": 10 * 60 * 1000, // 10 minutos
      "/products": 5 * 60 * 1000, // 5 minutos
      "/motoboys": 2 * 60 * 1000, // 2 minutos
      "/stores": 5 * 60 * 1000, // 5 minutos
      "/delivery-price": 15 * 60 * 1000, // 15 minutos

      // Dados que mudam com frequência - TTL curto
      "/orders": 30 * 1000, // 30 segundos
      "/notifications": 30 * 1000, // 30 segundos
      "/travels": 1 * 60 * 1000, // 1 minuto

      // Dados em tempo real - TTL muito curto
      "/motoboys/find": 10 * 1000, // 10 segundos
      "update-location": 5 * 1000, // 5 segundos
    };

    // Verificar se há configuração específica
    for (const [endpoint, ttl] of Object.entries(ttlConfig)) {
      if (url.includes(endpoint)) {
        return ttl;
      }
    }

    // Usar TTL customizado se especificado
    if (config.cacheTTL) return config.cacheTTL;

    return this.defaultTTL;
  }

  // Obter do cache
  get(key) {
    const item = this.cache.get(key);

    if (!item) return null;

    // Verificar se expirou
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Clonar para evitar mutação
    return {
      data: JSON.parse(JSON.stringify(item.data)),
      status: item.status,
      statusText: item.statusText,
      headers: { ...item.headers },
      config: { ...item.config },
      fromCache: true,
      cachedAt: item.cachedAt,
    };
  }

  // Armazenar no cache
  set(key, response, ttl) {
    const item = {
      data: JSON.parse(JSON.stringify(response.data)),
      status: response.status,
      statusText: response.statusText,
      headers: { ...response.headers },
      config: { ...response.config },
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, item);

    // Log em desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.log(`🗄️ Cache SET: ${key} (TTL: ${ttl}ms)`);
    }
  }

  // Invalidar cache para uma chave específica
  invalidate(keyPattern) {
    let invalidatedCount = 0;

    for (const [key] of this.cache) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    if (process.env.NODE_ENV === "development" && invalidatedCount > 0) {
      console.log(
        `🗑️ Cache invalidated: ${invalidatedCount} entries for pattern "${keyPattern}"`
      );
    }

    return invalidatedCount;
  }

  // Limpar cache expirado
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (process.env.NODE_ENV === "development" && cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: ${cleanedCount} expired entries removed`);
    }

    return cleanedCount;
  }

  // Limpar todo o cache
  clear() {
    const size = this.cache.size;
    this.cache.clear();

    if (process.env.NODE_ENV === "development") {
      console.log(`🗑️ Cache cleared: ${size} entries removed`);
    }

    return size;
  }

  // Obter estatísticas do cache
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [, item] of this.cache) {
      if (now > item.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      memory: this.getMemoryUsage(),
    };
  }

  // Estimar uso de memória (aproximado)
  getMemoryUsage() {
    let bytes = 0;

    for (const [key, item] of this.cache) {
      bytes += key.length * 2; // String chars = 2 bytes
      bytes += JSON.stringify(item).length * 2;
    }

    return {
      bytes,
      kb: Math.round(bytes / 1024),
      mb: Math.round((bytes / 1024 / 1024) * 100) / 100,
    };
  }
}

// Sistema de fila para controle de rate limiting
class ApiQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 3; // Máximo de requisições simultâneas
    this.minDelay = 100; // Delay mínimo entre requisições (ms)
    this.retryAttempts = 3; // Máximo de tentativas
    this.activeRequests = 0;
  }

  async add(requestConfig) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        config: requestConfig,
        resolve,
        reject,
        attempts: 0,
        timestamp: Date.now(),
      });

      this.processQueue();
    });
  }

  async processQueue() {
    if (
      this.processing ||
      this.queue.length === 0 ||
      this.activeRequests >= this.maxConcurrent
    ) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const item = this.queue.shift();
      this.executeRequest(item);
    }

    this.processing = false;
  }

  async executeRequest(item) {
    this.activeRequests++;

    try {
      // Aguardar delay mínimo entre requisições
      const timeSinceLastRequest = Date.now() - item.timestamp;
      if (timeSinceLastRequest < this.minDelay) {
        await this.delay(this.minDelay - timeSinceLastRequest);
      }

      const response = await axios(item.config);
      item.resolve(response);
    } catch (error) {
      if (
        error.response?.status === 429 &&
        item.attempts < this.retryAttempts
      ) {
        // Rate limit atingido, tentar novamente com backoff exponencial
        item.attempts++;
        const retryDelay = Math.pow(2, item.attempts) * 1000; // 2s, 4s, 8s

        console.warn(
          `Rate limit atingido. Tentativa ${item.attempts}/${this.retryAttempts} em ${retryDelay}ms`
        );

        setTimeout(() => {
          item.timestamp = Date.now();
          this.queue.unshift(item); // Adicionar no início da fila
          this.processQueue();
        }, retryDelay);
      } else {
        item.reject(error);
      }
    } finally {
      this.activeRequests--;

      // Processar próximos itens da fila após delay
      setTimeout(() => {
        this.processQueue();
      }, this.minDelay);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Limpar fila em caso de emergência
  clear() {
    this.queue.forEach((item) => {
      item.reject(new Error("Fila limpa"));
    });
    this.queue = [];
  }

  // Obter estatísticas da fila
  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing,
    };
  }
}

const apiQueue = new ApiQueue();
const apiCache = new ApiCache();

// Limpar cache expirado periodicamente
setInterval(() => {
  apiCache.cleanup();
}, 5 * 60 * 1000); // A cada 5 minutos

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token de autenticação e verificar cache
api.interceptors.request.use(
  async (config) => {
    // Verificar cache antes de fazer a requisição
    if (apiCache.shouldCache(config)) {
      const cacheKey = apiCache.generateKey(config);
      const cachedResponse = apiCache.get(cacheKey);

      if (cachedResponse) {
        if (process.env.NODE_ENV === "development") {
          console.log(`🗄️ Cache HIT: ${config.url}`);
        }

        // Para cache hit, precisamos cancelar a requisição e retornar o valor do cache
        const cancelError = new Error("Cache hit");
        cancelError.config = config;
        cancelError.cachedResponse = cachedResponse;
        cancelError.isCache = true;
        throw cancelError;
      }

      // Marcar para cache na resposta
      config._shouldCache = true;
      config._cacheKey = cacheKey;
      config._cacheTTL = apiCache.getTTL(config);
    }

    // Adicionar token de autenticação
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        if (process.env.NODE_ENV !== "production") {
          console.log("Token de autenticação:", token);
        }
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      } catch (tokenError) {
        console.error("Erro ao obter token:", tokenError);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta para lidar com rate limiting e cache
api.interceptors.response.use(
  (response) => {
    // Armazenar no cache se necessário
    if (response.config._shouldCache && response.config._cacheKey) {
      apiCache.set(
        response.config._cacheKey,
        response,
        response.config._cacheTTL
      );

      if (process.env.NODE_ENV === "development") {
        console.log(`🗄️ Cache MISS -> SET: ${response.config.url}`);
      }
    }

    return response;
  },
  async (error) => {
    // Verificar se é um cache hit
    if (error.isCache && error.cachedResponse) {
      return Promise.resolve(error.cachedResponse);
    }

    const config = error.config;

    // Se é erro 429 e não foi marcado como retry
    if (error.response?.status === 429 && !config._isRetry) {
      config._isRetry = true;

      // Extrair tempo de retry do header se disponível
      const retryAfter = error.response.headers["retry-after"];
      const delayTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;

      console.warn(
        `Rate limit detectado. Aguardando ${delayTime}ms antes de tentar novamente...`
      );

      // Aguardar antes de tentar novamente
      await new Promise((resolve) => setTimeout(resolve, delayTime));

      // Adicionar à fila para retry
      return apiQueue.add(config);
    }

    return Promise.reject(error);
  }
);

// Sobrescrever métodos do axios para usar a fila
const originalRequest = api.request;
api.request = function (config) {
  // Para requisições críticas que precisam da fila
  if (config.useQueue !== false) {
    return apiQueue.add(config);
  }
  // Para requisições que não precisam da fila (ex: health checks)
  return originalRequest.call(this, config);
};

// Serviços do Usuário
export const createUserProfile = async (userData) => {
  return api.post("/stores/profile", userData);
};

export const getUserProfile = async () => {
  return api.get("/stores/me");
};

export const updateUserProfile = async (profileData) => {
  return api.post("/stores/profile", profileData);
};

// Serviços de Produtos
export const getProducts = async () => {
  return api.get("/products");
};

export const getProductById = async (id) => {
  return api.get(`/products/${id}`);
};

export const createProduct = async (productData) => {
  return api.post("/products/create", productData);
};

export const updateProduct = async (id, productData) => {
  return api.put(`/products/${id}`, productData);
};

export const deleteProduct = async (id) => {
  return api.delete(`/products/${id}`);
};

// Serviços de Pedidos
export const getOrders = async () => {
  return api.get("/orders");
};

export const getOrderById = async (id) => {
  return api.get(`/orders/${id}`);
};

export const createOrder = async (orderData) => {
  return api.post("/orders", orderData);
};

export const updateOrderStatus = async (id, status) => {
  return api.put(`/orders/status`, { id, status });
};

// Serviços de Motoboy
export const getMotoboys = async () => {
  return api.get("/motoboys");
};
export const getMotoboy = async (id) => {
  return api.get(`/motoboys/id/${id}`);
};

export const getMotoboyByFirebaseUid = async (firebaseUid) => {
  return api.get(`/motoboys/firebase/${firebaseUid}`);
};

export const getTravelsMotoboy = async (motoboyId) => {
  return api.get(`/travels/${motoboyId}`);
};

export const findMotoboys = async (orderId) => {
  return api.get("/motoboys/find", {
    params: {
      order_id: orderId,
    },
  });
};

export const orderReady = async (motoboyId, orderId) => {
  return api.post("/notifications/order-ready", {
    motoboyId: motoboyId,
    orderId: orderId,
  });
};

export const updateMotoboyLocation = async (locationData) => {
  return api.put("/motoboys/update-location", locationData);
};

// Função utilitária para converter endereço em coordenadas usando a API do Google Maps
export const geocodeAddress = async (address) => {
  try {
    // Nota: Em produção, você usaria seu próprio serviço proxy para proteger sua API key
    // Aqui estamos usando uma abordagem simplificada para fins de demonstração
    const apiKey = process.env.EXPO_PUBLIC_MAPS_API_KEY;
    const encodedAddress = encodeURIComponent(address);
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );

    if (response.data.status === "OK" && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    throw new Error("Não foi possível geocodificar o endereço");
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    throw error;
  }
};

// Serviços de Estabelecimentos
export const getStores = async () => {
  return api.get("/stores");
};

export const getStore = async (id) => {
  return api.get(`/stores/id/${id}`);
};

export const getStoreOrders = async (storeId) => {
  return api.get(`/orders/store/${storeId}`);
};

export const approveStore = async (storeId) => {
  return api.post(`/stores/approve/${storeId}`);
};

export const reproveStore = async (storeId) => {
  return api.post(`/stores/reprove/${storeId}`);
};

export const updateStoreStatus = async (storeId, status) => {
  return api.put(`/stores/${storeId}/status`, { status });
};

export const updateStoreBilling = async (storeId, billingOptions) => {
  return api.post(`/stores/billingOptions`, { storeId, billingOptions });
};

export const updateStoreName = async (storeId, businessName) => {
  return api.put(`/stores/name`, { storeId, businessName });
};

export const acceptTerms = async () => {
  return api.post(`/stores/accept-terms`);
};

export const acceptTermsOfService = async () => {
  return api.post(`/stores/accept-terms`);
};

// Serviços de Precificação de Entrega
export const getDeliveryPrice = async () => {
  return api.get("/delivery-price");
};

export const updateDeliveryPrice = async (priceData) => {
  return api.put("/delivery-price", priceData);
};

export const createDeliveryPrice = async (priceData) => {
  return api.post("/delivery-price", priceData);
};

// Funções utilitárias para controle da fila
export const getApiQueueStats = () => {
  return apiQueue.getStats();
};

export const clearApiQueue = () => {
  apiQueue.clear();
};

// Configurar limites da fila (opcional)
export const configureApiQueue = (options = {}) => {
  if (options.maxConcurrent) apiQueue.maxConcurrent = options.maxConcurrent;
  if (options.minDelay) apiQueue.minDelay = options.minDelay;
  if (options.retryAttempts) apiQueue.retryAttempts = options.retryAttempts;
};

// Funções utilitárias para controle do cache
export const getCacheStats = () => {
  return apiCache.getStats();
};

export const clearCache = () => {
  return apiCache.clear();
};

export const invalidateCache = (pattern) => {
  return apiCache.invalidate(pattern);
};

export const cleanupCache = () => {
  return apiCache.cleanup();
};

// Configurar cache (opcional)
export const configureCacheDefaults = (ttlMs) => {
  apiCache.defaultTTL = ttlMs;
};

// Função para requisições sem cache
export const noCacheRequest = (config) => {
  return api.request({ ...config, noCache: true, useQueue: false });
};

export const getStoreNotifications = async (firebaseUid) => {
  return api.get(`/notifications/firebase`, {
    params: { firebaseUid },
  });
};

// Função para requisições com cache customizado
export const cachedRequest = (config, ttlMs) => {
  return api.request({ ...config, cacheTTL: ttlMs });
};

// Função para invalidar cache de um endpoint específico
export const invalidateCacheForEndpoint = (endpoint) => {
  return apiCache.invalidate(endpoint);
};

// Função para pré-carregar cache (prefetch)
export const prefetchData = async (endpoints = []) => {
  const prefetchPromises = endpoints.map(async (endpoint) => {
    try {
      await api.get(endpoint.url, {
        ...endpoint.config,
        cacheTTL: endpoint.ttl || apiCache.defaultTTL,
      });
      console.log(`✅ Prefetch success: ${endpoint.url}`);
    } catch (error) {
      console.warn(`⚠️ Prefetch failed: ${endpoint.url}`, error.message);
    }
  });

  return Promise.allSettled(prefetchPromises);
};

// Função para requisições prioritárias (bypass da fila)
export const priorityRequest = (config) => {
  return api.request({ ...config, useQueue: false });
};

// Função para requisições em lote com controle de rate limit
export const batchRequest = async (
  requests,
  batchSize = 5,
  delayBetweenBatches = 1000
) => {
  const results = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchPromises = batch.map((request) => api.request(request));

    try {
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Delay entre lotes para evitar rate limiting
      if (i + batchSize < requests.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches)
        );
      }
    } catch (error) {
      console.error("Erro no lote:", error);
      results.push({ status: "rejected", reason: error });
    }
  }

  return results;
};

export default api;
