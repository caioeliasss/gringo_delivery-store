# Sistema de WebSocket - Loja

Este sistema implementa comunicação em tempo real entre a loja e os motoboys usando WebSockets.

## 📋 Funcionalidades

### Eventos que a Loja Recebe:

1. **`orderAcceptedByMotoboy`** - Quando motoboy aceita um pedido
2. **`orderDeclinedByMotoboy`** - Quando motoboy recusa um pedido
3. **`orderStatusUpdatedByMotoboy`** - Quando motoboy atualiza status (em_entrega, entregue, etc.)
4. **`motoboyAssigned`** - Quando um motoboy é atribuído ao pedido
5. **`motoboyLocationUpdated`** - Localização do motoboy em tempo real
6. **`orderDelivered`** - Quando pedido é marcado como entregue
7. **`storeNotification`** - Notificações gerais para a loja

### Eventos que a Loja Envia:

1. **`orderReady`** - Confirma que pedido está pronto para entrega
2. **`updateOrderStatus`** - Atualiza status do pedido
3. **`cancelOrder`** - Cancela um pedido

## 🚀 Como Usar

### 1. Usando o Hook (Recomendado)

```javascript
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../contexts/AuthContext";

const MeuComponente = () => {
  const { currentUser } = useAuth();
  const {
    isConnected,
    isConnecting,
    on,
    updateOrderStatus,
    confirmOrderReady,
  } = useSocket(currentUser?.uid, "store");

  useEffect(() => {
    // Escutar evento de pedido aceito
    const cleanup = on("orderAcceptedByMotoboy", (data) => {
      console.log("Pedido aceito:", data);
      // Atualizar UI
    });

    return cleanup; // Limpar listener
  }, [on]);

  const handleCallMotoboy = (orderId, motoboyId) => {
    confirmOrderReady(orderId, motoboyId);
  };

  return <div>Status: {isConnected ? "Conectado" : "Desconectado"}</div>;
};
```

### 2. Usando Diretamente o Service

```javascript
import socketService from "../services/socketService";

// Conectar
await socketService.connect(firebaseUid, "store");

// Escutar eventos
socketService.on("orderAcceptedByMotoboy", (data) => {
  console.log("Pedido aceito:", data);
});

// Enviar eventos
socketService.confirmOrderReady(orderId, motoboyId);
socketService.updateOrderStatus(orderId, "em_preparo");

// Desconectar
socketService.disconnect();
```

## 📊 Status de Conexão

O componente de pedidos já inclui um indicador visual de conexão no cabeçalho:

- 🟢 **Conectado**: Socket funcionando normalmente
- 🔴 **Desconectado**: Problema na conexão

## 🔄 Fluxo de Atualizações Automáticas

### Quando um motoboy aceita um pedido:

1. Motoboy clica em "Aceitar" no app
2. Loja recebe evento `orderAcceptedByMotoboy`
3. Status do pedido muda automaticamente para "em_preparo"
4. UI da loja atualiza em tempo real
5. Dialog de "Buscando Motoboy" fecha automaticamente

### Quando motoboy atualiza status:

1. Motoboy marca como "Em Entrega" ou "Entregue"
2. Loja recebe evento `orderStatusUpdatedByMotoboy`
3. Status na lista de pedidos atualiza automaticamente
4. Notificação visual aparece para o usuário da loja

## 🛠️ Configuração

### Variáveis de Ambiente

Adicione no `.env`:

```
REACT_APP_SOCKET_URL=http://localhost:8080
```

### Dependências

O sistema usa `socket.io-client`. Instale se necessário:

```bash
npm install socket.io-client
```

## 🐛 Debug

Para ativar logs detalhados:

```javascript
// No console do navegador
localStorage.setItem("debug", "socket.io-client:*");
```

Ou use o método de teste:

```javascript
socketService.testConnection();
```

## 📱 Integração com o App do Motoboy

O app do motoboy deve enviar os seguintes eventos para que a loja receba:

- `acceptOrder` → Gera `orderAcceptedByMotoboy` para loja
- `orderStatusUpdate` → Gera `orderStatusUpdatedByMotoboy` para loja
- `locationUpdate` → Gera `motoboyLocationUpdated` para loja

## ⚠️ Tratamento de Erros

O sistema tem reconexão automática:

- Máximo 5 tentativas de reconexão
- Delay exponencial entre tentativas
- Fallback para polling se WebSocket falhar

## 🔧 Manutenção

### Logs Importantes:

- `🏪 Socket da loja conectado` - Conexão estabelecida
- `✅ Pedido aceito pelo motoboy` - Evento recebido
- `📊 Status atualizado pelo motoboy` - Status atualizado
- `❌ Erro de conexão socket` - Problema na conexão

### Monitoramento:

Use o hook ou verifique `socketService.connected` para monitorar o status da conexão.
