# Middlewares Principales

## Descripción
Los middlewares son funciones que se ejecutan antes de que una petición llegue a la lógica final de un endpoint. Permiten validar, transformar o proteger rutas.

---

## Middlewares implementados

### 1. `verifyTokenMiddleware`
- **Ubicación:** `server/utils/authMiddleware.js`
- **Función:** Verifica que la petición incluya un token JWT válido. Si no es válido o falta, responde con 401.
- **Uso típico:**
  ```js
  app.get('/api/usuarios', verifyTokenMiddleware, ...)
  ```

### 2. `checkPermission`
- **Ubicación:** `server/utils/permissionMiddleware.js`
- **Función:** Verifica que el usuario autenticado tenga el permiso necesario para acceder a la ruta.
- **Uso típico:**
  ```js
  app.get('/api/usuarios', verifyTokenMiddleware, checkPermission('ver_usuarios'), ...)
  ```

### 3. Rate Limiting y Seguridad
- **Librerías:** `express-rate-limit`, `helmet`
- **Función:** Limitar el número de peticiones y proteger cabeceras HTTP.
- **Uso típico:**
  ```js
  app.use(rateLimit(...));
  app.use(helmet(...));
  ```

### 4. Manejo de rutas no encontradas (404)
- **Función:** Captura cualquier ruta no manejada por los endpoints definidos y responde con un error 404 o redirige al frontend.
- **Uso típico en producción:**
  ```js
  if (isProd) {
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/build/index.html'));
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });
  }
  ```

---

## Ejemplo de flujo
1. El usuario hace una petición a `/api/usuarios`.
2. `verifyTokenMiddleware` valida el token.
3. `checkPermission('ver_usuarios')` valida el permiso.
4. Si todo es correcto, se ejecuta la lógica del endpoint.
5. Si la ruta no existe, el middleware global de rutas no manejadas responde con 404.

---

## Consideraciones
- El orden de los middlewares es importante: los de autenticación y permisos deben ir antes de la lógica del endpoint.
- El middleware de rutas no manejadas debe ir al final, después de todos los endpoints. 