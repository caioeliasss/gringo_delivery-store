# Configuração de APIs de Clima

O sistema de preços dinâmicos utiliza dados meteorológicos para aplicar tarifas diferenciadas em caso de chuva. O sistema funciona com múltiplas APIs de clima como fallback.

## APIs Suportadas

### 1. WeatherAPI (Recomendado)

- **Site**: https://www.weatherapi.com/
- **Plano Gratuito**: 1 milhão de chamadas/mês
- **Configuração**:
  ```bash
  WEATHER_API_KEY=sua_chave_aqui
  ```

### 2. OpenWeatherMap

- **Site**: https://openweathermap.org/
- **Plano Gratuito**: 1.000 chamadas/dia
- **Configuração**:
  ```bash
  OPENWEATHER_API_KEY=sua_chave_aqui
  ```

### 3. Open Meteo (Fallback)

- **Site**: https://open-meteo.com/
- **Gratuito**: Sem limite
- **Não requer API key**

## Como Configurar

1. **Registre-se em pelo menos uma das APIs acima**
2. **Obtenha sua API key**
3. **Adicione ao arquivo `.env`**:
   ```bash
   WEATHER_API_KEY=sua_weather_api_key
   OPENWEATHER_API_KEY=sua_openweather_key
   ```

## Funcionamento

O sistema tentará as APIs na seguinte ordem:

1. WeatherAPI (se configurada)
2. OpenWeatherMap (se configurada)
3. Open Meteo (sempre disponível)
4. Fallback (sem chuva) se todas falharem

## Detecção de Chuva

O sistema considera "chuva" quando:

- **WeatherAPI**: condition.code >= 1180 ou texto contém "chuva"
- **OpenWeatherMap**: weather.main é "Rain", "Drizzle" ou "Thunderstorm"
- **Open Meteo**: weather_code > 60 ou precipitation > 0

## Logs

O sistema gera logs detalhados:

```
🌤️ Buscando clima para coordenadas: -23.5505, -46.6333
✅ Dados do clima obtidos com sucesso: Céu limpo
🌧️ Clima chuvoso detectado - aplicando preço de chuva
```

## Teste

Para testar sem configurar APIs:

- O sistema funcionará com Open Meteo (gratuito)
- Em caso de falha, aplicará preço normal (sem chuva)
