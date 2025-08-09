import { Pin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from '../utils/axios';
import React from 'react';

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface Props {
  year: number;
  month: number;
  total: number;
  userId?: number;
  isPinned?: boolean;
  onPinned?: () => void;
}

export const PinMonthlyTotalButton: React.FC<Props> = ({ year, month, total, userId, isPinned, onPinned }) => {
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  
  React.useEffect(() => {
    if (isPinned) setSuccess(true);
    else setSuccess(false);
  }, [isPinned]);



  const handlePin = async () => {
    // Si ya está pineado, no hacer nada
    if (isPinned) {
      const mesNombre = meses[month - 1] || month;
      toast.info(`El total para ${mesNombre} ${year} ya está guardado`);
      return;
    }

    setLoading(true);
    try {
      await axios.post('/aws/pin-total', { year, month, total, user_id: userId });
      setSuccess(true);
      const mesNombre = meses[month - 1] || month; // month - 1 porque month viene en base 1
      toast.success(`Total pineado para ${mesNombre} ${year}`);
      if (onPinned) onPinned();
    } catch (e) {
      toast.error('Error al guardar el total');
    }
    setLoading(false);
  };

  return (
    <button
      className={`ml-2 p-2 rounded transition-colors ${
        isPinned 
          ? 'bg-green-100 border border-green-300 cursor-default' 
          : loading 
            ? 'bg-gray-100 cursor-not-allowed' 
            : 'hover:bg-yellow-100 border border-gray-200'
      }`}
      disabled={loading || isPinned}
      title={isPinned ? `Total guardado para ${meses[month - 1]} ${year}` : success ? "Total guardado" : `Guardar gasto acumulado de ${meses[month - 1]} ${year}`}
      onClick={handlePin}
    >
      <Pin className={`w-5 h-5 ${isPinned ? 'text-green-600' : success ? 'text-yellow-600' : 'text-gray-500'}`} fill={isPinned ? '#16a34a' : success ? '#ca8a04' : 'none'} />
    </button>
  );
};
