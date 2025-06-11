// src/pages/Admin/Dashboard/Dashboard.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  Store,
  ShoppingCart,
  AttachMoney,
  TrendingUp,
  MoreVert,
  Refresh,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { adminService } from "../../services/adminService";

// Componente de Card de Estatística
function StatCard({ title, value, icon, color = "primary", trend = null }) {
  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp
                  fontSize="small"
                  color={trend > 0 ? "success" : "error"}
                />
                <Typography
                  variant="body2"
                  color={trend > 0 ? "success.main" : "error.main"}
                  sx={{ ml: 0.5 }}
                >
                  {trend > 0 ? "+" : ""}
                  {trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStores: 0,
    totalOrders: 0,
    totalRevenue: 0,
    growthRate: 0,
    activeStores: 0,
    pendingApprovals: 0,
  });

  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topStores, setTopStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboardStats();

      setStats(response.stats);
      setChartData(response.chartData);
      setRecentOrders(response.recentOrders);
      setTopStores(response.topStores);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: "Ativas", value: stats.activeStores, color: "#4caf50" },
    { name: "Pendentes", value: stats.pendingApprovals, color: "#ff9800" },
    {
      name: "Inativas",
      value: stats.totalStores - stats.activeStores - stats.pendingApprovals,
      color: "#f44336",
    },
  ];

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <IconButton onClick={loadDashboardData} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Lojas"
            value={stats.totalStores}
            icon={<Store />}
            color="primary"
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pedidos Hoje"
            value={stats.totalOrders}
            icon={<ShoppingCart />}
            color="secondary"
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Receita Mensal"
            value={`R$ ${stats.totalRevenue.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            icon={<AttachMoney />}
            color="success"
            trend={15}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Crescimento"
            value={`${stats.growthRate}%`}
            icon={<TrendingUp />}
            color="info"
            trend={stats.growthRate}
          />
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Receita dos Últimos 30 Dias
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `R$ ${value.toLocaleString("pt-BR")}`,
                    "Receita",
                  ]}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={{ fill: "#1976d2", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Status das Lojas
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box mt={2}>
              {pieData.map((item, index) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                  <Box
                    width={12}
                    height={12}
                    bgcolor={item.color}
                    borderRadius="50%"
                    mr={1}
                  />
                  <Typography variant="body2">
                    {item.name}: {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Listas */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pedidos Recentes
            </Typography>
            <List>
              {recentOrders.map((order, index) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "primary.light" }}>
                      <ShoppingCart />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`Pedido #${order.id}`}
                    secondary={`${order.storeName} - R$ ${order.total.toFixed(
                      2
                    )}`}
                  />
                  <Chip
                    label={order.status}
                    color={
                      order.status === "entregue"
                        ? "success"
                        : order.status === "em_entrega"
                        ? "warning"
                        : "default"
                    }
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Lojas do Mês
            </Typography>
            <List>
              {topStores.map((store, index) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "secondary.light" }}>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={store.name}
                    secondary={`${
                      store.orders
                    } pedidos - R$ ${store.revenue.toFixed(2)}`}
                  />
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
