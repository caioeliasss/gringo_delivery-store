# Sistema de Mensagens para Erro 429 (Rate Limit)

## Implementação

Foi implementado um sistema para exibir mensagens amigáveis ao usuário quando ocorrer erro 429 (Too Many Requests) na aplicação.

### Arquivos Criados/Modificados:

1. **`src/contexts/SystemMessageContext.js`** - Contexto React para gerenciar mensagens do sistema
2. **`src/utils/systemMessageNotifier.js`** - Utilitário para disparar notificações fora do contexto React
3. **`src/utils/test429Error.js`** - Arquivo para testes manuais
4. **`src/services/api.js`** - Modificado para mostrar mensagem quando detectar erro 429
5. **`src/App.js`** - Modificado para incluir o SystemMessageProvider

### Como Funciona:

#### 1. Detecção do Erro 429

- O sistema monitora automaticamente as requisições HTTP
- Quando uma requisição retorna status 429, o sistema:
  - Tenta novamente automaticamente (backoff exponencial)
  - Exibe uma mensagem amigável na primeira tentativa

#### 2. Mensagem Exibida

Quando ocorre erro 429, o usuário vê uma mensagem no topo da tela:

```
⚠️ Sistema Temporariamente Instável
Estamos enfrentando uma alta demanda no momento. O sistema voltará ao normal em instantes. Agradecemos sua paciência!
```

#### 3. Localização das Mensagens

- As mensagens aparecem no topo central da tela
- Ficam visíveis por 8 segundos
- Têm alta prioridade visual (z-index: 9999)
- Estilo de alerta laranja (warning)

### Teste Manual:

Para testar a funcionalidade, abra o console do navegador e execute:

```javascript
test429Message();
```

### Integração Automática:

O sistema está integrado em dois pontos principais:

1. **ApiQueue (Fila de Requisições)**: Linha ~294 em `api.js`
2. **Interceptor de Resposta**: Linha ~438 em `api.js`

### Benefícios:

1. **Experiência do Usuário**: Mensagem clara e tranquilizadora
2. **Transparência**: Informa que o problema é temporário
3. **Automático**: Não requer intervenção manual
4. **Não Invasivo**: Mensagem discreta mas visível
5. **Recuperação Automática**: Sistema continua tentando em background

### Configuração:

- **Duração da Mensagem**: 8 segundos (configurável)
- **Posição**: Topo central (configurável)
- **Estilo**: Warning/Laranja (configurável)
- **Múltiplas Mensagens**: Apenas uma por vez (evita spam)

O sistema está pronto para uso e funcionará automaticamente sempre que houver instabilidade com erro 429.
