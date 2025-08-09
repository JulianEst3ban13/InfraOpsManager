# Política de Contraseñas y Validación en el Backend

## Endpoints afectados

- `POST /api/register` (Registro de usuario)
- `PUT /api/users/:id/change-password` (Cambio de contraseña)

---

## Requisitos de la contraseña

La contraseña debe cumplir con los siguientes requisitos de seguridad:

1. **Mínimo 8 caracteres**
2. **Al menos una letra mayúscula** (A-Z)
3. **Al menos un número** (0-9)
4. **Al menos un carácter especial** (por ejemplo: `!@#$%^&*()_+-=[]{},.<>/?`)

---

## Ejemplo de solicitud y respuesta

### Registro de usuario

**Solicitud:**
```json
POST /api/register
{
  "username": "usuario1",
  "email": "correo@ejemplo.com",
  "password": "Abc12345!",
  "company": 1,
  "profile": 1,
  "picture": null,
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone": "123456789",
  "address": "Calle 123"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 5,
    "username": "usuario1",
    "email": "correo@ejemplo.com",
    "company": 1,
    "profile": 1,
    "picture": null,
    "first_name": "Juan",
    "last_name": "Pérez",
    "phone": "123456789",
    "address": "Calle 123"
  },
  "token": "..."
}
```

**Respuesta de error por contraseña insegura:**
```json
{
  "error": "La contraseña no cumple con los requisitos de seguridad: Mínimo 8 caracteres, Al menos una letra mayúscula, Al menos un número, Al menos un carácter especial"
}
```

---

### Cambio de contraseña

**Solicitud:**
```json
PUT /api/users/5/change-password
{
  "password": "NuevaPass1!"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Contraseña actualizada correctamente"
}
```

**Respuesta de error por contraseña insegura:**
```json
{
  "error": "La contraseña no cumple con los requisitos de seguridad: Al menos un carácter especial"
}
```

---

## Notas adicionales

- Si la contraseña no cumple con uno o más requisitos, la API responde con código **400** y un mensaje detallando los requisitos faltantes.
- Esta validación se realiza **antes** de guardar la contraseña en la base de datos.
- Los requisitos aplican tanto para nuevos usuarios como para cambios de contraseña de usuarios existentes. 