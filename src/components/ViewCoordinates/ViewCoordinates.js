import React, { useState, useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { useAuth } from "../../contexts/AuthContext";
import { getUserProfile } from "../../services/api";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

const ViewCoordinates = () => {
  const { currentUser } = useAuth();

  // Hook para carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "maps"],
  });

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [coordinates, setCoordinates] = useState([]);
  const [searchAddress, setSearchAddress] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  // Refs para o mapa
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);

  // Centro padrão do mapa (São Paulo)
  const [mapCenter, setMapCenter] = useState({
    lat: -23.5505,
    lng: -46.6333,
  });

  // Carregar dados do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await getUserProfile();
        const userData = response.data;
        setUserProfile(userData);

        // Se a loja já tem coordenadas, usar elas
        if (userData.coordinates && userData.coordinates.length === 2) {
          setCoordinates(userData.coordinates);
          setMapCenter({
            lat: userData.coordinates[1],
            lng: userData.coordinates[0],
          });
        } else if (userData.geolocation?.coordinates) {
          // Usar geolocation como fallback
          setCoordinates(userData.geolocation.coordinates);
          setMapCenter({
            lat: userData.geolocation.coordinates[1],
            lng: userData.geolocation.coordinates[0],
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        setMessage({
          type: "error",
          text: "Erro ao carregar dados do usuário",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Configurar o mapa quando carregado e accordion expandido
  useEffect(() => {
    if (isLoaded && mapRef.current && !map && expanded) {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: mapCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      setMap(googleMap);
    }
  }, [isLoaded, mapCenter, map, expanded]);

  // Configurar marcador quando coordenadas mudarem
  useEffect(() => {
    if (map && coordinates.length === 2) {
      // Remover marcador anterior
      if (marker) {
        marker.setMap(null);
      }

      // Criar novo marcador
      const newMarker = new window.google.maps.Marker({
        position: { lat: coordinates[1], lng: coordinates[0] },
        map: map,
        title: "Local de Retirada",
        draggable: true,
      });

      // Listener para arrastar o marcador
      newMarker.addListener("dragend", (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setCoordinates([lng, lat]);
        reverseGeocode(lat, lng);
      });

      setMarker(newMarker);
    }
  }, [map, coordinates]);

  // Configurar clique no mapa
  useEffect(() => {
    if (map) {
      const clickListener = map.addListener("click", (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setCoordinates([lng, lat]);
        reverseGeocode(lat, lng);
      });

      return () => {
        window.google.maps.event.removeListener(clickListener);
      };
    }
  }, [map, marker]);

  // Função de geocodificação reversa
  const reverseGeocode = async (lat, lng) => {
    if (!window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    try {
      const results = await geocoder.geocode({
        location: { lat, lng },
      });

      if (results.results && results.results.length > 0) {
        const address = results.results[0].formatted_address;
        setSearchAddress(address);
      }
    } catch (error) {
      console.error("Erro na geocodificação reversa:", error);
    }
  };

  // Função para buscar endereço
  const handleSearchAddress = async () => {
    if (!searchAddress.trim() || !window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    try {
      const results = await geocoder.geocode({
        address: searchAddress,
      });

      if (results.results && results.results.length > 0) {
        const location = results.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        setCoordinates([lng, lat]);
        setMapCenter({ lat, lng });

        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(15);
        }
      } else {
        setMessage({
          type: "error",
          text: "Endereço não encontrado. Tente novamente.",
        });
      }
    } catch (error) {
      console.error("Erro na busca de endereço:", error);
      setMessage({
        type: "error",
        text: "Erro ao buscar endereço. Tente novamente.",
      });
    }
  };

  // Função para obter localização atual
  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      // Opções para melhor precisão
      const options = {
        enableHighAccuracy: true, // Solicita maior precisão (GPS)
        timeout: 15000, // Timeout de 15 segundos
        maximumAge: 0, // Não usar cache, sempre buscar nova localização
      };

      setMessage({
        type: "info",
        text: "Obtendo sua localização... Isso pode levar alguns segundos.",
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          console.log("Localização obtida:", { lat, lng, accuracy });

          // Verificar se a precisão é aceitável
          if (accuracy > 5000) {
            setMessage({
              type: "error",
              text: `Localização muito imprecisa (${Math.round(
                accuracy / 1000
              )}km de erro). Use a busca por endereço ou clique no mapa para definir manualmente.`,
            });
            return; // Não usar essa localização
          } else if (accuracy > 1000) {
            setMessage({
              type: "warning",
              text: `Localização com precisão moderada (${Math.round(
                accuracy
              )}m). Verifique se o marcador está correto.`,
            });
          } else if (accuracy > 100) {
            setMessage({
              type: "info",
              text: `Localização obtida com boa precisão (${Math.round(
                accuracy
              )}m).`,
            });
          } else {
            setMessage({
              type: "success",
              text: `Localização obtida com alta precisão (${Math.round(
                accuracy
              )}m).`,
            });
          }

          setCoordinates([lng, lat]);
          setMapCenter({ lat, lng });

          if (map) {
            map.setCenter({ lat, lng });
            map.setZoom(18); // Zoom alto para ver detalhes
          }

          reverseGeocode(lat, lng);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          let errorMessage = "Erro ao obter sua localização atual.";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Permissão negada para acessar sua localização. Verifique as configurações do navegador e permita o acesso à localização.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage =
                "Localização não disponível. Verifique se o GPS está ativado ou use a busca por endereço.";
              break;
            case error.TIMEOUT:
              errorMessage =
                "Timeout ao obter localização. Tente novamente ou use a busca por endereço.";
              break;
          }

          setMessage({
            type: "error",
            text: errorMessage,
          });
        },
        options
      );
    } else {
      setMessage({
        type: "error",
        text: "Geolocalização não é suportada pelo seu navegador. Use a busca por endereço.",
      });
    }
  };

  // Função para salvar coordenadas
  const handleSaveCoordinates = async () => {
    if (coordinates.length !== 2) {
      setMessage({
        type: "error",
        text: "Por favor, selecione um local no mapa primeiro.",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/stores/coordinates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await currentUser.getIdToken()}`,
        },
        body: JSON.stringify({
          storeId: userProfile._id,
          coordinates: coordinates,
        }),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Coordenadas salvas com sucesso!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar coordenadas");
      }
    } catch (error) {
      console.error("Erro ao salvar coordenadas:", error);
      setMessage({
        type: "error",
        text: error.message || "Erro ao salvar coordenadas. Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Função para lidar com a expansão do accordion
  const handleAccordionChange = (event, isExpanded) => {
    setExpanded(isExpanded);
  };

  // Limpar mensagens após um tempo
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loadError) {
    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SettingsIcon />
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              Coordenadas de Retirada
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="error">
            Erro ao carregar o Google Maps. Verifique sua conexão com a
            internet.
          </Alert>
        </AccordionDetails>
      </Accordion>
    );
  }

  if (loading || !isLoaded) {
    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography
            variant="h6"
            sx={{ fontWeight: "bold", color: "primary.main" }}
          >
            Coordenadas de Retirada
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={handleAccordionChange}
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        "&:before": {
          display: "none",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: expanded ? "white" : "primary.main",
          color: expanded ? "primary.main" : "white",
          "&:hover": {
            backgroundColor: expanded ? "grey.100" : "primary.dark",
            color: expanded ? "primary.main" : "white",
          },
          "& .MuiAccordionSummary-expandIconWrapper": {
            color: expanded ? "primary.main" : "white",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SettingsIcon />
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Coordenadas de Retirada
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Clique no mapa ou arraste o marcador para definir o local exato onde
          os entregadores devem retirar os pedidos.
        </Typography>

        {/* Barra de pesquisa */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Digite um endereço para buscar..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearchAddress();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearchAddress} edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={getCurrentLocation}
              sx={{ height: "56px" }}
            >
              Minha Localização
            </Button>
          </Grid>
        </Grid>

        {/* Mapa */}
        <Box
          ref={mapRef}
          sx={{
            width: "100%",
            height: "400px",
            mb: 3,
            borderRadius: 2,
            border: "2px solid",
            borderColor: "divider",
          }}
        />

        {/* Informações das coordenadas */}
        {coordinates.length === 2 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Coordenadas selecionadas:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              Latitude: {coordinates[1].toFixed(6)}, Longitude:{" "}
              {coordinates[0].toFixed(6)}
            </Typography>
          </Box>
        )}

        {/* Mensagem de feedback */}
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        {/* Botão de salvar */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSaveCoordinates}
            disabled={saving || coordinates.length !== 2}
            size="large"
          >
            {saving ? "Salvando..." : "Salvar Coordenadas"}
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default ViewCoordinates;
