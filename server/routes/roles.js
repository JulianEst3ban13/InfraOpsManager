import express from 'express';
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignRoleToUser,
  removeRoleFromUser,
  getRolesByUser,
  getAllRolesWithPermissions,
  assignPermissionToRole,
  revokePermissionFromRole,
  getRolesWithPermissionsForPermission,
} from '../services/roleService.js';
import { pool } from '../index.js';

const router = express.Router();

// Crear un nuevo rol
router.post('/', async (req, res) => {
  try {
    const { name, description, state } = req.body;
    const id = await createRole(name, description, state);
    res.status(201).json({ id, message: 'Rol creado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar todos los roles
router.get('/', async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un rol por ID
router.get('/:id', async (req, res) => {
  try {
    const role = await getRoleById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un rol
router.put('/:id', async (req, res) => {
  try {
    const { name, description, state } = req.body;
    await updateRole(req.params.id, name, description, state);
    res.json({ message: 'Rol actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un rol
router.delete('/:id', async (req, res) => {
  try {
    await deleteRole(req.params.id);
    res.json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los roles y verificar si tienen un permiso específico
router.get('/with-permissions/:permissionId', async (req, res) => {
  try {
    const { permissionId } = req.params;
    const roles = await getRolesWithPermissionsForPermission(permissionId);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener roles con estado de permiso' });
  }
});

// Obtener todos los roles con sus permisos
router.get('/with-permissions', async (req, res) => {
  try {
    const roles = await getAllRolesWithPermissions();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Asignar un permiso a un rol
router.post('/:roleId/permissions', async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissionId } = req.body;
    await assignPermissionToRole(roleId, permissionId);
    res.status(200).json({ message: 'Permiso asignado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revocar un permiso de un rol
router.delete('/:roleId/permissions/:permissionId', async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;
    await revokePermissionFromRole(roleId, permissionId);
    res.status(200).json({ message: 'Permiso revocado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Asignar un rol a un usuario
router.post('/assign', async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    await assignRoleToUser(userId, roleId);
    res.json({ message: 'Rol asignado al usuario correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quitar un rol a un usuario
router.post('/remove', async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    await removeRoleFromUser(userId, roleId);
    res.json({ message: 'Rol removido del usuario correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar roles de un usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const roles = await getRolesByUser(req.params.userId);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener todos los usuarios y si tienen un rol específico
router.get('/:roleId/users', async (req, res) => {
  const { roleId } = req.params;
  try {
    const [users] = await pool.query(`
      SELECT u.*, 
        CASE WHEN ur.role_id IS NOT NULL THEN 1 ELSE 0 END AS hasRole
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = ?
    `, [roleId]);
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios para el rol:', error);
    res.status(500).json({ error: 'Error al obtener usuarios para el rol' });
  }
});

export default router; 