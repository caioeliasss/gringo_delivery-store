import React from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import ViewCoordinates from "../../components/ViewCoordinates/ViewCoordinates";
import { Container, Box, CircularProgress, Alert } from "@mui/material";

const CoordenadasPage = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script-coordenadas",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "maps", "geometry"],
  });

  if (loadError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Erro ao carregar o Google Maps. Verifique sua conexão com a internet e
          a chave da API.
        </Alert>
      </Container>
    );
  }

  if (!isLoaded) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ViewCoordinates isLoaded={isLoaded} loadError={loadError} />
    </Container>
  );
};

export default CoordenadasPage;
