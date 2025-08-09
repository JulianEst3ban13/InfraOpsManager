import React from 'react';
import { COLORS } from '../types';

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  subtitle?: string;
  color: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';
  darkMode: boolean;
  animate?: boolean;
}

const colorMap = {
  primary: {
    text: "text-indigo-600",
    dark: "text-indigo-400",
    bg: "bg-indigo-100",
    darkBg: "bg-indigo-900 bg-opacity-30",
  },
  secondary: {
    text: "text-purple-600",
    dark: "text-purple-400",
    bg: "bg-purple-100",
    darkBg: "bg-purple-900 bg-opacity-30",
  },
  success: {
    text: "text-green-600",
    dark: "text-green-400",
    bg: "bg-green-100",
    darkBg: "bg-green-900 bg-opacity-30",
  },
  danger: {
    text: "text-red-600",
    dark: "text-red-400",
    bg: "bg-red-100",
    darkBg: "bg-red-900 bg-opacity-30",
  },
  warning: {
    text: "text-yellow-600",
    dark: "text-yellow-400",
    bg: "bg-yellow-100",
    darkBg: "bg-yellow-900 bg-opacity-30",
  },
  info: {
    text: "text-blue-600",
    dark: "text-blue-400",
    bg: "bg-blue-100",
    darkBg: "bg-blue-900 bg-opacity-30",
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
  darkMode,
  animate = false
}) => {
  const colorClasses = colorMap[color];
  
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
      <div className="flex items-center space-x-4 mb-3">
        <div className={`${darkMode ? colorClasses.darkBg : colorClasses.bg} ${darkMode ? colorClasses.dark : colorClasses.text} p-3 rounded-full`}>
          <Icon className={`w-6 h-6 ${animate ? 'animate-spin' : ''}`} />
        </div>
        <div className="truncate">
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} text-sm font-medium`}>{title}</p>
        </div>
      </div>
      <div className="mt-2">
        <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {value.toLocaleString()}
        </h3>
        {subtitle && (
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}; 