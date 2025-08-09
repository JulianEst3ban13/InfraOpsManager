// Configuración centralizada para acceder a variables de entorno
const config = {
  // Base URL para API
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || window.location.protocol + '//' + window.location.hostname,
  // Puerto para API
  apiPort: import.meta.env.VITE_PORT || '3001',
  // Puerto para Websockets
  wsPort: import.meta.env.VITE_SOCKET_PORT || '3002',
  // URL completa de la API
  apiUrl: `${import.meta.env.VITE_API_BASE_URL || window.location.protocol + '//' + window.location.hostname}:${import.meta.env.VITE_PORT || '3001'}`
};

export default config; 