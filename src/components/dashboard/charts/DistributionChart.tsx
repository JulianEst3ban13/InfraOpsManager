import React from 'react';
import { Database } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface DistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    porcentaje: number;
    color: string;
  }>;
  darkMode: boolean;
  title: string;
  subtitle?: string;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  darkMode,
  title,
  subtitle
}) => {
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Database className="w-5 h-5 mr-2" style={{ color: data[0]?.color }} />
          {title}
        </h3>
        {subtitle && <span className="text-sm opacity-70">{subtitle}</span>}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} conexiones`,
                name
              ]}
              contentStyle={{ 
                backgroundColor: darkMode ? '#1F2937' : 'white',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
                color: darkMode ? 'white' : 'black',
              }}
            />
            <Legend formatter={(value, entry) => {
              const item = data.find(d => d.name === value);
              return `${value}: ${item?.porcentaje}%`;
            }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 