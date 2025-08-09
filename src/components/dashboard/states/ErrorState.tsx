import React from 'react';
import { XCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  darkMode: boolean;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, darkMode, onRetry }) => {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${darkMode ? "text-white" : "text-gray-800"}`}>
      <XCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-xl font-medium mb-2">Error al cargar datos</h3>
      <p className="text-sm opacity-70 mb-4">{message}</p>
      <button 
        onClick={onRetry} 
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
      >
        Reintentar
      </button>
    </div>
  );
}; 