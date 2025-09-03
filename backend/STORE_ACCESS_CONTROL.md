# Sistema de Controle de Acesso para Estabelecimentos

Este documento explica o sistema de controle de acesso implementado para estabelecimentos baseado no campo `freeToNavigate`.

## 📋 Funcionamento

### Campo `freeToNavigate`

- **`true`**: Estabelecimento pode acessar normalmente a plataforma
- **`false`**: Estabelecimento é redirecionado para página de aguardo de liberação
- **Padrão**: `false` (novos cadastros ficam bloqueados até liberação manual)

## 🚪 Fluxo de Acesso

### 1. Novo Cadastro

```javascript
// Quando uma loja se cadastra
freeToNavigate: false; // Bloqueado por padrão
```

### 2. Verificação de Acesso

```javascript
// StoreAccessControl.js verifica o valor
if (StoreUser.freeToNavigate === false) {
  return <Liberacao />; // Mostra página de aguardo
}
return children; // Permite acesso normal
```

### 3. Liberação Manual

```javascript
// Admin/Suporte pode liberar via API
PUT /api/stores/liberar-acesso/:storeId
// Define freeToNavigate = true
```

## 🎯 Páginas Protegidas

Todas as principais rotas da loja são protegidas pelo `StoreAccessControl`:

- `/dashboard` - Dashboard principal
- `/produtos` - Gestão de produtos
- `/pedidos` - Gestão de pedidos
- `/ocorrencias` - Ocorrências
- `/chat` - Chat com suporte
- `/corridas` - Gestão de corridas
- `/financeiro` - Área financeira
- `/coordenadas` - Coordenadas
- `/settings` - Configurações
- `/negociacoes-ifood` - Negociações iFood

## 📄 Página de Aguardo (`Liberacao.js`)

### Conteúdo:

- ✅ Ícone de acesso restrito
- ✅ Título "Acesso Restrito"
- ✅ Status "Aguardando Liberação do Estabelecimento"
- ✅ Lista do processo de aprovação
- ✅ Tempo estimado (24-72h úteis)
- ✅ Próximos passos
- ✅ Botões de ação (Contatar Suporte, Verificar Status)
- ✅ Informações de contato

### Design:

- Material-UI responsivo
- Cores da marca Gringo Delivery
- Interface profissional e informativa
- Botões para ações do usuário

## 🔧 APIs Disponíveis

### Liberar Acesso

```bash
PUT /api/stores/liberar-acesso/:storeId
```

**Response:**

```json
{
  "message": "Acesso liberado com sucesso",
  "store": {
    "_id": "store_id",
    "businessName": "Nome da Loja",
    "freeToNavigate": true
  }
}
```

### Restringir Acesso

```bash
PUT /api/stores/restringir-acesso/:storeId
```

**Response:**

```json
{
  "message": "Acesso restringido com sucesso",
  "store": {
    "_id": "store_id",
    "businessName": "Nome da Loja",
    "freeToNavigate": false
  }
}
```

## 💡 Casos de Uso

### 1. Novo Estabelecimento

1. Se cadastra via `/register`
2. `freeToNavigate` = `false` automaticamente
3. Vê página de aguardo em qualquer rota protegida
4. Admin recebe email de novo cadastro
5. Admin libera manualmente via API ou painel

### 2. Estabelecimento Problemático

1. Admin pode restringir acesso temporariamente
2. Loja perde acesso até resolver problemas
3. Admin pode liberar novamente quando apropriado

### 3. Manutenção/Auditoria

1. Restringir acesso durante verificações
2. Garantir que loja está em conformidade
3. Liberar após validações

## 🛠️ Implementação Técnica

### Frontend (`StoreAccessControl.js`)

```javascript
// Verifica StoreUser.freeToNavigate
// Redireciona para <Liberacao /> se false
// Permite acesso normal se true
```

### Backend (`storeRoutes.js`)

```javascript
// PUT /liberar-acesso/:storeId
// PUT /restringir-acesso/:storeId
// Atualiza freeToNavigate no banco
```

### Model (`Store.js`)

```javascript
freeToNavigate: {
  type: Boolean,
  default: false
}
```

## 📱 Experiência do Usuário

### Acesso Liberado

- ✅ Navegação normal em todas as páginas
- ✅ Acesso completo às funcionalidades

### Acesso Restrito

- ⛔ Redirecionamento automático para página de aguardo
- 📧 Orientação para contatar suporte
- 🔄 Botão para verificar status atualizado
- ⏰ Informação sobre tempo de aprovação

## 🔐 Segurança

- ✅ Verificação no frontend e backend
- ✅ Dados sensíveis protegidos até liberação
- ✅ Controle granular por estabelecimento
- ✅ Logs de alterações de status
- ✅ APIs protegidas (apenas admin/suporte)

## 📊 Monitoramento

Para monitorar o sistema:

```javascript
// Buscar lojas com acesso restrito
const restrictedStores = await Store.find({ freeToNavigate: false });

// Buscar lojas liberadas
const freeStores = await Store.find({ freeToNavigate: true });
```

Este sistema garante que apenas estabelecimentos aprovados tenham acesso completo à plataforma, mantendo controle e qualidade do serviço.
