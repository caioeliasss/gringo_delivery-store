import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Button,
  Alert,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { getOrderById, getMotoboy } from "../../services/api";

const DeliveryRouteMap = ({
  orderId,
  height = "600px",
  onRouteUpdate,
  showRouteInfo = true,
  showRefreshButton = true,
  autoRefresh = false,
  refreshInterval = 30000, // 30 segundos
  // Props para Google Maps (para evitar conflito de loaders)
  isLoaded,
  loadError,
}) => {
  // Estados
  const [order, setOrder] = useState(null);
  const [motoboy, setMotoboy] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [directionsRequest, setDirectionsRequest] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [error, setError] = useState(null);

  // Função para buscar dados do pedido
  const fetchOrderData = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoadingOrder(true);
      setError(null);

      const orderResponse = await getOrderById(orderId);
      const orderData = orderResponse.data || orderResponse;

      console.log("Order data received:", orderData);
      console.log("Motoboy info:", orderData.motoboy);

      setOrder(orderData);

      // Se há motoboy atribuído, buscar dados atualizados do motoboy
      if (orderData.motoboy) {
        // Tentar diferentes formas de obter o ID do motoboy
        let motoboyId =
          orderData.motoboy.motoboyId ||
          orderData.motoboy._id ||
          orderData.motoboy.id;

        // Se motoboyId for um objeto, extrair o _id
        if (typeof motoboyId === "object" && motoboyId._id) {
          motoboyId = motoboyId._id;
        }

        console.log("Extracted motoboyId:", motoboyId);

        // Verificar se é uma string válida antes de fazer a requisição
        if (typeof motoboyId === "string" && motoboyId.trim() !== "") {
          try {
            const motoboyResponse = await getMotoboy(motoboyId);
            const motoboyData = motoboyResponse.data || motoboyResponse;
            setMotoboy(motoboyData);
          } catch (motoboyError) {
            console.error("Erro ao buscar dados do motoboy:", motoboyError);
            // Se falhou ao buscar, tentar usar os dados do motoboy que vêm com o pedido
            if (orderData.motoboy.coordinates || orderData.motoboy.name) {
              console.log("Fallback: using motoboy data from order");
              setMotoboy(orderData.motoboy);
            } else {
              setMotoboy(null);
            }
          }
        } else {
          console.warn("motoboyId inválido:", motoboyId);
          // Se o motoboy já tem todos os dados necessários, usar diretamente
          if (orderData.motoboy.coordinates || orderData.motoboy.name) {
            console.log("Using motoboy data from order directly");
            setMotoboy(orderData.motoboy);
          } else {
            setMotoboy(null);
          }
        }
      } else {
        setMotoboy(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do pedido:", error);
      setError("Erro ao carregar dados do pedido");
    } finally {
      setLoadingOrder(false);
    }
  }, [orderId]);

  // Função para calcular rota
  const calculateRoute = useCallback((origin, destination) => {
    if (!origin || !destination || !window.google) {
      console.warn("Origem, destino ou Google Maps não disponíveis");
      return;
    }

    setLoadingRoute(true);

    const directionsService = new window.google.maps.DirectionsService();

    const request = {
      origin: new window.google.maps.LatLng(origin.lat, origin.lng),
      destination: new window.google.maps.LatLng(
        destination.lat,
        destination.lng
      ),
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.METRIC,
      optimizeWaypoints: true,
    };

    setDirectionsRequest(request);
  }, []);

  // Callback para o DirectionsService
  const directionsCallback = useCallback(
    (result, status) => {
      setLoadingRoute(false);

      if (status === "OK" && result) {
        setDirectionsResponse(result);

        // Chamar callback se fornecido
        if (onRouteUpdate) {
          const route = result.routes[0];
          const leg = route.legs[0];
          onRouteUpdate({
            distance: leg.distance.text,
            duration: leg.duration.text,
            distanceValue: leg.distance.value,
            durationValue: leg.duration.value,
          });
        }

        console.log("Rota calculada com sucesso");
      } else {
        console.error("Erro ao calcular rota:", status);
        setDirectionsResponse(null);

        if (onRouteUpdate) {
          onRouteUpdate(null);
        }

        // Log de erros específicos
        if (status === "ZERO_RESULTS") {
          console.warn("Nenhuma rota encontrada entre os pontos");
        } else if (status === "OVER_QUERY_LIMIT") {
          console.warn(
            "Limite de consultas excedido para a API do Google Maps"
          );
        } else if (status === "REQUEST_DENIED") {
          console.error("Requisição negada pela API do Google Maps");
        }
      }
    },
    [onRouteUpdate]
  );

  // Função para determinar o destino da rota baseado no status do pedido
  const getRouteDestination = useCallback(() => {
    if (!order || !motoboy) {
      return null;
    }

    // Se o motoboy não chegou na loja, mostrar rota até a loja
    if (!order.motoboy?.hasArrived) {
      const store = order.store;
      const storeCoords = store?.coordinates || store?.address?.coordinates;

      if (storeCoords && storeCoords.length === 2) {
        return {
          lat: parseFloat(storeCoords[1]),
          lng: parseFloat(storeCoords[0]),
          type: "store",
        };
      }
    }

    // Se já chegou na loja mas não chegou no destino, mostrar rota até o cliente
    if (!order.arrivedDestination) {
      // Pegar o primeiro endereço de cliente disponível
      if (order.customer && Array.isArray(order.customer)) {
        for (const customer of order.customer) {
          const customerCoords =
            customer.address?.coordinates ||
            customer.customerAddress?.coordinates;

          if (customerCoords && customerCoords.length === 2) {
            return {
              lat: parseFloat(customerCoords[1]),
              lng: parseFloat(customerCoords[0]),
              type: "customer",
            };
          }
        }
      }

      // Se deliveryAddress existe, usar ele
      if (order.deliveryAddress?.coordinates) {
        const coords = order.deliveryAddress.coordinates;
        return {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0]),
          type: "customer",
        };
      }
    }

    return null;
  }, [order, motoboy]);

  // Função para limpar rota
  const clearRoute = useCallback(() => {
    setDirectionsResponse(null);
    setDirectionsRequest(null);
    setLoadingRoute(false);
  }, []);

  // Função para criar marcadores personalizados
  const createFontAwesomeMarker = useCallback((type, status) => {
    if (!window.google || !window.google.maps) {
      return null;
    }

    const colors = {
      motoboy: {
        available: "#2196F3",
        offline: "#9E9E9E",
      },
      store: {
        approved: "#4CAF50",
        pending: "#F44336",
      },
      customer: {
        approved: "#FF9800",
        pending: "#FF5722",
      },
    };

    let color, emoji;

    if (type === "motoboy") {
      color =
        status === "available"
          ? colors.motoboy.available
          : colors.motoboy.offline;
      emoji = "🏍️";
    } else if (type === "customer") {
      color =
        status === "approved"
          ? colors.customer.approved
          : colors.customer.pending;
      emoji = "👤";
    } else {
      color =
        status === "approved" ? colors.store.approved : colors.store.pending;
      emoji = "🏪";
    }

    try {
      const iconSvg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="3"/>
          <text x="20" y="25" text-anchor="middle" fill="${color}" font-size="16" font-family="Arial, sans-serif" font-weight="900">
            ${emoji}
          </text>
        </svg>
      `;

      const svgDataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        iconSvg
      )}`;

      return {
        url: svgDataUrl,
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
      };
    } catch (error) {
      console.error("Erro ao criar marcador:", error);
      return null;
    }
  }, []);

  // Função para renderizar marcadores
  const renderMarkers = useCallback(() => {
    const markers = [];

    if (!isLoaded || loadError || !order) {
      return markers;
    }

    // Marker do motoboy
    if (
      motoboy?.coordinates &&
      Array.isArray(motoboy.coordinates) &&
      motoboy.coordinates.length === 2
    ) {
      const icon = createFontAwesomeMarker(
        "motoboy",
        motoboy.isAvailable ? "available" : "offline"
      );

      if (icon) {
        markers.push(
          <Marker
            key={`motoboy-${motoboy._id}`}
            position={{
              lat: parseFloat(motoboy.coordinates[1]),
              lng: parseFloat(motoboy.coordinates[0]),
            }}
            icon={icon}
            title={`Motoboy: ${motoboy.name || "Sem nome"}`}
          />
        );
      }
    }

    // Marker da loja
    if (order.store) {
      const store = order.store;
      const storeCoords = store.coordinates || store.address?.coordinates;

      if (
        storeCoords &&
        Array.isArray(storeCoords) &&
        storeCoords.length === 2
      ) {
        const icon = createFontAwesomeMarker(
          "store",
          store.cnpj_approved ? "approved" : "pending"
        );

        if (icon) {
          markers.push(
            <Marker
              key={`store-${store._id}`}
              position={{
                lat: parseFloat(storeCoords[1]),
                lng: parseFloat(storeCoords[0]),
              }}
              icon={icon}
              title={`Loja: ${
                store.businessName || store.displayName || "Sem nome"
              }`}
            />
          );
        }
      }
    }

    // Markers dos clientes
    if (order.customer && Array.isArray(order.customer)) {
      order.customer.forEach((customer, index) => {
        const customerCoords =
          customer.address?.coordinates ||
          customer.customerAddress?.coordinates;

        if (
          customerCoords &&
          Array.isArray(customerCoords) &&
          customerCoords.length === 2
        ) {
          const icon = createFontAwesomeMarker("customer", "approved");

          if (icon) {
            markers.push(
              <Marker
                key={`customer-${customer._id || index}`}
                position={{
                  lat: parseFloat(customerCoords[1]),
                  lng: parseFloat(customerCoords[0]),
                }}
                icon={icon}
                title={`Cliente: ${customer.name || "Sem nome"}`}
              />
            );
          }
        }
      });
    }

    return markers;
  }, [isLoaded, loadError, order, motoboy, createFontAwesomeMarker]);

  // Função para obter o centro do mapa
  const getMapCenter = useCallback(() => {
    if (
      motoboy?.coordinates &&
      Array.isArray(motoboy.coordinates) &&
      motoboy.coordinates.length === 2
    ) {
      return {
        lat: parseFloat(motoboy.coordinates[1]),
        lng: parseFloat(motoboy.coordinates[0]),
      };
    }

    if (order?.store) {
      const storeCoords =
        order.store.coordinates || order.store.address?.coordinates;
      if (
        storeCoords &&
        Array.isArray(storeCoords) &&
        storeCoords.length === 2
      ) {
        return {
          lat: parseFloat(storeCoords[1]),
          lng: parseFloat(storeCoords[0]),
        };
      }
    }

    // Centro padrão (São Paulo)
    return {
      lat: -23.5505,
      lng: -46.6333,
    };
  }, [motoboy, order]);

  // Função para obter status da entrega
  const getDeliveryStatus = useCallback(() => {
    if (!order || !motoboy) {
      return null;
    }

    if (!order.motoboy?.hasArrived) {
      return { label: "Rota até a loja", color: "primary" };
    }

    if (!order.arrivedDestination) {
      return { label: "Rota até o cliente", color: "secondary" };
    }

    return { label: "Entrega concluída", color: "success" };
  }, [order, motoboy]);

  // Effect para buscar dados do pedido
  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  // Effect para auto-refresh
  useEffect(() => {
    if (!autoRefresh || !orderId) return;

    const interval = setInterval(fetchOrderData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, orderId, refreshInterval, fetchOrderData]);

  // Effect para calcular rota
  useEffect(() => {
    clearRoute();

    if (motoboy?.coordinates && isLoaded && window.google && order) {
      const destination = getRouteDestination();

      if (destination) {
        const origin = {
          lat: parseFloat(motoboy.coordinates[1]),
          lng: parseFloat(motoboy.coordinates[0]),
        };

        // Verificar se origem e destino são diferentes
        const distance =
          Math.abs(origin.lat - destination.lat) +
          Math.abs(origin.lng - destination.lng);

        if (distance > 0.0001) {
          calculateRoute(origin, destination);
        }
      }
    }
  }, [
    motoboy?.coordinates,
    order?.motoboy?.hasArrived,
    order?.arrivedDestination,
    isLoaded,
    getRouteDestination,
    calculateRoute,
    clearRoute,
  ]);

  // Função para refresh manual
  const handleRefresh = useCallback(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  // Renderização de erro ou carregamento
  if (loadError) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" icon={<WarningIcon />}>
            Erro ao carregar Google Maps. Verifique sua conexão e recarregue a
            página.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Carregando Google Maps...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert
            severity="error"
            action={
              <Button size="small" onClick={handleRefresh}>
                Tentar Novamente
              </Button>
            }
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!orderId) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            Nenhum pedido selecionado para exibir no mapa.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loadingOrder) {
    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Carregando dados do pedido...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">Pedido não encontrado.</Alert>
        </CardContent>
      </Card>
    );
  }

  const deliveryStatus = getDeliveryStatus();

  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {/* Header com informações da rota */}
        {(showRouteInfo || showRefreshButton) && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Mapa da entrega
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {showRefreshButton && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRefresh}
                    disabled={loadingOrder}
                    startIcon={
                      loadingOrder ? (
                        <CircularProgress size={16} />
                      ) : (
                        <RefreshIcon />
                      )
                    }
                  >
                    Atualizar
                  </Button>
                )}

                {showRouteInfo && deliveryStatus && motoboy && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexDirection: "column",
                      alignItems: "flex-end",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {loadingRoute && <CircularProgress size={16} />}

                      <Chip
                        size="small"
                        label={deliveryStatus.label}
                        color={deliveryStatus.color}
                        variant="outlined"
                      />
                    </Box>

                    {/* Informações da rota */}
                    {directionsResponse &&
                      directionsResponse.routes &&
                      directionsResponse.routes[0] && (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Distância:{" "}
                            {directionsResponse.routes[0].legs[0].distance.text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Tempo:{" "}
                            {directionsResponse.routes[0].legs[0].duration.text}
                          </Typography>
                        </Box>
                      )}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Mapa */}
        <Box sx={{ height, position: "relative" }}>
          <GoogleMap
            mapContainerStyle={{
              width: "100%",
              height: "100%",
            }}
            center={getMapCenter()}
            zoom={13}
            options={{
              zoomControl: true,
              mapTypeControl: true,
              scaleControl: true,
              streetViewControl: true,
              rotateControl: false,
              fullscreenControl: true,
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
              ],
            }}
          >
            {renderMarkers()}

            {/* DirectionsService para calcular rota */}
            {directionsRequest && (
              <DirectionsService
                options={directionsRequest}
                callback={directionsCallback}
              />
            )}

            {/* DirectionsRenderer para exibir rota */}
            {directionsResponse && (
              <DirectionsRenderer
                options={{
                  directions: directionsResponse,
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: "#2196F3",
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  },
                }}
              />
            )}
          </GoogleMap>
        </Box>

        {/* Rodapé com informações adicionais */}
        {!motoboy && order && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            <Alert severity="info">
              Este pedido ainda não tem um motoboy atribuído. A rota será
              exibida quando um motoboy for alocado.
            </Alert>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryRouteMap;
