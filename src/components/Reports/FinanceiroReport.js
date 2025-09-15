// src/components/Reports/FinanceiroReport.js
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
  TextField,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";

const FinanceiroReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState({
    totalReceita: 0,
    totalDespesas: 0,
    lucroLiquido: 0,
    transacoes: [],
    crescimento: 0,
  });

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setData({
        totalReceita: 45670.8,
        totalDespesas: 32150.4,
        lucroLiquido: 13520.4,
        crescimento: 12.5,
        transacoes: [
          {
            id: 1,
            tipo: "Receita",
            descricao: "Pedidos delivery",
            valor: 25670.8,
            data: "2025-09-15",
          },
          {
            id: 2,
            tipo: "Receita",
            descricao: "Taxas de entrega",
            valor: 12000.0,
            data: "2025-09-14",
          },
          {
            id: 3,
            tipo: "Despesa",
            descricao: "Pagamento motoboys",
            valor: -15670.2,
            data: "2025-09-13",
          },
          {
            id: 4,
            tipo: "Despesa",
            descricao: "Manutenção sistema",
            valor: -8500.0,
            data: "2025-09-12",
          },
        ],
      });
      setLoading(false);
    }, 1500);
  }, [period]);

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
          Relatório Financeiro
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
            <MenuItem value="year">Último Ano</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <MoneyIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Receita Total
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                R${" "}
                {data.totalReceita.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <ReceiptIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" color="error.main">
                  Despesas Total
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                R${" "}
                {data.totalDespesas.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Lucro Líquido
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                R${" "}
                {data.lucroLiquido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                {data.crescimento >= 0 ? (
                  <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography
                  variant="h6"
                  color={data.crescimento >= 0 ? "success.main" : "error.main"}
                >
                  Crescimento
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {data.crescimento >= 0 ? "+" : ""}
                {data.crescimento}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Transações */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Últimas Transações
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.transacoes.map((transacao) => (
                  <TableRow key={transacao.id}>
                    <TableCell>
                      {new Date(transacao.data).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transacao.tipo}
                        color={
                          transacao.tipo === "Receita" ? "success" : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transacao.descricao}</TableCell>
                    <TableCell align="right">
                      <Typography
                        color={
                          transacao.valor >= 0 ? "success.main" : "error.main"
                        }
                        fontWeight="bold"
                      >
                        R${" "}
                        {Math.abs(transacao.valor).toLocaleString("pt-BR", {
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

export default FinanceiroReport;
