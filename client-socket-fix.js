/**
 * Socket.IO Client Helper
 * 
 * Este archivo debe ser importado en el frontend para gestionar la conexión a Socket.IO
 * correctamente tanto en desarrollo como en producción.
 */

import { io } from "socket.io-client";

// Función para determinar la URL base correcta para Socket.IO
const getSocketURL = () => {
  // Detectar si estamos en producción
  const isProd = window.location.hostname !== 'localhost' && 
                window.location.hostname !== '127.0.0.1';
  
  // Obtener la URL base del entorno si está definida
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost';
  
  if (isProd) {
    // En producción, usar el mismo dominio/host que el frontend
    // (Apache se encargará de hacer proxy a Socket.IO)
    return window.location.origin;
  } else {
    // En desarrollo, conectar directamente al puerto de Socket.IO
    return `${apiBaseUrl}:3002`;
  }
};

// Configuración para Socket.IO
const socketOptions = {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnection: true
};

// Crear instancia de Socket.IO
const socket = io(getSocketURL(), socketOptions);

// Manejadores de eventos básicos
socket.on('connect', () => {
  console.log('✅ Conectado a Socket.IO con ID:', socket.id);
});

socket.on('connection_status', (data) => {
  console.log('📡 Estado de la conexión:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión Socket.IO:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Desconectado de Socket.IO:', reason);
});

// Exportar la instancia de socket para ser usada en componentes
export default socket; 