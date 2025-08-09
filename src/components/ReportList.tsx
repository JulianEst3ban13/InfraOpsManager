import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from "../utils/axios";
import ReportForm from "./ReportForm";
import { PlusCircle, RefreshCw, Trash2, Search, Mail, User, FileText, CheckCircle, XCircle, Loader2, HelpCircle } from "lucide-react";
import config from "../config/config";
import { toast } from "react-hot-toast";
import { PermissionGuard } from "./PermissionGuard";
import ReportListInfoSidebar from './ReportListInfoSidebar';

type Report = {
  id: number;
  cliente: string;
  fecha_envio: string;
  emails: string;
  ruta_pdf: string;
};

const ReportList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true); // loading global solo para el primer render
  const [actualizando, setActualizando] = useState(false); // loading solo para el botón de actualizar
  const [error, setError] = useState<string | null>(null);
  const [searchCliente, setSearchCliente] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [reload, setReload] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  // Declarar filteredReports antes de su uso
  const filteredReports = reports.filter(
    (r) =>
      r.cliente.toLowerCase().includes(searchCliente.toLowerCase()) &&
      r.emails.toLowerCase().includes(searchEmail.toLowerCase())
  );
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // función para obtener informes (usada en el primer render y en actualizar)
  const obtenerInformes = useCallback(async () => {
    try {
      setActualizando(true);
      const response = await axiosInstance.get('/reports');
      setDebugInfo(prev => `${prev}\nRespuesta recibida: ${JSON.stringify(response.data).substring(0, 100)}...`);
      if (Array.isArray(response.data)) {
        setReports(response.data);
        setDebugInfo(prev => `${prev}\nDatos cargados: ${response.data.length} registros encontrados.`);
      } else {
        setError("Formato de datos inválido. Se esperaba un array.");
        setDebugInfo(prev => `${prev}\nError de formato: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
    } catch (error: any) {
      const errorMsg = error.response 
        ? `Error ${error.response.status}: ${error.response.statusText}` 
        : "Error de conexión al servidor";
      
      setError(`Error al cargar los informes: ${errorMsg}`);
      setDebugInfo(prev => `${prev}\nError: ${error.message}`);
    } finally {
      setLoading(false);
      setActualizando(false);
    }
  }, []); // useCallback para evitar re-creaciones innecesarias

  useEffect(() => {
    obtenerInformes();
  }, []); // useEffect solo se ejecuta una vez

  useEffect(() => {
    setCurrentPage(1);
  }, [searchCliente, searchEmail, itemsPerPage]);

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este informe?')) {
      try {
        await axiosInstance.delete(`/reports/${id}`);
        toast.success('Informe eliminado correctamente');
        setReload(prev => !prev);
      } catch (error) {
        toast.error('Error al eliminar el informe');
      }
    }
  };

  // Función para descargar el PDF con autenticación
  const descargarPDF = async (rutaPdf: string, clienteName: string) => {
    try {
      // Extraer el nombre del archivo PDF de la ruta
      const nombreArchivo = rutaPdf.split('/').pop();
      
      if (!nombreArchivo) {
        toast.error("La ruta del PDF es inválida");
        return;
      }
      
      toast.loading("Descargando PDF...", { id: "pdf-download" });
      
      // Ruta absoluta en el servidor donde se almacenan los PDFs
      const rutaAbsoluta = `/var/www/mantenimiento/informes/${nombreArchivo}`;
      
      // Creamos una petición especial al backend para obtener el archivo
      // Esta ruta debe ser implementada en el backend
      const url = `${config.apiUrl}/api/download-pdf?path=${encodeURIComponent(rutaAbsoluta)}`;
      
      console.log("Intentando acceder al PDF en:", url);
      
      // Realizar petición al endpoint especial del servidor
      const response = await axiosInstance.get(url, {
        responseType: 'blob'
      });
      
      // Crear una URL para el blob
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      
      // Cerrar notificación de carga
      toast.dismiss("pdf-download");
      
      // Mostrar notificación de éxito
      toast.success("PDF descargado correctamente");
      
      // Abrir en nueva ventana
      window.open(pdfUrl, '_blank');
    } catch (error: any) {
      console.error('Error al descargar el PDF:', error);
      toast.dismiss("pdf-download");
      toast.error(`Error al descargar el PDF: ${error.message || 'Intente nuevamente'}`);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <span className="text-lg text-gray-600">Cargando informes...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="mt-4 text-center">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-semibold">{error}</p>
          <details className="mt-2 p-2 bg-gray-100 rounded">
            <summary className="cursor-pointer text-sm font-medium">Información de depuración</summary>
            <pre className="mt-2 p-2 bg-gray-200 text-xs overflow-auto">{debugInfo}</pre>
          </details>
        </div>
      );
    }

    if (filteredReports.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-gray-600 text-lg">No se encontraron informes que coincidan con los criterios.</p>
          <p className="text-sm mt-2 text-gray-400">
            {reports.length > 0 
              ? `Hay ${reports.length} informes en total pero ninguno coincide con los filtros actuales.` 
              : "No se encontraron informes en la base de datos."}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-auto mt-4 rounded-lg shadow bg-white">
        <div className="text-sm mb-2 px-4 pt-4">
          Mostrando {paginatedReports.length} de {filteredReports.length} informes filtrados (Total: {reports.length})
        </div>
        <table className="w-full min-w-max border border-gray-200 rounded-lg text-base">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="px-6 py-4 font-semibold"><User className="inline w-4 h-4 mr-1" />Cliente</th>
              <th className="px-6 py-4 font-semibold"><CalendarIcon className="inline w-4 h-4 mr-1" />Fecha</th>
              <th className="px-6 py-4 font-semibold"><Mail className="inline w-4 h-4 mr-1" />Correos</th>
              <th className="px-6 py-4 font-semibold"><FileText className="inline w-4 h-4 mr-1" />PDF</th>
              <th className="px-6 py-4 font-semibold text-center">Estado</th>
              <th className="px-6 py-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReports.map((report, idx) => (
              <tr key={report.id} className={idx % 2 === 0 ? "bg-gray-50 hover:bg-indigo-50" : "bg-white hover:bg-indigo-50"}>
                <td className="px-6 py-4 text-gray-700">{report.cliente}</td>
                <td className="px-6 py-4 text-gray-700">{new Date(report.fecha_envio).toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-700">{report.emails}</td>
                <td className="px-6 py-4">
                  <PermissionGuard permission="descargar_informe">
                    <button
                      onClick={() => descargarPDF(report.ruta_pdf, report.cliente)}
                      className="text-blue-600 hover:text-blue-800 transition duration-200 flex items-center"
                      title="Ver PDF"
                    >
                      <span className="mr-1">📄</span> Ver PDF
                    </button>
                  </PermissionGuard>
                </td>
                <td className="px-6 py-4 text-center">
                  <CheckCircle className="w-5 h-5 text-green-500 inline" aria-label="Enviado" />
                </td>
                <td className="px-6 py-4 text-center">
                  <PermissionGuard permission="eliminar_informe">
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar informe"
                    >
                      <Trash2 size={16} />
                    </button>
                  </PermissionGuard>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-2 p-4">
            <button
              className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <span className="text-sm">Página {currentPage} de {totalPages}</span>
            <button
              className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-10 rounded-lg shadow-md w-full mx-auto mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <FileText className="w-8 h-8 text-indigo-600" /> Informes Registrados
        </h2>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 border border-indigo-200 shadow-sm"
        >
          <HelpCircle className="w-5 h-5" />
          Ayuda
        </button>
      </div>
      {/* TOOLBAR DE FILTROS UNIFICADA */}
      <div className="flex flex-wrap gap-2 mt-4 items-end bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
        <div className="flex items-center bg-gray-100 rounded-lg px-2 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 mr-1" />
          <input
            type="text"
            placeholder="Filtrar por cliente..."
            value={searchCliente}
            onChange={(e) => setSearchCliente(e.target.value)}
            className="bg-transparent border-none focus:ring-0 p-2 w-full"
          />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg px-2 min-w-[180px]">
          <Mail className="w-4 h-4 text-gray-400 mr-1" />
          <input
            type="text"
            placeholder="Filtrar por correo..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="bg-transparent border-none focus:ring-0 p-2 w-full"
          />
        </div>
        <button
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 h-10"
          onClick={() => {
            setSearchCliente("");
            setSearchEmail("");
          }}
          title="Limpiar filtros"
        >
          Limpiar Filtros
        </button>
        <select
          className="p-2 border rounded-md h-10"
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
        >
          <option value={5}>5 por página</option>
          <option value={10}>10 por página</option>
          <option value={20}>20 por página</option>
          <option value={50}>50 por página</option>
        </select>
        <button
          onClick={obtenerInformes}
          className="flex items-center bg-green-600 text-white text-sm px-3 py-2 rounded hover:bg-green-700 transition duration-200 ease-in-out h-10 disabled:opacity-50"
          title="Actualizar"
          disabled={actualizando}
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${actualizando ? 'animate-spin' : ''}`} />
          {actualizando ? 'Actualizando...' : 'Actualizar'}
        </button>
        {/* <PermissionGuard permission="crear_informe">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 h-10 shadow"
            title="Nuevo informe"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Nuevo informe
          </button>
        </PermissionGuard> */}
      </div>
      {renderContent()}
      <ReportListInfoSidebar isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
              title="Cerrar"
            >
              ×
            </button>
            <ReportForm
              onClose={() => setShowModal(false)}
              onReportCreated={() => {
                setDebugInfo("Informe creado, recargando datos...");
                setReload((prev) => !prev);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Icono de calendario para la tabla
function CalendarIcon(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}

export default ReportList;