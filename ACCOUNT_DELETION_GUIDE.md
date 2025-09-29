# Funcionalidade de Exclusão de Conta - LGPD

## Visão Geral

Este documento descreve a implementação da funcionalidade de exclusão de conta em conformidade com a Lei Geral de Proteção de Dados (LGPD).

## Rotas Implementadas

### 1. Exclusão de Conta Própria

```
DELETE /api/motoboys/delete-account
```

- **Autenticação**: Obrigatória (JWT Token)
- **Descrição**: Permite que o usuário exclua sua própria conta
- **Validações**:
  - Usuário não pode ter entregas ativas
  - Confirmação de identidade obrigatória

**Exemplo de uso:**

```javascript
const response = await fetch("/api/motoboys/delete-account", {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

### 2. Informações sobre Exclusão de Dados

```
GET /api/motoboys/data-deletion-info
```

- **Autenticação**: Não obrigatória
- **Descrição**: Fornece informações sobre direitos LGPD e processo de exclusão

### 3. Verificação de Elegibilidade para Exclusão

```
GET /api/motoboys/can-delete-account
```

- **Autenticação**: Obrigatória (JWT Token)
- **Descrição**: Verifica se o usuário pode excluir a conta no momento

## Página Web de Exclusão

### Local

`/public/delete-account.html`

### Funcionalidades

- Interface amigável para exclusão de conta
- Validação de formulário em tempo real
- Integração com Firebase Authentication
- Avisos de segurança e confirmações múltiplas

### Acessar a página

```
https://seu-dominio.com/delete-account.html
```

## Links de Acesso

### Para usuários finais:

1. **Página de exclusão**: `/delete-account.html`
2. **API de informações**: `/api/motoboys/data-deletion-info`

### Para desenvolvedores:

1. **Endpoint de exclusão**: `DELETE /api/motoboys/delete-account`
2. **Verificação**: `GET /api/motoboys/can-delete-account`

## Processo de Exclusão

### 1. Verificação Prévia

- Usuário acessa a API de verificação
- Sistema confirma se pode excluir (sem entregas ativas)

### 2. Autenticação

- Usuário fornece email e senha
- Firebase Authentication valida credenciais
- Token JWT é gerado

### 3. Confirmação

- Usuário confirma múltiplas vezes a intenção
- Aceita termos de irreversibilidade

### 4. Exclusão

- Sistema verifica novamente as condições
- Conta é excluída permanentemente
- Dados são removidos do banco de dados

## Conformidade LGPD

### Direitos Atendidos

- **Art. 17**: Direito ao esquecimento
- **Art. 18**: Direito à exclusão de dados
- **Art. 19**: Prazo de resposta (até 15 dias úteis)

### Dados Excluídos

- Informações pessoais (nome, email, telefone, CPF)
- Documentos (CNH, RG)
- Histórico de entregas
- Avaliações e pontuação
- Notificações
- Configurações da conta

### Dados Mantidos (Anonimizados)

- Dados estatísticos para fins legais
- Registros de auditoria (sem identificação pessoal)

## Implementação Técnica

### Segurança

- Autenticação obrigatória
- Verificação de entregas ativas
- Confirmação múltipla do usuário
- Logs de auditoria

### Validações

```javascript
// Verificar se pode excluir
if (user.race && user.race.active) {
  throw new Error("Não é possível excluir conta com entregas ativas");
}

// Verificar pedidos pendentes
const pendingOrders = await Order.countDocuments({
  "motoboy.motoboyId": user._id,
  status: { $in: ["em_preparo", "saiu_para_entrega"] },
});
```

### Exclusão Completa

```javascript
// Excluir o usuário
await user.deleteOne();

// Logs podem ser mantidos para auditoria (anonimizados)
console.log(`Conta excluída: ID ${user._id} em ${new Date()}`);
```

## Interface do Usuário

### Recursos da Página

- Design responsivo
- Avisos claros sobre irreversibilidade
- Lista detalhada do que será excluído
- Formulário de confirmação seguro
- Integração com Firebase Auth

### Experiência do Usuário

1. **Informações claras**: O que será excluído e porquê
2. **Avisos de segurança**: Múltiplas confirmações
3. **Validação em tempo real**: Campos obrigatórios
4. **Feedback visual**: Status da operação
5. **Suporte**: Contato para dúvidas

## Contato de Suporte

### LGPD e Privacidade

- **Email**: privacidade@gringodelivery.com
- **Assunto**: "Solicitação de Exclusão de Dados - LGPD"
- **Telefone**: +55 11 99999-9999

## URLs Importantes

### Produção

- Página de exclusão: `https://gringodelivery.com/delete-account.html`
- API de informações: `https://api.gringodelivery.com/motoboys/data-deletion-info`

### Desenvolvimento

- Página de exclusão: `http://localhost:3000/delete-account.html`
- API de informações: `http://localhost:5000/api/motoboys/data-deletion-info`

## Monitoramento e Logs

### Métricas Importantes

- Número de solicitações de exclusão
- Taxa de sucesso/falha
- Motivos de falha (entregas ativas, etc.)
- Tempo de processamento

### Logs de Auditoria

```javascript
console.log(`[EXCLUSÃO] Usuário ${user._id} solicitou exclusão`);
console.log(`[EXCLUSÃO] Conta ${user._id} excluída com sucesso`);
```

## Considerações Futuras

### Melhorias Possíveis

1. **Período de carência**: Aguardar 30 dias antes da exclusão definitiva
2. **Backup temporário**: Manter dados por período legal
3. **Notificação por email**: Confirmar exclusão via email
4. **Dashboard admin**: Monitorar exclusões em massa

### Compliance Adicional

- GDPR (Europa)
- CCPA (Califórnia)
- Outras regulamentações locais
