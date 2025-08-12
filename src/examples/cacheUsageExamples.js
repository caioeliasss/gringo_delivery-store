// Exemplo de uso do sistema de cache TTL

// 1. Uso básico - cache automático
import api from "../services/api";

// Esta requisição será automaticamente cacheada por 5 minutos (TTL padrão para /products)
const products = await api.get("/products");

// Esta requisição usará cache se disponível, senão fará nova requisição
const sameProducts = await api.get("/products");

// 2. Configuração personalizada de cache
import { cachedRequest } from "../services/api";

// Cache personalizado por 30 segundos
const orders = await cachedRequest(
  {
    url: "/orders",
    method: "GET",
  },
  30 * 1000
);

// 3. Requisição sem cache (sempre fresh)
import { noCacheRequest } from "../services/api";

const currentLocation = await noCacheRequest({
  url: "/motoboys/location",
  method: "GET",
});

// 4. Invalidar cache específico
import { invalidateCache } from "../services/api";

// Quando um produto é atualizado, invalidar cache de produtos
await api.put("/products/123", productData);
invalidateCache("products"); // Invalida todas as requisições que contenham 'products'

// 5. Uso com hooks personalizados
import { useApiWithCache, useCacheManager } from "../hooks/useApiWithCache";

function OrdersPage() {
  const { getTTL, invalidateContext } = useCacheManager("orders");

  // Cache com TTL específico do contexto
  const {
    data: orders,
    loading,
    refetch,
  } = useApiWithCache("/orders", {
    cacheTTL: getTTL("list"), // 30 segundos para lista de pedidos
    onSuccess: (data) => {
      console.log(`Carregados ${data.length} pedidos`);
    },
  });

  // Quando status de pedido muda, invalidar cache de pedidos
  const updateOrderStatus = async (orderId, status) => {
    await api.put("/orders/status", { id: orderId, status });
    invalidateContext(); // Invalida todo cache relacionado a pedidos
    refetch(); // Recarrega dados
  };

  return <div>{loading ? "Carregando..." : `${orders.length} pedidos`}</div>;
}

// 6. Pré-carregamento de dados
import { usePrefetch } from "../hooks/useApiWithCache";

function App() {
  const { prefetch } = usePrefetch();

  useEffect(() => {
    // Pré-carregar dados essenciais no início da aplicação
    prefetch([
      { url: "/stores/me", ttl: 10 * 60 * 1000 }, // Perfil por 10 min
      { url: "/notifications", ttl: 30 * 1000 }, // Notificações por 30s
      { url: "/delivery-price", ttl: 15 * 60 * 1000 }, // Preços por 15 min
    ]);
  }, []);

  return <div>App Content</div>;
}

// 7. Monitoramento em desenvolvimento
import CacheMonitor from "../components/CacheMonitor";

function DevTools() {
  return (
    <div>{process.env.NODE_ENV === "development" && <CacheMonitor />}</div>
  );
}

// 8. Configurações avançadas de cache por endpoint
const cacheConfig = {
  // Dados estáticos - cache longo
  "/stores/me": 10 * 60 * 1000, // 10 minutos
  "/products": 5 * 60 * 1000, // 5 minutos
  "/delivery-price": 15 * 60 * 1000, // 15 minutos

  // Dados dinâmicos - cache curto
  "/orders": 30 * 1000, // 30 segundos
  "/notifications": 30 * 1000, // 30 segundos
  "/travels": 1 * 60 * 1000, // 1 minuto

  // Dados em tempo real - cache muito curto
  "/motoboys/find": 10 * 1000, // 10 segundos
  "/motoboys/location": 5 * 1000, // 5 segundos
};

// 9. Estratégias de invalidação
const invalidationStrategies = {
  // Quando produto é criado/atualizado/deletado
  onProductChange: () => {
    invalidateCache("products");
  },

  // Quando pedido muda de status
  onOrderStatusChange: () => {
    invalidateCache("orders");
    invalidateCache("travels");
  },

  // Quando motoboy aceita/recusa pedido
  onMotoboyAction: () => {
    invalidateCache("motoboys");
    invalidateCache("orders");
  },

  // Quando notificação é lida
  onNotificationRead: () => {
    invalidateCache("notifications");
  },
};

// 10. Limpeza automática e otimização
import { getCacheStats, cleanupCache } from "../services/api";

// Verificar e limpar cache periodicamente
setInterval(() => {
  const stats = getCacheStats();

  // Se cache usar muita memória, limpar
  if (stats.memory.mb > 20) {
    console.log("Cache usando muita memória, executando limpeza...");
    cleanupCache();
  }

  // Se muitas entradas expiraram, limpar
  if (stats.expired > stats.active * 0.5) {
    console.log("Muitas entradas expiradas, executando limpeza...");
    cleanupCache();
  }
}, 5 * 60 * 1000); // A cada 5 minutos
