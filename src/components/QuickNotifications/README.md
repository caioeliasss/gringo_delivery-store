# QuickNotifications Component

## Descrição

Componente que exibe as notificações mais recentes da loja de forma compacta em um accordion.

## Funcionalidades Adicionadas

### ✅ Controles de Notificações Push

- Switch para ativar/desativar notificações push
- Botão para testar notificações
- Botão para atualizar a lista
- Indicador de status da conexão WebSocket
- Feedback visual do estado das notificações

### ✅ Compatibilidade

- Funciona com ou sem o contexto `GlobalNotificationsProvider`
- Graceful fallback quando o contexto não está disponível
- Mantém funcionalidade básica mesmo sem notificações push

## Como Usar

### 1. Uso Básico (sem notificações push)

```jsx
import QuickNotifications from "../components/QuickNotifications/QuickNotifications";

function MyPage() {
  return (
    <div>
      <h1>Dashboard da Loja</h1>
      <QuickNotifications />
    </div>
  );
}
```

### 2. Uso Completo (com notificações push)

```jsx
import QuickNotificationsWithProvider from "../components/QuickNotifications/QuickNotificationsWithProvider";

function MyPage() {
  return (
    <div>
      <h1>Dashboard da Loja</h1>
      <QuickNotificationsWithProvider />
    </div>
  );
}
```

### 3. Uso em página já envolvida pelo GlobalNotificationsProvider

```jsx
import { GlobalNotificationsProvider } from "../contexts/GlobalNotificationsContext";
import QuickNotifications from "../components/QuickNotifications/QuickNotifications";

function MyPage() {
  return (
    <GlobalNotificationsProvider userType="store">
      <div>
        <h1>Dashboard da Loja</h1>
        <QuickNotifications />
        {/* outros componentes */}
      </div>
    </GlobalNotificationsProvider>
  );
}
```

## Funcionalidades dos Controles Push

### Switch de Ativação

- **Ligado (✅)**: Notificações push ativadas, funciona mesmo com navegador fechado
- **Desligado (❌)**: Apenas notificações em tempo real via WebSocket

### Botão de Teste

- Envia uma notificação de teste para verificar se está funcionando
- Só aparece quando as notificações push estão ativadas

### Botão de Atualizar

- Recarrega a lista de notificações do servidor
- Útil para forçar uma sincronização

### Indicadores de Status

- **WebSocket conectado**: Mostra se está recebendo notificações em tempo real
- **Push suportado**: Informa se o navegador suporta notificações push
- **Estado atual**: Informa se as push estão ativas ou não

## Tipos de Notificação Suportados

- `CHAT_MESSAGE` - Mensagens de chat (ícone de chat)
- `ORDER_STATUS_UPDATE` - Atualizações de pedido (ícone de entrega)
- `OCCURRENCE_CHANGE` - Mudanças em ocorrências (ícone de aviso)
- `STORE_ALERT` - Alertas da loja (ícone de aviso)
- `BILLING` - Notificações financeiras (ícone de recibo)
- Outros tipos (ícone de notificação padrão)

## Estilos e Layout

- **Accordion expansível**: Pode ser aberto/fechado pelo usuário
- **Header dinâmico**: Cor muda baseado no estado (expandido/retraído)
- **Controles compactos**: Seção dedicada para configurações push
- **Lista responsiva**: Adapta-se a diferentes tamanhos de tela
- **Feedback visual**: Estados de loading, erro e vazio

## Limitações

- Mostra apenas as 3 notificações mais recentes
- Funcionalidades push dependem do contexto `GlobalNotificationsProvider`
- Requer que o usuário esteja autenticado (`currentUser`)

## Exemplo de Integração em Dashboard

```jsx
import React from "react";
import { GlobalNotificationsProvider } from "../contexts/GlobalNotificationsContext";
import QuickNotifications from "../components/QuickNotifications/QuickNotifications";
import { Grid, Paper, Typography } from "@mui/material";

const StoreDashboard = () => {
  return (
    <GlobalNotificationsProvider userType="store">
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5">Resumo das Vendas</Typography>
            {/* Conteúdo do dashboard */}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* QuickNotifications agora com controles push */}
          <QuickNotifications />
        </Grid>
      </Grid>
    </GlobalNotificationsProvider>
  );
};

export default StoreDashboard;
```
