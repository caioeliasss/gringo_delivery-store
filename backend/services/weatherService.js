const axios = require("axios");

class WeatherService {
  static async getWeather(latitude, longitude) {
    console.log(
      `🌤️ Buscando clima para coordenadas: ${latitude}, ${longitude}`
    );

    // Tentar múltiplas APIs em ordem de preferência
    const providers = [
      () => this.getWeatherFromWeatherAPI(latitude, longitude),
      () => this.getWeatherFromOpenWeather(latitude, longitude),
      () => this.getWeatherFromOpenMeteo(latitude, longitude),
    ];

    for (const provider of providers) {
      try {
        const weather = await provider();
        console.log(
          "✅ Dados do clima obtidos com sucesso:",
          weather.current.condition || "OK"
        );
        return weather;
      } catch (error) {
        console.warn("⚠️ Falha em provedor de clima:", error.message);
        continue;
      }
    }

    // Se todas falharem, retornar dados padrão
    console.warn("🌤️ Usando dados padrão do clima");
    return {
      current: {
        weather_code: 0,
        is_raining: false,
        description: "Tempo desconhecido",
        temperature: 25,
        provider: "fallback",
      },
    };
  }

  static async getWeatherFromWeatherAPI(latitude, longitude) {
    const API_KEY = process.env.WEATHER_API_KEY;
    if (!API_KEY) throw new Error("WEATHER_API_KEY não configurada");

    const response = await axios.get(
      `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${latitude},${longitude}&lang=pt`,
      { timeout: 5000 }
    );

    const isRaining =
      response.data.current.condition.code >= 1180 ||
      response.data.current.condition.text.toLowerCase().includes("chuva") ||
      response.data.current.condition.text.toLowerCase().includes("chuvisco");

    return {
      current: {
        weather_code: isRaining ? 61 : 0,
        is_raining: isRaining,
        condition: response.data.current.condition.text,
        temperature: response.data.current.temp_c,
        humidity: response.data.current.humidity,
        provider: "weatherapi",
      },
    };
  }

  static async getWeatherFromOpenWeather(latitude, longitude) {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) throw new Error("OPENWEATHER_API_KEY não configurada");

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=pt_br`,
      { timeout: 5000 }
    );

    const isRaining = response.data.weather.some((condition) =>
      ["Rain", "Drizzle", "Thunderstorm"].includes(condition.main)
    );

    return {
      current: {
        weather_code: isRaining ? 61 : 0,
        is_raining: isRaining,
        condition: response.data.weather[0].description,
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        provider: "openweather",
      },
    };
  }

  static async getWeatherFromOpenMeteo(latitude, longitude) {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude,
        longitude,
        current:
          "temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code",
        timezone: "America/Sao_Paulo",
        forecast_days: 1,
      },
      timeout: 5000,
    });

    const isRaining =
      response.data.current.weather_code > 60 ||
      response.data.current.precipitation > 0 ||
      response.data.current.rain > 0;

    return {
      current: {
        weather_code: response.data.current.weather_code,
        is_raining: isRaining,
        condition: this.getWeatherDescription(
          response.data.current.weather_code
        ),
        temperature: response.data.current.temperature_2m,
        humidity: response.data.current.relative_humidity_2m,
        provider: "openmeteo",
      },
    };
  }

  static getWeatherDescription(weatherCode) {
    const descriptions = {
      0: "Céu limpo",
      1: "Principalmente limpo",
      2: "Parcialmente nublado",
      3: "Nublado",
      45: "Neblina",
      48: "Neblina com geada",
      51: "Garoa leve",
      53: "Garoa moderada",
      55: "Garoa intensa",
      61: "Chuva leve",
      63: "Chuva moderada",
      65: "Chuva intensa",
      80: "Pancadas de chuva leves",
      81: "Pancadas de chuva moderadas",
      82: "Pancadas de chuva intensas",
      95: "Tempestade",
      96: "Tempestade com granizo leve",
      99: "Tempestade com granizo intenso",
    };
    return descriptions[weatherCode] || "Condição desconhecida";
  }
}

module.exports = { getWeather: WeatherService.getWeather.bind(WeatherService) };
