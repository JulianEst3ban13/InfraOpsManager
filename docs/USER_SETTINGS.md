# Configuración de Usuario

## Descripción

La interfaz de configuración de usuario es una funcionalidad completa que permite a los usuarios gestionar su cuenta, información personal, seguridad y preferencias. Se accede desde el icono de configuración en la barra de navegación superior.

## Características

### 🎯 **Pestaña de Perfil**
- **Información Personal**: Edición de email, nombre, apellido, teléfono y dirección
- **Nombre de Usuario**: Campo de solo lectura (no editable por seguridad)
- **Foto de Perfil**: Subida y cambio de foto de perfil con vista previa
- **Modo de Edición**: Toggle para habilitar/deshabilitar la edición de campos
- **Validación en Tiempo Real**: Verificación de datos antes de guardar

### 🔒 **Pestaña de Seguridad**
- **Cambio de Contraseña**: Formulario seguro con validación de contraseña actual
- **Autenticación de Dos Factores (MFA)**: 
  - Activación mediante código QR
  - Verificación con aplicación de autenticación
  - Estado visual del MFA (activado/desactivado)
- **Visibilidad de Contraseñas**: Toggle para mostrar/ocultar contraseñas

### ⚙️ **Pestaña de Preferencias**
- **Información de Cuenta**: Fecha de creación, email principal, ID de usuario
- **Cerrar Sesión**: Botón para cerrar sesión de forma segura

## Diseño UI/UX

### 🎨 **Principios de Diseño**
- **Interfaz Moderna**: Diseño limpio y profesional con gradientes y sombras
- **Modo Oscuro/Claro**: Soporte completo para ambos temas
- **Responsive**: Adaptable a diferentes tamaños de pantalla
- **Accesibilidad**: Navegación por teclado y lectores de pantalla

### 🎯 **Experiencia de Usuario**
- **Animaciones Suaves**: Transiciones fluidas entre estados
- **Feedback Visual**: Mensajes de éxito y error claros
- **Carga Asíncrona**: Indicadores de carga para operaciones
- **Validación Intuitiva**: Mensajes de error contextuales

## Componentes

### `UserSettings.tsx`
Componente principal que maneja toda la lógica de configuración de usuario.

**Props:**
- `user`: Objeto con información del usuario
- `darkMode`: Estado del tema oscuro/claro
- `onClose`: Función para cerrar el modal
- `logout`: Función para cerrar sesión

**Estados Principales:**
- `activeTab`: Pestaña activa (profile/security/preferences)
- `profileData`: Datos del formulario de perfil
- `passwordData`: Datos del formulario de contraseña
- `mfaEnabled`: Estado del MFA

### Integración con `TopNavigation.tsx`
- Icono de configuración agregado a la barra de navegación
- Estado para mostrar/ocultar el modal de configuración
- Integración con el contexto de autenticación

## API Endpoints

### Perfil de Usuario
- `PUT /users/{id}` - Actualizar información del perfil
- `POST /users/upload-photo` - Subir foto de perfil
- `POST /users/change-password` - Cambiar contraseña

### Autenticación MFA
- `POST /mfa/setup` - Configurar MFA y generar QR
- `POST /mfa/verify` - Verificar código MFA

## Flujo de Uso

1. **Acceso**: Usuario hace clic en el icono de configuración en la barra superior
2. **Navegación**: Usuario navega entre las pestañas usando el sidebar
3. **Edición**: En la pestaña de perfil, usuario activa modo edición
4. **Guardado**: Usuario guarda cambios con validación automática
5. **Seguridad**: Usuario puede cambiar contraseña o activar MFA
6. **Cierre**: Usuario cierra la configuración o cierra sesión

## Validaciones

### Perfil
- Email válido
- Campos requeridos completos
- Longitud máxima de campos

### Contraseña
- Contraseña actual correcta
- Nueva contraseña diferente a la actual
- Confirmación de contraseña coincidente
- Fortaleza de contraseña

### MFA
- Código de 6 dígitos
- Verificación con servidor
- Manejo de errores de verificación

## Seguridad

- **Tokens JWT**: Autenticación mediante tokens
- **Validación de Sesión**: Verificación de sesión activa
- **Cifrado**: Contraseñas hasheadas
- **MFA**: Autenticación de dos factores opcional
- **CORS**: Configuración de seguridad para API

## Tecnologías Utilizadas

- **React**: Framework principal
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos y diseño
- **Lucide React**: Iconografía
- **Axios**: Cliente HTTP
- **Context API**: Estado global de autenticación

## Próximas Mejoras

- [ ] Exportación de datos de usuario
- [ ] Configuración de notificaciones
- [ ] Historial de actividad
- [ ] Integración con redes sociales
- [ ] Backup de configuración
- [ ] Temas personalizados 