import React, { useEffect, useRef } from "react";
import { Mail } from "lucide-react";

interface Mantenimiento {
  id: number;
  titulo: string;
  basededatos: string;
  // Otros campos que puedas necesitar
}

interface ContextMenuProps {
  x: number;
  y: number;
  mantenimiento: Mantenimiento;
  onClose: () => void;
  onConfigureEmails: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, mantenimiento, onClose, onConfigureEmails }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Ajustar posición para que no se salga de la pantalla
  const menuStyle = {
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`,
    zIndex: 1000,
  } as React.CSSProperties;

  return (
    <div
      ref={menuRef}
      className="bg-white border rounded shadow-lg p-2 w-64"
      style={menuStyle}
    >
      <div className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
        {mantenimiento.titulo}
      </div>
      
      <ul>
        <li 
          className="px-3 py-2 hover:bg-indigo-100 rounded cursor-pointer flex items-center"
          onClick={() => {
            onConfigureEmails();
            onClose();
          }}
        >
          <Mail className="w-4 h-4 mr-2 text-indigo-600" />
          Configurar notificaciones
        </li>
        {/* Puedes añadir más opciones al menú contextual aquí */}
      </ul>
    </div>
  );
};

export default ContextMenu;