import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import {
  getCacheStats,
  clearCache,
  cleanupCache,
  getApiQueueStats,
  invalidateCache,
} from "../services/api";

const CacheMonitor = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const updateStats = () => {
    setCacheStats(getCacheStats());
    setQueueStats(getApiQueueStats());
  };

  const handleClearCache = () => {
    const cleared = clearCache();
    console.log(`🗑️ Cache limpo: ${cleared} entradas removidas`);
    updateStats();
  };

  const handleCleanupCache = () => {
    const cleaned = cleanupCache();
    console.log(`🧹 Cache expirado limpo: ${cleaned} entradas removidas`);
    updateStats();
  };

  const handleInvalidatePattern = (pattern) => {
    const invalidated = invalidateCache(pattern);
    console.log(
      `🗑️ Cache invalidado: ${invalidated} entradas para padrão "${pattern}"`
    );
    updateStats();
  };

  useEffect(() => {
    updateStats();

    // Atualizar estatísticas a cada 2 segundos
    const interval = setInterval(updateStats, 2000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null; // Só mostrar em desenvolvimento
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, border: "1px solid #e0e0e0" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StorageIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Cache & Queue Monitor
          </Typography>
          <Chip label="DEV" size="small" color="warning" />
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Atualizar estatísticas">
            <IconButton size="small" onClick={updateStats}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Limpar cache expirado">
            <Button
              size="small"
              variant="outlined"
              onClick={handleCleanupCache}
              startIcon={<TimelineIcon />}
            >
              Cleanup
            </Button>
          </Tooltip>

          <Tooltip title="Limpar todo cache">
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={handleClearCache}
              startIcon={<DeleteIcon />}
            >
              Clear All
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Cache Stats */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <StorageIcon fontSize="small" />
                Estatísticas do Cache
              </Typography>

              {cacheStats ? (
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Chip
                      label={`Total: ${cacheStats.total}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      label={`Ativo: ${cacheStats.active}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      label={`Expirado: ${cacheStats.expired}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      label={`Memória: ${cacheStats.memory?.kb || 0} KB`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Carregando...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Queue Stats */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <SpeedIcon fontSize="small" />
                Estatísticas da Fila
              </Typography>

              {queueStats ? (
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Chip
                      label={`Fila: ${queueStats.queueLength}`}
                      size="small"
                      color={queueStats.queueLength > 0 ? "warning" : "default"}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      label={`Ativas: ${queueStats.activeRequests}`}
                      size="small"
                      color={queueStats.activeRequests > 0 ? "info" : "default"}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Chip
                      label={queueStats.processing ? "Processando" : "Inativa"}
                      size="small"
                      color={queueStats.processing ? "success" : "default"}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Carregando...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Invalidar cache:
            </Typography>

            {["orders", "products", "motoboys", "stores", "notifications"].map(
              (pattern) => (
                <Button
                  key={pattern}
                  size="small"
                  variant="text"
                  onClick={() => handleInvalidatePattern(pattern)}
                  sx={{ minWidth: "auto", px: 1 }}
                >
                  {pattern}
                </Button>
              )
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Alertas */}
      {cacheStats?.expired > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }} size="small">
          <Typography variant="caption">
            {cacheStats.expired} entradas de cache expiraram. Execute cleanup
            para liberar memória.
          </Typography>
        </Alert>
      )}

      {queueStats?.queueLength > 5 && (
        <Alert severity="info" sx={{ mt: 1 }} size="small">
          <Typography variant="caption">
            Fila de requisições está crescendo ({queueStats.queueLength} itens).
            Possível rate limiting ativo.
          </Typography>
        </Alert>
      )}

      {cacheStats?.memory?.mb > 10 && (
        <Alert severity="warning" sx={{ mt: 1 }} size="small">
          <Typography variant="caption">
            Cache usando {cacheStats.memory.mb} MB de memória. Considere limpar
            ou reduzir TTL.
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default CacheMonitor;
