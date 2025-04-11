import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  ShoppingBag as ShoppingBagIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  LocalShipping as DeliveryIcon,
} from "@mui/icons-material";
import api from "../services/api";

const OrderStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // TODO adicionar modo producao
        // Em ambiente de produção, substituir pelo código comentado
        // const response = await api.get('/orders/stats/summary');
        // setStats(response.data);

        // Dados simulados para demonstração
        setTimeout(() => {
          setStats({
            totalOrders: 120,
            todayOrders: 5,
            last30DaysOrders: 42,
            statusCount: {
              pendente: 3,
              em_preparo: 2,
              em_entrega: 2,
              entregue: 110,
              cancelado: 3,
            },
            totalRevenue: 4850.75,
            last30DaysRevenue: 1720.5,
          });
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error("Erro ao carregar estatísticas:", err);
        setError("Não foi possível carregar as estatísticas de pedidos.");
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Formatação de valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          fontWeight: "bold",
          color: "primary.main",
        }}
      >
        <TrendingUpIcon sx={{ mr: 1 }} /> Estatísticas de Pedidos
      </Typography>
      // TODO adicionar datepickers e filtrar no banco de dados
      <Grid container spacing={2}>
        {/* Total de Pedidos */}
        <Grid item xs={6} md={3}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "primary.lightest",
              borderRadius: 2,
            }}
          >
            <ReceiptIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
              {stats?.totalOrders || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total de Pedidos
            </Typography>
          </Paper>
        </Grid>

        {/* Pedidos Hoje */}
        <Grid item xs={6} md={3}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "info.lightest",
              borderRadius: 2,
            }}
          >
            <ScheduleIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
              {stats?.todayOrders || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pedidos Hoje
            </Typography>
          </Paper>
        </Grid>

        {/* Pedidos em Preparo/Entrega */}
        <Grid item xs={6} md={3}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "warning.lightest",
              borderRadius: 2,
            }}
          >
            <DeliveryIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
              {(stats?.statusCount.em_preparo || 0) +
                (stats?.statusCount.em_entrega || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Em Preparo/Entrega
            </Typography>
          </Paper>
        </Grid>

        {/* Receita Total */}
        <Grid item xs={6} md={3}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "success.lightest",
              borderRadius: 2,
            }}
          >
            <MoneyIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 0.5 }}>
              {formatCurrency(stats?.totalRevenue || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Receita Total
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      {/* Detalhamento de Status */}
      <Paper elevation={1} sx={{ p: 2, mt: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
          Detalhamento por Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4} sm={2}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                color="warning.main"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                {stats?.statusCount.pendente || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pendentes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                color="primary.main"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                {stats?.statusCount.em_preparo || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Em Preparo
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                color="info.main"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                {stats?.statusCount.em_entrega || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Em Entrega
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                color="success.main"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                {stats?.statusCount.entregue || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entregues
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                color="error.main"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                {stats?.statusCount.cancelado || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cancelados
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                color="success.main"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                {formatCurrency(stats?.last30DaysRevenue || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Últimos 30 dias
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default OrderStats;
