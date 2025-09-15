// src/components/Reports/EntregadoresReport.js
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
  Avatar,
} from "@mui/material";
import {
  TwoWheeler as BikeIcon,
  Star as RatingIcon,
  LocalShipping as DeliveryIcon,
  AttachMoney as EarningsIcon,
} from "@mui/icons-material";

const EntregadoresReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState({
    totalEntregadores: 0,
    entregadoresAtivos: 0,
    entregaMedia: 0,
    ganhoMedio: 0,
    entregadores: [],
  });

  useEffect(() => {
    setTimeout(() => {
      setData({
        totalEntregadores: 45,
        entregadoresAtivos: 38,
        entregaMedia: 12.5,
        ganhoMedio: 847.3,
        entregadores: [
          {
            id: "MOT-001",
            nome: "João Silva",
            entregas: 89,
            ganhos: 1245.8,
            avaliacao: 4.9,
            status: "Online",
            tempoOnline: "8h 30m",
          },
          {
            id: "MOT-002",
            nome: "Pedro Costa",
            entregas: 76,
            ganhos: 987.5,
            avaliacao: 4.7,
            status: "Online",
            tempoOnline: "7h 15m",
          },
          {
            id: "MOT-003",
            nome: "Carlos Souza",
            entregas: 67,
            ganhos: 834.2,
            avaliacao: 4.8,
            status: "Offline",
            tempoOnline: "6h 45m",
          },
          {
            id: "MOT-004",
            nome: "Ana Santos",
            entregas: 54,
            ganhos: 678.9,
            avaliacao: 4.6,
            status: "Em entrega",
            tempoOnline: "5h 20m",
          },
        ],
      });
      setLoading(false);
    }, 1500);
  }, [period]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Online":
        return "success";
      case "Offline":
        return "error";
      case "Em entrega":
        return "info";
      case "Pausado":
        return "warning";
      default:
        return "default";
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "success";
    if (rating >= 4.0) return "info";
    if (rating >= 3.5) return "warning";
    return "error";
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
          Relatório de Entregadores
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
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <BikeIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Total Entregadores
                </Typography>
              </Box>
              <Typography variant="h4">{data.totalEntregadores}</Typography>
              <Typography variant="body2" color="text.secondary">
                {data.entregadoresAtivos} ativos agora
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <DeliveryIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Entregas/Dia
                </Typography>
              </Box>
              <Typography variant="h4">{data.entregaMedia}</Typography>
              <Typography variant="body2" color="text.secondary">
                Média por entregador
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <EarningsIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Ganho Médio
                </Typography>
              </Box>
              <Typography variant="h4">
                R${" "}
                {data.ganhoMedio.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Por mês
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <RatingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Taxa Online
                </Typography>
              </Box>
              <Typography variant="h4">
                {(
                  (data.entregadoresAtivos / data.totalEntregadores) *
                  100
                ).toFixed(1)}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Performance dos Entregadores
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Entregador</TableCell>
                  <TableCell>Entregas</TableCell>
                  <TableCell>Ganhos</TableCell>
                  <TableCell>Avaliação</TableCell>
                  <TableCell>Tempo Online</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.entregadores.map((entregador) => (
                  <TableRow key={entregador.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                          {entregador.nome
                            .split(" ")
                            .map((n) => n.charAt(0))
                            .join("")}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="bold">
                            {entregador.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {entregador.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {entregador.entregas}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        R${" "}
                        {entregador.ganhos.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${entregador.avaliacao}/5`}
                        color={getRatingColor(entregador.avaliacao)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{entregador.tempoOnline}</TableCell>
                    <TableCell>
                      <Chip
                        label={entregador.status}
                        color={getStatusColor(entregador.status)}
                        size="small"
                      />
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

export default EntregadoresReport;
