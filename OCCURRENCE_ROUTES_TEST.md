# Teste das Rotas de Ocorrência

## Rotas Implementadas

### 1. GET /api/occurrences/stats/summary

Retorna estatísticas resumidas de ocorrências.

**Parâmetros Query:**

- `period` (opcional): "week", "month", "quarter", "year" (padrão: "month")
- `roles` (opcional): array de roles para filtrar por permissão

**Exemplo de Request:**

```bash
GET /api/occurrences/stats/summary?period=month&roles=admin,finances
```

**Exemplo de Response:**

```json
{
  "total": 150,
  "pendentes": 25,
  "abertas": 10,
  "emAndamento": 8,
  "fechadas": 107,
  "tempoMedioResolucao": 2.4,
  "porTipo": [
    {
      "_id": "ENTREGA",
      "count": 45,
      "percentage": 30
    },
    {
      "_id": "PRODUTO",
      "count": 30,
      "percentage": 20
    }
  ],
  "porStatus": [
    {
      "_id": "FECHADA",
      "count": 107
    },
    {
      "_id": "PENDENTE",
      "count": 25
    }
  ]
}
```

### 2. GET /api/occurrences/reports/recent

Retorna as ocorrências mais recentes.

**Parâmetros Query:**

- `limit` (opcional): número máximo de registros (padrão: 10)
- `period` (opcional): período de filtro
- `roles` (opcional): array de roles

**Exemplo de Request:**

```bash
GET /api/occurrences/reports/recent?limit=20&period=week
```

### 3. GET /api/occurrences/reports/timeline

Retorna dados para gráfico de timeline.

**Parâmetros Query:**

- `period` (opcional): período de agrupamento
- `roles` (opcional): array de roles

**Exemplo de Response:**

```json
{
  "timeline": [
    {
      "_id": "2024-01-15",
      "count": 12,
      "date": "2024-01-15T00:00:00.000Z"
    },
    {
      "_id": "2024-01-16",
      "count": 8,
      "date": "2024-01-16T00:00:00.000Z"
    }
  ]
}
```

### 4. GET /api/occurrences/reports/top-issues

Retorna os principais tipos de problemas.

**Exemplo de Response:**

```json
{
  "topIssues": [
    {
      "_id": "ENTREGA",
      "count": 45,
      "percentage": 30,
      "avgResolutionTime": 2.1
    },
    {
      "_id": "PRODUTO",
      "count": 30,
      "percentage": 20,
      "avgResolutionTime": 1.8
    }
  ]
}
```

### 5. GET /api/occurrences/reports/resolution-performance

Retorna métricas de performance de resolução.

**Exemplo de Response:**

```json
{
  "performance": {
    "avgResolutionTime": 2.4,
    "resolutionRate": 0.713,
    "slaCompliance": 0.85,
    "byType": [
      {
        "_id": "ENTREGA",
        "avgTime": 2.1,
        "resolutionRate": 0.8
      }
    ]
  }
}
```

## Como Testar

### 1. Usando cURL

```bash
# Teste básico de estatísticas
curl -X GET "http://localhost:3001/api/occurrences/stats/summary?period=month"

# Teste com roles específicos
curl -X GET "http://localhost:3001/api/occurrences/stats/summary?period=week&roles=admin,logistics"

# Teste de ocorrências recentes
curl -X GET "http://localhost:3001/api/occurrences/reports/recent?limit=5"

# Teste de timeline
curl -X GET "http://localhost:3001/api/occurrences/reports/timeline?period=week"

# Teste de principais problemas
curl -X GET "http://localhost:3001/api/occurrences/reports/top-issues"

# Teste de performance de resolução
curl -X GET "http://localhost:3001/api/occurrences/reports/resolution-performance"
```

### 2. Usando JavaScript (Frontend)

```javascript
import { occurrenceService } from "../services/occurrenceService";

// Teste completo do relatório
const testReportData = async () => {
  try {
    const data = await occurrenceService.getReportData("month", ["admin"]);
    console.log("Dados do relatório:", data);
  } catch (error) {
    console.error("Erro no teste:", error);
  }
};

// Teste de estatísticas
const testStats = async () => {
  try {
    const stats = await occurrenceService.getOccurrenceStats("week", [
      "logistics",
    ]);
    console.log("Estatísticas:", stats);
  } catch (error) {
    console.error("Erro no teste:", error);
  }
};
```

### 3. Verificação de Logs

Para verificar se as rotas estão funcionando corretamente:

1. Inicie o servidor backend
2. Monitore os logs do console
3. Execute as requests de teste
4. Verifique se não há erros 500 ou problemas de conexão com o banco

### 4. Validação de Dados

As rotas devem retornar:

- Códigos HTTP corretos (200 para sucesso, 500 para erro)
- Estrutura JSON válida
- Dados consistentes com o modelo de dados
- Tratamento adequado de parâmetros opcionais

## Integração com Frontend

O serviço `occurrenceService.js` está configurado para usar essas rotas automaticamente. Para integrar:

1. Certifique-se de que o backend está rodando na porta 3001
2. Use os métodos do `occurrenceService` nos componentes React
3. Implemente tratamento de erro adequado
4. Considere adicionar loading states nos componentes

## Próximos Passos

1. **Autenticação**: Adicionar middleware de autenticação às rotas
2. **Cache**: Implementar cache para consultas frequentes
3. **Paginação**: Adicionar paginação para consultas grandes
4. **Filtros Avançados**: Expandir opções de filtro
5. **Real-time**: Considerar WebSocket para atualizações em tempo real
