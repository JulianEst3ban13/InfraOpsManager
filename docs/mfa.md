# Autenticación de Dos Factores (MFA) en la API

## ¿Qué es MFA?
La autenticación de dos factores (MFA, por sus siglas en inglés) añade una capa extra de seguridad al requerir, además de la contraseña, un código temporal generado por una app de autenticación (como Google Authenticator o Authy).

---

## Endpoints relacionados

- `POST /api/login` — Inicio de sesión tradicional
- `POST /api/login/mfa` — Validación del código MFA

---

## Flujo de inicio de sesión con MFA

1. **El usuario inicia sesión con usuario y contraseña:**
   - Si el usuario tiene MFA configurado, la respuesta será:
   ```json
   {
     "mfaRequired": true,
     "userId": 5
   }
   ```
   - Si no tiene MFA, el login es exitoso y se retorna el token normalmente.

2. **El usuario ingresa el código MFA:**
   - Solicitud:
   ```json
   POST /api/login/mfa
   {
     "userId": 5,
     "token": "123456"
   }
   ```
   - Respuesta exitosa:
   ```json
   {
     "message": "Login MFA successful",
     "user": {
       "id": 5,
       "username": "usuario1",
       "email": "correo@ejemplo.com",
       "picture": null
     },
     "token": "...",
     "lastActivity": 1710000000000
   }
   ```
   - Respuesta de error (código incorrecto):
   ```json
   {
     "error": "Código MFA incorrecto"
   }
   ```

---

## Notas importantes

- El código MFA es de un solo uso y cambia cada 30 segundos.
- Si el usuario no tiene MFA configurado, el endpoint `/api/login/mfa` devolverá error.
- El flujo de MFA solo se activa si el usuario tiene un secreto MFA registrado en la base de datos.
- El token JWT se entrega solo después de validar correctamente el código MFA.
- El endpoint de login tradicional (`/api/login`) indica si MFA es requerido.

---

## Recomendaciones

- Usar una app de autenticación compatible con TOTP (Google Authenticator, Authy, etc.).
- Proteger el secreto MFA y nunca compartirlo.
- Si se pierde el acceso al MFA, contactar al administrador para restablecerlo. 