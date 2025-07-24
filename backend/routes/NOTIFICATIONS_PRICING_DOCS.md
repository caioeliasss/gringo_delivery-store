# 📱 Sistema de Notificações de Precificação

Este documento descreve o sistema de notificações automáticas para motoboys quando há alterações nos valores de chuva e alta demanda.

## 🎯 Funcionalidades Implementadas

### 1. **Notificações Automáticas**

O sistema envia notificações automáticas para **todos os motoboys aprovados** quando:

- ✅ **Modo Chuva** é ativado/desativado
- ✅ **Alta Demanda** é ativada/desativada

### 2. **Gatilhos de Notificação**

#### **Via Controller (`updateDeliveryPrice`)**

- Detecta mudanças nos campos `isRain` e `isHighDemand`
- Compara valores antigos vs novos
- Envia notificação apenas quando há **mudança real**

#### **Via Rotas Toggle**

- `PATCH /api/delivery-price/toggle-rain`
- `PATCH /api/delivery-price/toggle-high-demand`
- Notifica imediatamente após o toggle

### 3. **Via Notificação Manual**

- `POST /api/delivery-price/notify-motoboys`
- Permite envio de notificações personalizadas
- Inclui preços atuais automaticamente

---

## 📋 Tipos de Notificação

### 🌧️ **Modo Chuva Ativado**

```
Título: "🌧️ MODO CHUVA ATIVADO!"
Mensagem: "Agora você ganha R$ X,XX a mais por entrega! 💰"
```

### ☀️ **Modo Chuva Desativado**

```
Título: "☀️ Modo Chuva Desativado"
Mensagem: "O bônus de chuva não está mais ativo"
```

### 🔥 **Alta Demanda Ativada**

```
Título: "🔥 ALTA DEMANDA ATIVADA!"
Mensagem: "Preço fixo aumentado para R$ X,XX! Aproveite! 🚀"
```

### 📉 **Alta Demanda Desativada**

```
Título: "📉 Alta Demanda Desativada"
Mensagem: "O preço voltou ao normal"
```

---

## 🚀 Como Funciona

### **1. Detecção de Mudanças**

```javascript
// No controller
const oldRainStatus = deliveryPrice.isRain;
const oldHighDemandStatus = deliveryPrice.isHighDemand;

// Após atualização
if (isRain !== undefined && isRain !== oldRainStatus) {
  rainChanged = true;
}
```

### **2. Busca de Motoboys**

```javascript
const motoboys = await Motoboy.find({
  isApproved: true,
  $or: [
    { fcmToken: { $exists: true, $ne: null } },
    { firebaseUid: { $exists: true, $ne: null } },
  ],
});
```

### **3. Envio de Notificações**

Utiliza o `fullScreenNotificationService` existente:

- **FCM** (Firebase Cloud Messaging) para apps móveis
- **SSE** (Server-Sent Events) como fallback
- **Timeout** de 15 segundos para notificações de preço

---

## 🛠️ APIs Disponíveis

### **Notificação Manual**

```http
POST /api/delivery-price/notify-motoboys
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "🎉 Promoção Especial!",
  "message": "Valores aumentados até as 22h!",
  "changeType": "promotion",
  "includeCurrentPrices": true
}
```

**Resposta:**

```json
{
  "message": "Notificação enviada para 15 de 20 motoboys",
  "totalMotoboys": 20,
  "successCount": 15,
  "details": [...]
}
```

---

## 📊 Logs e Monitoramento

### **Logs Implementados**

```javascript
console.log(
  `📢 Enviando notificação para ${motoboys.length} motoboys: ${title}`
);
console.log(`✅ Notificação enviada para ${motoboy.name}`);
console.log(`❌ Erro ao notificar ${motoboy.name}:`, error.message);
console.log(`🌧️ Modo chuva ${deliveryPrice.isRain ? "ATIVADO" : "DESATIVADO"}`);
console.log(
  `🔥 Alta demanda ${deliveryPrice.isHighDemand ? "ATIVADA" : "DESATIVADA"}`
);
```

### **Monitoramento de Erros**

- Erros individuais não impedem o processo completo
- `Promise.allSettled()` garante que todas as tentativas sejam feitas
- Logs detalhados para debug

---

## 🔧 Configurações

### **Timeout das Notificações**

- **Notificações de Preço**: 15 segundos
- **Notificações Manuais**: 20 segundos

### **Dados Enviados**

```javascript
data: {
  changeType: 'rain' | 'highDemand' | 'manual',
  isActive: boolean,
  priceValue: number,
  priority: 'high' | 'normal',
  showAsPopup: true
}
```

---

## 🔒 Segurança

### **Autenticação**

- Todas as rotas requerem token JWT válido
- Apenas usuários autenticados podem alterar preços

### **Validação**

- Validação de campos obrigatórios
- Verificação de tipos de dados
- Tratamento de erros robusto

---

## 📱 Integração Mobile

### **Estrutura da Notificação FCM**

```javascript
{
  notification: {
    title: "🌧️ MODO CHUVA ATIVADO!",
    body: "Agora você ganha R$ 3,00 a mais por entrega! 💰"
  },
  data: {
    isCallStyle: "true",
    callType: "price_update",
    changeType: "rain",
    isActive: "true",
    priceValue: "3.0",
    screen: "IncomingCallScreen"
  },
  android: {
    priority: "high",
    notification: {
      channel_id: "call_channel",
      importance: "max",
      sound: "ringtone"
    }
  }
}
```

---

## 🚦 Estados da Notificação

| Estado     | Descrição                                |
| ---------- | ---------------------------------------- |
| `PENDING`  | Notificação enviada, aguardando resposta |
| `TIMEOUT`  | Notificação expirou (15-20s)             |
| `ACCEPTED` | Motoboy visualizou (se implementado)     |
| `DECLINED` | Motoboy dispensou (se implementado)      |

---

## 🔄 Fluxo Completo

1. **Admin altera preço** via painel web
2. **Sistema detecta mudança** em `isRain` ou `isHighDemand`
3. **Busca motoboys** aprovados com token FCM/Firebase
4. **Envia notificações** em paralelo
5. **Logs** resultados individualmente
6. **Resposta** da API com status geral

---

## 🧪 Testando

### **Ativar Modo Chuva**

```bash
curl -X PATCH http://localhost:8080/api/delivery-price/toggle-rain \
  -H "Authorization: Bearer seu_token"
```

### **Enviar Notificação Manual**

```bash
curl -X POST http://localhost:8080/api/delivery-price/notify-motoboys \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 Teste de Notificação",
    "message": "Esta é uma notificação de teste!",
    "includeCurrentPrices": true
  }'
```

---

## 🔮 Próximas Melhorias

- [ ] **Dashboard** de estatísticas de notificações
- [ ] **Histórico** de mudanças de preço
- [ ] **Segmentação** por região/zona
- [ ] **Agendamento** de mudanças de preço
- [ ] **A/B Testing** de mensagens
- [ ] **Métricas** de engajamento

---

## 📞 Suporte

Para dúvidas sobre as notificações:

1. Verifique os logs do servidor
2. Confirme se os motoboys têm `fcmToken` válido
3. Teste a rota de notificação manual
4. Verifique se o `fullScreenNotificationService` está funcionando
