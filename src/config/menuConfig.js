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
  DirectionsCar as CorridasIcon,
  Gavel as NegotiationsIcon,
  Assessment as ReportsIcon,
  Fastfood as IfoodIcon,
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
    path: "/mapa",
    text: "Mapa",
    icon: <MapIcon />,
  },
  {
    path: "/precificacao",
    text: "Precificação",
    icon: <PriceChangeIcon />,
  },
  {
    path: "/financeiro",
    text: "Financeiro",
    icon: <FinanceiroIcon />,
    requiredRole: "finances", // Requer role específico
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
    path: "/corridas",
    text: "Corridas",
    icon: <CorridasIcon />,
  },
  {
    path: "/occurrences",
    text: "Ocorrências",
    icon: <ReportProblemIcon />,
  },
  {
    text: "Relatórios",
    icon: <ReportsIcon />,
    expandable: true,
    submenu: [
      {
        path: "/relatorios/ocorrencias",
        text: "Relatório de Ocorrências",
        icon: <ReportProblemIcon />,
      },
    ],
  },
  {
    path: "/chat",
    text: "Chat",
    icon: <ChatIcon />,
  },
  {
    path: "/notifications",
    text: "Notificações",
    icon: <NotificationsIcon />,
  },
  {
    path: "/financeiro",
    text: "Financeiro",
    icon: <FinanceiroIcon />,
  },
  {
    path: "/settings",
    text: "Precificação",
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

export const STORE_MENU_ITEMS = [
  {
    path: "/dashboard",
    text: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    path: "/pedidos",
    text: "Pedidos",
    icon: <OrdersIcon />,
  },
  {
    path: "/corridas",
    text: "Corridas",
    icon: <CorridasIcon />,
  },
  {
    path: "/produtos",
    text: "Produtos",
    icon: <ProductsIcon />,
  },
  {
    path: "/financeiro",
    text: "Financeiro",
    icon: <FinanceiroIcon />,
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
    text: "Configurações",
    icon: <SettingsIcon />,
    expandable: true,
    submenu: [
      {
        path: "/settings/perfil",
        text: "Perfil",
        icon: <PersonIcon />,
      },
      {
        path: "/notifications",
        text: "Notificações",
        icon: <NotificationsIcon />,
      },
      {
        path: "/settings/ifood",
        text: "iFood",
        icon: <IfoodIcon />,
      },
      {
        path: "/negociacoes-ifood",
        text: "Negociações iFood",
        icon: <NegotiationsIcon />,
      },
    ],
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
  } else {
    return STORE_MENU_ITEMS;
  }

  // Fallback para desenvolvimento local ou outros casos
  return STORE_MENU_ITEMS;
};

// Função para filtrar itens de menu baseado nas roles do usuário de suporte
export const getFilteredSupportMenuItems = (supportUser = null) => {
  const baseMenuItems = getMenuItemsBySubdomain();

  // Se não há usuário de suporte ou não está no subdomínio de suporte, retorna o menu padrão
  if (!supportUser || window.location.hostname.split(".")[0] !== "suporte") {
    return baseMenuItems;
  }

  // Filtrar itens baseado nas roles do usuário
  return baseMenuItems.filter((item) => {
    // Se o item não tem role requerido, sempre mostrar
    if (!item.requiredRole) {
      return true;
    }

    // Verificar se o usuário tem a role necessária
    if (supportUser.role && Array.isArray(supportUser.role)) {
      return supportUser.role.includes(item.requiredRole);
    }

    // Se role é uma string, verificar se inclui a role necessária
    if (typeof supportUser.role === "string") {
      return supportUser.role.includes(item.requiredRole);
    }

    // Se não tem role definido, não mostrar itens que requerem role
    return false;
  });
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
export const getFilteredMenuItems = (
  userRole = "admin",
  excludePaths = [],
  supportUser = null
) => {
  // Se é área de suporte, usar a função específica
  if (window.location.hostname.split(".")[0] === "suporte" && supportUser) {
    return getFilteredSupportMenuItems(supportUser).filter(
      (item) => !excludePaths.includes(item.path)
    );
  }

  const currentMenuItems = getMenuItemsBySubdomain();
  return currentMenuItems.filter((item) => !excludePaths.includes(item.path));
};

export default SUPPORT_MENU_ITEMS;
