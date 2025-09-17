// src/components/Reports/OcorrenciasReport.js
import React, { useState, useEffect } from "react";
// import occurrenceService from '../../services/occurrenceService'; // Descomentar para usar dados reais
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
  AppBar,
  Toolbar,
  Divider,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import { DateRangePicker } from "@mui/x-date-pickers-pro/DateRangePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ptBR } from "date-fns/locale";
import {
  Assignment as OrderIcon,
  ReportProblem as ProblemIcon,
  CheckCircle as ResolvedIcon,
  HourglassEmpty as PendingIcon,
  Warning as WarningIcon,
  LocalShipping as DeliveryIcon,
  Restaurant as ProductIcon,
  Person as CustomerIcon,
  Payment as PaymentIcon,
  Store as StoreIcon,
  Apps as AppIcon,
  MoreHoriz as OtherIcon,
  Clear as ClearIcon,
  Search,
  Menu as MenuIcon,
} from "@mui/icons-material";
import api from "../../services/api"; // Ajuste o caminho conforme necessário
import SideDrawer from "../SideDrawer/SideDrawer";
import {
  getFilteredMenuItems,
  createAdminFooterItems,
} from "../../config/menuConfig";
import { useAuth } from "../../contexts/AuthContext";

const OcorrenciasReport = () => {
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date(),
  ]);
  const [openAnswerDialog, setOpenAnswerDialog] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [data, setData] = useState({
    totalOcorrencias: 0,
    ocorrenciasResolvidas: 0,
    ocorrenciasPendentes: 0,
    tempoMedioResolucao: 0,
    ocorrencias: [],
    ocorrenciasPorTipo: [],
    dadosPareto: [],
  });

  // Configuração do menu e footer
  const menuItems = getFilteredMenuItems("admin");
  const footerItems = createAdminFooterItems(logout);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const fetchOccurrenceStats = async () => {
    try {
      setLoading(true);

      // Só fazer a chamada se temos datas válidas
      if (!dateRange[0] || !dateRange[1]) {
        setLoading(false);
        return;
      }

      const response = await api.get("/occurrences/stats/summary", {
        params: {
          startDate: dateRange[0]?.toISOString(),
          endDate: dateRange[1]?.toISOString(),
          roles: ["admin"],
        },
      });
      const stats = await response.data;

      // Transformar dados da API para o formato do componente
      const ocorrenciasPorTipo = stats.porTipo.map((item, index) => ({
        tipo: item._id,
        nome: item._id,
        quantidade: item.count,
        porcentagem: ((item.count / stats.total) * 100).toFixed(1),
        cor: [
          "error",
          "warning",
          "info",
          "success",
          "success",
          "default",
          "default",
        ][index % 7],
      }));

      // Preparar dados para o gráfico de Pareto
      const dadosPareto = [...ocorrenciasPorTipo]
        .sort((a, b) => b.quantidade - a.quantidade)
        .map((item, index, array) => {
          const porcentagemAcumulada = array
            .slice(0, index + 1)
            .reduce((acc, curr) => acc + parseFloat(curr.porcentagem), 0);

          return {
            ...item,
            porcentagemAcumulada: porcentagemAcumulada.toFixed(1),
          };
        });

      setData({
        totalOcorrencias: stats.total,
        ocorrenciasResolvidas: stats.fechadas,
        ocorrenciasPendentes: stats.pendentes + stats.abertas,
        tempoMedioResolucao: 0, // Calcular com base em dados reais
        ocorrenciasPorTipo,
        dadosPareto,
        ocorrencias: stats.ocorrencias, // Buscar ocorrências recentes em endpoint separado
      });
      console.log(stats.ocorrencias[0]);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchDateRange = () => {
    fetchOccurrenceStats();
  };

  const handleDateRangeChange = (newValue) => {
    // Se já temos um range completo e o usuário clicou em uma nova data inicial
    // Limpar o range para permitir nova seleção
    if (dateRange[0] && dateRange[1] && newValue[0] && !newValue[1]) {
      setDateRange([newValue[0], null]);
    } else {
      setDateRange(newValue);
    }
  };

  const formatDate = (dateStr) => {
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(dateStr).toLocaleString("pt-BR", options);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "FECHADO":
        return "success";
      case "PENDENTE":
        return "error";
      case "ABERTO":
        return "warning";
      default:
        return "default";
    }
  };

  const getPriorityColor = (prioridade) => {
    switch (prioridade) {
      case "Alta":
        return "error";
      case "Média":
        return "warning";
      case "Baixa":
        return "info";
      default:
        return "default";
    }
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case "ENTREGA":
        return <DeliveryIcon />;
      case "PRODUTO":
        return <ProductIcon />;
      case "PEDIDO":
        return <OrderIcon />;
      case "ENTREGADOR":
        return <DeliveryIcon />;
      case "CLIENTE":
        return <CustomerIcon />;
      case "PAGAMENTO":
        return <PaymentIcon />;
      case "ESTABELECIMENTO":
        return <StoreIcon />;
      case "APP":
        return <AppIcon />;
      default:
        return <OtherIcon />;
    }
  };

  const handleOpenAnswerDialog = (answer) => {
    setSelectedAnswer(answer || "Sem Resposta");
    setOpenAnswerDialog(true);
  };

  const handleCloseAnswerDialog = () => {
    setOpenAnswerDialog(false);
    setSelectedAnswer("");
  };

  // Componente customizado do tooltip para o gráfico de Pareto
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const barData = payload.find((p) => p.dataKey === "quantidade");
      const lineData = payload.find(
        (p) => p.dataKey === "porcentagemAcumulada"
      );
      const itemData = data.dadosPareto.find((item) => item.nome === label);

      return (
        <Paper sx={{ p: 2, border: "1px solid #ccc" }}>
          <Typography variant="subtitle2">{`Tipo: ${label}`}</Typography>
          {barData && (
            <Typography variant="body2" color="primary">
              {`Quantidade: ${barData.value}`}
            </Typography>
          )}
          {itemData && (
            <Typography variant="body2" color="secondary">
              {`% Individual: ${itemData.porcentagem}%`}
            </Typography>
          )}
          {lineData && (
            <Typography variant="body2" color="info.main">
              {`% Acumulado: ${lineData.value}%`}
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
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
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* AppBar para mobile */}
        {isMobile && (
          <AppBar
            position="fixed"
            sx={{
              zIndex: theme.zIndex.drawer + 1,
              display: { md: "none" },
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div">
                Relatório de Ocorrências
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Drawer Desktop */}
        <SideDrawer
          open={true}
          variant="permanent"
          menuItems={menuItems}
          footerItems={footerItems}
          sx={{ display: { xs: "none", md: "block" } }}
        />

        {/* Drawer Mobile */}
        <SideDrawer
          open={mobileOpen}
          onClose={handleDrawerToggle}
          variant="temporary"
          menuItems={menuItems}
          footerItems={footerItems}
          sx={{ display: { xs: "block", md: "none" } }}
        />

        {/* Conteúdo principal */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - 250px)` },
            mt: { xs: 8, md: 0 }, // Margem top para mobile (AppBar)
          }}
        >
          {loading ? (
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
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                  flexDirection: { xs: "column", md: "row" },
                  gap: { xs: 2, md: 0 },
                }}
              >
                <Typography variant="h4" component="h1">
                  Relatório de Ocorrências
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  <DateRangePicker
                    startText="Data Inicial"
                    endText="Data Final"
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    sx={{ minWidth: { xs: "100%", sm: 300 } }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Search />}
                    onClick={searchDateRange}
                    sx={{
                      height: "56px",
                      minWidth: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Procurar
                  </Button>
                </Box>
              </Box>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <ProblemIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="primary.main">
                          Total
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {data.totalOcorrencias}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <ResolvedIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="success.main">
                          Resolvidas
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {data.ocorrenciasResolvidas}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(
                          (data.ocorrenciasResolvidas / data.totalOcorrencias) *
                          100
                        ).toFixed(1)}
                        % resolvidas
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <PendingIcon color="warning" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="warning.main">
                          Pendentes
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {data.ocorrenciasPendentes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <WarningIcon color="info" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="info.main">
                          Tempo Médio
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {data.tempoMedioResolucao}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Resolução
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Seção de Ocorrências por Tipo */}
              <Paper sx={{ mb: 4 }}>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Distribuição por Tipo de Ocorrência
                  </Typography>

                  {/* Gráfico de Pareto */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      📊 Análise de Pareto - Princípio 80/20
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: "background.default" }}>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart
                          data={data.dadosPareto}
                          margin={{
                            top: 20,
                            right: 30,
                            bottom: 100,
                            left: 20,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="nome"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            fontSize={12}
                            interval={0}
                          />
                          <YAxis yAxisId="left" />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[0, 100]}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />

                          {/* Barras das quantidades */}
                          <Bar
                            yAxisId="left"
                            dataKey="quantidade"
                            fill="#8884d8"
                            name="Quantidade de Ocorrências"
                          />

                          {/* Linha do percentual acumulado */}
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="porcentagemAcumulada"
                            stroke="#ff7300"
                            strokeWidth={3}
                            name="% Acumulado"
                            dot={{ fill: "#ff7300", strokeWidth: 2, r: 6 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>

                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          bgcolor: "info.light",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" color="info.contrastText">
                          💡 <strong>Análise de Pareto:</strong> Este gráfico
                          ajuda a identificar os tipos de ocorrências mais
                          críticos. Aproximadamente 80% dos problemas geralmente
                          vêm de 20% das causas. Foque nos tipos à esquerda do
                          gráfico para maior impacto na redução de ocorrências.
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Cards de distribuição existentes */}
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    📋 Detalhamento por Categoria
                  </Typography>
                  <Grid container spacing={2}>
                    {data.ocorrenciasPorTipo.map((tipoData) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}
                        key={tipoData.tipo}
                      >
                        <Card
                          sx={{
                            height: "100%",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: 4,
                            },
                          }}
                        >
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  mr: 2,
                                  color: `${tipoData.cor}.main`,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {getTypeIcon(tipoData.tipo)}
                              </Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ flexGrow: 1 }}
                              >
                                {tipoData.nome}
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography variant="h5" fontWeight="bold">
                                {tipoData.quantidade}
                              </Typography>
                              <Chip
                                label={`${tipoData.porcentagem}%`}
                                color={tipoData.cor}
                                size="small"
                                variant="outlined"
                              />
                            </Box>

                            {/* Barra de progresso visual */}
                            <Box
                              sx={{
                                width: "100%",
                                height: 8,
                                bgcolor: "grey.200",
                                borderRadius: 1,
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${tipoData.porcentagem}%`,
                                  height: "100%",
                                  bgcolor: `${tipoData.cor}.main`,
                                  transition: "width 1s ease-in-out",
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>

              <Paper>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Ocorrências Recentes
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Categoria</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Descrição</TableCell>
                          <TableCell>Resposta</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Data</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.ocorrencias.map((ocorrencia) => (
                          <TableRow key={ocorrencia._id}>
                            <TableCell>
                              <Typography fontWeight="bold">
                                {ocorrencia._id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <Box
                                  sx={{
                                    mr: 1,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  {getTypeIcon(ocorrencia.type)}
                                </Box>
                                <Typography variant="body2">
                                  {data.ocorrenciasPorTipo.find(
                                    (t) => t.tipo === ocorrencia.categoria
                                  )?.nome || ocorrencia.type}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{ocorrencia.type}</TableCell>
                            <TableCell sx={{ maxWidth: 150 }}>
                              <Chip
                                label={ocorrencia.description}
                                color={getPriorityColor("Baixa")}
                                size="small"
                                onClick={() =>
                                  handleOpenAnswerDialog(ocorrencia.description)
                                }
                                sx={{ cursor: "pointer" }}
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 150 }}>
                              <Chip
                                label={
                                  ocorrencia.answer
                                    ? ocorrencia.answer
                                    : "Sem Resposta"
                                }
                                color={getPriorityColor("Média")}
                                size="small"
                                onClick={() =>
                                  handleOpenAnswerDialog(ocorrencia.answer)
                                }
                                sx={{ cursor: "pointer" }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={ocorrencia.status}
                                color={getStatusColor(ocorrencia.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{formatDate(ocorrencia.date)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Paper>

              {/* Dialog para mostrar a resposta completa */}
              <Dialog
                open={openAnswerDialog}
                onClose={handleCloseAnswerDialog}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>Texto da Ocorrência</DialogTitle>
                <DialogContent>
                  <Typography
                    variant="body1"
                    sx={{ mt: 1, whiteSpace: "pre-wrap" }}
                  >
                    {selectedAnswer}
                  </Typography>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseAnswerDialog} variant="contained">
                    Fechar
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default OcorrenciasReport;
