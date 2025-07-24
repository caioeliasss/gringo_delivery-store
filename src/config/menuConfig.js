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
} from "@mui/icons-material";

// Configuração centralizada dos itens de menu para o sistema de suporte
export const SUPPORT_MENU_ITEMS = [
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
];

// Função para criar itens de rodapé padrão (com logout)
export const createSupportFooterItems = (handleLogout) => [
  {
    text: "Sair",
    icon: <LogoutIcon />,
    onClick: handleLogout,
    color: "error",
  },
];

// Função para filtrar menu items baseado em permissões (caso necessário no futuro)
export const getFilteredMenuItems = (userRole = "admin", excludePaths = []) => {
  return SUPPORT_MENU_ITEMS.filter((item) => !excludePaths.includes(item.path));
};

export default SUPPORT_MENU_ITEMS;
