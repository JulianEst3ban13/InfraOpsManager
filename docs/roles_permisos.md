# Gestión de Roles y Permisos

## Descripción
El módulo de Roles y Permisos permite administrar los diferentes niveles de acceso de los usuarios en el sistema. Se pueden crear roles, asignar permisos a roles y asignar roles a usuarios para controlar qué acciones pueden realizar dentro de la plataforma.

---

## Endpoints principales

### Roles
- `GET /api/roles` — Obtener todos los roles
- `POST /api/roles` — Crear un nuevo rol
- `PUT /api/roles/:id` — Actualizar un rol existente
- `DELETE /api/roles/:id` — Eliminar un rol
- `GET /api/roles/:roleId/users` — Obtener todos los usuarios y si tienen un rol específico

### Permisos
- `GET /api/permissions` — Obtener todos los permisos
- `POST /api/permissions` — Crear un nuevo permiso
- `PUT /api/permissions/:id` — Actualizar un permiso existente
- `DELETE /api/permissions/:id` — Eliminar un permiso

### Asignación de roles y permisos
- `POST /api/roles/:roleId/permissions` — Asignar permisos a un rol
- `POST /api/users/:userId/roles` — Asignar roles a un usuario

### Consultar permisos de usuario
- `GET /api/me/permissions` — Obtener los permisos activos del usuario autenticado

---

## Ejemplo de flujo de asignación

1. **Crear un nuevo rol:**
   ```json
   POST /api/roles
   {
     "name": "Administrador",
     "description": "Acceso total al sistema"
   }
   ```

2. **Crear un permiso:**
   ```json
   POST /api/permissions
   {
     "name": "ver_usuarios",
     "description": "Permite ver la lista de usuarios"
   }
   ```

3. **Asignar permiso a un rol:**
   ```json
   POST /api/roles/1/permissions
   {
     "permissions": ["ver_usuarios", "editar_usuarios"]
   }
   ```

4. **Asignar rol a un usuario:**
   ```json
   POST /api/users/5/roles
   {
     "roles": [1, 2]
   }
   ```

5. **Consultar permisos del usuario autenticado:**
   ```json
   GET /api/me/permissions
   // Respuesta:
   [
     {
       "name": "ver_usuarios",
       "state": "active"
     },
     ...
   ]
   ```

---

## Notas importantes

- Los permisos se asignan a roles, y los roles a usuarios.
- Un usuario puede tener varios roles y, por lo tanto, varios permisos.
- Solo los permisos con estado `active` son válidos para el usuario.
- Es recomendable tener un rol de "Administrador" con todos los permisos para la gestión global del sistema.
- El endpoint `/api/me/permissions` devuelve únicamente los permisos activos del usuario autenticado. 