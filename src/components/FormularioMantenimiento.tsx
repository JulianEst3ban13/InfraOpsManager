import React, { useState } from "react";
import axiosInstance from "../utils/axios";

interface ModalInformeProps {
  mantenimiento: any;
  onClose: () => void;
}

const ModalInforme: React.FC<ModalInformeProps> = ({ mantenimiento, onClose }) => {
  const [emails, setEmails] = useState<string>("");
  const [autor, setAutor] = useState<string>("Andrés Flórez E.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiBaseUrl] = useState<string>(process.env.API_BASE_URL ?? "http://localhost");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const emailList = emails.split(",").map(email => email.trim()).filter(email => email);

      console.log("🚀 Iniciando generación de informe...");
      const startTime = Date.now();

      const response = await axiosInstance.post('/reports/generate-report', {
        mantenimientos: [mantenimiento],
        cliente: mantenimiento.titulo,
        emails: emailList,
        autor,
        database: mantenimiento.basededatos,
        initialSize: mantenimiento.tamano_antes,
        finalSize: mantenimiento.tamano_despues
      });

      const timeElapsed = Date.now() - startTime;
      console.log(`✅ Informe generado en ${timeElapsed}ms`);

      setSuccess("Informe generado y enviado correctamente");
      console.log("📄 Detalles del informe:", response.data);
    } catch (err: any) {
      console.error("❌ Error al generar informe:", err);
      
      if (err.code === 'ECONNABORTED') {
        console.log("⏰ Timeout detectado - La generación está en proceso...");
        setSuccess("El informe está siendo generado. Por favor, espere unos minutos y verifique su correo electrónico. No es necesario volver a intentarlo.");
      } else if (err.response) {
        console.error("📝 Detalles del error:", {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        setError(`Error: ${err.response.data.message || 'Error al generar el informe'}`);
      } else if (err.request) {
        console.error("📡 Error de red:", err.request);
        setError("Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.");
      } else {
        console.error("🔥 Error inesperado:", err.message);
        setError("Error al generar el informe. Por favor intente nuevamente.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Generar Informe de Mantenimiento</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input 
                type="text" 
                value={mantenimiento.titulo} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base de Datos</label>
              <input 
                type="text" 
                value={mantenimiento.basededatos} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño Inicial</label>
              <input 
                type="text" 
                value={mantenimiento.tamano_antes} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label htmlFor="tamano_despues" className="block text-sm font-medium text-gray-700 mb-1">Tamaño Final</label>
              <input 
                type="text" 
                value={mantenimiento.tamano_despues} 
                readOnly 
                className="w-full p-2 border rounded-md bg-gray-100"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Correos electrónicos (separados por comas)</label>
            <input 
              type="text" 
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="ejemplo1@correo.com, ejemplo2@correo.com"
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Autor del informe</label>
            <input 
              type="text" 
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          {error && <div className="mb-4 text-red-500">{error}</div>}
          {success && <div className="mb-4 text-green-500">{success}</div>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGenerating ? "Generando..." : "Generar Informe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalInforme;