// src/contexts/AdminAuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const AdminAuthContext = createContext();

export const UseAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("UseAdminAuth must be used within AdminAuthProvider");
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const [AdminUser, setAdminUser] = useState(null);
  const [isAdminMember, setIsAdminMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Função para verificar se é da equipe de Admin
  const checkIfIsAdminTeam = async () => {
    if (isLoggingOut) {
      return false;
    }

    if (!currentUser?.uid) {
      setIsAdminMember(false);
      setLoading(false);
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Verificando se é da equipe de Admin:", currentUser.uid);

      const response = await api.get(`/admin/firebase/${currentUser.uid}`);

      if (response.data) {
        console.log("✅ Usuário é da equipe de Admin:", response.data);
        setAdminUser(response.data);
        setIsAdminMember(true);
        return true;
      } else {
        console.log("❌ Usuário não é da equipe de Admin");
        setAdminUser(null);
        setIsAdminMember(false);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao verificar usuário de Admin:", error);
      setError(error.message);
      setAdminUser(null);
      setIsAdminMember(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verificar sempre que o usuário mudar
  useEffect(() => {
    if (isLoggingOut) {
      return;
    }

    if (currentUser) {
      checkIfIsAdminTeam();
    } else {
      setAdminUser(null);
      setIsAdminMember(false);
      setLoading(false);
    }
  }, [currentUser, isLoggingOut]);

  // Função para fazer login como Admin
  const loginAsAdmin = async (userData) => {
    try {
      setAdminUser(userData);
      setIsAdminMember(true);
    } catch (error) {
      console.error("Erro ao fazer login como Admin:", error);
      setError(error.message);
    }
  };

  // Função para logout do Admin
  const logoutAdmin = async () => {
    try {
      console.log("🚪 Iniciando logout do admin...");

      setIsLoggingOut(true);
      setAdminUser(null);
      setIsAdminMember(false);
      setError(null);

      await logout();

      console.log("✅ Logout realizado com sucesso");
      window.location.href = "/login";
    } catch (error) {
      console.error("❌ Erro ao fazer logout:", error);
      window.location.href = "/login";
    }
  };

  const value = {
    AdminUser,
    isAdminMember,
    loading,
    error,
    isLoggingOut,
    checkIfIsAdminTeam,
    loginAsAdmin,
    logoutAdmin,
  };

  // ADICIONAR: Verificação se não está logado
  if (!currentUser && !loading && !isLoggingOut) {
    return (
      <AdminAuthContext.Provider value={value}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "10px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                color: "#6c757d",
                marginBottom: "20px",
              }}
            >
              🔐 Faça Login
            </h2>
            <p
              style={{
                color: "#666",
                marginBottom: "30px",
              }}
            >
              Você precisa estar logado para acessar a área administrativa.
            </p>
            <button
              style={{
                background: "#007bff",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
              onClick={() => (window.location.href = "/login")}
            >
              🚪 Ir para Login
            </button>
          </div>
        </div>
      </AdminAuthContext.Provider>
    );
  }

  // ADICIONAR: Loading durante logout
  if (isLoggingOut) {
    return (
      <AdminAuthContext.Provider value={value}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f5f5f5",
          }}
        >
          <div>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <p
              style={{
                marginTop: "20px",
                fontSize: "18px",
                color: "#666",
                textAlign: "center",
              }}
            >
              Fazendo logout...
            </p>
          </div>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      </AdminAuthContext.Provider>
    );
  }

  // ADICIONAR: Loading inicial
  if (loading) {
    return (
      <AdminAuthContext.Provider value={value}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f5f5f5",
          }}
        >
          <div>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <p
              style={{
                marginTop: "20px",
                fontSize: "18px",
                color: "#666",
                textAlign: "center",
              }}
            >
              Verificando permissões de administrador...
            </p>
          </div>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      </AdminAuthContext.Provider>
    );
  }

  // ADICIONAR: Se é admin, mostrar conteúdo
  if (isAdminMember) {
    return (
      <AdminAuthContext.Provider value={value}>
        {children}
      </AdminAuthContext.Provider>
    );
  }

  // ADICIONAR: Se não é admin, mostrar tela de acesso negado
  return (
    <AdminAuthContext.Provider value={value}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "10px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          <h2
            style={{
              color: "#dc3545",
              marginBottom: "20px",
            }}
          >
            🚫 Acesso Negado
          </h2>
          <p
            style={{
              color: "#666",
              marginBottom: "30px",
              lineHeight: "1.5",
            }}
          >
            Você não tem permissões para acessar a área administrativa.
            <br />
            <small>Usuário: {currentUser?.email}</small>
          </p>

          {error && (
            <div
              style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
            onClick={logoutAdmin}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "🔄 Saindo..." : "🚪 Sair e Tentar Outro Login"}
          </button>
        </div>
      </div>
    </AdminAuthContext.Provider>
  );
};
