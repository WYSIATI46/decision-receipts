import { Decision, Insight } from './types';

// --- Logic for Insights ---

export const generateInsights = (decisions: Decision[]): Insight[] => {
  const completed = decisions.filter(d => d.status === 'completed');
  if (completed.length < 3) {
    return [{
      type: 'neutral',
      title: 'Build your baseline',
      message: 'Log at least 3 decision outcomes to unlock behavioral insights and calibration data.'
    }];
  }

  const insights: Insight[] = [];

  // 1. Overconfidence Check
  const highConfidenceFailures = completed.filter(d => d.confidence > 80 && d.outcome === 'failure');
  if (highConfidenceFailures.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Potential Overconfidence',
      message: `You have ${highConfidenceFailures.length} failed predictions where your confidence was over 80%. Consider widening your uncertainty intervals.`
    });
  }

  // 2. Success Rate
  const successes = completed.filter(d => d.outcome === 'success');
  const rate = (successes.length / completed.length) * 100;
  
  if (rate > 90) {
     insights.push({
      type: 'neutral',
      title: 'Risk Aversion?',
      message: `Your success rate is very high (${rate.toFixed(0)}%). Are you taking enough calculated risks, or only betting on sure things?`
    });
  } else if (rate < 40) {
    insights.push({
        type: 'warning',
        title: 'Calibration Needed',
        message: `Your prediction accuracy is ${rate.toFixed(0)}%. Try using the "Pre-mortem" field to identify failure modes before committing.`
      });
  } else {
      insights.push({
        type: 'positive',
        title: 'Balanced Risk Taking',
        message: `Your success rate is ${rate.toFixed(0)}%, which suggests a healthy balance of risk and accuracy.`
      });
  }

  return insights;
};

// --- Date Formatting ---
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const daysUntil = (timestamp: number): string => {
  const diff = timestamp - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  return `${days} days left`;
};

// --- Colors ---
export const getConfidenceColor = (val: number) => {
  if (val >= 80) return 'bg-green-100 text-green-800 border-green-200';
  if (val >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
};