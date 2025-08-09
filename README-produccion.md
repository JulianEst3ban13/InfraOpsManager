# Guía de Despliegue en Producción

Esta guía explica cómo desplegar la aplicación de mantenimiento de bases de datos en un entorno de producción usando PM2 y Apache.

## Requisitos previos

- Node.js (v14 o superior)
- PM2 (gestor de procesos para Node.js)
- Apache2 con módulos habilitados: proxy, proxy_http, proxy_wstunnel, rewrite
- MySQL/PostgreSQL (según configuración)

## 1. Preparación del servidor

### Instalar dependencias del sistema

```bash
sudo apt update
sudo apt install nodejs npm apache2
sudo npm install -g pm2
```

### Habilitar módulos de Apache necesarios

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
sudo systemctl restart apache2
```

## 2. Configuración de la aplicación

### Clonar el repositorio

```bash
cd /var/www
sudo mkdir mantenimiento
sudo chown $USER:$USER mantenimiento
git clone [URL_DEL_REPOSITORIO] mantenimiento
cd mantenimiento
```

### Instalar dependencias de Node.js

```bash
npm install
```

### Crear archivo .env para producción

Copia el archivo .env.example a .env y configúralo:

```bash
cp .env.example .env
nano .env
```

Modifica las siguientes líneas en el archivo .env:
```
NODE_ENV=production
DB_HOST=tu_host_bd
DB_USER=tu_usuario_bd
DB_PASSWORD=tu_contraseña_bd
DB_NAME=tu_nombre_bd
JWT_SECRET=una_clave_segura_aleatoria
```

### Construir la aplicación frontend (si corresponde)

```bash
cd client
npm install
npm run build
cd ..
```

## 3. Configuración de PM2

### Iniciar la aplicación con PM2

```bash
pm2 start ecosystem.config.js --env production
```

### Configurar inicio automático

```bash
pm2 startup
pm2 save
```

## 4. Configuración de Apache

### Crear archivo de configuración de VirtualHost

```bash
sudo nano /etc/apache2/sites-available/mantenimiento.conf
```

Copia el contenido del archivo apache.conf.example y ajústalo según tus necesidades.

### Habilitar el sitio y reiniciar Apache

```bash
sudo a2ensite mantenimiento.conf
sudo systemctl restart apache2
```

### Configurar hosts (desarrollo local)

Si estás probando en un entorno local, añade esta entrada a tu archivo hosts:

```
sudo nano /etc/hosts
```

Añade:
```
127.0.0.1 mantenimiento.loc
```

## 5. Monitorización y mantenimiento

### Comandos útiles de PM2

```bash
# Ver logs
pm2 logs mantenimiento-api

# Reiniciar la aplicación
pm2 restart mantenimiento-api

# Monitorizar recursos
pm2 monit

# Actualizar la aplicación
git pull
npm install
cd client && npm install && npm run build
pm2 restart mantenimiento-api
```

## Solución de problemas

### Comprobar estado de la aplicación

```bash
# Verificar que la aplicación está corriendo
pm2 status

# Verificar los logs de la aplicación
pm2 logs mantenimiento-api

# Verificar los logs de Apache
sudo tail -f /var/log/apache2/mantenimiento-error.log
```

### Problemas comunes

1. **Error 502 Bad Gateway**: Asegúrate de que la aplicación Node.js está en ejecución con `pm2 status`.

2. **Socket.IO no conecta**: Verifica que los módulos de Apache para WebSockets estén habilitados y configurados correctamente.

3. **Problemas de CORS**: Asegúrate de que las configuraciones de CORS en el archivo index.js incluyen tu dominio.

4. **Errores de permisos**: Verifica los permisos de los directorios y archivos:
   ```bash
   sudo chown -R www-data:www-data /var/www/mantenimiento
   ``` 