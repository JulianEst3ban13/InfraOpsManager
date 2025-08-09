# Documentación de `server/index.js`

## Descripción
El archivo `index.js` es el punto de entrada principal del backend. Aquí se configuran los middlewares globales, la conexión a la base de datos, el registro de rutas y el manejo de errores y rutas no encontradas.

---

## Estructura general
- **Importaciones:** Librerías, middlewares, rutas y utilidades.
- **Configuración de variables de entorno:** Uso de `dotenv`.
- **Inicialización de Express y middlewares globales:**
  - CORS
  - JSON parsing
  - Seguridad (`helmet`)
  - Rate limiting
- **Conexión a la base de datos:** MySQL y PostgreSQL
- **Registro de rutas:**
  - Rutas de negocio (`/api/usuarios`, `/api/mantenimientos`, etc.)
  - Rutas de utilidades y administración
  - **Rutas AWS:** `/api/aws/*` - Gestión de costos y presupuestos AWS
- **Middlewares de autenticación y permisos:**
  - `verifyTokenMiddleware`
  - `checkPermission`
- **Manejo de rutas no encontradas:**
  - En producción, cualquier ruta no manejada que no sea `/api` redirige al frontend; si es `/api`, responde 404.

---

## Módulos Documentados

### 📊 AWS Cost Dashboard
- **Archivo:** `docs/aws_cost_dashboard.md`
- **Descripción:** Módulo completo para gestión y visualización de costos diarios de AWS
- **Funcionalidades:**
  - Dashboard interactivo con filtros por año/mes
  - Gráficos de líneas, barras y torta
  - Sistema de presupuestos mensuales
  - Envío automático de reportes por correo
  - Gestión CRUD completa de costos
- **Endpoints:** `/api/aws/budget`, `/api/aws/cost`, `/api/aws/send-cost-summary`

### 🔐 Autenticación y Permisos
- **Archivo:** `docs/roles_permisos.md`
- **Descripción:** Sistema de roles y permisos del usuario

### 🔒 MFA (Multi-Factor Authentication)
- **Archivo:** `docs/mfa.md`
- **Descripción:** Implementación de autenticación de dos factores

### 🛡️ Middlewares
- **Archivo:** `docs/middleware.md`
- **Descripción:** Middlewares de autenticación y autorización

### 📝 Logs de Sesión
- **Archivo:** `docs/logs_sesion.md`
- **Descripción:** Sistema de logging y auditoría

### 🔑 Política de Contraseñas
- **Archivo:** `docs/password_policy.md`
- **Descripción:** Políticas de seguridad para contraseñas

### ⚙️ Configuración de Usuario
- **Archivo:** `docs/USER_SETTINGS.md`
- **Descripción:** Configuraciones y preferencias de usuario

---

## Ejemplo de manejo de rutas no encontradas
```js
if (isProd) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}
```

- **Importante:** Este middleware debe ir al final del archivo, después de registrar todas las rutas de la API.

---

## Buenas prácticas
- Registrar primero todos los endpoints de la API.
- Colocar el middleware de rutas no manejadas al final.
- Usar middlewares de autenticación y permisos en las rutas sensibles.
- Mantener la estructura modular separando rutas y middlewares en archivos independientes.

---

## Resumen
El archivo `index.js` orquesta la configuración y el flujo de la aplicación backend, asegurando seguridad, control de acceso y un manejo adecuado de rutas no encontradas para una experiencia robusta y segura. 