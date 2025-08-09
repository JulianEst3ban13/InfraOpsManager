import React, { useState } from 'react';
import { X, HelpCircle, Server, Search, RefreshCw, Home, Activity, AlertTriangle, Wifi, Clock, Play, Pause, BarChart3, Database, Cpu, HardDrive, Zap, Maximize2 } from 'lucide-react';

interface InfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DetailItem {
  label: string;
  desc: string;
  status?: 'online' | 'warning' | 'offline';
  icon?: React.ReactElement;
}

interface InfoItem {
  id: string;
  icon: React.ReactElement;
  title: string;
  description: string;
  category: string;
  details?: DetailItem[];
}

const items: InfoItem[] = [
  {
    id: 'module',
    icon: <BarChart3 className="w-5 h-5" />,
    title: '¿Qué es este módulo?',
    description: 'El dashboard AWS APM te permite monitorear el estado y rendimiento de todos los servidores conectados a la plataforma en una sola vista, facilitando la supervisión y detección de problemas.',
    category: 'general'
  },
  {
    id: 'search',
    icon: <Search className="w-5 h-5" />,
    title: 'Barra de búsqueda y filtros',
    description: 'Puedes buscar servidores por nombre usando la barra superior. El número junto a la búsqueda indica cuántos servidores coinciden con el filtro actual.',
    category: 'navigation'
  },
  {
    id: 'refresh',
    icon: <RefreshCw className="w-5 h-5" />,
    title: 'Botón "Actualizar"',
    description: 'Recarga manualmente el estado de todos los servidores. Útil para obtener la información más reciente bajo demanda.',
    category: 'actions'
  },
  {
    id: 'back',
    icon: <Home className="w-5 h-5" />,
    title: 'Botón "Volver al dashboard"',
    description: 'Te permite regresar a la vista principal o de inicio de la plataforma.',
    category: 'navigation'
  },
  {
    id: 'summary',
    icon: <Activity className="w-5 h-5" />,
    title: 'Resumen de servidores',
    description: 'En la parte superior encontrarás tarjetas resumen con el estado general de tu infraestructura.',
    category: 'monitoring',
    details: [
      { label: 'Total Servidores', desc: 'Número total de servidores monitoreados' },
      { label: 'Online', desc: 'Servidores que han enviado métricas en los últimos 2 minutos', status: 'online' },
      { label: 'Warning', desc: 'Servidores entre 2 y 20 minutos sin métricas', status: 'warning' },
      { label: 'Offline', desc: 'Servidores con más de 20 minutos sin métricas', status: 'offline' }
    ]
  },
  {
    id: 'offline',
    icon: <AlertTriangle className="w-5 h-5" />,
    title: '¿Por qué un servidor está Offline?',
    description: 'Un servidor pasa a estado "Offline" si no se reciben métricas durante más de 20 minutos.',
    category: 'troubleshooting',
    details: [
      { label: 'Servidor apagado', desc: 'El servidor está apagado o reiniciándose' },
      { label: 'Problemas de red', desc: 'Conectividad o problemas de red' },
      { label: 'Agente inactivo', desc: 'El agente de monitoreo no está funcionando' },
      { label: 'Configuración', desc: 'Problemas de configuración del sistema' }
    ]
  },
  {
    id: 'realtime',
    icon: <Clock className="w-5 h-5" />,
    title: 'Datos no en tiempo real',
    description: 'Si ves esta advertencia, significa que la data o métricas que se visualiza no está actualizada con la fecha y hora actual.',
    category: 'troubleshooting'
  },
  {
    id: 'cards',
    icon: <Server className="w-5 h-5" />,
    title: 'Tarjetas de servidor',
    description: 'Cada tarjeta muestra información resumida del servidor. Haz clic para ver el detalle completo.',
    category: 'monitoring',
    details: [
      { label: 'Estado visual', desc: 'Ícono y color según el estado del servidor' },
      { label: 'Nombre', desc: 'Identificador único del servidor' },
      { label: 'Última métrica', desc: 'Timestamp de la última comunicación' },
      { label: 'Métricas clave', desc: 'CPU, RAM, Disco, Apache y Ping resumidos' }
    ]
  },
  {
    id: 'detail',
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Detalle del servidor',
    description: 'Vista expandida con información completa y controles avanzados.',
    category: 'monitoring',
    details: [
      { label: 'Gráficas históricas', desc: 'Visualización temporal de métricas' },
      { label: 'Tabla de datos', desc: 'Datos recientes en formato tabular' },
      { label: 'Controles', desc: 'Botones para refrescar y automatización' }
    ]
  },
  {
    id: 'metrics',
    icon: <Database className="w-5 h-5" />,
    title: 'Descripción de métricas',
    description: 'Explicación de cada tipo de métrica monitoreada.',
    category: 'reference',
    details: [
      { label: 'CPU', desc: 'Uso porcentual del procesador', icon: <Cpu className="w-4 h-4" /> },
      { label: 'RAM', desc: 'Uso porcentual de memoria', icon: <Zap className="w-4 h-4" /> },
      { label: 'Disco', desc: 'Uso porcentual de almacenamiento', icon: <HardDrive className="w-4 h-4" /> },
      { label: 'Ping', desc: 'Accesibilidad y latencia del servidor', icon: <Wifi className="w-4 h-4" /> }
    ]
  },
  {
    id: 'controls',
    icon: <Play className="w-5 h-5" />,
    title: 'Controles de detalle',
    description: 'Botones disponibles en la vista de detalle del servidor.',
    category: 'actions',
    details: [
      { label: 'Actualizar', desc: 'Recarga las métricas del servidor seleccionado', icon: <RefreshCw className="w-4 h-4" /> },
      { label: 'Auto-refresh', desc: 'Activa/desactiva refresco automático cada 5 minutos', icon: <Play className="w-4 h-4" /> },
      { label: 'Expandir', desc: 'Expandir o maximizar la vista de la tarjeta del servidor', icon: <Maximize2 className="w-4 h-4" /> }
    ]
  }
];

const categories = {
  general: { name: 'General', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  navigation: { name: 'Navegación', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  monitoring: { name: 'Monitoreo', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  actions: { name: 'Acciones', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  troubleshooting: { name: 'Solución de problemas', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  reference: { name: 'Referencia', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' }
};

const InfoSidebar: React.FC<InfoSidebarProps> = ({ isOpen, onClose }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: 'online' | 'warning' | 'offline') => {
    const badges = {
      online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      offline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return badges[status];
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          // className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
           className="fixed inset-0 bg-black/20  transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ 
          boxShadow: 'rgba(0,0,0,0.15) -8px 0px 32px 0px',
          borderLeft: '1px solid rgb(229 231 235 / 0.8)'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-4 border-b border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Centro de Ayuda</h2>
                <p className="text-blue-100 text-sm">Dashboard AWS APM</p>
              </div>
            </div>
            <button
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={onClose}
              aria-label="Cerrar barra lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="sticky top-[88px] bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en la ayuda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''} encontrado{filteredItems.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-152px)] px-6 py-4">
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                      <div className="text-blue-600 dark:text-blue-400">
                        {item.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                          {item.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categories[item.category as keyof typeof categories].color}`}>
                          {categories[item.category as keyof typeof categories].name}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                        {item.description}
                      </p>
                      {item.details && (
                        <div className="flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400">
                          <span className="text-xs font-medium">
                            {expandedItems.has(item.id) ? 'Ver menos' : 'Ver detalles'}
                          </span>
                          <div className={`transform transition-transform duration-200 ${expandedItems.has(item.id) ? 'rotate-180' : ''}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedItems.has(item.id) && item.details && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="pt-4 space-y-3">
                      {item.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                          {detail.icon && (
                            <div className="flex-shrink-0 text-gray-500 dark:text-gray-400 mt-0.5">
                              {detail.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                {detail.label}
                              </h4>
                              {detail.status && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadge(detail.status)}`}>
                                  {detail.status}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-slate-300 text-xs mt-1">
                              {detail.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No se encontraron resultados para "{searchTerm}"
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-blue-200 dark:border-slate-600">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                ¿Necesitas más ayuda?
              </h4>
            </div>
            <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed">
              Utiliza los controles interactivos del dashboard para explorar en tiempo real. 
              Cada elemento cuenta con tooltips explicativos.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default InfoSidebar;