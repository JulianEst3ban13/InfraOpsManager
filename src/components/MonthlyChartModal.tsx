import React, { useEffect } from "react";
import { BarChart } from "./dashboard/charts/BarChart";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export interface MonthlyChartModalProps {
  onClose: () => void;
  fetchAllCosts: () => Promise<void>;
  monthlyTotals: { name: string; total: number }[];
}

const MonthlyChartModal: React.FC<MonthlyChartModalProps> = ({ 
  onClose, 
  fetchAllCosts, 
  monthlyTotals 
}) => {
  useEffect(() => {
    fetchAllCosts();
  }, []);

  // Debug: Verificar los datos
  useEffect(() => {
    console.log('=== DEBUG MONTHLY CHART MODAL ===');
    console.log('monthlyTotals:', monthlyTotals);
    if (monthlyTotals && monthlyTotals.length > 0) {
      console.log('Primer elemento:', monthlyTotals[0]);
      console.log('Último elemento:', monthlyTotals[monthlyTotals.length - 1]);
      console.log('¿Datos son progresivos?', 
        monthlyTotals.every((item, index) => 
          index === 0 || item.total >= monthlyTotals[index - 1].total
        )
      );
    }
  }, [monthlyTotals]);

  // Asegurar que los datos estén en el formato correcto
  const formattedData = React.useMemo(() => {
    if (!monthlyTotals || monthlyTotals.length === 0) {
      return [];
    }
    
    return monthlyTotals.map(item => {
      const [year, month] = item.name.split('-');
      const monthName = meses[Number(month) - 1] || month; // month - 1 porque month viene en base 1
      return {
        name: `${monthName} ${year}`,
      total: Number(item.total) || 0 // Asegurar que sea número
      };
    });
  }, [monthlyTotals]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl relative">
        <h2 className="text-xl font-bold mb-4">Totales Acumulados Pineados por Mes</h2>
        
                  {/* Información de resumen */}
        {formattedData.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Resumen de Totales Pineados:</strong> {formattedData.length} meses • 
                Total más alto: ${Math.max(...formattedData.map(d => d.total)).toLocaleString()} • 
                Promedio: ${(formattedData.reduce((sum, d) => sum + d.total, 0) / formattedData.length).toLocaleString(undefined, {maximumFractionDigits: 0})}
            </p>
          </div>
        )}

        {/* El contenedor debe tener una altura específica, no usar h-96 */}
        <div style={{ height: '400px' }}>
          {formattedData.length > 0 ? (
            <BarChart
              data={formattedData}
              darkMode={false}
              color="#16a34a"
              title="Evolución de Totales Acumulados Pineados"
              subtitle={`${formattedData.length} meses con totales guardados`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No hay totales pineados para mostrar. Guarda algunos totales acumulados para ver el gráfico.</p>
            </div>
          )}
        </div>

        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-xl"
          onClick={onClose}
          title="Cerrar gráfica"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default MonthlyChartModal;