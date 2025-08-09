import { getPermissionsByUser } from '../services/permissionService.js';

// Middleware para verificar si el usuario tiene un permiso específico
export function checkPermission(permissionName) {
  return async (req, res, next) => {
    try {
      // El userId debe estar en req.user (agregado por el middleware de autenticación)
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      // Obtener los permisos del usuario
      const permissions = await getPermissionsByUser(userId);
      const hasPermission = permissions.some(p => p.name === permissionName && p.state === 'active');
      if (!hasPermission) {
        return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
} 