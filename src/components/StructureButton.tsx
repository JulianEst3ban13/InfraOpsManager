import React, { useState, useEffect } from 'react';
import { FolderTree, ChevronDown, ChevronRight } from 'lucide-react';
import axiosInstance from '../utils/axios';

interface StructureButtonProps {
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
  connectionId: number;
  dbType: "mysql" | "pgsql" | "sqlserver" | "mongodb";
  onStructureLoaded?: (structure: any) => void;
}

interface DatabaseStructure {
  schemas: Array<{ name: string; type: string; }>;
  tables: Array<{ schema: string; name: string; type: string; }>;
  views: Array<{ schema: string; name: string; type: string; }>;
  functions: Array<{ schema: string; name: string; type: string; }>;
  triggers: Array<{ schema: string; name: string; table: string; type: string; }>;
  sequences: Array<{ schema: string; name: string; type: string; }>;
}

const StructureButton: React.FC<StructureButtonProps> = ({ 
  isVisible, 
  onToggle,
  connectionId,
  dbType,
  onStructureLoaded
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [structure, setStructure] = useState<DatabaseStructure | null>(null);

  const loadDatabaseStructure = async () => {
    if (structure) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Cargando estructura de la base de datos...');
      const response = await axiosInstance.post('/get-database-structure', {
        connectionId,
        dbType
      });
      console.log('✅ Estructura cargada:', response.data);
      setStructure(response.data);
      if (onStructureLoaded) {
        onStructureLoaded(response.data);
      }
    } catch (error) {
      console.error('❌ Error al cargar la estructura:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    const newVisibility = !isVisible;
    onToggle(newVisibility);
    if (newVisibility && !structure) {
      loadDatabaseStructure();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center px-3 py-1 rounded ${
        isVisible ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
      }`}
      title="Ver estructura de la base de datos"
      aria-expanded={isVisible}
      disabled={isLoading}
    >
      <FolderTree size={16} className="mr-1" />
      Estructura {isVisible ? <ChevronDown size={16} className="ml-1" /> : <ChevronRight size={16} className="ml-1" />}
      {isLoading && (
        <div className="ml-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current" />
      )}
    </button>
  );
};

export default StructureButton; 