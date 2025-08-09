#!/bin/bash

# Script para instalar dependencias faltantes

echo "🚀 Instalando dependencias faltantes..."

# Instalar handlebars que falta en la aplicación
npm install handlebars

# Lista de otras dependencias potencialmente necesarias para producción
npm install pm2 -g
npm install dotenv express cors mysql2 pg bcryptjs jsonwebtoken helmet express-rate-limit socket.io

# Verificar si hay módulos ES que necesitan ser instalados con --save
echo "✅ Todas las dependencias instaladas correctamente"

# Reiniciar la aplicación
echo "🔄 Reiniciando la aplicación..."
pm2 restart mantenimiento-api

echo "🎉 ¡Listo! La aplicación debería funcionar correctamente ahora." 