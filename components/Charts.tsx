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

interface Props {
  decisions: Decision[];
}

export const CalibrationChart: React.FC<Props> = ({ decisions }) => {
  const completed = decisions.filter(d => d.status === 'completed' && d.outcome);
  
  if (completed.length < 3) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 rounded-lg">
        Need more completed decisions to calculate calibration.
      </div>
    );
  }

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

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            type="number" 
            dataKey="confidence" 
            name="Confidence" 
            unit="%" 
            domain={[0, 100]} 
            label={{ value: 'Predicted Confidence', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            type="number" 
            dataKey="actual" 
            name="Actual" 
            unit="%" 
            domain={[0, 100]}
            label={{ value: 'Actual Frequency', angle: -90, position: 'insideLeft' }} 
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          {/* Perfect Calibration Line */}
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#94a3b8" strokeDasharray="3 3" />
          <Scatter name="Decisions" data={buckets} fill="#2563eb" shape="circle" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export const OutcomeChart: React.FC<Props> = ({ decisions }) => {
  const data = [
    { name: 'Success', value: decisions.filter(d => d.outcome === 'success').length, fill: '#10b981' },
    { name: 'Mixed', value: decisions.filter(d => d.outcome === 'mixed').length, fill: '#f59e0b' },
    { name: 'Failure', value: decisions.filter(d => d.outcome === 'failure').length, fill: '#ef4444' },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
          <Tooltip cursor={{fill: 'transparent'}} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TimelineChart: React.FC<Props> = ({ decisions }) => {
  if (decisions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 rounded-lg">
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11 }}
            label={{ value: 'Timeline', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            yAxisId="left"
            label={{ value: 'Prediction Accuracy %', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            label={{ value: 'Total Decisions', angle: 90, position: 'insideRight' }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="accuracy" 
            stroke="#2563eb" 
            strokeWidth={2}
            name="Accuracy %" 
            dot={{ r: 4 }}
          />
          <Bar 
            yAxisId="right"
            dataKey="completed" 
            fill="#94a3b8" 
            opacity={0.3}
            name="Completed"
            barSize={20}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
