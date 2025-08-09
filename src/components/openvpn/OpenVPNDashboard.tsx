import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Server, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Download,
  Upload,
  Clock,
  Wifi,
  Globe
} from 'lucide-react';
import axios from 'axios';
import config from '../../config/config';

interface Cliente {
  nombre: string;
  ip: string;
  recibido: string;
  enviado: string;
  conexion: string;
}

interface TraficoVPN {
  descargado: string;
  subido: string;
}

interface OpenVPNStatus {
  usuariosActivos: number;
  estado: 'Activo' | 'Inactivo';
  desde: string;
  detalles: string;
  trafico: TraficoVPN;
  clientes: Cliente[];
  actualizado: string;
}

const OpenVPNDashboard: React.FC = () => {
  const [data, setData] = useState<OpenVPNStatus>({
    usuariosActivos: 0,
    estado: 'Inactivo',
    desde: '',
    detalles: '',
    trafico: {
      descargado: '0 MB',
      subido: '0 MB'
    },
    clientes: [],
    actualizado: new Date().toLocaleString()
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Función para obtener datos reales de la API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<OpenVPNStatus>(`${config.apiBaseUrl}:${config.apiPort}/api/openvpn/status`);
      if (response.data) {
        setData(response.data);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error al obtener datos de OpenVPN:', error);
      setError('Error al obtener datos del servidor OpenVPN');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatUptime = (desde: string) => {
    const start = new Date(desde);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (estado: string) => {
    return estado === 'Activo' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (estado: string) => {
    return estado === 'Activo' ? CheckCircle : XCircle;
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number | React.ReactNode;
    icon: React.ElementType;
    subtitle?: string;
    trend?: 'up' | 'down' | 'stable';
    color?: string;
  }> = ({ title, value, icon: Icon, subtitle, trend, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white'
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon size={24} />
          </div>
          {trend && (
            <div className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Wifi className="text-blue-600" />
              Dashboard OpenVPN
            </h1>
            <p className="text-gray-600 mt-1">Monitoreo en tiempo real del servidor VPN</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={16} />
              Última actualización: {lastRefresh.toLocaleTimeString()}
            </div>
            
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                autoRefresh 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <Activity size={16} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-4 gap-6">
          <MetricCard
            title="Usuarios Activos"
            value={loading ? 'Cargando...' : data.usuariosActivos}
            icon={Users}
            subtitle="Conexiones simultáneas"
            trend="stable"
            color="blue"
          />
          
          <MetricCard
            title="Estado del Servidor"
            value={
              <div className="flex items-center gap-2">
                {React.createElement(getStatusIcon(data.estado), { size: 20 })}
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(data.estado)}`}>
                  {data.estado}
                </span>
              </div>
            }
            icon={Server}
            subtitle={data.desde ? `Uptime: ${formatUptime(data.desde)}` : ''}
            color={data.estado === 'Activo' ? 'green' : 'red'}
          />
          
          <MetricCard
            title="Tráfico Descargado"
            value={data.trafico.descargado}
            icon={Download}
            subtitle="Total recibido"
            trend="up"
            color="purple"
          />
          
          <MetricCard
            title="Tráfico Subido"
            value={data.trafico.subido}
            icon={Upload}
            subtitle="Total enviado"
            trend="up"
            color="orange"
          />
        </div>

        {/* Gráfico de estado (simulado) */}
        <div className="grid  gap-6">
          {/* Detalles del servicio */}
          {data.detalles && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="text-blue-600" size={20} />
                Detalles del Servicio
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-700">
                {data.detalles}
              </div>
            </div>
          )}

          {/* Métricas adicionales */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-green-600" size={20} />
                Estadísticas
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {/* Conexiones Totales */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Conexiones Totales</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{data.clientes.length}</span>
                </div>

                {/* Tráfico Total */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Tráfico Total</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {(
                      (parseFloat(data.trafico.descargado.replace(/[^\d.]/g, '') || '0') + 
                       parseFloat(data.trafico.subido.replace(/[^\d.]/g, '') || '0'))
                    ).toFixed(1)} GB
                  </span>
                </div>

                {/* Promedio por Usuario */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Promedio por Usuario</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {data.clientes.length > 0 
                      ? (
                          (parseFloat(data.trafico.descargado.replace(/[^\d.]/g, '') || '0') + 
                           parseFloat(data.trafico.subido.replace(/[^\d.]/g, '') || '0')) / data.clientes.length
                        ).toFixed(2) + ' GB'
                      : '0 GB'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de clientes mejorada */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="text-blue-600" size={20} />
              Clientes Conectados
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full ml-2">
                {data.clientes.length}
              </span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Asignada</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descargado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conectado Desde</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="animate-spin text-blue-600" size={20} />
                        <span className="text-gray-500">Cargando...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.clientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No hay clientes conectados actualmente
                    </td>
                  </tr>
                ) : (
                  data.clientes.map((cliente, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">{cliente.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {cliente.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Download size={14} className="text-blue-500" />
                          {cliente.recibido}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Upload size={14} className="text-green-500" />
                          {cliente.enviado}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cliente.conexion).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Conectado
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          Dashboard OpenVPN - Última actualización: {data.actualizado}
        </div>
      </div>
    </div>
  );
};

export default OpenVPNDashboard;