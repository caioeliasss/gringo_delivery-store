import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Collapse,
  IconButton,
} from "@mui/material";
import {
  Receipt as OrdersIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as ProductsIcon,
  Logout as LogoutIcon,
  ReportProblem as OcorrenciasIcon,
  Chat as ChatIcon,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import NotificationIndicator from "../NotificationIndicator";
import ChatIndicator from "../ChatIndicator";

const SideDrawer = ({
  open,
  onClose,
  variant = "permanent",
  anchor = "left",
  width = 250,
  logoUrl = "https://i.imgur.com/8jOdfcO.png",
  logoAlt = "Gringo Delivery",
  logoHeight = 50,
  menuItems = [
    { path: "/dashboard", text: "Dashboard", icon: <DashboardIcon /> },
    { path: "/produtos", text: "Produtos", icon: <ProductsIcon /> },
    { path: "/pedidos", text: "Pedidos", icon: <OrdersIcon /> },
    { path: "/ocorrencias", text: "Ocorrências", icon: <OcorrenciasIcon /> },
    { path: "/chat", text: "Chat", icon: <ChatIcon /> },
  ],
  footerItems = [], // Remova valores padrão que dependem de funções internas
  title,
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Define a função de logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Se footerItems estiver vazio, crie o item padrão de logout
  const finalFooterItems =
    footerItems.length > 0
      ? footerItems
      : [
          {
            text: "Sair",
            icon: <LogoutIcon />,
            onClick: handleLogout,
            color: "error",
          },
        ];

  const isSelected = (path) => {
    return location.pathname === path;
  };

  const handleExpandMenu = (index) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const renderMenuItem = (item, index) => {
    // Se é um item expansível
    if (item.expandable && item.submenu) {
      return (
        <React.Fragment key={`expandable-menu-${index}`}>
          <ListItem
            button
            onClick={() => handleExpandMenu(index)}
            sx={{
              color: "text.primary",
              "&:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            {item.icon && (
              <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
            )}
            <ListItemText primary={item.text} />
            {expandedMenus[index] ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={expandedMenus[index]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.submenu.map((subItem, subIndex) => (
                <ListItem
                  key={`submenu-item-${index}-${subIndex}`}
                  button
                  component={Link}
                  to={subItem.path}
                  selected={isSelected(subItem.path)}
                  onClick={variant === "temporary" ? onClose : undefined}
                  sx={{
                    pl: 4,
                    color: "text.primary",
                    "&.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "white",
                      "&:hover": { bgcolor: "primary.dark" },
                    },
                    "&:hover": { bgcolor: "primary.light", color: "white" },
                  }}
                >
                  {subItem.icon && (
                    <ListItemIcon sx={{ color: "inherit" }}>
                      {subItem.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText primary={subItem.text} />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    // Item de menu normal
    return (
      <ListItem
        key={`menu-item-${index}`}
        button
        component={Link}
        to={item.path}
        selected={isSelected(item.path)}
        onClick={variant === "temporary" ? onClose : undefined}
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
        {item.icon && (
          <ListItemIcon sx={{ color: "inherit" }}>
            {/* Adicionar indicador de notificação se for o item de notificações */}
            {item.path === "/notificacoes" ? (
              <NotificationIndicator>{item.icon}</NotificationIndicator>
            ) : item.path === "/chat" ? (
              <ChatIndicator>{item.icon}</ChatIndicator>
            ) : (
              item.icon
            )}
          </ListItemIcon>
        )}
        <ListItemText primary={item.text} />
      </ListItem>
    );
  };

  const drawerItems = (
    <Box sx={{ width }}>
      <Box sx={{ p: 2, textAlign: "center" }}>
        <img src={logoUrl} style={{ height: logoHeight, marginBottom: 16 }} />
      </Box>
      <Divider />
      <List>{menuItems.map((item, index) => renderMenuItem(item, index))}</List>

      {finalFooterItems.length > 0 && (
        <>
          <Divider />
          <List>
            {finalFooterItems.map((item, index) => (
              <ListItem
                key={`footer-item-${index}`}
                button
                component={item.path ? Link : "div"}
                to={item.path}
                onClick={
                  item.onClick ||
                  (variant === "temporary" ? onClose : undefined)
                }
                sx={
                  item.color
                    ? {
                        "&:hover": {
                          bgcolor: `${item.color}.light`,
                          color: "white",
                        },
                      }
                    : {
                        "&:hover": { bgcolor: "primary.light", color: "white" },
                      }
                }
              >
                {item.icon && (
                  <ListItemIcon sx={{ color: "inherit" }}>
                    {item.icon}
                  </ListItemIcon>
                )}
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      variant={variant}
      sx={{
        width: width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: width,
          boxSizing: "border-box",
        },
      }}
    >
      {drawerItems}
    </Drawer>
  );
};

export default SideDrawer;
