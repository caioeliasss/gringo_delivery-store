// src/components/Reports/ChatReport.js
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
  Chat as ChatIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendingIcon,
  SentimentSatisfied as SatisfactionIcon,
} from "@mui/icons-material";

const ChatReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState({
    totalConversas: 0,
    tempoMedioResposta: 0,
    satisfacaoMedia: 0,
    conversasAtivas: 0,
    atendimentos: [],
  });

  useEffect(() => {
    setTimeout(() => {
      setData({
        totalConversas: 456,
        tempoMedioResposta: 3.2,
        satisfacaoMedia: 4.7,
        conversasAtivas: 23,
        atendimentos: [
          {
            id: "#AT-1234",
            cliente: "João Silva",
            atendente: "Maria Santos",
            tipo: "Suporte",
            duracao: "5 min",
            satisfacao: 5,
            status: "Finalizado",
          },
          {
            id: "#AT-1233",
            cliente: "Ana Costa",
            atendente: "Pedro Lima",
            tipo: "Reclamação",
            duracao: "12 min",
            satisfacao: 4,
            status: "Finalizado",
          },
          {
            id: "#AT-1232",
            cliente: "Carlos Oliveira",
            atendente: "Julia Souza",
            tipo: "Dúvida",
            duracao: "8 min",
            satisfacao: 5,
            status: "Finalizado",
          },
          {
            id: "#AT-1231",
            cliente: "Fernanda Santos",
            atendente: "Roberto Silva",
            tipo: "Cancelamento",
            duracao: "15 min",
            satisfacao: 3,
            status: "Em andamento",
          },
        ],
      });
      setLoading(false);
    }, 1500);
  }, [period]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Finalizado":
        return "success";
      case "Em andamento":
        return "warning";
      default:
        return "default";
    }
  };

  const getSatisfactionColor = (satisfacao) => {
    if (satisfacao >= 5) return "success";
    if (satisfacao >= 4) return "info";
    if (satisfacao >= 3) return "warning";
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
          Relatório de Chat/Atendimento
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
                <ChatIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Total Conversas
                </Typography>
              </Box>
              <Typography variant="h4">{data.totalConversas}</Typography>
              <Typography variant="body2" color="text.secondary">
                {data.conversasAtivas} ativas agora
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TimeIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Tempo Médio
                </Typography>
              </Box>
              <Typography variant="h4">
                {data.tempoMedioResposta} min
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Primeira resposta
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <SatisfactionIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Satisfação
                </Typography>
              </Box>
              <Typography variant="h4">{data.satisfacaoMedia}/5</Typography>
              <Typography variant="body2" color="text.secondary">
                Nota média
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TrendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Taxa Resolução
                </Typography>
              </Box>
              <Typography variant="h4">94.2%</Typography>
              <Typography variant="body2" color="text.secondary">
                Primeiro contato
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Atendimentos Recentes
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Atendente</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Duração</TableCell>
                  <TableCell>Satisfação</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.atendimentos.map((atendimento) => (
                  <TableRow key={atendimento.id}>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {atendimento.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            mr: 1,
                            fontSize: "0.8rem",
                          }}
                        >
                          {atendimento.cliente.charAt(0)}
                        </Avatar>
                        {atendimento.cliente}
                      </Box>
                    </TableCell>
                    <TableCell>{atendimento.atendente}</TableCell>
                    <TableCell>{atendimento.tipo}</TableCell>
                    <TableCell>{atendimento.duracao}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${atendimento.satisfacao}/5`}
                        color={getSatisfactionColor(atendimento.satisfacao)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={atendimento.status}
                        color={getStatusColor(atendimento.status)}
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

export default ChatReport;
