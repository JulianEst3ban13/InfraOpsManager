import React, { useEffect, useState } from 'react';
import { 
  Server, 
  X, 
  Cpu, 
  Database, 
  HardDrive, 
  BarChart3, 
  FileText, 
  Loader2,
  Clock,
  Activity,
  RefreshCw,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import config from '../config/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ServerDetailProps {
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface MetricData {
  timestamp: string;
  cpu?: number;
  mem?: number;
  disk?: number;
  ping?: {
    status: 'ok' | 'fail';
    latency?: number;
  };
  apache?: {
    TotalAccesses?: number;
    TotalKBytes?: number;
    CPULoad?: number;
    Uptime?: number;
    ReqPerSec?: number;
    BytesPerSec?: number;
    BytesPerReq?: number;
    BusyWorkers?: number;
    IdleWorkers?: number;
  };
}

const ServerDetail: React.FC<ServerDetailProps> = ({ serverName, isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<{ 
    cpu?: number; 
    mem?: number; 
    disk?: number;
    ping?: {
      status: 'ok' | 'fail';
      latency?: number;
    };
    apache?: {
      TotalAccesses?: number;
      TotalKBytes?: number;
      CPULoad?: number;
      Uptime?: number;
      ReqPerSec?: number;
      BytesPerSec?: number;
      BytesPerReq?: number;
      BusyWorkers?: number;
      IdleWorkers?: number;
    };
  }>({});
  const [isMaximized, setIsMaximized] = useState(false);
  const [range, setRange] = useState<'1h' | '6h' | '24h' | 'custom'>('1h');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [userNow, setUserNow] = useState(dayjs());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (isOpen && serverName) {
      fetchMetrics();
    }
  }, [isOpen, serverName]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setUserNow(dayjs());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Actualizar la gráfica cuando cambie el estado de maximizado
  useEffect(() => {
    // Forzar re-render de la gráfica
    const chartData = prepareChartData();
    if (chartData) {
      // La gráfica se actualizará automáticamente
    }
  }, [isMaximized, metrics]);

  // Refresco automático cada 5 minutos si está activado
  useEffect(() => {
    if (!autoRefresh || !isOpen) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 300000); // 5 minutos
    return () => clearInterval(interval);
  }, [autoRefresh, isOpen, serverName, range, customFrom, customTo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  const getRangeDates = () => {
    function toLocalMySQLString(date: Date): string {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    const now = new Date(); // hora local exacta del usuario usando Date nativo
    let from: Date;
    if (range === '1h') from = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    else if (range === '6h') from = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    else if (range === '24h') from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (range === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    } else from = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    return {
      from: toLocalMySQLString(from),
      to: toLocalMySQLString(now) // siempre la hora actual exacta
    };
  };

  const prepareChartData = () => {
    if (metrics.length === 0) return null;

    // Ordenar métricas por timestamp
    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Tomar más puntos cuando está maximizado
    const maxPoints = isMaximized ? 100 : 50;
    const recentMetrics = sortedMetrics.slice(-maxPoints);

    const labels = recentMetrics.map(m => 
      new Date(m.timestamp).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    );

    const cpuData = recentMetrics.map(m => m.cpu || null);
    const memData = recentMetrics.map(m => m.mem || null);
    const diskData = recentMetrics.map(m => m.disk || null);

    return {
      labels,
      datasets: [
        {
          label: 'CPU (%)',
          data: cpuData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: isMaximized ? 2 : 1,
          pointHoverRadius: isMaximized ? 5 : 4,
        },
        {
          label: 'RAM (%)',
          data: memData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: isMaximized ? 2 : 1,
          pointHoverRadius: isMaximized ? 5 : 4,
        },
        {
          label: 'Disco (%)',
          data: diskData,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: isMaximized ? 2 : 1,
          pointHoverRadius: isMaximized ? 5 : 4,
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: isMaximized ? 14 : 12
          }
        }
      },
      title: {
        display: true,
        text: 'Evolución Temporal de Métricas',
        font: {
          size: isMaximized ? 18 : 16,
          weight: 700
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value !== null ? value.toFixed(1) + '%' : 'N/A'}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Hora',
          font: {
            size: isMaximized ? 14 : 12
          }
        },
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: isMaximized ? 20 : 10,
          font: {
            size: isMaximized ? 12 : 10
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Porcentaje (%)',
          font: {
            size: isMaximized ? 14 : 12
          }
        },
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: isMaximized ? 12 : 10
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    elements: {
      point: {
        radius: isMaximized ? 3 : 2,
        hoverRadius: isMaximized ? 6 : 5,
      }
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { from, to } = getRangeDates();
      
      // console.log('Fetching metrics for:', serverName, 'from:', from, 'to:', to);
      
      const res = await fetch(`${config.apiUrl}/api/aws-apm/metrics?server=${encodeURIComponent(serverName)}&from=${from}&to=${to}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      // console.log('Raw metrics data:', data);
      
      const processedData: MetricData[] = [];
      const current: { 
        cpu?: number; 
        mem?: number; 
        disk?: number;
        ping?: {
          status: 'ok' | 'fail';
          latency?: number;
        };
        apache?: {
          TotalAccesses?: number;
          TotalKBytes?: number;
          CPULoad?: number;
          Uptime?: number;
          ReqPerSec?: number;
          BytesPerSec?: number;
          BytesPerReq?: number;
          BusyWorkers?: number;
          IdleWorkers?: number;
        };
      } = {};
      
      data.forEach((row: any) => {
        const timestamp = row.timestamp;
        
        // Parsear metric_data si es string, o usar directamente si es objeto
        let metricData;
        try {
          metricData = typeof row.metric_data === 'string' 
            ? JSON.parse(row.metric_data) 
            : row.metric_data;
        } catch (e) {
          console.warn('Error parsing metric_data for', serverName, row.metric_type, e);
          return;
        }
        
        let existing = processedData.find(d => d.timestamp === timestamp);
        if (!existing) {
          existing = { timestamp };
          processedData.push(existing);
        }
        
        if (row.metric_type === 'cpu') {
          if (typeof metricData.usage_active === 'number') {
            existing.cpu = metricData.usage_active;
          } else if (typeof metricData.usage_idle === 'number') {
            existing.cpu = 100 - metricData.usage_idle;
          }
        }
        if (row.metric_type === 'mem' && typeof metricData.used_percent === 'number') {
          existing.mem = metricData.used_percent;
        }
        // Para disco, guarda el máximo used_percent por timestamp
        if (row.metric_type === 'disk' && typeof metricData.used_percent === 'number') {
          if (existing.disk === undefined || metricData.used_percent > existing.disk) {
            existing.disk = metricData.used_percent;
          }
        }
        // Procesar métricas de Apache
        if (row.metric_type === 'apache') {
          existing.apache = {
            TotalAccesses: metricData.TotalAccesses,
            TotalKBytes: metricData.TotalKBytes,
            CPULoad: metricData.CPULoad,
            Uptime: metricData.Uptime,
            ReqPerSec: metricData.ReqPerSec,
            BytesPerSec: metricData.BytesPerSec,
            BytesPerReq: metricData.BytesPerReq,
            BusyWorkers: metricData.BusyWorkers,
            IdleWorkers: metricData.IdleWorkers
          };
        }
        // Procesar métricas de ping
        if (row.metric_type === 'ping') {
          existing.ping = {
            status: metricData.result_code === 0 ? 'ok' : 'fail',
            latency: metricData.average_response_ms
          };
        }
      });
      
      processedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setMetrics(processedData);
      // Al finalizar el procesamiento, busca el valor más reciente de CPU
      const cpuRows = data
        .filter((row: any) => row.metric_type === 'cpu')
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      let cpuValue: number | undefined = undefined;
      let cpuTimestamp: string | undefined = undefined;
      for (const row of cpuRows) {
        let metricData;
        try {
          metricData = typeof row.metric_data === 'string'
            ? JSON.parse(row.metric_data)
            : row.metric_data;
          if (typeof metricData.usage_active === 'number') {
            cpuValue = metricData.usage_active;
            cpuTimestamp = row.timestamp;
            break;
          }
          if (typeof metricData.usage_idle === 'number') {
            cpuValue = 100 - metricData.usage_idle;
            cpuTimestamp = row.timestamp;
            break;
          }
        } catch (e) {}
      }
      if (cpuValue !== undefined) {
        current.cpu = cpuValue;
        // console.log('CPU mostrado en detalle:', cpuValue, 'timestamp:', cpuTimestamp);
      }

      // Al finalizar el procesamiento, asigna el valor de RAM del registro más reciente
      if (processedData.length > 0) {
        processedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const latest = processedData[0];
        if (typeof latest.disk === 'number') {
          current.disk = latest.disk;
          // console.log('Disco mostrado en detalle (final):', latest.disk, 'timestamp:', latest.timestamp);
        }
        if (typeof latest.mem === 'number') {
          current.mem = latest.mem;
          // console.log('RAM mostrada en detalle (final):', latest.mem, 'timestamp:', latest.timestamp);
        }
        if (typeof latest.apache === 'object' && latest.apache !== null && Object.keys(latest.apache).length > 0) {
          current.apache = latest.apache;
          // console.log('currentMetrics.apache', current.apache);
        } else {
          current.apache = undefined;
          // console.log('currentMetrics.apache está vacío o no existe');
        }
        if (latest.ping) {
          current.ping = latest.ping;
          // console.log('Ping mostrado en detalle (final):', latest.ping, 'timestamp:', latest.timestamp);
        }
      }
      setCurrentMetrics(current);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setMetrics([]);
      setCurrentMetrics({});
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const chartData = prepareChartData();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isMaximized 
          ? 'w-full h-full max-w-none max-h-none' 
          : 'w-full max-w-6xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-4">
                {serverName}
                <span className="text-xs font-normal bg-white bg-opacity-20 rounded px-2 py-1 ml-2">
                  Hora actual: {userNow.format('DD/MM/YYYY, h:mm:ss a')}
                </span>
              </h2>
              <p className="text-blue-100 text-sm">Detalles del servidor</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all duration-200 disabled:opacity-50"
              title="Actualizar métricas"
            >
              <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${autoRefresh ? 'bg-green-500' : 'bg-white bg-opacity-20 hover:bg-opacity-30'}`}
              title={autoRefresh ? 'Desactivar refresco automático' : 'Activar refresco automático'}
            >
              {autoRefresh ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
              title={isMaximized ? "Minimizar" : "Maximizar"}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`overflow-y-auto transition-all duration-300 ${
          isMaximized 
            ? 'h-[calc(100vh-80px)]' 
            : 'max-h-[calc(90vh-80px)]'
        }`}>
          <div className="p-6">
            {/* Selector de rango de tiempo */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <label className="font-semibold text-gray-700 dark:text-slate-200">Rango de tiempo:</label>
              <select
                value={range}
                onChange={e => setRange(e.target.value as any)}
                className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="1h">Última hora</option>
                <option value="6h">Últimas 3 horas</option>
                <option value="6h">Últimas 6 horas</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="custom">Personalizado</option>
              </select>
              {range === 'custom' && (
                <>
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                  <span className="mx-2">a</span>
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={fetchMetrics}
                    className="ml-2 px-3 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  >Aplicar</button>
                </>
              )}
              {range !== 'custom' && (
                <button
                  onClick={fetchMetrics}
                  className="ml-2 px-3 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >Aplicar</button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full mb-4">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <p className="text-gray-600 dark:text-slate-400 font-medium">Cargando métricas...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Current Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="CPU"
                    value={currentMetrics.cpu}
                    gradient="from-blue-500 to-blue-600"
                    icon={Cpu}
                    unit="%"
                  />
                  <MetricCard
                    title="Memoria"
                    value={currentMetrics.mem}
                    gradient="from-emerald-500 to-emerald-600"
                    icon={Database}
                    unit="%"
                  />
                  <MetricCard
                    title="Disco"
                    value={currentMetrics.disk}
                    gradient="from-purple-500 to-purple-600"
                    icon={HardDrive}
                    unit="%"
                  />
                  <PingCard
                    ping={currentMetrics.ping}
                  />
                </div>

                {/* Apache Metrics */}
                {currentMetrics.apache && Object.keys(currentMetrics.apache).length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Métricas de Apache</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {currentMetrics.apache.CPULoad ? `${(currentMetrics.apache.CPULoad * 100).toFixed(1)}%` : '--'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-400">CPU Load</div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {currentMetrics.apache.ReqPerSec ? currentMetrics.apache.ReqPerSec.toFixed(2) : '--'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-400">Req/Sec</div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {currentMetrics.apache.BusyWorkers ? currentMetrics.apache.BusyWorkers : '--'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-400">Busy Workers</div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {currentMetrics.apache.TotalAccesses ? currentMetrics.apache.TotalAccesses.toLocaleString() : '--'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-400">Total Accesses</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Information */}
                <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Estado del Servidor</h3>
                  </div>
                  {/* Advertencia si la última actualización está desfasada */}
                  {metrics.length > 0 && Math.abs((new Date().getTime() - new Date(metrics[0].timestamp).getTime()) / (1000 * 60)) > 2 && (
                    <div className="mb-4 p-3 rounded bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                      <strong>Advertencia:</strong> Los datos no están actualizados en tiempo real. Última actualización hace más de 2 minutos.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Métricas disponibles:</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {metrics.length} registros
                        </span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Última actualización:</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {metrics.length > 0 
                            ? new Date(metrics[0].timestamp).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })
                            : 'Sin datos'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Charts */}
                {chartData ? (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Métricas</h3>
                    </div>
                    <div className={`${isMaximized ? 'h-96' : 'h-80'}`}>
                      <Line data={chartData} options={chartOptions} />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Métricas</h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-slate-400 mb-2">No hay datos suficientes para mostrar gráficas</p>
                      <p className="text-sm text-gray-500 dark:text-slate-500">
                        Se necesitan al menos 2 puntos de datos para generar gráficas
                      </p>
                    </div>
                  </div>
                )}

                {/* Recent Data Table */}
                {metrics.length > 0 ? (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Datos Recientes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-600">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>Timestamp</span>
                              </div>
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                              <div className="flex items-center space-x-2">
                                <Cpu className="w-4 h-4" />
                                <span>CPU (%)</span>
                              </div>
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                              <div className="flex items-center space-x-2">
                                <Database className="w-4 h-4" />
                                <span>RAM (%)</span>
                              </div>
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                              <div className="flex items-center space-x-2">
                                <HardDrive className="w-4 h-4" />
                                <span>Disco (%)</span>
                              </div>
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                              <div className="flex items-center space-x-2">
                                <Wifi className="w-4 h-4" />
                                <span>Ping</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.slice(0, 10).map((metric, index) => (
                            <tr key={index} className="border-b border-gray-100 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-150">
                              <td className="py-3 px-4 text-gray-600 dark:text-slate-400">
                                {new Date(metric.timestamp).toLocaleString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {metric.cpu !== undefined ? `${metric.cpu.toFixed(1)}%` : '--'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {metric.mem !== undefined ? `${metric.mem.toFixed(1)}%` : '--'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {metric.disk !== undefined ? `${metric.disk.toFixed(1)}%` : '--'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  {metric.ping ? (
                                    <>
                                      {metric.ping.status === 'ok' ? (
                                        <Wifi className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <WifiOff className="w-4 h-4 text-red-500" />
                                      )}
                                      <span className={`font-medium ${
                                        metric.ping.status === 'ok' 
                                          ? 'text-green-600 dark:text-green-400' 
                                          : 'text-red-600 dark:text-red-400'
                                      }`}>
                                        {metric.ping.status === 'ok' ? (
                                          metric.ping.latency !== undefined 
                                            ? `${metric.ping.latency.toFixed(1)}ms` 
                                            : 'OK'
                                        ) : (
                                          'FAIL'
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-medium text-gray-500 dark:text-slate-400">--</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Datos Recientes</h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-slate-400 mb-2">No hay datos disponibles</p>
                      <p className="text-sm text-gray-500 dark:text-slate-500">
                        No se encontraron métricas para este servidor en la última hora
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value?: number;
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
  unit: string;
}> = ({ title, value, gradient, icon: Icon, unit }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
    <div className="flex items-center space-x-3 mb-4">
      <div className={`w-10 h-10 bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-slate-400">Uso actual</p>
      </div>
    </div>
    <div className="space-y-3">
      <div className="text-center">
        <div className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${gradient}`}>
          {value !== undefined ? `${value.toFixed(1)}${unit}` : '--'}
        </div>
      </div>
      {value !== undefined && (
        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out shadow-sm`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      )}
    </div>
  </div>
);

const PingCard: React.FC<{
  ping?: {
    status: 'ok' | 'fail';
    latency?: number;
  };
}> = ({ ping }) => {
  const isOnline = ping?.status === 'ok';
  const latency = ping?.latency;
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
          isOnline 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          {isOnline ? (
            <Wifi className="w-5 h-5 text-white" />
          ) : (
            <WifiOff className="w-5 h-5 text-white" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">Ping</h4>
          <p className="text-sm text-gray-500 dark:text-slate-400">Conectividad</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="text-center">
          <div className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
            isOnline 
              ? 'from-green-500 to-green-600' 
              : 'from-red-500 to-red-600'
          }`}>
            {ping ? (
              isOnline ? (
                latency !== undefined ? `${latency.toFixed(1)}ms` : 'OK'
              ) : (
                'FAIL'
              )
            ) : (
              '--'
            )}
          </div>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-700 ease-out shadow-sm ${
              isOnline 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600'
            } ${!ping ? 'opacity-50' : ''}`}
            style={{ 
              width: ping ? (isOnline ? '100%' : '0%') : '0%'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ServerDetail; 