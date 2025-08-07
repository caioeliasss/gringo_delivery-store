// Teste rápido para verificar se o WebSocket está funcionando
// Execute este script no console do navegador na página de notificações

const testWebSocketConnection = async () => {
  console.log("🧪 Iniciando teste de WebSocket...");

  // 1. Verificar variáveis de ambiente
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_SOCKET_URL: process.env.REACT_APP_SOCKET_URL,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    currentUrl: window.location.origin,
    userAgent: navigator.userAgent.substring(0, 100),
  };
  console.log("📋 Configurações:", envInfo);

  // 2. Determinar URL do servidor
  let serverUrl;
  if (process.env.NODE_ENV === "production") {
    serverUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
  } else {
    serverUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:8080";
  }

  console.log("🎯 URL que será usada:", serverUrl);

  // 3. Testar se o servidor está respondendo
  try {
    console.log("📡 Testando conectividade HTTP...");
    const response = await fetch(`${serverUrl}/api/socket/stats`);
    const stats = await response.json();
    console.log("✅ Servidor respondendo:", stats);
  } catch (error) {
    console.error("❌ Servidor não está respondendo:", error.message);
    console.log("💡 Possíveis causas:");
    console.log("   - Servidor backend não está rodando");
    console.log("   - URL incorreta");
    console.log("   - Problema de CORS");
    console.log("   - Firewall bloqueando conexão");
    return;
  }

  // 4. Testar Socket.io diretamente

  try {
    const response = await fetch(`${serverUrl}/api/socket/stats`);
    const stats = await response.json();
    console.log("📊 Stats do servidor:", stats);
  } catch (error) {
    console.error("❌ Servidor não está respondendo:", error);
    return;
  }

  // 3. Testar Socket.io
  const io = require("socket.io-client");
  const testSocket = io(serverUrl, {
    path: "/socket",
    auth: { firebaseUid: "test-user", userType: "support" },
    transports: ["polling", "websocket"],
  });

  testSocket.on("connect", () => {
    console.log("✅ Socket conectado:", testSocket.id);

    // Enviar mensagem de teste
    testSocket.emit("test_message", { message: "Hello from frontend!" });

    // Desconectar após 3 segundos
    setTimeout(() => {
      testSocket.disconnect();
      console.log("🔌 Socket desconectado");
    }, 3000);
  });

  testSocket.on("connect_error", (error) => {
    console.error("❌ Erro na conexão:", error);
  });
};

// Execute no console:
// testWebSocket();

console.log("Para testar o WebSocket, execute: testWebSocket()");
