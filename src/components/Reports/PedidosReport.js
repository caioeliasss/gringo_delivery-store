// src/components/Reports/PedidosReport.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ShoppingCart as CartIcon,
  CheckCircle as CompletedIcon,
  Cancel as CancelledIcon,
  HourglassEmpty as PendingIcon,
} from "@mui/icons-material";

const PedidosReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState({
    totalPedidos: 0,
    pedidosCompletos: 0,
    pedidosCancelados: 0,
    pedidosPendentes: 0,
    ticketMedio: 0,
    pedidos: [],
  });

  useEffect(() => {
    setTimeout(() => {
      setData({
        totalPedidos: 1247,
        pedidosCompletos: 1156,
        pedidosCancelados: 45,
        pedidosPendentes: 46,
        ticketMedio: 36.5,
        pedidos: [
          {
            id: "#12547",
            cliente: "João Silva",
            status: "Entregue",
            valor: 45.9,
            data: "2025-09-15 14:30",
          },
          {
            id: "#12546",
            cliente: "Maria Santos",
            status: "Cancelado",
            valor: 28.5,
            data: "2025-09-15 14:15",
          },
          {
            id: "#12545",
            cliente: "Pedro Costa",
            status: "Em preparo",
            valor: 52.75,
            data: "2025-09-15 14:00",
          },
          {
            id: "#12544",
            cliente: "Ana Oliveira",
            status: "Entregue",
            valor: 33.2,
            data: "2025-09-15 13:45",
          },
          {
            id: "#12543",
            cliente: "Carlos Souza",
            status: "A caminho",
            valor: 41.8,
            data: "2025-09-15 13:30",
          },
        ],
      });
      setLoading(false);
    }, 1500);
  }, [period]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Entregue":
        return "success";
      case "Cancelado":
        return "error";
      case "Em preparo":
        return "warning";
      case "A caminho":
        return "info";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          Relatório de Pedidos
        </Typography>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={period}
            label="Período"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="today">Hoje</MenuItem>
            <MenuItem value="week">Última Semana</MenuItem>
            <MenuItem value="month">Último Mês</MenuItem>
            <MenuItem value="quarter">Último Trimestre</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CartIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Total de Pedidos
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {data.totalPedidos.toLocaleString("pt-BR")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CompletedIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Pedidos Completos
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {data.pedidosCompletos.toLocaleString("pt-BR")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {((data.pedidosCompletos / data.totalPedidos) * 100).toFixed(1)}
                % do total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Pedidos Pendentes
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {data.pedidosPendentes.toLocaleString("pt-BR")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {((data.pedidosPendentes / data.totalPedidos) * 100).toFixed(1)}
                % do total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CancelledIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" color="error.main">
                  Ticket Médio
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                R${" "}
                {data.ticketMedio.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cancelados: {data.pedidosCancelados} (
                {((data.pedidosCancelados / data.totalPedidos) * 100).toFixed(
                  1
                )}
                %)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Pedidos Recentes */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Pedidos Recentes
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID Pedido</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell align="right">Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell>
                      <Typography fontWeight="bold">{pedido.id}</Typography>
                    </TableCell>
                    <TableCell>{pedido.cliente}</TableCell>
                    <TableCell>
                      <Chip
                        label={pedido.status}
                        color={getStatusColor(pedido.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{pedido.data}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold">
                        R${" "}
                        {pedido.valor.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default PedidosReport;
