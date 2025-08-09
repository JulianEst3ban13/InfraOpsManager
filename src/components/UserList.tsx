import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axios';
import { Edit, UserX, UserCheck, Search, X, ChevronLeft, ChevronRight, Lock, History, RefreshCw, HelpCircle } from 'lucide-react';
import UserListInfoSidebar from './UserListInfoSidebar';
import UserManagementModal from './UserManagementModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import config from '../config/config';
import UserSessionHistoryModal from './UserSessionHistoryModal';

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  company: string;
  profile: string;
  state: string;
  picture: string;
  user_edit?: string;
  date_edit?: string;
  mfa_secret?: string;
  last_activity?: string; // <-- agregar esto
}

interface Profile {
  id: number;
  name: string;
}

interface UserListProps {
  onEditUser: (user: User) => void;
  onBackToDashboard: () => void;
  darkMode: boolean;
}

const UserList: React.FC<UserListProps> = ({ onEditUser, onBackToDashboard, darkMode }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // loading global solo para el primer render
  const [actualizando, setActualizando] = useState(false); // loading solo para el botón de actualizar
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    profile: '',
    state: ''
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: ContextMenuPosition;
    user: User | null;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    user: null,
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchProfiles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    const filteredResults = applyFilters();
    const totalPages = Math.ceil(filteredResults.length / pageSize);
    setTotalPages(totalPages);
    
    // Ajustar la página actual si excede el nuevo total de páginas
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setFilteredUsers(filteredResults.slice(startIndex, endIndex));
  }, [users, filters, pageSize, currentPage]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  const fetchUsers = async (isUpdate = false) => {
    try {
      if (isUpdate) {
        setActualizando(true);
      } else {
        setLoading(true);
      }
      const response = await axiosInstance.get('/users');
      setUsers(response.data);
      setError(null);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al cargar usuarios. Por favor, intente nuevamente.');
    } finally {
      if (isUpdate) {
        setActualizando(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await axiosInstance.get('/profiles');
      setProfiles(response.data);
    } catch (error) {
      console.error('Error al cargar perfiles:', error);
      setError('Error al cargar perfiles. Por favor, intente nuevamente.');
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await axiosInstance.get('/me/permissions');
      setPermissions(res.data.map((p: any) => p.name));
    } catch (err) {
      console.error('Error al obtener permisos:', err);
      setPermissions([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.profile) {
      filtered = filtered.filter(user => user.profile === filters.profile);
    }

    if (filters.state) {
      filtered = filtered.filter(user => user.state === filters.state);
    }

    return filtered;
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      profile: '',
      state: ''
    });
    setCurrentPage(1);
  };

  const handleToggleState = async (userId: number, currentState: string) => {
    try {
      const loggedUser = localStorage.getItem('username') ?? '';
      await axiosInstance.put(`/users/${userId}/toggle-state`, 
        {
          state: currentState === 'active' ? 'inactive' : 'active'
        },
        {
          headers: { 'x-user-edit': loggedUser }
        }
      );
      fetchUsers();
      setSuccess('Estado del usuario actualizado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setError('Error al cambiar el estado del usuario. Por favor, intente nuevamente.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUserUpdated = () => {
    fetchUsers();
    setSelectedUser(null);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleContextMenu = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      user,
    });
  };

  const handleToggleStateFromMenu = useCallback(() => {
    if (contextMenu.user) {
      handleToggleState(contextMenu.user.id, contextMenu.user.state || 'active');
      setContextMenu(prev => ({ ...prev, visible: false }));
    }
  }, [contextMenu.user]);

  const handleChangePassword = (user: User) => {
    setSelectedUserForPassword(user);
    setShowPasswordModal(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleShowSessionHistory = (user: User) => {
    setSelectedUserForHistory(user);
    setShowSessionHistory(true);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Listado de Usuarios</h2>
        
        {/* TOOLBAR DE FILTROS UI/UX MEJORADA */}
        <div className="flex flex-wrap gap-2 items-end bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
          <div className="flex items-center bg-gray-100 rounded-lg px-2 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 mr-1" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar usuario o email..."
              className={`bg-transparent border-none focus:ring-0 p-2 w-full ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}
            />
          </div>
          <select
            name="profile"
            value={filters.profile}
            onChange={handleFilterChange}
            className="p-2 border rounded-md h-10 min-w-[160px]"
          >
            <option value="">Todos los perfiles</option>
            {profiles.map(profile => (
              <option key={profile.id} value={profile.name}>{profile.name}</option>
            ))}
          </select>
          <select
            name="state"
            value={filters.state}
            onChange={handleFilterChange}
            className="p-2 border rounded-md h-10 min-w-[140px]"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 h-10"
          >
            Limpiar filtros
          </button>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="p-2 border rounded-md h-10"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button
            onClick={() => fetchUsers(true)}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 h-10 disabled:opacity-50"
            disabled={actualizando}
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${actualizando ? 'animate-spin' : ''}`} />
            {actualizando ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            onClick={() => {
              setSelectedUser(null);
              setShowUserModal(true);
            }}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 h-10"
          >
            Nuevo Usuario
          </button>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 border border-indigo-200 shadow-sm"
          >
            <HelpCircle className="w-5 h-5" />
            Ayuda
          </button>
          <button
             onClick={onBackToDashboard}
             className="flex items-center bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 h-10"
           >
            Volver al Dashboard
          </button>
        </div>
      </div>

{/* {{ ... }} */}
      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 mb-4 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className={`bg-indigo-600 text-white text-left`}>
            <tr>
              {["Usuario", "Email", "Compañía", "Perfil", "Estado", "Conectado", "Última Modificación", "Acciones"].map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider border-r last:border-r-0">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
            {filteredUsers.map((user, index) => (
              <tr 
                key={user.id} 
                className={`${
                  darkMode 
                    ? index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'
                    : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-400 dark:hover:bg-gray-600/50`}
                onContextMenu={(e) => handleContextMenu(e, user)}
              >
                <td className="px-6 py-4 whitespace-nowrap border-r">
                  <div className="flex items-center">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.username}
                        className="h-10 w-10 rounded-full mr-3"
                      />
                    ) : (
                      <div className={`h-10 w-10 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center mr-3`}>
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-500'}>
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {user.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} border-r`}>
                  {user.email}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} border-r`}>
                  {user.company}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} border-r`}>
                  {user.profile}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-r">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.state === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.state === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center border-r">
                  {user.last_activity && (new Date().getTime() - new Date(user.last_activity).getTime()) < 5 * 60 * 1000 ? (
                    <span title="Conectado">
                      <svg width="16" height="16" fill="green"><circle cx="8" cy="8" r="8"/></svg>
                    </span>
                  ) : (
                    <span title="Desconectado">
                      <svg width="16" height="16" fill="red"><circle cx="8" cy="8" r="8"/></svg>
                    </span>
                  )}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} border-r`}>
                  <div>
                    <div className={darkMode ? 'text-gray-100' : 'text-gray-900'}>{user.user_edit}</div>
                    <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {new Date(user.date_edit ?? '').toLocaleString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditClick(user)}
                      className={`text-blue-600 hover:text-blue-900 p-1 rounded-full ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'
                      }`}
                      title="Editar usuario"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleToggleState(user.id, user.state || 'active')}
                      className={`p-1 rounded-full ${
                        user.state === 'active'
                          ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                      }`}
                      title={user.state === 'active' ? 'Inactivar usuario' : 'Activar usuario'}
                    >
                      {user.state === 'active' ? (
                        <UserX className="h-5 w-5" />
                      ) : (
                        <UserCheck className="h-5 w-5" />
                      )}
                    </button>
                    {permissions.includes('ver_usuarios_session') && (
                    <button
                      onClick={() => handleShowSessionHistory(user)}
                      className="p-1 rounded-full text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                      title="Ver historial de sesiones"
                    >
                      <History className="h-5 w-5" />
                    </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`px-4 py-3 flex items-center justify-between border-t ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
              darkMode
                ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            } ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Anterior
          </button>
          <button
            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
              darkMode
                ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            } ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Mostrando{' '}
              <span className="font-medium">
                {users.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              a{' '}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, users.length)}
              </span>{' '}
              de{' '}
              <span className="font-medium">{users.length}</span>{' '}
              resultados
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                  darkMode
                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                } ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? darkMode
                          ? 'z-10 bg-gray-600 border-gray-500 text-gray-100'
                          : 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : darkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                  darkMode
                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                } ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {contextMenu.visible && contextMenu.user && (
        <div
          className={`fixed rounded-lg shadow-lg py-2 border z-50 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
          style={{
            top: `${contextMenu.position.y}px`,
            left: `${contextMenu.position.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`px-4 py-2 text-sm border-b ${
            darkMode 
              ? 'text-gray-300 border-gray-700' 
              : 'text-gray-500 border-gray-200'
          }`}>
            Usuario: {contextMenu.user.username}
          </div>
          <button
            onClick={handleToggleStateFromMenu}
            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${
              darkMode 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-100'
            }`}
          >
            {contextMenu.user.state === 'active' ? (
              <>
                <UserX className="h-4 w-4 text-red-500" />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Inactivar usuario</span>
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 text-green-500" />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Activar usuario</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleChangePassword(contextMenu.user!)}
            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${
              darkMode 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-100'
            }`}
          >
            <Lock className="h-4 w-4 text-blue-500" />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Cambiar contraseña</span>
          </button>
        </div>
      )}

      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onUserUpdated={handleUserUpdated}
        selectedUser={selectedUser || undefined}
        darkMode={darkMode}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedUserForPassword(null);
        }}
        userId={selectedUserForPassword?.id ?? 0}
        username={selectedUserForPassword?.username ?? ''}
      />

      <UserSessionHistoryModal
        isOpen={showSessionHistory}
        onClose={() => setShowSessionHistory(false)}
        userId={selectedUserForHistory?.id ?? 0}
        username={selectedUserForHistory?.username ?? ''}
      />
      <UserListInfoSidebar 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};

export default UserList; 