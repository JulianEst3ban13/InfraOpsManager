import express from 'express';
import {
  createPermission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  assignPermissionToRole,
  removePermissionFromRole,
  getPermissionsByRole,
  getPermissionsByUser,
  assignPermissionsToRolesBulk,
  revokePermissionsFromRolesBulk,
} from '../services/permissionService.js';
import { verifyTokenMiddleware } from '../utils/authMiddleware.js';
import { enviarCorreo } from '../utils/notificaciones.js';

const router = express.Router();

// Crear un nuevo permiso
router.post('/', async (req, res) => {
  try {
    const { name, description, state } = req.body;
    const id = await createPermission(name, description, state);
    res.status(201).json({ id, message: 'Permiso creado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar todos los permisos
router.get('/', async (req, res) => {
  try {
    const permissions = await getAllPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un permiso por ID
router.get('/:id', async (req, res) => {
  try {
    const permission = await getPermissionById(req.params.id);
    if (!permission) return res.status(404).json({ error: 'Permiso no encontrado' });
    res.json(permission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un permiso
router.put('/:id', async (req, res) => {
  try {
    const { name, description, state } = req.body;
    await updatePermission(req.params.id, name, description, state);
    res.json({ message: 'Permiso actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un permiso
router.delete('/:id', async (req, res) => {
  try {
    await deletePermission(req.params.id);
    res.json({ message: 'Permiso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Asignar un permiso a un rol
router.post('/assign', async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;
    await assignPermissionToRole(roleId, permissionId);
    res.json({ message: 'Permiso asignado al rol correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quitar un permiso de un rol
router.post('/remove', async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;
    await removePermissionFromRole(roleId, permissionId);
    res.json({ message: 'Permiso removido del rol correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar permisos de un rol
router.get('/role/:roleId', async (req, res) => {
  try {
    const permissions = await getPermissionsByRole(req.params.roleId);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar permisos de un usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const permissions = await getPermissionsByUser(req.params.userId);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Asignar permisos a roles en lote
router.post('/bulk-assign', async (req, res) => {
  try {
    const { roleIds, permissionIds } = req.body;
    await assignPermissionsToRolesBulk(roleIds, permissionIds);
    res.json({ message: 'Permisos asignados masivamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revocar permisos de roles en lote
router.post('/bulk-revoke', async (req, res) => {
  try {
    const { roleIds, permissionIds } = req.body;
    await revokePermissionsFromRolesBulk(roleIds, permissionIds);
    res.json({ message: 'Permisos revocados masivamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Solicitar acceso a permisos
router.post('/request-access', verifyTokenMiddleware, async (req, res) => {
  try {
    const { requestedModules } = req.body;
    const user = req.user;

    if (!user || !requestedModules || requestedModules.length === 0) {
      return res.status(400).json({ error: 'Faltan datos en la solicitud' });
    }

    const subject = `Solicitud de Permisos - Usuario: ${user.username}`;
    const content = `
      <h1>Solicitud de Acceso a Módulos</h1>
      <p>El usuario <strong>${user.username}</strong> (ID: ${user.id}, Email: ${user.email}) ha solicitado acceso a los siguientes módulos:</p>
      <ul>
        ${requestedModules.map(module => `<li><strong>${module}</strong></li>`).join('')}
      </ul>
      <p>Por favor, revise esta solicitud y asigne los permisos correspondientes si es apropiado.</p>
    `;

    await enviarCorreo('infraestructura@gruponw.com', subject, content);

    res.json({ message: 'Solicitud de acceso enviada correctamente' });
  } catch (error) {
    console.error('Error al enviar la solicitud de acceso:', error);
    res.status(500).json({ error: 'Error interno al procesar la solicitud' });
  }
});

export default router; 