import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { UseStoreAuth } from "../contexts/StoreAuthContext";
import { CircularProgress, Box } from "@mui/material";
import Liberacao from "../pages/Store/AguardandoLiberacao/Liberacao";
import LiberacaoFinanceiro from "../pages/Store/AguardandoLiberacao/LiberacaoFinanceiro";
import api from "../services/api";

const StoreAccessControl = ({ children }) => {
  const { StoreUser, loading, isStoreMember } = UseStoreAuth();
  const [hasOverdueInvoices, setHasOverdueInvoices] = useState(false);
  const [checkingInvoices, setCheckingInvoices] = useState(true);

  // Verificar faturas vencidas quando StoreUser estiver disponível
  useEffect(() => {
    if (StoreUser?._id) {
      checkOverdueInvoices();
    } else {
      setCheckingInvoices(false);
    }
  }, [StoreUser]);

  const checkOverdueInvoices = async () => {
    try {
      setCheckingInvoices(true);
      const response = await api.get(`/billing/overdue/${StoreUser._id}`);
      setHasOverdueInvoices(response.data.length > 0);
    } catch (error) {
      console.error("Erro ao verificar faturas vencidas:", error);
      // Em caso de erro, assumir que não há faturas vencidas para não bloquear desnecessariamente
      setHasOverdueInvoices(false);
    } finally {
      setCheckingInvoices(false);
    }
  };

  // Mostrar loading enquanto carrega dados
  if (loading || checkingInvoices) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Se não é um membro da loja, redirecionar para login
  if (!isStoreMember || !StoreUser) {
    return <Navigate to="/login" replace />;
  }

  // Se freeToNavigate é false, verificar o motivo
  if (hasOverdueInvoices) {
    return <LiberacaoFinanceiro />;
  }
  if (StoreUser.freeToNavigate === false) {
    // Se tem faturas vencidas, mostrar página financeira
    // Caso contrário, mostrar página de aguardo geral
    return <Liberacao />;
  }

  // Se tudo ok, mostrar o componente filho
  return children;
};

export default StoreAccessControl;
