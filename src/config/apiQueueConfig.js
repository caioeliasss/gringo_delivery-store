// Configurações da fila de API para diferentes ambientes

export const API_QUEUE_CONFIGS = {
  development: {
    maxConcurrent: 2, // Menos requisições simultâneas em dev
    minDelay: 200, // Delay maior para não sobrecarregar
    retryAttempts: 2, // Menos tentativas
    enableLogging: true, // Logs detalhados
  },

  production: {
    maxConcurrent: 5, // Mais requisições em produção
    minDelay: 100, // Delay menor
    retryAttempts: 3, // Mais tentativas
    enableLogging: false, // Logs mínimos
  },

  testing: {
    maxConcurrent: 1, // Uma por vez nos testes
    minDelay: 0, // Sem delay
    retryAttempts: 1, // Uma tentativa apenas
    enableLogging: false, // Sem logs
  },
};

// Função para aplicar configuração baseada no ambiente
export const configureForEnvironment = (apiQueue, configureApiQueue) => {
  const env = process.env.NODE_ENV || "development";
  const config = API_QUEUE_CONFIGS[env] || API_QUEUE_CONFIGS.development;

  configureApiQueue(config);

  if (config.enableLogging) {
    console.log(`Fila de API configurada para ambiente: ${env}`, config);
  }

  return config;
};

// Configurações específicas para diferentes tipos de requisição
export const REQUEST_PRIORITIES = {
  // Requisições críticas (bypass da fila)
  CRITICAL: {
    useQueue: false,
    timeout: 5000,
  },

  // Requisições de alta prioridade
  HIGH: {
    useQueue: true,
    priority: 1,
    timeout: 10000,
  },

  // Requisições normais
  NORMAL: {
    useQueue: true,
    priority: 2,
    timeout: 15000,
  },

  // Requisições de baixa prioridade (relatórios, etc)
  LOW: {
    useQueue: true,
    priority: 3,
    timeout: 30000,
  },
};

// Rate limits conhecidos de diferentes APIs
export const RATE_LIMITS = {
  ifood: {
    requestsPerMinute: 60,
    burstLimit: 10,
  },

  googleMaps: {
    requestsPerMinute: 100,
    burstLimit: 20,
  },

  firebase: {
    requestsPerMinute: 1000,
    burstLimit: 100,
  },
};

// Função para calcular delay baseado no rate limit
export const calculateOptimalDelay = (apiProvider, requestCount) => {
  const limits = RATE_LIMITS[apiProvider];
  if (!limits) return 100; // Default delay

  const delayPerRequest = (60 * 1000) / limits.requestsPerMinute; // ms por requisição
  return Math.max(delayPerRequest, 50); // Mínimo 50ms
};

// Middleware para diferentes tipos de requisição
export const createRequestMiddleware = (type = "NORMAL") => {
  const config = REQUEST_PRIORITIES[type] || REQUEST_PRIORITIES.NORMAL;

  return (requestConfig) => ({
    ...requestConfig,
    ...config,
    metadata: {
      type,
      timestamp: Date.now(),
      priority: config.priority,
    },
  });
};

// Estratégias de retry para diferentes tipos de erro
export const RETRY_STRATEGIES = {
  429: {
    // Rate limit
    maxAttempts: 5,
    baseDelay: 1000,
    backoffMultiplier: 2,
    jitter: true,
  },

  502: {
    // Bad Gateway
    maxAttempts: 3,
    baseDelay: 500,
    backoffMultiplier: 1.5,
    jitter: false,
  },

  503: {
    // Service Unavailable
    maxAttempts: 4,
    baseDelay: 2000,
    backoffMultiplier: 2,
    jitter: true,
  },

  504: {
    // Gateway Timeout
    maxAttempts: 2,
    baseDelay: 3000,
    backoffMultiplier: 1,
    jitter: false,
  },
};

export default {
  API_QUEUE_CONFIGS,
  configureForEnvironment,
  REQUEST_PRIORITIES,
  RATE_LIMITS,
  calculateOptimalDelay,
  createRequestMiddleware,
  RETRY_STRATEGIES,
};
