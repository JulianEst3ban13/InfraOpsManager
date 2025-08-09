import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../utils/axios';

interface SendSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatePinnedTotalsChart: (data: { name: string; total: number }[]) => Promise<string>;
  monthlyTotalsHistoricos: { name: string; total: number }[];
  chartBase64: string | null;
  periodo: 'actual' | 'rango';
  periodoInicioMes: number;
  periodoInicioAnio: number;
  periodoFinMes: number;
  periodoFinAnio: number;
  setPeriodo: (periodo: 'actual' | 'rango') => void;
  setPeriodoInicioMes: (mes: number) => void;
  setPeriodoInicioAnio: (anio: number) => void;
  setPeriodoFinMes: (mes: number) => void;
  setPeriodoFinAnio: (anio: number) => void;
}

const correosFijos = [
  "andresf@gruponw.com",
  "mauriciol@gruponw.com",
  "coordinacionventas@netwoods.net",
  "infraestructura@gruponw.com"
];

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

export const SendSummaryModal: React.FC<SendSummaryModalProps> = ({
  isOpen,
  onClose,
  generatePinnedTotalsChart,
  monthlyTotalsHistoricos,
  chartBase64,
  periodo,
  periodoInicioMes,
  periodoInicioAnio,
  periodoFinMes,
  periodoFinAnio,
  setPeriodo,
  setPeriodoInicioMes,
  setPeriodoInicioAnio,
  setPeriodoFinMes,
  setPeriodoFinAnio,
}) => {
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [otrosCorreos, setOtrosCorreos] = useState("");
  const [correosFijosSeleccionados, setCorreosFijosSeleccionados] = useState<string[]>(correosFijos);

  const handleEnviarResumen = async () => {
    if (enviandoCorreo) return;
    setEnviandoCorreo(true);

    try {
      // Validar que haya al menos un correo seleccionado
      if (correosFijosSeleccionados.length === 0 && !otrosCorreos.trim()) {
        toast.error("Debe seleccionar al menos un destinatario");
        return;
      }

      // Preparar lista de correos
      const correosArray = [
        ...correosFijosSeleccionados,
        ...otrosCorreos.split(",").map(c => c.trim()).filter(c => c)
      ];

      // Validar formato de correos adicionales
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const correosInvalidos = correosArray.filter(c => !emailRegex.test(c));
      if (correosInvalidos.length > 0) {
        toast.error(`Correos inválidos: ${correosInvalidos.join(", ")}`);
        return;
      }

      // Generar gráfico de totales pineados si es necesario
      let pinnedTotalsChart = '';
      if (monthlyTotalsHistoricos.length > 0) {
        pinnedTotalsChart = await generatePinnedTotalsChart(monthlyTotalsHistoricos);
      }

      // Enviar correo
      const response = await axiosInstance.post("/aws/send-summary", {
        emails: correosArray,
        chartBase64: chartBase64 || '',
        pinnedTotalsChartBase64: pinnedTotalsChart,
        periodo,
        periodoInicio: periodo === 'rango' ? { year: periodoInicioAnio, month: periodoInicioMes } : null,
        periodoFin: periodo === 'rango' ? { year: periodoFinAnio, month: periodoFinMes } : null
      });

      if (response.data.success) {
        toast.success("Resumen enviado correctamente");
        onClose();
      } else {
        toast.error("Error al enviar el resumen: " + (response.data.message || "Error desconocido"));
      }
    } catch (err: any) {
      console.error('Error al enviar resumen:', err);
      toast.error("Error al enviar el resumen: " + (err.response?.data?.message || err.message || "Error desconocido"));
    } finally {
      setEnviandoCorreo(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Mail className="w-6 h-6 mr-2" />
            Enviar Resumen por Correo
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Selección de periodo */}
          <div className="space-y-2">
            <label className="block font-medium">Periodo a incluir:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={periodo === 'actual'}
                  onChange={() => setPeriodo('actual')}
                  className="mr-2"
                />
                Mes actual
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={periodo === 'rango'}
                  onChange={() => setPeriodo('rango')}
                  className="mr-2"
                />
                Seleccionar periodo
              </label>
            </div>
          </div>

          {periodo === 'rango' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">Desde:</label>
                <div className="flex gap-2">
                  <select
                    value={periodoInicioAnio}
                    onChange={(e) => setPeriodoInicioAnio(Number(e.target.value))}
                    className="p-2 border rounded"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={periodoInicioMes}
                    onChange={(e) => setPeriodoInicioMes(Number(e.target.value))}
                    className="p-2 border rounded"
                  >
                    {meses.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-2">Hasta:</label>
                <div className="flex gap-2">
                  <select
                    value={periodoFinAnio}
                    onChange={(e) => setPeriodoFinAnio(Number(e.target.value))}
                    className="p-2 border rounded"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={periodoFinMes}
                    onChange={(e) => setPeriodoFinMes(Number(e.target.value))}
                    className="p-2 border rounded"
                  >
                    {meses.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Lista de correos fijos */}
          <div>
            <label className="block font-medium mb-2">Destinatarios:</label>
            <div className="space-y-2 mb-4">
              {correosFijos.map(correo => (
                <label key={correo} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={correosFijosSeleccionados.includes(correo)}
                    onChange={e => {
                      if (e.target.checked) {
                        setCorreosFijosSeleccionados([...correosFijosSeleccionados, correo]);
                      } else {
                        setCorreosFijosSeleccionados(correosFijosSeleccionados.filter(c => c !== correo));
                      }
                    }}
                    className="mr-2"
                  />
                  {correo}
                </label>
              ))}
            </div>
          </div>

          {/* Campo para otros correos */}
          <div>
            <label className="block font-medium mb-2">
              Otros correos:
              <span className="text-gray-500 text-sm ml-2">(separados por coma)</span>
            </label>
            <textarea
              value={otrosCorreos}
              onChange={e => setOtrosCorreos(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            onClick={handleEnviarResumen}
            disabled={enviandoCorreo}
          >
            {enviandoCorreo ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Enviar Resumen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendSummaryModal;
