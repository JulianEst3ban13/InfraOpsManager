import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axios";
import { PlusCircle, ArrowLeft, Edit, Trash2, ArrowUp, ArrowDown, Terminal, RefreshCw, BookText } from "lucide-react";
import ConexionInfoSidebar from "./ConexionInfoSidebar";
import FormularioConexion from "./FormularioConexion";
import QueryTool from "./QueryTool";
import config from "../config/config";
import { PermissionGuard } from "./PermissionGuard";

// Definir un tipo para las conexiones que incluya los campos necesarios
type Conexion = {
  id: number;
  nombre: string;
  usuario: string;
  contraseña: string;
  ip: string;
  basededatos: string;
  tipo_bd: string;
  puerto: string;
};

// Definir el tipo para los tipos de base de datos válidos para QueryTool
type ValidDBType = "mysql" | "pgsql" | "sqlserver" | "mongodb";

const ConexionBD: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [conexiones, setConexiones] = useState<Conexion[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [conexionAEliminar, setConexionAEliminar] = useState<number | null>(null);
  const [activeQueryTool, setActiveQueryTool] = useState<{id: number, dbType: ValidDBType} | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);

  const estadoInicial = {
    nombre: "",
    usuario: "",
    contraseña: "",
    ip: "",
    basededatos: "",
    tipo_bd: "",
    puerto: "",
  };

  const [formData, setFormData] = useState(estadoInicial);
  const [sortKey, setSortKey] = useState<string>("nombre");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroIP, setFiltroIP] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [conexionesPorPagina, setConexionesPorPagina] = useState(15);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);

  const limpiarFiltros = () => {
    setFiltroNombre("");
    setFiltroIP("");
    setPaginaActual(1);
  };

  const cambiarOrden = (columna: string) => {
    if (sortKey === columna) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(columna);
      setSortOrder("asc");
    }
  };

  const conexionesFiltradas = conexiones.filter((conexion) =>
    conexion.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) &&
    conexion.ip.toLowerCase().includes(filtroIP.toLowerCase())
  );

  const conexionesOrdenadas = [...conexionesFiltradas].sort((a, b) => {
    if (a[sortKey as keyof Conexion] < b[sortKey as keyof Conexion]) return sortOrder === "asc" ? -1 : 1;
    if (a[sortKey as keyof Conexion] > b[sortKey as keyof Conexion]) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const indexUltimaConexion = paginaActual * conexionesPorPagina;
  const indexPrimeraConexion = indexUltimaConexion - conexionesPorPagina;
  const conexionesPaginadas = conexionesOrdenadas.slice(indexPrimeraConexion, indexUltimaConexion);

  useEffect(() => {
    // Obtener el ID del usuario al montar el componente
    const storedUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    } else if (token) {
      try {
        // Decodificar el token JWT para obtener el ID del usuario
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decodedToken = JSON.parse(jsonPayload);
        if (decodedToken.id) {
          setUserId(decodedToken.id);
          // Guardar el ID en localStorage para futuras referencias
          localStorage.setItem('userId', decodedToken.id.toString());
        }
      } catch (error) {
        console.error('Error al decodificar el token:', error);
        setError('Error al verificar la identidad del usuario');
      }
    }

    obtenerConexiones();
  }, []);

  const obtenerConexiones = async () => {
    try {
      const response = await axiosInstance.get(`/conexiones`);
      setConexiones(response.data);
    } catch (error: any) {
      console.error("Error al obtener conexiones:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<string | null> => {
    e.preventDefault();
    setError(null);
  
    try {
      if (editando) {
        await axiosInstance.put(`/conexiones/${editando}`, formData);
      } else {
        await axiosInstance.post(`/conectar-bd`, formData);
      }
  
      setMostrarFormulario(false);
      setEditando(null);
      resetForm();
      obtenerConexiones();
  
      return null;
    } catch (error: any) {
      console.error("Error al guardar conexión:", error.response?.data?.error || error.message);
      const errorMsg = error.response?.data?.error || "Error desconocido al guardar conexión";
      setError(errorMsg);
      return errorMsg;
    }
  };

  const handleEdit = (conexion: Conexion) => {
    setFormData(conexion);
    setEditando(conexion.id);
    setMostrarFormulario(true);
  };

  const handleCreate = () => {
    resetForm();
    setEditando(null);
    setMostrarFormulario(true);
  };

  const resetForm = () => {
    setFormData(estadoInicial);
  };

  const confirmDelete = (id: number) => {
    setConexionAEliminar(id);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (conexionAEliminar !== null) {
      try {
        await axiosInstance.delete(`/conexiones/${conexionAEliminar}`);
        obtenerConexiones();
        setModalOpen(false);
      } catch (error) {
        console.error("Error al eliminar la conexión:", error);
      }
    }
  };

  // Función para verificar si el tipo de BD es válido para QueryTool
  const isValidDBType = (dbType: string): dbType is ValidDBType => {
    return ["mysql", "pgsql", "sqlserver", "mongodb"].includes(dbType);
  };

  // Función para manejar la apertura del QueryTool
  const handleOpenQueryTool = (conexion: Conexion) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token) {
      setError('Error: Usuario no identificado. Por favor, inicie sesión nuevamente.');
      return;
    }

    if (!userId) {
      setError('Error: No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente.');
      return;
    }

    if (isValidDBType(conexion.tipo_bd)) {
      setActiveQueryTool({ id: conexion.id, dbType: conexion.tipo_bd });
    } else {
      setError(`El tipo de base de datos '${conexion.tipo_bd}' no es compatible con Query Tool. Los tipos válidos son: mysql, pgsql, sqlserver, mongodb.`);
    }
  };

  const actualizarConexiones = async () => {
    setActualizando(true);
    await obtenerConexiones();
    setActualizando(false);
  };

  return (
    <div className="p-6">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Conexiones Registradass</h1>
      </div>

      {/* TOOLBAR DE FILTROS UNIFICADA */}
      <div className="flex flex-wrap gap-2 items-end bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
        <button
          className="flex items-center bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 text-sm mr-2"
          onClick={() => setShowInfoSidebar(true)}
          aria-label="Información del módulo"
          type="button"
        >
          <BookText className="w-5 h-5 mr-2" />
          Información
        </button>
        <input
          type="text"
          placeholder="Filtrar por nombre..."
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          className="p-2 border rounded-md min-w-[180px]"
        />
        <input
          type="text"
          placeholder="Filtrar por ip..."
          value={filtroIP}
          onChange={(e) => setFiltroIP(e.target.value)}
          className="p-2 border rounded-md min-w-[180px]"
        />
        <button onClick={limpiarFiltros} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 h-10">
          Limpiar Filtros
        </button>
        <select
          value={conexionesPorPagina}
          onChange={(e) => setConexionesPorPagina(Number(e.target.value))}
          className="p-2 border rounded-md h-10"
        >
          <option value={15}>15 por página</option>
          <option value={20}>20 por página</option>
          <option value={30}>30 por página</option>
          <option value={70}>70 por página</option>
        </select>
        <button
          onClick={actualizarConexiones}
          className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 h-10 disabled:opacity-50"
          disabled={actualizando}
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${actualizando ? 'animate-spin' : ''}`} />
          {actualizando ? 'Actualizando...' : 'Actualizar'}
        </button>
        <PermissionGuard permission="crear_conexiones_bd">
          <button onClick={handleCreate} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 h-10">
            <PlusCircle className="w-5 h-5 mr-2" />
            Nueva Conexión
          </button>
        </PermissionGuard>
        <button onClick={onBack} className="flex items-center bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 h-10">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg p-4 overflow-x-auto">
        <h3 className="text-lg font-semibold mb-2">Lista de Conexiones</h3>
        {conexiones.length === 0 ? (
          <p className="text-gray-500">No hay conexiones guardadas.</p>
        ) : (
          <table className="w-full border border-gray-300 rounded-lg shadow-sm text-sm">
            <thead>
              <tr className="bg-indigo-600 text-white text-left">
                {["nombre", "usuario", "ip", "basededatos", "tipo_bd", "puerto"].map((col) => (
                  <th key={col} className="border border-gray-300 px-4 py-2 cursor-pointer" onClick={() => cambiarOrden(col)}>
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                    {sortKey === col && (sortOrder === "asc" ? <ArrowUp className="inline w-4 h-4 ml-2" /> : <ArrowDown className="inline w-4 h-4 ml-2" />)}
                  </th>
                ))}
                <th className="border border-gray-300 px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conexionesPaginadas.map((conexion, index) => (
                <tr
                  key={conexion.id}
                  className={`border-b border-gray-400 hover:bg-gray-300 transition-all ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                >
                  <td className="px-4 py-3">{conexion.nombre}</td>
                  <td className="px-4 py-3">{conexion.usuario}</td>
                  <td className="px-4 py-3">{conexion.ip}</td>
                  <td className="px-4 py-3">{conexion.basededatos}</td>
                  <td className="px-4 py-3">{conexion.tipo_bd}</td>
                  <td className="px-4 py-3">{conexion.puerto}</td>
                  <td className="px-4 py-3 flex justify-center space-x-3">
                    <div className="flex justify-center items-center gap-3">
                      <PermissionGuard permission="editar_conexiones_bd">
                        <button onClick={() => handleEdit(conexion)} className="text-blue-500 hover:text-blue-700">
                          <Edit className="w-5 h-5" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="eliminar_conexiones_bd">
                        <button onClick={() => confirmDelete(conexion.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="usar_query_tool_bd">
                        <button onClick={() => handleOpenQueryTool(conexion)} className="text-green-500 hover:text-green-700" title="Abrir en Query Tool">
                          <Terminal className="w-5 h-5" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
            disabled={paginaActual === 1}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Anterior
          </button>

          <span>Página {paginaActual} de {Math.ceil(conexionesFiltradas.length / conexionesPorPagina) || 1}</span>

          <button
            onClick={() => setPaginaActual((prev) => (prev < Math.ceil(conexionesFiltradas.length / conexionesPorPagina) ? prev + 1 : prev))}
            disabled={paginaActual * conexionesPorPagina >= conexionesFiltradas.length || conexionesFiltradas.length === 0}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">¿Estás seguro de eliminar esta conexión?</h2>
            <p className="text-gray-700 mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <FormularioConexion
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => setMostrarFormulario(false)}
          editando={!!editando}
          resetForm={resetForm}
        />
      )}

      {activeQueryTool && userId && (
        <QueryTool
          connectionId={activeQueryTool.id}
          dbType={activeQueryTool.dbType}
          databaseName={conexiones.find(c => c.id === activeQueryTool.id)?.basededatos || ''}
          userId={userId}
          onClose={() => setActiveQueryTool(null)}
        />
      )}
      <ConexionInfoSidebar isOpen={showInfoSidebar} onClose={() => setShowInfoSidebar(false)} />
    </div>
  );
};

export default ConexionBD;