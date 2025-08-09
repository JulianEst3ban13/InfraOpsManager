import React from 'react';
import { Calendar } from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface BarChartComponentProps {
  data: Array<{
    name: string;
    total: number;
  }>;
  darkMode: boolean;
  color: string;
  title: string;
  subtitle?: string;
}

const BarChartComponent: React.FC<BarChartComponentProps> = ({
  data,
  darkMode,
  color,
  title,
  subtitle
}) => {
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Calendar className="w-5 h-5 mr-2" style={{ color }} />
          {title}
        </h3>
        {subtitle && <span className="text-sm opacity-70">{subtitle}</span>}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#E5E7EB"} />
            <XAxis 
              dataKey="name" 
              stroke={darkMode ? "#9CA3AF" : "#6B7280"}
              tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
            <YAxis 
              stroke={darkMode ? "#9CA3AF" : "#6B7280"}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: darkMode ? '#1F2937' : 'white',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
                color: darkMode ? 'white' : 'black',
              }}
              formatter={(value: number) => [value.toLocaleString(), 'Total']}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="total" 
              name="Total" 
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export { BarChartComponent as BarChart }; 