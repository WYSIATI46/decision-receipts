import React from 'react';
import { Info } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  tooltip?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'blue', tooltip }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center">
          {title}
          {tooltip && (
            <Info
              size={14}
              className="ml-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 cursor-help transition-colors"
              title={tooltip}
            />
          )}
        </p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
        {trend && <p className="text-xs text-slate-400 mt-2">{trend}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
    </div>
  );
};

export default StatCard;