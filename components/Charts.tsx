import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  Area,
  ComposedChart
} from 'recharts';
import { Decision } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { calculateBrierScore, calculateCalibrationError, getCalibrationStatus } from '../utils';

interface Props {
  decisions: Decision[];
}

export const CalibrationChart: React.FC<Props> = ({ decisions }) => {
  const { theme } = useTheme();
  const completed = decisions.filter(d => d.status === 'completed' && d.outcome);
  
  if (completed.length < 3) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
        Need more completed decisions to calculate calibration.
      </div>
    );
  }

  // Calculate metrics
  const brierScore = calculateBrierScore(decisions);
  const calibrationError = calculateCalibrationError(decisions);
  const calibrationStatus = getCalibrationStatus(decisions);

  // Bucket data by confidence (e.g., 0-10, 10-20... 90-100)
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const min = i * 10;
    const max = (i + 1) * 10;
    const items = completed.filter(d => d.confidence >= min && d.confidence < max);
    const successCount = items.filter(d => d.outcome === 'success').length;
    
    return {
      confidence: min + 5, // Midpoint
      actual: items.length > 0 ? (successCount / items.length) * 100 : null,
      count: items.length
    };
  }).filter(b => b.actual !== null); // Remove empty buckets

  const isDark = theme === 'dark';

  return (
    <div className="space-y-4">
      {/* Metrics Panel */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Brier Score</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {brierScore !== null ? brierScore.toFixed(3) : 'N/A'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lower is better</p>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Calibration Error</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {calibrationError !== null ? `${calibrationError.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg deviation</p>
        </div>
        
        <div className={`p-3 rounded-lg border ${
          calibrationStatus.status === 'well-calibrated' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
          calibrationStatus.status === 'overconfident' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
          calibrationStatus.status === 'underconfident' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
          'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
        }`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 ${
            calibrationStatus.status === 'well-calibrated' ? 'text-emerald-700 dark:text-emerald-400' :
            calibrationStatus.status === 'overconfident' ? 'text-amber-700 dark:text-amber-400' :
            calibrationStatus.status === 'underconfident' ? 'text-blue-700 dark:text-blue-400' :
            'text-slate-500 dark:text-slate-400'
          }">Status</p>
          <p className="text-xs font-bold ${
            calibrationStatus.status === 'well-calibrated' ? 'text-emerald-900 dark:text-emerald-300' :
            calibrationStatus.status === 'overconfident' ? 'text-amber-900 dark:text-amber-300' :
            calibrationStatus.status === 'underconfident' ? 'text-blue-900 dark:text-blue-300' :
            'text-slate-900 dark:text-white'
          }">
            {calibrationStatus.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#e2e8f0'} />
            <XAxis 
              type="number" 
              dataKey="confidence" 
              name="Confidence" 
              unit="%" 
              domain={[0, 100]} 
              label={{ value: 'Predicted Confidence', position: 'insideBottom', offset: -10, fill: isDark ? '#94a3b8' : '#64748b' }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
              stroke={isDark ? '#475569' : '#cbd5e1'}
            />
            <YAxis 
              type="number" 
              dataKey="actual" 
              name="Actual" 
              unit="%" 
              domain={[0, 100]}
              label={{ value: 'Actual Frequency', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#64748b' }} 
              tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
              stroke={isDark ? '#475569' : '#cbd5e1'}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }} 
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#e2e8f0' : '#0f172a'
              }} 
            />
            {/* Perfect Calibration Line */}
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke={isDark ? '#64748b' : '#94a3b8'} strokeDasharray="3 3" />
            <Scatter name="Decisions" data={buckets} fill={isDark ? '#60a5fa' : '#2563eb'} shape="circle" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Explanation */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        {calibrationStatus.message}
      </p>
    </div>
  );
};

export const OutcomeChart: React.FC<Props> = ({ decisions }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const data = [
    { name: 'Success', value: decisions.filter(d => d.outcome === 'success').length, fill: isDark ? '#34d399' : '#10b981' },
    { name: 'Mixed', value: decisions.filter(d => d.outcome === 'mixed').length, fill: isDark ? '#fbbf24' : '#f59e0b' },
    { name: 'Failure', value: decisions.filter(d => d.outcome === 'failure').length, fill: isDark ? '#f87171' : '#ef4444' },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#475569' : '#e2e8f0'} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={80} 
            tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#475569' : '#cbd5e1'}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ 
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#0f172a',
              border: 'none',
              borderRadius: '8px'
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TimelineChart: React.FC<Props> = ({ decisions }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  if (decisions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
        No decisions logged yet.
      </div>
    );
  }

  // Sort by creation date and create timeline data
  const sorted = [...decisions].sort((a, b) => a.createdAt - b.createdAt);
  
  // Calculate cumulative statistics
  const timelineData = sorted.map((decision, idx) => {
    const completedSoFar = sorted.slice(0, idx + 1).filter(d => d.status === 'completed');
    const successCount = completedSoFar.filter(d => d.outcome === 'success').length;
    const accuracy = completedSoFar.length > 0 ? (successCount / completedSoFar.length) * 100 : 0;
    
    return {
      date: new Date(decision.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: decision.createdAt,
      accuracy: accuracy.toFixed(1),
      total: idx + 1,
      completed: completedSoFar.length,
      confidence: decision.confidence
    };
  });

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={timelineData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#e2e8f0'} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
            label={{ value: 'Timeline', position: 'insideBottom', offset: -10, fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#475569' : '#cbd5e1'}
          />
          <YAxis 
            yAxisId="left"
            label={{ value: 'Prediction Accuracy %', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#64748b' }}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#475569' : '#cbd5e1'}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            label={{ value: 'Total Decisions', angle: 90, position: 'insideRight', fill: isDark ? '#94a3b8' : '#64748b' }}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#475569' : '#cbd5e1'}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#0f172a'
            }}
          />
          <Legend wrapperStyle={{ color: isDark ? '#e2e8f0' : '#0f172a' }} />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="accuracy" 
            stroke={isDark ? '#60a5fa' : '#2563eb'} 
            strokeWidth={2}
            name="Accuracy %" 
            dot={{ r: 4, fill: isDark ? '#60a5fa' : '#2563eb' }}
          />
          <Bar 
            yAxisId="right"
            dataKey="completed" 
            fill={isDark ? '#64748b' : '#94a3b8'} 
            opacity={0.3}
            name="Completed"
            barSize={20}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
