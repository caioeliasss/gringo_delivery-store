import {
  batchRequest,
  getOrders,
  getProducts,
  getMotoboys,
} from "../services/api";

// Exemplo de uso do sistema de fila

// 1. Requisições normais (automaticamente na fila)
export const loadDashboardData = async () => {
  try {
    // Essas requisições serão automaticamente enfileiradas
    const [orders, products, motoboys] = await Promise.all([
      getOrders(),
      getProducts(),
      getMotoboys(),
    ]);

    return {
      orders: orders.data,
      products: products.data,
      motoboys: motoboys.data,
    };
  } catch (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
    throw error;
  }
};

// 2. Requisições em lote para múltiplos pedidos
export const loadMultipleOrders = async (orderIds) => {
  const requests = orderIds.map((id) => ({
    method: "GET",
    url: `/orders/${id}`,
  }));

  try {
    // Processar em lotes de 5, com delay de 500ms entre lotes
    const results = await batchRequest(requests, 5, 500);

    const successfulOrders = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value.data);

    const failedOrders = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    console.log(`${successfulOrders.length} pedidos carregados com sucesso`);
    console.log(`${failedOrders.length} pedidos falharam`);

    return {
      successful: successfulOrders,
      failed: failedOrders,
    };
  } catch (error) {
    console.error("Erro no carregamento em lote:", error);
    throw error;
  }
};

// 3. Função para sincronizar dados com controle de rate limit
export const syncAllData = async () => {
  console.log("Iniciando sincronização de dados...");

  try {
    // Primeiro, carregar dados básicos
    const basicData = await loadDashboardData();

    // Depois, carregar detalhes de cada pedido em lotes
    const orderIds = basicData.orders.map((order) => order._id);
    const detailedOrders = await loadMultipleOrders(orderIds);

    return {
      ...basicData,
      detailedOrders: detailedOrders.successful,
    };
  } catch (error) {
    console.error("Erro na sincronização:", error);
    throw error;
  }
};

// 4. Hook React para usar o sistema de fila
import { useState, useEffect } from "react";
import { getApiQueueStats } from "../services/api";

export const useApiQueue = () => {
  const [stats, setStats] = useState({
    queueLength: 0,
    activeRequests: 0,
    processing: false,
  });
  const [isOverloaded, setIsOverloaded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = getApiQueueStats();
      setStats(currentStats);
      setIsOverloaded(currentStats.queueLength > 20);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    isOverloaded,
    hasActiveRequests: stats.activeRequests > 0,
    isIdle: stats.queueLength === 0 && stats.activeRequests === 0,
  };
};

// 5. Componente de loading inteligente
import React from "react";

export const SmartLoader = ({ children }) => {
  const { stats, isOverloaded } = useApiQueue();

  if (isOverloaded) {
    return (
      <div className="loading-overload">
        <div className="spinner"></div>
        <p>Processando muitas requisições...</p>
        <p>
          Fila: {stats.queueLength} | Ativas: {stats.activeRequests}
        </p>
      </div>
    );
  }

  if (stats.activeRequests > 0) {
    return (
      <div className="loading-normal">
        <div className="spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return children;
};
