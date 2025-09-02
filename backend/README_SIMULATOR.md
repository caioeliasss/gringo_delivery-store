# 🔄 Simulador de Polling iFood - Handshake Events

Este simulador permite testar o sistema de negociação do iFood sem depender da API real. Ele gera eventos fictícios de `HANDSHAKE_DISPUTE` e `HANDSHAKE_SETTLEMENT` que são processados como se fossem eventos reais vindos do polling.

## 📁 Arquivos do Simulador

### 1. `simulate-ifood-polling.js`

Script principal do simulador com múltiplas funcionalidades.

### 2. `routes/testHandshakeRoutes.js`

Rotas HTTP para simular eventos via API REST.

### 3. `test-simulation-curl.sh`

Script CURL para testar os endpoints de simulação.

## 🚀 Como Usar

### Método 1: Script Node.js (Recomendado)

```bash
# Executar uma simulação simples
node simulate-ifood-polling.js random

# Simular dispute urgente (expira em 1 hora)
node simulate-ifood-polling.js urgent

# Simular dispute crítico (expira em 15 minutos)
node simulate-ifood-polling.js critical

# Simular fluxo completo (dispute → settlement)
node simulate-ifood-polling.js complete

# Iniciar polling contínuo (simula eventos periodicamente)
node simulate-ifood-polling.js continuous

# Verificar dados no banco
node simulate-ifood-polling.js check

# Limpar dados de teste
node simulate-ifood-polling.js clear
```

### Método 2: API REST

Primeiro, adicione as rotas de teste ao seu `server.js`:

```javascript
// Adicionar no server.js
const testHandshakeRoutes = require("./routes/testHandshakeRoutes");
app.use("/api/test/handshake", testHandshakeRoutes);
```

Depois use os endpoints:

```bash
# Executar script de testes
bash test-simulation-curl.sh

# Ou testar individualmente:
curl -X POST "http://localhost:8080/api/test/handshake/dispute" \
  -H "Content-Type: application/json" \
  -d '{"storeFirebaseUid": "test_store_123"}'
```

## 📊 Tipos de Simulação

### 1. Dispute Simples

```bash
node simulate-ifood-polling.js random store123
```

- Gera 1 evento HANDSHAKE_DISPUTE aleatório
- Tipos: QUALITY, MISSING_ITEMS, WRONG_ITEMS, DELAY, OTHER
- Expira em 24 horas (padrão)

### 2. Dispute Urgente

```bash
node simulate-ifood-polling.js urgent store123
```

- Gera dispute que expira em 1 hora
- Aparece como "URGENTE" na interface
- Ideal para testar notificações de prioridade

### 3. Dispute Crítico

```bash
node simulate-ifood-polling.js critical store123
```

- Gera dispute que expira em 15 minutos
- Aparece como "CRÍTICO" na interface
- Ideal para testar cenários de emergência

### 4. Fluxo Completo

```bash
node simulate-ifood-polling.js complete store123
```

- Gera dispute seguido de settlement
- Simula negociação completa
- Teste ideal para validar todo o fluxo

### 5. Polling Contínuo

```bash
node simulate-ifood-polling.js continuous store123
```

- Simula eventos a cada 30 segundos
- 50% de chance de ter eventos a cada ciclo
- Simula ambiente real de produção

## 🔧 Configuração das Rotas

Para usar os endpoints REST, adicione no seu `server.js`:

```javascript
// Importar rotas de teste (apenas em desenvolvimento)
if (process.env.NODE_ENV === "development") {
  const testHandshakeRoutes = require("./routes/testHandshakeRoutes");
  app.use("/api/test/handshake", testHandshakeRoutes);
  console.log("🧪 Rotas de teste habilitadas");
}
```

## 📋 Endpoints Disponíveis

| Método | Endpoint                               | Descrição                    |
| ------ | -------------------------------------- | ---------------------------- |
| POST   | `/api/test/handshake/dispute`          | Cria dispute simples         |
| POST   | `/api/test/handshake/urgent-dispute`   | Cria dispute urgente (1h)    |
| POST   | `/api/test/handshake/critical-dispute` | Cria dispute crítico (15min) |
| POST   | `/api/test/handshake/settlement`       | Cria settlement              |
| POST   | `/api/test/handshake/complete-flow`    | Fluxo completo               |
| POST   | `/api/test/handshake/batch-events`     | Múltiplos eventos            |
| GET    | `/api/test/handshake/status`           | Status dos dados             |
| DELETE | `/api/test/handshake/cleanup`          | Limpar dados de teste        |

## 📝 Exemplos de Uso

### Criar Dispute Customizado

```bash
curl -X POST "http://localhost:8080/api/test/handshake/dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "storeFirebaseUid": "store123",
    "customData": {
      "disputeType": "QUALITY",
      "description": "Pizza chegou fria",
      "customerComplaint": "A pizza estava gelada quando chegou",
      "hoursToExpire": 2
    }
  }'
```

### Criar Settlement

```bash
curl -X POST "http://localhost:8080/api/test/handshake/settlement" \
  -H "Content-Type: application/json" \
  -d '{
    "disputeId": "dispute_123456",
    "storeFirebaseUid": "store123",
    "customData": {
      "settlementResult": "ACCEPTED"
    }
  }'
```

### Verificar Status

```bash
curl -X GET "http://localhost:8080/api/test/handshake/status"
```

### Limpar Dados de Teste

```bash
curl -X DELETE "http://localhost:8080/api/test/handshake/cleanup"
```

## 🎯 Cenários de Teste Recomendados

### 1. Teste Básico de Funcionalidade

```bash
# 1. Criar alguns disputes
node simulate-ifood-polling.js random
node simulate-ifood-polling.js urgent
node simulate-ifood-polling.js critical

# 2. Verificar na interface web
# 3. Responder aos disputes
# 4. Verificar histórico
```

### 2. Teste de Performance

```bash
# Gerar múltiplos eventos
curl -X POST "http://localhost:8080/api/test/handshake/batch-events" \
  -H "Content-Type: application/json" \
  -d '{"disputeCount": 10, "settlementCount": 5}'
```

### 3. Teste de Notificações

```bash
# 1. Criar dispute crítico
node simulate-ifood-polling.js critical

# 2. Verificar se notificações aparecem
# 3. Testar diferentes tipos de resposta
```

### 4. Teste de Fluxo Completo

```bash
# 1. Simular negociação completa
node simulate-ifood-polling.js complete

# 2. Verificar todos os status
# 3. Validar dados no banco
```

## 🗄️ Dados Gerados

### Dispute Example:

```javascript
{
  eventId: "event_dispute_1725298800000_123",
  disputeId: "dispute_1725298800000_456",
  orderId: "order_1725298800000_789",
  disputeType: "QUALITY",
  description: "Produto chegou com qualidade abaixo do esperado",
  expiresAt: "2025-09-02T15:30:00Z",
  status: "PENDING"
}
```

### Settlement Example:

```javascript
{
  eventId: "event_settlement_1725298800000_321",
  disputeId: "dispute_1725298800000_456",
  settlementResult: "ACCEPTED",
  settlementDetails: {
    type: "REFUND",
    amount: { value: 25.90, currency: "BRL" }
  }
}
```

## ⚠️ Importante

1. **Dados de Teste**: Todos os eventos gerados têm IDs únicos com timestamp
2. **Limpeza**: Use o comando `clear` ou endpoint `cleanup` para remover dados de teste
3. **Ambiente**: Recomendado usar apenas em desenvolvimento
4. **Performance**: Polling contínuo pode gerar muitos dados - monitore o banco

## 🔍 Troubleshooting

### Erro: "IfoodService não encontrado"

```bash
# Certifique-se de que está no diretório correto
cd backend/
node simulate-ifood-polling.js
```

### Erro: "MongoDB connection failed"

```bash
# Verifique se MongoDB está rodando e MONGODB_URI está configurado
echo $MONGODB_URI
```

### Eventos não aparecem na interface

1. Verifique se o WebSocket está funcionando
2. Confirme se o storeFirebaseUid está correto
3. Verifique os logs do servidor

### Limpeza não funciona

```bash
# Use limpeza forçada via MongoDB
mongo your_database
db.handshakesettlements.deleteMany({})
db.handshakedisputes.deleteMany({})
```

## 🎉 Próximos Passos

Após simular eventos:

1. **Teste a Interface**: Acesse a página de negociações
2. **Responda Disputes**: Use a API para aceitar/rejeitar
3. **Monitore Logs**: Verifique processamento nos logs
4. **Valide Dados**: Confirme dados no MongoDB
5. **Teste WebSocket**: Verifique notificações em tempo real

## 📞 Suporte

Para problemas com o simulador:

1. Verifique se todas as dependências estão instaladas
2. Confirme configuração do MongoDB
3. Valide estrutura dos modelos Handshake
4. Verifique logs do servidor para erros
