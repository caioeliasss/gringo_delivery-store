# Página de Relatórios - Sistema Gringo Delivery

## Visão Geral

A página de relatórios oferece uma interface centralizada para visualização de dados e métricas do sistema, com controle de acesso baseado em roles de usuário.

## Estrutura do Sistema

### Roles de Usuário

O sistema suporta 4 tipos de roles com diferentes níveis de acesso:

- **admin**: Acesso completo a todos os relatórios
- **general**: Acesso a relatórios gerais (pedidos, corridas, ocorrências, chat, estabelecimentos)
- **logistics**: Acesso a relatórios logísticos (pedidos, corridas, ocorrências, entregadores)
- **finances**: Acesso a relatórios financeiros (financeiro, estabelecimentos)

### Tipos de Relatórios

#### 1. Relatório Financeiro

- **Permissões**: admin, finances
- **Conteúdo**: Receitas, despesas, lucro líquido, crescimento, transações
- **Componente**: `FinanceiroReport.js`

#### 2. Relatório de Pedidos

- **Permissões**: admin, general, logistics
- **Conteúdo**: Total de pedidos, status, ticket médio, pedidos recentes
- **Componente**: `PedidosReport.js`

#### 3. Relatório de Corridas

- **Permissões**: admin, general, logistics
- **Conteúdo**: Total de corridas, tempo médio de entrega, distância percorrida
- **Componente**: `CorridasReport.js`

#### 4. Relatório de Ocorrências

- **Permissões**: admin, general, logistics
- **Conteúdo**: Ocorrências resolvidas/pendentes, tempo médio de resolução
- **Componente**: `OcorrenciasReport.js`

#### 5. Relatório de Chat

- **Permissões**: admin, general
- **Conteúdo**: Conversas, tempo de resposta, satisfação do cliente
- **Componente**: `ChatReport.js`

#### 6. Relatório de Estabelecimentos

- **Permissões**: admin, general, finances
- **Conteúdo**: Performance dos parceiros, vendas, avaliações
- **Componente**: `EstabelecimentosReport.js`

#### 7. Relatório de Entregadores

- **Permissões**: admin, general, logistics
- **Conteúdo**: Performance dos motoboys, entregas realizadas, ganhos
- **Componente**: `EntregadoresReport.js`

## Arquitetura

### Componentes Principais

```
src/
├── pages/Relatorios/
│   ├── Relatorios.js          # Página principal
│   └── Relatorios.css         # Estilos customizados
├── components/Reports/
│   ├── ReportCard.js          # Card de relatório
│   ├── FinanceiroReport.js    # Relatório financeiro
│   ├── PedidosReport.js       # Relatório de pedidos
│   ├── CorridasReport.js      # Relatório de corridas
│   ├── OcorrenciasReport.js   # Relatório de ocorrências
│   ├── ChatReport.js          # Relatório de chat
│   ├── EstabelecimentosReport.js # Relatório de estabelecimentos
│   └── EntregadoresReport.js  # Relatório de entregadores
└── hooks/
    └── useReportPermissions.js # Hook para controle de permissões
```

### Hooks e Context

#### useReportPermissions

- Gerencia permissões baseadas no role do usuário
- Retorna objeto com permissões para cada tipo de relatório
- Utiliza o `SuporteAuthContext` para obter dados do usuário

#### useHasAnyReportAccess

- Verifica se o usuário tem acesso a pelo menos um relatório
- Usado para exibir mensagem de "sem permissões"

## Recursos

### Controle de Acesso

- Cards de relatórios são exibidos conforme permissões
- Cards sem permissão ficam desabilitados com indicação visual
- Chips mostram os roles necessários para cada relatório

### Interface Responsiva

- Layout adaptável para desktop, tablet e mobile
- Cards organizados em grid responsivo
- Tabelas com scroll horizontal em dispositivos pequenos

### Experiência do Usuário

- Animações suaves de entrada dos cards
- Feedback visual para hover e seleção
- Loading states durante carregamento de dados
- Navegação intuitiva entre relatórios

### Funcionalidades dos Relatórios

- Filtros por período (hoje, semana, mês, trimestre, ano)
- Cards de métricas resumidas
- Tabelas detalhadas com dados recentes
- Chips coloridos para status e categorias
- Dados simulados para demonstração

## Como Usar

### Para Desenvolvedores

1. **Adicionar novo relatório**:

   ```javascript
   // 1. Criar componente do relatório
   const NovoReport = () => {
     /* implementação */
   };

   // 2. Adicionar permissões no hook
   export const REPORT_PERMISSIONS = {
     // ...
     novoRelatorio: ["admin", "general"],
   };

   // 3. Adicionar configuração na página principal
   const reportConfigs = [
     // ...
     {
       id: "novoRelatorio",
       title: "Novo Relatório",
       description: "Descrição do relatório",
       icon: <IconeComponente />,
       color: "primary",
       component: NovoReport,
       requiredRoles: REPORT_PERMISSIONS.novoRelatorio,
     },
   ];
   ```

2. **Modificar permissões**:

   - Editar `REPORT_PERMISSIONS` em `useReportPermissions.js`
   - As mudanças são aplicadas automaticamente

3. **Customizar estilos**:
   - Editar `Relatorios.css` para estilos globais
   - Usar Material-UI sx prop para estilos específicos

### Para Usuários

1. **Acessar relatórios**:

   - Navegue até a página de relatórios
   - Visualize cards conforme suas permissões
   - Clique em um card para acessar o relatório detalhado

2. **Navegar relatórios**:
   - Use filtros de período para ajustar dados
   - Clique no botão "X" para voltar ao menu principal
   - Tabelas têm scroll horizontal em dispositivos pequenos

## Configuração de Desenvolvimento

1. **Dependências necessárias**:

   ```bash
   npm install @mui/material @mui/icons-material
   ```

2. **Context necessário**:

   - `SuporteAuthContext` deve estar configurado
   - Usuário deve ter propriedade `role` (string ou array)

3. **Estrutura de roles**:
   ```javascript
   const supportUser = {
     role: ["admin"], // ou 'admin' como string
     // outros dados do usuário
   };
   ```

## Dados de Exemplo

Todos os relatórios atualmente utilizam dados simulados para demonstração. Para produção, substitua por chamadas de API reais:

```javascript
// Exemplo de integração com API
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await api.get("/relatorios/financeiro", {
        params: { period },
      });
      setData(response.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [period]);
```

## Suporte e Melhorias

### Próximos Passos

- Integração com APIs reais
- Exportação de relatórios (PDF, Excel)
- Gráficos interativos
- Relatórios customizáveis
- Agendamento de relatórios

### Problemas Conhecidos

- Dados atualmente são simulados
- Sem persistência de filtros entre navegações
- Sem cache de dados

---

**Desenvolvido para Gringo Delivery System**  
Versão: 1.0.0  
Data: Setembro 2025
