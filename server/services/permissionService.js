import { pool } from '../index.js';

// Crear un nuevo permiso
export async function createPermission(name, description = '', state = 'active') {
  const [result] = await pool.query(
    'INSERT INTO permissions (name, description, state) VALUES (?, ?, ?)',
    [name, description, state]
  );
  return result.insertId;
}

// Listar todos los permisos
export async function getAllPermissions() {
  const [rows] = await pool.query('SELECT * FROM permissions');
  return rows;
}

// Obtener un permiso por ID
export async function getPermissionById(id) {
  const [rows] = await pool.query('SELECT * FROM permissions WHERE id = ?', [id]);
  return rows[0];
}

// Actualizar un permiso
export async function updatePermission(id, name, description, state) {
  await pool.query(
    'UPDATE permissions SET name = ?, description = ?, state = ? WHERE id = ?',
    [name, description, state, id]
  );
}

// Eliminar un permiso
export async function deletePermission(id) {
  await pool.query('DELETE FROM permissions WHERE id = ?', [id]);
}

// Asignar un permiso a un rol
export async function assignPermissionToRole(roleId, permissionId) {
  await pool.query(
    'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
    [roleId, permissionId]
  );
}

// Quitar un permiso de un rol
export async function removePermissionFromRole(roleId, permissionId) {
  await pool.query(
    'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?',
    [roleId, permissionId]
  );
}

// Listar permisos de un rol
export async function getPermissionsByRole(roleId) {
  const [rows] = await pool.query(
    `SELECT p.* FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = ?`,
    [roleId]
  );
  return rows;
}

// Asignar permisos a roles en lote
export async function assignPermissionsToRolesBulk(roleIds, permissionIds) {
  if (roleIds.length === 0 || permissionIds.length === 0) return;

  const values = roleIds.flatMap(roleId =>
    permissionIds.map(permissionId => [roleId, permissionId])
  );

  await pool.query(
    'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES ?',
    [values]
  );
}

// Revocar permisos de roles en lote
export async function revokePermissionsFromRolesBulk(roleIds, permissionIds) {
  if (roleIds.length === 0 || permissionIds.length === 0) return;

  await pool.query(
    'DELETE FROM role_permissions WHERE role_id IN (?) AND permission_id IN (?)',
    [roleIds, permissionIds]
  );
}

// Listar permisos de un usuario (a través de sus roles)
export async function getPermissionsByUser(userId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT p.* FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return rows;
} 