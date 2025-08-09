import React, { useState, useEffect, useMemo, useRef } from "react";
import type { MonthlyChartModalProps } from "./MonthlyChartModal";
import AwsBudgetModal from "./AwsBudgetModal";
import { Line, Bar, Pie } from "react-chartjs-2";
import axiosInstance from "../utils/axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from "chart.js";
import { Edit2, Trash2, BarChart2, PieChart, LineChart, RefreshCw, PlusCircle, Mail, Edit3, BookText } from "lucide-react";
import { PinMonthlyTotalButton } from "./PinMonthlyTotalButton";
import { useAuth } from '../context/AuthContext';
import { BarChart } from "./dashboard/charts/BarChart";
import MonthlyChartModal from "./MonthlyChartModal";
import AwsCostInfoSidebar from "./AwsCostInfoSidebar";
import AwsSendSummaryModal from "./AwsSendSummaryModal";
import { toast } from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

// Configurar Chart.js para modo headless (sin animaciones)
ChartJS.defaults.animation = false;
ChartJS.defaults.responsive = false;

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const getWeekNumber = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

interface Presupuesto {
  year: number;
  month: number;
  value: number;
}

interface CostoDiario {
  id?: number;
  year: number;
  month: number;
  day: number;
  week: number;
  value: number;
}



const AwsCostDashboard: React.FC = () => {
  // Obtener usuario autenticado
  // Estado para totales pineados
  const [pinnedTotals, setPinnedTotals] = useState<{ id?: number; year: number; month: number; total?: number; user_id?: number; pinned_at?: string }[]>([]);

  // Fetch pineos
  const fetchPinnedTotals = async () => {
    try {
      const res = await axiosInstance.get('/aws/pinned-totals');
      setPinnedTotals(res.data || []);
    } catch (e) {
      setPinnedTotals([]);
    }
  };

  useEffect(() => {
    fetchPinnedTotals();
  }, []);
  // Obtener usuario autenticado
  const { user } = useAuth();
  // ...otros hooks y estados

  // --- MOVER AQUÍ LA FUNCIÓN fetchData ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Consultar presupuesto mensual
      const budgetRes = await axiosInstance.get("/aws/budget", {
        params: { year: filtroAnio, month: filtroMes }
      });
      setPresupuestos(budgetRes.data ? [budgetRes.data] : []);
      // Consultar costos diarios
      const costRes = await axiosInstance.get("/aws/cost", {
        params: { year: filtroAnio, month: filtroMes }
      });
      setCostos(costRes.data || []);
    } catch (err) {
      setPresupuestos([]);
      setCostos([]);
    } finally {
      setLoading(false);
    }
  };
  // --- FIN DE LA FUNCIÓN fetchData ---

  // Función para obtener totales pineados para el gráfico mensual
  const fetchPinnedTotalsForChart = async () => {
    try {
      const response = await axiosInstance.get("/aws/pinned-totals-chart");
      setMonthlyTotalsHistoricos(response.data || []);
    } catch (err) {
      setMonthlyTotalsHistoricos([]);
    }
  };

  // Función para generar gráfico de totales pineados
  const generatePinnedTotalsChart = async (pinnedData: { name: string; total: number }[]) => {
    return new Promise<string>((resolve) => {
      // Crear un canvas temporal
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve('');
        return;
      }

      // Configurar el fondo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 400);

      // Configurar el gráfico
      const padding = 60;
      const chartWidth = canvas.width - 2 * padding;
      const chartHeight = canvas.height - 2 * padding;
      
      // Encontrar valores máximos
      const maxTotal = Math.max(...pinnedData.map(d => d.total));
      const minTotal = Math.min(...pinnedData.map(d => d.total));
      
      // Configurar colores
      const barColor = '#16a34a';
      const textColor = '#374151';
      const gridColor = '#e5e7eb';
      
      // Dibujar líneas de cuadrícula
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
      }

      // Dibujar barras
      const barWidth = chartWidth / pinnedData.length * 0.8;
      const barSpacing = chartWidth / pinnedData.length * 0.2;
      
      pinnedData.forEach((data, index) => {
        const x = padding + (chartWidth / pinnedData.length) * index + barSpacing / 2;
        const barHeight = ((data.total - minTotal) / (maxTotal - minTotal || 1)) * chartHeight;
        const y = canvas.height - padding - barHeight;
        
        // Dibujar barra
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Dibujar valor en la barra
        ctx.fillStyle = textColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.total.toLocaleString(), x + barWidth / 2, y - 5);
        
        // Dibujar etiqueta del mes (ajustando el índice del mes)
        const [year, month] = data.name.split('-');
        const monthName = meses[Number(month)] || month;
        // Rotar el texto para mejor visualización cuando hay muchos meses
        ctx.save();
        ctx.translate(x + barWidth / 2, canvas.height - padding + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(`${monthName} ${year}`, 0, 0);
        ctx.restore();
      });

      // Título del gráfico
      ctx.fillStyle = textColor;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Totales Acumulados Pineados por Mes', canvas.width / 2, 25);

      // Convertir a base64
      const base64 = canvas.toDataURL('image/png', 1.0);
      resolve(base64);
    });
  };

  // ...// Estados principales

  const [costos, setCostos] = useState<CostoDiario[]>([]);

  // Calcular totales mensuales agrupados por año y mes
  const monthlyTotals = useMemo(() => {
    const agrupado: Record<string, number> = {};
    costos.forEach(c => {
      const key = `${c.year}-${c.month}`;
      agrupado[key] = (agrupado[key] || 0) + c.value;
    });
    return agrupado;
  }, [costos]);
  const [costosHistoricos, setCostosHistoricos] = useState<CostoDiario[]>([]);
  const [monthlyTotalsHistoricos, setMonthlyTotalsHistoricos] = useState<{ name: string; total: number }[]>([]);
  const [lastFetchMonthlyHistory, setLastFetchMonthlyHistory] = useState<number | null>(null);



  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [showEditCostModal, setShowEditCostModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [costToEdit, setCostToEdit] = useState<CostoDiario | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Presupuesto | null>(null);
  const [filtroAnio, setFiltroAnio] = useState(currentYear);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth());
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showMonthlyChartModal, setShowMonthlyChartModal] = useState(false);

  const [chartFullScreen, setChartFullScreen] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [guardandoCosto, setGuardandoCosto] = useState(false);
  const [editandoCosto, setEditandoCosto] = useState(false);
  const [editandoPresupuesto, setEditandoPresupuesto] = useState(false);
  const [showDeleteCostModal, setShowDeleteCostModal] = useState(false);
  const [costToDelete, setCostToDelete] = useState<CostoDiario | null>(null);
  const [eliminandoCosto, setEliminandoCosto] = useState(false);
  const [diasOcupados, setDiasOcupados] = useState<number[]>([]);
  const [periodo, setPeriodo] = useState<'actual' | 'rango'>('actual');
  const [periodoInicioMes, setPeriodoInicioMes] = useState(filtroMes);
  const [periodoInicioAnio, setPeriodoInicioAnio] = useState(filtroAnio);
  const [periodoFinMes, setPeriodoFinMes] = useState(filtroMes);
  const [periodoFinAnio, setPeriodoFinAnio] = useState(filtroAnio);

  // Formulario de nuevo costo diario
  const [formAnio, setFormAnio] = useState(currentYear);
  const [formMes, setFormMes] = useState(new Date().getMonth());
  const [formDia, setFormDia] = useState(1);
  const [formValor, setFormValor] = useState("");

  // Formulario de edición de costo diario
  const [editValor, setEditValor] = useState("");

  // Formulario de edición de presupuesto
  const [editBudgetValor, setEditBudgetValor] = useState("");

  const semana = getWeekNumber(formAnio, formMes, formDia);

  // Función para actualizar días ocupados
  const actualizarDiasOcupados = () => {
    const diasConCostos = costos.map(c => c.day);
    setDiasOcupados(diasConCostos);

    // Si el día actual está ocupado, sugerir el siguiente disponible
    if (diasConCostos.includes(formDia)) {
      const proximoDiaDisponible = encontrarProximoDiaDisponible(formDia, diasConCostos);
      if (proximoDiaDisponible) {
        setFormDia(proximoDiaDisponible);
        toast.success(`Día ${formDia} ocupado. Cambiado automáticamente al día ${proximoDiaDisponible}.`);
      }
    }
  };

  // Función para encontrar el próximo día disponible
  const encontrarProximoDiaDisponible = (diaActual: number, diasOcupados: number[]): number | null => {
    for (let dia = diaActual + 1; dia <= 31; dia++) {
      if (!diasOcupados.includes(dia)) {
        return dia;
      }
    }
    // Si no hay días disponibles después, buscar antes
    for (let dia = diaActual - 1; dia >= 1; dia--) {
      if (!diasOcupados.includes(dia)) {
        return dia;
      }
    }
    return null; // No hay días disponibles
  };

  // Consultar presupuesto y costos diarios al cargar/cambiar filtros
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Consultar presupuesto mensual
        const budgetRes = await axiosInstance.get("/aws/budget", {
          params: { year: filtroAnio, month: filtroMes }
        });
        setPresupuestos(budgetRes.data ? [budgetRes.data] : []);
        // Consultar costos diarios
        const costRes = await axiosInstance.get("/aws/cost", {
          params: { year: filtroAnio, month: filtroMes }
        });
        setCostos(costRes.data || []);
      } catch (err) {
        setPresupuestos([]);
        setCostos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filtroAnio, filtroMes]);

  // Guardar costo diario en la base de datos
  const handleAgregarCosto = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir múltiples envíos
    if (guardandoCosto) return;

    // Validar que el día no esté ocupado
    if (diasOcupados.includes(formDia)) {
      toast.error(`El día ${formDia} ya tiene un costo registrado. Por favor seleccione otro día.`);
      return;
    }

    setGuardandoCosto(true);

    try {
      const response = await axiosInstance.post("/aws/cost", {
        year: formAnio,
        month: formMes,
        day: formDia,
        week: semana,
        value: Number(formValor)
      });

      if (response.data.success) {
        setShowAddCostModal(false);
        setFormValor("");
        setFormDia(1);
        setFormMes(new Date().getMonth());
        setFormAnio(currentYear);

        // Refrescar datos
        const costRes = await axiosInstance.get("/aws/cost", {
          params: { year: filtroAnio, month: filtroMes }
        });
        setCostos(costRes.data || []);

        // Usar información del backend para el toast
        const createdCost = response.data.createdCost;
        toast.success(`Costo de $${createdCost.value.toLocaleString()} agregado para el día ${createdCost.day} de ${meses[createdCost.month]} ${createdCost.year}`);
      } else {
        toast.error("Error al guardar el costo diario: " + (response.data.message || "Error desconocido"));
      }
    } catch (err: any) {
      console.error('Error al agregar costo:', err);

      // Manejar error de día duplicado específicamente
      if (err.response?.status === 409 && err.response?.data?.error === 'DUPLICATE_DAY_COST') {
        const errorData = err.response.data;
        const existingCost = errorData.existingCost;
        const suggestedDay = errorData.suggestedDay;

        // Mostrar mensaje informativo con sugerencia
        toast.error(
          `Ya existe un costo de $${existingCost.value.toLocaleString()} para el día ${existingCost.day} de ${meses[existingCost.month]} ${existingCost.year}. ` +
          `Sugerencia: Use el día ${suggestedDay} o edite el costo existente.`,
          { duration: 6000 } // Mostrar por más tiempo
        );

        // Opcionalmente, actualizar el día sugerido en el formulario
        if (suggestedDay <= 31) { // Validar que no exceda los días del mes
          setFormDia(suggestedDay);
        }
      } else if (err.response?.status === 400) {
        toast.error("Error en la solicitud: " + (err.response.data.message || "Datos inválidos"));
      } else {
        toast.error("Error al guardar el costo diario: " + (err.response?.data?.message || err.message || "Error desconocido"));
      }
    } finally {
      setGuardandoCosto(false);
    }
  };

  // Guardar presupuesto mensual en la base de datos
  const handleAgregarPresupuesto = async (data: { year: number; month: number; value: number }) => {
    try {
      await axiosInstance.post("/aws/budget", data);
      setShowBudgetModal(false);
      // Refrescar presupuesto
      const budgetRes = await axiosInstance.get("/aws/budget", {
        params: { year: filtroAnio, month: filtroMes }
      });
      setPresupuestos(budgetRes.data ? [budgetRes.data] : []);
      toast.success(`Presupuesto de $${data.value.toLocaleString()} agregado para ${meses[data.month]} ${data.year}`);
    } catch (err) {
      toast.error("Error al guardar el presupuesto");
    }
  };

  // Mostrar modal de confirmación para eliminar costo diario
  const handleConfirmarEliminarCosto = (costo: CostoDiario) => {
    setCostToDelete(costo);
    setShowDeleteCostModal(true);
  };

  // Eliminar costo diario
  const handleEliminarCosto = async () => {
    if (!costToDelete) return;

    // Prevenir múltiples envíos
    if (eliminandoCosto) return;

    setEliminandoCosto(true);

    try {
      const response = await axiosInstance.delete(`/aws/cost/${costToDelete.id}`);

      // Verificar si la eliminación fue exitosa
      if (response.data.success) {
        // Refrescar datos
        const costRes = await axiosInstance.get("/aws/cost", {
          params: { year: filtroAnio, month: filtroMes }
        });
        setCostos(costRes.data || []);

        // Cerrar modal y limpiar estado
        setShowDeleteCostModal(false);
        setCostToDelete(null);

        // Usar la información del backend para el toast
        const deletedCost = response.data.deletedCost;
        toast.success(`Costo de $${deletedCost.value.toLocaleString()} eliminado del día ${deletedCost.day} de ${meses[deletedCost.month]} ${deletedCost.year}`);
      } else {
        toast.error("Error al eliminar el costo diario: " + (response.data.message || "Error desconocido"));
      }
    } catch (err: any) {
      console.error('Error al eliminar costo:', err);

      // Manejar diferentes tipos de errores
      if (err.response?.status === 404) {
        toast.error("El costo diario no fue encontrado. Puede que ya haya sido eliminado.");
      } else if (err.response?.status === 400) {
        toast.error("Error en la solicitud: " + (err.response.data.message || "Parámetros inválidos"));
      } else {
        toast.error("Error al eliminar el costo diario: " + (err.response?.data?.message || err.message || "Error desconocido"));
      }
    } finally {
      setEliminandoCosto(false);
    }
  };

  // Editar costo diario
  const handleEditarCosto = (costo: CostoDiario) => {
    setCostToEdit(costo);
    setEditValor(costo.value.toString());
    setShowEditCostModal(true);
  };

  const handleGuardarEdicionCosto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costToEdit) return;

    // Prevenir múltiples envíos
    if (editandoCosto) return;

    setEditandoCosto(true);

    try {
      await axiosInstance.put(`/aws/cost/${costToEdit.id}`, { value: Number(editValor) });
      setShowEditCostModal(false);
      setCostToEdit(null);
      // Refrescar datos
      const costRes = await axiosInstance.get("/aws/cost", {
        params: { year: filtroAnio, month: filtroMes }
      });
      setCostos(costRes.data || []);
      toast.success(`Costo actualizado a $${Number(editValor).toLocaleString()}`);
    } catch (err: any) {
      toast.error("Error al editar el costo diario: " + (err.response?.data?.message || err.message || "Error desconocido"));
    } finally {
      setEditandoCosto(false);
    }
  };

  // Eliminar presupuesto mensual
  const handleEliminarPresupuesto = async () => {
    if (!window.confirm("¿Estás seguro de eliminar el presupuesto de este mes?")) return;
    try {
      await axiosInstance.delete(`/aws/budget`, {
        params: { year: filtroAnio, month: filtroMes }
      });
      // Refrescar presupuesto
      setPresupuestos([]);
      toast.success(`Presupuesto eliminado. Ahora puede agregar un nuevo presupuesto para ${meses[filtroMes]} ${filtroAnio}`);
    } catch (err) {
      toast.error("Error al eliminar el presupuesto");
    }
  };

  // Editar presupuesto mensual
  const handleEditarPresupuesto = (presupuesto: Presupuesto) => {
    setBudgetToEdit(presupuesto);
    setEditBudgetValor(presupuesto.value.toString());
    setShowEditBudgetModal(true);
  };

  const handleGuardarEdicionPresupuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetToEdit) return;

    // Prevenir múltiples envíos
    if (editandoPresupuesto) return;

    setEditandoPresupuesto(true);

    try {
      await axiosInstance.put(`/aws/budget`, {
        year: budgetToEdit.year,
        month: budgetToEdit.month,
        value: Number(editBudgetValor)
      });
      setShowEditBudgetModal(false);
      setBudgetToEdit(null);
      // Refrescar presupuesto
      const budgetRes = await axiosInstance.get("/aws/budget", {
        params: { year: filtroAnio, month: filtroMes }
      });
      setPresupuestos(budgetRes.data ? [budgetRes.data] : []);
      toast.success(`Presupuesto actualizado a $${Number(editBudgetValor).toLocaleString()} para ${meses[budgetToEdit.month]} ${budgetToEdit.year}`);
    } catch (err: any) {
      toast.error("Error al editar el presupuesto: " + (err.response?.data?.message || err.message || "Error desconocido"));
    } finally {
      setEditandoPresupuesto(false);
    }
  };

  // Filtrar los costos según año y mes (ya vienen filtrados del backend)
  const costosFiltrados = costos;
  const sumaCostos = costosFiltrados.reduce((acc, c) => acc + Number(c.value), 0);

  // Buscar presupuesto para el mes/año filtrado
  const presupuestoActual = presupuestos.find(p => p.year === filtroAnio && p.month === filtroMes);
  const avance = presupuestoActual && presupuestoActual.value > 0
    ? (sumaCostos / presupuestoActual.value) * 100
    : 0;
  const excedido = presupuestoActual && sumaCostos > presupuestoActual.value;

  // Preparar datos para el gráfico
  const dias = costosFiltrados.map(c => c.day);
  const valores = costosFiltrados.map(c => c.value);

  const chartData = {
    labels: dias,
    datasets: [
      {
        label: "Costo Diario (USD)",
        data: valores,
        fill: false,
        borderColor: "#6366f1",
        backgroundColor: "#6366f1",
        tension: 0.2
      }
    ]
  };

  const barData = {
    labels: dias,
    datasets: [
      {
        label: "Costo Diario (USD)",
        data: valores,
        backgroundColor: "#6366f1"
      }
    ]
  };

  const pieData = {
    labels: dias.map(d => `Día ${d}`),
    datasets: [
      {
        label: "Costo Diario (USD)",
        data: valores,
        backgroundColor: [
          '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff',
          '#fbbf24', '#f59e42', '#f87171', '#34d399', '#60a5fa', '#f472b6', '#facc15', '#4ade80', '#f87171', '#a3e635', '#fbbf24', '#f472b6', '#818cf8', '#f59e42', '#6366f1', '#f87171', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#fbbf24', '#f59e42', '#f87171', '#34d399', '#60a5fa', '#f472b6', '#facc15'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "top" as const
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Día"
        }
      },
      y: {
        title: {
          display: true,
          text: "Costo (USD)"
        },
        beginAtZero: true
      }
    }
  };

  const lineChartRef = useRef<any>(null);
  const barChartRef = useRef<any>(null);
  const pieChartRef = useRef<any>(null);
  const exportLineChartRef = useRef<any>(null);
  const [preview, setPreview] = useState<string>('');

  // Función para forzar el renderizado del gráfico
  const forceChartRender = (chartRef: any) => {
    if (chartRef.current && chartRef.current.chartInstance) {
      console.log('🔄 Forzando renderizado del gráfico...');
      chartRef.current.chartInstance.update('none'); // Actualizar sin animación
      return true;
    }
    return false;
  };

  // Función mejorada para obtener el base64 del gráfico (grande)
  const getChartBase64 = async (chartRef: any) => {
    return new Promise<string>((resolve) => {
      // Forzar renderizado primero
      forceChartRender(chartRef);

      // Aumentar el timeout para dar más tiempo al renderizado
      setTimeout(() => {
        try {
          console.log('🔍 Buscando canvas del gráfico...');
          console.log('chartRef.current:', chartRef.current);

          if (chartRef.current) {
            console.log('chartRef.current.canvas:', chartRef.current.canvas);
            console.log('chartRef.current.chartInstance:', chartRef.current.chartInstance);

            // Intentar diferentes formas de acceder al canvas
            let canvas = null;
            if (chartRef.current.canvas) {
              canvas = chartRef.current.canvas;
            } else if (chartRef.current.chartInstance && chartRef.current.chartInstance.canvas) {
              canvas = chartRef.current.chartInstance.canvas;
            } else if (chartRef.current.querySelector && chartRef.current.querySelector('canvas')) {
              canvas = chartRef.current.querySelector('canvas');
            }

            if (canvas) {
              console.log('✅ Canvas encontrado:', canvas);
              const base64 = canvas.toDataURL('image/png', 1.0);
              console.log('Base64 generado:', base64?.substring(0, 30), 'length:', base64?.length);
              resolve(base64);
            } else {
              console.error('❌ No se encontró el canvas del gráfico');
              resolve('');
            }
          } else {
            console.error('❌ chartRef.current es null o undefined');
            resolve('');
          }
        } catch (err) {
          console.error('❌ Error generando base64:', err);
          resolve('');
        }
      }, 1000); // Aumentar a 1 segundo
    });
  };

  return (
    <div className="p-6">
      {/* BARRA DE HERRAMIENTAS UNIFICADA */}
      <div className="flex flex-wrap gap-2 items-center bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
        <h1 className="text-xl font-bold text-gray-900 mr-4">Dashboard Costos Diarios AWS</h1>

        <select
          value={filtroAnio}
          onChange={e => setFiltroAnio(Number(e.target.value))}
          className="p-2 border rounded-md text-sm"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={filtroMes}
          onChange={e => setFiltroMes(Number(e.target.value))}
          className="p-2 border rounded-md text-sm"
        >
          {meses.map((m, idx) => (
            <option key={m} value={idx}>{m}</option>
          ))}
        </select>

        <button
          onClick={() => {
            // Refrescar datos manualmente
            (async () => {
              setLoading(true);
              try {
                const budgetRes = await axiosInstance.get("/aws/budget", {
                  params: { year: filtroAnio, month: filtroMes }
                });
                setPresupuestos(budgetRes.data ? [budgetRes.data] : []);
                const costRes = await axiosInstance.get("/aws/cost", {
                  params: { year: filtroAnio, month: filtroMes }
                });
                setCostos(costRes.data || []);
              } catch (err) {
                setPresupuestos([]);
                setCostos([]);
              } finally {
                setLoading(false);
              }
            })();
          }}
          className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Actualizar
        </button>

        <button
          onClick={() => {
            actualizarDiasOcupados();
            setShowAddCostModal(true);
          }}
          className="flex items-center bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm"
        >
          <PlusCircle className="w-4 h-4 mr-1" />
          Agregar Costo
        </button>

        <div className="relative">
          <button
            onClick={() => {
              if (presupuestoActual) {
                // Si ya existe presupuesto, mostrar mensaje y permitir editar
                toast.success(`Presupuesto existente: $${presupuestoActual.value.toLocaleString()}. Abriendo editor...`);
                handleEditarPresupuesto(presupuestoActual);
              } else {
                // Si no existe presupuesto, abrir modal para crear
                setShowBudgetModal(true);
              }
            }}
            className={`flex items-center px-3 py-2 rounded text-sm ${presupuestoActual
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            title={presupuestoActual
              ? `Ya existe presupuesto para ${meses[filtroMes]} ${filtroAnio}. Haga clic para editar.`
              : `Agregar presupuesto para ${meses[filtroMes]} ${filtroAnio}`
            }
          >
            {presupuestoActual ? (
              <Edit3 className="w-4 h-4 mr-1" />
            ) : (
              <PlusCircle className="w-4 h-4 mr-1" />
            )}
            {presupuestoActual ? 'Editar Presupuesto' : 'Agregar Presupuesto'}
          </button>
          {presupuestoActual && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              ✓
            </div>
          )}
        </div>

        <button
          onClick={() => setShowChartModal(true)}
          className="flex items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
          disabled={costosFiltrados.length === 0}
        >
          <BarChart2 className="w-4 h-4 mr-1" />
          Ver Gráfico
        </button>
        <button
          onClick={() => setShowMonthlyChartModal(true)}
          className="flex items-center bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm"
        >
          <BarChart2 className="w-4 h-4 mr-1" />
          Gráfica Totales Mensuales
        </button>

        <button
          onClick={() => setShowEmailModal(true)}
          className="flex items-center bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-sm"
        >
          <Mail className="w-4 h-4 mr-1" />
          Enviar Resumen
        </button>
        <button
          onClick={() => setShowInfoSidebar(true)}
          className="flex items-center bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 text-sm ml-2"
          type="button"
          aria-label="Información del módulo"
        >
          <BookText className="w-5 h-5 mr-2" />
          Información
        </button>
      </div>
      {/* Resumen de presupuesto y avance */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Resumen de Costos ({meses[filtroMes]} {filtroAnio})</h2>
          <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-2">
            <div>
              <span className="font-medium">Presupuesto mensual: </span>
              {presupuestoActual ? (
                <span className="text-indigo-700 font-bold">${presupuestoActual.value.toLocaleString()}</span>
              ) : (
                <span className="text-gray-400">No definido</span>
              )}
              {presupuestoActual && (
                <>
                  <button
                    className="ml-2 text-indigo-600 hover:text-indigo-900"
                    title="Editar presupuesto"
                    onClick={() => handleEditarPresupuesto(presupuestoActual)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="ml-1 text-red-600 hover:text-red-900"
                    title="Eliminar presupuesto"
                    onClick={handleEliminarPresupuesto}
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
            <div>
              <span className="font-medium">Gasto acumulado: </span>
              <span className={excedido ? "text-red-600 font-bold" : "text-green-700 font-bold"}>${sumaCostos.toLocaleString()}</span>
              {user && (
                <PinMonthlyTotalButton
                  year={filtroAnio}
                  month={filtroMes + 1}
                  total={sumaCostos}
                  userId={user.id}
                  isPinned={pinnedTotals.some(pt => pt.year === filtroAnio && pt.month === (filtroMes + 1))}
                  onPinned={fetchPinnedTotals}
                />
              )}
            </div>
            <div>
              <span className="font-medium">% Avance: </span>
              {presupuestoActual && presupuestoActual.value > 0 ? (
                <span className={excedido ? "text-red-600 font-bold" : "text-green-700 font-bold"}>{avance.toFixed(2)}%</span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            {excedido && (
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded font-semibold">¡Excedido!</div>
            )}
          </div>
        </div>
      </div>
      {/* Tabla de costos diarios filtrados */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Costos Diarios ({meses[filtroMes]} {filtroAnio})</h2>
          {loading ? (
            <div className="text-center text-gray-400 py-4">Cargando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Año</th>
                  <th className="p-2">Mes</th>
                  <th className="p-2">Día</th>
                  <th className="p-2">Semana</th>
                  <th className="p-2">Valor</th>
                  <th className="p-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {costosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-4">No hay datos</td></tr>
                ) : (
                  costosFiltrados.map((c, idx) => (
                    <tr key={idx}>
                      <td className="p-2">{c.year}</td>
                      <td className="p-2">{meses[c.month]}</td>
                      <td className="p-2">{c.day}</td>
                      <td className="p-2">{c.week}</td>
                      <td className="p-2">${c.value.toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <button
                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                          title="Editar"
                          onClick={() => handleEditarCosto(c)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                          onClick={() => handleConfirmarEliminarCosto(c)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Gráfico de líneas oculto para exportar PNG grande - SIEMPRE DISPONIBLE */}
      <div style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: 800,
        height: 400,
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: -1
      }}>
        <Line
          ref={exportLineChartRef}
          data={chartData}
          options={{
            ...chartOptions,
            responsive: false,
            maintainAspectRatio: false,
            animation: false, // Desactivar animaciones para renderizado más rápido
            plugins: {
              ...chartOptions.plugins,
              legend: {
                display: false // Ocultar leyenda para el gráfico de exportación
              }
            }
          }}
          width={800}
          height={400}
        />
      </div>

      {/* Modal para el gráfico de costos diarios */}
      {showChartModal && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${chartFullScreen ? 'p-0' : ''}`}>
          <div className={`bg-white rounded-lg p-6 ${chartFullScreen ? 'w-screen h-screen max-w-none max-h-none' : 'w-full max-w-2xl'} relative flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gráfico de Costos Diarios <span className='text-lg font-normal text-gray-500 ml-2'>({meses[filtroMes]} {filtroAnio})</span></h2>
              <div className="flex gap-2">
                <button
                  className="text-gray-500 hover:text-gray-700 border px-2 py-1 rounded"
                  onClick={() => setChartFullScreen(f => !f)}
                  title={chartFullScreen ? 'Reducir' : 'Ampliar'}
                >
                  {chartFullScreen ? '⤢ Reducir' : '⤢ Ampliar'}
                </button>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
                  onClick={() => setShowChartModal(false)}
                  title="Cerrar"
                >
                  ×
                </button>
              </div>
            </div>
            {/* Selector de tipo de gráfico */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setChartType('line')}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors border ${chartType === 'line' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                <LineChart className="w-5 h-5" /> Línea
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors border ${chartType === 'bar' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                <BarChart2 className="w-5 h-5" /> Barras
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors border ${chartType === 'pie' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                <PieChart className="w-5 h-5" /> Torta
              </button>
            </div>
            <div className={`flex-1 flex items-center justify-center text-gray-400 ${chartFullScreen ? '' : 'h-96'}`}>
              {costosFiltrados.length === 0 ? (
                <span>No hay datos para mostrar el gráfico.</span>
              ) : (
                <>
                  {/* Contenedor especial para el gráfico de torta */}
                  {chartType === 'pie' ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: chartFullScreen ? 900 : 750, height: chartFullScreen ? 700 : 550, margin: '0 auto' }}>
                      <Pie
                        ref={pieChartRef}
                        data={pieData}
                        options={{
                          ...chartOptions,
                          responsive: false,
                          maintainAspectRatio: false,
                          plugins: {
                            ...chartOptions.plugins,
                            legend: {
                              display: true,
                              position: 'right',
                              labels: {
                                font: { size: pieData.labels.length < 10 ? 16 : 12 },
                                boxWidth: 18,
                                padding: 16
                              }
                            }
                          },
                          scales: {
                            x: { display: false },
                            y: { display: false }
                          }
                        }}
                        width={chartFullScreen ? 700 : 550}
                        height={chartFullScreen ? 700 : 550}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '100%', maxWidth: chartFullScreen ? 1000 : 600, height: chartFullScreen ? 500 : 350, margin: '0 auto' }}>
                      {chartType === 'line' && <Line ref={lineChartRef} data={chartData} options={{ ...chartOptions, responsive: true, maintainAspectRatio: true }} />}
                      {chartType === 'bar' && <Bar ref={barChartRef} data={barData} options={{ ...chartOptions, responsive: true, maintainAspectRatio: true }} />}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Botón de prueba y preview (ahora debajo de toda la gráfica) */}
            {/*
            <div className="my-2 flex flex-col items-center w-full">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={async () => {
                    const base64 = await getChartBase64(exportLineChartRef);
                    setPreview(base64);
                  }}
                  className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded"
                >
                  Probar Base64
                </button>
                <button
                  onClick={async () => {
                    const base64 = await getChartBase64(exportLineChartRef);
                    if (base64) {
                      const a = document.createElement('a');
                      a.href = base64;
                      a.download = 'grafico.png';
                      a.click();
                    }
                  }}
                  className="bg-blue-200 text-blue-900 px-2 py-1 rounded"
                >
                  Descargar PNG
                </button>
              </div>
              {preview && (
                <div>
                  <div>Longitud: {preview.length}</div>
                  <img src={preview} alt="Preview" style={{ maxWidth: 400, border: '1px solid #ccc' }} />
                </div>
              )}
            </div>
            */}
          </div>
        </div>
      )}
      {/* Modal para agregar costo diario */}
      {showAddCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Agregar Costo Diario</h2>
            <form onSubmit={handleAgregarCosto}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <select
                    value={formAnio}
                    onChange={e => setFormAnio(Number(e.target.value))}
                    className={`w-full p-2 border rounded-md ${guardandoCosto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={guardandoCosto}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                  <select
                    value={formMes}
                    onChange={e => setFormMes(Number(e.target.value))}
                    className={`w-full p-2 border rounded-md ${guardandoCosto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={guardandoCosto}
                  >
                    {meses.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
                  <select
                    value={formDia}
                    onChange={e => setFormDia(Number(e.target.value))}
                    className={`w-full p-2 border rounded-md ${guardandoCosto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={guardandoCosto}
                  >
                    {Array.from({ length: 31 }, (_, i) => {
                      const dia = i + 1;
                      const estaOcupado = diasOcupados.includes(dia);
                      return (
                        <option
                          key={dia}
                          value={dia}
                          className={estaOcupado ? 'text-red-600' : ''}
                        >
                          {dia} {estaOcupado ? '(No disponible)' : ''}
                        </option>
                      );
                    })}
                  </select>

                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semana</label>
                  <input
                    type="text"
                    value={semana}
                    readOnly
                    className={`w-full p-2 border rounded-md ${guardandoCosto ? 'bg-gray-200' : 'bg-gray-100'}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    type="number"
                    min="0"
                    value={formValor}
                    onChange={e => setFormValor(e.target.value)}
                    className={`w-full p-2 border rounded-md ${guardandoCosto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    required
                    disabled={guardandoCosto}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCostModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={guardandoCosto}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded flex items-center gap-2 ${guardandoCosto
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  disabled={guardandoCosto}
                >
                  {guardandoCosto ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal para editar costo diario */}
      {showEditCostModal && costToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Editar Costo Diario</h2>
            <form onSubmit={handleGuardarEdicionCosto}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input
                  type="number"
                  min="0"
                  value={editValor}
                  onChange={e => setEditValor(e.target.value)}
                  className={`w-full p-2 border rounded-md ${editandoCosto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  disabled={editandoCosto}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditCostModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={editandoCosto}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded flex items-center gap-2 ${editandoCosto
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  disabled={editandoCosto}
                >
                  {editandoCosto ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal para editar presupuesto mensual */}
      {showEditBudgetModal && budgetToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Editar Presupuesto Mensual</h2>
            <form onSubmit={handleGuardarEdicionPresupuesto}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input
                  type="number"
                  min="0"
                  value={editBudgetValor}
                  onChange={e => setEditBudgetValor(e.target.value)}
                  className={`w-full p-2 border rounded-md ${editandoPresupuesto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  disabled={editandoPresupuesto}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditBudgetModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={editandoPresupuesto}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded flex items-center gap-2 ${editandoPresupuesto
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  disabled={editandoPresupuesto}
                >
                  {editandoPresupuesto ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal para enviar resumen por correo */}
      <AwsSendSummaryModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        generatePinnedTotalsChart={generatePinnedTotalsChart}
        monthlyTotalsHistoricos={monthlyTotalsHistoricos}
        chartBase64={exportLineChartRef.current ? exportLineChartRef.current.toBase64Image() : null}
        periodo={periodo}
        periodoInicioMes={periodoInicioMes}
        periodoInicioAnio={periodoInicioAnio}
        periodoFinMes={periodoFinMes}
        periodoFinAnio={periodoFinAnio}
        setPeriodo={setPeriodo}
        setPeriodoInicioMes={setPeriodoInicioMes}
        setPeriodoInicioAnio={setPeriodoInicioAnio}
        setPeriodoFinMes={setPeriodoFinMes}
        setPeriodoFinAnio={setPeriodoFinAnio}
      />
      {/* Modal de confirmación para eliminar costo diario */}
      {showDeleteCostModal && costToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h2>
                <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">¿Estás seguro de eliminar este costo diario?</h3>
              <div className="text-sm text-red-700 space-y-1">
                <p><span className="font-medium">Fecha:</span> {costToDelete.day} de {meses[costToDelete.month]} {costToDelete.year}</p>
                <p><span className="font-medium">Semana:</span> {costToDelete.week}</p>
                <p><span className="font-medium">Valor:</span> <span className="font-bold">${costToDelete.value.toLocaleString()}</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteCostModal(false);
                  setCostToDelete(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                disabled={eliminandoCosto}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarCosto}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${eliminandoCosto
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                disabled={eliminandoCosto}
              >
                {eliminandoCosto ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* <AwsCostChart
        data={costosHistoricos}
        months={meses}
        years={years}
        currentYear={anioActual}
        currentMonth={mesActual}
        budget={presupuestoActual}
        totalCost={sumaCostos}
        progress={avance}
        ref={exportLineChartRef}
        monthlyTotals={Object.entries(monthlyTotals).map(([name, total]) => ({ name, total: Number(total) }))}
      /> */}
      <AwsBudgetModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        onSubmit={handleAgregarPresupuesto}
      />
      {showMonthlyChartModal && (
        <MonthlyChartModal
          onClose={() => setShowMonthlyChartModal(false)}
          fetchAllCosts={fetchPinnedTotalsForChart}
          monthlyTotals={monthlyTotalsHistoricos}
        />
      )}
      <AwsCostInfoSidebar isOpen={showInfoSidebar} onClose={() => setShowInfoSidebar(false)} />
    </div>
  );
};

export default AwsCostDashboard;
