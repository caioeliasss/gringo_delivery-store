# Configuração de Email - Gringo Delivery

Este documento explica como configurar o envio de emails para notificar administradores sobre novos cadastros de estabelecimentos.

## 📧 Funcionalidade

Quando um novo estabelecimento se cadastra através da rota `POST /api/stores/profile`, o sistema automaticamente:

1. Salva o estabelecimento no banco de dados
2. Envia um email para todos os administradores cadastrados
3. O email contém todas as informações do estabelecimento
4. Alerta que é necessário aprovar o CNPJ

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
npm install nodemailer
```

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no seu arquivo `.env`:

#### Para Gmail (Recomendado para desenvolvimento):

```bash
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
```

**Importante**: Para Gmail, você precisa:

1. Ativar a verificação em 2 etapas na sua conta Google
2. Gerar uma "Senha de App" específica para esta aplicação
3. Usar essa senha de app no `EMAIL_PASS`

#### Para outros provedores SMTP:

```bash
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_USER=seu-usuario-smtp
SMTP_PASS=sua-senha-smtp
```

### 3. Configurar Administradores

Certifique-se de ter administradores cadastrados no banco de dados:

```javascript
// Exemplo de admin no MongoDB
{
  firebaseUid: "admin-firebase-uid",
  name: "Nome do Admin",
  email: "admin@exemplo.com",
  role: "ADMIN",
  permissions: []
}
```

## 🧪 Testando a Configuração

### 1. Teste de Configuração

```bash
POST /api/stores/test-email
```

Esta rota (apenas para desenvolvimento):

- Verifica se a configuração de email está correta
- Envia um email de teste para os administradores
- Retorna o status da configuração e do envio

### 2. Teste Real

Faça um cadastro novo através da rota:

```bash
POST /api/stores/profile
```

Os administradores devem receber um email com os dados do estabelecimento.

## 📋 Template do Email

O email enviado contém:

- **Assunto**: "🆕 Novo Cadastro de Estabelecimento - Gringo Delivery"
- **Informações**: Nome do negócio, email, telefone, CNPJ, endereço, data de cadastro
- **Alerta**: Necessidade de aprovação do CNPJ
- **Formato**: HTML responsivo e visualmente atrativo

## 🔧 Personalização

### Modificar Template de Email

Edite o método `notifyAdminsNewStoreRegistration` em `/services/emailService.js`:

```javascript
const htmlContent = `
  <!-- Seu template HTML personalizado -->
`;
```

### Adicionar Novos Tipos de Notificação

Crie novos métodos no `EmailService`:

```javascript
async notifyAdminsNewOrder(orderData) {
  // Implementação para notificar sobre novos pedidos
}

async notifyAdminsSystemAlert(alertData) {
  // Implementação para alertas do sistema
}
```

## ⚠️ Considerações de Produção

1. **Segurança**: Nunca commite senhas no código
2. **Rate Limiting**: Configure limites de envio se usar Gmail
3. **Provedor Profissional**: Para produção, considere usar:

   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

4. **Monitoramento**: Implemente logs detalhados para falhas de email
5. **Fallback**: Considere notificações alternativas (Slack, Discord, etc.)

## 🐛 Troubleshooting

### Email não está sendo enviado

1. Verifique as variáveis de ambiente
2. Confirme que há administradores cadastrados
3. Verifique os logs do servidor
4. Use a rota `/test-email` para diagnóstico

### Gmail retorna erro de autenticação

1. Verifique se a verificação em 2 etapas está ativa
2. Confirme que está usando uma "Senha de App"
3. Verifique se a conta não está bloqueada

### Emails vão para spam

1. Configure SPF, DKIM e DMARC no seu domínio
2. Use um provedor de email profissional
3. Evite palavras que ativam filtros de spam

## 📁 Arquivos Relacionados

- `/services/emailService.js` - Serviço principal de email
- `/routes/storeRoutes.js` - Rota que dispara o envio
- `/models/Admin.js` - Model dos administradores
- `.env.example` - Exemplo de configuração
