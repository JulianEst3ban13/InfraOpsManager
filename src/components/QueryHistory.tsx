import React, { useEffect, useState } from 'react';
import { Play, Copy, Trash2, History } from 'lucide-react';
import axiosInstance from '../utils/axios';
import { toast } from 'react-hot-toast';

interface QueryHistoryEntry {
  id?: number;
  user_id: number;
  database_name: string;
  query_text: string;
  execution_timestamp: string;
  rows_affected?: number;
  execution_time?: number;
}

interface QueryHistoryProps {
  userId: number;
  databaseName: string;
  onSelectQuery: (query: string) => void;
  onExecuteQuery: (query: string) => void;
  className?: string;
  visible: boolean;
  onToggleVisibility: () => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({
  userId,
  databaseName,
  onSelectQuery,
  onExecuteQuery,
  className = '',
  visible,
  onToggleVisibility
}) => {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible, userId, databaseName]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await loadQueryHistory(userId, databaseName);
      setHistory(data);
    } catch (error) {
      toast.error('Error al cargar el historial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearQueryHistory(userId, databaseName);
      setHistory([]);
      toast.success('Historial limpiado correctamente');
    } catch (error) {
      toast.error('Error al limpiar el historial');
    }
  };

  const saveEntry = async (entry: Omit<QueryHistoryEntry, 'id' | 'execution_timestamp'>) => {
    try {
      const response = await axiosInstance.post('/query-history', entry);
      return response.data;
    } catch (error) {
      console.error('Error al guardar la consulta en el historial:', error);
      throw error;
    }
  };

  const loadQueryHistory = async (userId: number, databaseName?: string) => {
    try {
      const response = await axiosInstance.get('/query-history', {
        params: { userId, databaseName }
      });
      return response.data;
    } catch (error) {
      console.error('Error al cargar el historial de consultas:', error);
      throw error;
    }
  };

  const clearQueryHistory = async (userId: number, databaseName?: string) => {
    try {
      await axiosInstance.delete('/query-history', {
        params: { userId, databaseName }
      });
    } catch (error) {
      console.error('Error al limpiar el historial:', error);
      throw error;
    }
  };

  if (!visible) return null;

  return (
    <div className={`bg-white border-l overflow-hidden flex flex-col h-full ${className}`}>
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-700">
          Historial de Consultas
          <span className="ml-2 text-sm text-gray-500">
            ({history.length})
          </span>
        </h3>
        <button
          onClick={onToggleVisibility}
          className="text-gray-500 hover:text-gray-700"
          title="Ocultar historial"
        >
          ×
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : history.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-3 hover:bg-gray-50 cursor-pointer group transition-colors duration-150"
                onClick={() => onSelectQuery(entry.query_text)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-blue-600">
                    {entry.database_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.execution_timestamp).toLocaleString()}
                  </span>
                </div>
                <pre className="text-xs font-mono bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                  {entry.query_text.length > 80 
                    ? `${entry.query_text.substring(0, 80)}...` 
                    : entry.query_text}
                </pre>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-gray-500">
                    <span className="mr-3">Filas: {entry.rows_affected || 0}</span>
                    <span>Tiempo: {entry.execution_time}ms</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onExecuteQuery(entry.query_text);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                      title="Ejecutar nuevamente"
                    >
                      <Play size={12} className="inline" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(entry.query_text);
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800"
                      title="Copiar consulta"
                    >
                      <Copy size={12} className="inline" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
            <History size={24} className="mb-2" />
            <p className="text-sm">No hay consultas en el historial</p>
            <p className="text-xs mt-1">Las consultas que ejecutes aparecerán aquí</p>
          </div>
        )}
      </div>
      
      <div className="p-2 border-t bg-gray-50">
        <button
          onClick={handleClearHistory}
          disabled={history.length === 0}
          className="w-full py-1 text-xs text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <Trash2 size={14} />
          Limpiar historial
        </button>
      </div>
    </div>
  );
};

export default QueryHistory;