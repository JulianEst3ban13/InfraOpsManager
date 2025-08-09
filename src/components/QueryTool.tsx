import React, { useState, useRef, useEffect, forwardRef } from 'react';
import axiosInstance from '../utils/axios';
import axios from 'axios';
import {
  ChevronDown, ChevronRight,
  Maximize2, Minimize2
} from 'lucide-react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import TableProperties from './TableProperties';
import DatabaseStructureTree, { DatabaseStructure } from './DatabaseStructureTree';
import QueryEditor from './QueryEditor';
import ResultsTable from './ResultsTable';
import ExportButton from './ExportButton';
import SqlUploadButton from './SqlUploadButton';
import GenerateSqlButton from './GenerateSqlButton';

interface QueryToolProps {
  connectionId: number;
  dbType: "mysql" | "pgsql" | "sqlserver" | "mongodb";
  databaseName: string;
  userId: number;
  onClose: () => void;
}



interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  schema: string;
  tableName: string;
}

interface QueryHistory {
  query: string;
  timestamp: string;
  database: string;
  connectionId: number;
  rowsAffected?: number;
  executionTime?: number;
}

interface DraggableContentProps {
  children: React.ReactNode;
}

const DraggableContent = forwardRef<HTMLDivElement, DraggableContentProps>((props, ref) => (
  <div ref={ref} className="bg-white shadow-xl rounded-lg border border-gray-300 flex flex-col relative overflow-hidden transition-shadow duration-200 hover:shadow-2xl">
    {props.children}
  </div>
));

DraggableContent.displayName = 'DraggableContent';

const QueryTool: React.FC<QueryToolProps> = ({ connectionId, dbType, databaseName, userId, onClose }) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [editorHeight, setEditorHeight] = useState(150);

  const dragRef = useRef<HTMLDivElement>(null);

  const [showStructure, setShowStructure] = useState(false);
  const [structure, setStructure] = useState<DatabaseStructure | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    schemas: true,
    tables: false,
    views: false,
    functions: false,
    triggers: false,
    sequences: false
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    schema: '',
    tableName: ''
  });
  const [showTableProperties, setShowTableProperties] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<{ schema: string; name: string } | null>(null);
  const [history, setHistory] = useState<QueryHistory[]>([]);


  useEffect(() => {
    if (showStructure) {
      axiosInstance.get(`/database/${connectionId}/structure`)
        .then(response => {
          setStructure(response.data);
        })
        .catch(error => {
          console.error('Error fetching database structure:', error);
          setStructure(null);
        });
    }
  }, [showStructure, connectionId]);

  const defaultWidth = Math.min(1200, window.innerWidth * 0.9);
  const defaultHeight = Math.min(900, window.innerHeight * 0.9);
  const expandedWidth = Math.min(1600, window.innerWidth * 0.95);
  const expandedHeight = Math.min(1100, window.innerHeight * 0.95);
  const structurePanelWidth = 280;
  const historyPanelWidth = 280;
  const minEditorHeight = 100;
  const maxEditorHeight = Math.min(400, window.innerHeight * 0.3);
  const defaultEditorHeight = 400;

  const currentWidth = isExpanded ? expandedWidth : defaultWidth;
  const currentHeight = isExpanded ? expandedHeight : defaultHeight;

  const getMainContentWidth = () => {
    let width = '100%';
    if (showStructure && showHistory) {
      width = `calc(100% - ${structurePanelWidth + historyPanelWidth}px)`;
    } else if (showStructure) {
      width = `calc(100% - ${structurePanelWidth}px)`;
    } else if (showHistory) {
      width = `calc(100% - ${structurePanelWidth}px)`;
    }
    return width;
  };





  useEffect(() => {
    setEditorHeight(defaultEditorHeight);
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);



  useEffect(() => {
    const fetchDatabaseInfo = async () => {
      try {
        if (!userId) {
          setError('Error: Usuario no identificado. Por favor, inicie sesión nuevamente.');
          return;
        }



        // Cargar el historial de consultas en un try-catch separado
        try {
          console.log("Obteniendo historial para usuario:", userId, "y conexión:", connectionId);
          const historyResponse = await axiosInstance.get(`/query-history`, {
            params: {
              userId: userId,
              connectionId: connectionId // Asegurarnos de enviar el connectionId
            }
          });

          if (historyResponse.data) {
            const formattedHistory = historyResponse.data.map((entry: any) => ({
              query: entry.query_text,
              timestamp: entry.created_at,
              database: entry.database_name,
              connectionId: connectionId,
              rowsAffected: entry.rows_affected,
              executionTime: entry.execution_time,
              username: entry.username
            }));
            console.log("Historial formateado:", formattedHistory);
            setHistory(formattedHistory);
          }
        } catch (historyError) {
          console.warn("No se pudo cargar el historial de consultas:", historyError);
          // No establecemos error general para permitir que el QueryTool funcione
        }
      } catch (error: unknown) {
        console.error("Error al inicializar QueryTool:", error);
        setError('Error al inicializar QueryTool');
      }
    };

    fetchDatabaseInfo();
  }, [databaseName, userId, connectionId]);

  const executeQuery = async (queryToExecute: string) => {
    console.log("🚀 Iniciando ejecución de query");

    // Obtener token y decodificar para obtener user_id y username
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let username = '';
    let userId = null;

    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decodedToken = JSON.parse(jsonPayload);
        console.log("Token decodificado:", decodedToken);

        // Obtener userId y username del token
        userId = decodedToken.id;
        username = decodedToken.username;

        // Si no está en el token, intentar obtener del localStorage
        if (!userId || !username) {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userObj = JSON.parse(storedUser);
            userId = userObj.id;
            username = userObj.username;
          }
        }

        console.log("Datos obtenidos del token:", { userId, username });
      } catch (error) {
        console.error('Error al decodificar el token:', error);
        setError('Error al obtener información del usuario');
        return;
      }
    }

    if (!userId || !username) {
      console.error('No se pudo obtener la información del usuario');
      setError('Error: No se pudo obtener la información del usuario');
      return;
    }

    console.log("Datos para la consulta:", {
      username,
      connectionId,
      // selectedDatabase
    });

    if (!queryToExecute || queryToExecute.trim() === '') {
      setError('No hay consulta válida para ejecutar');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setColumns([]);
    setRowCount(null);
    setExecutionTime(null);

    try {
      const startTime = performance.now();

      const response = await axiosInstance.post(`/execute-query`, {
        connectionId,
        query: queryToExecute,
        dbType,
        userId
      });

      const endTime = performance.now();
      const executionTimeMs = Math.round(endTime - startTime);

      console.log("✅ Respuesta de la consulta:", response.data);

      if (response.data && response.data.results) {
        const results = response.data.results;
        setResults(results);

        if (results.length > 0) {
          setColumns(Object.keys(results[0]));
        }

        const rowsAffected = results.length;
        setRowCount(rowsAffected);
        setExecutionTime(executionTimeMs);

        // Guardar en el historial
        try {
          const historyData = {
            user_id: Number(userId),
            username: username.trim(),
            database_name: databaseName.trim(),
            id_database: Number(connectionId),
            query_text: queryToExecute.trim(),
            rows_affected: Number(rowsAffected),
            execution_time: Number(executionTimeMs)
          };

          // Validación adicional para username e id_database
          if (!historyData.username || historyData.username.length === 0) {
            throw new Error('Username no puede estar vacío');
          }

          if (!historyData.id_database) {
            throw new Error('ID de base de datos no puede estar vacío');
          }

          console.log("💾 Datos a enviar al historial:", {
            ...historyData,
            username_length: historyData.username.length,
            username_value: historyData.username,
            id_database_value: historyData.id_database
          });

          // Asegurarnos de que la estructura coincida con el SQL del backend
          const historyResponse = await axiosInstance.post(
            `/query-history`,
            {
              user_id: historyData.user_id,
              username: historyData.username,
              database_name: historyData.database_name,
              id_database: historyData.id_database,
              query_text: historyData.query_text,
              rows_affected: historyData.rows_affected,
              execution_time: historyData.execution_time
            }
          );

          console.log("✅ Historial guardado:", historyResponse.data);

          // Actualizar el historial local
          const newHistoryEntry = {
            query: queryToExecute,
            timestamp: new Date().toISOString(),
            database: databaseName,
            connectionId: Number(connectionId),
            rowsAffected: Number(rowsAffected),
            executionTime: Number(executionTimeMs),
            username: username
          };
          setHistory(prev => [newHistoryEntry, ...prev]);

        } catch (historyError: unknown) {
          console.error("❌ Error al guardar en historial:", historyError);
          if (historyError instanceof Error) {
            console.error("Detalles:", historyError.message);
          }
          if (axios.isAxiosError(historyError) && 'response' in historyError && historyError.response) {
            console.error("Respuesta del servidor:", historyError.response.data);
          }
        }
      }

    } catch (err: any) {
      console.error("❌ Error al ejecutar consulta:", err);
      setError(err.response?.data?.error || 'Error al ejecutar la consulta');
    } finally {
      setLoading(false);
    }
  };

  const executeSelectedQuery = () => {
    if (!query || query.trim() === '') {
      setError('No hay consulta para ejecutar');
      return;
    }

    const lines = query.split('\n');
    let queryToExecute = '';

    if (selectedLine !== null) {
      // Si hay una línea seleccionada, usar esa línea
      const currentLine = lines[selectedLine]?.trim();

      // Si la línea está vacía o es un comentario, mostrar error
      if (!currentLine || currentLine.startsWith('--')) {
        setError('La línea seleccionada está vacía o es un comentario');
        return;
      }

      queryToExecute = currentLine;
    } else {
      // Si no hay línea seleccionada, usar todo el texto
      queryToExecute = lines
        .filter(line => line.trim() && !line.trim().startsWith('--'))
        .join('\n');

      if (!queryToExecute.trim()) {
        setError('No hay consulta válida para ejecutar');
        return;
      }
    }

    executeQuery(queryToExecute);
  };



  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleTableContextMenu = (e: React.MouseEvent, schema: string, tableName: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      schema,
      tableName
    });
  };

  const handleShowProperties = () => {
    setSelectedTable({
      schema: contextMenu.schema,
      name: contextMenu.tableName
    });
    setShowTableProperties(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;

    return (
      <div
        className="fixed bg-white shadow-lg rounded-md py-1 z-50 min-w-[150px]"
        style={{ top: contextMenu.y, left: contextMenu.x }}
      >
        <button
          onClick={() => {
            setQuery(`SELECT * FROM ${contextMenu.schema}.${contextMenu.tableName} LIMIT 100;`);
            setContextMenu(prev => ({ ...prev, visible: false }));
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
        >
          Seleccionar filas
        </button>
        <button
          onClick={() => {
            setQuery(`SELECT COUNT(*) FROM ${contextMenu.schema}.${contextMenu.tableName};`);
            setContextMenu(prev => ({ ...prev, visible: false }));
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
        >
          Contar filas
        </button>
        <button
          onClick={handleShowProperties}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
        >
          Propiedades
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-40 bg-black bg-opacity-50 p-4">
      <Draggable
        handle=".drag-handle"
        defaultPosition={{ x: 0, y: 0 }}
        bounds="parent"
        nodeRef={dragRef}
      >
        <ResizableBox
          width={currentWidth}
          height={currentHeight}

          minConstraints={[Math.min(800, window.innerWidth * 0.5), Math.min(500, window.innerHeight * 0.5)]}
          maxConstraints={[window.innerWidth * 0.95, window.innerHeight * 0.95]}
          resizeHandles={['se']}
          className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden"
        >
          <DraggableContent ref={dragRef}>
            <div className="flex flex-col h-full">
              <div className="bg-indigo-600 text-white p-3 flex justify-between items-center drag-handle cursor-move">
                <div className="flex items-center">
                  <h3 className="font-semibold">Query Tool. - {dbType.toUpperCase()}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleExpand}
                    className="text-white hover:text-gray-200"
                    title={isExpanded ? "Reducir" : "Expandir"}
                  >
                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button
                    onClick={onClose}
                    className="text-white hover:text-gray-200"
                    title="Cerrar"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Panel de historial (ahora a la izquierda) */}
                {showHistory && (
                  <div
                    style={{ width: historyPanelWidth }}
                    className="border-r border-gray-200 overflow-y-auto flex-shrink-0 flex flex-col"
                  >
                    <div className="flex-none p-3 border-b bg-gray-50">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Historial de Consultas
                          <span className="ml-2 text-sm text-gray-500">
                            ({history.length})
                          </span>
                        </h3>
                        <button
                          onClick={() => setShowHistory(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                      {history.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {history.map((entry, index) => (
                            <div
                              key={index}
                              className="p-3 hover:bg-gray-50 cursor-pointer"
                              onClick={() => setQuery(entry.query)}
                            >
                              <pre className="text-sm font-mono bg-gray-50 p-2 rounded overflow-x-auto max-w-full whitespace-pre-wrap break-words">
                                {entry.query.length > 150
                                  ? `${entry.query.substring(0, 150)}...`
                                  : entry.query}
                              </pre>
                              <div className="mt-2 flex justify-between text-xs text-gray-500">
                                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                                <div>
                                  <span className="mr-3">Filas: {entry.rowsAffected || 0}</span>
                                  <span>Tiempo: {entry.executionTime}ms</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No hay consultas en el historial
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Panel de estructura (después del historial) */}
                {showStructure && structure && (
                  <div
                    style={{ width: structurePanelWidth }}
                    className="border-r border-gray-200 overflow-y-auto flex-shrink-0"
                  >
                    <DatabaseStructureTree
                      structure={structure}
                      expandedSections={expandedSections}
                      onToggleSection={(section) => setExpandedSections(prev => ({
                        ...prev,
                        [section]: !prev[section]
                      }))}
                      onTableContextMenu={handleTableContextMenu}
                      onTableClick={(schema, tableName) =>
                        setQuery(`SELECT * FROM ${schema}.${tableName} LIMIT 100;`)}
                      dbType={dbType}
                    />
                  </div>
                )}

                {/* Contenido principal (editor y resultados) */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ width: getMainContentWidth() }}>
                  <div className="bg-gray-100 p-2 border-b flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => setShowStructure(!showStructure)}
                        className="min-w-[120px] px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        {showStructure ? 'Ocultar Estructura' : 'Mostrar Estructura'}
                      </button>
                      {showStructure && structure && (
                        <div className="absolute left-0 top-full mt-2 w-64 bg-white shadow-lg rounded-lg border border-gray-200 z-50 max-h-[500px] overflow-auto">
                          <DatabaseStructureTree
                            structure={structure}
                            expandedSections={expandedSections}
                            onToggleSection={(section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))}
                            onTableContextMenu={handleTableContextMenu}
                            onTableClick={(schema, tableName) => {
                              // Aquí puedes implementar la acción al hacer clic en una tabla
                              console.log('Tabla seleccionada:', schema, tableName);
                            }}
                            dbType={dbType}
                          />
                        </div>
                      )}

                      <button
                        onClick={executeSelectedQuery}
                        className="min-w-[120px] px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors ml-2 text-sm"
                        disabled={loading}
                        title="Ctrl+Enter para ejecutar"
                      >
                        {loading ? 'Ejecutando...' : 'Ejecutar Consulta'}
                      </button>

                      <GenerateSqlButton
                        results={results}
                        columns={columns}
                        currentQuery={query}
                        onError={setError}
                        onSqlGenerated={setQuery}
                      />

                      <SqlUploadButton
                        onQueryLoaded={setQuery}
                      />

                      <ExportButton
                        results={results}
                        columns={columns}
                        onError={setError}
                      />

                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="min-w-[120px] flex items-center justify-center bg-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 ml-auto text-sm"
                        aria-expanded={showHistory}
                      >
                        Historial {showHistory ? <ChevronDown size={16} className="ml-1.5 transition-transform duration-200" /> : <ChevronRight size={16} className="ml-1.5 transition-transform duration-200" />}
                      </button>
                      <button
                        className="h-8 px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium flex items-center justify-center min-w-[32px]"
                        onClick={() => setQuery('')}
                        title="Limpiar editor"
                      >
                        <span className="material-icons text-sm">Limpiar</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-none relative" style={{ height: editorHeight }}>
                      <ResizableBox
                        width={Infinity}
                        height={editorHeight}
                        minConstraints={[Infinity, minEditorHeight]}
                        maxConstraints={[Infinity, maxEditorHeight]}
                        onResize={(e, data) => {
                          setEditorHeight(data.size.height);
                        }}
                        axis="y"
                        handle={
                          <div className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize bg-gray-100 hover:bg-gray-200 z-10 transition-colors duration-200" />
                        }
                      >
                        <div className="absolute inset-0 overflow-auto flex flex-col">

                          <div className="flex-1">
                            <QueryEditor
                              query={query}
                              onQueryChange={setQuery}
                              selectedLine={selectedLine}
                              onLineSelect={setSelectedLine}
                              onExecute={executeSelectedQuery}
                            />
                          </div>
                        </div>
                      </ResizableBox>
                    </div>

                    <div className="flex-1 min-h-0 border-t border-gray-200 flex flex-col overflow-hidden" style={{ minHeight: '70%', height: '70%' }}>
                      <div className="flex-1 w-full overflow-auto bg-gray-50">
                        <ResultsTable
                          results={results || []}
                          columns={columns || []}
                          loading={loading}
                          error={error}
                          rowCount={rowCount}
                          executionTime={executionTime}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DraggableContent>
        </ResizableBox>
      </Draggable>

      {contextMenu.visible && renderContextMenu()}

      {showTableProperties && selectedTable && (
        <TableProperties
          connectionId={connectionId}
          dbType={dbType}
          schema={selectedTable.schema}
          tableName={selectedTable.name}
          onClose={() => setShowTableProperties(false)}
        />
      )}
    </div>
  );
};

export default QueryTool;