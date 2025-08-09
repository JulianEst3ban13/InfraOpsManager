/**
 * Este script debe ser añadido al frontend para corregir 
 * problemas de conexión a Socket.IO
 */

// Este código debe ejecutarse antes de que se intente conectar a Socket.IO

// 1. Encuentra todas las referencias a 'localhost:3002' en el código compilado
console.log('🔧 Iniciando corrección de conexiones Socket.IO...');

// 2. Redefinir la función de conexión de Socket.IO
window.__originalSocketConnect = window.io?.connect;

window.io = {
  ...window.io,
  connect: function(url, options) {
    let newUrl = url;
    
    // Si estamos en producción (no localhost)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Sustituir las URLs locales por la URL actual
      if (url && url.includes('localhost:3002')) {
        newUrl = window.location.origin;
        console.log(`🔄 Redirigiendo conexión Socket.IO: ${url} → ${newUrl}`);
      }
    }
    
    // Asegurarnos de incluir la ruta de Socket.IO
    const newOptions = {
      ...options,
      path: '/socket.io'
    };
    
    // Usar la función original pero con los parámetros corregidos
    return window.__originalSocketConnect?.(newUrl, newOptions) || null;
  }
};

console.log('✅ Corrección de conexiones Socket.IO aplicada!'); 