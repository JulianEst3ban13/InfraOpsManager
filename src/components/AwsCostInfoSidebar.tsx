import React, { useState } from 'react';
import { X, RefreshCw, PlusCircle, Edit3, BarChart2, Mail, BookText, Search, HelpCircle, DollarSign, Calendar, AlertCircle, CheckCircle, TrendingUp, FileText } from 'lucide-react';

interface AwsCostInfoSidebarProps {
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

const detalles: DetailItem[] = [
  {
    label: "Actualizar",
    icon: <RefreshCw className="w-4 h-4" />,
    desc: "Recarga los datos de costos y presupuesto del mes/año seleccionado para obtener la información más reciente.",
    category: "actions",
    tips: ["Úsalo cuando sospeches que faltan datos", "Se actualiza automáticamente cada 5 minutos"]
  },
  {
    label: "Agregar Costo",
    icon: <PlusCircle className="w-4 h-4" />,
    desc: "Permite añadir un nuevo registro de costo para un día específico del mes. No se pueden agregar costos para días que ya tienen un registro.",
    category: "management",
    tips: ["Solo un registro por día", "Verifica la fecha antes de guardar", "Incluye descripción detallada", "Edita el valor del registro si es necesario", "Elimina el registro si es necesario" ]
  },
  {
    label: "Agregar Presupuesto",
    icon: <DollarSign className="w-4 h-4" />,
    desc: "Solo aparece si NO existe un presupuesto para el mes seleccionado. Permite definir el presupuesto mensual.",
    category: "management",
    tips: ["Un presupuesto por mes", "Considera gastos variables", "Incluye margen de seguridad del 10-15%"]
  },
  {
    label: "Editar Presupuesto",
    icon: <Edit3 className="w-4 h-4" />,
    desc: "Solo aparece si ya exists un presupuesto mensual para el periodo seleccionado. Permite modificar el monto del presupuesto mensual.",
    category: "management",
    tips: ["Ajusta según tendencias", "Documenta cambios importantes"]
  },
  {
    label: "Ver Gráfico",
    icon: <BarChart2 className="w-4 h-4" />,
    desc: "Muestra la gráfica de costos diarios para el periodo seleccionado con tendencias y comparativas.",
    category: "analytics",
    tips: ["Identifica patrones de gasto", "Compara con meses anteriores", "Detecta picos inusuales"]
  },
  {
    label: "Enviar Resumen",
    icon: <Mail className="w-4 h-4" />,
    desc: "Permite enviar un resumen automático de los costos y el avance respecto al presupuesto definido.",
    category: "reporting",
    tips: ["Configura destinatarios clave", "Programa envíos regulares", "Personaliza el contenido"]
  },
  {
    label: "Información",
    icon: <BookText className="w-4 h-4" />,
    desc: "Abre este panel de ayuda con la explicación de cada función y recomendaciones de uso.",
    category: "help",
    tips: ["Consulta antes de usar nuevas funciones", "Revisa las mejores prácticas regularmente"]
  }
];

const reglas: RuleItem[] = [
  {
    title: "Presupuesto único por mes",
    description: "Solo puedes agregar un presupuesto por mes. Si ya existe, solo puedes editarlo para ajustarlo a nuevas necesidades.",
    type: "warning",
    icon: <AlertCircle className="w-4 h-4" />
  },
  {
    title: "Sin duplicados de costos",
    description: "No puedes agregar un costo para un día que ya tiene un registro. Esto evita duplicidades y mantiene la integridad de los datos.",
    type: "warning", 
    icon: <AlertCircle className="w-4 h-4" />
  },
  {
    title: "Navegación temporal",
    description: "Utiliza los filtros de año y mes para navegar entre periodos históricos y analizar tendencias a lo largo del tiempo.",
    type: "info",
    icon: <Calendar className="w-4 h-4" />
  },
  {
    title: "Análisis de avance",
    description: "El resumen muestra el avance respecto al presupuesto mensual y identifica los días con mayor gasto para optimización.",
    type: "success",
    icon: <TrendingUp className="w-4 h-4" />
  },
  {
    title: "Exportación de reportes",
    description: "Usa la opción de exportar para generar reportes externos, análisis detallados y presentaciones para stakeholders.",
    type: "info",
    icon: <FileText className="w-4 h-4" />
  }
];

const categories = {
  actions: { name: 'Acciones', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  management: { name: 'Gestión', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  analytics: { name: 'Análisis', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  reporting: { name: 'Reportes', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  help: { name: 'Ayuda', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' }
};

const ruleTypes = {
  warning: { 
    color: 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800', 
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-900 dark:text-amber-100'
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

const AwsCostInfoSidebar: React.FC<AwsCostInfoSidebarProps> = ({ isOpen, onClose }) => {
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

  const filteredItems = detalles.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20  z-40 transition-opacity duration-300"
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
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 px-6 py-4 border-b border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Centro de Ayuda</h2>
                <p className="text-emerald-100 text-sm">Gestión de Costos AWS</p>
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
              placeholder="Buscar funciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
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
                Este dashboard permite administrar, visualizar y reportar los costos diarios de AWS. 
                Utiliza los filtros, agrega o edita presupuestos y exporta información para un mejor control financiero.
              </p>
            </div>

            {/* Functions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
                          <div className="text-emerald-600 dark:text-emerald-400">
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
                            <div className="flex items-center gap-1 mt-2 text-emerald-600 dark:text-emerald-400">
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
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-emerald-200 dark:border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  Optimiza tus costos AWS
                </h4>
              </div>
              <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed">
                Usa este dashboard regularmente para mantener un control efectivo de tus gastos, 
                identificar tendencias y optimizar tu presupuesto cloud.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AwsCostInfoSidebar;