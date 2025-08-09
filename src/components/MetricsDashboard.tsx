import React, { useEffect, useState } from "react";
import { 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Users, 
  RefreshCw,
  Filter,
} from "lucide-react";
import axiosInstance from "../utils/axios";
import "react-datepicker/dist/react-datepicker.css";
import config from "../config/config";

// Importar tipos
import { 
  MetricsDashboardProps, 
  Metricas, 
  ConexionesMetricas, 
  InformesMetricas,
} from "./dashboard/types";

// Importar componentes
import { MetricCard } from "./dashboard/cards/MetricCard";
import { ClienteCard } from "./dashboard/cards/ClienteCard";
import { LoadingState } from "./dashboard/states/LoadingState";
import { ErrorState } from "./dashboard/states/ErrorState";
import { FiltersPanel } from "./dashboard/filters/FiltersPanel";
import { TrendChart } from "./dashboard/charts/TrendChart";
import { DistributionChart } from "./dashboard/charts/DistributionChart";
import { BarChart as CustomBarChart } from "./dashboard/charts/BarChart";
import { LineChart as CustomLineChart } from "./dashboard/charts/LineChart";
import { PermissionDenied } from "./dashboard/states/PermissionDenied";

// Importar utilidades
import { 
  filterByDate, 
  filterMetricsByDate, 
  filterClientesByDate 
} from "./dashboard/utils/filters";

// Función para rellenar meses faltantes hasta el mes más reciente con datos
function fillMissingMonths(data: any[], months = 6) {
  if (!data || data.length === 0) return [];
  // Encontrar el mes más reciente en los datos
  const lastMes = data.reduce((max, d) => d.mes > max ? d.mes : max, data[0].mes);
  const [lastYear, lastMonth] = lastMes.split('-').map(Number);
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(lastYear, lastMonth - 1 - i, 1);
    const mes = date.toISOString().slice(0, 7); // 'YYYY-MM'
    const found = data.find(d => d.mes === mes);
    result.push({
      name: date.toLocaleString('es', { month: 'short' }),
      total: found ? found.total : 0,
      fecha: date,
      mes
    });
  }
  return result;
}

// Función para rellenar meses faltantes en un rango de fechas
function fillMissingMonthsRange(data: any[], start: Date, end: Date) {
  const result = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= last) {
    const mes = current.toISOString().slice(0, 7);
    const found = data.find(d => d.mes === mes);
    result.push({
      name: current.toLocaleString('es', { month: 'short' }),
      total: found ? found.total : 0,
      fecha: new Date(current),
      mes
    });
    current.setMonth(current.getMonth() + 1);
  }
  return result;
}

// Función para rellenar meses desde el primer mes con datos hasta el último, rellenando intermedios con 0
function fillMonthsFromFirstToLast(data: any[]) {
  if (!data || data.length === 0) return [];
  // Ordenar los datos por mes ascendente
  const sorted = [...data].sort((a, b) => a.mes.localeCompare(b.mes));
  const firstMes = sorted[0].mes;
  const lastMes = sorted[sorted.length - 1].mes;
  const [firstYear, firstMonth] = firstMes.split('-').map(Number);
  const [lastYear, lastMonth] = lastMes.split('-').map(Number);

  const result = [];
  let current = new Date(firstYear, firstMonth - 1, 1);
  const end = new Date(lastYear, lastMonth - 1, 1);

  while (current <= end) {
    const mes = current.toISOString().slice(0, 7);
    const found = data.find(d => d.mes === mes);
    result.push({
      name: current.toLocaleString('es', { month: 'short' }),
      total: found ? found.total : 0,
      fecha: new Date(current),
      mes
    });
    current.setMonth(current.getMonth() + 1);
  }
  return result;
}

// Utilidad para formatear el mes correctamente
const getPeriodo = (mesStr: string) => {
  if (!mesStr) return '';
  const [year, month] = mesStr.split('-');
  const mesNombre = new Date(Number(year), Number(month) - 1, 1).toLocaleString('es', { month: 'short' });
  return `en ${mesNombre} ${year}`;
};

// Componente principal del dashboard
const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ darkMode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string[] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para métricas
  const [metricas, setMetricas] = useState<Metricas>({
    total: 0,
    exitosos: 0,
    fallidos: 0,
    en_proceso: 0
  });

  const [conexiones, setConexiones] = useState<ConexionesMetricas>({
    total: 0,
    mysql: 0,
    postgresql: 0
  });

  const [informes, setInformes] = useState<InformesMetricas>({
    total: 0,
    porMes: [],
    porCliente: []
  });

  // Nuevo estado para mantenimientos por mes
  const [mantenimientosPorMes, setMantenimientosPorMes] = useState<any[]>([]);

  // Nuevo estado para top clientes de mantenimientos
  const [topClientesMantenimientos, setTopClientesMantenimientos] = useState<any[]>([]);
  // Nuevo estado para top clientes de informes
  const [topClientesInformes, setTopClientesInformes] = useState<any[]>([]);

  // Estados para filtros
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Estados para colores personalizados
  const [chartColors, setChartColors] = useState({
    tendencia: "#4F46E5",
    distribucion: ["#4F46E5", "#8B5CF6"],
    informes: "#10B981"
  });

  // Función para obtener métricas
  const obtenerMetricas = async (showRefreshing = true) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [mantenimientosRes, conexionesRes, informesRes, mantenimientosPorMesRes] = await Promise.all([
        axiosInstance.get(`${config.apiBaseUrl}:${config.apiPort}/api/mantenimientos/metricas`),
        axiosInstance.get(`${config.apiBaseUrl}:${config.apiPort}/api/conexiones/metricas`),
        axiosInstance.get(`${config.apiBaseUrl}:${config.apiPort}/api/informes/metricas`),
        axiosInstance.get(`${config.apiBaseUrl}:${config.apiPort}/api/mantenimientos/por-mes`)
      ]);

      setMetricas(mantenimientosRes.data);
      setConexiones(conexionesRes.data);
      setInformes(informesRes.data);
      setMantenimientosPorMes(mantenimientosPorMesRes.data);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error("❌ Error al obtener métricas:", error);
      if (error.response && error.response.status === 403) {
        // Extraer los módulos que fallaron (si es posible)
        const failedModules = [];
        if (error.response.config.url.includes('mantenimientos')) failedModules.push('Mantenimientos');
        if (error.response.config.url.includes('conexiones')) failedModules.push('Conexiones');
        if (error.response.config.url.includes('informes')) failedModules.push('Informes');
        
        setPermissionError(failedModules.length > 0 ? failedModules : ['Métricas Generales']);
        setError(null); // Limpiar el error genérico
      } else {
        setError("Error al cargar las métricas. Por favor, intente nuevamente.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Función para obtener el primer y último día del mes actual
  const setCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  // Efecto para cargar datos iniciales y configurar actualización periódica
  useEffect(() => {
    obtenerMetricas(false);
    // Cargar top clientes de mantenimientos
    axiosInstance.get('/mantenimientos/top-clientes')
      .then(res => setTopClientesMantenimientos(res.data))
      .catch(() => setTopClientesMantenimientos([]));
    // Cargar top clientes de informes
    axiosInstance.get('/informes/top-clientes')
      .then(res => setTopClientesInformes(res.data))
      .catch(() => setTopClientesInformes([]));
    setCurrentMonth(); // <-- Establecer mes actual al cargar
    const interval = setInterval(() => {
      obtenerMetricas(true);
      setCurrentMonth(); // <-- Establecer mes actual al actualizar
      // Actualizar top clientes
      axiosInstance.get('/mantenimientos/top-clientes')
        .then(res => setTopClientesMantenimientos(res.data))
        .catch(() => setTopClientesMantenimientos([]));
      axiosInstance.get('/informes/top-clientes')
        .then(res => setTopClientesInformes(res.data))
        .catch(() => setTopClientesInformes([]));
    }, 300000); // 5 minutos
    return () => clearInterval(interval);
  }, []);

  // Preparación de datos para gráficos con filtros aplicados
  // Para las gráficas de tendencia e informes por mes, usar todos los datos históricos (sin filtro de fecha)
  const allData = informes.porMes;
  const allClientes = informes.porCliente;
  const allMantenimientosPorMes = mantenimientosPorMes;

  // Para los Top Clientes, sí aplicar el filtro de mes actual
  const currentMonthStr = startDate ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}` : '';
  const filteredClientes = filterClientesByDate(informes.porCliente, startDate, endDate).filter(cliente => cliente.mes === currentMonthStr);
  const filteredTopClientesMantenimientos = topClientesMantenimientos.filter(cliente => cliente.mes === currentMonthStr);

  // Preparar datos de mantenimientos por mes para la gráfica de tendencia (histórico)
  let tendenciaMantenimientosData: any[] = [];
  if (allMantenimientosPorMes.length > 0) {
    tendenciaMantenimientosData = fillMonthsFromFirstToLast(allMantenimientosPorMes);
  }

  // Preparar datos para las gráficas de informes (histórico)
  let informesChartData: any[] = [];
  if (allData.length > 0) {
    informesChartData = fillMonthsFromFirstToLast(allData);
  }

  // Datos para el gráfico circular
  const totalConexiones = conexiones.mysql + conexiones.postgresql;
  const pieData = [
    {
      name: "MySQL",
      value: conexiones.mysql,
      porcentaje: totalConexiones > 0 ? Math.round((conexiones.mysql / totalConexiones) * 100) : 0,
      color: chartColors.distribucion[0]
    },
    {
      name: "PostgreSQL",
      value: conexiones.postgresql,
      porcentaje: totalConexiones > 0 ? Math.round((conexiones.postgresql / totalConexiones) * 100) : 0,
      color: chartColors.distribucion[1]
    }
  ];

  // Cálculo de porcentajes para tarjetas de métricas
  const porcentajeExitosos = metricas.total > 0 ? Math.round((metricas.exitosos / metricas.total) * 100) : 0;
  const porcentajeFallidos = metricas.total > 0 ? Math.round((metricas.fallidos / metricas.total) * 100) : 0;
  const porcentajeEnProceso = metricas.total > 0 ? Math.round((metricas.en_proceso / metricas.total) * 100) : 0;

  if (loading) {
    return <LoadingState darkMode={darkMode} />;
  }

  if (permissionError) {
    return <PermissionDenied modules={permissionError} darkMode={darkMode} />;
  }

  if (error) {
    return <ErrorState message={error} darkMode={darkMode} onRetry={() => obtenerMetricas(false)} />;
  }

  return (
    <div className={`space-y-6 p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}>
      {/* Cabecera del Dashboard con botón de filtros */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Métricas</h1>
          <p className="text-sm opacity-70">
            Última actualización: {lastUpdate.toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg ${
              darkMode 
                ? `${showFilters ? "bg-blue-600" : "bg-gray-700"} hover:bg-blue-700` 
                : `${showFilters ? "bg-blue-500" : "bg-white"} hover:bg-blue-600 ${showFilters ? "text-white" : ""}`
            } transition-colors duration-200`}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            {activeFilters.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                showFilters
                  ? "bg-white text-blue-600"
                  : "bg-blue-600 text-white"
              }`}>
                {activeFilters.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => obtenerMetricas(true)} 
            disabled={refreshing}
            className={`flex items-center px-4 py-2 rounded-lg ${
              darkMode 
                ? "bg-gray-700 hover:bg-gray-600" 
                : "bg-white hover:bg-gray-100"
            } transition-colors duration-200`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar datos"}
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <FiltersPanel
          darkMode={darkMode}
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          chartColors={chartColors}
          setChartColors={setChartColors}
          setShowFilters={setShowFilters}
        />
      )}

      {/* Primera fila - KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={BarChart3}
          title="Total Mantenimientos"
          value={metricas.total}
          color="primary"
          darkMode={darkMode}
        />
        <MetricCard
          icon={CheckCircle}
          title="Mantenimientos Exitosos"
          value={metricas.exitosos}
          subtitle={`${porcentajeExitosos}% del total`}
          color="success"
          darkMode={darkMode}
        />
        <MetricCard
          icon={XCircle}
          title="Mantenimientos Fallidos"
          value={metricas.fallidos}
          subtitle={`${porcentajeFallidos}% del total`}
          color="danger"
          darkMode={darkMode}
        />
        <MetricCard
          icon={Loader2}
          title="En Proceso"
          value={metricas.en_proceso}
          subtitle={`${porcentajeEnProceso}% del total`}
          color="warning"
          darkMode={darkMode}
          animate
        />
      </div>

      {/* Segunda fila - Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart
            data={tendenciaMantenimientosData}
            darkMode={darkMode}
            color={chartColors.tendencia}
            title="Tendencia de Mantenimientos"
            subtitle={startDate || endDate ? (
              `Filtrado: ${startDate ? startDate.toLocaleDateString('es', { month: 'long', year: 'numeric' }) : 'Inicio'} - ${endDate ? endDate.toLocaleDateString('es', { month: 'long', year: 'numeric' }) : 'Presente'}`
            ) : (
              `Últimos ${tendenciaMantenimientosData.length} meses`
            )}
          />
        </div>
        <DistributionChart
          data={pieData}
          darkMode={darkMode}
          title="Distribución de BD"
          subtitle={`Total: ${totalConexiones.toLocaleString()}`}
        />
      </div>

      {/* Tercera fila - Gráficos de informes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomBarChart
          data={informesChartData}
          darkMode={darkMode}
          color={chartColors.informes}
          title="Informes por Mes"
        />
        <CustomLineChart
          data={informesChartData}
          darkMode={darkMode}
          color={chartColors.informes}
          title="Tendencia de Informes"
        />
      </div>

      {/* Cuarta fila - Top Clientes */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Top Clientes (Informes)
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm opacity-70">
              Total Clientes: {topClientesInformes.length}
            </span>
            {activeFilters.includes('fecha') && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {startDate && endDate 
                  ? `${startDate.toLocaleString('es', { month: 'short' })} - ${endDate.toLocaleString('es', { month: 'short' })} ${endDate.getFullYear()}`
                  : startDate 
                    ? `${startDate.toLocaleString('es', { month: 'long' })} ${startDate.getFullYear()}`
                    : `Hasta ${endDate?.toLocaleString('es', { month: 'long' })} ${endDate?.getFullYear()}`
                }
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {topClientesInformes.length > 0 ? topClientesInformes.map((cliente, index) => (
            <ClienteCard 
              key={index} 
              cliente={cliente.cliente} 
              total={cliente.total} 
              index={index}
              darkMode={darkMode}
              periodo={getPeriodo(cliente.mes)}
              tipo="informes"
            />
          )) : (
            <div className={`col-span-full text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No hay informes de clientes para el período seleccionado
            </div>
          )}
        </div>
        {/* Nuevo bloque: Top Clientes por Mantenimientos */}
        <div className="flex justify-between items-center mb-6 mt-8">
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-500" />
            Top Clientes (Mantenimientos)
          </h3>
          <span className="text-sm opacity-70">
            Total Clientes: {topClientesMantenimientos.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {topClientesMantenimientos.length > 0 ? topClientesMantenimientos.map((cliente, index) => (
            <ClienteCard 
              key={index} 
              cliente={cliente.cliente} 
              total={cliente.total} 
              index={index}
              darkMode={darkMode}
              periodo={getPeriodo(cliente.mes)}
              tipo="mantenimientos"
            />
          )) : (
            <div className={`col-span-full text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No hay mantenimientos registrados para clientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;