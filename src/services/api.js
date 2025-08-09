import axios from "axios";
import config from "../config/config";

// Configurar la URL base de la API usando la configuración centralizada
const BASE_URL = `${config.apiBaseUrl}:${config.apiPort}`;

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${BASE_URL}/login`, credentials);
    return response.data; // Retorna el token
  } catch (error) {
    console.error("Error en login:", error.response?.data || error.message);
    throw error;
  }
};
