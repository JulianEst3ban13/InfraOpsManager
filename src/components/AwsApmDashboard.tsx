import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Search, 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Search as SearchIcon,
  RefreshCw,
  ArrowLeft,
  BookText
} from 'lucide-react';
import ServerCard from './ServerCard';
import ServerDetail from './ServerDetail';
import InfoSidebar from './InfoSidebar';
import config from '../config/config';

// importación centralizada de ServerStatus
import { ServerStatus } from '../types';



interface AwsApmDashboardProps {
  onBack?: () => void;
}

const AwsApmDashboard: React.FC<AwsApmDashboardProps> = ({ onBack }) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  const fetchServersStatus = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/api/aws-apm/servers/status`);
      if (!res.ok) {
        throw new Error('Error al obtener estado de servidores');
      }
      const data = await res.json();
      setServers(data);
    } catch (err) {
      console.error('Error fetching servers status:', err);
      setServers([]);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await fetchServersStatus();
      setLoading(false);
    }
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchServersStatus();
    setRefreshing(false);
  };

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack();
    } else {
      // Fallback: cambiar a la vista de inicio
      window.location.href = '/dashboard';
    }
  };

  const handleServerClick = (serverName: string) => {
    setSelectedServer(serverName);
  };

  const handleCloseDetail = () => {
    setSelectedServer(null);
  };

  const filteredServers = servers.filter(s => s.server.toLowerCase().includes(search.toLowerCase()));
  const total = servers.length;
  const online = servers.filter(s => s.status === 'online').length;
  const warning = servers.filter(s => s.status === 'warning').length;
  const offline = servers.filter(s => s.status === 'offline').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                AWS APM
              </h1>
              <p className="text-lg text-gray-600 dark:text-slate-300 mt-1">
                Monitoreo de Servidores en Tiempo Real
              </p>
            </div>
          </div>
        </div>

        {/* Unified Toolbar - Top Position */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-slate-700">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <button
                  className="flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg shadow-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-all mr-4 mb-2"
                  onClick={() => setInfoOpen(true)}
                  aria-label="Información del módulo"
                  type="button"
                >
                  <BookText className="w-5 h-5 mr-2" />
                  Información
                </button>
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="search"
                      type="text"
                      className="block w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Buscar servidor..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
                  {servers.length} servidor{servers.length !== 1 ? 'es' : ''} encontrado{servers.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
                <button
                  onClick={handleBackToDashboard}
                  className="flex items-center space-x-2 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <SummaryCard 
            label="Total Servidores" 
            value={total} 
            icon={Server}
            gradient="from-gray-600 to-gray-700"
            bgColor="bg-white dark:bg-slate-800"
            shadow="shadow-lg"
          />
          <SummaryCard 
            label="Online" 
            value={online} 
            icon={CheckCircle}
            gradient="from-emerald-500 to-emerald-600"
            bgColor="bg-white dark:bg-slate-800"
            shadow="shadow-lg"
          />
          <SummaryCard 
            label="Warning" 
            value={warning} 
            icon={AlertTriangle}
            gradient="from-amber-500 to-amber-600"
            bgColor="bg-white dark:bg-slate-800"
            shadow="shadow-lg"
          />
          <SummaryCard 
            label="Offline" 
            value={offline} 
            icon={XCircle}
            gradient="from-red-500 to-red-600"
            bgColor="bg-white dark:bg-slate-800"
            shadow="shadow-lg"
          />
        </div>

        {/* Servers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full mb-4">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-gray-600 dark:text-slate-400 font-medium">Cargando servidores...</p>
                <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">Obteniendo información en tiempo real</p>
              </div>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {search ? 'No se encontraron servidores' : 'No hay servidores disponibles'}
              </h3>
              <p className="text-gray-500 dark:text-slate-400">
                {search ? 'Intenta con un nombre diferente' : 'Los servidores aparecerán aquí cuando estén disponibles'}
              </p>
            </div>
          ) : (
            filteredServers.map(server => (
              <ServerCard 
                key={server.server} 
                serverName={server.server}
                serverStatus={server}
                onClick={() => handleServerClick(server.server)} 
              />
            ))
          )}
        </div>
      </div>
      
      <ServerDetail
        serverName={selectedServer || ''}
        isOpen={!!selectedServer}
        onClose={handleCloseDetail}
      />
      <InfoSidebar isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
};

const SummaryCard: React.FC<{ 
  label: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bgColor: string;
  shadow: string;
}> = ({ label, value, icon: Icon, gradient, bgColor, shadow }) => (
  <div className={`${bgColor} ${shadow} rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-slate-700`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
      <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default AwsApmDashboard; 