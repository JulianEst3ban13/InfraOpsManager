import React, { useState } from 'react';
import { X, PlusCircle, Edit, Trash2, Terminal, RefreshCw, Search, BookText, Database, AlertCircle, CheckCircle, FileText, ArrowUp, ArrowDown, HelpCircle, Shield, Zap } from 'lucide-react';

interface ConexionInfoSidebarProps {
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
    label: "Agregar Conexión",
    icon: <PlusCircle className="w-4 h-4" />,
    desc: "Permite registrar una nueva conexión a base de datos. Debes completar todos los campos requeridos para establecer la conexión.",
    category: "actions",
    tips: [
      "Verifica la conectividad antes de guardar",
      "El nombre debe ser único y descriptivo",
      "Prueba la conexión después de crearla",
      "Documenta el propósito de cada conexión"
    ]
  },
  {
    label: "Editar Conexión",
    icon: <Edit className="w-4 h-4" />,
    desc: "Edita los datos de una conexión existente. Útil para actualizar credenciales, IPs o configuraciones de puerto.",
    category: "actions",
    tips: [
      "Solo usuarios autorizados pueden editar",
      "Verifica que no afecte servicios activos",
      "Guarda los cambios para que tengan efecto",
      "Notifica a otros usuarios sobre cambios críticos"
    ]
  },
  {
    label: "Eliminar Conexión",
    icon: <Trash2 className="w-4 h-4" />,
    desc: "Elimina una conexión registrada de forma permanente. Esta acción es irreversible y requiere confirmación.",
    category: "actions",
    tips: [
      "Asegúrate de que no esté siendo utilizada",
      "No se puede deshacer esta acción",
      "Verifica dependencias antes de eliminar",
      "Considera archivar en lugar de eliminar"
    ]
  },
  {
    label: "Actualizar Lista",
    icon: <RefreshCw className="w-4 h-4" />,
    desc: "Recarga la lista de conexiones desde el servidor para ver los cambios más recientes y sincronizar el estado.",
    category: "actions",
    tips: [
      "Úsalo tras agregar, editar o eliminar",
      "Se actualiza automáticamente cada 30 segundos",
      "Útil cuando trabajas en equipo"
    ]
  },
  {
    label: "Filtrar Conexiones",
    icon: <Search className="w-4 h-4" />,
    desc: "Permite buscar conexiones por nombre, IP, tipo de base de datos o descripción para encontrarlas fácilmente.",
    category: "management",
    tips: [
      "Puedes combinar múltiples criterios de búsqueda",
      "Usa filtros por tipo de BD para mayor precisión",
      "Los filtros se mantienen al cambiar de página"
    ]
  },
  {
    label: "Ordenar Lista",
    icon: <ArrowUp className="w-4 h-4 inline" />,
    desc: "Ordena la lista de conexiones por nombre, IP, tipo, fecha de creación, etc. Haz clic en el encabezado de columna para cambiar el orden.",
    category: "management",
    tips: [
      "Haz clic varias veces para alternar ascendente/descendente",
      "El orden se guarda en tu sesión",
      "Combina con filtros para mejor organización"
    ]
  },
  {
    label: "Abrir Query Tool",
    icon: <Terminal className="w-4 h-4" />,
    desc: "Accede a la herramienta Query Tool para ejecutar consultas SQL avanzadas sobre la conexión seleccionada.",
    category: "advanced",
    tips: [
      "Solo funciona para MySQL, PostgreSQL, SQL Server y MongoDB",
      "Verifica permisos de usuario antes de ejecutar",
      "Usa transacciones para consultas críticas",
      "Guarda consultas frecuentes como plantillas",
      "Visualiza estructura de la base de datos"
    ]
  },
  {
    label: "Probar Conexión",
    icon: <Zap className="w-4 h-4" />,
    desc: "Verifica el estado de conectividad de una base de datos para asegurar que esté disponible y responda correctamente.",
    category: "advanced",
    tips: [
      "Ejecuta pruebas antes de usar en producción",
      "Verifica latencia y rendimiento",
      "Documenta resultados de pruebas"
    ]
  },
  {
    label: "Información",
    icon: <BookText className="w-4 h-4" />,
    desc: "Abre este panel de ayuda contextual con explicación detallada de cada función y mejores prácticas de uso.",
    category: "help",
    tips: [
      "Consulta antes de usar funciones avanzadas",
      "Revisa las reglas de seguridad regularmente"
    ]
  }
];

const reglas: RuleItem[] = [
  {
    title: "Campos obligatorios",
    description: "Todos los campos del formulario (nombre, host, puerto, usuario, contraseña) son requeridos para registrar una conexión válida.",
    type: "warning",
    icon: <AlertCircle className="w-4 h-4" />
  },
  {
    title: "Nombres únicos",
    description: "No puedes registrar dos conexiones con el mismo nombre. Usa nombres descriptivos que identifiquen claramente el propósito.",
    type: "warning",
    icon: <AlertCircle className="w-4 h-4" />
  },
  {
    title: "Control de acceso",
    description: "Solo usuarios con permisos administrativos pueden editar, eliminar conexiones o acceder a funciones avanzadas.",
    type: "info",
    icon: <Shield className="w-4 h-4" />
  },
  {
    title: "Compatibilidad Query Tool",
    description: "La herramienta Query Tool solo está disponible para MySQL, PostgreSQL, SQL Server y MongoDB. Otros tipos de BD tienen limitaciones.",
    type: "info",
    icon: <Terminal className="w-4 h-4" />
  },
  {
    title: "Acciones irreversibles",
    description: "Eliminar una conexión no se puede deshacer y puede afectar servicios dependientes. Siempre verifica antes de proceder.",
    type: "warning",
    icon: <Trash2 className="w-4 h-4" />
  },
  {
    title: "Seguridad de credenciales",
    description: "Las contraseñas se almacenan encriptadas. Usa credenciales específicas con permisos mínimos necesarios para cada conexión.",
    type: "success",
    icon: <Shield className="w-4 h-4" />
  }
];

const categories = {
  actions: { name: 'Acciones', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  management: { name: 'Gestión', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  advanced: { name: 'Avanzado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
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

const ConexionInfoSidebar: React.FC<ConexionInfoSidebarProps> = ({ isOpen, onClose }) => {
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
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
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
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 px-6 py-4 border-b border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Centro de Ayuda</h2>
                <p className="text-indigo-100 text-sm">Gestión de Conexiones BD</p>
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
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
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border border-indigo-200 dark:border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <BookText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ¿Cómo funciona este módulo?
                </h3>
              </div>
              <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
                Gestiona, filtra y administra conexiones a bases de datos de forma centralizada. 
                Usa las funciones disponibles para agregar, editar, eliminar y consultar conexiones de manera segura y eficiente.
              </p>
            </div>

            {/* Functions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                          <div className="text-indigo-600 dark:text-indigo-400">
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
                            <div className="flex items-center gap-1 mt-2 text-indigo-600 dark:text-indigo-400">
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
                                <CheckCircle className="w-3 h-3 text-indigo-500 mt-0.5 flex-shrink-0" />
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
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-indigo-200 dark:border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  Administra tus conexiones con seguridad
                </h4>
              </div>
              <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed">
                Mantén tus datos de conexión actualizados, verifica permisos antes de realizar acciones críticas 
                y sigue las mejores prácticas de seguridad para proteger tu infraestructura de bases de datos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConexionInfoSidebar;