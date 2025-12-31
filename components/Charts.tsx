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
import { CalibrationMetrics } from '../utils/CalibrationEngine';

interface CalibrationChartProps {
  metrics: CalibrationMetrics;
}

interface DecisionChartProps {
  decisions: Decision[];
}

export const CalibrationChart: React.FC<CalibrationChartProps> = ({ metrics }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { calibrationCurve, sampleSizeWarning } = metrics;

  if (sampleSizeWarning === 'insufficient') {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
        Need at least 10 completed decisions to display calibration curve.
      </div>
    );
  }

  // Transform calibration curve data for the chart
  const chartData = calibrationCurve.map(bin => ({
    confidence: bin.avgConfidence,
    actual: bin.actualSuccessRate,
    count: bin.sampleCount,
    range: `${bin.minConfidence}-${bin.maxConfidence}%`,
  }));

  // Custom tooltip to show sample count
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {data.range}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Predicted: {data.confidence.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Actual: {data.actual.toFixed(1)}%
          </p>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
            {data.count} decision{data.count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
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
              name="Actual Success Rate"
              unit="%"
              domain={[0, 100]}
              label={{ value: 'Actual Success Rate', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#64748b' }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
              stroke={isDark ? '#475569' : '#cbd5e1'}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Perfect Calibration Line - diagonal reference */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
              stroke={isDark ? '#64748b' : '#94a3b8'}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
            <Scatter
              name="Calibration Points"
              data={chartData}
              fill={isDark ? '#60a5fa' : '#2563eb'}
              shape="circle"
              r={8}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Explanation */}
      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Points on the diagonal line indicate perfect calibration. Points above the line show overconfidence, below shows underconfidence.
        </p>
      </div>
    </div>
  );
};

export const OutcomeChart: React.FC<DecisionChartProps> = ({ decisions }) => {
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

export const TimelineChart: React.FC<DecisionChartProps> = ({ decisions }) => {
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
