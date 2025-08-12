// hooks/useApiWithCache.js
import { useState, useEffect, useCallback } from "react";
import api, {
  cachedRequest,
  noCacheRequest,
  invalidateCacheForEndpoint,
  prefetchData,
} from "../services/api";

/**
 * Hook personalizado para usar APIs com cache inteligente
 * @param {string} endpoint - Endpoint da API
 * @param {Object} options - Opções de configuração
 * @returns {Object} - { data, loading, error, refetch, invalidateCache }
 */
export const useApiWithCache = (endpoint, options = {}) => {
  const {
    autoFetch = true,
    cacheTTL,
    dependencies = [],
    onSuccess,
    onError,
    forceNoCache = false,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (opts = {}) => {
      if (!endpoint) return;

      setLoading(true);
      setError(null);

      try {
        let response;

        if (forceNoCache || opts.noCache) {
          response = await noCacheRequest({
            url: endpoint,
            method: "GET",
            ...opts,
          });
        } else if (cacheTTL) {
          response = await cachedRequest(
            {
              url: endpoint,
              method: "GET",
              ...opts,
            },
            cacheTTL
          );
        } else {
          response = await api.get(endpoint, opts);
        }

        setData(response.data);

        if (onSuccess) {
          onSuccess(response.data, response);
        }

        return response.data;
      } catch (err) {
        setError(err);

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, cacheTTL, forceNoCache, onSuccess, onError]
  );

  const refetch = useCallback(
    (opts = {}) => {
      return fetchData({ ...opts, noCache: true });
    },
    [fetchData]
  );

  const invalidateCache = useCallback(() => {
    return invalidateCacheForEndpoint(endpoint);
  }, [endpoint]);

  useEffect(() => {
    if (autoFetch && endpoint) {
      fetchData();
    }
  }, [autoFetch, endpoint, fetchData, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidateCache,
    fetchData,
  };
};

/**
 * Hook para pré-carregar dados em background
 * @param {Array} endpoints - Lista de endpoints para pré-carregar
 */
export const usePrefetch = () => {
  const [prefetchStatus, setPrefetchStatus] = useState({});

  const prefetch = useCallback(async (endpoints) => {
    setPrefetchStatus((prev) => {
      const newStatus = { ...prev };
      endpoints.forEach((endpoint) => {
        newStatus[endpoint.url] = "loading";
      });
      return newStatus;
    });

    try {
      const results = await prefetchData(endpoints);

      setPrefetchStatus((prev) => {
        const newStatus = { ...prev };
        results.forEach((result, index) => {
          const endpoint = endpoints[index];
          newStatus[endpoint.url] =
            result.status === "fulfilled" ? "success" : "error";
        });
        return newStatus;
      });

      return results;
    } catch (error) {
      console.error("Erro durante prefetch:", error);
      return null;
    }
  }, []);

  return {
    prefetch,
    prefetchStatus,
  };
};

/**
 * Hook para gerenciar cache de forma inteligente baseado em contexto
 * @param {string} context - Contexto da aplicação (ex: 'dashboard', 'orders', etc.)
 */
export const useCacheManager = (context) => {
  // Configurações de TTL baseadas no contexto
  const contextTTL = {
    dashboard: {
      profile: 10 * 60 * 1000, // 10 minutos
      stats: 2 * 60 * 1000, // 2 minutos
      notifications: 30 * 1000, // 30 segundos
    },
    orders: {
      list: 30 * 1000, // 30 segundos
      details: 1 * 60 * 1000, // 1 minuto
      status: 10 * 1000, // 10 segundos
    },
    products: {
      list: 5 * 60 * 1000, // 5 minutos
      details: 3 * 60 * 1000, // 3 minutos
    },
    motoboys: {
      list: 2 * 60 * 1000, // 2 minutos
      location: 5 * 1000, // 5 segundos
    },
  };

  const getTTL = useCallback(
    (dataType) => {
      return contextTTL[context]?.[dataType] || 5 * 60 * 1000; // 5 minutos default
    },
    [context]
  );

  const invalidateContext = useCallback(() => {
    return invalidateCacheForEndpoint(context);
  }, [context]);

  return {
    getTTL,
    invalidateContext,
    contextTTL: contextTTL[context] || {},
  };
};

export default useApiWithCache;
