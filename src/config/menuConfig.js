import React from "react";
import {
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  ReportProblem as ReportProblemIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  Logout as LogoutIcon,
  Inventory as ProductsIcon,
  PriceChange as PriceChangeIcon,
  AttachMoney as FinanceiroIcon,
  Settings as SettingsIcon,
  Map as MapIcon,
  Support as SupportIcon,
  DriveEta as DriversIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";

// Configuração centralizada dos itens de menu para o sistema de suporte
const ORIGINAL_SUPPORT_MENU_ITEMS = [
  {
    path: "/dashboard",
    text: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    path: "/ocorrencias",
    text: "Ocorrências",
    icon: <ReportProblemIcon />,
  },
  {
    path: "/notificacoes",
    text: "Notificações",
    icon: <NotificationsIcon />,
  },
  {
    path: "/chat",
    text: "Chat",
    icon: <ChatIcon />,
  },
  {
    path: "/motoboys",
    text: "Entregadores",
    icon: <PersonIcon />,
  },
  {
    path: "/estabelecimentos",
    text: "Estabelecimentos",
    icon: <StoreIcon />,
  },
  {
    path: "/pedidos",
    text: "Pedidos",
    icon: <OrdersIcon />,
  },
  {
    path: "/precificacao",
    text: "Precificação",
    icon: <PriceChangeIcon />,
  },
];

export const ADMIN_MENU_ITEMS = [
  {
    path: "/dashboard",
    text: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    path: "/stores",
    text: "Estabelecimentos",
    icon: <StoreIcon />,
  },
  {
    path: "/pedidos",
    text: "Pedidos",
    icon: <OrdersIcon />,
  },
  {
    path: "/drivers",
    text: "Entregadores",
    icon: <DriversIcon />,
  },
  {
    path: "/occurrences",
    text: "Ocorrências",
    icon: <ReportProblemIcon />,
  },
  {
    path: "/chat",
    text: "Chat",
    icon: <ChatIcon />,
  },
  {
    path: "/financeiro",
    text: "Financeiro",
    icon: <FinanceiroIcon />,
  },
  {
    path: "/settings",
    text: "Configurações",
    icon: <SettingsIcon />,
  },
  {
    path: "/mapa",
    text: "Mapa",
    icon: <MapIcon />,
  },
  {
    path: "/suporte",
    text: "Equipe de Suporte",
    icon: <SupportIcon />,
  },
];

// Função para detectar o subdomínio e retornar o menu apropriado
const getMenuItemsBySubdomain = () => {
  const hostname = window.location.hostname;
  const subdomain = hostname.split(".")[0];

  if (subdomain === "admin") {
    return ADMIN_MENU_ITEMS;
  } else if (subdomain === "suporte") {
    return ORIGINAL_SUPPORT_MENU_ITEMS;
  }

  // Fallback para desenvolvimento local ou outros casos
  return ORIGINAL_SUPPORT_MENU_ITEMS;
};

// Export dinâmico baseado no subdomínio
export const SUPPORT_MENU_ITEMS = getMenuItemsBySubdomain();

// Função para criar itens de rodapé padrão (com logout)
export const createSupportFooterItems = (handleLogout) => [
  {
    text: "Sair",
    icon: <LogoutIcon />,
    onClick: handleLogout,
    color: "error",
  },
];

// Função para criar itens de rodapé do admin
export const createAdminFooterItems = (handleLogout) => [
  {
    text: "Sair",
    icon: <LogoutIcon />,
    onClick: handleLogout,
    color: "error",
  },
];

// Função para filtrar menu items baseado em permissões (caso necessário no futuro)
export const getFilteredMenuItems = (userRole = "admin", excludePaths = []) => {
  const currentMenuItems = getMenuItemsBySubdomain();
  return currentMenuItems.filter((item) => !excludePaths.includes(item.path));
};

export default SUPPORT_MENU_ITEMS;
