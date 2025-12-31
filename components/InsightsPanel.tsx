import React from 'react';
import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { CalibrationMetrics, CalibrationEngine } from '../utils/CalibrationEngine';

interface Props {
  metrics: CalibrationMetrics;
}

export const InsightsPanel: React.FC<Props> = ({ metrics }) => {
  const { brierScore, overconfidenceGap, sampleSizeWarning, completedDecisions, domainBreakdown } = metrics;

  // Get interpretations
  const brierInterpretation = CalibrationEngine.interpretBrierScore(brierScore);
  const overconfidenceInfo = CalibrationEngine.interpretOverconfidenceGap(overconfidenceGap);

  // Don't show metrics if insufficient data
  if (sampleSizeWarning === 'insufficient') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-500 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Add More Decisions</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You need at least 10 completed decisions to see calibration metrics. You currently have {completedDecisions}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sample Size Warning */}
      {sampleSizeWarning === 'small' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">Small Sample Size</h3>
              <p className="text-sm text-amber-800 dark:text-amber-400">
                You have {completedDecisions} completed decisions. Metrics become more reliable with 20+ decisions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Brier Score Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
          Prediction Accuracy (Brier Score)
        </h3>

        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1">
            <div className="text-4xl font-bold text-slate-900 dark:text-white">
              {brierScore !== null ? brierScore.toFixed(3) : 'N/A'}
            </div>
            <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-bold ${
              brierInterpretation === 'Excellent' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
              brierInterpretation === 'Good' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
              brierInterpretation === 'Fair' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {brierInterpretation}
            </div>
          </div>

          <div className="text-right text-sm text-slate-500 dark:text-slate-400">
            <div className="font-medium mb-1">Score ranges:</div>
            <div className="space-y-0.5">
              <div>Excellent: &lt; 0.10</div>
              <div>Good: 0.10 - 0.15</div>
              <div>Fair: 0.15 - 0.20</div>
              <div>Poor: &gt; 0.20</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          The Brier score measures how accurate your predictions are. Lower scores are better.
          A score of 0 means perfect prediction, while 1 is the worst possible.
        </p>
      </div>

      {/* Overconfidence Alert */}
      <div className={`rounded-xl border p-6 ${
        overconfidenceInfo.level === 'severe'
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : overconfidenceInfo.level === 'moderate'
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          : overconfidenceInfo.level === 'underconfident'
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      }`}>
        <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${
          overconfidenceInfo.level === 'severe'
            ? 'text-red-900 dark:text-red-300'
            : overconfidenceInfo.level === 'moderate'
            ? 'text-amber-900 dark:text-amber-300'
            : overconfidenceInfo.level === 'underconfident'
            ? 'text-blue-900 dark:text-blue-300'
            : 'text-emerald-900 dark:text-emerald-300'
        }`}>
          {overconfidenceInfo.level === 'severe' || overconfidenceInfo.level === 'moderate' ? (
            <AlertTriangle size={20} />
          ) : overconfidenceInfo.level === 'well-calibrated' ? (
            <CheckCircle2 size={20} />
          ) : (
            <TrendingDown size={20} />
          )}
          Calibration Status
        </h3>

        {overconfidenceGap !== null && (
          <div className="mb-3">
            <div className={`text-3xl font-bold ${
              overconfidenceInfo.level === 'severe'
                ? 'text-red-700 dark:text-red-400'
                : overconfidenceInfo.level === 'moderate'
                ? 'text-amber-700 dark:text-amber-400'
                : overconfidenceInfo.level === 'underconfident'
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}>
              {overconfidenceGap > 0 ? '+' : ''}{overconfidenceGap.toFixed(1)}%
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {overconfidenceGap > 0 ? 'Overconfidence gap' : 'Underconfidence gap'}
            </div>
          </div>
        )}

        <p className={`text-sm ${
          overconfidenceInfo.level === 'severe'
            ? 'text-red-800 dark:text-red-300'
            : overconfidenceInfo.level === 'moderate'
            ? 'text-amber-800 dark:text-amber-300'
            : overconfidenceInfo.level === 'underconfident'
            ? 'text-blue-800 dark:text-blue-300'
            : 'text-emerald-800 dark:text-emerald-300'
        }`}>
          {overconfidenceInfo.message}
        </p>

        {/* Recommendations based on overconfidence level */}
        {overconfidenceInfo.level === 'severe' && (
          <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
            <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-2">Recommended actions:</p>
            <ul className="text-sm text-red-800 dark:text-red-300 space-y-1 list-disc list-inside">
              <li>Reduce your confidence estimates by 10-15%</li>
              <li>Spend more time on pre-mortem analysis</li>
              <li>Seek out disconfirming evidence before deciding</li>
            </ul>
          </div>
        )}

        {overconfidenceInfo.level === 'moderate' && (
          <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-2">Recommended actions:</p>
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li>Reduce confidence estimates by 5-10%</li>
              <li>Review your assumptions more critically</li>
            </ul>
          </div>
        )}
      </div>

      {/* Domain Breakdown Table */}
      {domainBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Performance by Domain (Tags)</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">Domain</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">Decisions</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">Success Rate</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">Avg Confidence</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">Gap</th>
                </tr>
              </thead>
              <tbody>
                {domainBreakdown.map((domain, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                        {domain.tag}
                      </span>
                    </td>
                    <td className="text-center py-3 px-3 text-slate-600 dark:text-slate-400">
                      {domain.completedDecisions} / {domain.totalDecisions}
                    </td>
                    <td className="text-center py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {domain.successRate.toFixed(0)}%
                    </td>
                    <td className="text-center py-3 px-3 text-slate-600 dark:text-slate-400">
                      {domain.avgConfidence.toFixed(0)}%
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                        Math.abs(domain.overconfidenceGap) <= 5
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : domain.overconfidenceGap > 10
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : domain.overconfidenceGap > 5
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {domain.overconfidenceGap > 0 ? '+' : ''}{domain.overconfidenceGap.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            Gap = Average Confidence - Success Rate. Positive values indicate overconfidence in that domain.
          </p>
        </div>
      )}
    </div>
  );
};
