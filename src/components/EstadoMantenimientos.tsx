import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axiosInstance from '../utils/axios';
import config from "../config/config";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, X, Check, AlertTriangle, ArrowLeft, Database, HelpCircle } from "lucide-react";
import MantenimientosInfoSidebar from "./MantenimientosInfoSidebar";

// Conexión con Socket.IO
const socket = io(`${config.apiBaseUrl}:${config.wsPort}`, {
  transports: ['websocket', 'polling'],
  path: '/socket.io',
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  forceNew: true
});

// Definir una interfaz para el mantenimiento
interface Mantenimiento {
  id: number;
  titulo: string;
  basededatos: string;
  fecha: string;
  fecha_final?: string;
  estado: "en_proceso" | "completado" | "fallido" | "exitoso";
  descripcion?: string;
  tamano_inicial?: number;
  tamano_final?: number;
  backup?: boolean;
}

// Componente principal
const EstadoMantenimientos: React.FC = () => {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [filtroTitulo, setFiltroTitulo] = useState<string>("");
  const [filtroBD, setFiltroBD] = useState<string>("");
  const [itemsPorPagina, setItemsPorPagina] = useState<number>(5);
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [cargando, setCargando] = useState<boolean>(false);
  // Estado para el sidebar de ayuda
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Conectar al socket
    socket.on('connect', () => {
      console.log('✅ Conectado al servidor de WebSocket');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });

    // Escuchar actualizaciones de estado
    socket.on('actualizacion-estado', (data: Mantenimiento) => {
      setMantenimientos(prev => 
        prev.map(m => m.id === data.id ? data : m)
      );
    });

    // Obtener estado inicial
    obtenerMantenimientos();

    return () => {
      socket.off('actualizacion-estado');
      socket.disconnect();
    };
  }, []);

  const obtenerMantenimientos = async () => {
    try {
      setCargando(true);
      const response = await axiosInstance.get(`${config.apiBaseUrl}:${config.apiPort}/api/mantenimientos/estado`);
      setMantenimientos(response.data);
      setCargando(false);
    } catch (error) {
      console.error("❌ Error al obtener mantenimientos:", error);
      setCargando(false);
    }
  };

  // Filtrar mantenimientos
  const mantenimientosFiltrados = mantenimientos.filter(m => {
    return (
      m.titulo.toLowerCase().includes(filtroTitulo.toLowerCase()) &&
      m.basededatos.toLowerCase().includes(filtroBD.toLowerCase())
    );
  });

  // Paginación
  const totalPaginas = Math.ceil(mantenimientosFiltrados.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const mantenimientosPaginados = mantenimientosFiltrados.slice(
    indiceInicio,
    indiceInicio + itemsPorPagina
  );

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroTitulo("");
    setFiltroBD("");
  };

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    try {
      return new Date(fechaStr).toLocaleString();
    } catch (e) {
      return fechaStr;
    }
  };

  // Renderizar icono de estado
  const renderizarIconoEstado = (estado: string) => {
    switch (estado) {
      case "completado":
      case "exitoso":
        return <Check className="w-5 h-5 text-green-500" />;
      case "fallido":
        return <X className="w-5 h-5 text-red-500" />;
      case "en_proceso":
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Renderizar texto de estado
  const renderizarTextoEstado = (estado: string) => {
    switch (estado) {
      case "completado":
      case "exitoso":
        return <span className="text-green-700 font-medium">Completado</span>;
      case "fallido":
        return <span className="text-red-700 font-medium">Fallido</span>;
      case "en_proceso":
        return <span className="text-yellow-700 font-medium">En proceso</span>;
      default:
        return <span className="text-gray-700 font-medium">{estado}</span>;
    }
  };

  // Renderizar icono de backup
  const renderizarIconoBackup = (backup?: boolean) => {
    if (backup === undefined) return null;
    return backup ? 
      <Database className="w-5 h-5 text-green-500" /> : 
      <Database className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="w-full max-w-[95vw] mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Status Mantenimientos</h2>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 border border-indigo-200 shadow-sm"
        >
          <HelpCircle className="w-5 h-5" />
          Ayuda
        </button>
      </div>
      {/* TOOLBAR DE FILTROS UI/UX MEJORADA */}
      <div className="flex flex-wrap gap-2 items-end bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
        <div className="flex items-center bg-gray-100 rounded-lg px-2 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 mr-1" />
          <input
            type="text"
            placeholder="Filtrar por título..."
            className="bg-transparent border-none focus:ring-0 p-2 w-full"
            value={filtroTitulo}
            onChange={(e) => setFiltroTitulo(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg px-2 min-w-[180px]">
          <Database className="w-4 h-4 text-gray-400 mr-1" />
          <input
            type="text"
            placeholder="Filtrar por base de datos..."
            className="bg-transparent border-none focus:ring-0 p-2 w-full"
            value={filtroBD}
            onChange={(e) => setFiltroBD(e.target.value)}
          />
        </div>
        <button
          onClick={limpiarFiltros}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 h-10"
        >
          Limpiar Filtros
        </button>
        <select
          className="p-2 border rounded-md h-10"
          value={itemsPorPagina}
          onChange={(e) => setItemsPorPagina(Number(e.target.value))}
        >
          <option value="5">5 por página</option>
          <option value="10">10 por página</option>
          <option value="20">20 por página</option>
          <option value="50">50 por página</option>
        </select>
        <button 
          onClick={obtenerMantenimientos}
          className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 h-10 disabled:opacity-50"
          disabled={cargando}
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${cargando ? 'animate-spin' : ''}`} />
          {cargando ? 'Actualizando...' : 'Actualizar'}
        </button>
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 h-10"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>
      </div>

      {/* Tabla de mantenimientos */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-600">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Cliente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Base de datos
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Descripción
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Fecha inicio
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Fecha final
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Tamaño inicial
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Tamaño final
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Backup
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mantenimientosPaginados.length > 0 ? (
              mantenimientosPaginados.map((mantenimiento) => (
                <tr key={mantenimiento.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {mantenimiento.titulo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mantenimiento.basededatos}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mantenimiento.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatearFecha(mantenimiento.fecha)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mantenimiento.fecha_final ? formatearFecha(mantenimiento.fecha_final) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {renderizarIconoEstado(mantenimiento.estado)}
                      {renderizarTextoEstado(mantenimiento.estado)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mantenimiento.tamano_inicial || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mantenimiento.tamano_final || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {renderizarIconoBackup(mantenimiento.backup)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                  {cargando ? (
                    <div className="flex justify-center items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>Cargando mantenimientos...</span>
                    </div>
                  ) : (
                    "No se encontraron mantenimientos con los filtros aplicados"
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {mantenimientosFiltrados.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Mostrando {indiceInicio + 1}-{Math.min(indiceInicio + itemsPorPagina, mantenimientosFiltrados.length)} de {mantenimientosFiltrados.length} registros
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <div className="px-3 py-1 text-sm">
              Página {paginaActual} de {totalPaginas || 1}
            </div>
            <button
              onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
      {/* Sidebar contextual de ayuda */}
      <MantenimientosInfoSidebar isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default EstadoMantenimientos;
