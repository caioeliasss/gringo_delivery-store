// src/components/Reports/EstabelecimentosReport.js
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
  Store as StoreIcon,
  TrendingUp as SalesIcon,
  Star as RatingIcon,
  Receipt as OrdersIcon,
} from "@mui/icons-material";

const EstabelecimentosReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState({
    totalEstabelecimentos: 0,
    estabelecimentosAtivos: 0,
    vendaMedia: 0,
    avaliacaoMedia: 0,
    estabelecimentos: [],
  });

  useEffect(() => {
    setTimeout(() => {
      setData({
        totalEstabelecimentos: 87,
        estabelecimentosAtivos: 73,
        vendaMedia: 1247.5,
        avaliacaoMedia: 4.3,
        estabelecimentos: [
          {
            id: "EST-001",
            nome: "Pizza Palace",
            categoria: "Pizzaria",
            pedidos: 156,
            vendas: 5670.8,
            avaliacao: 4.8,
            status: "Ativo",
          },
          {
            id: "EST-002",
            nome: "Burger King Premium",
            categoria: "Hamburgueria",
            pedidos: 203,
            vendas: 7450.2,
            avaliacao: 4.5,
            status: "Ativo",
          },
          {
            id: "EST-003",
            nome: "Sushi Bar Tokyo",
            categoria: "Japonesa",
            pedidos: 89,
            vendas: 4320.9,
            avaliacao: 4.7,
            status: "Ativo",
          },
          {
            id: "EST-004",
            nome: "Tacos Mexicanos",
            categoria: "Mexicana",
            pedidos: 67,
            vendas: 2890.4,
            avaliacao: 4.2,
            status: "Inativo",
          },
        ],
      });
      setLoading(false);
    }, 1500);
  }, [period]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Ativo":
        return "success";
      case "Inativo":
        return "error";
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
          Relatório de Estabelecimentos
        </Typography>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={period}
            label="Período"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="week">Última Semana</MenuItem>
            <MenuItem value="month">Último Mês</MenuItem>
            <MenuItem value="quarter">Último Trimestre</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <StoreIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Total
                </Typography>
              </Box>
              <Typography variant="h4">{data.totalEstabelecimentos}</Typography>
              <Typography variant="body2" color="text.secondary">
                {data.estabelecimentosAtivos} ativos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <OrdersIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Taxa de Atividade
                </Typography>
              </Box>
              <Typography variant="h4">
                {(
                  (data.estabelecimentosAtivos / data.totalEstabelecimentos) *
                  100
                ).toFixed(1)}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <SalesIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Venda Média
                </Typography>
              </Box>
              <Typography variant="h4">
                R${" "}
                {data.vendaMedia.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
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
                  Avaliação Média
                </Typography>
              </Box>
              <Typography variant="h4">{data.avaliacaoMedia}/5</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Performance dos Estabelecimentos
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Estabelecimento</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Pedidos</TableCell>
                  <TableCell>Vendas</TableCell>
                  <TableCell>Avaliação</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.estabelecimentos.map((estabelecimento) => (
                  <TableRow key={estabelecimento.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            mr: 2,
                            fontSize: "0.9rem",
                          }}
                        >
                          {estabelecimento.nome.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="bold">
                            {estabelecimento.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {estabelecimento.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{estabelecimento.categoria}</TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {estabelecimento.pedidos}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        R${" "}
                        {estabelecimento.vendas.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${estabelecimento.avaliacao}/5`}
                        color={getRatingColor(estabelecimento.avaliacao)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={estabelecimento.status}
                        color={getStatusColor(estabelecimento.status)}
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

export default EstabelecimentosReport;
