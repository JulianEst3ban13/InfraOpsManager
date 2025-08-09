import { pool } from '../index.js';

// Crear un nuevo rol
export async function createRole(name, description = '', state = 'active') {
  const [result] = await pool.query(
    'INSERT INTO roles (name, description, state) VALUES (?, ?, ?)',
    [name, description, state]
  );
  return result.insertId;
}

// Listar todos los roles
export async function getAllRoles() {
  const [rows] = await pool.query('SELECT * FROM roles');
  return rows;
}

// Obtener todos los roles con sus permisos
export async function getAllRolesWithPermissions() {
  const [roles] = await pool.query('SELECT * FROM roles');
  const [rolePermissions] = await pool.query('SELECT * FROM role_permissions');

  const permissionsMap = rolePermissions.reduce((acc, rp) => {
    if (!acc[rp.role_id]) {
      acc[rp.role_id] = [];
    }
    acc[rp.role_id].push(rp.permission_id);
    return acc;
  }, {});

  return roles.map(role => ({
    ...role,
    permissions: permissionsMap[role.id] || [],
  }));
}

// Obtener un rol por ID
export async function getRoleById(id) {
  const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
  return rows[0];
}

// Actualizar un rol
export async function updateRole(id, name, description, state) {
  await pool.query(
    'UPDATE roles SET name = ?, description = ?, state = ? WHERE id = ?',
    [name, description, state, id]
  );
}

// Eliminar un rol
export async function deleteRole(id) {
  await pool.query('DELETE FROM roles WHERE id = ?', [id]);
}

// Asignar un permiso a un rol
export async function assignPermissionToRole(roleId, permissionId) {
  await pool.query(
    'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
    [roleId, permissionId]
  );
}

// Revocar un permiso de un rol
export async function revokePermissionFromRole(roleId, permissionId) {
  await pool.query(
    'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?',
    [roleId, permissionId]
  );
}

// Asignar un rol a un usuario
export async function assignRoleToUser(userId, roleId) {
  await pool.query(
    'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
    [userId, roleId]
  );
}

// Quitar un rol a un usuario
export async function removeRoleFromUser(userId, roleId) {
  await pool.query(
    'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
    [userId, roleId]
  );
}

// Listar roles de un usuario
export async function getRolesByUser(userId) {
  const [rows] = await pool.query(
    `SELECT r.* FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return rows;
}

// Obtener todos los roles e indicar si tienen un permiso específico
export async function getRolesWithPermissionsForPermission(permissionId) {
  const [roles] = await pool.query('SELECT * FROM roles WHERE state = "active"');
  const [assigned] = await pool.query(
    'SELECT role_id FROM role_permissions WHERE permission_id = ?',
    [permissionId]
  );

  const assignedRoleIds = new Set(assigned.map(a => a.role_id));

  return roles.map(role => ({
    ...role,
    hasPermission: assignedRoleIds.has(role.id),
  }));
} 