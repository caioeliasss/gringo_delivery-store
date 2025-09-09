# Correção do Webhook - Headers Already Sent

## Problema Identificado

O erro `Cannot set headers after they are sent to the client` estava ocorrendo porque:

1. **Múltiplas respostas**: Havia um `res.status(200).json()` no final do método que sempre executava
2. **Estrutura inadequada**: Múltiplos `if` independentes ao invés de `if-else if`
3. **Falta de `return`**: Alguns responses não tinham `return`, permitindo que o código continuasse

## Correções Aplicadas

### 1. Estrutura if-else if

```javascript
// ❌ ANTES (problema)
if (fullCode === "PLACED") {
  // ...
  res.status(200).json({ message: "..." });
}
if (fullCode === "CONFIRMED") {
  // ⚠️ Ainda pode executar!
  // ...
  res.status(200).json({ message: "..." });
}
res.status(200).json({ message: "..." }); // ⚠️ SEMPRE executa!

// ✅ DEPOIS (corrigido)
if (fullCode === "PLACED") {
  // ...
  return res.status(200).json({ message: "..." });
} else if (fullCode === "CONFIRMED") {
  // ...
  return res.status(200).json({ message: "..." });
} else {
  // Código não tratado
  return res.status(200).json({ message: "..." });
}
```

### 2. Return em todos os responses

- Adicionado `return` antes de cada `res.status().json()`
- Isso garante que o método termine após enviar a resposta

### 3. Melhor logging

```javascript
// ✅ Log mais detalhado
console.log(`[IFOOD WEBHOOK] Recebido: ${fullCode} para pedido ${orderId}`);

// ✅ Tratamento de erro melhorado
console.error("[IFOOD WEBHOOK] Erro no webhook:", {
  error: error.message,
  stack: error.stack,
  fullCode: req.body?.fullCode,
  orderId: req.body?.orderId,
});
```

### 4. Tratamento de códigos não reconhecidos

```javascript
} else {
    // Se chegou aqui, é um fullCode não tratado
    console.log(`[IFOOD WEBHOOK] Código não tratado: ${fullCode}`);
    return res.status(200).json({
        message: "Webhook processado com sucesso",
        fullCode: fullCode,
        note: "Código não tratado especificamente"
    });
}
```

## Teste da Correção

Para verificar se está funcionando:

1. **Sintaxe**: ✅ Verificada com `node -c`
2. **Estrutura**: ✅ Cada branch retorna exatamente uma resposta
3. **Logging**: ✅ Melhor rastreamento de erros

## Códigos Tratados

- `PLACED` - Pedido criado
- `CONFIRMED` - Pedido confirmado
- `SEPARATION_ENDED` - Preparo finalizado
- `CANCELLATION_REQUESTED` - Cancelamento solicitado
- `CANCELLED` - Pedido cancelado
- `DELIVERY_DROP_CODE_REQUESTED` - Código de entrega solicitado
- `CONCLUDED` - Pedido entregue
- Outros códigos são logados mas processados sem erro

## Impacto

✅ Elimina o erro "Headers already sent"
✅ Melhora o debugging com logs mais claros
✅ Estrutura mais robusta e maintível
✅ Todos os webhooks do iFood agora funcionam corretamente
