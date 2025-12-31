import React, { useState, useMemo } from 'react';
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
  Line,
  ComposedChart,
  Legend,
  Area,
  Cell,
} from 'recharts';
import { Decision } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { AlertCircle, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  generateCalibrationReport,
  getBrierInterpretationLabel,
  getBrierInterpretationColor,
  getOverconfidenceSeverityColor,
  getSampleSizeStatusColor,
  formatPercentage,
  BinningStrategy,
  CalibrationBin,
  MIN_SAMPLES_FOR_METRICS,
  MIN_SAMPLES_PER_BIN,
  OVERCONFIDENCE_ALERT_THRESHOLD,
  OVERCONFIDENCE_WARNING_THRESHOLD,
} from '../utils/CalibrationEngine';

interface Props {
  decisions: Decision[];
}

// ============================================================================
// CALIBRATION CHART - Research-backed 10-bin calibration curve
// ============================================================================

export const CalibrationChart: React.FC<Props> = ({ decisions }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [binningStrategy, setBinningStrategy] = useState<BinningStrategy>('uniform');

  // Generate calibration report using the engine
  const report = useMemo(
    () => generateCalibrationReport(decisions, binningStrategy),
    [decisions, binningStrategy]
  );

  const { sampleSize, brierScore, calibrationBins, overconfidence } = report;

  // If insufficient data, show placeholder
  if (!sampleSize.canShowMetrics) {
    return (
      <div className="space-y-4">
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6">
          <AlertCircle size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-center font-medium text-slate-600 dark:text-slate-400">
            Add more decisions to see calibration insights
          </p>
          <p className="text-center mt-2 text-xs">
            {sampleSize.warningMessage}
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data - convert bins to chart format
  const chartData = calibrationBins
    .filter(bin => bin.sampleCount > 0)
    .map(bin => ({
      confidence: bin.binMidpoint,
      actual: bin.actualAccuracy * 100,
      perfect: bin.binMidpoint, // Perfect calibration line
      count: bin.sampleCount,
      isReliable: bin.isReliable,
      gap: bin.calibrationGap * 100,
      binLabel: `${bin.binStart}-${bin.binEnd}%`,
    }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className={`p-3 rounded-lg shadow-lg border ${
        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <p className="font-semibold text-sm mb-2">{data.binLabel} confidence</p>
        <div className="space-y-1 text-xs">
          <p>
            <span className="text-slate-500 dark:text-slate-400">Avg. Confidence:</span>{' '}
            <span className="font-medium">{data.confidence.toFixed(0)}%</span>
          </p>
          <p>
            <span className="text-slate-500 dark:text-slate-400">Actual Success:</span>{' '}
            <span className="font-medium">{data.actual.toFixed(1)}%</span>
          </p>
          <p>
            <span className="text-slate-500 dark:text-slate-400">Sample Count:</span>{' '}
            <span className={`font-medium ${data.isReliable ? '' : 'text-amber-600 dark:text-amber-400'}`}>
              {data.count} {!data.isReliable && '(low)'}
            </span>
          </p>
          {Math.abs(data.gap) > OVERCONFIDENCE_ALERT_THRESHOLD && (
            <p className={`font-medium ${data.gap > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {data.gap > 0 ? '↑' : '↓'} {Math.abs(data.gap).toFixed(1)}% {data.gap > 0 ? 'overconfident' : 'underconfident'}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Get Brier score colors
  const brierColors = brierScore ? getBrierInterpretationColor(brierScore.interpretation) : null;
  const overconfidenceColors = overconfidence ? getOverconfidenceSeverityColor(overconfidence.severity) : null;
  const sampleSizeColors = getSampleSizeStatusColor(sampleSize.status);

  return (
    <div className="space-y-4">
      {/* Sample Size Warning Banner */}
      {sampleSize.warningMessage && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${sampleSizeColors.bg} ${sampleSizeColors.text}`}>
          <AlertCircle size={14} />
          <span>{sampleSize.warningMessage}</span>
        </div>
      )}

      {/* Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Brier Score */}
        <div className={`p-3 rounded-lg border ${brierColors ? `${brierColors.bg} ${brierColors.border}` : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'}`}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Brier Score
          </p>
          <p className={`text-lg font-bold ${brierColors?.text || 'text-slate-900 dark:text-white'}`}>
            {brierScore ? brierScore.score.toFixed(3) : 'N/A'}
          </p>
          <p className={`text-xs mt-1 ${brierColors?.text || 'text-slate-500 dark:text-slate-400'}`}>
            {brierScore ? getBrierInterpretationLabel(brierScore.interpretation) : '0 = perfect'}
          </p>
        </div>

        {/* Calibration Gap */}
        <div className={`p-3 rounded-lg border ${overconfidenceColors ? `${overconfidenceColors.bg} ${overconfidenceColors.border}` : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'}`}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Calibration Gap
          </p>
          <div className="flex items-center gap-1">
            {overconfidence && overconfidence.overallGap > 0 ? (
              <TrendingUp size={16} className="text-orange-600 dark:text-orange-400" />
            ) : overconfidence && overconfidence.overallGap < 0 ? (
              <TrendingDown size={16} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <Minus size={16} className="text-emerald-600 dark:text-emerald-400" />
            )}
            <span className={`text-lg font-bold ${overconfidenceColors?.text || 'text-slate-900 dark:text-white'}`}>
              {overconfidence ? `${overconfidence.overallGap > 0 ? '+' : ''}${(overconfidence.overallGap * 100).toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <p className={`text-xs mt-1 ${overconfidenceColors?.text || 'text-slate-500 dark:text-slate-400'}`}>
            {overconfidence?.isOverconfident ? 'Overconfident' :
             overconfidence?.isUnderconfident ? 'Underconfident' :
             'Well calibrated'}
          </p>
        </div>

        {/* Sample Size */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Decisions
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {sampleSize.completedDecisions}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            resolved predictions
          </p>
        </div>

        {/* Binning Strategy Toggle */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Binning
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setBinningStrategy('uniform')}
              className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                binningStrategy === 'uniform'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
              }`}
            >
              Uniform
            </button>
            <button
              onClick={() => setBinningStrategy('quantile')}
              className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                binningStrategy === 'quantile'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
              }`}
            >
              Quantile
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#e2e8f0'} />

            
            <XAxis
              type="number"
              dataKey="confidence"
              name="Confidence"
              unit="%"
              domain={[0, 100]}
              tickCount={11}
              label={{
                value: 'Predicted Confidence',
                position: 'insideBottom',
                offset: -20,
                fill: isDark ? '#94a3b8' : '#64748b',
              }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              stroke={isDark ? '#475569' : '#cbd5e1'}
            />
            <YAxis
              type="number"
              dataKey="actual"
              name="Actual"
              unit="%"
              domain={[0, 100]}
              tickCount={11}
              label={{
                value: 'Actual Success Rate',
                angle: -90,
                position: 'insideLeft',
                fill: isDark ? '#94a3b8' : '#64748b',
              }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              stroke={isDark ? '#475569' : '#cbd5e1'}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Perfect Calibration Reference Line */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
              stroke={isDark ? '#64748b' : '#94a3b8'}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: 'Perfect Calibration',
                position: 'insideTopLeft',
                fill: isDark ? '#64748b' : '#94a3b8',
                fontSize: 10,
              }}
            />

            {/* Overconfidence threshold line (5% below perfect) */}
            <ReferenceLine
              segment={[{ x: 5, y: 0 }, { x: 100, y: 95 }]}
              stroke={isDark ? '#fb923c' : '#f97316'}
              strokeDasharray="2 2"
              strokeWidth={1}
              strokeOpacity={0.5}
            />

            {/* Actual calibration line connecting points */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke={isDark ? '#60a5fa' : '#2563eb'}
              strokeWidth={2}
              dot={false}
              connectNulls
            />

            {/* Scatter points with size based on sample count */}
            <Scatter
              name="Decisions"
              dataKey="actual"
              fill={isDark ? '#60a5fa' : '#2563eb'}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isReliable ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#cbd5e1')}
                  stroke={isDark ? '#1e3a5f' : '#1e40af'}
                  strokeWidth={1}
                  r={Math.min(4 + Math.sqrt(entry.count) * 2, 12)}
                />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Explanation */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-slate-400 dark:bg-slate-500" style={{ borderTop: '2px dashed' }} />
          <span>Perfect calibration</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400" />
          <span>Reliable bin (n≥{MIN_SAMPLES_PER_BIN})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500" />
          <span>Low sample bin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-orange-400 dark:bg-orange-500" style={{ borderTop: '2px dashed' }} />
          <span>5% overconfidence threshold</span>
        </div>
      </div>

      {/* Tetlock Comparison */}
      {overconfidence && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {overconfidence.tetlockComparison}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// OUTCOME CHART - Distribution of outcomes
// ============================================================================

export const OutcomeChart: React.FC<Props> = ({ decisions }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = [
    {
      name: 'Success',
      value: decisions.filter(d => d.outcome === 'success').length,
      fill: isDark ? '#34d399' : '#10b981',
    },
    {
      name: 'Mixed',
      value: decisions.filter(d => d.outcome === 'mixed').length,
      fill: isDark ? '#fbbf24' : '#f59e0b',
    },
    {
      name: 'Failure',
      value: decisions.filter(d => d.outcome === 'failure').length,
      fill: isDark ? '#f87171' : '#ef4444',
    },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
        No completed decisions yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke={isDark ? '#475569' : '#e2e8f0'}
          />
          <XAxis
            type="number"
            hide
            domain={[0, Math.max(...data.map(d => d.value)) * 1.1]}
          />
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
              borderRadius: '8px',
            }}
            formatter={(value: number) => [
              `${value} (${((value / total) * 100).toFixed(0)}%)`,
              'Count',
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// TIMELINE CHART - Calibration evolution over time
// ============================================================================

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

    // Calculate cumulative average confidence
    const avgConfidence = completedSoFar.length > 0
      ? completedSoFar.reduce((sum, d) => sum + d.confidence, 0) / completedSoFar.length
      : 0;

    // Calculate calibration gap over time
    const calibrationGap = avgConfidence - accuracy;

    return {
      date: new Date(decision.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      timestamp: decision.createdAt,
      accuracy: Number(accuracy.toFixed(1)),
      avgConfidence: Number(avgConfidence.toFixed(1)),
      calibrationGap: Number(calibrationGap.toFixed(1)),
      total: idx + 1,
      completed: completedSoFar.length,
      confidence: decision.confidence,
    };
  });

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={timelineData}
          margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#e2e8f0'} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
            label={{
              value: 'Timeline',
              position: 'insideBottom',
              offset: -10,
              fill: isDark ? '#94a3b8' : '#64748b',
            }}
            stroke={isDark ? '#475569' : '#cbd5e1'}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            label={{
              value: 'Rate %',
              angle: -90,
              position: 'insideLeft',
              fill: isDark ? '#94a3b8' : '#64748b',
            }}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#475569' : '#cbd5e1'}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{
              value: 'Total Decisions',
              angle: 90,
              position: 'insideRight',
              fill: isDark ? '#94a3b8' : '#64748b',
            }}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#475569' : '#cbd5e1'}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#0f172a',
            }}
          />
          <Legend wrapperStyle={{ color: isDark ? '#e2e8f0' : '#0f172a' }} />

          {/* Accuracy line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="accuracy"
            stroke={isDark ? '#34d399' : '#10b981'}
            strokeWidth={2}
            name="Actual Accuracy %"
            dot={{ r: 3, fill: isDark ? '#34d399' : '#10b981' }}
          />

          {/* Average confidence line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgConfidence"
            stroke={isDark ? '#60a5fa' : '#2563eb'}
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Avg Confidence %"
            dot={{ r: 3, fill: isDark ? '#60a5fa' : '#2563eb' }}
          />

          {/* Completed decisions bar */}
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
