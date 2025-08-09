import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axios';
import { X, LogIn, LogOut } from 'lucide-react';

interface Session {
  id: number;
  action: 'login' | 'logout';
  timestamp: string;
  ip_address: string;
  user_agent: string;
}

interface UserSessionHistoryModalProps {
  userId: number;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 10;

// Utilidad para convertir fecha MySQL DATETIME a local string
function parseMySQLDatetimeToLocal(datetimeStr: string) {
  if (!datetimeStr) return '';
  if (datetimeStr.includes('T')) {
    return new Date(datetimeStr).toLocaleString();
  }
  return new Date(datetimeStr.replace(' ', 'T')).toLocaleString();
}

const UserSessionHistoryModal: React.FC<UserSessionHistoryModalProps> = ({ userId, username, isOpen, onClose }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isOpen && userId) {
      fetchSessions();
      setCurrentPage(1);
    }
    // eslint-disable-next-line
  }, [isOpen, userId]);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/users/${userId}/sessions`);
      setSessions(res.data);
    } catch (err: any) {
      // Log detallado para depuración
      console.error('❌ Error al cargar historial de sesiones:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
        stack: err.stack
      });
      if (err.response) {
        if (err.response.status === 403) {
          setError('No tienes permisos para ver el historial de sesiones.');
        } else if (err.response.status === 404) {
          setError('No se encontró el historial de sesiones para este usuario.');
        } else {
          setError(`Error del servidor: ${err.response.status} - ${err.response.data?.error || 'Error desconocido'}`);
        }
      } else if (err.request) {
        setError('No se pudo conectar con el servidor.');
      } else {
      setError('Error al cargar historial de sesiones.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Paginación frontend
  const total = sessions.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const paginatedSessions = sessions.slice(startIdx, endIdx);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-0 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10">
          <X className="h-6 w-6" />
        </button>
        <div className="p-6 pb-2 border-b flex flex-col gap-2">
          <h2 className="text-xl font-semibold mb-1">Historial de sesiones de <span className="text-indigo-600">{username}</span></h2>
          <span className="text-sm text-gray-500">Mostrando {startIdx + 1}-{endIdx} de {total} registros</span>
        </div>
        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : error ? (
          <div className="text-red-600 mb-4 p-6">{error}</div>
        ) : paginatedSessions.length === 0 ? (
          <div className="text-gray-500 p-6">No hay registros de sesiones.</div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-indigo-600 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Acción</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Fecha y hora</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">IP</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">User Agent</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSessions.map((s) => {
                  const icon = s.action === 'login'
                    ? <LogIn className="h-5 w-5 text-green-600" />
                    : <LogOut className="h-5 w-5 text-red-600" />;
                  return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 flex items-center space-x-2">
                        {icon}
                      <span className={s.action === 'login' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                        {s.action === 'login' ? 'Ingreso' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{parseMySQLDatetimeToLocal(s.timestamp)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{s.ip_address}</td>
                    <td className="px-4 py-2 truncate max-w-xs" title={s.user_agent}>
                      <span className="block max-w-xs overflow-hidden text-ellipsis" style={{maxWidth: 220}}>{s.user_agent}</span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Paginación */}
        {totalPages > 1 && !loading && !error && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border mr-2 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            >Anterior</button>
            <span className="text-sm text-gray-700">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border ml-2 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            >Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSessionHistoryModal; 