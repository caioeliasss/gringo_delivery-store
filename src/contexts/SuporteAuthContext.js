// src/contexts/SuporteAuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api"; // Ajuste o caminho conforme sua estrutura

const SuporteAuthContext = createContext();

export const useSuporteAuth = () => {
  const context = useContext(SuporteAuthContext);
  if (!context) {
    throw new Error("useSuporteAuth must be used within SuporteAuthProvider");
  }
  return context;
};

export const SuporteAuthProvider = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const [supportUser, setSupportUser] = useState(null);
  const [isSuporteMember, setIsSuporteMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNotMember, setIsNotMember] = useState(false);
  // Função para verificar se é da equipe de suporte
  const checkIfIsSupportTeam = async () => {
    if (!currentUser?.uid) {
      setIsSuporteMember(false);
      setLoading(false);
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Verificando se é da equipe de suporte:", currentUser.uid);

      const response = await api.get(`/support/firebase/${currentUser.uid}`);

      if (response.data) {
        console.log("✅ Usuário é da equipe de suporte:", response.data);
        setSupportUser(response.data);
        setIsSuporteMember(true);
        setIsNotMember(false);
        return true;
      } else {
        console.log("❌ Usuário não é da equipe de suporte");
        setSupportUser(null);
        setIsSuporteMember(false);
        setIsNotMember(true);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao verificar usuário de suporte:", error);
      setError(error.message);
      setSupportUser(null);
      setIsSuporteMember(false);
      setIsNotMember(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verificar sempre que o usuário mudar
  useEffect(() => {
    if (currentUser) {
      checkIfIsSupportTeam();
    } else {
      setSupportUser(null);
      setIsSuporteMember(false);
      setLoading(false);
    }
  }, [currentUser]);

  // Função para fazer login como suporte
  const loginAsSupport = async (userData) => {
    try {
      setSupportUser(userData);
      setIsSuporteMember(true);
    } catch (error) {
      console.error("Erro ao fazer login como suporte:", error);
      setError(error.message);
    }
  };

  // Função para logout do suporte
  const logoutSupport = async () => {
    setSupportUser(null);
    setIsSuporteMember(false);
    setError(null);

    await logout();

    setTimeout(() => {
      window.location.href = "/login";
    }, 100);
  };

  const value = {
    supportUser,
    isSuporteMember,
    loading,
    error,
    checkIfIsSupportTeam,
    loginAsSupport,
    logoutSupport,
  };

  if (!isNotMember) {
    return (
      <SuporteAuthContext.Provider value={value}>
        {children}
      </SuporteAuthContext.Provider>
    );
  } else {
    return (
      <SuporteAuthContext.Provider value={value}>
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
            Você não tem acesso à área de suporte.
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
              onClick={logoutSupport}
            >
              Sair
            </button>
          </div>
        )}
      </SuporteAuthContext.Provider>
    );
  }
};
