import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import { PermissionGuard } from './PermissionGuard';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Shield, Save, X } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  description: string;
  state: 'active' | 'inactive';
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  state: 'active' | 'inactive';
  permissions?: number[];
  hasPermission?: boolean;
}

const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Record<number, number[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'assign' | 'revoke' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    state: 'active' as 'active' | 'inactive'
  });
  const [selectedPermissionIdForAssign, setSelectedPermissionIdForAssign] = useState<number | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [rolesForAssign, setRolesForAssign] = useState<Role[]>([]);
  const [newPermissionName, setNewPermissionName] = useState('');

  useEffect(() => {
    loadPermissions();
    loadRoles();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await axiosInstance.get('/permissions');
      setPermissions(response.data);
    } catch (error) {
      toast.error('Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await axiosInstance.get('/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPermission) {
        await axiosInstance.put(`/permissions/${editingPermission.id}`, formData);
        toast.success('Permiso actualizado correctamente');
      } else {
        await axiosInstance.post('/permissions', formData);
        toast.success('Permiso creado correctamente');
      }
      setShowModal(false);
      resetForm();
      loadPermissions();
    } catch (error) {
      toast.error('Error al guardar permiso');
    }
  };

  const handleDelete = async (permissionId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este permiso?')) {
      try {
        await axiosInstance.delete(`/permissions/${permissionId}`);
        toast.success('Permiso eliminado correctamente');
        loadPermissions();
      } catch (error) {
        toast.error('Error al eliminar permiso');
      }
    }
  };

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description,
      state: permission.state
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', state: 'active' });
    setEditingPermission(null);
  };

  const openAssignModal = async (permission: Permission) => {
    setSelectedPermission(permission); 
    setAssignModalOpen(true);
    try {
      const response = await axiosInstance.get(`/roles/with-permissions/${permission.id}`);
      setRolesForAssign(response.data);
    } catch (error) {
      toast.error("Error al cargar roles");
    }
  };

  const handleTogglePermission = async (role: Role) => {
    if (!selectedPermission) return;
  
    const endpoint = role.hasPermission
      ? `/roles/${role.id}/permissions/${selectedPermission.id}` // Revocar
      : `/roles/${role.id}/permissions`; // Asignar
  
    const method = role.hasPermission ? 'delete' : 'post';
    const body = role.hasPermission ? {} : { permissionId: selectedPermission.id };
  
    try {
      await axiosInstance[method](endpoint, body);
      
      toast.success(`Permiso ${role.hasPermission ? 'revocado' : 'asignado'} correctamente`);
  
      // Actualizar el estado local para reflejar el cambio en la UI
      setRolesForAssign(prevRoles =>
        prevRoles.map(r =>
          r.id === role.id ? { ...r, hasPermission: !r.hasPermission } : r
        )
      );
    } catch (error) {
      toast.error('Error al actualizar el permiso del rol');
    }
  };

  const handleSelectPermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAllPermissions = () => {
    if (selectedPermissions.length === filteredPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(filteredPermissions.map(p => p.id));
    }
  };

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
        <div className="flex items-center gap-4">
          {selectedPermissions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBulkAction('assign');
                  setShowBulkAssignModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
              >
                Asignación Masiva
              </button>
              <button
                onClick={() => {
                  setBulkAction('revoke');
                  setShowBulkAssignModal(true);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
              >
                Revocación Masiva
              </button>
            </div>
          )}
          <PermissionGuard permission="crear_permiso">
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus size={20} />
              Nuevo Permiso
            </button>
          </PermissionGuard>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar permiso por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando permisos...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {selectedPermissions.length > 0 && (
            <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold">{selectedPermissions.length} permisos seleccionados</span>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAllPermissions}
                    checked={selectedPermissions.length === filteredPermissions.length && filteredPermissions.length > 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handleSelectPermission(permission.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {permission.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {permission.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      permission.state === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {permission.state === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <PermissionGuard permission="editar_permiso">
                        <button
                          onClick={() => handleEdit(permission)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit size={16} />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="eliminar_permiso">
                        <button
                          onClick={() => handleDelete(permission.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="asignar_permisos">
                        <button
                          onClick={() => openAssignModal(permission)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Shield size={16} />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para crear/editar permiso */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingPermission ? 'Editar Permiso' : 'Nuevo Permiso'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={16} />
                  {editingPermission ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para asignar/revocar en lote */}
      {showBulkAssignModal && (
        <BulkAssignModal
          isOpen={showBulkAssignModal}
          onClose={() => setShowBulkAssignModal(false)}
          roles={roles}
          selectedPermissionIds={selectedPermissions}
          action={bulkAction}
        />
      )}

      {/* Modal para asignar permiso individual */}
      {assignModalOpen && selectedPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Asignar Permiso a Rol
              </h2>
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedPermission(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div>
              <p className="mb-4">
                Asignando permiso: <strong>{selectedPermission?.name}</strong>
              </p>
              <ul className="space-y-2">
                {rolesForAssign.map((role) => (
                    <li
                      key={role.id}
                      className={`flex justify-between items-center p-3 rounded-md ${
                        role.hasPermission ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      <span>{role.name}</span>
                      <button
                        onClick={() => handleTogglePermission(role)}
                        className={`px-3 py-1 text-sm rounded text-white ${
                          role.hasPermission
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {role.hasPermission ? 'Revocar' : 'Asignar'}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BulkAssignModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  selectedPermissionIds: number[];
  action: 'assign' | 'revoke' | null;
}> = ({ isOpen, onClose, roles, selectedPermissionIds, action }) => {
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const handleSelectRole = (roleId: number) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    try {
      const endpoint = action === 'assign' ? '/permissions/bulk-assign' : '/permissions/bulk-revoke';
      await axiosInstance.post(endpoint, {
        roleIds: selectedRoleIds,
        permissionIds: selectedPermissionIds,
      });
      toast.success(`Permisos ${action === 'assign' ? 'asignados' : 'revocados'} correctamente`);
      onClose();
    } catch (error) {
      toast.error('Error al procesar la solicitud');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {action === 'assign' ? 'Asignación Masiva de Permisos' : 'Revocación Masiva de Permisos'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <p className="mb-2">Selecciona los roles:</p>
          <ul className="space-y-2">
            {roles.map(role => (
              <li key={role.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => handleSelectRole(role.id)}
                />
                <span>{role.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 text-white rounded-md ${
              action === 'assign' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {action === 'assign' ? `Asignar ${selectedPermissionIds.length} Permisos` : `Revocar ${selectedPermissionIds.length} Permisos`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagement; 