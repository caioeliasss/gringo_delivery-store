# API de Ocorrências - Documentação das Rotas

## Endpoints Disponíveis

### 📊 **Rotas para Relatórios**

#### `GET /api/occurrences/stats/summary`

Busca estatísticas resumidas de ocorrências com filtros avançados.

**Query Parameters:**

- `period` (opcional): 'today', 'week', 'month', 'quarter', 'year' (padrão: 'month')
- `roles` (opcional): roles do usuário separados por vírgula ('admin', 'general', 'logistics', 'finances')

**Resposta:**

```json
{
  "total": 127,
  "abertas": 29,
  "fechadas": 98,
  "pendentes": 15,
  "emAndamento": 5,
  "porTipo": [
    { "_id": "ENTREGA", "count": 32 },
    { "_id": "PRODUTO", "count": 28 }
  ],
  "porStatus": [
    { "_id": "FECHADO", "count": 98 },
    { "_id": "ABERTO", "count": 29 }
  ],
  "porPrioridade": {
    "Alta": 58,
    "Média": 45,
    "Baixa": 24
  },
  "tempoMedioResolucao": 2.4,
  "periodo": "month"
}
```

#### `GET /api/occurrences/reports/recent`

Busca ocorrências recentes para exibição em relatórios.

**Query Parameters:**

- `limit` (opcional): número máximo de resultados (padrão: 10)
- `period` (opcional): 'today', 'week', 'month' (padrão: 'month')
- `roles` (opcional): filtro por roles do usuário

**Resposta:**

```json
[
  {
    "_id": "66e7d1234567890abcdef123",
    "description": "Pedido atrasou 45 minutos",
    "type": "ENTREGA",
    "status": "FECHADO",
    "createdAt": "2025-09-15T14:30:00.000Z",
    "updatedAt": "2025-09-15T16:15:00.000Z"
  }
]
```

#### `GET /api/occurrences/reports/timeline`

Análise temporal de ocorrências para gráficos de linha.

**Query Parameters:**

- `period` (opcional): 'week', 'month', 'year' (padrão: 'month')
- `groupBy` (opcional): 'hour', 'day', 'month' (padrão: 'day')

**Resposta:**

```json
[
  {
    "_id": { "year": 2025, "month": 9, "day": 15 },
    "count": 12,
    "types": ["ENTREGA", "PRODUTO", "CLIENTE"],
    "statuses": ["ABERTO", "FECHADO", "PENDENTE"]
  }
]
```

#### `GET /api/occurrences/reports/top-issues`

Top problemas mais frequentes por período.

**Query Parameters:**

- `limit` (opcional): número de resultados (padrão: 5)
- `period` (opcional): 'week', 'month', 'quarter' (padrão: 'month')

**Resposta:**

```json
[
  {
    "_id": "ENTREGA",
    "count": 32,
    "averageResolutionTime": 2.5,
    "mostRecentCase": "2025-09-15T14:30:00.000Z",
    "statusDistribution": ["FECHADO", "ABERTO", "PENDENTE"]
  }
]
```

#### `GET /api/occurrences/reports/resolution-performance`

Performance de resolução de ocorrências por tipo.

**Query Parameters:**

- `period` (opcional): 'week', 'month' (padrão: 'month')

**Resposta:**

```json
{
  "byType": [
    {
      "_id": "ENTREGA",
      "avgResolutionTime": 2.1,
      "minResolutionTime": 0.5,
      "maxResolutionTime": 8.2,
      "totalResolved": 28
    }
  ],
  "overall": {
    "avgOverall": 2.4,
    "totalResolved": 98
  }
}
```

### 🔍 **Rotas de Consulta**

#### `GET /api/occurrences/`

Busca todas as ocorrências (ordenadas por data de criação).

#### `GET /api/occurrences/filtered/:roles`

Busca ocorrências filtradas por roles do usuário de suporte.

**Parâmetros:**

- `roles`: string com roles separados por vírgula ('admin,general')

#### `GET /api/occurrences/details/:id`

Busca uma ocorrência específica por ID.

#### `GET /api/occurrences/motoboy/:id`

Busca ocorrências de um motoboy específico.

#### `GET /api/occurrences/firebase/:firebaseUid`

Busca ocorrências de um usuário específico pelo Firebase UID.

### ✏️ **Rotas de Modificação**

#### `POST /api/occurrences/`

Cria uma nova ocorrência.

**Body:**

```json
{
  "name": "João Silva",
  "firebaseUid": "uid123",
  "description": "Descrição do problema",
  "type": "ENTREGA",
  "motoboyId": "motoboy_id",
  "storeId": "store_id",
  "customerId": "customer_id",
  "orderId": "order_id",
  "travelId": "travel_id",
  "coordinates": { "lat": -23.5505, "lng": -46.6333 }
}
```

#### `PUT /api/occurrences/:id`

Atualiza uma ocorrência existente.

#### `DELETE /api/occurrences/:id`

Remove uma ocorrência.

## 🏷️ **Tipos de Ocorrência**

| Tipo              | Descrição                | Roles com Acesso |
| ----------------- | ------------------------ | ---------------- |
| `ENTREGA`         | Problemas de entrega     | admin, logistics |
| `PRODUTO`         | Qualidade do produto     | admin, general   |
| `CLIENTE`         | Atendimento ao cliente   | admin, general   |
| `PAGAMENTO`       | Problemas de pagamento   | admin, finances  |
| `ESTABELECIMENTO` | Questões com parceiros   | admin, general   |
| `APP`             | Problemas técnicos       | admin, general   |
| `MOTOBOY`         | Problemas com entregador | admin, logistics |
| `PEDIDO`          | Problemas de pedido      | admin, general   |
| `ATENDIMENTO`     | Atendimento geral        | admin, general   |
| `EVENTO`          | Eventos diversos         | admin, general   |
| `OUTRO`           | Outros tipos             | admin, general   |

## 📈 **Status Possíveis**

- `ABERTO`: Ocorrência criada, aguardando análise
- `PENDENTE`: Em análise pela equipe
- `EM_ANDAMENTO`: Sendo resolvida
- `FECHADO`: Resolvida e finalizada

## 🔐 **Controle de Acesso**

### Roles de Usuário:

- **admin**: Acesso completo a todas as ocorrências
- **general**: Acesso a ocorrências gerais (cliente, produto, estabelecimento, etc.)
- **logistics**: Acesso a ocorrências de entrega e motoboys
- **finances**: Acesso a ocorrências de pagamento

### Filtros Automáticos:

- Usuários não-admin só veem ocorrências relacionadas aos seus roles
- Ocorrências sem role definido são visíveis para todos
- Administradores sempre veem todas as ocorrências

## 🚀 **Exemplos de Uso**

### Buscar estatísticas do último mês para admin:

```javascript
GET /api/occurrences/stats/summary?period=month&roles=admin
```

### Buscar ocorrências recentes para logistics:

```javascript
GET /api/occurrences/reports/recent?limit=5&roles=logistics&period=week
```

### Buscar timeline diária da última semana:

```javascript
GET /api/occurrences/reports/timeline?period=week&groupBy=day
```

### Top 3 problemas do trimestre:

```javascript
GET /api/occurrences/reports/top-issues?limit=3&period=quarter
```

---

**Desenvolvido para Gringo Delivery System**  
Versão da API: 1.0.0  
Data: Setembro 2025
