import axios, { InternalAxiosRequestConfig } from 'axios';
import config from '../config/config';

// Extender el tipo de configuración de Axios
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
  maxRetries?: number;
}

// Constantes globales
const TIMEOUT = 300000; // 5 minutos
const MAX_RETRIES = 3;

// Función para determinar la URL base de la API
const getBaseURL = () => {
  return config.apiUrl + '/api';
};

// Crear instancia de Axios con configuración personalizada
const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

// Función para reintento de peticiones con backoff exponencial
const retryDelay = (retryNumber = 0) => {
  const base = 2000; // 2 segundos
  return Math.min(base * Math.pow(2, retryNumber), 30000); // Máximo 30 segundos
};

// Interceptor para agregar el token y manejar reintentos
axiosInstance.interceptors.request.use(
  (config: CustomInternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Forzar el timeout para todas las peticiones
    config.timeout = TIMEOUT;
    
    // Log detallado para debugging
    console.log('🚀 Iniciando petición:', {
      url: `${config.baseURL ?? ''}${config.url ?? ''}`,
      method: config.method,
      timeout: config.timeout,
      headers: config.headers,
      data: config.data ? 'Datos presentes' : 'Sin datos'
    });
    
    // Configuración de reintentos
    if (!config.retryCount) {
      config.retryCount = 0;
      config.maxRetries = MAX_RETRIES;
    }

    return config;
  },
  (error) => {
    console.error('❌ Error en la configuración de la petición:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Respuesta exitosa:', {
      url: response.config.url,
      status: response.status,
      data: response.data ? 'Datos recibidos' : 'Sin datos',
      tiempo: `${Date.now() - (response.config as any).startTime}ms`
    });
    return response;
  },
  async (error) => {
    const config = error.config as CustomInternalAxiosRequestConfig;

    // Log detallado del error
    console.error('❌ Error en la petición:', {
      url: config?.url,
      method: config?.method,
      status: error.response?.status,
      message: error.message,
      timeout: config?.timeout,
      retryCount: config?.retryCount,
      maxRetries: config?.maxRetries,
      tiempo: config ? `${Date.now() - (config as any).startTime}ms` : 'N/A'
    });

    // Manejar timeout específicamente
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.log('⏰ Timeout detectado, intentando reintento...');
    }

    // Si no hay configuración de reintento o ya se alcanzó el máximo, rechazar
    if (!config || !config.retryCount || config.retryCount >= (config.maxRetries || MAX_RETRIES)) {
      if (error.response) {
        const status = error.response.status;
        const msg = error.response.data?.error || '';
        if (status === 401) {
          // Solo desloguear si el mensaje es de token inválido/expirado
          if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expirado')) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('lastActivity');
            window.location.href = '/login';
          }
          // Si es 401 pero no es por token, solo rechazar el error
        } else if (status === 403) {
          // No desloguear, solo rechazar el error para que la UI lo maneje
        }
      }
      return Promise.reject(error);
    }

    // Incrementar contador de reintentos
    config.retryCount = (config.retryCount || 0) + 1;

    // Esperar antes de reintentar con backoff exponencial
    const delayTime = retryDelay(config.retryCount - 1);
    console.log(`⏳ Esperando ${delayTime}ms antes de reintentar (intento ${config.retryCount}/${MAX_RETRIES})...`);
    await new Promise(resolve => setTimeout(resolve, delayTime));

    // Añadir timestamp para medir el tiempo
    (config as any).startTime = Date.now();
    
    console.log(`🔄 Reintentando petición (${config.retryCount}/${MAX_RETRIES}):`, config.url);
    return axiosInstance(config);
  }
);

export default axiosInstance; 