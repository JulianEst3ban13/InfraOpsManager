import React, { useState } from "react";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

interface AwsBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { year: number; month: number; value: number }) => void;
}

const AwsBudgetModal: React.FC<AwsBudgetModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth());
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setError("Por favor ingresa un presupuesto válido y mayor a 0.");
      return;
    }
    setIsSubmitting(true);
    try {
      onSubmit({ year, month: Number(month), value: numValue });
      setSuccess("Presupuesto guardado correctamente.");
      setValue("");
    } catch (err) {
      setError("Error al guardar el presupuesto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Agregar Presupuesto Mensual AWS</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full p-2 border rounded-md">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full p-2 border rounded-md">
                {meses.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto mensual (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AwsBudgetModal; 