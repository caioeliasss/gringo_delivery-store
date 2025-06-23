import axios from "axios";

const api = axios.create({
  baseURL: "https://api.open-meteo.com/v1/forecast",
});

export const getWeather = async (latitude, longitude) => {
  try {
    const response = await api.get("", {
      params: {
        latitude,
        longitude,
        current:
          "temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code",
        timezone: "America/Sao_Paulo",
        forecast_days: 1,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar o clima:", error.message);
    throw error;
  }
};
