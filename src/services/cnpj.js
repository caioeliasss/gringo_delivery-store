import axios from "axios";

const API_URL = "https://brasilapi.com.br/api/cnpj/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer 123",
  },
});

export const buscarCnpj = async (cnpj) => {
  return api.get(`/${cnpj}`);
};
