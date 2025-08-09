import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axios";
import { useForm } from "react-hook-form";

type Mantenimiento = {
  id: number;
  basededatos: string;
  titulo: string;
  fecha: string;
  tamano_antes: string;
  tamano_despues: string;
};



type ReportFormInputs = {
  cliente: string;
  mantenimientos: number[];
  emails: string;
};

// Actualiza las props para incluir onReportCreated
interface ReportFormProps {
  onClose: () => void;
  onReportCreated?: () => void;
}

const ReportFormModal: React.FC<ReportFormProps> = ({ onClose, onReportCreated }) => {
  const { handleSubmit, register } = useForm<ReportFormInputs>();
  const [mantenimientosList, setMantenimientosList] = useState<Mantenimiento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const cargarBasesDisponibles = async () => {
      try {
        const response = await axiosInstance
          .get('/bases-de-datos')
          .then((res) => {
            if (Array.isArray(res.data)) {
              setMantenimientosList(res.data);
            } else {
              console.error("❌ Error: la respuesta no es un array", res.data);
              setMantenimientosList([]);
            }
          })
          .catch((err) => {
            console.error("❌ Error al cargar mantenimientos:", err);
            setMantenimientosList([]);
          });
      } catch (error) {
        console.error("❌ Error al cargar bases de datos:", error);
        setMantenimientosList([]);
      }
    };

    cargarBasesDisponibles();
  }, []);

  const enviarInforme = async (data: ReportFormInputs) => {
    setIsLoading(true);
    setMessage("");
    setPdfUrl(null);

    // Extraer solo los IDs de mantenimientos seleccionados
    const payload = {
      ...data,
      mantenimientos: data.mantenimientos, // Enviar solo los IDs en lugar de los objetos completos
    };
  
    console.log("📤 Enviando payload:", JSON.stringify(payload, null, 2)); // Verifica la estructura antes de enviar
  
    try {
      const response = await axiosInstance.post('/reports/generate-report', payload);
      setMessage("✅ Informe generado con éxito");
      setPdfUrl(response.data.url);
  
      if (onReportCreated) {
        onReportCreated();
      }
    } catch (error: any) {
      console.error("❌ Error al generar el informe:", error);
      
      if (error.code === 'ECONNABORTED') {
        // El error es de timeout
        setMessage("✅ El informe probablemente se generó correctamente, pero la respuesta tardó demasiado. Por favor, verifica tu correo electrónico.");
        console.log("Se ha producido un timeout, pero el informe podría haberse generado correctamente.");
      } else if (error.response) {
        setMessage(`❌ Error: ${error.response.data.message || 'Error al generar el informe'}`);
      } else {
        setMessage("❌ Error al generar el informe");
      }
    } finally {
      setIsLoading(false);
    }
  };
  



  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-xl"
        >
          ✖
        </button>

        <h2 className="text-2xl font-semibold mb-4 text-center">📄 Generar Informe</h2>

        <form onSubmit={handleSubmit(enviarInforme)}>
          <div className="mb-4">
            <label htmlFor="cliente" className="block text-gray-700 mb-2">Cliente:</label>
            <input
              id="cliente"
              {...register("cliente", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="mantenimientos" className="block text-gray-700 mb-2">Mantenimientos:</label>
            <select
              id="mantenimientos"
              multiple
              {...register("mantenimientos", { required: true })}
              className="w-full p-2 border rounded"
            >
              {mantenimientosList.map(m => (
                <option key={m.id} value={m.id}>
                  {m.basededatos} - {m.tamano_antes} - {m.tamano_despues}  ({m.fecha})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="emails" className="block text-gray-700 mb-2">Emails:</label>
            <input
              id="emails"
              {...register("emails")}
              className="w-full p-2 border rounded"
              placeholder="email1@gruponw.com, email2@gruponw.com"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            disabled={isLoading}
          >
            {isLoading ? "Generando..." : "Generar Informe"}
          </button>
        </form>

        {message && (
          <p className={`mt-3 text-center font-semibold ${message.includes("✅") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}

        {/* Mostrar link de descarga si hay un PDF */}
        {pdfUrl && (
          <p className="mt-3 text-center">
            📄 <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">Descargar PDF</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default ReportFormModal;