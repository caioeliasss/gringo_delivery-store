# 📊 Página de Corridas para Estabelecimentos

## 📋 Visão Geral

Esta página permite que estabelecimentos visualizem e monitorem todas as corridas relacionadas aos seus pedidos, com estatísticas detalhadas e filtros avançados.

## 🌟 Funcionalidades

### 📈 **Cards de Estatísticas**

- **Total de Corridas**: Número total de corridas do estabelecimento
- **Corridas Entregues**: Corridas finalizadas com sucesso
- **Em Entrega**: Corridas atualmente sendo entregues
- **Receita Total**: Valor total das corridas entregues

### 💰 **Estatísticas Financeiras**

- **Pendente**: Valor das corridas aguardando pagamento
- **Processando**: Valor das corridas em processamento
- **Liberado**: Valor das corridas liberadas para pagamento
- **Pago**: Valor das corridas já pagas

### 🔍 **Filtros Avançados**

- **Status da Corrida**: Entregue, Em Entrega, Cancelado, Aceito, Pendente
- **Status Financeiro**: Pago, Liberado, Processando, Pendente, Cancelado
- **Período**: Hoje, Esta semana, Este mês, Todos

### 📋 **Tabela de Corridas**

Exibe informações detalhadas de cada corrida:

- ID da corrida
- Motoboy responsável
- Cliente
- Valor da entrega
- Distância
- Status da corrida
- Status do pagamento
- Data da corrida
- Ações (visualizar detalhes)

### 🔍 **Modal de Detalhes**

Informações completas da corrida selecionada:

- Informações da corrida (ID, status, valor, distância, data)
- Informações do pedido (motoboy, cliente)
- Status financeiro (status e valor do pagamento)
- Informações de localização (coordenadas de origem e destino)

## 🛠️ Implementação Técnica

### **Frontend** (`CorridasStore.js`)

- Localização: `/src/pages/Store/Corridas/CorridasStore.js`
- Contexto: `StoreAuthContext` para autenticação
- Menu: `STORE_MENU_ITEMS` configurado
- Responsivo para mobile e desktop

### **Backend** (`travelRoutes.js`)

- Endpoint: `GET /travels/store`
- Função: `getAllTravelsForStore`
- Filtros: storeId, status, dateFilter, financeStatus
- Paginação suportada

### **Contexto de Autenticação** (`StoreAuthContext.js`)

- Localização: `/src/contexts/StoreAuthContext.js`
- Verifica se o usuário é um estabelecimento válido
- Gerencia estado de autenticação e logout

### **Menu de Navegação**

- Configurado em `/src/config/menuConfig.js`
- Export: `STORE_MENU_ITEMS`
- Inclui: Dashboard, Pedidos, Corridas, Produtos, Financeiro, Chat, Configurações

## 🚀 Como Usar

### **1. Acesso à Página**

- URL: `/corridas` (para estabelecimentos logados)
- Navegação: Menu lateral → "Corridas"

### **2. Visualização de Dados**

- Cards de estatísticas no topo mostram resumo geral
- Tabela principal lista todas as corridas
- Use filtros para refinar resultados
- Clique no ícone de "olho" para ver detalhes

### **3. Filtros**

- **Status da Corrida**: Filtra pelo status de entrega
- **Status Financeiro**: Filtra pelo status de pagamento
- **Período**: Filtra por data de criação
- **Atualizar**: Recarrega os dados

## 🔧 Configuração do Backend

### **Endpoint da API**

```javascript
GET /travels/store?storeId={uid}&page=1&limit=10&status=all&dateFilter=all&financeStatus=all
```

### **Parâmetros**

- `storeId`: UID do estabelecimento (obrigatório)
- `page`: Página atual (padrão: 1)
- `limit`: Itens por página (padrão: 10)
- `status`: Filtro por status da corrida
- `dateFilter`: Filtro por período
- `financeStatus`: Filtro por status financeiro

### **Resposta**

```json
{
  "travels": [...],
  "total": 42,
  "page": 1,
  "limit": 10,
  "hasMore": true,
  "stats": {
    "totalTravels": 42,
    "entregueTravels": 35,
    "emEntregaTravels": 5,
    "canceladoTravels": 2,
    "totalRevenue": 850.75,
    "financePendingValue": 125.50,
    "financeReleasedValue": 320.25,
    "financePaidValue": 380.0,
    "financeProcessingValue": 25.0
  }
}
```

## 🎨 Interface

### **Design**

- Material-UI (MUI) para componentes
- Tema responsivo com cores da Gringo Delivery
- Cards com elevação e bordas arredondadas
- Chips coloridos para status
- Ícones intuitivos

### **Cores dos Status**

- **Entregue**: Verde (success)
- **Em Entrega**: Amarelo (warning)
- **Cancelado**: Vermelho (error)
- **Pago**: Verde (success)
- **Liberado**: Azul (info)
- **Processando**: Roxo (secondary)
- **Pendente**: Amarelo (warning)

## 🔐 Segurança

- Autenticação obrigatória via `StoreAuthContext`
- Filtro automático por `storeId` no backend
- Apenas dados do próprio estabelecimento são retornados
- Validação de permissões na API

## 📱 Responsividade

- Layout adaptativo para mobile e desktop
- Tabela com scroll horizontal em telas pequenas
- Cards reorganizados em grid responsivo
- Drawer de navegação para mobile

## 🚀 Próximos Passos

1. **Integração com API real**: Substituir dados exemplo por chamadas reais
2. **Exportação de relatórios**: Adicionar funcionalidade de export
3. **Notificações em tempo real**: WebSocket para atualizações automáticas
4. **Gráficos**: Adicionar visualizações gráficas das estatísticas
5. **Filtros avançados**: Data personalizada, valor mínimo/máximo
