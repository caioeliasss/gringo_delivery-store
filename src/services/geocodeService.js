const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Serviço para geocodificação de endereços
 * Em produção, deve ser utilizado um serviço como Google Maps API, Mapbox, etc.
 */
class GeocodeService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Converte um endereço textual em coordenadas geográficas (latitude e longitude)
   * @param {string} address - Endereço a ser geocodificado
   * @returns {Promise<{type: string, coordinates: number[]}>} - Objeto com as coordenadas no formato GeoJSON Point
   */
  async geocodeAddress(address) {
    try {
      // Em ambiente de produção, você usaria o seguinte:
      if (this.apiKey) {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
        );
        
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          return {
            type: 'Point',
            coordinates: [location.lng, location.lat] // GeoJSON usa [longitude, latitude]
          };
        }
      }
      
      // Fallback para desenvolvimento (retorna coordenadas aleatórias em São Paulo)
      // Isso é apenas para simulação, remova em produção
      console.log('Usando geocodificação simulada para o endereço:', address);
      return {
        type: 'Point',
        coordinates: [
          -46.6333 + (Math.random() - 0.5) * 0.1, // Longitude (São Paulo + aleatoriedade)
          -23.5505 + (Math.random() - 0.5) * 0.1  // Latitude (São Paulo + aleatoriedade)
        ]
      };
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      throw new Error('Não foi possível geocodificar o endereço');
    }
  }

  /**
   * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine
   * @param {number[]} start - Coordenadas iniciais [longitude, latitude]
   * @param {number[]} end - Coordenadas finais [longitude, latitude]
   * @returns {number} - Distância em metros
   */
  calculateDistance(start, end) {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = this.toRadians(start[1]); // Latitude 1 em radianos
    const φ2 = this.toRadians(end[1]);   // Latitude 2 em radianos
    const Δφ = this.toRadians(end[1] - start[1]);
    const Δλ = this.toRadians(end[0] - start[0]);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // em metros
  }

  /**
   * Estima o tempo de viagem baseado na distância
   * @param {number} distance - Distância em metros
   * @param {number} speed - Velocidade média em km/h (padrão: 20 km/h para tráfego urbano)
   * @returns {number} - Tempo estimado em minutos
   */
  estimateTravelTime(distance, speed = 20) {
    // Converte velocidade de km/h para m/min
    const speedInMetersPerMinute = (speed * 1000) / 60;
    return Math.ceil(distance / speedInMetersPerMinute);
  }

  /**
   * Converte graus para radianos
   * @param {number} degrees - Ângulo em graus
   * @returns {number} - Ângulo em radianos
   */
  toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
}

module.exports = new GeocodeService();