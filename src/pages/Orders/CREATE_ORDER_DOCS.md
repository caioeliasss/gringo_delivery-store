# 🚚 Componente de Criação de Corridas

Este documento descreve o novo componente `CreateOrderDialog` que permite criar corridas/pedidos diretamente da página de pedidos.

## 🎯 Funcionalidades

### **1. Seleção de Loja**

- ✅ **Autocomplete** com busca de lojas
- ✅ **Carregamento dinâmico** das lojas via API
- ✅ **Exibição de detalhes** da loja selecionada
- ✅ **Integração com mapa** para visualizar localização

### **2. Gestão de Clientes**

- ✅ **Múltiplos clientes** por pedido
- ✅ **Formulário completo** de dados pessoais
- ✅ **Seleção de endereço** via mapa interativo
- ✅ **Busca de endereço** por texto
- ✅ **Geocodificação reversa** automática

### **3. Itens do Pedido**

- ✅ **Seleção de produtos** da loja
- ✅ **Preenchimento automático** de preços
- ✅ **Múltiplos itens** por pedido
- ✅ **Cálculo automático** do total

### **4. Pagamento**

- ✅ **Múltiplas formas** de pagamento
- ✅ **Campo de troco** para dinheiro
- ✅ **Observações** adicionais
- ✅ **Resumo final** do pedido

## 🛠️ Estrutura do Componente

### **Props**

```javascript
<CreateOrderDialog
  open={boolean}           // Controla se o dialog está aberto
  onClose={function}       // Callback quando o dialog é fechado
  onOrderCreated={function} // Callback quando um pedido é criado
/>
```

### **Estados Principais**

```javascript
const [selectedStore, setSelectedStore] = useState(null);
const [customers, setCustomers] = useState([...]);
const [items, setItems] = useState([...]);
const [payment, setPayment] = useState({...});
const [total, setTotal] = useState(0);
```

## 📋 Abas do Formulário

### **Aba 1: Loja**

- **Autocomplete** para buscar e selecionar loja
- **Card de confirmação** com detalhes da loja
- **Carregamento** dinâmico das opções

### **Aba 2: Clientes**

- **Lista de clientes** com possibilidade de adicionar/remover
- **Formulário completo** por cliente:
  - Nome e telefone
  - Endereço completo (CEP, rua, número, bairro, cidade)
  - Coordenadas via mapa
- **Mapa interativo** para seleção de localização
- **Busca de endereço** com autocomplete do Google

### **Aba 3: Itens**

- **Lista de itens** com possibilidade de adicionar/remover
- **Seleção de produtos** da loja selecionada
- **Campos por item**:
  - Produto (dropdown)
  - Nome do produto (editável)
  - Quantidade
  - Preço unitário
- **Cálculo automático** de subtotals e total

### **Aba 4: Pagamento**

- **Forma de pagamento**: Dinheiro, Cartão de Crédito, Cartão de Débito, PIX
- **Campo de troco** (apenas para dinheiro)
- **Observações** gerais do pedido
- **Resumo final** com total destacado

## 🔄 Fluxo de Uso

1. **Usuário clica** em "Adicionar Corrida" na página de pedidos
2. **Dialog abre** na aba "Loja"
3. **Seleciona loja** via autocomplete
4. **Navega para** aba "Clientes"
5. **Preenche dados** dos clientes
6. **Seleciona endereços** no mapa
7. **Navega para** aba "Itens"
8. **Adiciona produtos** ao pedido
9. **Navega para** aba "Pagamento"
10. **Define forma** de pagamento e observações
11. **Clica "Criar Corrida"**
12. **Pedido é enviado** para API
13. **Lista é atualizada** automaticamente

## 🌐 Integração com APIs

### **Buscar Lojas**

```javascript
GET / api / stores;
// Retorna lista de todas as lojas
```

### **Buscar Produtos**

```javascript
GET / api / products;
// Retorna lista de produtos (após selecionar loja)
```

### **Criar Pedido**

```javascript
POST /api/orders
{
  store: { name, cnpj, coordinates, address },
  customer: [{ name, phone, customerAddress }],
  items: [{ productId, productName, quantity, price }],
  payment: { method, change },
  notes: string,
  total: number
}
```

## 🗺️ Integração com Google Maps

### **Funcionalidades do Mapa**

- **Clique para selecionar** localização
- **Geocodificação reversa** automática
- **Busca de endereço** por texto
- **Marcadores** para cada cliente
- **Centralização automática** na loja selecionada

### **APIs Utilizadas**

- **Geocoding API**: Para busca de endereços
- **Maps JavaScript API**: Para exibição do mapa

## 📱 Responsividade

### **Desktop**

- **Layout em grid** para formulários
- **Mapa em tamanho** completo (400px altura)
- **Botões lado a lado** nas ações

### **Mobile**

- **Campos empilhados** verticalmente
- **Botões em coluna** nas ações
- **Mapa adaptado** para tela menor

## 🎨 Estilos

### **CSS Classes**

- `.create-order-tabs` - Estilo das abas
- `.store-card` - Card da loja selecionada
- `.customer-card` - Card de cada cliente
- `.item-card` - Card de cada item
- `.map-container` - Container do mapa
- `.payment-summary` - Resumo do pagamento

### **Estados Visuais**

- **Store selected**: Destaque na loja selecionada
- **Customer active**: Cliente ativo no mapa
- **Item complete**: Item com dados completos
- **Loading**: Estados de carregamento

## 🚀 Como Usar

### **1. No componente pai (Orders.js)**

```javascript
import CreateOrderDialog from './CreateOrderDialog';

// Estado
const [openCreateOrderDialog, setOpenCreateOrderDialog] = useState(false);

// Botão para abrir
<Button onClick={() => setOpenCreateOrderDialog(true)}>
  Adicionar Corrida
</Button>

// Componente
<CreateOrderDialog
  open={openCreateOrderDialog}
  onClose={() => setOpenCreateOrderDialog(false)}
  onOrderCreated={(newOrder) => {
    setOrders(prevOrders => [newOrder, ...prevOrders]);
  }}
/>
```

### **2. Configuração do Google Maps**

```javascript
// Necessário ter REACT_APP_GOOGLE_MAPS_API_KEY no .env
REACT_APP_GOOGLE_MAPS_API_KEY = sua_chave_aqui;
```

## 🔧 Validações

### **Obrigatórios**

- ✅ Loja selecionada
- ✅ Pelo menos um cliente com nome e telefone
- ✅ Pelo menos um item com quantidade > 0 e preço > 0

### **Opcionais**

- ⚠️ Endereço completo do cliente
- ⚠️ Coordenadas no mapa
- ⚠️ Observações do pedido

## 🐛 Tratamento de Erros

### **Erros de API**

- **Timeout** de requisições
- **Lojas não encontradas**
- **Produtos não carregados**
- **Falha na criação** do pedido

### **Erros de Validação**

- **Campos obrigatórios** vazios
- **Valores inválidos** em campos numéricos
- **Formatos incorretos** de dados

## 🔮 Próximas Melhorias

- [ ] **Cache de lojas** para melhor performance
- [ ] **Histórico de clientes** recentes
- [ ] **Templates de pedidos** frequentes
- [ ] **Cálculo automático** de frete
- [ ] **Integração com** sistema de pagamento
- [ ] **Validação de CEP** em tempo real
- [ ] **Sugestões de produtos** baseadas na loja

## 📞 Suporte

Para dúvidas sobre o componente:

1. Verifique se as APIs necessárias estão funcionando
2. Confirme se a chave do Google Maps está configurada
3. Teste as validações do formulário
4. Verifique os logs do console para erros
