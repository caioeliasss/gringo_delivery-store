# Componente de Precificação

Este componente permite gerenciar as configurações de precificação de entrega do sistema Gringo Delivery.

## Funcionalidades

- **Visualização** dos valores atuais de precificação
- **Edição** dos campos de precificação
- **Salvamento** das alterações com confirmação
- **Interface responsiva** que funciona em desktop e mobile
- **Feedback visual** com notificações de sucesso/erro
- **Validação** de dados antes do salvamento

## Campos Gerenciados

### Preços Base

- **Preço Fixo**: Valor base da entrega
- **Preço por KM Fixo**: Valor cobrado por quilômetro
- **Preço Fixo Alta Demanda**: Preço fixo em períodos de alta demanda

### Preços Especiais

- **Bônus por KM**: Bônus adicional por quilômetro
- **Preço Chuva**: Valor adicional em dias de chuva
- **Volta Dirigindo**: Valor para volta dirigindo

### Configurações

- **Modo Chuva Ativo**: Switch para ativar cobrança adicional por chuva
- **Alta Demanda Ativa**: Switch para ativar preço de alta demanda

## Como Usar

### 1. Importar o Componente

```javascript
import Precificacao from "../pages/Precificacao";
```

### 2. Adicionar Rota (exemplo)

```javascript
// No seu arquivo de rotas
import { Routes, Route } from "react-router-dom";
import Precificacao from "../pages/Precificacao";

function AppRoutes() {
  return (
    <Routes>
      {/* ... outras rotas ... */}
      <Route path="/precificacao" element={<Precificacao />} />
    </Routes>
  );
}
```

### 3. Adicionar ao Menu (opcional)

```javascript
// Adicione no seu arquivo de configuração de menu
{
  path: "/precificacao",
  label: "Precificação",
  icon: AttachMoneyIcon,
}
```

## APIs Necessárias

O componente espera que existam as seguintes rotas na API:

### GET /api/delivery-price

Retorna os dados atuais de precificação.

**Resposta esperada:**

```json
{
  "fixedKm": 2.5,
  "fixedPriceHigh": 15.0,
  "fixedPrice": 8.0,
  "bonusKm": 1.0,
  "priceRain": 3.0,
  "isRain": false,
  "isHighDemand": false,
  "driveBack": 5.0,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### PUT /api/delivery-price

Atualiza os dados de precificação.

**Payload esperado:**

```json
{
  "fixedKm": 2.5,
  "fixedPriceHigh": 15.0,
  "fixedPrice": 8.0,
  "bonusKm": 1.0,
  "priceRain": 3.0,
  "isRain": false,
  "isHighDemand": false,
  "driveBack": 5.0
}
```

## Dependências

O componente utiliza:

- Material-UI (MUI) para a interface
- React Router para navegação
- Contexto de autenticação
- Serviço de API personalizado

## Estrutura de Arquivos

```
src/pages/Precificacao/
├── index.js                 # Export principal
├── Precificacao.js          # Componente principal
└── Precificacao.css         # Estilos específicos
```

## Customização

### Estilos

Os estilos podem ser customizados editando o arquivo `Precificacao.css` ou passando props de estilo para os componentes Material-UI.

### Validação

Para adicionar validação personalizada, modifique as funções `handleInputChange` e `handleSave`.

### Campos Adicionais

Para adicionar novos campos:

1. Adicione o campo no estado `deliveryPrice`
2. Crie o input correspondente na interface
3. Atualize a função de salvamento

## Considerações de Segurança

- O componente verifica autenticação através do contexto `useAuth`
- Todas as requisições incluem token de autenticação automaticamente
- Validação do lado do servidor é recomendada para os endpoints da API

## Problemas Conhecidos

- Certifique-se de que as rotas da API estejam implementadas no backend
- O componente assume que existe um contexto de autenticação configurado
- Verifique se o SideDrawer e outros componentes dependentes estão disponíveis

## Suporte

Para dúvidas ou problemas, consulte a documentação do projeto principal ou entre em contato com a equipe de desenvolvimento.
