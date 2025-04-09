import axios from 'axios';
import { auth } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const createUserProfile = async (userData) => {
  return api.post('/users/profile', userData);
};

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getUserProfile = async () => {
  return api.get('/users/me');
};

export const updateUserProfile = async (profileData) => {
  return api.post('/users/profile', profileData);
};

export default api;