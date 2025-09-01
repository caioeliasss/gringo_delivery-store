import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from "@mui/material";
import {
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Restaurant as RestaurantIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";

const ScheduledOrdersComponent = ({ onOrderProcessed }) => {
  const [scheduledOrders, setScheduledOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalValue: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [rescheduleDialog, setRescheduleDialog] = useState({
    open: false,
    order: null,
  });
  const [newDateTime, setNewDateTime] = useState("");
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadScheduledOrders();
    loadStats();

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      loadScheduledOrders();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadScheduledOrders = async () => {
    try {
      const response = await api.get("/orders/scheduled");
      if (response.data.success) {
        setScheduledOrders(response.data.data);
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos agendados:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get("/orders/scheduled/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getTimeUntilScheduled = (scheduledDateTime) => {
    const now = new Date();
    const scheduled = new Date(scheduledDateTime);
    const diffMinutes = differenceInMinutes(scheduled, now);
    const diffHours = differenceInHours(scheduled, now);

    if (diffMinutes < 0) {
      return { text: "Atrasado", color: "error", minutes: diffMinutes };
    } else if (diffMinutes < 60) {
      return {
        text: `${diffMinutes}min`,
        color: "warning",
        minutes: diffMinutes,
      };
    } else if (diffHours < 24) {
      return { text: `${diffHours}h`, color: "info", minutes: diffMinutes };
    } else {
      const days = Math.floor(diffHours / 24);
      return { text: `${days}d`, color: "default", minutes: diffMinutes };
    }
  };

  const handleReschedule = (order) => {
    setRescheduleDialog({ open: true, order });
    // Pré-popular com a data atual do agendamento
    const currentDate = new Date(order.scheduledDateTime);
    const formattedDate = currentDate.toISOString().slice(0, 16);
    setNewDateTime(formattedDate);
  };

  const submitReschedule = async () => {
    try {
      setProcessing("reschedule");
      const response = await api.patch(
        `/orders/${rescheduleDialog.order.id}/reschedule`,
        {
          newScheduledDateTime: newDateTime,
        }
      );

      if (response.data.success) {
        setRescheduleDialog({ open: false, order: null });
        setNewDateTime("");
        await loadScheduledOrders();
        alert("Pedido reagendado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao reagendar pedido:", error);
      alert("Erro ao reagendar pedido");
    } finally {
      setProcessing(null);
    }
  };

  const processOrderNow = async (orderId) => {
    try {
      setProcessing(orderId);
      const response = await api.post(`/orders/${orderId}/process-scheduled`);

      if (response.data.success) {
        await loadScheduledOrders();
        if (onOrderProcessed) {
          onOrderProcessed();
        }
        alert("Pedido processado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      alert("Erro ao processar pedido");
    } finally {
      setProcessing(null);
    }
  };

  const cancelSchedule = async (orderId) => {
    try {
      if (!confirm("Tem certeza que deseja cancelar este agendamento?")) {
        return;
      }

      setProcessing(orderId);
      const response = await api.delete(`/orders/${orderId}/schedule`);

      if (response.data.success) {
        await loadScheduledOrders();
        alert("Agendamento cancelado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
      alert("Erro ao cancelar agendamento");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <ScheduleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pedidos Agendados
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <TimeIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              {stats.today}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Para Hoje
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <MoneyIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              {formatCurrency(stats.totalValue)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valor Total
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Botão de atualizar */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadScheduledOrders();
            loadStats();
          }}
        >
          Atualizar
        </Button>
      </Box>

      {/* Lista de pedidos agendados */}
      {scheduledOrders.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <ScheduleIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhum pedido agendado encontrado
          </Typography>
        </Paper>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Próximos Pedidos Agendados
            </Typography>
            <List>
              {scheduledOrders.map((order, index) => {
                const timeInfo = getTimeUntilScheduled(order.scheduledDateTime);

                return (
                  <React.Fragment key={order.id}>
                    <ListItem sx={{ py: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 1 }}
                        >
                          <Typography variant="h6" sx={{ mr: 2 }}>
                            #{order.orderNumber}
                          </Typography>
                          <Chip
                            label={timeInfo.text}
                            color={timeInfo.color}
                            size="small"
                            icon={<TimeIcon />}
                          />
                          {timeInfo.minutes < 15 && timeInfo.minutes > 0 && (
                            <Chip
                              label="URGENTE"
                              color="error"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={3}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <PersonIcon
                                sx={{
                                  mr: 1,
                                  fontSize: 18,
                                  color: "text.secondary",
                                }}
                              />
                              <Typography variant="body2">
                                {order.customer}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={3}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <ScheduleIcon
                                sx={{
                                  mr: 1,
                                  fontSize: 18,
                                  color: "text.secondary",
                                }}
                              />
                              <Typography variant="body2">
                                {formatDate(order.scheduledDateTime)}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={2}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <RestaurantIcon
                                sx={{
                                  mr: 1,
                                  fontSize: 18,
                                  color: "text.secondary",
                                }}
                              />
                              <Typography variant="body2">
                                {order.deliveryMode === "entrega"
                                  ? "Delivery"
                                  : "Retirada"}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={2}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {formatCurrency(order.total)}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} sm={2}>
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Tooltip title="Processar Agora">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => processOrderNow(order.id)}
                                  disabled={processing === order.id}
                                >
                                  {processing === order.id ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    <PlayIcon />
                                  )}
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Reagendar">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleReschedule(order)}
                                  disabled={processing}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Cancelar Agendamento">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => cancelSchedule(order.id)}
                                  disabled={processing === order.id}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </ListItem>
                    {index < scheduledOrders.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Dialog para reagendar */}
      <Dialog
        open={rescheduleDialog.open}
        onClose={() => setRescheduleDialog({ open: false, order: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reagendar Pedido #{rescheduleDialog.order?.orderNumber}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Nova Data e Hora"
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: new Date().toISOString().slice(0, 16),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRescheduleDialog({ open: false, order: null })}
            disabled={processing === "reschedule"}
          >
            Cancelar
          </Button>
          <Button
            onClick={submitReschedule}
            variant="contained"
            disabled={!newDateTime || processing === "reschedule"}
          >
            {processing === "reschedule" ? (
              <CircularProgress size={20} />
            ) : (
              "Reagendar"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduledOrdersComponent;
