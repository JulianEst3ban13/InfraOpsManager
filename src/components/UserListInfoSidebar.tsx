import React, { useState, useMemo } from 'react';
import { 
  X, 
  Info, 
  Edit, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  Shield, 
  AlertTriangle, 
  Database, 
  Search, 
  HelpCircle, 
  BookText,
  Lightbulb,
  Plus,
  Download
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
  type: 'info' | 'warning';
  icon: React.ReactNode;
  tips?: string[];
}

const funciones: DetailItem[] = [
  {
    label: "Nuevo Usuario",
    icon: <Plus className="w-4 h-4" />,
    desc: "Abre un formulario para crear un nuevo usuario en el sistema, asignarle un perfil y una contraseña.",
    category: "actions",
    tips: [
      "Asegúrate de que el nombre de usuario y el correo electrónico sean únicos.",
      "La contraseña debe cumplir con los requisitos de seguridad definidos.",
      "Puedes asignar una foto de perfil para identificarlo fácilmente."
    ]
  },
  {
    label: "Editar Usuario",
    icon: <Edit className="w-4 h-4" />,
    desc: "Modifica los datos de un usuario existente, como su perfil, compañía o estado.",
    category: "actions",
    tips: [
      "No se puede cambiar el nombre de usuario una vez creado.",
      "Desde aquí puedes inactivar a un usuario o restablecer su contraseña."
    ]
  },
  {
    label: "Activar/Inactivar Usuario",
    icon: <Trash2 className="w-4 h-4" />,
    desc: "Cambia el estado de un usuario. Un usuario inactivo no podrá iniciar sesión en el sistema.",
    category: "actions",
    tips: [
      "Esta acción es reversible.",
      "Es recomendable inactivar en vez de eliminar para conservar el historial."
    ]
  },
  {
    label: "Ver Historial de Sesiones",
    icon: <CheckCircle className="w-4 h-4" />,
    desc: "Muestra un registro detallado de los inicios de sesión del usuario, incluyendo fecha, IP y navegador.",
    category: "features",
    tips: [
      "Útil para auditorías de seguridad.",
      "Permite detectar actividad sospechosa en la cuenta."
    ]
  },
  {
    label: "Búsqueda y Filtros",
    icon: <Search className="w-4 h-4" />,
    desc: "Utiliza la barra de herramientas para buscar usuarios por nombre/email o filtrarlos por perfil y estado.",
    category: "features",
    tips: [
      "Puedes combinar múltiples filtros para refinar tu búsqueda.",
      "Usa el botón 'Limpiar Filtros' para volver a la vista completa."
    ]
  },
  {
    label: "Cambiar Contraseña",
    icon: <RefreshCw className="w-4 h-4" />,
    desc: "Accede a esta opción desde el menú contextual para asignar una nueva contraseña a un usuario.",
    category: "features",
    tips: [
      "Útil si un usuario olvida su contraseña y no puede recuperarla.",
      "Se recomienda notificar al usuario después de realizar el cambio."
    ]
  },
  {
    label: "Exportar Usuarios a Excel",
    icon: <Download className="w-4 h-4" />,
    desc: "Descarga una hoja de cálculo (.xlsx) con los usuarios mostrados en la tabla, aplicando los filtros actuales.",
    category: "features",
    tips: [
      "La exportación respeta los filtros aplicados.",
      "El archivo es útil para reportes o auditorías.",
      "El botón se desactiva si no hay datos para exportar."
    ]
  }
];
    
const reglas: RuleItem[] = [
  {
    title: "Gestión por Permisos",
    description: "Las acciones como crear, editar o inactivar usuarios están restringidas por los permisos de tu perfil.",
    type: "info",
    icon: <Shield className="w-4 h-4" />,
    tips: [
      "Si no puedes realizar una acción, es probable que no tengas el permiso necesario.",
      "Contacta a un administrador para solicitar una revisión de tus permisos."
    ]
  },
  {
    title: "Requisitos de Contraseña",
    description: "Al crear o cambiar una contraseña, esta debe cumplir con los criterios de seguridad definidos.",
    type: "warning",
    icon: <AlertTriangle className="w-4 h-4" />,
    tips: [
      "Mínimo 8 caracteres.",
      "Debe incluir al menos una letra mayúscula, un número y un carácter especial."
    ]
  },
  {
    title: "Eliminación de Usuarios",
    description: "Eliminar un usuario es una acción irreversible. Se recomienda inactivar en vez de eliminar para conservar el historial.",
    type: "warning",
    icon: <AlertTriangle className="w-4 h-4" />,
    tips: [
      "Verifica dos veces antes de eliminar un usuario.",
      "Solo los administradores pueden eliminar usuarios."
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
  }
};

interface UserListInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserListInfoSidebar: React.FC<UserListInfoSidebarProps> = ({ isOpen, onClose }) => {
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

  const toggleExpanded = (itemLabel: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemLabel)) {
      newExpanded.delete(itemLabel);
    } else {
      newExpanded.add(itemLabel);
    }
    setExpandedItems(newExpanded);
  };

  const toggleExpandedRule = (ruleTitle: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleTitle)) {
      newExpanded.delete(ruleTitle);
    } else {
      newExpanded.add(ruleTitle);
    }
    setExpandedRules(newExpanded);
  };

  const handleSupportClick = () => {
    alert('Contactando al soporte técnico...');
  };

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
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 px-6 py-4 border-b border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Centro de Ayuda</h2>
                <p className="text-indigo-100 text-sm">Gestión de Usuarios</p>
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {filteredFunciones.length} función{filteredFunciones.length !== 1 ? 'es' : ''} encontrada{filteredFunciones.length !== 1 ? 's' : ''}
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
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ¿Cómo funciona este módulo?
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed">
                    Este módulo te permite gestionar los usuarios del sistema. Aquí puedes crear nuevos usuarios, editar información, asignar perfiles y controlar el acceso de cada persona. Utiliza las herramientas de búsqueda y filtros para encontrar usuarios fácilmente y mantén actualizada la información de la organización.
                  </p>
                </div>
              </div>
            </div>

            {/* Functions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Funciones Disponibles
              </h3>
              <div className="space-y-4">
                {filteredFunciones.map((item) => (
                  <div
                    key={item.label}
                    className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
                      onClick={() => item.tips && toggleExpanded(item.label)}
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
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categories[item.category].color}`}>
                              {categories[item.category].name}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                            {item.desc}
                          </p>
                          {item.tips && (
                            <div className="flex items-center gap-1 mt-2 text-indigo-600 dark:text-indigo-400">
                              <Lightbulb className="w-3 h-3" />
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

                {filteredFunciones.length === 0 && (
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
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Reglas y Advertencias
              </h3>
              <div className="space-y-3">
                {filteredReglas.map((regla) => (
                  <div
                    key={regla.title}
                    className={`rounded-xl border ${ruleTypes[regla.type].color} overflow-hidden`}
                  >
                    <div
                      className={`p-4 ${regla.tips ? 'cursor-pointer hover:bg-opacity-80' : ''}`}
                      onClick={() => regla.tips && toggleExpandedRule(regla.title)}
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
                          {regla.tips && (
                            <div className={`flex items-center gap-1 mt-2 ${ruleTypes[regla.type].iconColor}`}>
                              <Lightbulb className="w-3 h-3" />
                              <span className="text-xs font-medium">
                                {expandedRules.has(regla.title) ? 'Ver menos' : 'Ver consejos'}
                              </span>
                              <div className={`transform transition-transform duration-200 ${expandedRules.has(regla.title) ? 'rotate-180' : ''}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Rule Tips */}
                    {expandedRules.has(regla.title) && regla.tips && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="pt-4">
                          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                            Información Adicional
                          </h5>
                          <div className="space-y-2">
                            {regla.tips.map((tip, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <Info className="w-3 h-3 text-indigo-500 mt-0.5 flex-shrink-0" />
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

                {filteredReglas.length === 0 && searchTerm && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No se encontraron reglas para "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-indigo-200 dark:border-slate-600">
  <div className="flex items-center gap-3 mb-2">
    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
    </div>
    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
      Mejores prácticas para la gestión de usuarios
    </h4>
  </div>
  <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed mb-3">
    Mantén actualizada la información de los usuarios, asigna perfiles adecuados y revisa periódicamente los accesos. Recuerda inactivar usuarios que ya no requieran acceso y promover el uso de contraseñas seguras.
  </p>
  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
    Para más ayuda, contacta al{' '}
    <button 
      onClick={handleSupportClick}
      className="text-indigo-600 dark:text-indigo-400 hover:underline focus:underline focus:outline-none bg-transparent border-none p-0 cursor-pointer"
    >
      soporte técnico
    </button>
    .
  </p>
</div>
          </div>
        </div>
      </div>
    </>
  );
};

// Componente de ejemplo para mostrar el sidebar en funcionamiento
const ExampleUsage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-8 ">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Revisiones de Backup
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Gestiona y verifica el estado de las revisiones diarias
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Info className="w-4 h-4" />
              Ayuda
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aquí estaría la tabla de revisiones de backup. 
                <br />
                <span className="text-sm">Haz clic en "Ayuda" para ver el panel de información.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <UserListInfoSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
    </div>
  );
};

export default UserListInfoSidebar;
