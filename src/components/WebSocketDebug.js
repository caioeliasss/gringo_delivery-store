import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
} from "@mui/material";
import io from "socket.io-client";

const WebSocketDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Coleta informações do ambiente na inicialização
    const info = {
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_SOCKET_URL: process.env.REACT_APP_SOCKET_URL,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL,
      currentOrigin: window.location.origin,
      href: window.location.href,
      userAgent: navigator.userAgent.substring(0, 50),
      isSecureContext: window.isSecureContext,
    };

    // Determinar URL que seria usada
    let serverUrl;
    if (process.env.NODE_ENV === "production") {
      serverUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    } else {
      serverUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:8080";
    }

    info.calculatedServerUrl = serverUrl;
    setDebugInfo(info);
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);

    const serverUrl = debugInfo.calculatedServerUrl;
    const results = [];

    try {
      // Teste 1: HTTP
      results.push("🧪 Iniciando testes...");
      results.push(`🎯 Testando: ${serverUrl}`);

      try {
        const response = await fetch(`${serverUrl}/api/socket/stats`);
        const data = await response.json();
        results.push("✅ HTTP OK: Servidor respondendo");
        results.push(`📊 Stats: ${JSON.stringify(data, null, 2)}`);
      } catch (error) {
        results.push(`❌ HTTP ERRO: ${error.message}`);
        results.push("💡 Servidor pode não estar rodando ou URL incorreta");
        setTestResult(results);
        setLoading(false);
        return;
      }

      // Teste 2: Socket.io
      results.push("🔌 Testando Socket.io...");

      const testSocket = io(serverUrl, {
        path: "/socket",
        auth: { firebaseUid: "debug-test", userType: "support" },
        transports: ["polling", "websocket"],
        timeout: 5000,
        reconnection: false,
      });

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          results.push("⏰ Socket.io TIMEOUT (5s)");
          testSocket.disconnect();
          resolve();
        }, 5000);

        testSocket.on("connect", () => {
          clearTimeout(timeout);
          results.push("✅ Socket.io CONECTADO!");
          results.push(`🆔 Socket ID: ${testSocket.id}`);
          results.push(`🚀 Transport: ${testSocket.io.engine.transport.name}`);

          setTimeout(() => {
            testSocket.disconnect();
            results.push("🔌 Socket desconectado");
            resolve();
          }, 1000);
        });

        testSocket.on("connect_error", (error) => {
          clearTimeout(timeout);
          results.push("❌ Socket.io ERRO:");
          results.push(`   Tipo: ${error.type}`);
          results.push(`   Mensagem: ${error.message}`);
          results.push(`   Descrição: ${error.description}`);

          if (error.type === "TransportError") {
            results.push("💡 Possíveis causas:");
            results.push("   - Servidor backend não rodando");
            results.push("   - CORS mal configurado");
            results.push("   - Firewall bloqueando");
            results.push("   - Path /socket incorreto");
          }

          resolve();
        });
      });
    } catch (error) {
      results.push(`❌ ERRO GERAL: ${error.message}`);
    }

    setTestResult(results);
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🔧 WebSocket Debug
      </Typography>

      {/* Informações do Ambiente */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📋 Informações do Ambiente
        </Typography>

        {debugInfo && (
          <TableContainer>
            <Table size="small">
              <TableBody>
                {Object.entries(debugInfo).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: "bold" }}>{key}</TableCell>
                    <TableCell
                      sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
                    >
                      {String(value) || "undefined"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Botão de Teste */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={testConnection}
          disabled={loading}
        >
          {loading ? "🔄 Testando..." : "🧪 Testar Conexão"}
        </Button>
      </Box>

      {/* Resultados */}
      {testResult && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Resultados do Teste
          </Typography>

          <Box
            sx={{
              fontFamily: "monospace",
              fontSize: "0.875rem",
              backgroundColor: "grey.900",
              color: "white",
              p: 2,
              borderRadius: 1,
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {testResult.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </Box>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Instruções */}
      <Alert severity="info">
        <Typography variant="subtitle2" gutterBottom>
          💡 Como usar:
        </Typography>
        <Typography variant="body2" component="div">
          1. Clique em "Testar Conexão" para diagnosticar problemas
          <br />
          2. Verifique se a "calculatedServerUrl" está correta
          <br />
          3. Se HTTP falhar, o servidor backend não está rodando
          <br />
          4. Se Socket.io falhar, verifique configurações de CORS
          <br />
        </Typography>
      </Alert>
    </Box>
  );
};

export default WebSocketDebug;
