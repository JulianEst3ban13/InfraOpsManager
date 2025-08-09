import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, 
  Info, 
  Download, 
  Trash2, 
  Filter, 
  RefreshCw, 
  FileText, 
  Search, 
  Lightbulb, 
  Shield,
  HelpCircle,
  BookText,
  CheckCircle,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

interface DetailItem {
  label: string;
  icon: React.ReactNode;
  desc: string;
  category: 'actions' | 'features';
  tips?: string[];
}

interface RuleItem {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
  icon: React.ReactNode;
  tips?: string[];
}

const funciones: DetailItem[] = [
  {
    label: "Descargar Informe (PDF)",
    icon: <Download className="w-4 h-4" />,
    desc: "Haz clic en 'Ver PDF' en la fila correspondiente para abrir o descargar una copia del informe en formato PDF.",
    category: "actions",
    tips: [
      "El PDF se abrirá en una nueva pestaña del navegador",
      "Asegúrate de tener desbloqueadas las ventanas emergentes para este sitio",
      "Asegúrate de tener un visor de PDF instalado",
      "El nombre del archivo descargado seguirá un formato estándar con fecha y hora"
    ]
  },
  {
    label: "Eliminar Informe",
    icon: <Trash2 className="w-4 h-4" />,
    desc: "Usa el ícono de la papelera para eliminar un informe. Esta acción es permanente y no se puede deshacer.",
    category: "actions",
    tips: [
      "Una vez eliminado, el informe no podrá ser recuperado",
      "Se te pedirá confirmación antes de la eliminación definitiva",
      "Solo elimina informes que estés seguro de que ya no son necesarios",
      "Considera hacer una copia de seguridad antes de eliminar informes importantes"
    ]
  },
  {
    label: "Filtrar Informes",
    icon: <Filter className="w-4 h-4" />,
    desc: "Utiliza los campos de búsqueda en la parte superior para encontrar informes por 'Cliente' o por 'Correo' del destinatario.",
    category: "features",
    tips: [
      "Puedes combinar ambos filtros para una búsqueda más precisa",
      "La búsqueda no distingue entre mayúsculas y minúsculas",
      "Los filtros se aplican en tiempo real mientras escribes",
      "Usa términos específicos para obtener mejores resultados"
    ]
  },
  {
    label: "Limpiar Filtros",
    icon: <X className="w-4 h-4" />,
    desc: "El botón 'Limpiar Filtros' restaura la vista original, mostrando todos los informes sin filtros aplicados.",
    category: "features",
    tips: [
      "Útil cuando quieres ver todos los informes disponibles",
      "Restaura tanto el filtro de cliente como el de correo",
      "También restablece la paginación a la primera página"
    ]
  },
  {
    label: "Actualizar Lista",
    icon: <RefreshCw className="w-4 h-4" />,
    desc: "Recarga la lista de informes desde el servidor para ver los cambios más recientes, como nuevos informes o eliminaciones.",
    category: "features",
    tips: [
      "Útil cuando trabajas en equipo y otros usuarios pueden generar informes",
      "Se actualiza automáticamente cada 3 minutos",
      "Conserva los filtros aplicados después de la actualización"
    ]
  },
  {
    label: "Paginación",
    icon: <FileText className="w-4 h-4" />,
    desc: "Navega entre las diferentes páginas de resultados usando los botones 'Anterior' y 'Siguiente' en la parte inferior.",
    category: "features",
    tips: [
      "Muestra hasta 20 informes por página para mejor rendimiento",
      "Los filtros se mantienen al cambiar de página",
      "Puedes saltar directamente a una página específica"
    ]
  }
];

const reglas: RuleItem[] = [
  {
    title: "Eliminación Permanente",
    description: "La eliminación de un informe es definitiva y no se puede revertir. Procede con precaución.",
    type: "warning",
    icon: <AlertTriangle className="w-4 h-4" />,
    tips: [
      "Una vez eliminado, el informe no podrá ser recuperado",
      "Se te pedirá confirmación antes de la eliminación definitiva",
      "Considera la importancia histórica del informe antes de eliminarlo"
    ]
  },
  {
    title: "Sin Exportación Masiva",
    description: "Este módulo no permite la exportación de la lista completa a formatos como CSV. La descarga es individual por cada informe en PDF.",
    type: "info",
    icon: <Info className="w-4 h-4" />,
    tips: [
      "Puedes descargar cada informe en formato PDF de manera individual",
      "La descarga de informes es rápida y segura",
      "Para exportaciones masivas, contacta al administrador del sistema"
    ]
  },
  {
    title: "Permisos de Eliminación",
    description: "Solo usuarios con los permisos adecuados pueden eliminar informes. Si no ves el ícono, no tienes permiso.",
    type: "info",
    icon: <Shield className="w-4 h-4" />,
    tips: [
      "Si necesitas permisos de eliminación, contacta al administrador del sistema",
      "Esta medida de seguridad previene borrados accidentales",
      "Los permisos se revisan periódicamente por motivos de seguridad"
    ]
  }
];

const categories = {
  actions: { name: 'Acciones', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  features: { name: 'Funcionalidades', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
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

interface ExpandableItemProps {
  item: DetailItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const ExpandableItem: React.FC<ExpandableItemProps> = ({ item, isExpanded, onToggle }) => (
  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200">
    <div
      className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
      onClick={item.tips ? onToggle : undefined}
      role={item.tips ? "button" : undefined}
      tabIndex={item.tips ? 0 : -1}
      onKeyDown={(e) => {
        if (item.tips && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
          <div className="text-emerald-600 dark:text-emerald-400">
            {item.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
              {item.label}
            </h4>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categories[item.category].color}`}>
              {categories[item.category].name}
            </span>
          </div>
          <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
            {item.desc}
          </p>
          {item.tips && (
            <div className="flex items-center gap-1 mt-2 text-emerald-600 dark:text-emerald-400">
              <Lightbulb className="w-3 h-3" />
              <span className="text-xs font-medium">
                {isExpanded ? 'Ver menos' : 'Ver consejos'}
              </span>
              <ChevronDown className={`w-3 h-3 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>
      </div>
    </div>

    {isExpanded && item.tips && (
      <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="pt-4">
          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Consejos y Mejores Prácticas
          </h5>
          <div className="space-y-2">
            {item.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
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
);

interface ExpandableRuleProps {
  rule: RuleItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const ExpandableRule: React.FC<ExpandableRuleProps> = ({ rule, isExpanded, onToggle }) => (
  <div className={`rounded-xl border ${ruleTypes[rule.type].color} overflow-hidden`}>
    <div
      className={`p-4 ${rule.tips ? 'cursor-pointer hover:bg-opacity-80' : ''}`}
      onClick={rule.tips ? onToggle : undefined}
      role={rule.tips ? "button" : undefined}
      tabIndex={rule.tips ? 0 : -1}
      onKeyDown={(e) => {
        if (rule.tips && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${ruleTypes[rule.type].iconColor} mt-0.5`}>
          {rule.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-sm mb-1 ${ruleTypes[rule.type].titleColor}`}>
            {rule.title}
          </h4>
          <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed">
            {rule.description}
          </p>
          {rule.tips && (
            <div className={`flex items-center gap-1 mt-2 ${ruleTypes[rule.type].iconColor}`}>
              <Lightbulb className="w-3 h-3" />
              <span className="text-xs font-medium">
                {isExpanded ? 'Ver menos' : 'Ver consejos'}
              </span>
              <ChevronDown className={`w-3 h-3 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>
      </div>
    </div>

    {isExpanded && rule.tips && (
      <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="pt-4">
          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Información Adicional
          </h5>
          <div className="space-y-2">
            {rule.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <Info className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
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
);

interface ReportListInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReportListInfoSidebar: React.FC<ReportListInfoSidebarProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const filteredFunciones = useMemo(() =>
    funciones.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tips?.some(tip => tip.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [searchTerm]);

  const filteredReglas = useMemo(() =>
    reglas.filter(rule => 
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.tips?.some(tip => tip.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [searchTerm]);

  const toggleExpanded = useCallback((itemLabel: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(itemLabel)) {
        newExpanded.delete(itemLabel);
      } else {
        newExpanded.add(itemLabel);
      }
      return newExpanded;
    });
  }, []);

  const toggleExpandedRule = useCallback((ruleTitle: string) => {
    setExpandedRules(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(ruleTitle)) {
        newExpanded.delete(ruleTitle);
      } else {
        newExpanded.add(ruleTitle);
      }
      return newExpanded;
    });
  }, []);

  const handleSupportClick = useCallback(() => {
    alert('Contactando al soporte técnico...');
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Handle keyboard escape to close sidebar
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-label="Cerrar ayuda contextual"
      />
      
      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 h-full w-[420px] bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-all duration-300 ease-out flex flex-col"
        style={{
          boxShadow: 'rgba(0,0,0,0.15) -8px 0px 32px 0px',
          borderLeft: '1px solid rgb(229 231 235 / 0.8)'
        }}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 px-6 py-4 border-b border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="sidebar-title" className="text-lg font-bold text-white">Centro de Ayuda</h2>
                <p className="text-emerald-100 text-sm">Informes Registrados</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Cerrar barra lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar funciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {filteredFunciones.length + filteredReglas.length} resultado{filteredFunciones.length + filteredReglas.length !== 1 ? 's' : ''} encontrado{filteredFunciones.length + filteredReglas.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            
            {/* Module Description */}
            {!searchTerm && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border border-emerald-200 dark:border-slate-600">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <BookText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    ¿Cómo funciona este módulo?
                  </h3>
                </div>
                <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
                  Este módulo te permite consultar, filtrar y gestionar todos los informes generados. Puedes descargar una copia en PDF o eliminar los que ya no necesites de manera segura y controlada.
                </p>
              </div>
            )}

            {/* Functions */}
            {filteredFunciones.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Funciones Disponibles
                </h3>
                <div className="space-y-4">
                  {filteredFunciones.map((item) => (
                    <ExpandableItem
                      key={item.label}
                      item={item}
                      isExpanded={expandedItems.has(item.label)}
                      onToggle={() => toggleExpanded(item.label)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            {filteredReglas.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  Reglas y Advertencias
                </h3>
                <div className="space-y-3">
                  {filteredReglas.map((regla) => (
                    <ExpandableRule
                      key={regla.title}
                      rule={regla}
                      isExpanded={expandedRules.has(regla.title)}
                      onToggle={() => toggleExpandedRule(regla.title)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchTerm && filteredFunciones.length === 0 && filteredReglas.length === 0 && (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                  No se encontraron resultados para "{searchTerm}"
                </p>
                <button
                  onClick={clearSearch}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm focus:outline-none focus:underline"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

            {/* Footer */}
            {!searchTerm && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-emerald-200 dark:border-slate-600">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    Gestiona tus informes de manera eficiente
                  </h4>
                </div>
                <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed mb-3">
                  Mantén tus informes organizados, descarga copias de seguridad cuando sea necesario 
                  y gestiona el espacio eliminando documentos obsoletos siguiendo las mejores prácticas.
                </p>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Para más ayuda, contacta al{' '}
                  <button 
                    onClick={handleSupportClick}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline focus:underline focus:outline-none bg-transparent border-none p-0 cursor-pointer"
                  >
                    soporte técnico
                  </button>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};


export default ReportListInfoSidebar;