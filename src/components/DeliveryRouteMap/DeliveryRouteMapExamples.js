import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";
import DeliveryRouteMap from "../DeliveryRouteMap";

/**
 * Página de exemplo mostrando diferentes usos do componente DeliveryRouteMap
 */
function DeliveryRouteMapExamples() {
  const [orderId, setOrderId] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [routeInfo, setRouteInfo] = useState(null);

  const handleRouteUpdate = (info) => {
    setRouteInfo(info);
  };

  // IDs de exemplo (substitua pelos IDs reais do seu sistema)
  const exampleOrderIds = [
    "60f1b2a3c4d5e6f7a8b9c0d1",
    "60f1b2a3c4d5e6f7a8b9c0d2",
    "60f1b2a3c4d5e6f7a8b9c0d3",
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Exemplos do DeliveryRouteMap
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Esta página demonstra diferentes formas de usar o componente
        DeliveryRouteMap em diversas situações do sistema Gringo Delivery.
      </Typography>

      <Grid container spacing={4}>
        {/* Configuração Interativa */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Teste Interativo
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mb: 2,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <TextField
                  label="Order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Digite um ID de pedido"
                  sx={{ minWidth: 250 }}
                />

                <Box>
                  {exampleOrderIds.map((id) => (
                    <Button
                      key={id}
                      size="small"
                      variant="outlined"
                      onClick={() => setOrderId(id)}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      {id.slice(-4)}
                    </Button>
                  ))}
                </Box>
              </Box>

              <Box
                sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label="Auto Refresh"
                />

                <TextField
                  label="Intervalo (ms)"
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={!autoRefresh}
                  sx={{ width: 150 }}
                />
              </Box>

              {routeInfo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Última atualização da rota:</strong>
                  <br />
                  Distância: {routeInfo.distance} | Tempo: {routeInfo.duration}
                </Alert>
              )}

              {orderId && (
                <DeliveryRouteMap
                  orderId={orderId}
                  height="400px"
                  showRouteInfo={true}
                  showRefreshButton={true}
                  autoRefresh={autoRefresh}
                  refreshInterval={refreshInterval}
                  onRouteUpdate={handleRouteUpdate}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Exemplo 1: Básico */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                1. Uso Básico
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Mapa simples com todas as funcionalidades padrão ativas.
              </Typography>

              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <code style={{ fontSize: "0.85rem" }}>
                  {`<DeliveryRouteMap
  orderId="60f1b2a3c4d5e6f7a8b9c0d1"
  height="300px"
/>`}
                </code>
              </Box>

              {exampleOrderIds[0] && (
                <Box sx={{ mt: 2 }}>
                  <DeliveryRouteMap
                    orderId={exampleOrderIds[0]}
                    height="300px"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Exemplo 2: Minimalista */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                2. Versão Minimalista
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Apenas o mapa, sem informações extras ou botões.
              </Typography>

              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <code style={{ fontSize: "0.85rem" }}>
                  {`<DeliveryRouteMap
  orderId="60f1b2a3c4d5e6f7a8b9c0d2"
  height="250px"
  showRouteInfo={false}
  showRefreshButton={false}
/>`}
                </code>
              </Box>

              {exampleOrderIds[1] && (
                <Box sx={{ mt: 2 }}>
                  <DeliveryRouteMap
                    orderId={exampleOrderIds[1]}
                    height="250px"
                    showRouteInfo={false}
                    showRefreshButton={false}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Exemplo 3: Com Auto-refresh */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                3. Com Auto-Refresh
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Atualização automática a cada 15 segundos, ideal para
                monitoramento em tempo real.
              </Typography>

              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <code style={{ fontSize: "0.85rem" }}>
                  {`<DeliveryRouteMap
  orderId="60f1b2a3c4d5e6f7a8b9c0d3"
  autoRefresh={true}
  refreshInterval={15000}
  showRefreshButton={false}
/>`}
                </code>
              </Box>

              {exampleOrderIds[2] && (
                <Box sx={{ mt: 2 }}>
                  <DeliveryRouteMap
                    orderId={exampleOrderIds[2]}
                    height="300px"
                    autoRefresh={true}
                    refreshInterval={15000}
                    showRefreshButton={false}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Exemplo 4: Em Modal */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                4. Integração em Modal
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Exemplo de como usar em dialogs e modais.
              </Typography>

              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                  mb: 2,
                }}
              >
                <code style={{ fontSize: "0.75rem" }}>
                  {`<Dialog open={open} maxWidth="lg" fullWidth>
  <DialogTitle>Rastreamento</DialogTitle>
  <DialogContent>
    <DeliveryRouteMap orderId={orderId} />
  </DialogContent>
</Dialog>`}
                </code>
              </Box>

              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Dica:</strong> Em modais, considere usar
                  height="400px" para melhor visualização em dispositivos
                  menores.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Exemplo 5: Com Callback */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                5. Com Callback de Rota
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Usando o callback para capturar informações da rota e exibir em
                outros componentes.
              </Typography>

              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                  mb: 2,
                }}
              >
                <code style={{ fontSize: "0.85rem" }}>
                  {`const [routeInfo, setRouteInfo] = useState(null);

const handleRouteUpdate = (info) => {
  setRouteInfo(info);
  // Fazer algo com as informações da rota
  if (info) {
    console.log(\`ETA: \${info.duration}\`);
    updateDeliveryEstimate(info.durationValue);
  }
};

<DeliveryRouteMap
  orderId={orderId}
  onRouteUpdate={handleRouteUpdate}
/>`}
                </code>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Casos de Uso Reais */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Casos de Uso no Sistema
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      📋 Página de Pedidos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Modal de detalhes com mapa da entrega em andamento
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      🏪 Dashboard da Loja
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monitoramento em tempo real dos pedidos da loja
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      🛵 Painel do Motoboy
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Visualização da rota atual e próximos destinos
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      👥 Suporte ao Cliente
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rastreamento para atendimento e resolução de problemas
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default DeliveryRouteMapExamples;
