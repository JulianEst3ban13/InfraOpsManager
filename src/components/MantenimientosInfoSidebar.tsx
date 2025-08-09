import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  BookText,
  PlusCircle,
  Edit,
  Trash2,
  Filter,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  Database,
  Search,
  RefreshCw,
  Clock,
  Archive,
  TrendingUp,
  Shield,
  Settings
} from 'lucide-react';

interface MantenimientosInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DetailItem {
  label: string;
  desc: string;
  icon: React.ReactElement;
  category: string;
  tips?: string[];
}

interface RuleItem {
  title: string;
  description: string;
  type: 'warning' | 'info' | 'success';
  icon: React.ReactElement;
}

const funciones: DetailItem[] = [
  {
    label: "Actualizar Lista",
    icon: <RefreshCw className="w-4 h-4" />,
    desc: "Recarga la lista de mantenimientos desde el servidor para ver los cambios más recientes y estados actualizados.",
    category: "actions",
    tips: [
      "Útil cuando trabajas en equipo",
      "Se actualiza automáticamente cada 2 minutos",
      "Sincroniza cambios de estado en tiempo real"
    ]
  },
  {
    label: "Filtrar Mantenimientos",
    icon: <Filter className="w-4 h-4" />,
    desc: "Busca mantenimientos por título, base de datos, estado, responsable o rango de fechas para organizar mejor la información.",
    category: "management",
    tips: [
      "Usa varios filtros simultáneamente para refinar búsquedas",
      "Los filtros se mantienen al cambiar de página",
      "Limpia filtros para ver todos los registros",
      "Guarda combinaciones de filtros frecuentes"
    ]
  },
  {
    label: "Búsqueda Global",
    icon: <Search className="w-4 h-4" />,
    desc: "Realiza búsquedas por texto en título, descripción, notas y comentarios de mantenimientos.",
    category: "management",
    tips: [
      "Busca por palabras clave específicas",
      "Incluye términos técnicos y códigos de error",
      "Combina con filtros para mayor precisión"
    ]
  },
  {
    label: "Paginación",
    icon: <BookText className="w-4 h-4" />,
    desc: "Navega entre páginas cuando hay muchos registros de mantenimientos, con controles de navegación intuitivos.",
    category: "management",
    tips: [
      "Ajusta el número de registros por página",
      "Utiliza navegación rápida para saltar páginas",
      "Los filtros se mantienen entre páginas"
    ]
  },
  {
    label: "Estados de Mantenimiento",
    icon: <CheckCircle className="w-4 h-4" />,
    desc: "Visualiza el estado actual mediante íconos y colores: Programado, En Proceso, Completado, Fallido, Cancelado.",
    category: "monitoring",
    tips: [
      "Verifica estados antes de generar informes",
      "Investiga mantenimientos fallidos inmediatamente",
      "Documenta razones de cancelaciones"
    ]
  },
  {
    label: "Gestión de Backup",
    icon: <Database className="w-4 h-4" />,
    desc: "Indica y gestiona si se realizó backup previo al mantenimiento, con verificación de integridad.",
    category: "monitoring",
    tips: [
      "Siempre realiza backup antes de tareas críticas",
      "Confirma que el backup fue exitoso",
      "Verifica integridad antes de proceder",
      "Documenta ubicación y tipo de backup"
    ]
  },
  {
    label: "Información de Ayuda",
    icon: <BookText className="w-4 h-4" />,
    desc: "Abre este panel de ayuda contextual con explicación detallada de cada función y mejores prácticas.",
    category: "help",
    tips: [
      "Consulta antes de realizar acciones críticas",
      "Revisa las reglas de seguridad regularmente"
    ]
  }
];

const reglas: RuleItem[] = [
  {
    title: "Seguimiento post-mantenimiento",
    description: "Realiza verificaciones de rendimiento 24-48 horas después del mantenimiento para confirmar estabilidad del sistema.",
    type: "success",
    icon: <TrendingUp className="w-4 h-4" />
  },

];

const categories = {
  actions: { name: 'Acciones', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  management: { name: 'Gestión', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  reporting: { name: 'Reportes', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  monitoring: { name: 'Monitoreo', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  advanced: { name: 'Avanzado', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  help: { name: 'Ayuda', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' }
};

const ruleTypes = {
  warning: {
    color: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-900 dark:text-red-100'
  },
  info: {
    color: 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-900 dark:text-blue-100'
  },
  success: {
    color: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-900 dark:text-green-100'
  }
};

const MantenimientosInfoSidebar: React.FC<MantenimientosInfoSidebarProps> = ({ isOpen, onClose }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpanded = (itemLabel: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemLabel)) {
      newExpanded.delete(itemLabel);
    } else {
      newExpanded.add(itemLabel);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = funciones.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-label="Cerrar ayuda contextual"
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
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-700 dark:from-violet-700 dark:to-violet-800 px-6 py-4 border-b border-violet-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Centro de Ayuda</h2>
                <p className="text-violet-100 text-sm">Status de Mantenimientos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
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
              placeholder="Buscar funciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {filteredItems.length} función{filteredItems.length !== 1 ? 'es' : ''} encontrada{filteredItems.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-152px)] px-6 py-4">
          <div className="space-y-6">
            
            {/* Module Description */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border border-violet-200 dark:border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <BookText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ¿Cómo funciona este módulo?
                </h3>
              </div>
              <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
                Visualiza, filtra y mantenimientos programados y completados para distintas bases de datos. 
                mantén el historial de intervenciones actualizado.
              </p>
            </div>

            {/* Functions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Funciones Disponibles
              </h3>
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.label}
                    className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
                      onClick={() => toggleExpanded(item.label)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                          <div className="text-violet-600 dark:text-violet-400">
                            {item.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                              {item.label}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categories[item.category as keyof typeof categories].color}`}>
                              {categories[item.category as keyof typeof categories].name}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                            {item.desc}
                          </p>
                          {item.tips && (
                            <div className="flex items-center gap-1 mt-2 text-violet-600 dark:text-violet-400">
                              <span className="text-xs font-medium">
                                {expandedItems.has(item.label) ? 'Ver menos' : 'Ver consejos'}
                              </span>
                              <div className={`transform transition-transform duration-200 ${expandedItems.has(item.label) ? 'rotate-180' : ''}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Tips */}
                    {expandedItems.has(item.label) && item.tips && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="pt-4">
                          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                            Consejos y Mejores Prácticas
                          </h5>
                          <div className="space-y-2">
                            {item.tips.map((tip, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <CheckCircle className="w-3 h-3 text-violet-500 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-600 dark:text-slate-300 text-xs">
                                  {tip}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredItems.length === 0 && (
                  <div className="text-center py-8">
                    <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No se encontraron funciones para "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rules */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Reglas y Recomendaciones
              </h3>
              <div className="space-y-3">
                {reglas.map((regla, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${ruleTypes[regla.type].color}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 ${ruleTypes[regla.type].iconColor} mt-0.5`}>
                        {regla.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm mb-1 ${ruleTypes[regla.type].titleColor}`}>
                          {regla.title}
                        </h4>
                        <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed">
                          {regla.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-violet-200 dark:border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <Settings className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  Administra tus mantenimientos con excelencia
                </h4>
              </div>
              <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed">
                Mantén la información actualizada, documenta cada intervención, realiza backups preventivos 
                y sigue las mejores prácticas de gestión para garantizar la continuidad operacional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MantenimientosInfoSidebar;