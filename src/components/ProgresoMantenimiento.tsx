import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import config from "../config/config";
import { toast } from "react-hot-toast";

interface ProgresoMantenimientoProps {
  mantenimientoId: number;
}

// Conectarse al socket para recibir actualizaciones
const socket = io(`${config.apiBaseUrl}:${config.wsPort}`, {
  transports: ['websocket', 'polling'],
  path: '/socket.io',
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  forceNew: true
});

const ProgresoMantenimiento: React.FC<ProgresoMantenimientoProps> = ({ mantenimientoId }) => {
  const [progreso, setProgreso] = useState<number>(0);
  const [estado, setEstado] = useState<string>('Iniciando...');
  const [completado, setCompletado] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Escuchar el progreso del mantenimiento específico
    const onProgresoMantenimiento = (data: { id: number, progreso: number, estado: string }) => {
      if (data.id === mantenimientoId) {
        setProgreso(data.progreso);
        setEstado(data.estado);
        
        if (data.progreso >= 100) {
          setCompletado(true);
          toast.success('¡Mantenimiento completado con éxito!');
        }
      }
    };

    // Escuchar errores del mantenimiento
    const onErrorMantenimiento = (data: { id: number, error: string }) => {
      if (data.id === mantenimientoId) {
        setError(data.error);
        toast.error(`Error en el mantenimiento: ${data.error}`);
      }
    };

    // Escuchar la finalización del mantenimiento
    const onMantenimientoCompletado = (data: { id: number }) => {
      if (data.id === mantenimientoId) {
        setCompletado(true);
        setProgreso(100);
        setEstado('Completado');
        toast.success('¡Mantenimiento completado con éxito!');
      }
    };

    // Suscribirse a los eventos
    socket.on('progreso-mantenimiento', onProgresoMantenimiento);
    socket.on('error-mantenimiento', onErrorMantenimiento);
    socket.on('mantenimiento-completado', onMantenimientoCompletado);

    // Limpiar al desmontar
    return () => {
      socket.off('progreso-mantenimiento', onProgresoMantenimiento);
      socket.off('error-mantenimiento', onErrorMantenimiento);
      socket.off('mantenimiento-completado', onMantenimientoCompletado);
    };
  }, [mantenimientoId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4">Progreso del Mantenimiento</h3>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex justify-between">
              <span className="text-gray-700">{estado}</span>
              <span className="text-gray-700">{progreso}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className={`h-4 rounded-full ${completado ? 'bg-green-500' : 'bg-blue-500'}`} 
                style={{ width: `${progreso}%` }}
              ></div>
            </div>
            
            {completado ? (
              <div className="text-center">
                <p className="text-green-600 font-medium mb-4">¡Mantenimiento completado con éxito!</p>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => window.location.reload()}
                >
                  Actualizar la página
                </button>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">
                Por favor, no cierre esta ventana mientras el mantenimiento está en progreso.
                Este proceso puede tardar varios minutos dependiendo del tamaño de la base de datos.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProgresoMantenimiento; 