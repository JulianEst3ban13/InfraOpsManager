#!/bin/bash

# Script para desplegar la aplicación en producción
echo "🚀 Iniciando despliegue en producción..."

# Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 no está instalado. Instalando..."
    npm install -g pm2
fi

# Verificar módulos de Apache necesarios
echo "✅ Verificando módulos de Apache..."
if command -v a2enmod &> /dev/null; then
    # Solo ejecutar en sistemas con a2enmod (Debian/Ubuntu)
    sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
    sudo systemctl restart apache2
    echo "✅ Módulos de Apache habilitados."
fi

# Instalar dependencias
echo "📦 Instalando dependencias del proyecto..."
npm install

# Configurar variables de entorno para producción
if [ ! -f .env.production ]; then
    echo "📝 Creando archivo .env.production..."
    cp .env .env.production
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env.production
fi

# Construir el frontend (si existe)
if [ -d "client" ]; then
    echo "🏗️ Construyendo frontend..."
    cd client
    npm install
    npm run build
    cd ..
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Generar un JWT_SECRET seguro si no existe uno personalizado
if grep -q "JWT_SECRET=cambiarEstoEnProduccionPorUnaClaveSegura" .env.production; then
    echo "🔑 Generando un JWT_SECRET seguro..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    sed -i "s/JWT_SECRET=cambiarEstoEnProduccionPorUnaClaveSegura/JWT_SECRET=$JWT_SECRET/" .env.production
    echo "✅ JWT_SECRET generado y actualizado en .env.production"
fi

# Iniciar la aplicación con PM2
echo "⚡ Iniciando aplicación con PM2..."
pm2 start ecosystem.config.cjs --env production

# Configurar inicio automático con PM2
echo "🔄 Configurando inicio automático..."
pm2 save

# Obtener información de IP y puertos
SERVER_IP=$(hostname -I | awk '{print $1}')
API_PORT=$(grep "PORT=" .env.production | cut -d= -f2 || echo "3001")
SOCKET_PORT=$(grep "SOCKET_PORT=" .env.production | cut -d= -f2 || echo "3002")

echo "🎉 Despliegue completado!"
echo ""
echo "📡 Información de conexión:"
echo "- Servidor API: http://$SERVER_IP:$API_PORT/api"
echo "- Servidor WebSocket: ws://$SERVER_IP:$SOCKET_PORT"
echo ""
echo "🌐 Acceso desde la red:"
echo "- Puedes acceder al frontend en: http://$SERVER_IP:8082"
echo ""
echo "Para verificar el estado de la aplicación, ejecuta: pm2 status"
echo "Para ver los logs, ejecuta: pm2 logs mantenimiento-api" 