import React from 'react';
import { Users } from 'lucide-react';

interface ClienteCardProps {
  cliente: string;
  total: number;
  index: number;
  darkMode: boolean;
  periodo?: string;
  tipo?: 'informes' | 'mantenimientos'; // Nueva prop
}

export const ClienteCard: React.FC<ClienteCardProps> = ({ 
  cliente, 
  total, 
  index, 
  darkMode,
  periodo,
  tipo = 'informes' // Valor por defecto
}) => {
  const bgColors = darkMode 
    ? ["bg-gray-700", "bg-gray-700", "bg-gray-700", "bg-gray-700", "bg-gray-700"]
    : ["bg-indigo-50", "bg-green-50", "bg-blue-50", "bg-purple-50", "bg-yellow-50"];
    
  const textColors = darkMode
    ? ["text-white", "text-white", "text-white", "text-white", "text-white"]
    : ["text-indigo-700", "text-green-700", "text-blue-700", "text-purple-700", "text-yellow-700"];
    
  const iconColors = darkMode
    ? ["text-indigo-400", "text-green-400", "text-blue-400", "text-purple-400", "text-yellow-400"]
    : ["text-indigo-500", "text-green-500", "text-blue-500", "text-purple-500", "text-yellow-500"];

  return (
    <div className={`${bgColors[index % 5]} rounded-lg p-4 flex items-center space-x-3 transition-all duration-200 hover:shadow-md`}>
      <div className={`${iconColors[index % 5]} p-2 rounded-full ${darkMode ? "bg-gray-800" : "bg-white"}`}>
        <Users className="w-6 h-6" />
      </div>
      <div>
        <p className={`font-medium truncate ${textColors[index % 5]}`}>{cliente}</p>
        <p className="text-sm opacity-70">
          {total.toLocaleString()} {total === 1 ? (tipo === 'mantenimientos' ? 'mantenimiento' : 'informe') : (tipo === 'mantenimientos' ? 'mantenimientos' : 'informes')}
          {periodo && <span className="text-xs block">{periodo}</span>}
        </p>
      </div>
    </div>
  );
}; 