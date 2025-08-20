// src/hooks/useSocket.js - Hook customizado para usar o socketService
import { useState, useEffect, useCallback } from "react";
import socketService from "../services/socketService";

export const useSocket = (firebaseUid, userType = "store") => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Conectar socket
  const connect = useCallback(async () => {
    if (!firebaseUid) return;

    try {
      setIsConnecting(true);
      setConnectionError(null);

      await socketService.connect(firebaseUid, userType);
      setIsConnected(true);
    } catch (error) {
      setConnectionError(error);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [firebaseUid, userType]);

  // Desconectar socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  // Enviar evento
  const emit = useCallback(
    (event, data) => {
      if (isConnected) {
        return socketService.socket?.emit(event, data);
      }
      console.warn(
        "Socket não conectado, não é possível enviar evento:",
        event
      );
      return false;
    },
    [isConnected]
  );

  // Registrar listener
  const on = useCallback((event, callback) => {
    socketService.on(event, callback);

    // Retornar função de cleanup
    return () => {
      socketService.off(event, callback);
    };
  }, []);

  // Remover listener
  const off = useCallback((event, callback) => {
    socketService.off(event, callback);
  }, []);

  // Status da conexão
  const status = socketService.status;

  // Métodos específicos para loja
  const updateOrderStatus = useCallback(
    (orderId, status, additionalData = {}) => {
      return socketService.updateOrderStatus(orderId, status, additionalData);
    },
    []
  );

  const confirmOrderReady = useCallback((orderId, motoboyId) => {
    return socketService.confirmOrderReady(orderId, motoboyId);
  }, []);

  const cancelOrder = useCallback((orderId, reason = null) => {
    return socketService.cancelOrder(orderId, reason);
  }, []);

  const testConnection = useCallback(() => {
    return socketService.testConnection();
  }, []);

  // Efeito para monitorar mudanças na conexão
  useEffect(() => {
    const handleConnectionSuccess = () => {
      setIsConnected(true);
      setConnectionError(null);
      setIsConnecting(false);
    };

    const handleConnectionFailed = (error) => {
      setIsConnected(false);
      setConnectionError(error);
      setIsConnecting(false);
    };

    const handleConnectionLost = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    // Registrar listeners de status
    socketService.on("connection:success", handleConnectionSuccess);
    socketService.on("connection:failed", handleConnectionFailed);
    socketService.on("connection:lost", handleConnectionLost);

    // Cleanup
    return () => {
      socketService.off("connection:success", handleConnectionSuccess);
      socketService.off("connection:failed", handleConnectionFailed);
      socketService.off("connection:lost", handleConnectionLost);
    };
  }, []);

  // Auto-conectar quando firebaseUid estiver disponível
  useEffect(() => {
    if (firebaseUid && !isConnected && !isConnecting) {
      connect();
    }
  }, [firebaseUid, isConnected, isConnecting, connect]);

  return {
    // Estados
    isConnected,
    isConnecting,
    connectionError,
    status,

    // Métodos de conexão
    connect,
    disconnect,

    // Métodos de eventos
    emit,
    on,
    off,

    // Métodos específicos da loja
    updateOrderStatus,
    confirmOrderReady,
    cancelOrder,
    testConnection,

    // Instância do socket para casos especiais
    socket: socketService.socket,
  };
};

export default useSocket;
