import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  ShoppingCart as OrdersIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  TwoWheeler as MotoboyIcon,
  ReportProblem as OccurrenceIcon,
  AttachMoney as RevenueIcon,
  TrendingUp,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Map as MapIcon,
} from "@mui/icons-material";
import { UseAdminAuth } from "../contexts/AdminAuthContext";

const DrawerAdmin = () => {
  const { logoutAdmin } = UseAdminAuth();
  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, textAlign: "center" }}>
        <img
          src="https://i.imgur.com/8jOdfcO.png"
          alt="Gringo Delivery"
          style={{ height: 50, marginBottom: 16 }}
        />
        <Typography
          variant="h6"
          sx={{ color: "primary.main", fontWeight: "bold" }}
        >
          Painel Administrativo
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem
          button
          component={Link}
          to="/dashboard"
          selected={true}
          sx={{
            color: "text.primary",
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            },
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/stores"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <StoreIcon />
          </ListItemIcon>
          <ListItemText primary="Lojas" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/orders"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <OrdersIcon />
          </ListItemIcon>
          <ListItemText primary="Pedidos" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/drivers"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <MotoboyIcon />
          </ListItemIcon>
          <ListItemText primary="Motoboys" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/occurrences"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <OccurrenceIcon />
          </ListItemIcon>
          <ListItemText primary="Ocorrências" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/financeiro"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <ReportIcon />
          </ListItemIcon>
          <ListItemText primary="Financeiro" />
        </ListItem>

        <ListItem
          button
          component={Link}
          to="/settings"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Configurações" />
        </ListItem>
        <ListItem
          button
          component={Link}
          to="/mapa"
          sx={{
            color: "text.primary",
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <MapIcon />
          </ListItemIcon>
          <ListItemText primary="Mapa" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem
          button
          onClick={handleLogout}
          sx={{ "&:hover": { bgcolor: "error.light", color: "white" } }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItem>
      </List>
    </Box>
  );
};

export default DrawerAdmin;
