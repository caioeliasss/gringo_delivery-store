# 📋 Documentação dos Endpoints de Busca

## 🔍 Busca de Motoboys

### `GET /api/motoboys/search`

Busca motoboys por nome, email, telefone ou CPF.

#### Parâmetros de Query

| Parâmetro   | Tipo    | Obrigatório | Descrição                                    |
| ----------- | ------- | ----------- | -------------------------------------------- |
| `q`         | string  | ✅          | Termo de busca (mín. 2 caracteres)           |
| `approved`  | boolean | ❌          | Filtrar por aprovação (`true`/`false`)       |
| `available` | boolean | ❌          | Filtrar por disponibilidade (`true`/`false`) |
| `limit`     | number  | ❌          | Limite de resultados (padrão: 50)            |

#### Campos de Busca

- Nome completo
- Email
- Número de telefone
- CPF

#### Exemplos

```bash
# Busca simples
GET /api/motoboys/search?q=joão

# Busca com filtros
GET /api/motoboys/search?q=silva&approved=true&available=true

# Busca por CPF
GET /api/motoboys/search?q=12345678901

# Busca por telefone
GET /api/motoboys/search?q=11999999999
```

#### Resposta

```json
[
  {
    "_id": "64f5b2c8a1b2c3d4e5f6g7h8",
    "name": "João Silva",
    "email": "joao.silva@email.com",
    "phoneNumber": "11999999999",
    "cpf": "12345678901",
    "isApproved": true,
    "isAvailable": true,
    "firebaseUid": "abc123def456",
    "score": 4.8,
    "statusText": "Disponível",
    "isInRace": false,
    "createdAt": "2023-09-04T10:30:00.000Z"
  }
]
```

---

## 🏪 Busca de Estabelecimentos

### `GET /api/stores/search`

Busca estabelecimentos por nome, proprietário, CNPJ, telefone, email ou endereço.

#### Parâmetros de Query

| Parâmetro   | Tipo    | Obrigatório | Descrição                                      |
| ----------- | ------- | ----------- | ---------------------------------------------- |
| `q`         | string  | ✅          | Termo de busca (mín. 2 caracteres)             |
| `approved`  | boolean | ❌          | Filtrar por aprovação de CNPJ (`true`/`false`) |
| `available` | boolean | ❌          | Filtrar por disponibilidade (`true`/`false`)   |
| `limit`     | number  | ❌          | Limite de resultados (padrão: 50)              |

#### Campos de Busca

- Nome comercial (businessName)
- Nome do proprietário (ownerName)
- Nome de exibição (displayName)
- Telefone
- Email
- CNPJ
- Endereço (rua, bairro, cidade)

#### Exemplos

```bash
# Busca simples por nome
GET /api/stores/search?q=pizzaria

# Busca com filtros
GET /api/stores/search?q=lanchonete&approved=true&available=true

# Busca por CNPJ
GET /api/stores/search?q=12345678000199

# Busca por endereço
GET /api/stores/search?q=rua das flores

# Busca por bairro
GET /api/stores/search?q=centro&limit=20
```

#### Resposta

```json
[
  {
    "_id": "64f5b2c8a1b2c3d4e5f6g7h9",
    "businessName": "Pizzaria do João",
    "ownerName": "João Santos",
    "displayName": "Pizzaria do João",
    "phone": "1133334444",
    "email": "contato@pizzariadojoao.com",
    "cnpj": "12345678000199",
    "address": {
      "street": "Rua das Flores",
      "neighborhood": "Centro",
      "city": "São Paulo"
    },
    "firebaseUid": "def456ghi789",
    "isAvailable": true,
    "cnpj_approved": true,
    "createdAt": "2023-09-04T11:45:00.000Z"
  }
]
```

---

## ⚙️ Setup de Índices

### Motoboys

```bash
POST /api/motoboys/setup-search-indexes
```

### Estabelecimentos

```bash
POST /api/stores/setup-search-indexes
```

> ⚠️ **Importante**: Execute estes endpoints apenas uma vez para configurar os índices de busca no MongoDB e melhorar a performance.

---

## 📝 Códigos de Resposta

| Código | Descrição                              |
| ------ | -------------------------------------- |
| `200`  | Sucesso - resultados retornados        |
| `400`  | Query inválida (menos de 2 caracteres) |
| `500`  | Erro interno do servidor               |

---

## 🔧 Implementação no Frontend

### Exemplo com Axios

```javascript
import axios from "axios";

const searchMotoboys = async (query, filters = {}) => {
  try {
    const params = new URLSearchParams({ q: query, ...filters });
    const response = await axios.get(`/api/motoboys/search?${params}`);
    return response.data;
  } catch (error) {
    console.error("Erro na busca:", error);
    return [];
  }
};

const searchStores = async (query, filters = {}) => {
  try {
    const params = new URLSearchParams({ q: query, ...filters });
    const response = await axios.get(`/api/stores/search?${params}`);
    return response.data;
  } catch (error) {
    console.error("Erro na busca:", error);
    return [];
  }
};

// Uso
const motoboys = await searchMotoboys("joão", { approved: true });
const stores = await searchStores("pizzaria", { available: true });
```

### Exemplo com Debounce

```javascript
import { useState, useEffect } from "react";

const useSearch = (searchFunction, delay = 500) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      const searchResults = await searchFunction(query);
      setResults(searchResults);
      setLoading(false);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, searchFunction, delay]);

  return { query, setQuery, results, loading };
};
```

---

## 📊 Performance

- **Índices otimizados** para busca textual
- **Limite padrão** de 50 resultados
- **Busca case-insensitive** com regex otimizada
- **Paginação** disponível via parâmetro `limit`
- **Campos selecionados** para reduzir transfer de dados

---

## 🧪 Testes

Execute o script de testes:

```bash
node test_search_endpoints.js
```

O script testa:

- ✅ Buscas simples
- ✅ Buscas com filtros
- ✅ Validação de queries inválidas
- ✅ Diferentes tipos de campo (nome, CPF, telefone, endereço)
- ✅ Configuração de índices
