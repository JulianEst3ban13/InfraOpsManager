import React, { useEffect, useState } from "react";
import { Mail, X, Disc3 } from "lucide-react";

interface Mantenimiento {
  id: number;
  titulo: string;
  basededatos: string;
  fecha: string;
  created_at: string;
  tamano_antes: string;
  tamano_despues: string;
  // Otros campos que puedas necesitar
}

interface CorreosModalProps {
  isOpen: boolean;
  onClose: () => void;
  mantenimiento: Mantenimiento | null;
  onGenerateReport: (reportData: { emails: string, mantenimiento: Mantenimiento }) => Promise<void>;
}

const CorreosModal: React.FC<CorreosModalProps> = ({ isOpen, onClose, mantenimiento, onGenerateReport }) => {
  const [emails, setEmails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Cargar los emails existentes si los hubiera
    if (mantenimiento?.id) {
      // Aquí puedes hacer una petición para obtener los emails asociados si los guardas en otra tabla
      // Por ahora asumimos que no hay emails previos
      setEmails("");
    }
  }, [mantenimiento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emails.trim()) {
      setError("Debes ingresar al menos un correo electrónico");
      return;
    }

    // Validación básica de formato de emails
    const emailArray = emails.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailArray.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      setError(`Los siguientes correos no son válidos: ${invalidEmails.join(', ')}`);
      return;
    }

    if (!mantenimiento) {
      setError("No hay datos de mantenimiento para generar el informe");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Enviamos tanto los emails como todos los datos del mantenimiento
      await onGenerateReport({
        emails,
        mantenimiento
      });
      onClose();
    } catch (error) {
      setError("Error al generar el informe. Inténtalo de nuevo.");
      console.error("Error al generar el informe:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Configuración de Informe</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="cliente" className="block text-gray-700 font-medium mb-2">Cliente</label>
            <p id="cliente" className="p-2 bg-gray-100 rounded">{mantenimiento?.titulo ?? ""}</p>
          </div>

          <div className="mb-4">
            <label htmlFor="Base de datos" className="block text-gray-700 font-medium mb-2">Base de datos</label>
            <p className="p-2 bg-gray-100 rounded">{mantenimiento?.basededatos ?? ""}</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="Fecha" className="block text-gray-700 font-medium mb-2">Fecha</label>
            <p className="p-2 bg-gray-100 rounded">{mantenimiento?.fecha ?? ""}</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="Fecha final" className="block text-gray-700 font-medium mb-2">Fecha final</label>
            <p className="p-2 bg-gray-100 rounded">{mantenimiento?.created_at ?? ""}</p>
          </div>

          <div className="mb-4">
            <label htmlFor="Tamaño inicial" className="block text-gray-700 font-medium mb-2">Tamaño inicial</label>
            <p className="p-2 bg-gray-100 rounded">{mantenimiento?.tamano_antes ?? ""}</p>
          </div>

          <div className="mb-4">
            <label htmlFor="Tamaño final" className="block text-gray-700 font-medium mb-2">Tamaño final</label>
            <p className="p-2 bg-gray-100 rounded">{mantenimiento?.tamano_despues ?? ""}</p>
          </div>

          <div className="mb-4">
            <label htmlFor="Correos electrónicos" className="block text-gray-700 font-medium mb-2">
              Correos electrónicos <span className="text-sm text-gray-500">(separados por comas)</span>
            </label>
            <div className="flex items-center border rounded-md overflow-hidden">
              <div className="bg-gray-100 p-2">
                <Mail className="w-5 h-5 text-gray-500" />
              </div>
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                className="flex-1 p-2 outline-none resize-none"
                rows={3}
                placeholder="ejemplo@correo.com, otro@correo.com"
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Disc3 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                "Generar Informe"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorreosModal;