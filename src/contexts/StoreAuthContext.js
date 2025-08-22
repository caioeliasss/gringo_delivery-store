// src/contexts/StoreAuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const StoreAuthContext = createContext();

export const UseStoreAuth = () => {
  const context = useContext(StoreAuthContext);
  if (!context) {
    throw new Error("UseStoreAuth must be used within StoreAuthProvider");
  }
  return context;
};

export const StoreAuthProvider = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const [StoreUser, setStoreUser] = useState(null);
  const [isStoreMember, setIsStoreMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Função para verificar se é um estabelecimento
  const checkIfIsStore = async () => {
    if (isLoggingOut) {
      return false;
    }

    if (!currentUser?.uid) {
      setIsStoreMember(false);
      setLoading(false);
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Verificando se é um estabelecimento:", currentUser.uid);

      const response = await api.get(`/stores/firebase/${currentUser.uid}`);

      if (response.data) {
        console.log("✅ Usuário é um estabelecimento:", response.data);
        setStoreUser(response.data);
        setIsStoreMember(true);
        return true;
      } else {
        console.log("❌ Usuário não é um estabelecimento");
        setStoreUser(null);
        setIsStoreMember(false);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao verificar estabelecimento:", error);
      if (error.response?.status === 404) {
        console.log("🔍 Estabelecimento não encontrado no banco de dados");
        setStoreUser(null);
        setIsStoreMember(false);
      } else {
        setError(error.message);
        setStoreUser(null);
        setIsStoreMember(false);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Executar verificação quando currentUser mudar
  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      if (isMounted && !isLoggingOut) {
        await checkIfIsStore();
      }
    };

    runCheck();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, isLoggingOut]);

  // Função de logout
  const logoutStore = async () => {
    try {
      setIsLoggingOut(true);
      setStoreUser(null);
      setIsStoreMember(false);
      setError(null);
      await logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      setError("Erro ao fazer logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Função para atualizar dados do estabelecimento
  const updateStoreUser = (newData) => {
    setStoreUser((prev) => ({
      ...prev,
      ...newData,
    }));
  };

  // Função para recarregar dados do estabelecimento
  const reloadStoreData = async () => {
    if (currentUser?.uid && !isLoggingOut) {
      await checkIfIsStore();
    }
  };

  const value = {
    StoreUser,
    isStoreMember,
    loading,
    error,
    logoutStore,
    updateStoreUser,
    reloadStoreData,
    checkIfIsStore,
  };

  return (
    <StoreAuthContext.Provider value={value}>
      {children}
    </StoreAuthContext.Provider>
  );
};

export default StoreAuthContext;
