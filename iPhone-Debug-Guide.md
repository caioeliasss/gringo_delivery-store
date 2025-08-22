# 📱 Debug Guide - iPhone Real vs Playwright

## 🔍 Por que funciona no Playwright mas não no iPhone real?

### 1. **Playwright WebKit vs Safari Real**

- **Playwright**: Ambiente controlado, sem restrições de segurança
- **iPhone Real**: Restrições de segurança completas, CORS rigoroso

### 2. **Principais Diferenças**

| Aspecto        | Playwright          | iPhone Real                          |
| -------------- | ------------------- | ------------------------------------ |
| HTTPS          | Opcional            | Obrigatório em produção              |
| CORS           | Relaxado            | Rigoroso                             |
| Service Worker | Funciona facilmente | Requer configurações específicas     |
| localStorage   | Sempre disponível   | Pode estar bloqueado em modo privado |
| Fetch API      | Sem restrições      | Restrições de domínio                |

## 🛠️ Como Debugar no iPhone

### 1. **Habilitar Debug no Safari iPhone**

```
Configurações > Safari > Avançado > Web Inspector = ON
```

### 2. **Conectar ao Mac para Debug**

```
1. Conecte iPhone ao Mac via cabo
2. Abra Safari no Mac
3. Menu: Develop > [Seu iPhone] > localhost:3000
4. Console será exibido no Mac
```

### 3. **Debug Visual na Tela**

O script que adicionamos cria uma div de debug visível:

- Aparece no canto inferior esquerdo
- Mostra erros em tempo real
- Fica visível por 5 segundos

### 4. **Logs Específicos para iPhone**

Procure por logs que começam com `📱`:

```javascript
📱 iPhone detectado - iniciando debug...
📱 iPhone Debug Info: {...}
📱 iPhone: Iniciando login...
📱 iPhone Error: ...
```

## ⚠️ Problemas Comuns iPhone vs Playwright

### 1. **Problema: Tela Branca**

**Cause**: JavaScript não carrega por erro de CORS/HTTPS
**Solução**:

- Verificar console por erros
- Usar HTTPS em produção
- Configurar CORS no backend

### 2. **Problema: Inputs não funcionam**

**Cause**: Zoom automático ou problema de viewport
**Solução**: CSS adicionado resolve (font-size: 16px)

### 3. **Problema: Fetch falha**

**Cause**: CORS ou Mixed Content
**Solução**: Headers específicos adicionados no script

### 4. **Problema: Service Worker não registra**

**Cause**: HTTPS obrigatório no iPhone
**Solução**: Testar apenas em HTTPS

## 🔧 Checklist de Debug

### Passo 1: Verificar se React carrega

```javascript
// No console do iPhone (via Mac)
document.querySelector(".MuiContainer-root"); // Deve retornar elemento
```

### Passo 2: Verificar erros de rede

```javascript
// Verificar se há erros 404, CORS, etc no Network tab
```

### Passo 3: Testar localStorage

```javascript
// No console
localStorage.setItem("test", "123");
localStorage.getItem("test"); // Deve retornar '123'
```

### Passo 4: Verificar fetch

```javascript
// Testar uma requisição simples
fetch("/api/test")
  .then((r) => console.log(r))
  .catch((e) => console.error(e));
```

## 📋 Comandos para Debug

### Verificar se está funcionando:

```bash
# No terminal do projeto
npm start

# Verificar se abre em:
# - Desktop: ✅ http://localhost:3000
# - iPhone: ❌ http://[IP-LOCAL]:3000 (pode não funcionar)
# - iPhone: ✅ https://[IP-LOCAL]:3000 (precisa HTTPS)
```

### Criar servidor HTTPS local:

```bash
# Instalar mkcert para HTTPS local
brew install mkcert  # Mac
# ou
choco install mkcert # Windows

# Gerar certificados
mkcert localhost 192.168.1.X

# Usar com React (package.json)
"start": "HTTPS=true SSL_CRT_FILE=localhost+1.pem SSL_KEY_FILE=localhost+1-key.pem react-scripts start"
```

## 🚨 Soluções por Tipo de Erro

### ❌ Tela Branca Total

1. Verificar se JavaScript está habilitado
2. Verificar console por erros de sintaxe
3. Testar com HTTPS

### ❌ Logo não carrega

1. Problema de CORS com imgur
2. Substituir por logo local: `/logo_perfil.png`

### ❌ API não funciona

1. Verificar se backend está acessível via IP
2. Configurar CORS no backend para aceitar IP local
3. Usar HTTPS no backend também

### ❌ Inputs fazem zoom

1. CSS já corrigido com `font-size: 16px`
2. Verificar se CSS foi carregado

## 🎯 Próximos Passos

1. **Teste com HTTPS**: Use `ngrok` ou `mkcert`
2. **Verifique CORS**: Configure backend para aceitar requests do IP local
3. **Use Debug Visual**: A div de debug mostrará erros em tempo real
4. **Connect ao Mac**: Para ver console completo

### Comando rápido para HTTPS:

```bash
# Usar ngrok (mais fácil)
npm install -g ngrok
ngrok http 3000

# Vai gerar URL HTTPS que funciona no iPhone
```

O problema principal é geralmente **HTTPS + CORS**. O Playwright roda em ambiente controlado, mas o iPhone real precisa de configurações de produção.
