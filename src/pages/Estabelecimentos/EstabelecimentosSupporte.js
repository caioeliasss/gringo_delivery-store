// Versão específica para o contexto de suporte com controle de roles
import React, { useState, useEffect } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { useSuporteAuth } from "../../contexts/SuporteAuthContext";
import EstabelecimentosPage from "./Estabelecimentos";

const EstabelecimentosSuporteWrapper = () => {
  const { supportUser, loading } = useSuporteAuth();

  // Se ainda está carregando, mostrar tela de loading
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Typography>Verificando permissões...</Typography>
      </Box>
    );
  }

  // Verificar se tem permissão para acessar estabelecimentos
  const hasEstabelecimentosPermission = () => {
    if (!supportUser?.role) return false;
    return (
      supportUser.role.includes("admin") ||
      supportUser.role.includes("general") ||
      supportUser.role.includes("finances")
    );
  };

  if (!hasEstabelecimentosPermission()) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h6" color="error">
          Acesso Negado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Você não tem permissão para acessar a gestão de estabelecimentos.
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Typography variant="caption">Suas permissões:</Typography>
          {supportUser?.role?.map((role) => (
            <Chip key={role} label={role} size="small" />
          ))}
        </Box>
      </Box>
    );
  }

  // Renderizar a página com o contexto de suporte
  return <EstabelecimentosPage supportUser={supportUser} />;
};

export default EstabelecimentosSuporteWrapper;
