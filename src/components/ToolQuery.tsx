import React, { useState, useEffect } from 'react';
import { Play, Copy, Save, Download, Trash2, Database, ChevronDown, Maximize2, Plus, X } from 'lucide-react';
import axiosInstance from '../utils/axios';
// Interfaces
interface SavedQuery {
  id: string;
  name: string;
  query: string;
  database: string;
}

interface DbConnection {
  id: number;
  nombre: string;
  host: string;
  puerto: string;
  usuario: string;
  password: string;
  tipo_db: string;
}

interface Editor {
  id: string;
  query: string;
  results: any[] | null;
  isLoading: boolean;
  error: string | null;
  selectedConnection: number | null;
}



// Función para hacer peticiones API usando axiosInstance
const api = {
  async get(url: string) {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error en petición GET a ${url}:`, error);
      throw error;
    }
  },

  async post(url: string, data: any) {
    try {
      const response = await axiosInstance.post(url, data);
      return response.data;
    } catch (error) {
      console.error(`Error en petición POST a ${url}:`, error);
      throw error;
    }
  }
};

const ToolQuery: React.FC = () => {
  // Estado para las conexiones de base de datos
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState<boolean>(true);
  
  // Estado para guardar consultas
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([
    { id: '1', name: 'Usuarios activos', query: 'SELECT * FROM users WHERE status = "active";', database: 'MySQL' },
    { id: '2', name: 'Ventas del mes', query: 'SELECT product_id, SUM(quantity) FROM sales GROUP BY product_id;', database: 'PostgreSQL' }
  ]);
  const [showSavedQueries, setShowSavedQueries] = useState<boolean>(false);
  const [queryName, setQueryName] = useState<string>('');
  
  // Estado para múltiples editores
  const [editors, setEditors] = useState<Editor[]>([
    {
      id: '1',
      query: '',
      results: null,
      isLoading: false,
      error: null,
      selectedConnection: null
    }
  ]);
  const [activeEditorId, setActiveEditorId] = useState<string>('1');
  
  // Estado para maximizar todo el componente en lugar de solo resultados
  const [maximized, setMaximized] = useState<boolean>(false);
  
  // Cargar conexiones desde la API
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        // Usar nuestra implementación de fetch en lugar de axios
        const response = await axiosInstance.get('/conexiones');
        const data = response.data;
        setConnections(data);
        setIsLoadingConnections(false);
        
        // Establecer la primera conexión como seleccionada por defecto
        if (data.length > 0) {
          setEditors(prev => prev.map(editor => ({
            ...editor,
            selectedConnection: data[0].id
          })));
        }
      } catch (error) {
        console.error('Error al cargar conexiones:', error);
        setIsLoadingConnections(false);
        
        // Cargar conexiones de ejemplo en caso de error
        const mockConnections: DbConnection[] = [
          { id: 1, nombre: 'MySQL Local', host: 'localhost', puerto: '3306', usuario: 'root', password: '****', tipo_db: 'MySQL' },
          { id: 2, nombre: 'PostgreSQL Prod', host: 'db.example.com', puerto: '5432', usuario: 'admin', password: '****', tipo_db: 'PostgreSQL' }
        ];
        setConnections(mockConnections);
        setEditors(prev => prev.map(editor => ({
          ...editor,
          selectedConnection: mockConnections[0].id
        })));
      }
    };
    
    fetchConnections();
  }, []);
  
  // Funciones para manejar editores
  const getActiveEditor = () => {
    return editors.find(e => e.id === activeEditorId) || editors[0];
  };
  
  const updateActiveEditor = (updates: Partial<Editor>) => {
    setEditors(editors.map(editor => 
      editor.id === activeEditorId ? { ...editor, ...updates } : editor
    ));
  };
  
  const addNewEditor = () => {
    const activeEditor = getActiveEditor();
    const newEditor: Editor = {
      id: Date.now().toString(),
      query: '',
      results: null,
      isLoading: false,
      error: null,
      selectedConnection: activeEditor.selectedConnection
    };
    
    setEditors([...editors, newEditor]);
    setActiveEditorId(newEditor.id);
  };
  
  const duplicateEditor = () => {
    const activeEditor = getActiveEditor();
    const newEditor: Editor = {
      ...activeEditor,
      id: Date.now().toString(),
      results: null,
      isLoading: false,
      error: null
    };
    
    setEditors([...editors, newEditor]);
    setActiveEditorId(newEditor.id);
  };
  
  const closeEditor = (id: string) => {
    if (editors.length === 1) return; // No permitir cerrar el último editor
    
    const newEditors = editors.filter(editor => editor.id !== id);
    setEditors(newEditors);
    
    // Si cerramos el editor activo, activamos el primer editor restante
    if (id === activeEditorId) {
      setActiveEditorId(newEditors[0].id);
    }
  };

  // Función para ejecutar la consulta
  const executeQuery = async () => {
    const activeEditor = getActiveEditor();
    
    if (!activeEditor.query.trim()) {
      updateActiveEditor({ error: 'La consulta no puede estar vacía' });
      return;
    }
    
    if (!activeEditor.selectedConnection) {
      updateActiveEditor({ error: 'Selecciona una conexión de base de datos' });
      return;
    }
    
    updateActiveEditor({ isLoading: true, error: null });
    
    try {
      // Buscar la conexión seleccionada para obtener el tipo de base de datos
      const connection = connections.find(c => c.id === activeEditor.selectedConnection);
      const dbType = connection ? connection.tipo_db : undefined;
      if (!dbType) {
        updateActiveEditor({ error: 'No se pudo determinar el tipo de base de datos', isLoading: false });
        return;
      }
      // Llamada real al backend
      const response = await axiosInstance.post('/execute-query', {
        query: activeEditor.query,
        connectionId: activeEditor.selectedConnection,
        dbType
      });
      // Espera que el backend devuelva los resultados en response.data.results
      updateActiveEditor({ results: response.data.results || response.data, isLoading: false });
    } catch (err: any) {
      updateActiveEditor({ error: err?.response?.data?.error || 'Error al ejecutar la consulta', isLoading: false, results: null });
    }
  };


  // Guardar consulta actual
  const saveQuery = () => {
    const activeEditor = getActiveEditor();
    
    if (!activeEditor.query.trim() || !queryName.trim()) {
      updateActiveEditor({ error: 'La consulta y el nombre son obligatorios para guardar' });
      return;
    }
    
    // Obtener el nombre de la conexión
    const connection = connections.find(c => c.id === activeEditor.selectedConnection);
    const database = connection ? connection.tipo_db : 'Desconocida';
    
    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: queryName,
      query: activeEditor.query,
      database
    };
    
    setSavedQueries([...savedQueries, newQuery]);
    setQueryName('');
    updateActiveEditor({ error: null });
  };

  // Cargar consulta guardada
  const loadQuery = (savedQuery: SavedQuery) => {
    updateActiveEditor({ query: savedQuery.query });
    setShowSavedQueries(false);
  };

  // Eliminar consulta guardada
  const deleteQuery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedQueries(savedQueries.filter(q => q.id !== id));
  };

  // Copiar consulta al portapapeles
  const copyQuery = () => {
    const activeEditor = getActiveEditor();
    navigator.clipboard.writeText(activeEditor.query);
  };

  // Descargar resultados como JSON
  const downloadResults = () => {
    const activeEditor = getActiveEditor();
    if (!activeEditor.results) return;
    
    const dataStr = JSON.stringify(activeEditor.results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `query-results-${new Date().getTime()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Componente para el área de resultados
  const ResultsArea = () => {
    const activeEditor = getActiveEditor();
    
    return (
      <div className="border rounded-md bg-white overflow-hidden flex-1">
        <div className="border-b px-4 py-2 flex justify-between items-center bg-gray-50">
          <h3 className="font-medium">Resultados</h3>
          <div className="flex items-center space-x-2">
            {activeEditor.results && (
              <button 
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                onClick={downloadResults}
              >
                <Download size={14} className="mr-1" />
                <span>Descargar JSON</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4 overflow-auto h-64">
          {activeEditor.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : activeEditor.error ? (
            <div className="text-red-500 p-4 bg-red-50 rounded">{activeEditor.error}</div>
          ) : activeEditor.results ? (
            <div>
              {activeEditor.results.length > 0 && 'id' in activeEditor.results[0] ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(activeEditor.results[0]).map((key) => (
                        <th 
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeEditor.results.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.values(row).map((val, j) => (
                          <td 
                            key={j}
                            className="px-6 py-2 whitespace-nowrap text-sm text-gray-500"
                          >
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-3 text-sm">
                  {activeEditor.results.map((item, index) => (
                    <div key={index} className="mb-1">
                      {item.mensaje || JSON.stringify(item)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-center h-full flex items-center justify-center">
              <p>Ejecuta una consulta para ver los resultados</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${maximized ? 'fixed inset-0 z-50 bg-gray-50' : 'h-screen'} bg-gray-50 text-gray-800 transition-all duration-300`}>
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database size={24} />
            <h1 className="text-xl font-bold">ToolQuery Juli</h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button 
                className="flex items-center bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-md"
                onClick={() => setShowSavedQueries(!showSavedQueries)}
              >
                <span>Consultas Guardadas</span>
                <ChevronDown size={16} className="ml-1" />
              </button>
              
              {showSavedQueries && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                  {savedQueries.length === 0 ? (
                    <div className="p-3 text-sm text-gray-600">No hay consultas guardadas</div>
                  ) : (
                    <ul>
                      {savedQueries.map((sq) => (
                        <li 
                          key={sq.id} 
                          className="p-2 border-b border-gray-100 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                          onClick={() => loadQuery(sq)}
                        >
                          <div>
                            <p className="font-medium">{sq.name}</p>
                            <p className="text-xs text-gray-500">{sq.database}</p>
                          </div>
                          <button 
                            className="text-red-500 hover:text-red-700"
                            onClick={(e) => deleteQuery(sq.id, e)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button 
              className="flex items-center bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-md"
              onClick={() => setMaximized(!maximized)}
              title={maximized ? "Restaurar tamaño" : "Pantalla completa"}
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Section */}
        <div className="flex flex-col w-full p-4 space-y-4">
          {/* Tabs para los editores */}
          <div className="flex items-center border-b">
            {editors.map((editor) => (
              <div 
                key={editor.id}
                className={`py-2 px-4 flex items-center ${editor.id === activeEditorId ? 'border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100 cursor-pointer'}`}
                onClick={() => setActiveEditorId(editor.id)}
              >
                <span className="mr-2">Editor {editors.indexOf(editor) + 1}</span>
                {editors.length > 1 && (
                  <button 
                    className="text-gray-500 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeEditor(editor.id);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <button 
              className="p-2 ml-2 text-blue-600 hover:text-blue-800"
              onClick={addNewEditor}
              title="Nuevo editor"
            >
              <Plus size={16} />
            </button>
          </div>
          
          {/* Barra de herramientas unificada */}
          <div className="bg-gray-100 p-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <label className="mr-2 font-medium">Conexión:</label>
              {isLoadingConnections ? (
                <div className="animate-pulse bg-gray-200 rounded h-6 w-32"></div>
              ) : (
                <select 
                  value={getActiveEditor().selectedConnection ?? ''}
                  onChange={(e) => updateActiveEditor({ selectedConnection: Number(e.target.value) })}
                  className="border rounded-md px-3 py-1 bg-white"
                >
                  <option value="">Selecciona una conexión</option>
                  {connections.map((conn) => (
  <option key={conn.id} value={conn.id}>
    {conn.nombre} ({conn.tipo_db}) - {conn.host}:{conn.puerto}
  </option>
))}
                </select>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button 
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 flex items-center"
                onClick={copyQuery}
                title="Copiar consulta"
              >
                <Copy size={14} className="mr-1" />
                <span>Copiar</span>
              </button>
              
              <button 
                className="bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 flex items-center"
                onClick={duplicateEditor}
                title="Duplicar editor"
              >
                <Copy size={14} className="mr-1" />
                <span>Duplicar</span>
              </button>
              
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  placeholder="Nombre para guardar"
                  className="px-2 py-1 text-sm rounded border border-gray-300 w-36"
                />
                <button 
                  className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 flex items-center"
                  onClick={saveQuery}
                >
                  <Save size={14} className="mr-1" />
                  <span>Guardar</span>
                </button>
              </div>
              
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded flex items-center"
                onClick={executeQuery}
              >
                <Play size={14} className="mr-1" />
                <span>Ejecutar</span>
              </button>
            </div>
          </div>
          
          {/* Query Editor */}
          <div className="flex-1 flex flex-col">
            <textarea
              value={getActiveEditor().query}
              onChange={(e) => updateActiveEditor({ query: e.target.value })}
              placeholder="Escribe tu consulta SQL aquí..."
              className="flex-1 p-4 bg-gray-800 text-gray-100 font-mono rounded-md text-sm"
              spellCheck="false"
            />
          </div>
          
          {/* Results Section */}
          <ResultsArea />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 border-t p-2 text-center text-sm text-gray-500">
        ToolQuery Juli v1.0 - Interfaz para consultas SQL
      </footer>
    </div>
  );
};

export default ToolQuery;