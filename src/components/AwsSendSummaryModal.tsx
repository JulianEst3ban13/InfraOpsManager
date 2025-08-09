import React, { useState } from 'react';
import { Mail, X, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../utils/axios';

interface PeriodoActualPayload {
  emails: string[];
  chartImage: string | null;
  pinnedTotalsChartBase64: string;
  year: number;
  month: number;
  budgetData?: {
    monthlyBudget: number;
    accumulatedCost: number;
    budgetUsagePercentage: number;
    daysInMonth: number;
    daysWithData: number;
  };
}

interface PeriodoRangoPayload {
  emails: string[];
  chartImage: string | null;
  pinnedTotalsChartBase64: string;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  budgetData?: {
    totalBudget: number;
    totalCost: number;
    budgetUsagePercentage: number;
    monthsInRange: number;
  };
}

interface AwsSendSummaryModalProps {
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
  // Nuevas props para datos de presupuesto
  monthlyBudget?: number;
  currentMonthCost?: number;
  totalRangeCost?: number;
  dailyCosts?: { date: string; cost: number }[];
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

export const AwsSendSummaryModal: React.FC<AwsSendSummaryModalProps> = ({
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
  // Nuevos props
  monthlyBudget = 0,
  currentMonthCost = 0,
  totalRangeCost = 0,
  dailyCosts = [],
}) => {
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [correosSeleccionados, setCorreosSeleccionados] = useState<string[]>(correosFijos);
  const [mostrarCorreosDisponibles, setMostrarCorreosDisponibles] = useState(false);

  // Obtener correos disponibles que no están seleccionados
  const correosDisponibles = correosFijos.filter(correo => !correosSeleccionados.includes(correo));

  const agregarCorreo = (correo: string) => {
    if (!correosSeleccionados.includes(correo)) {
      setCorreosSeleccionados([...correosSeleccionados, correo]);
    }
  };

  const quitarCorreo = (correo: string) => {
    setCorreosSeleccionados(correosSeleccionados.filter(c => c !== correo));
  };

  const agregarNuevoCorreo = () => {
    const correoLimpio = nuevoCorreo.trim();
    if (!correoLimpio) return;

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoLimpio)) {
      toast.error("Formato de correo inválido");
      return;
    }

    if (!correosSeleccionados.includes(correoLimpio)) {
      setCorreosSeleccionados([...correosSeleccionados, correoLimpio]);
      setNuevoCorreo("");
    } else {
      toast.error("Este correo ya está agregado");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarNuevoCorreo();
    }
  };

  // Función para calcular datos de presupuesto del mes actual
  const calcularDatosPresupuestoActual = () => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysWithData = dailyCosts.filter(d => d.cost > 0).length || now.getDate();
    const budgetUsagePercentage = monthlyBudget > 0 ? (currentMonthCost / monthlyBudget) * 100 : 0;
    return {
      monthlyBudget: monthlyBudget || 0,
      accumulatedCost: currentMonthCost || 0,
      budgetUsagePercentage: Math.round(budgetUsagePercentage * 100) / 100,
      daysInMonth,
      daysWithData
    };
  };

  // Función para obtener el nombre del mes
  const getNombreMes = (numeroMes: number) => {
    return meses[numeroMes] || 'Mes desconocido';
  };

  // Función para calcular datos de presupuesto del rango
  const calcularDatosPresupuestoRango = () => {
    // Calcular cuántos meses hay en el rango
    const monthsInRange = ((periodoFinAnio - periodoInicioAnio) * 12) + (periodoFinMes - periodoInicioMes) + 1;
    const totalBudget = monthlyBudget * monthsInRange;
    const budgetUsagePercentage = totalBudget > 0 ? (totalRangeCost / totalBudget) * 100 : 0;
    return {
      totalBudget: totalBudget || 0,
      totalCost: totalRangeCost || 0,
      budgetUsagePercentage: Math.round(budgetUsagePercentage * 100) / 100,
      monthsInRange
    };
  };

  // Función para mostrar el periodo seleccionado
  const obtenerDescripcionPeriodo = () => {
    if (periodo === 'actual') {
      const mesActual = new Date().getMonth();
      const anioActual = new Date().getFullYear();
      return `${getNombreMes(mesActual)} ${anioActual}`;
    } else {
      const mesInicioNombre = getNombreMes(periodoInicioMes);
      const mesFinNombre = getNombreMes(periodoFinMes);
      
      if (periodoInicioAnio === periodoFinAnio) {
        if (periodoInicioMes === periodoFinMes) {
          return `${mesInicioNombre} ${periodoInicioAnio}`;
        } else {
          return `${mesInicioNombre} - ${mesFinNombre} ${periodoInicioAnio}`;
        }
      } else {
        return `${mesInicioNombre} ${periodoInicioAnio} - ${mesFinNombre} ${periodoFinAnio}`;
      }
    }
  };

  const handleEnviarResumen = async () => {
    if (enviandoCorreo) return;
    setEnviandoCorreo(true);

    try {
      // Validaciones iniciales
      if (correosSeleccionados.length === 0) {
        toast.error("Debe seleccionar al menos un destinatario");
        return;
      }

      if (!chartBase64) {
        toast.error("No hay gráfico para enviar. Por favor, asegúrese de que la gráfica se haya generado correctamente.");
        return;
      }

      // Verificar formato de base64
      if (chartBase64 && !chartBase64.startsWith('data:image')) {
        console.error('El chartBase64 no tiene el formato correcto de data URL');
        toast.error("Error: El formato de la imagen no es válido");
        return;
      }

      // Generar gráfico de totales pineados si es necesario
      let pinnedTotalsChart = '';
      try {
        if (monthlyTotalsHistoricos.length > 0) {
          console.log('Generando gráfico de totales pineados...');
          pinnedTotalsChart = await generatePinnedTotalsChart(monthlyTotalsHistoricos);
          console.log('Gráfico generado exitosamente');
        }
      } catch (error) {
        console.error('Error al generar el gráfico:', error);
      }

      let response;
      
      if (periodo === 'actual') {
        // Para mes actual: obtener el mes y año actual
        const now = new Date();
        const mesActual = now.getMonth(); // 0-11 (Enero = 0)
        const anioActual = now.getFullYear();
        
        // Calcular datos de presupuesto
        const budgetData = calcularDatosPresupuestoActual();
        
        console.log('📅 Enviando resumen del mes actual:', {
          mes: mesActual + 1, // Para mostrar en log (1-12)
          mesNombre: getNombreMes(mesActual),
          año: anioActual,
          mesParaBackend: mesActual, // Backend espera 0-11
          budgetData
        });

        const payload: PeriodoActualPayload = {
          emails: correosSeleccionados,
          chartImage: chartBase64,
          pinnedTotalsChartBase64: pinnedTotalsChart,
          year: anioActual,
          month: mesActual, // Enviar 0-11 al backend
          budgetData // Incluir datos de presupuesto
        };

        console.log('🚀 Payload mes actual:', {
          ...payload,
          chartImage: payload.chartImage ? `presente (${payload.chartImage.length} chars)` : 'ausente',
          pinnedTotalsChartBase64: payload.pinnedTotalsChartBase64 ? `presente (${payload.pinnedTotalsChartBase64.length} chars)` : 'ausente',
          budgetData: payload.budgetData
        });

        response = await axiosInstance.post("/aws/send-cost-summary", payload);
        
      } else {
        // Para periodo de rango: validar que las fechas sean lógicas
        if (periodoInicioAnio > periodoFinAnio || 
            (periodoInicioAnio === periodoFinAnio && periodoInicioMes > periodoFinMes)) {
          toast.error("La fecha de inicio no puede ser posterior a la fecha de fin");
          return;
        }

        // Calcular datos de presupuesto para el rango
        const budgetData = calcularDatosPresupuestoRango();

        console.log('📅 Enviando resumen de periodo:', {
          desde: `${getNombreMes(periodoInicioMes)} ${periodoInicioAnio}`,
          hasta: `${getNombreMes(periodoFinMes)} ${periodoFinAnio}`,
          mesInicioBackend: periodoInicioMes, // 0-11
          mesFinBackend: periodoFinMes, // 0-11
          budgetData
        });

        const payload: PeriodoRangoPayload = {
          emails: correosSeleccionados,
          chartImage: chartBase64,
          pinnedTotalsChartBase64: pinnedTotalsChart,
          startYear: periodoInicioAnio,
          startMonth: periodoInicioMes, // Ya está en formato 0-11
          endYear: periodoFinAnio,
          endMonth: periodoFinMes, // Ya está en formato 0-11
          budgetData // Incluir datos de presupuesto
        };

        console.log('🚀 Payload periodo rango:', {
          ...payload,
          chartImage: payload.chartImage ? `presente (${payload.chartImage.length} chars)` : 'ausente',
          pinnedTotalsChartBase64: payload.pinnedTotalsChartBase64 ? `presente (${payload.pinnedTotalsChartBase64.length} chars)` : 'ausente'
        });

        response = await axiosInstance.post("/aws/send-multi-month-cost-summary", payload);
      }

      if (response.data.success) {
        console.log('✅ Respuesta exitosa:', response.data);
        toast.success(`Resumen enviado correctamente para el periodo: ${obtenerDescripcionPeriodo()}`);
        onClose();
      } else {
        console.error('❌ Error en la respuesta:', response.data);
        throw new Error(response.data.message || "Error desconocido");
      }
      
    } catch (err: any) {
      console.error('❌ Error detallado:', err);
      console.error('📤 Respuesta del servidor:', err.response?.data);
      
      let errorMessage = "Error al enviar el resumen: ";
      if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += "Error desconocido";
      }
      toast.error(errorMessage);
    } finally {
      setEnviandoCorreo(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Mail className="w-6 h-6 mr-2" />
            Enviar Resumen por Correo
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 text-xl"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Selección de periodo */}
          <div className="space-y-3">
            <label className="block font-medium text-gray-700">Periodo a incluir:</label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={periodo === 'actual'}
                  onChange={() => setPeriodo('actual')}
                  className="mr-2 text-indigo-600"
                />
                <span className="text-gray-700">Mes actual</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={periodo === 'rango'}
                  onChange={() => setPeriodo('rango')}
                  className="mr-2 text-indigo-600"
                />
                <span className="text-gray-700">Seleccionar periodo</span>
              </label>
            </div>
            
            {/* Mostrar el periodo seleccionado */}
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Periodo seleccionado:</strong> {obtenerDescripcionPeriodo()}
              </p>
            </div>
          </div>

          {periodo === 'rango' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block font-medium mb-2 text-gray-700">Desde:</label>
                <div className="flex gap-2">
                  <select
                    value={periodoInicioAnio}
                    onChange={(e) => setPeriodoInicioAnio(Number(e.target.value))}
                    className="p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={periodoInicioMes}
                    onChange={(e) => setPeriodoInicioMes(Number(e.target.value))}
                    className="p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {meses.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-2 text-gray-700">Hasta:</label>
                <div className="flex gap-2">
                  <select
                    value={periodoFinAnio}
                    onChange={(e) => setPeriodoFinAnio(Number(e.target.value))}
                    className="p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={periodoFinMes}
                    onChange={(e) => setPeriodoFinMes(Number(e.target.value))}
                    className="p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {meses.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Destinatarios con tags */}
          <div>
            <label className="block font-medium mb-3 text-gray-700">Destinatarios:</label>
            
            {/* Correos seleccionados como tags */}
            <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem] p-3 border rounded-lg bg-gray-50">
              {correosSeleccionados.length === 0 ? (
                <span className="text-gray-400 italic">No hay destinatarios seleccionados</span>
              ) : (
                correosSeleccionados.map(correo => (
                  <span
                    key={correo}
                    className="inline-flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {correo}
                    <button
                      onClick={() => quitarCorreo(correo)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                      title={`Quitar ${correo}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Agregar correos disponibles */}
            {correosDisponibles.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setMostrarCorreosDisponibles(!mostrarCorreosDisponibles)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {mostrarCorreosDisponibles ? 'Ocultar' : 'Agregar'} correos predefinidos
                </button>
                
                {mostrarCorreosDisponibles && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {correosDisponibles.map(correo => (
                      <button
                        key={correo}
                        onClick={() => {
                          agregarCorreo(correo);
                          if (correosDisponibles.length === 1) {
                            setMostrarCorreosDisponibles(false);
                          }
                        }}
                        className="inline-flex items-center bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 px-3 py-1 rounded-full text-sm border border-gray-300 hover:border-indigo-300 transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {correo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Campo para agregar nuevos correos */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Agregar nuevo correo:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={nuevoCorreo}
                  onChange={e => setNuevoCorreo(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="correo@ejemplo.com"
                />
                <button
                  onClick={agregarNuevoCorreo}
                  disabled={!nuevoCorreo.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Presiona Enter o haz clic en + para agregar
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
          <button
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            onClick={handleEnviarResumen}
            disabled={enviandoCorreo || correosSeleccionados.length === 0}
          >
            {enviandoCorreo ? (
              <React.Fragment>
                <span className="animate-spin mr-2">⌛</span>
                Enviando...
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Mail className="w-4 h-4 mr-2" />
                Enviar Resumen
              </React.Fragment>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AwsSendSummaryModal;