import React from 'react';
import { Filter, XCircle, Calendar, Palette } from 'lucide-react';
import DatePicker from "react-datepicker";
import { ChartColors } from '../types';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
  <div className="flex items-center space-x-2">
    <label className="text-sm">{label}</label>
    <input 
      type="color" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-8 h-8 rounded cursor-pointer"
    />
    <span className="text-xs">{value}</span>
  </div>
);

interface FiltersPanelProps {
  darkMode: boolean;
  startDate: Date | null;
  endDate: Date | null;
  setStartDate: (date: Date | null) => void;
  setEndDate: (date: Date | null) => void;
  activeFilters: string[];
  setActiveFilters: (filters: string[]) => void;
  chartColors: ChartColors;
  setChartColors: (colors: ChartColors) => void;
  setShowFilters: (show: boolean) => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  darkMode,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  activeFilters,
  setActiveFilters,
  chartColors,
  setChartColors,
  setShowFilters
}) => {
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 mb-6`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filtros y Personalización
        </h3>
        <button 
          onClick={() => setShowFilters(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Filtros por fecha */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Filtrar por Fecha
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Desde</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    if (date) setActiveFilters([...new Set([...activeFilters, 'fecha'])]);
                    else if (!endDate) setActiveFilters(activeFilters.filter(f => f !== 'fecha'));
                  }}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  className={`w-full p-2 rounded border ${
                    darkMode 
                      ? "bg-gray-700 border-gray-600 text-white" 
                      : "bg-white border-gray-300"
                  }`}
                  placeholderText="Seleccione mes inicial"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Hasta</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => {
                    setEndDate(date);
                    if (date) setActiveFilters([...new Set([...activeFilters, 'fecha'])]);
                    else if (!startDate) setActiveFilters(activeFilters.filter(f => f !== 'fecha'));
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || undefined}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  className={`w-full p-2 rounded border ${
                    darkMode 
                      ? "bg-gray-700 border-gray-600 text-white" 
                      : "bg-white border-gray-300"
                  }`}
                  placeholderText="Seleccione mes final"
                />
              </div>
            </div>
          </div>

          {/* Filtros activos */}
          {activeFilters.length > 0 && (
            <div className="pt-4">
              <h4 className="text-sm font-medium mb-2">Filtros activos:</h4>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(filter => (
                  <span
                    key={filter}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      darkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {filter === 'fecha' ? 'Rango de fechas' : filter}
                    <button
                      onClick={() => {
                        if (filter === 'fecha') {
                          setStartDate(null);
                          setEndDate(null);
                        }
                        setActiveFilters(activeFilters.filter(f => f !== filter));
                      }}
                      className="ml-2 hover:text-red-500"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                    setActiveFilters([]);
                  }}
                  className={`text-sm ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  } hover:underline`}
                >
                  Limpiar todos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Personalización de colores */}
        <div>
          <h4 className="font-medium mb-2 flex items-center">
            <Palette className="w-4 h-4 mr-2" />
            Personalizar Colores
          </h4>
          <div className="space-y-3">
            <ColorPicker 
              label="Tendencia:" 
              value={chartColors.tendencia} 
              onChange={(color) => setChartColors({...chartColors, tendencia: color})} 
            />
            <ColorPicker 
              label="Distribución (MySQL):" 
              value={chartColors.distribucion[0]} 
              onChange={(color) => setChartColors({
                ...chartColors, 
                distribucion: [color, chartColors.distribucion[1]]
              })} 
            />
            <ColorPicker 
              label="Distribución (PostgreSQL):" 
              value={chartColors.distribucion[1]} 
              onChange={(color) => setChartColors({
                ...chartColors, 
                distribucion: [chartColors.distribucion[0], color]
              })} 
            />
            <ColorPicker 
              label="Informes:" 
              value={chartColors.informes} 
              onChange={(color) => setChartColors({...chartColors, informes: color})} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 