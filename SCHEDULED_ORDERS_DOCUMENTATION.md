# Sistema de Pedidos Agendados - iFood Integration

Este documento explica como funciona o sistema de recebimento, confirmação e despacho de pedidos delivery agendados do iFood.

## 📋 Funcionalidades Implementadas

### 1. **Recebimento de Pedidos Agendados**

- ✅ Webhook processa pedidos com `orderTiming = "SCHEDULED"`
- ✅ Detecção automática de pedidos agendados via `orderType = "DELIVERY"`
- ✅ Armazenamento da data/hora de agendamento (`scheduledDateTime`)
- ✅ Status inicial: `"agendado"`

### 2. **Processamento Automático**

- ✅ Agendamento automático para o horário especificado
- ✅ Verificação periódica a cada 5 minutos para pedidos perdidos
- ✅ Confirmação automática no iFood no horário agendado
- ✅ Transição automática para `"em_preparo"`
- ✅ Busca automática de motorista (se delivery)

### 3. **Interface de Gerenciamento**

- ✅ Visualização de pedidos agendados
- ✅ Exibição da data/hora de agendamento
- ✅ Estatísticas de pedidos agendados
- ✅ Reagendamento manual
- ✅ Processamento forçado
- ✅ Cancelamento de agendamento

## 🔧 Componentes Técnicos

### Backend

#### **1. Modelo Order (atualizado)**

```javascript
// Novos campos adicionados
orderType: {
  type: String,
  enum: ["IMMEDIATE", "SCHEDULED", "DELIVERY", "TAKEOUT"],
  default: "IMMEDIATE"
},
orderTiming: {
  type: String,
  enum: ["IMMEDIATE", "SCHEDULED"],
  default: "IMMEDIATE"
},
scheduledDateTime: {
  type: Date,
  required: false
},
isScheduled: {
  type: Boolean,
  default: false
},
status: {
  // Novo status: "agendado"
  enum: ["pendente", "agendado", "em_preparo", ...]
}
```

#### **2. ScheduledOrderService**

Serviço responsável pelo gerenciamento de pedidos agendados:

- **`scheduleOrder(order, scheduledDateTime)`** - Agenda um pedido
- **`processScheduledOrder(orderId)`** - Processa um pedido na hora agendada
- **`rescheduleOrder(orderId, newDateTime)`** - Reagenda um pedido
- **`cancelScheduledOrder(orderId)`** - Cancela o agendamento
- **`getScheduledOrders()`** - Lista pedidos agendados
- **`checkMissedScheduledOrders()`** - Verifica pedidos perdidos

#### **3. WebhookController (atualizado)**

```javascript
// Tratamento de pedidos agendados no webhook PLACED
if (isScheduled && orderDetails.scheduledDateTime) {
  const createdOrder = await Order.findOne({ ifoodId: orderId });
  if (createdOrder) {
    await this.scheduledOrderService.scheduleOrder(
      createdOrder,
      orderDetails.scheduledDateTime
    );
  }
}

// Tratamento no webhook CONFIRMED
if (orderIdSystem.isScheduled) {
  console.log(`Pedido agendado ${orderId} confirmado, aguardando horário`);
  await orderService.updateOrderStatus(orderIdSystem._id, "agendado");
}
```

#### **4. Novas Rotas API**

```
GET /api/orders/scheduled          # Lista pedidos agendados
GET /api/orders/scheduled/stats    # Estatísticas
PATCH /api/orders/:id/reschedule   # Reagenda pedido
DELETE /api/orders/:id/schedule    # Cancela agendamento
POST /api/orders/:id/process-scheduled # Força processamento
```

### Frontend

#### **5. ScheduledOrdersComponent**

Componente React para gerenciar pedidos agendados:

**Features:**

- 📊 Dashboard com estatísticas
- 📅 Lista de pedidos com countdown
- ⏰ Indicadores visuais de urgência
- ✏️ Reagendamento inline
- ▶️ Processamento manual
- ❌ Cancelamento de agendamento

#### **6. Exibição nos Detalhes do Pedido**

```jsx
{
  selectedOrder.isScheduled && selectedOrder.scheduledDateTime && (
    <Typography variant="body2" color="warning.main">
      <ScheduleIcon fontSize="small" />
      Agendado para: {formatDate(selectedOrder.scheduledDateTime)}
    </Typography>
  );
}
```

## 🚀 Fluxo de Funcionamento

### **1. Recebimento do Pedido**

```
iFood → Webhook PLACED → detecta orderTiming=SCHEDULED →
cria pedido com status="agendado" → agenda processamento
```

### **2. Processamento Automático**

```
Horário agendado → confirma no iFood →
status="em_preparo" → busca motorista (se delivery)
```

### **3. Monitoramento**

```
Verificação a cada 5min → processa pedidos perdidos →
interface em tempo real
```

## 📡 Exemplo de Payload do iFood

```json
{
  "id": "123456789",
  "orderType": "DELIVERY",
  "orderTiming": "SCHEDULED",
  "scheduledDateTime": "2025-01-15T14:30:00.000Z",
  "orderStatus": "PLACED",
  "customer": {
    "name": "João Silva",
    "phone": { "number": "+5511999999999" }
  },
  "delivery": {
    "deliveryAddress": {
      "streetName": "Rua das Flores",
      "streetNumber": "123",
      "district": "Centro",
      "city": "São Paulo",
      "coordinates": {
        "latitude": -23.5505,
        "longitude": -46.6333
      }
    }
  },
  "orderItems": [...],
  "total": { "orderAmount": 45.90 }
}
```

## 🎯 Como Usar

### **Para Lojas:**

1. Pedidos agendados aparecem automaticamente na interface
2. Acompanhe o countdown até o horário de processamento
3. Use o componente `ScheduledOrdersComponent` para gerenciar
4. Processe manualmente se necessário

### **Para Desenvolvedores:**

1. Importe `ScheduledOrdersComponent` na sua página
2. Use as APIs para integração customizada
3. Configure webhooks do iFood corretamente
4. Monitore logs para troubleshooting

## 🔍 Logs e Monitoramento

### **Logs Importantes:**

```bash
# Agendamento
📅 [SCHEDULED] Agendando pedido IFOOD-123 para 15/01/2025 14:30

# Processamento
🚀 [SCHEDULED] Iniciando processamento do pedido agendado 123

# Erros
❌ [SCHEDULED] Erro ao processar pedido agendado 123: timeout
```

### **Verificação de Status:**

```bash
# Ver pedidos agendados
GET /api/orders/scheduled

# Estatísticas
GET /api/orders/scheduled/stats
```

## ⚠️ Considerações Importantes

1. **Timeout**: Sistema agenda com base na data recebida do iFood
2. **Backup**: Verificação a cada 5min previne perda de pedidos
3. **Logs**: Todos os eventos são logados para auditoria
4. **Cancelamento**: Pedidos podem ser cancelados antes do processamento
5. **Reagendamento**: Permite alterar horário se necessário

## 🐛 Troubleshooting

### **Pedido não processou no horário:**

- Verifique logs do `ScheduledOrderService`
- Confirme se a verificação periódica está ativa
- Teste processamento manual via API

### **Data/hora incorreta:**

- Verifique timezone do servidor
- Confirme formato da data do iFood
- Teste com dados mock

### **Interface não atualiza:**

- Verifique conexão com API
- Confirme se o componente está montado
- Teste atualização manual

---

## 📞 Suporte

Para dúvidas sobre implementação ou bugs encontrados, consulte:

- Logs do servidor: `/var/log/gringo-delivery/`
- Documentação da API: `/api/docs`
- Testes unitários: `/tests/scheduled-orders.test.js`
