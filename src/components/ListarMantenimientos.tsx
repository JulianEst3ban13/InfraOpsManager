import React, { useEffect, useState } from "react";
import { PlusCircle, ArrowLeft, Disc3, BadgeCheck, XCircle, Play, FileArchive, Link2Off, RefreshCw, MoreVertical, HelpCircle } from "lucide-react";
import MantenimientosInfoSidebar from "./MantenimientosInfoSidebar";
import axiosInstance from "../utils/axios";
import { AxiosError } from "axios";
import CrearMantenimiento from "./CrearMantenimiento";
import ProgresoMantenimiento from "./ProgresoMantenimiento";
import { toast } from "react-hot-toast";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Extender el prototipo de Date para obtener la semana del año
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

interface Mantenimiento {
    id: number;
    titulo: string;
    basededatos: string;
    descripcion: string;
    estado: "pendiente" | "en_proceso" | "completado" | "fallido" | "exitoso";
    fecha: string;
    created_at: string;
    tamano_antes: string;
    tamano_despues: string;
    backup: string;
    total: number;
    totalPages: number;
}

const ModalInforme: React.FC<{ 
  mantenimiento: Mantenimiento; 
  onClose: () => void 
}> = ({ mantenimiento, onClose }) => {
  const [emails, setEmails] = useState<string>("");
  const [autor, setAutor] = useState<string>("Andrés Flórez E.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const emailList = emails.split(",").map(email => email.trim()).filter(email => email);

      // Crear un objeto con solo los campos necesarios para evitar datos innecesarios
      const mantenimientoData = {
        id: mantenimiento.id,
        titulo: mantenimiento.titulo,
        basededatos: mantenimiento.basededatos,
        fecha: mantenimiento.fecha,
        created_at: mantenimiento.created_at,
        tamano_antes: mantenimiento.tamano_antes,
        tamano_despues: mantenimiento.tamano_despues,
        estado: mantenimiento.estado
      };

      console.log("Enviando datos para informe:", {
        mantenimientos: [mantenimientoData],
        cliente: mantenimiento.titulo,
        emails: emailList,
        autor,
        database: mantenimiento.basededatos,
        week: new Date().getWeek(),
        year: new Date().getFullYear(),
        initialSize: mantenimiento.tamano_antes,
        finalSize: mantenimiento.tamano_despues,
        fecha: mantenimiento.fecha,
        created_at: mantenimiento.created_at,
        vacuumDate: new Date(mantenimiento.fecha).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        vacuumTime: new Date(mantenimiento.fecha).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        analyzeDate: new Date(mantenimiento.created_at).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        analyzeTime: new Date(mantenimiento.created_at).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        })
      });

      const response = await axiosInstance.post('/reports/generate-report', {
        mantenimientos: [{
          ...mantenimientoData,
          // Separar fecha y hora para VACUUM
          fecha_vacuum: mantenimiento.fecha,
          hora_vacuum: new Date(mantenimiento.fecha).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          // Separar fecha y hora para ANALYZE
          fecha_analyze: mantenimiento.created_at,
          hora_analyze: new Date(mantenimiento.created_at).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }],
        cliente: mantenimiento.titulo,
        emails: emailList,
        autor,
        database: mantenimiento.basededatos,
        week: new Date().getWeek(),
        year: new Date().getFullYear(),
        initialSize: mantenimiento.tamano_antes,
        finalSize: mantenimiento.tamano_despues
      });

      setSuccess("Informe generado y enviado correctamente");
      console.log("Informe generado:", response.data);
    } catch (err: any) {
      console.error("Error al generar informe:", err);
      
      if (err.code === 'ECONNABORTED') {
        // El error es de timeout
        setSuccess("El informe probablemente se generó correctamente, pero la respuesta tardó demasiado. Por favor, verifica tu correo electrónico.");
        console.log("Se ha producido un timeout, pero el informe podría haberse generado correctamente. Por favor verifica el correo.");
      } else if (err.response) {
        console.error("Detalles del error:", err.response.data);
        setError(`Error: ${err.response.data.message || 'Error al generar el informe'}`);
      } else {
        setError("Error al generar el informe. Por favor intente nuevamente.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Generar Informe de Mantenimiento</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input 
                type="text" 
                value={mantenimiento.titulo} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base de Datos</label>
              <input 
                type="text" 
                value={mantenimiento.basededatos} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño Inicial</label>
              <input 
                type="text" 
                value={mantenimiento.tamano_antes} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño Final</label>
              <input 
                type="text" 
                value={mantenimiento.tamano_despues} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Correos electrónicos (separados por comas)</label>
            <input 
              type="text" 
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="ejemplo1@correo.com, ejemplo2@correo.com"
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Autor del informe</label>
            <input 
              type="text" 
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          {error && <div className="mb-4 text-red-500">{error}</div>}
          {success && <div className="mb-4 text-green-500">{success}</div>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGenerating ? "Generando..." : "Generar Informe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ListarMantenimientos: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
    const [pagina, setPagina] = useState<number>(1);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [filtroNombre, setFiltroNombre] = useState<string>("");
    const [filtroIP, setFiltroIP] = useState<string>("");
    const [conexionesPorPagina, setConexionesPorPagina] = useState<number>(15);
    const [selectedMantenimiento, setSelectedMantenimiento] = useState<Mantenimiento | null>(null);
    const [showInformeModal, setShowInformeModal] = useState(false);
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, id: number} | null>(null);
    const [reload, setReload] = useState(false);
    const [mostrarProgreso, setMostrarProgreso] = useState(false);
    const [mantenimientoEnProceso, setMantenimientoEnProceso] = useState<number | null>(null);
    const [cargando, setCargando] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [filtroFechaInicio, setFiltroFechaInicio] = useState<Date | null>(null);
    const [filtroFechaFin, setFiltroFechaFin] = useState<Date | null>(null);

    const cargarMantenimientos = async () => {
        setCargando(true);
        try {
          const response = await axiosInstance.get('/conexionesmantenimiento', {  
            params: { 
              page: pagina, 
              limit: conexionesPorPagina,
              titulo: filtroNombre,
              basededatos: filtroIP,
              estado: filtroEstado,
              fechaInicio: filtroFechaInicio ? filtroFechaInicio.toISOString().slice(0, 10) : undefined,
              fechaFin: filtroFechaFin ? filtroFechaFin.toISOString().slice(0, 10) : undefined
            }
          });
      
          if (response.data && Array.isArray(response.data.data)) {
            setMantenimientos(response.data.data);
            setPaginacion({
                pagina: response.data.pagination.page,
                totalPaginas: response.data.pagination.totalPages,
                totalRegistros: response.data.pagination.total
              });
          } else {
            console.error("⚠️ Estructura de respuesta inesperada del backend:", response.data);
            setMantenimientos([]);
          }
        } catch (error) {
          if (error instanceof AxiosError) {
            console.error("❌ Error de Axios:", error.message);
      
            if (error.response) {
              console.error("📌 Respuesta del servidor:", error.response.data);
              console.error("🛠 Estado HTTP:", error.response.status);
            } else if (error.request) {
              console.error("⚡ No hubo respuesta del servidor. Verifica la conexión.");
            } else {
              console.error("❗ Error al configurar la petición:", error.message);
            }
          } else {
            console.error("❓ Error desconocido:", error);
          }
      
          setMantenimientos([]);
        } finally {
          setCargando(false);
        }
    };  

    const [paginacion, setPaginacion] = useState({
        pagina: 1,
        totalPaginas: 1,
        totalRegistros: 0
    });

    const mantenimientosFiltrados = mantenimientos.filter((m) =>
        m.titulo.toLowerCase().includes(filtroNombre.toLowerCase()) &&
        m.basededatos.toLowerCase().includes(filtroIP.toLowerCase())
    );

    const limpiarFiltros = () => {
        setFiltroNombre("");
        setFiltroIP("");
        setFiltroEstado('todos');
        setFiltroFechaInicio(null);
        setFiltroFechaFin(null);
    };

    const actualizarManualmente = () => {
        toast.success("Actualizando listado...");
        setReload(prev => !prev);
    };

    const actualizarEstado = async (id: number, nuevoEstado: string) => {
        try {
            const response = await axiosInstance.put(`/mantenimiento/${id}`, { estado: nuevoEstado });
            if (nuevoEstado === "en_proceso") {
                // Mostrar el componente de progreso durante unos segundos y luego ocultarlo
                setMantenimientoEnProceso(id);
                setMostrarProgreso(true);
                toast.success("Mantenimiento iniciado en segundo plano");
                
                // Después de 5 segundos, ocultar el modal pero mantener el proceso
                setTimeout(() => {
                    setMostrarProgreso(false);
                    toast.success("El mantenimiento continúa en segundo plano. Puedes actualizar para ver el progreso.");
                }, 5000);
            }
            cargarMantenimientos();
            return response.data;
        } catch (error) {
            console.error("❌ Error al actualizar estado:", error);
            toast.error("Error al iniciar el mantenimiento");
            return null;
        }
    };

    const handleContextMenu = (e: React.MouseEvent, mantenimiento: Mantenimiento) => {
      e.preventDefault();
      
      // Solo mostrar el menú contextual si el estado es "completado" o "exitoso"
      if (mantenimiento.estado === "completado" || mantenimiento.estado === "exitoso") {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          id: mantenimiento.id
        });
      }
    };

    const handleCloseContextMenu = () => {
      setContextMenu(null);
    };

    const handleGenerateReport = (id: number) => {
      try {
        const mantenimiento = mantenimientos.find(m => m.id === id);
        if (mantenimiento) {
          console.log("Mantenimiento seleccionado para informe:", mantenimiento);
          setSelectedMantenimiento(mantenimiento);
          setShowInformeModal(true);
        } else {
          console.error("No se encontró el mantenimiento con ID:", id);
        }
      } catch (error) {
        console.error("Error al preparar el informe:", error);
      }
      setContextMenu(null);
    };

    const handleMantenimientoGuardado = () => {
        setReload(prev => !prev);
        toast.success("Mantenimiento registrado correctamente");
    };

    useEffect(() => {
        cargarMantenimientos();
    }, [pagina, conexionesPorPagina, reload]);

    // Agregar una clase para indicar cuáles filas tienen menú contextual
    const getRowClassName = (mantenimiento: Mantenimiento) => {
      const baseClass = "border-b border-gray-400 hover:bg-gray-300 transition-all";
      const hasContextMenu = mantenimiento.estado === "completado" || mantenimiento.estado === "exitoso";
      return hasContextMenu ? `${baseClass} cursor-context-menu` : baseClass;
    };

    // Estado para el sidebar de ayuda
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return (
        <div className="p-6">
            {/* ENCABEZADO CON BOTONES */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Mantenimientos Registrados</h1>
                <div className="flex gap-2">
                  {/* Botón de ayuda contextual */}
                  <button
                    onClick={() => setIsHelpOpen(true)}
                    className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 border border-indigo-200 shadow-sm"
                  >
                    <HelpCircle className="w-5 h-5" />
                    Ayuda
                  </button>
                </div>
            </div>

            {/* TOOLBAR DE FILTROS UI/UX MEJORADA */}
            <div className="flex flex-wrap gap-2 items-end bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
              <div className="flex items-center bg-gray-100 rounded-lg px-2 min-w-[180px]">
                <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input
                  type="text"
                  placeholder="Filtrar por título..."
                  value={filtroNombre}
                  onChange={e => setFiltroNombre(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 p-2 w-full"
                />
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg px-2 min-w-[180px]">
                <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <input
                  type="text"
                  placeholder="Filtrar por base de datos..."
                  value={filtroIP}
                  onChange={e => setFiltroIP(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 p-2 w-full"
                />
              </div>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="p-2 border rounded-md h-10"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="completado">Completado</option>
                <option value="exitoso">Exitoso</option>
                <option value="fallido">Fallido</option>
              </select>
              <DatePicker
                selected={filtroFechaInicio}
                onChange={date => setFiltroFechaInicio(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="Fecha inicio"
                className="p-2 border rounded-md h-10 min-w-[140px]"
              />
              <DatePicker
                selected={filtroFechaFin}
                onChange={date => setFiltroFechaFin(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="Fecha fin"
                className="p-2 border rounded-md h-10 min-w-[140px]"
              />
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 h-10"
              >
                Limpiar Filtros
              </button>
              <select
                value={conexionesPorPagina}
                onChange={e => setConexionesPorPagina(Number(e.target.value))}
                className="p-2 border rounded-md h-10"
              >
                <option value={15}>15 por página</option>
                <option value={20}>20 por página</option>
                <option value={30}>30 por página</option>
                <option value={70}>70 por página</option>
              </select>
              <button
                type="button"
                onClick={actualizarManualmente}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 h-10 disabled:opacity-50"
                disabled={cargando}
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${cargando ? 'animate-spin' : ''}`} />
                {cargando ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormulario(true)}
                className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 h-10"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Nuevo mantenimiento
              </button>
              <button 
                onClick={onBack} 
                className="flex items-center bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 h-10"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver
              </button>
            </div>

            <div className="mt-6 bg-white shadow rounded-lg p-4 overflow-x-auto">
                <h3 className="text-lg font-semibold mb-2">Lista de Mantenimientos</h3>
                {mantenimientosFiltrados.length === 0 ? (
                    <p className="text-gray-500">No hay mantenimientos guardados.</p>
                ) : (
                    <table className="w-full border border-gray-300 rounded-lg shadow-sm text-sm">
                        <thead>
                            <tr className="bg-indigo-600 text-white text-left">
                                <th className="border border-gray-300 px-4 py-2">Cliente</th>
                                <th className="border border-gray-300 px-4 py-2">Base de datos</th>
                                <th className="border border-gray-300 px-4 py-2">Descripción</th>
                                <th className="border border-gray-300 px-4 py-2">Fecha inicio</th>
                                <th className="border border-gray-300 px-4 py-2">Fecha final</th>
                                <th className="border border-gray-300 px-4 py-2">Estado</th>
                                <th className="border border-gray-300 px-4 py-2">Tamaño inicial</th>
                                <th className="border border-gray-300 px-4 py-2">Tamaño final</th>
                                <th className="border border-gray-300 px-4 py-2">Backup</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mantenimientosFiltrados.map((mantenimiento) => (
                                <tr 
                                  key={mantenimiento.id} 
                                  className={getRowClassName(mantenimiento)}
                                >
                                    <td className="px-4 py-3">{mantenimiento.titulo}</td>
                                    <td className="px-4 py-3">{mantenimiento.basededatos}</td>
                                    <td className="px-4 py-3">{mantenimiento.descripcion}</td>
                                    <td className="px-4 py-3">{mantenimiento.fecha}</td>
                                    <td className="px-4 py-3">{mantenimiento.created_at}</td>
                                    
                                    <td className="px-4 py-3 flex items-center gap-2">
                                        {mantenimiento.estado === "pendiente" && (
                                            <button
                                                onClick={() => actualizarEstado(mantenimiento.id, "en_proceso")}
                                                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center"
                                            >
                                                <Play className="w-4 h-4 mr-1" />
                                                Iniciar
                                            </button>
                                        )}
                                        {mantenimiento.estado === "en_proceso" && (
                                            <div className="flex items-center">
                                                <Disc3 className="animate-spin text-blue-500 mr-2" />
                                                <span className="text-blue-700">En proceso</span>
                                            </div>
                                        )}
                                        {mantenimiento.estado === "exitoso" && (
                                            <div className="flex items-center">
                                                <BadgeCheck className="text-green-500 mr-2" />
                                                <span className="text-green-700">Completado</span>
                                            </div>
                                        )}
                                        {mantenimiento.estado === "completado" && (
                                            <div className="flex items-center">
                                                <BadgeCheck className="text-green-500 mr-2" />
                                                <span className="text-green-700">Completado</span>
                                            </div>
                                        )}
                                        {mantenimiento.estado === "fallido" && (
                                            <div className="flex items-center">
                                                <XCircle className="text-red-500 mr-2" />
                                                <span className="text-red-700">Fallido</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{mantenimiento.tamano_antes}</td>
                                    <td className="px-4 py-3">{mantenimiento.tamano_despues}</td>
                                    <td className="px-4 py-3">
                                      {Number(mantenimiento.backup) === 1 && <FileArchive className="text-green-500" />}
                                      {Number(mantenimiento.backup) === 0 && <Link2Off className="text-red-500" />}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {(mantenimiento.estado === "completado" || mantenimiento.estado === "exitoso") && (
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            const btnRect = e.currentTarget.getBoundingClientRect();
                                            const menuWidth = 200; // Ancho estimado del menú
                                            const menuHeight = 80; // Alto estimado del menú
                                            const viewportWidth = window.innerWidth;
                                            const viewportHeight = window.innerHeight;
                                            let x = btnRect.left;
                                            let y = btnRect.bottom;
                                            if (x + menuWidth > viewportWidth) {
                                              x = viewportWidth - menuWidth - 10;
                                            }
                                            if (y + menuHeight > viewportHeight) {
                                              y = btnRect.top - menuHeight;
                                            }
                                            setContextMenu({ x, y, id: mantenimiento.id });
                                          }}
                                          className="p-2 rounded hover:bg-gray-200"
                                          title="Acciones"
                                        >
                                          <MoreVertical className="w-5 h-5" />
                                        </button>
                                      )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex justify-between items-center mt-4">
                <div>
                    <span className="text-sm text-gray-700">
                        Mostrando {(paginacion.pagina - 1) * conexionesPorPagina + 1}-
                        {Math.min(paginacion.pagina * conexionesPorPagina, paginacion.totalRegistros)}
                        de {paginacion.totalRegistros} registros
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPagina(p => Math.max(1, p - 1))}
                        disabled={paginacion.pagina === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="px-3 py-1">
                        Página {paginacion.pagina} de {paginacion.totalPaginas}
                    </span>
                    <button
                        onClick={() => setPagina(p => p + 1)}
                        disabled={paginacion.pagina >= paginacion.totalPaginas}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>

            {mostrarFormulario && (
                <CrearMantenimiento
                    onCancel={() => setMostrarFormulario(false)}
                    onGuardado={handleMantenimientoGuardado}
                />
            )}

            {contextMenu && (
              <div 
                className="fixed bg-white shadow-xl rounded-md py-2 z-50 w-48 border border-gray-200 animate-fadeIn"
                style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                onMouseLeave={handleCloseContextMenu}
              >
                <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider border-b pb-1 mb-1">
                  Acciones
                </div>
                <button 
                  onClick={() => handleGenerateReport(contextMenu.id)}
                  className="w-full text-left px-4 py-2 hover:bg-indigo-100 text-indigo-700 flex items-center"
                >
                  <FileArchive className="w-4 h-4 mr-2" />
                  Generar Informe
                </button>
              </div>
            )}

            {showInformeModal && selectedMantenimiento && (
              <ModalInforme 
                mantenimiento={selectedMantenimiento} 
                onClose={() => setShowInformeModal(false)}
              />
            )}

            {mostrarProgreso && mantenimientoEnProceso && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                  <h3 className="text-xl font-semibold mb-4">Iniciando Mantenimiento</h3>
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="h-4 rounded-full bg-blue-500 animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    El mantenimiento se está iniciando y continuará en segundo plano.
                    Puedes cerrar esta ventana y seguir trabajando.
                  </p>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setMostrarProgreso(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              </div>
            )}
        {/* Sidebar contextual de ayuda */}
        <MantenimientosInfoSidebar isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};

export default ListarMantenimientos;