# Sistema Global de Notificações

## Visão Geral

O sistema global de notificações foi implementado para funcionar em toda a aplicação de suporte, fornecendo notificações em tempo real via WebSocket e notificações push do navegador **sem precisar entrar na página específica de notificações**.

## Arquitetura

### 1. GlobalNotificationsContext

**Localização**: `src/contexts/GlobalNotificationsContext.js`

Este contexto centraliza toda a lógica de notificações:

- ✅ Inicialização automática das notificações push
- ✅ Conexão WebSocket em tempo real
- ✅ Gerenciamento de estado global
- ✅ Feedback visual para o usuário
- ✅ Verificações periódicas de saúde do sistema

**Principais funcionalidades:**

- `enablePushNotifications()` - Habilita notificações push
- `disablePushNotifications()` - Desabilita notificações push
- `testNotification()` - Testa uma notificação
- `showFeedback(message, severity)` - Mostra feedback ao usuário

### 2. SuporteAuthContext Atualizado

**Localização**: `src/contexts/SuporteAuthContext.js`

Agora envolve automaticamente todas as páginas de suporte com o `GlobalNotificationsProvider`, garantindo que o sistema funcione em qualquer página.

### 3. NotificationIndicator Melhorado

**Localização**: `src/components/NotificationIndicator.js`

Componente visual que:

- ✅ Mostra badge com número de notificações não lidas
- ✅ Anima quando há notificações novas
- ✅ Indica status de conexão (conectado/desconectado)
- ✅ Funciona como wrapper para ícones (ex: no SideDrawer)
- ✅ Funciona como botão independente (ex: na AppBar)

### 4. SupportLayout

**Localização**: `src/components/SupportLayout.js`

Layout padrão que garante:

- ✅ SideDrawer com indicador de notificações
- ✅ AppBar móvel com indicador sempre visível
- ✅ Estrutura consistente em todas as páginas

## Como Usar

### Para desenvolvedores - Usar em uma nova página:

```jsx
import SupportLayout from "../../components/SupportLayout";
import { useGlobalNotifications } from "../../contexts/GlobalNotificationsContext";

const MinhaNovaPageSupporte = () => {
  const { unreadCount, enablePushNotifications } = useGlobalNotifications();

  return (
    <SupportLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4">Minha Página</Typography>

        {/* Seu conteúdo aqui */}
        {unreadCount > 0 && (
          <Alert severity="info">
            Você tem {unreadCount} notificações não lidas
          </Alert>
        )}
      </Box>
    </SupportLayout>
  );
};
```

### Para usar o contexto em qualquer componente:

```jsx
import { useGlobalNotifications } from "../../contexts/GlobalNotificationsContext";

const MeuComponente = () => {
  const {
    unreadCount,
    pushEnabled,
    isConnected,
    enablePushNotifications,
    testNotification,
    showFeedback,
  } = useGlobalNotifications();

  const handleEnableNotifications = async () => {
    const success = await enablePushNotifications();
    if (success) {
      showFeedback("Notificações habilitadas!", "success");
    }
  };

  return (
    <Box>
      <Badge badgeContent={unreadCount} color="error">
        <NotificationsIcon />
      </Badge>

      {!pushEnabled && (
        <Button onClick={handleEnableNotifications}>
          Habilitar Notificações
        </Button>
      )}
    </Box>
  );
};
```

## Fluxo de Funcionamento

### 1. Inicialização (Automática)

1. Usuário faz login no suporte
2. `SuporteAuthContext` envolve a aplicação com `GlobalNotificationsProvider`
3. `GlobalNotificationsContext` automaticamente:
   - Verifica suporte a notificações push
   - Conecta via WebSocket
   - Verifica permissões existentes
   - Reconecta Service Workers se necessário

### 2. Durante o uso

1. **Notificações em tempo real**: Chegam via WebSocket
2. **Notificações push**: Funcionam mesmo com página fechada
3. **Indicadores visuais**: Badge animado em SideDrawer e AppBar
4. **Verificações periódicas**: Sistema monitora saúde das conexões

### 3. Recuperação automática

- Se WebSocket desconecta: tenta reconectar automaticamente
- Se Service Worker falha: mostra aviso e opção de reativar
- Se permissões são revogadas: atualiza estado e informa usuário

## Páginas Atualizadas

### ✅ SupportNotifications.js

- Agora usa o contexto global
- Removida lógica duplicada de inicialização
- Mantém funcionalidades de gerenciamento específicas

### ✅ dashboard.js

- Adicionado indicador na AppBar móvel
- Mantém SideDrawer com indicador

## Vantagens da Nova Arquitetura

1. **Funciona globalmente**: Não precisa entrar na página de notificações
2. **Inicialização automática**: Sistema inicia sozinho no login
3. **Recuperação automática**: Reconecta automaticamente em caso de falhas
4. **Feedback visual**: Usuário sempre sabe o status das notificações
5. **Menos código duplicado**: Lógica centralizada em um contexto
6. **Melhor UX**: Notificações funcionam em qualquer página
7. **Mobile-friendly**: Indicador sempre visível na AppBar móvel

## Configurações e Customizações

### Tempos de verificação:

- **WebSocket**: Reconexão automática via hook
- **Push Service**: Verificação a cada 60 segundos
- **Notificações API**: Consulta a cada 30 segundos

### Personalização de feedback:

```jsx
const { showFeedback } = useGlobalNotifications();

// Diferentes tipos de feedback
showFeedback("Sucesso!", "success");
showFeedback("Atenção!", "warning");
showFeedback("Erro!", "error");
showFeedback("Informação", "info");
```

## Debug e Desenvolvimento

### Modo de desenvolvimento:

- Componente `WebSocketDebug` mostra status detalhado
- Console logs detalhados
- Botões de teste e verificação de status

### Em produção:

- Logs mínimos
- Interface limpa
- Recuperação silenciosa de falhas

## Troubleshooting

### Notificações não funcionam:

1. Verificar se navegador suporta notificações
2. Verificar permissões do navegador
3. Verificar console para erros de Service Worker
4. Testar com botão "Testar notificação"

### WebSocket desconectado:

1. Verificar conexão de internet
2. Verificar se servidor WebSocket está funcionando
3. Aguardar reconexão automática (30s)

### Service Worker falhou:

1. Limpar cache do navegador
2. Recarregar página
3. Reativar notificações via switch
