import axios from "axios";
import { auth } from "../firebase";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

console.log(process.env.REACT_APP_API_URL);
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      console.log(token);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Serviços do Usuário
export const createUserProfile = async (userData) => {
  return api.post("/stores/profile", userData);
};

export const getUserProfile = async () => {
  return api.get("/stores/me");
};

export const updateUserProfile = async (profileData) => {
  return api.post("/stores/profile", profileData);
};

// Serviços de Produtos
export const getProducts = async () => {
  return api.get("/products");
};

export const getProductById = async (id) => {
  return api.get(`/products/${id}`);
};

export const createProduct = async (productData) => {
  return api.post("/products/create", productData);
};

export const updateProduct = async (id, productData) => {
  return api.put(`/products/${id}`, productData);
};

export const deleteProduct = async (id) => {
  return api.delete(`/products/${id}`);
};

// Serviços de Pedidos
export const getOrders = async () => {
  return api.get("/orders");
};

export const getOrderById = async (id) => {
  return api.get(`/orders/${id}`);
};

export const createOrder = async (orderData) => {
  return api.post("/orders", orderData);
};

export const updateOrderStatus = async (id, status) => {
  return api.put(`/orders/${id}/status`, { status });
};

// Serviços de Motoboy
export const getMotoboys = async () => {
  return api.get("/motoboys");
};
export const getMotoboy = async (id) => {
  return api.get(`/motoboys/id/${id}`);
};

export const getTravelsMotoboy = async (motoboyId) => {
  return api.get(`/travels/${motoboyId}`);
};

export const findMotoboys = async (orderId) => {
  return api.get("/motoboys/find", {
    params: {
      order_id: orderId,
    },
  });
};

export const orderReady = async (motoboyId, orderId) => {
  return api.post("/notifications/order-ready", {
    motoboyId: motoboyId,
    orderId: orderId,
  });
};

export const updateMotoboyLocation = async (locationData) => {
  return api.put("/motoboys/update-location", locationData);
};

// Função utilitária para converter endereço em coordenadas usando a API do Google Maps
export const geocodeAddress = async (address) => {
  try {
    // Nota: Em produção, você usaria seu próprio serviço proxy para proteger sua API key
    // Aqui estamos usando uma abordagem simplificada para fins de demonstração
    const apiKey = process.env.EXPO_PUBLIC_MAPS_API_KEY;
    const encodedAddress = encodeURIComponent(address);
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );

    if (response.data.status === "OK" && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    throw new Error("Não foi possível geocodificar o endereço");
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    throw error;
  }
};

// Serviços de Estabelecimentos
export const getStores = async () => {
  return api.get("/stores");
};

export const getStore = async (id) => {
  return api.get(`/stores/id/${id}`);
};

export const getStoreOrders = async (storeId) => {
  return api.get(`/orders/store/${storeId}`);
};

export const approveStore = async (storeId) => {
  return api.post(`/stores/approve/${storeId}`);
};

export const reproveStore = async (storeId) => {
  return api.post(`/stores/reprove/${storeId}`);
};

export const updateStoreStatus = async (storeId, status) => {
  return api.put(`/stores/${storeId}/status`, { status });
};

export const updateStoreBilling = async (storeId, billingOptions) => {
  return api.post(`/stores/billingOptions`, { storeId, billingOptions });
};

// Serviços de Precificação de Entrega
export const getDeliveryPrice = async () => {
  return api.get("/delivery-price");
};

export const updateDeliveryPrice = async (priceData) => {
  return api.put("/delivery-price", priceData);
};

export const createDeliveryPrice = async (priceData) => {
  return api.post("/delivery-price", priceData);
};

export default api;
