# Como Adicionar o Som de Notificação

## 🔊 Arquivo de Som Necessário

Coloque o arquivo `gringo-notification.wav` neste diretório (`public/sounds/`).

### Características Recomendadas:

- **Formato**: WAV, MP3, ou OGG
- **Duração**: 1-3 segundos (ideal)
- **Volume**: Normalizado (não muito alto)
- **Taxa de bits**: 128kbps ou superior

### Formatos Suportados por Navegador:

- **Chrome/Edge**: WAV, MP3, OGG
- **Firefox**: WAV, MP3, OGG
- **Safari**: WAV, MP3
- **Mobile**: MP3 recomendado

## 📁 Estrutura Esperada:

```
public/
  sounds/
    gringo-notification.wav  ← Seu arquivo aqui
```

## 🎵 Teste de Som

Após adicionar o arquivo, você pode testar:

1. Ir para `/notificacoes`
2. Habilitar notificações push
3. Clicar em "Testar"
4. O som deve tocar junto com a notificação

## ⚠️ Limitações do Navegador

### Política de Autoplay:

- Alguns navegadores bloqueiam autoplay de áudio
- O som pode não tocar na primeira notificação
- Após primeira interação do usuário, funcionará normalmente

### Fallback:

Se o som não carregar:

- Verificar se o arquivo existe
- Verificar console para erros
- Testar diferentes formatos de arquivo

## 🔧 Personalização

Para alterar o som padrão, edite em:
`src/services/webPushService.js`

```javascript
// Linha ~99
soundFile: options.soundFile || "/sounds/SEU-SOM-AQUI.wav";
```
