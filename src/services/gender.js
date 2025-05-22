import axios from "axios";

const API_URL = "https://api.genderize.io";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const buscarGenero = async (nome) => {
  const firstName = nome.split(" ")[0];
  return api.get(`/?name=${firstName}`);
};
