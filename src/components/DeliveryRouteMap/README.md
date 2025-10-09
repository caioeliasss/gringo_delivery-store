# DeliveryRouteMap Component

Um componente reutilizável para exibir mapas de entrega com rotas dinâmicas baseadas no status do pedido.

## Funcionalidades

- **Rota Inteligente**: Mostra automaticamente a rota do motoboy para a loja ou cliente baseado no status da entrega
- **Marcadores Personalizados**: Exibe ícones diferenciados para motoboy, loja e cliente
- **Informações em Tempo Real**: Exibe distância e tempo estimado da rota
- **Auto-Refresh**: Opção de atualização automática dos dados
- **Responsive**: Adaptável a diferentes tamanhos de tela

## Uso Básico

```jsx
import DeliveryRouteMap from "../components/DeliveryRouteMap";

function OrderDetails({ orderId }) {
  return (
    <div>
      <DeliveryRouteMap
        orderId={orderId}
        height="400px"
        showRouteInfo={true}
        showRefreshButton={true}
      />
    </div>
  );
}
```

## Props

| Prop                | Tipo     | Padrão          | Descrição                                                            |
| ------------------- | -------- | --------------- | -------------------------------------------------------------------- |
| `orderId`           | string   | **obrigatório** | ID do pedido para buscar dados                                       |
| `height`            | string   | "600px"         | Altura do mapa                                                       |
| `showRouteInfo`     | boolean  | true            | Mostrar informações da rota (chips de status, distância, tempo)      |
| `showRefreshButton` | boolean  | true            | Mostrar botão de atualização manual                                  |
| `autoRefresh`       | boolean  | false           | Ativar atualização automática                                        |
| `refreshInterval`   | number   | 30000           | Intervalo de auto-refresh em milissegundos                           |
| `onRouteUpdate`     | function | undefined       | Callback chamado quando a rota é atualizada                          |
| `isLoaded`          | boolean  | undefined       | Status do carregamento da API do Google Maps (para evitar conflitos) |
| `loadError`         | Error    | undefined       | Erro de carregamento da API do Google Maps                           |

## Lógica de Rota

O componente determina automaticamente qual rota exibir baseado no status do pedido:

### 1. Motoboy → Loja

- **Condição**: `order.motoboy.hasArrived === false`
- **Destino**: Coordenadas da loja
- **Status**: Chip azul "Rota até a loja"

### 2. Motoboy → Cliente

- **Condição**: `order.motoboy.hasArrived === true && order.arrivedDestination === false`
- **Destino**: Coordenadas do cliente
- **Status**: Chip roxo "Rota até o cliente"

### 3. Entrega Concluída

- **Condição**: `order.motoboy.hasArrived === true && order.arrivedDestination === true`
- **Rota**: Nenhuma
- **Status**: Chip verde "Entrega concluída"

## Exemplos de Uso

### Exemplo Básico (com Google Maps Loader)

```jsx
import { useJsApiLoader } from "@react-google-maps/api";
import DeliveryRouteMap from "../components/DeliveryRouteMap";

function OrderDetails({ orderId }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "maps", "geometry"],
  });

  return (
    <DeliveryRouteMap
      orderId={orderId}
      isLoaded={isLoaded}
      loadError={loadError}
    />
  );
}
```

### Exemplo Simples (sem conflito de loaders)

```jsx
<DeliveryRouteMap
  orderId="60f1b2a3c4d5e6f7a8b9c0d1"
  isLoaded={isLoaded}
  loadError={loadError}
/>
```

### Exemplo com Callback

```jsx
<DeliveryRouteMap
  orderId="60f1b2a3c4d5e6f7a8b9c0d1"
  height="500px"
  isLoaded={isLoaded}
  loadError={loadError}
  onRouteUpdate={(routeInfo) => {
    if (routeInfo) {
      console.log(
        `Distância: ${routeInfo.distance}, Tempo: ${routeInfo.duration}`
      );
      // Salvar informações no estado do componente pai
      setRouteInfo(routeInfo);
    }
  }}
/>
```

### Exemplo com Auto-Refresh

```jsx
<DeliveryRouteMap
  orderId="60f1b2a3c4d5e6f7a8b9c0d1"
  autoRefresh={true}
  refreshInterval={15000} // 15 segundos
  showRefreshButton={false} // Esconder botão manual quando há auto-refresh
/>
```

### Exemplo Minimalista

```jsx
<DeliveryRouteMap
  orderId="60f1b2a3c4d5e6f7a8b9c0d1"
  height="300px"
  showRouteInfo={false}
  showRefreshButton={false}
/>
```

## Estados do Componente

### Carregando

- Exibe spinner enquanto busca dados do pedido
- Mostra "Carregando Google Maps..." se a API ainda não carregou

### Erro

- Mostra alert de erro com botão "Tentar Novamente"
- Trata erros de rede e da API do Google Maps

### Sem Motoboy

- Exibe mensagem informativa quando o pedido não tem motoboy atribuído

### Dados Válidos

- Renderiza o mapa com marcadores e rota (se aplicável)

## Callback de Rota (onRouteUpdate)

O callback `onRouteUpdate` é chamado sempre que uma nova rota é calculada:

```jsx
const handleRouteUpdate = (routeInfo) => {
  if (routeInfo) {
    // routeInfo contém:
    console.log(routeInfo.distance); // "2.5 km"
    console.log(routeInfo.duration); // "8 mins"
    console.log(routeInfo.distanceValue); // 2500 (metros)
    console.log(routeInfo.durationValue); // 480 (segundos)
  } else {
    // Rota não pôde ser calculada
    console.log("Rota não disponível");
  }
};
```

## Integração com Outras Páginas

O componente pode ser facilmente integrado em diferentes páginas:

### Em Páginas de Admin

```jsx
// src/pages/Admin/OrderDetails.js
import DeliveryRouteMap from "../../components/DeliveryRouteMap";

function AdminOrderDetails({ orderId }) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Detalhes da Entrega
      </Typography>

      <DeliveryRouteMap
        orderId={orderId}
        height="500px"
        autoRefresh={true}
        refreshInterval={30000}
      />
    </Box>
  );
}
```

### Em Páginas de Loja

```jsx
// src/pages/Store/MyOrders.js
import DeliveryRouteMap from "../../components/DeliveryRouteMap";

function StoreOrderTracking({ order }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Pedido #{order.orderNumber}</Typography>

        <DeliveryRouteMap
          orderId={order._id}
          height="400px"
          showRefreshButton={true}
          onRouteUpdate={(routeInfo) => {
            // Atualizar ETA no estado da loja
            if (routeInfo) {
              setEstimatedDeliveryTime(routeInfo.duration);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
```

### Em Modal/Dialog

```jsx
function OrderTrackingModal({ open, orderId, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Rastreamento da Entrega</DialogTitle>
      <DialogContent>
        <DeliveryRouteMap
          orderId={orderId}
          height="500px"
          autoRefresh={true}
          refreshInterval={20000}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Dependências

O componente requer:

- `@react-google-maps/api`
- `@mui/material`
- `@mui/icons-material`
- Google Maps API Key configurada em `REACT_APP_GOOGLE_MAPS_API_KEY`

## ⚠️ Importante: Prevenção de Conflitos do Google Maps

Para evitar o erro "Loader must not be called again with different options", o componente **não possui seu próprio `useJsApiLoader`**. Você deve passar os props `isLoaded` e `loadError` da página/componente pai.

### Configuração Correta

```jsx
// Na página pai (ex: Orders.js)
const { isLoaded, loadError } = useJsApiLoader({
  id: "google-map-script", // ID único em toda a aplicação
  googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  libraries: ["places", "maps", "geometry"], // Incluir "geometry" para rotas
});

// Passar para o componente
<DeliveryRouteMap
  orderId={orderId}
  isLoaded={isLoaded}
  loadError={loadError}
/>;
```

### ❌ Não Fazer (Causa Conflito)

```jsx
// Não use múltiplos useJsApiLoader com IDs diferentes
const { isLoaded: isLoaded1 } = useJsApiLoader({ id: "map-1", ... });
const { isLoaded: isLoaded2 } = useJsApiLoader({ id: "map-2", ... }); // ERRO!
```

## Performance

- **Cache**: Utiliza o sistema de cache interno da API para otimizar requisições
- **Debounce**: Evita recálculos desnecessários de rota
- **Lazy Loading**: Só carrega dados quando necessário
- **Memory Management**: Limpa timers e listeners ao desmontar

## Personalização

### Cores da Rota

As cores podem ser personalizadas modificando as `polylineOptions`:

```jsx
// No componente DeliveryRouteMap.js
polylineOptions: {
  strokeColor: "#FF5722",      // Cor da linha
  strokeOpacity: 0.9,          // Opacidade
  strokeWeight: 5,             // Espessura
}
```

### Ícones dos Marcadores

Os ícones são gerados dinamicamente com emojis. Para personalizar, modifique a função `createFontAwesomeMarker`.

## Troubleshooting

### Mapa não carrega

- Verifique se a API Key do Google Maps está configurada
- Confirme se as bibliotecas "places" e "geometry" estão habilitadas

### Rota não aparece

- Confirme que o motoboy tem coordenadas válidas
- Verifique se há destino válido (loja ou cliente)
- Verifique logs do console para erros da API de direções

### Performance lenta

- Reduza o `refreshInterval` se usar auto-refresh
- Considere desabilitar `autoRefresh` em páginas com múltiplos mapas

## Licença

Este componente faz parte do sistema Gringo Delivery e segue as mesmas políticas de licenciamento do projeto.
