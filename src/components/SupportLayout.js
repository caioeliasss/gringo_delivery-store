// src/components/SupportLayout.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import SideDrawer from "./SideDrawer/SideDrawer";
import NotificationIndicator from "./NotificationIndicator";
import { useAuth } from "../contexts/AuthContext";
import {
  SUPPORT_MENU_ITEMS,
  createSupportFooterItems,
} from "../config/menuConfig";

const SupportLayout = ({ children, title = "Gringo Delivery" }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = SUPPORT_MENU_ITEMS;
  const footerItems = createSupportFooterItems(handleLogout);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* AppBar para dispositivos móveis */}
      {isMobile && (
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontWeight: "bold" }}
            >
              {title}
            </Typography>
            {/* Indicador de notificação sempre visível na AppBar móvel */}
            <NotificationIndicator
              onClick={() => navigate("/notificacoes")}
              sx={{ color: "inherit" }}
            />
          </Toolbar>
        </AppBar>
      )}

      {/* SideDrawer para desktop / Drawer temporário para mobile */}
      <SideDrawer
        open={isMobile ? drawerOpen : true}
        onClose={toggleDrawer(false)}
        variant={isMobile ? "temporary" : "permanent"}
        menuItems={menuItems}
        footerItems={footerItems}
        title={title}
        logoUrl="https://i.imgur.com/8jOdfcO.png"
        logoAlt="Gringo Delivery"
        logoHeight={50}
        width={250}
      />

      {/* Conteúdo principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: isMobile ? 0 : "2px",
          mt: isMobile ? "64px" : 0,
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SupportLayout;
