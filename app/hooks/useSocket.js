// app/hooks/useSocket.js - Hook para React Native
import { useEffect, useRef, useState } from "react";
import socketService from "../services/socketService";

export const useSocket = (firebaseUid, userType = "motoboy") => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const listenersRef = useRef([]);

  useEffect(() => {
    if (!firebaseUid) return;

    const connect = async () => {
      try {
        await socketService.connect(firebaseUid, userType);
      } catch (error) {
        setConnectionError(error);
      }
    };

    connect();

    // Listeners de conexão
    const onConnectionSuccess = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const onConnectionLost = (data) => {
      setIsConnected(false);
      setConnectionError(data);
    };

    const onConnectionFailed = () => {
      setIsConnected(false);
      setConnectionError(new Error("Falha na conexão"));
    };

    const onConnectionRestored = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    // Registrar listeners
    socketService.on("connection:success", onConnectionSuccess);
    socketService.on("connection:lost", onConnectionLost);
    socketService.on("connection:failed", onConnectionFailed);
    socketService.on("connection:restored", onConnectionRestored);

    // Armazenar referências para cleanup
    listenersRef.current = [
      { event: "connection:success", callback: onConnectionSuccess },
      { event: "connection:lost", callback: onConnectionLost },
      { event: "connection:failed", callback: onConnectionFailed },
      { event: "connection:restored", callback: onConnectionRestored },
    ];

    return () => {
      // Cleanup listeners
      listenersRef.current.forEach(({ event, callback }) => {
        socketService.off(event, callback);
      });
    };
  }, [firebaseUid, userType]);

  // Função para adicionar listeners customizados
  const addListener = (eventName, callback) => {
    socketService.on(eventName, callback);

    // Adicionar à lista para cleanup
    listenersRef.current.push({ event: eventName, callback });
  };

  // Função para remover listeners
  const removeListener = (eventName, callback) => {
    socketService.off(eventName, callback);

    // Remover da lista
    listenersRef.current = listenersRef.current.filter(
      (listener) =>
        !(listener.event === eventName && listener.callback === callback)
    );
  };

  return {
    isConnected,
    connectionError,
    lastMessage,
    socketService,
    addListener,
    removeListener,

    // Métodos convenientes
    sendLocation: socketService.sendLocation.bind(socketService),
    acceptOrder: socketService.acceptOrder.bind(socketService),
    declineOrder: socketService.declineOrder.bind(socketService),
    updateOrderStatus: socketService.updateOrderStatus.bind(socketService),
    markNotificationRead:
      socketService.markNotificationRead.bind(socketService),
    joinRoom: socketService.joinRoom.bind(socketService),
    leaveRoom: socketService.leaveRoom.bind(socketService),
  };
};

// Hook específico para notificações
export const useSocketNotifications = (firebaseUid, userType = "motoboy") => {
  const [notifications, setNotifications] = useState([]);
  const [orderOffers, setOrderOffers] = useState([]);
  const { isConnected, addListener, removeListener } = useSocket(
    firebaseUid,
    userType
  );

  useEffect(() => {
    if (!isConnected) return;

    const handleNotification = (data) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50)); // Manter últimas 50
    };

    const handleOrderOffer = (data) => {
      setOrderOffers((prev) => [data, ...prev]);
    };

    const handleOrderStatusChange = (data) => {
      // Remover oferta se status mudou
      setOrderOffers((prev) =>
        prev.filter((offer) => offer.order?.id !== data.orderId)
      );
    };

    addListener("notificationReceived", handleNotification);
    addListener("orderOfferReceived", handleOrderOffer);
    addListener("orderStatusChanged", handleOrderStatusChange);

    return () => {
      removeListener("notificationReceived", handleNotification);
      removeListener("orderOfferReceived", handleOrderOffer);
      removeListener("orderStatusChanged", handleOrderStatusChange);
    };
  }, [isConnected, addListener, removeListener]);

  const clearNotifications = () => setNotifications([]);
  const clearOrderOffers = () => setOrderOffers([]);

  const removeOrderOffer = (orderId) => {
    setOrderOffers((prev) =>
      prev.filter((offer) => offer.order?.id !== orderId)
    );
  };

  return {
    notifications,
    orderOffers,
    isConnected,
    clearNotifications,
    clearOrderOffers,
    removeOrderOffer,
  };
};

// Hook para localização em tempo real
export const useSocketLocation = (
  firebaseUid,
  motoboyId,
  enableTracking = true
) => {
  const { isConnected, addListener, removeListener, sendLocation } = useSocket(
    firebaseUid,
    "motoboy"
  );
  const [lastLocationSent, setLastLocationSent] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (!isConnected || !enableTracking) return;

    let locationInterval;

    const startLocationTracking = () => {
      locationInterval = setInterval(async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();

          if (status !== "granted") {
            setLocationError("Permissão de localização negada");
            return;
          }

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 10000, // Cache por 10 segundos
          });

          const sent = sendLocation(location, motoboyId);
          if (sent) {
            setLastLocationSent(new Date());
            setLocationError(null);
          }
        } catch (error) {
          console.error("Erro ao obter localização:", error);
          setLocationError(error.message);
        }
      }, 30000); // A cada 30 segundos
    };

    const handleLocationUpdated = (data) => {
      setLastLocationSent(new Date());
    };

    addListener("locationUpdated", handleLocationUpdated);
    startLocationTracking();

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
      removeListener("locationUpdated", handleLocationUpdated);
    };
  }, [isConnected, enableTracking, motoboyId]);

  return {
    lastLocationSent,
    locationError,
    isConnected,
  };
};
