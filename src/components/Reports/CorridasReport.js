// src/components/Reports/CorridasReport.js
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
  LocalShipping as DeliveryIcon,
  Timer as TimerIcon,
  CheckCircle as CompletedIcon,
  TrendingUp as TrendingIcon,
} from "@mui/icons-material";

const CorridasReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState({
    totalCorridas: 0,
    corridasCompletas: 0,
    tempoMedioEntrega: 0,
    distanciaTotal: 0,
    corridas: [],
  });

  useEffect(() => {
    setTimeout(() => {
      setData({
        totalCorridas: 1156,
        corridasCompletas: 1089,
        tempoMedioEntrega: 28,
        distanciaTotal: 2547.8,
        corridas: [
          {
            id: "#C-12547",
            motoboy: "João Silva",
            origem: "Pizza Palace",
            destino: "Rua A, 123",
            tempo: "25 min",
            distancia: "3.2 km",
            status: "Entregue",
          },
          {
            id: "#C-12546",
            motoboy: "Pedro Costa",
            origem: "Burger King",
            destino: "Av. B, 456",
            tempo: "18 min",
            distancia: "2.1 km",
            status: "Entregue",
          },
          {
            id: "#C-12545",
            motoboy: "Carlos Souza",
            origem: "Sushi Bar",
            destino: "Rua C, 789",
            tempo: "32 min",
            distancia: "4.5 km",
            status: "Em andamento",
          },
          {
            id: "#C-12544",
            motoboy: "Ana Santos",
            origem: "McDonald's",
            destino: "Av. D, 321",
            tempo: "22 min",
            distancia: "2.8 km",
            status: "Entregue",
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
      case "Em andamento":
        return "warning";
      case "Cancelado":
        return "error";
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
          Relatório de Corridas
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
                <DeliveryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Total de Corridas
                </Typography>
              </Box>
              <Typography variant="h4">
                {data.totalCorridas.toLocaleString("pt-BR")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CompletedIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Completas
                </Typography>
              </Box>
              <Typography variant="h4">
                {data.corridasCompletas.toLocaleString("pt-BR")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {((data.corridasCompletas / data.totalCorridas) * 100).toFixed(
                  1
                )}
                % taxa de sucesso
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TimerIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Tempo Médio
                </Typography>
              </Box>
              <Typography variant="h4">{data.tempoMedioEntrega} min</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TrendingIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Distância Total
                </Typography>
              </Box>
              <Typography variant="h4">
                {data.distanciaTotal.toFixed(1)} km
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Corridas Recentes
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID Corrida</TableCell>
                  <TableCell>Motoboy</TableCell>
                  <TableCell>Origem</TableCell>
                  <TableCell>Destino</TableCell>
                  <TableCell>Tempo</TableCell>
                  <TableCell>Distância</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.corridas.map((corrida) => (
                  <TableRow key={corrida.id}>
                    <TableCell>
                      <Typography fontWeight="bold">{corrida.id}</Typography>
                    </TableCell>
                    <TableCell>{corrida.motoboy}</TableCell>
                    <TableCell>{corrida.origem}</TableCell>
                    <TableCell>{corrida.destino}</TableCell>
                    <TableCell>{corrida.tempo}</TableCell>
                    <TableCell>{corrida.distancia}</TableCell>
                    <TableCell>
                      <Chip
                        label={corrida.status}
                        color={getStatusColor(corrida.status)}
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

export default CorridasReport;
