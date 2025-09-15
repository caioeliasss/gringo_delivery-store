// src/hooks/useReportPermissions.js
import { useMemo } from "react";
import { useSuporteAuth } from "../contexts/SuporteAuthContext";

// Configuração de permissões para relatórios
export const REPORT_PERMISSIONS = {
  financeiro: ["admin", "finances"],
  pedidos: ["admin", "general", "logistics"],
  corridas: ["admin", "general", "logistics"],
  ocorrencias: ["admin", "general", "logistics"],
  chat: ["admin", "general"],
  estabelecimentos: ["admin", "general", "finances"],
  entregadores: ["admin", "general", "logistics"],
};

export const useReportPermissions = () => {
  const { supportUser } = useSuporteAuth();

  const permissions = useMemo(() => {
    if (!supportUser?.role) {
      return {};
    }

    const userRoles = Array.isArray(supportUser.role)
      ? supportUser.role
      : [supportUser.role];

    const hasPermission = (reportType) => {
      const requiredRoles = REPORT_PERMISSIONS[reportType];
      return requiredRoles.some((role) => userRoles.includes(role));
    };

    return {
      financeiro: hasPermission("financeiro"),
      pedidos: hasPermission("pedidos"),
      corridas: hasPermission("corridas"),
      ocorrencias: hasPermission("ocorrencias"),
      chat: hasPermission("chat"),
      estabelecimentos: hasPermission("estabelecimentos"),
      entregadores: hasPermission("entregadores"),
      isAdmin: userRoles.includes("admin"),
      userRoles,
    };
  }, [supportUser]);

  return permissions;
};

// Hook para verificar se o usuário tem acesso a pelo menos um relatório
export const useHasAnyReportAccess = () => {
  const permissions = useReportPermissions();

  return useMemo(() => {
    return Object.values(permissions).some(
      (permission) => typeof permission === "boolean" && permission
    );
  }, [permissions]);
};
