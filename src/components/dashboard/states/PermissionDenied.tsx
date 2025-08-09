import React, { useState } from 'react';
import { ShieldAlert, Send } from 'lucide-react';
import axiosInstance from '../../../utils/axios';
import { toast } from 'react-toastify';

interface PermissionDeniedProps {
  modules: string[];
  darkMode: boolean;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({ modules, darkMode }) => {
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleRequestAccess = async () => {
    setLoading(true);
    try {
      await axiosInstance.post('/permissions/request-access', {
        requestedModules: modules,
      });
      toast.success('Solicitud de acceso enviada correctamente.');
      setRequestSent(true);
    } catch (error) {
      toast.error('Error al enviar la solicitud. Por favor, inténtelo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center h-full p-8 text-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <ShieldAlert className={`w-16 h-16 mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
      <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
      <p className={`mb-4 max-w-md ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        No tienes los permisos necesarios para ver las siguientes métricas:
      </p>
      <div className="mb-6">
        <ul className="list-disc list-inside bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-gray-900 dark:text-gray-100">
          {modules.map(module => (
            <li key={module} className="font-semibold">{module}</li>
          ))}
        </ul>
      </div>

      {requestSent ? (
        <p className="text-green-500">
          ✅ Tu solicitud ha sido enviada. Los administradores la revisarán pronto.
        </p>
      ) : (
        <>
          <p className={`mb-6 max-w-md ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Si necesitas acceso, puedes enviar una solicitud a los administradores.
          </p>
          <button
            onClick={handleRequestAccess}
            disabled={loading}
            className={`flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="animate-spin mr-2">◌</span>
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Enviando...' : 'Solicitar Acceso'}
          </button>
        </>
      )}
    </div>
  );
}; 