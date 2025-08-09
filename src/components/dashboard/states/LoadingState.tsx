import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  darkMode: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ darkMode }) => {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${darkMode ? "text-white" : "text-gray-800"}`}>
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
      <h3 className="text-xl font-medium mb-2">Cargando métricas</h3>
      <p className="text-sm opacity-70">Obteniendo datos en tiempo real...</p>
    </div>
  );
}; 