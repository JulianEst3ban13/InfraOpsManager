# Logs de Sesión

## Descripción
El módulo de **Logs de Sesión** permite registrar y consultar los eventos de inicio y cierre de sesión de los usuarios en el sistema. Cada vez que un usuario inicia o cierra sesión, se almacena un registro con información relevante como usuario, acción, fecha/hora, IP y user agent.

---

## Backend

### Tabla principal: `user_sessions`
- `id`: Identificador único
- `user_id`: ID del usuario
- `username`: Nombre de usuario
- `action`: Acción realizada (`login` o `logout`)
- `timestamp`: Fecha y hora del evento
- `ip_address`: IP desde donde se realizó la acción
- `user_agent`: Información del navegador/dispositivo

### Endpoints principales

- **Registrar login:**
  - Automático al iniciar sesión (`/api/login` y `/api/login/mfa`)
- **Registrar logout:**
  - Automático al cerrar sesión (`/api/logout`)
- **Consultar logs de sesión (paginado):**
  - `GET /api/sessions?page=1&limit=10&search=usuario`
    - Requiere permisos: `ver_sesiones`
    - Filtros: búsqueda por usuario o acción
    - Respuesta:
      ```json
      {
        "data": [
          {
            "id": 1,
            "user_id": 2,
            "username": "juan",
            "action": "login",
            "timestamp": "2025-07-04T14:07:00.000Z",
            "ip_address": "192.168.1.10",
            "user_agent": "Mozilla/5.0 ..."
          },
          ...
        ],
        "pagination": {
          "page": 1,
          "limit": 10,
          "total": 25,
          "totalPages": 3
        }
      }
      ```

---

## Permisos necesarios
- `ver_sesiones`: Ver logs de sesión

---

## Frontend

### Componente principal: `SessionLogList.tsx`
- Permite visualizar los logs de sesión en una tabla paginada
- Filtros disponibles:
  - Por usuario (input de texto)
  - Por acción (select: Ingreso/Salida)
  - Selector de cantidad de registros por página
  - Botón para actualizar
- Solo visible para usuarios con permiso `ver_sesiones`

#### Ejemplo de uso en el menú lateral
- Vista: **Gestión de Logs de Sesión**
- Acceso desde el sidebar bajo "Gestión de Permisos"

---

## Ejemplo de flujo
1. El usuario inicia sesión → se registra un log con acción `login`.
2. El usuario cierra sesión → se registra un log con acción `logout`.
3. Un usuario con permiso `ver_sesiones` accede a la vista de logs y puede filtrar, buscar y paginar los registros.

---

## Consideraciones
- Los logs de sesión ayudan a auditar accesos y detectar actividad sospechosa.
- El registro es automático, no requiere acción manual del usuario.
- El filtrado por acción se realiza en frontend, la búsqueda por usuario se realiza en backend.

---

## Contacto
Para dudas o mejoras, contactar al equipo de desarrollo backend/frontend. 