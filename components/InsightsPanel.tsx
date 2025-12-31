import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Target,
  Tag,
  AlertCircle,
  Award,
  Brain,
} from 'lucide-react';
import { Decision, Insight } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import {
  generateCalibrationReport,
  getBrierInterpretationLabel,
  getBrierInterpretationColor,
  getOverconfidenceSeverityColor,
  getSampleSizeStatusColor,
  CalibrationReport,
  DomainPerformance,
  MIN_SAMPLES_FOR_METRICS,
  MIN_SAMPLES_FOR_CONFIDENCE,
  MIN_SAMPLES_FOR_PATTERNS,
  MIN_SAMPLES_PER_BIN,
  OVERCONFIDENCE_ALERT_THRESHOLD,
  OVERCONFIDENCE_WARNING_THRESHOLD,
  TETLOCK_BENCHMARK,
} from '../utils/CalibrationEngine';

interface Props {
  decisions: Decision[];
}

// ============================================================================
// MAIN INSIGHTS PANEL - Research-backed behavioral insights
// ============================================================================

export const InsightsPanel: React.FC<Props> = ({ decisions }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Generate comprehensive calibration report
  const report = useMemo(() => generateCalibrationReport(decisions), [decisions]);

  const { sampleSize, brierScore, overconfidence, domainPerformance } = report;

  // Generate insights based on the calibration report
  const insights = useMemo(() => {
    return generateResearchBackedInsights(decisions, report);
  }, [decisions, report]);

  return (
    <div className="space-y-6">
      {/* Sample Size Status */}
      {!sampleSize.canShowMetrics ? (
        <InsufficientDataCard sampleSize={sampleSize} />
      ) : (
        <>
          {/* Sample Size Warning */}
          {sampleSize.warningMessage && (
            <SampleSizeWarning sampleSize={sampleSize} />
          )}

          {/* Key Metrics Summary */}
          <KeyMetricsSummary report={report} />

          {/* Behavioral Insights */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Brain size={16} className="text-blue-600 dark:text-blue-400" />
              Behavioral Insights
            </h4>
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <InsightCard key={idx} insight={insight} />
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Keep logging decisions to unlock more insights.
              </p>
            )}
          </div>

          {/* Domain Performance */}
          {domainPerformance.length > 0 && (
            <DomainPerformanceSection domains={domainPerformance} />
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const InsufficientDataCard: React.FC<{ sampleSize: CalibrationReport['sampleSize'] }> = ({
  sampleSize,
}) => (
  <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-center">
    <Target size={32} className="mx-auto mb-3 text-slate-400 dark:text-slate-500" />
    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
      Build Your Baseline
    </h4>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
      {sampleSize.warningMessage}
    </p>
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
        {sampleSize.completedDecisions}
      </span>
      <span className="text-xs text-blue-700 dark:text-blue-300">
        / {MIN_SAMPLES_FOR_METRICS} needed
      </span>
    </div>
    {sampleSize.recommendation && (
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        {sampleSize.recommendation}
      </p>
    )}
  </div>
);

const SampleSizeWarning: React.FC<{ sampleSize: CalibrationReport['sampleSize'] }> = ({
  sampleSize,
}) => {
  const colors = getSampleSizeStatusColor(sampleSize.status);
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg ${colors.bg}`}>
      <AlertCircle size={16} className={`${colors.text} mt-0.5 flex-shrink-0`} />
      <div>
        <p className={`text-sm font-medium ${colors.text}`}>
          {sampleSize.warningMessage}
        </p>
        {sampleSize.recommendation && (
          <p className={`text-xs mt-1 ${colors.text} opacity-80`}>
            {sampleSize.recommendation}
          </p>
        )}
      </div>
    </div>
  );
};

const KeyMetricsSummary: React.FC<{ report: CalibrationReport }> = ({ report }) => {
  const { brierScore, overconfidence, sampleSize } = report;

  const brierColors = brierScore
    ? getBrierInterpretationColor(brierScore.interpretation)
    : null;
  const overconfidenceColors = overconfidence
    ? getOverconfidenceSeverityColor(overconfidence.severity)
    : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Brier Score Card */}
      <div
        className={`p-4 rounded-lg border ${
          brierColors
            ? `${brierColors.bg} ${brierColors.border}`
            : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className={brierColors?.text || 'text-slate-500'} />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
            Brier Score
          </span>
        </div>
        <p className={`text-2xl font-bold ${brierColors?.text || 'text-slate-900 dark:text-white'}`}>
          {brierScore ? brierScore.score.toFixed(3) : 'N/A'}
        </p>
        <p className={`text-xs mt-1 ${brierColors?.text || 'text-slate-500'}`}>
          {brierScore ? getBrierInterpretationLabel(brierScore.interpretation) : 'Pending data'}
        </p>
      </div>

      {/* Calibration Status Card */}
      <div
        className={`p-4 rounded-lg border ${
          overconfidenceColors
            ? `${overconfidenceColors.bg} ${overconfidenceColors.border}`
            : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {overconfidence?.isOverconfident ? (
            <TrendingUp size={16} className="text-orange-600 dark:text-orange-400" />
          ) : overconfidence?.isUnderconfident ? (
            <TrendingDown size={16} className="text-blue-600 dark:text-blue-400" />
          ) : (
            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
            Status
          </span>
        </div>
        <p className={`text-lg font-bold ${overconfidenceColors?.text || 'text-slate-900 dark:text-white'}`}>
          {overconfidence
            ? overconfidence.isOverconfident
              ? 'Overconfident'
              : overconfidence.isUnderconfident
              ? 'Underconfident'
              : 'Well Calibrated'
            : 'N/A'}
        </p>
        <p className={`text-xs mt-1 ${overconfidenceColors?.text || 'text-slate-500'}`}>
          {overconfidence
            ? `${overconfidence.overallGap > 0 ? '+' : ''}${(overconfidence.overallGap * 100).toFixed(1)}% gap`
            : 'Pending data'}
        </p>
      </div>
    </div>
  );
};

const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  const bgColor =
    insight.type === 'positive'
      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      : insight.type === 'warning'
      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';

  const iconColor =
    insight.type === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : insight.type === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-slate-500 dark:text-slate-400';

  const Icon =
    insight.type === 'positive'
      ? CheckCircle
      : insight.type === 'warning'
      ? AlertTriangle
      : Info;

  return (
    <div className={`p-4 rounded-lg border ${bgColor}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`${iconColor} mt-0.5 flex-shrink-0`} />
        <div>
          <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            {insight.title}
          </h5>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {insight.message}
          </p>
        </div>
      </div>
    </div>
  );
};

const DomainPerformanceSection: React.FC<{ domains: DomainPerformance[] }> = ({
  domains,
}) => {
  // Only show domains with enough data
  const significantDomains = domains.filter(d => d.sampleCount >= 3);

  if (significantDomains.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Tag size={16} className="text-purple-600 dark:text-purple-400" />
        Performance by Domain
      </h4>
      <div className="space-y-2">
        {significantDomains.slice(0, 5).map((domain) => (
          <DomainCard key={domain.tag} domain={domain} />
        ))}
      </div>
    </div>
  );
};

const DomainCard: React.FC<{ domain: DomainPerformance }> = ({ domain }) => {
  const isOverconfident = domain.calibrationGap > OVERCONFIDENCE_ALERT_THRESHOLD / 100;
  const isUnderconfident = domain.calibrationGap < -OVERCONFIDENCE_ALERT_THRESHOLD / 100;

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
          {domain.tag}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {domain.sampleCount} decisions
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          {(domain.actualAccuracy * 100).toFixed(0)}% accuracy
        </span>
        {isOverconfident && (
          <span className="text-orange-600 dark:text-orange-400 font-medium">
            +{(domain.calibrationGap * 100).toFixed(0)}%
          </span>
        )}
        {isUnderconfident && (
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {(domain.calibrationGap * 100).toFixed(0)}%
          </span>
        )}
        {!isOverconfident && !isUnderconfident && (
          <span className="text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={14} />
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// INSIGHT GENERATION - Research-backed behavioral insights
// ============================================================================

function generateResearchBackedInsights(
  decisions: Decision[],
  report: CalibrationReport
): Insight[] {
  const insights: Insight[] = [];
  const { sampleSize, brierScore, overconfidence, domainPerformance } = report;

  if (!sampleSize.canShowMetrics) {
    return insights;
  }

  const completed = decisions.filter(
    d => d.status === 'completed' && (d.outcome === 'success' || d.outcome === 'failure')
  );

  // 1. Brier Score Interpretation
  if (brierScore) {
    if (brierScore.interpretation === 'excellent') {
      insights.push({
        type: 'positive',
        title: 'Outstanding Calibration',
        message: `Your Brier score of ${brierScore.score.toFixed(3)} indicates excellent prediction accuracy. This is better than most professional forecasters.`,
      });
    } else if (brierScore.interpretation === 'worse_than_random') {
      insights.push({
        type: 'warning',
        title: 'Calibration Alert',
        message: `Your Brier score of ${brierScore.score.toFixed(3)} suggests predictions are less accurate than random guessing. Focus on reducing extreme confidence levels.`,
      });
    } else if (brierScore.interpretation === 'poor') {
      insights.push({
        type: 'warning',
        title: 'Room for Improvement',
        message: `Your Brier score of ${brierScore.score.toFixed(3)} indicates poor calibration. Try using reference class forecasting—compare to similar past situations.`,
      });
    }
  }

  // 2. Overconfidence Detection with Tetlock comparison
  if (overconfidence) {
    if (overconfidence.severity === 'severe') {
      insights.push({
        type: 'warning',
        title: 'Significant Overconfidence Detected',
        message: `Your predictions exceed outcomes by ${(overconfidence.overallGap * 100).toFixed(1)}%. Tetlock's superforecasters average only 3%. Consider reducing confidence by 10-15%.`,
      });
    } else if (overconfidence.severity === 'moderate') {
      insights.push({
        type: 'warning',
        title: 'Moderate Overconfidence',
        message: `You're ${(overconfidence.overallGap * 100).toFixed(1)}% more confident than your actual accuracy. This is above the ${OVERCONFIDENCE_ALERT_THRESHOLD}% threshold for concern.`,
      });
    } else if (overconfidence.severity === 'none' && overconfidence.overallGap <= TETLOCK_BENCHMARK / 100) {
      insights.push({
        type: 'positive',
        title: 'Superforecaster-Level Calibration',
        message: `Your calibration gap of ${(overconfidence.overallGap * 100).toFixed(1)}% matches or beats Tetlock's superforecasters (3% average). Keep it up!`,
      });
    }

    // Underconfidence detection
    if (overconfidence.isUnderconfident) {
      insights.push({
        type: 'neutral',
        title: 'Potential Underconfidence',
        message: `You're succeeding ${Math.abs(overconfidence.overallGap * 100).toFixed(1)}% more than expected. You may be underestimating your abilities in some domains.`,
      });
    }
  }

  // 3. High-confidence failures (most impactful for learning)
  const highConfidenceFailures = completed.filter(
    d => d.confidence >= 80 && d.outcome === 'failure'
  );
  if (highConfidenceFailures.length >= 2) {
    insights.push({
      type: 'warning',
      title: 'High-Stakes Misses',
      message: `${highConfidenceFailures.length} predictions with 80%+ confidence failed. These are valuable learning opportunities—review what signals you missed.`,
    });
  }

  // 4. Low-confidence successes (underconfidence pattern)
  const lowConfidenceSuccesses = completed.filter(
    d => d.confidence <= 40 && d.outcome === 'success'
  );
  if (lowConfidenceSuccesses.length >= 3) {
    insights.push({
      type: 'neutral',
      title: 'Hidden Expertise',
      message: `${lowConfidenceSuccesses.length} low-confidence predictions succeeded. You may have expertise you're not fully recognizing. Trust your judgment more in familiar domains.`,
      });
  }

  // 5. Extreme confidence check
  const extremeHighConfidence = completed.filter(d => d.confidence >= 95);
  const extremeSuccessRate = extremeHighConfidence.length > 0
    ? extremeHighConfidence.filter(d => d.outcome === 'success').length / extremeHighConfidence.length
    : 0;
  if (extremeHighConfidence.length >= 3 && extremeSuccessRate < 0.9) {
    insights.push({
      type: 'warning',
      title: 'Extreme Confidence Risk',
      message: `${extremeHighConfidence.length} predictions at 95%+ confidence had only ${(extremeSuccessRate * 100).toFixed(0)}% success. Reserve 95%+ for near-certainties.`,
    });
  }

  // 6. Recent trend analysis (if enough data)
  if (completed.length >= 10) {
    const recent = completed.slice(0, 5);
    const older = completed.slice(5, 10);

    const recentGap = calculateAverageGap(recent);
    const olderGap = calculateAverageGap(older);

    if (recentGap < olderGap - 5) {
      insights.push({
        type: 'positive',
        title: 'Improving Calibration',
        message: `Your recent predictions show better calibration than earlier ones. Your self-awareness is improving!`,
      });
    } else if (recentGap > olderGap + 10) {
      insights.push({
        type: 'warning',
        title: 'Calibration Slipping',
        message: `Recent predictions show more overconfidence than earlier ones. Take time to reconsider confidence levels before committing.`,
      });
    }
  }

  // 7. Domain-specific insights
  if (domainPerformance.length > 0) {
    const bestDomain = domainPerformance.find(
      d => d.isReliable && d.calibrationGap <= 0.03
    );
    if (bestDomain) {
      insights.push({
        type: 'positive',
        title: `Strong in "${bestDomain.tag}"`,
        message: `You're well-calibrated in ${bestDomain.tag} predictions (${(bestDomain.actualAccuracy * 100).toFixed(0)}% accuracy). Consider why you're more accurate here.`,
      });
    }

    const worstDomain = domainPerformance.find(
      d => d.isReliable && d.calibrationGap > OVERCONFIDENCE_WARNING_THRESHOLD / 100
    );
    if (worstDomain) {
      insights.push({
        type: 'warning',
        title: `Overconfident in "${worstDomain.tag}"`,
        message: `Your ${worstDomain.tag} predictions show ${(worstDomain.calibrationGap * 100).toFixed(0)}% overconfidence. Seek outside perspectives or reduce confidence in this domain.`,
      });
    }
  }

  // 8. Pre-mortem usage pattern
  const withPreMortem = completed.filter(d => d.preMortem && d.preMortem.trim().length > 0);
  const withPreMortemSuccessRate = withPreMortem.length > 3
    ? withPreMortem.filter(d => d.outcome === 'success').length / withPreMortem.length
    : null;
  const withoutPreMortem = completed.filter(d => !d.preMortem || d.preMortem.trim().length === 0);
  const withoutPreMortemSuccessRate = withoutPreMortem.length > 3
    ? withoutPreMortem.filter(d => d.outcome === 'success').length / withoutPreMortem.length
    : null;

  if (
    withPreMortemSuccessRate !== null &&
    withoutPreMortemSuccessRate !== null &&
    withPreMortemSuccessRate > withoutPreMortemSuccessRate + 0.1
  ) {
    insights.push({
      type: 'positive',
      title: 'Pre-Mortems Working',
      message: `Decisions with pre-mortems have ${((withPreMortemSuccessRate - withoutPreMortemSuccessRate) * 100).toFixed(0)}% higher success rate. Keep using this technique!`,
    });
  }

  return insights;
}

/**
 * Calculate average calibration gap for a set of decisions
 */
function calculateAverageGap(decisions: Decision[]): number {
  if (decisions.length === 0) return 0;

  const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
  const successRate = decisions.filter(d => d.outcome === 'success').length / decisions.length;

  return avgConfidence - successRate * 100;
}

export default InsightsPanel;
