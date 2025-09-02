# Página de Negociações iFood - Guia de Uso

## Visão Geral

A página de Negociações iFood (`HandshakeNegotiation.js`) é uma interface completa para que os parceiros (estabelecimentos) possam gerenciar disputas e negociações da plataforma iFood. Esta página permite visualizar, responder e acompanhar o status de todas as disputas pendentes.

## Funcionalidades Principais

### 1. Dashboard de Disputes Pendentes

- **Visualização em tempo real** de todas as disputas que requerem ação
- **Sistema de cores e alertas** baseado no tempo restante:
  - 🔴 **Crítico**: ≤ 15 minutos restantes (vermelho)
  - 🟡 **Urgente**: ≤ 60 minutos restantes (amarelo)
  - 🔵 **Normal**: > 60 minutos restantes (azul)
- **Atualização automática** a cada 30 segundos

### 2. Tipos de Disputes Suportadas

- 🍕 **Quality** (Qualidade)
- 📦 **Missing Items** (Itens Faltantes)
- ❌ **Wrong Items** (Itens Errados)
- ⏰ **Delay** (Atraso na Entrega)
- ❓ **Other** (Outros)

### 3. Ações Disponíveis para Cada Disputa

#### **Aceitar Disputa**

- Concordar com a reclamação do cliente
- Aceitar responsabilidade financeira/operacional
- Finaliza a disputa com status "ACCEPTED"

#### **Rejeitar Disputa**

- Contestar a reclamação do cliente
- **Obrigatório** fornecer motivo detalhado
- Envia disputa para análise da plataforma

#### **Fazer Contraproposta**

- Propor solução alternativa
- Tipos disponíveis:
  - **Reembolso Parcial**: Valor específico
  - **Reembolso Total**: Valor total do pedido
  - **Substituição**: Novo produto/pedido
  - **Voucher/Desconto**: Crédito para futuras compras
  - **Solução Personalizada**: Proposta específica

### 4. Interface Responsiva

- **Design mobile-first** com drawer lateral
- **Tabelas responsivas** que se adaptam ao tamanho da tela
- **Dialogs full-screen** em dispositivos móveis
- **AppBar dinâmica** para navegação em mobile

### 5. Navegação Integrada

- **Sidebar** com acesso a todas as funcionalidades da plataforma:
  - Dashboard
  - Pedidos
  - Produtos
  - **Negociações iFood** (página atual)
  - Chat
  - Corridas
  - Configurações

## Como Usar

### Acesso à Página

1. Faça login no sistema Gringo Delivery
2. Na sidebar, clique em "Negociações iFood"
3. Ou acesse diretamente: `/negociacoes-ifood`

### Respondendo a uma Disputa

1. **Visualize as disputes pendentes** na tabela principal
2. **Clique em "Ver Detalhes"** na disputa desejada
3. **Analise as informações:**
   - Tipo de disputa
   - Descrição do problema
   - Reclamação do cliente
   - Itens em disputa
   - Tempo restante para resposta
4. **Escolha uma ação:**
   - **Aceitar**: Se concordar com a reclamação
   - **Rejeitar**: Se discordar (informe o motivo)
   - **Contraproposta**: Para propor solução alternativa
5. **Confirme sua resposta**

### Monitoramento

- **Cards de resumo** no topo mostram estatísticas gerais
- **Abas disponíveis:**
  - **Disputes Pendentes**: Requer ação imediata
  - **Histórico**: Disputas já resolvidas
  - **Relatórios**: Estatísticas e métricas

## Recursos Técnicos

### APIs Utilizadas

- `GET /api/handshake/disputes/pending` - Lista disputes pendentes
- `GET /api/handshake/disputes/:id` - Detalhes de uma disputa específica
- `POST /api/handshake/disputes/:id/accept` - Aceitar disputa
- `POST /api/handshake/disputes/:id/reject` - Rejeitar disputa (requer motivo)
- `POST /api/handshake/disputes/:id/alternative` - Fazer contraproposta
- `GET /api/handshake/history` - Histórico e estatísticas

### Estados da Aplicação

- **Loading**: Carregamento de dados
- **Pending**: Aguardando resposta do parceiro
- **Accepted**: Disputa aceita pelo parceiro
- **Rejected**: Disputa rejeitada pelo parceiro
- **Counter Proposed**: Contraproposta enviada
- **Settled**: Disputa finalizada
- **Expired**: Tempo limite excedido

### Notificações

- **Snackbar** para feedback de ações
- **Alertas visuais** para disputes críticas
- **Badges** com contadores na navegação

## Configuração de Cores (Tema)

```javascript
const colors = {
  primary: "#EB2E3E", // Vermelho Gringo
  secondary: "#FBBF24", // Amarelo Gringo
  success: "#4CAF50", // Verde para sucessos
  warning: "#FF9800", // Laranja para avisos
  error: "#F44336", // Vermelho para erros
  info: "#2196F3", // Azul para informações
  background: "#F5F5F5", // Fundo da página
  white: "#FFFFFF", // Branco
  text: "#333333", // Texto principal
  subtext: "#666666", // Texto secundário
};
```

## Dependências

```json
{
  "@mui/material": "^7.0.2",
  "@mui/icons-material": "^7.1.1",
  "date-fns": "^4.1.0",
  "axios": "^1.8.4",
  "react": "^19.1.0",
  "react-router-dom": "^7.5.0"
}
```

## Melhores Práticas

### Para Estabelecimentos

1. **Monitore regularmente** a página de negociações
2. **Responda rapidamente** às disputes para evitar penalidades
3. **Forneça motivos detalhados** ao rejeitar disputes
4. **Use contrapropostas** quando apropriado para manter relacionamento com cliente

### Para Desenvolvedores

1. **Mantenha o estado atualizado** com refresh automático
2. **Valide entradas do usuário** antes de enviar respostas
3. **Implemente tratamento de erro** robusto
4. **Mantenha consistência** com o design system da aplicação

## Troubleshooting

### Problemas Comuns

**Página não carrega dados:**

- Verifique se o backend está rodando
- Confirme se as rotas da API estão funcionando
- Verifique autenticação do usuário

**Erro ao enviar resposta:**

- Verifique se todos os campos obrigatórios estão preenchidos
- Confirme se a disputa ainda está no prazo
- Verifique logs do backend para detalhes do erro

**Layout quebrado em mobile:**

- Confirme se o CSS está sendo importado corretamente
- Verifique se todas as dependências do Material-UI estão instaladas

## Próximos Desenvolvimentos

1. **Histórico detalhado** com filtros e busca
2. **Relatórios avançados** com gráficos e métricas
3. **Notificações push** para disputes críticas
4. **Integração com chat** para comunicação direta
5. **Dashboard analytics** com insights de performance

---

## Suporte

Para suporte técnico ou dúvidas sobre a funcionalidade, entre em contato com a equipe de desenvolvimento do Gringo Delivery.
