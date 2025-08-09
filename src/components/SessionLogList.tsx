import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axios';

interface Session {
  id: number;
  user_id: number;
  username: string;
  action: 'login' | 'logout';
  timestamp: string;
  ip_address: string;
  user_agent: string;
}

const ACTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'login', label: 'Ingreso' },
  { value: 'logout', label: 'Salida' },
];

const PAGE_SIZES = [5, 10, 20, 50];

// Utilidad para convertir fecha MySQL DATETIME a local string
function parseMySQLDatetimeToLocal(datetimeStr: string) {
  if (!datetimeStr) return '';
  if (datetimeStr.includes('T')) {
    return new Date(datetimeStr).toLocaleString();
  }
  return new Date(datetimeStr.replace(' ', 'T')).toLocaleString();
}

const SessionLogList: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (permissions.includes('ver_sesiones')) {
      fetchSessions();
    }
    // eslint-disable-next-line
  }, [permissions, currentPage, pageSize, refreshKey]);

  const fetchPermissions = async () => {
    try {
      const res = await axiosInstance.get('/me/permissions');
      setPermissions(res.data.map((p: any) => p.name));
    } catch (err) {
      setPermissions([]);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/sessions', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
        },
      });
      let data = res.data.data as Session[];
      // Filtrado por acción en frontend (si el backend no lo soporta)
      if (actionFilter) {
        data = data.filter(s => s.action === actionFilter);
      }
      setSessions(data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      setError('Error al cargar logs de sesiones.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!permissions.includes('ver_sesiones')) {
    return <div className="p-4 text-red-600">No tienes permisos para ver los logs de entrada y salida.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Gestión de Logs de Entrada y Salida</h2>
        <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
            placeholder="Filtrar por usuario..."
          className="pl-3 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-300 text-gray-900"
        />
          <select
            value={actionFilter}
            onChange={handleActionChange}
            className="pl-2 pr-8 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-300 text-gray-900"
          >
            {ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="pl-2 pr-8 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-300 text-gray-900"
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size} por página</option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-semibold flex items-center"
            title="Actualizar"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.423 19.584A9 9 0 104.582 9.582" /></svg>
            Actualizar
          </button>
        </div>
      </div>
      {error && <div className="p-4 text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-indigo-600 text-white text-left">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider border-r">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider border-r">Acción</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider border-r">Fecha y hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider border-r">IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider border-r">User Agent</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Cargando...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">No hay registros.</td></tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 whitespace-nowrap border-r">{s.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap border-r">
                    <span className={s.action === 'login' ? 'text-green-700' : 'text-red-700'}>
                      {s.action === 'login' ? 'Ingreso' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-r">{parseMySQLDatetimeToLocal(s.timestamp)}</td>
                  <td className="px-6 py-4 whitespace-nowrap border-r">{s.ip_address}</td>
                  <td className="px-6 py-4 whitespace-nowrap border-r truncate max-w-xs" title={s.user_agent}>{s.user_agent}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <div>
          <span className="text-sm text-gray-700">
            Mostrando página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
          </span>
        </div>
        <div>
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 border rounded-md mr-2 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >Anterior</button>
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 border rounded-md ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >Siguiente</button>
        </div>
      </div>
    </div>
  );
};

export default SessionLogList; 