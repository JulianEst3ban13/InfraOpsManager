import React, { useEffect, useState } from 'react';
import { 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  Database, 
  HardDrive, 
  Loader2,
  ChevronRight,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import config from '../config/config';

// importación centralizada de ServerStatus
import { ServerStatus } from '../types';



interface ServerCardProps {
  serverName: string;
  serverStatus?: ServerStatus;
  onClick?: () => void;
}

interface MetricSummary {
  cpu?: number;
  mem?: number;
  disk?: number;
  ping?: {
    status: 'ok' | 'fail';
    latency?: number;
  };
  status: 'online' | 'warning' | 'offline';
  lastUpdate?: Date;
}

const ServerCard: React.FC<ServerCardProps> = ({ serverName, serverStatus, onClick }) => {
  const [metrics, setMetrics] = useState<MetricSummary>({ status: 'offline' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        function toLocalMySQLString(date: Date): string {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        const now = new Date();
        // Buscar métricas de la última hora usando hora local real
        const from = toLocalMySQLString(new Date(now.getTime() - 1 * 60 * 60 * 1000));
        const to = toLocalMySQLString(now);
        // console.log('Consulta resumen (local real):', serverName, 'from:', from, 'to:', to);
        
        const res = await fetch(`${config.apiUrl}/api/aws-apm/metrics?server=${encodeURIComponent(serverName)}&from=${from}&to=${to}`);
        const data = await res.json();
        
        // Log de depuración para ver los datos recibidos
        // console.log('Datos recibidos para', serverName, data);

        // Nueva función robusta para obtener la última métrica válida de cada tipo
        function getLastValidMetricOfType(data: any[], type: string, field: string) {
          const filtered = data
            .filter((row) => row.metric_type === type)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          for (const row of filtered) {
            let metricData;
            try {
              metricData = typeof row.metric_data === 'string'
                ? JSON.parse(row.metric_data)
                : row.metric_data;
              if (typeof metricData[field] === 'number') {
                return { value: metricData[field], timestamp: row.timestamp };
              }
              // Si no existe usage_active, calcula 100 - usage_idle
              if (field === 'usage_active' && typeof metricData['usage_idle'] === 'number') {
                return { value: 100 - metricData['usage_idle'], timestamp: row.timestamp };
              }
            } catch (e) {}
          }
          return undefined;
        }

        let cpu, mem, disk, ping;
        let lastUpdate: Date | undefined;

        if (data.length > 0) {
          const lastCpu = getLastValidMetricOfType(data, 'cpu', 'usage_active');
          if (lastCpu) {
            // console.log('CPU mostrado en resumen:', lastCpu.value, 'timestamp:', lastCpu.timestamp);
          }
          const lastMem = getLastValidMetricOfType(data, 'mem', 'used_percent');
          const lastDisk = getLastValidMetricOfType(data, 'disk', 'used_percent');
          
          // Procesar métricas de ping
          const lastPing = getLastValidMetricOfType(data, 'ping', 'result_code');
          if (lastPing) {
            const pingData = data
              .filter((row: any) => row.metric_type === 'ping')
              .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            
            if (pingData) {
              try {
                const metricData = typeof pingData.metric_data === 'string' 
                  ? JSON.parse(pingData.metric_data) 
                  : pingData.metric_data;
                
                ping = {
                  status: metricData.result_code === 0 ? 'ok' as const : 'fail' as const,
                  latency: typeof metricData.average_response_ms === 'number' ? metricData.average_response_ms : undefined
                };
              } catch (e) {
                console.warn('Error parsing ping data:', e);
              }
            }
          }

          cpu = lastCpu ? lastCpu.value : undefined;
          mem = lastMem ? lastMem.value : undefined;
          disk = lastDisk ? lastDisk.value : undefined;
          lastUpdate = lastCpu?.timestamp || lastMem?.timestamp || lastDisk?.timestamp || lastPing?.timestamp;
        }

        // Usar el estado del servidor desde serverStatus si está disponible
        const status = serverStatus ? serverStatus.status : 'offline';
        setMetrics({ cpu, mem, disk, ping, status, lastUpdate });
      } catch (err) {
        // console.error('Error fetching metrics for', serverName, err);
        const status = serverStatus ? serverStatus.status : 'offline';
        setMetrics({ status });
      }
      setLoading(false);
    }
    fetchSummary();     
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, [serverName, serverStatus]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'online':
        return {
          gradient: 'from-emerald-500 to-emerald-600',
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          textColor: 'text-emerald-700 dark:text-emerald-400',
          icon: CheckCircle,
          label: 'ONLINE'
        };
      case 'warning':
        return {
          gradient: 'from-amber-500 to-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          textColor: 'text-amber-700 dark:text-amber-400',
          icon: AlertTriangle,
          label: 'WARNING'
        };
      case 'offline':
        return {
          gradient: 'from-red-500 to-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-700 dark:text-red-400',
          icon: XCircle,
          label: 'OFFLINE'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-400',
          icon: Activity,
          label: 'UNKNOWN'
        };
    }
  };

  const statusConfig = getStatusConfig(metrics.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-slate-700 shadow-lg group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{serverName}</h3>
              <span
                className={`ml-3 px-2 py-0.5 rounded-full text-xs font-semibold shadow ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}
                style={{ verticalAlign: 'middle' }}
              >
                <span className="flex items-center space-x-1">
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{statusConfig.label}</span>
                </span>
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Servidor</p>
            {serverStatus && (
              <div className="text-xs text-gray-400 dark:text-slate-500 space-y-1">
                <p>Última métrica: {new Date(serverStatus.lastMetric).toLocaleString()}</p>
                <p>Hace {serverStatus.minutesSinceLastMetric} minutos</p>
                <p>Total métricas: {serverStatus.totalMetrics}</p>
                <div className="flex space-x-2 mt-2">
                  {serverStatus.hasCpu && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      CPU
                    </span>
                  )}
                  {serverStatus.hasMem && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                      RAM
                    </span>
                  )}
                  {serverStatus.hasDisk && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                      Disco
                    </span>
                  )}
                  {serverStatus.hasApache && (
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
                      Apache
                    </span>
                  )}
                  {serverStatus.hasPing && (
                    <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded text-xs">
                      Ping
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Elimina el div flotante del badge aquí */}
      </div>

      {/* Métricas */}
      <div className="space-y-5">
        <MetricBar 
          label="CPU" 
          value={metrics.cpu} 
          gradient="from-blue-500 to-blue-600"
          icon={Cpu}
          available={metrics.cpu !== undefined}
        />
        <MetricBar 
          label="RAM" 
          value={metrics.mem} 
          gradient="from-emerald-500 to-emerald-600"
          icon={Database}
          available={metrics.mem !== undefined}
        />
        <MetricBar 
          label="Disco" 
          value={metrics.disk} 
          gradient="from-purple-500 to-purple-600"
          icon={HardDrive}
          available={metrics.disk !== undefined}
        />
        <PingBar 
          ping={metrics.ping}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500 dark:text-slate-400 font-medium">Actualizando métricas...</span>
          </div>
        </div>
      )}

      {/* Hover effect */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Ver detalles</span>
          <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 transform group-hover:translate-x-1 transition-transform duration-200" />
        </div>
      </div>
    </div>
  );
};

const MetricBar: React.FC<{ 
  label: string; 
  value?: number; 
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}> = ({ label, value, gradient, icon: Icon, available }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center shadow-sm ${!available ? 'opacity-50' : ''}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900 dark:text-white">
        {value !== undefined ? `${value.toFixed(1)}%` : (available ? '--' : 'N/A')}
      </span>
    </div>
    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
      <div
        className={`h-3 rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out shadow-sm ${!available ? 'opacity-50' : ''}`}
        style={{ width: value ? `${Math.min(value, 100)}%` : '0%' }}
      />
    </div>
  </div>
);

const PingBar: React.FC<{
  ping?: {
    status: 'ok' | 'fail';
    latency?: number;
  };
}> = ({ ping }) => {
  const isOnline = ping?.status === 'ok';
  const latency = ping?.latency;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
            isOnline 
              ? 'bg-gradient-to-r from-green-500 to-green-600' 
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-white" />
            ) : (
              <WifiOff className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Ping</span>
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {ping ? (
            isOnline ? (
              latency !== undefined ? `${latency.toFixed(1)}ms` : 'OK'
            ) : (
              'FAIL'
            )
          ) : (
            'N/A'
          )}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
        <div
          className={`h-3 rounded-full transition-all duration-700 ease-out shadow-sm ${
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
  );
};

export default ServerCard; 