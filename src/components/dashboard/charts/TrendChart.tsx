import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface TrendChartProps {
  data: Array<{
    name: string;
    total: number;
    fecha: Date;
  }>;
  darkMode: boolean;
  color: string;
  title: string;
  subtitle?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
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
          <TrendingUp className="w-5 h-5 mr-2" style={{ color }} />
          {title}
        </h3>
        {subtitle && <span className="text-sm opacity-70">{subtitle}</span>}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
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
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke={color} 
              fillOpacity={1} 
              fill="url(#colorTotal)"
              name="Total"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 