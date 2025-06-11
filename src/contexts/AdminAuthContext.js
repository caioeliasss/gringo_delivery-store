// src/contexts/AdminAuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api"; // Ajuste o caminho conforme sua estrutura

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
  const [IsNotMember, setIsNotMember] = useState(false);
  // Função para verificar se é da equipe de Admin
  const checkIfIsAdminTeam = async () => {
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
        setIsNotMember(false);
        return true;
      } else {
        console.log("❌ Usuário não é da equipe de Admin");
        setAdminUser(null);
        setIsAdminMember(false);
        setIsNotMember(true);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao verificar usuário de Admin:", error);
      setError(error.message);
      setAdminUser(null);
      setIsAdminMember(false);
      setIsNotMember(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verificar sempre que o usuário mudar
  useEffect(() => {
    if (currentUser) {
      checkIfIsAdminTeam();
    } else {
      setAdminUser(null);
      setIsAdminMember(false);
      setLoading(false);
    }
  }, [currentUser]);

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
    setAdminUser(null);
    setIsAdminMember(false);
    setError(null);

    await logout();

    setTimeout(() => {
      window.location.href = "/login";
    }, 100);
  };

  const value = {
    AdminUser,
    isAdminMember,
    loading,
    error,
    checkIfIsAdminTeam,
    loginAsAdmin,
    logoutAdmin,
  };

  if (!IsNotMember) {
    return (
      <AdminAuthContext.Provider value={value}>
        {children}
      </AdminAuthContext.Provider>
    );
  } else {
    return (
      <AdminAuthContext.Provider value={value}>
        {loading ? (
          <div>Carregando...</div>
        ) : (
          <div
            style={{
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
              flexDirection: "column",
              height: "100vh",
            }}
          >
            Você não tem acesso à área de admin.
            <button
              style={{
                background: "red",
                color: "white",
                border: "none",
                marginTop: "10px",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
              onClick={logoutAdmin}
            >
              Sair
            </button>
          </div>
        )}
      </AdminAuthContext.Provider>
    );
  }
};
