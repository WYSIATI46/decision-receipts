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

  // 3. Confidence Distribution Analysis
  const avgConfidence = completed.reduce((sum, d) => sum + d.confidence, 0) / completed.length;
  if (avgConfidence > 75) {
    insights.push({
      type: 'warning',
      title: 'Systematic Overconfidence',
      message: `Your average confidence is ${avgConfidence.toFixed(0)}%. Most people are systematically overconfident. Try reducing confidence by 10-15%.`
    });
  } else if (avgConfidence < 40) {
    insights.push({
      type: 'neutral',
      title: 'Low Confidence Pattern',
      message: `Your average confidence is ${avgConfidence.toFixed(0)}%. Consider if you're being too conservative or if you're taking on highly uncertain decisions.`
    });
  }

  // 4. Recent Streak Analysis
  const recentDecisions = completed.slice(0, 5);
  if (recentDecisions.length >= 5) {
    const recentFailures = recentDecisions.filter(d => d.outcome === 'failure').length;
    const recentSuccesses = recentDecisions.filter(d => d.outcome === 'success').length;
    
    if (recentFailures >= 4) {
      insights.push({
        type: 'warning',
        title: 'Recent Losing Streak',
        message: `You've had ${recentFailures} failures in your last 5 decisions. Take a step back—are you rushing? Missing key information?`
      });
    } else if (recentSuccesses >= 4) {
      insights.push({
        type: 'positive',
        title: 'Strong Recent Performance',
        message: `You've successfully predicted ${recentSuccesses} of your last 5 decisions. Your calibration is improving!`
      });
    }
  }

  // 5. Hindsight Bias Check (comparing confidence on failures)
  const lowConfidenceSuccesses = completed.filter(d => d.confidence < 50 && d.outcome === 'success');
  if (lowConfidenceSuccesses.length >= 2) {
    insights.push({
      type: 'neutral',
      title: 'Underconfident on Wins',
      message: `You've had ${lowConfidenceSuccesses.length} successes where you were <50% confident. You may be underestimating yourself in certain domains.`
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

// --- CSV Export ---
export const exportToCSV = (decisions: Decision[]) => {
  const headers = [
    'Title',
    'Context',
    'Prediction',
    'Confidence %',
    'Assumptions',
    'Pre-Mortem',
    'Tags',
    'Created Date',
    'Target Date',
    'Status',
    'Outcome',
    'Outcome Notes',
    'Resolved Date'
  ];

  const rows = decisions.map(d => [
    d.title,
    d.context,
    d.prediction,
    d.confidence,
    d.assumptions,
    d.preMortem,
    d.tags.join('; '),
    formatDate(d.createdAt),
    formatDate(d.targetDate),
    d.status,
    d.outcome || '',
    d.outcomeNotes || '',
    d.resolvedAt ? formatDate(d.resolvedAt) : ''
  ]);

  // Escape CSV fields
  const escapeCSV = (field: string | number) => {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `decision-receipts-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Calibration Metrics ---

/**
 * Calculate Brier Score - a measure of prediction accuracy
 * Lower is better (0 = perfect, 1 = worst possible)
 * Formula: mean((prediction - outcome)^2) where outcome is 0 or 1
 */
export const calculateBrierScore = (decisions: Decision[]): number | null => {
  const completed = decisions.filter(d => d.status === 'completed' && d.outcome);
  if (completed.length === 0) return null;

  const scores = completed.map(d => {
    const prediction = d.confidence / 100; // Convert to 0-1
    const outcome = d.outcome === 'success' ? 1 : 0;
    return Math.pow(prediction - outcome, 2);
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

/**
 * Calculate calibration error - how far predictions deviate from reality
 * Returns percentage points of average deviation
 */
export const calculateCalibrationError = (decisions: Decision[]): number | null => {
  const completed = decisions.filter(d => d.status === 'completed' && d.outcome);
  if (completed.length < 3) return null;

  // Bucket decisions by confidence ranges
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const min = i * 10;
    const max = (i + 1) * 10;
    const items = completed.filter(d => d.confidence >= min && d.confidence < max);
    if (items.length === 0) return null;

    const avgConfidence = items.reduce((sum, d) => sum + d.confidence, 0) / items.length;
    const successRate = (items.filter(d => d.outcome === 'success').length / items.length) * 100;
    
    return Math.abs(avgConfidence - successRate);
  }).filter(error => error !== null) as number[];

  if (buckets.length === 0) return null;
  
  return buckets.reduce((sum, error) => sum + error, 0) / buckets.length;
};

/**
 * Determine if user is overconfident, underconfident, or well-calibrated
 */
export const getCalibrationStatus = (decisions: Decision[]): {
  status: 'overconfident' | 'underconfident' | 'well-calibrated' | 'insufficient-data';
  message: string;
} => {
  const completed = decisions.filter(d => d.status === 'completed' && d.outcome);
  
  if (completed.length < 5) {
    return {
      status: 'insufficient-data',
      message: 'Need at least 5 completed decisions to assess calibration.'
    };
  }

  const avgConfidence = completed.reduce((sum, d) => sum + d.confidence, 0) / completed.length;
  const successRate = (completed.filter(d => d.outcome === 'success').length / completed.length) * 100;
  const diff = avgConfidence - successRate;

  if (Math.abs(diff) < 5) {
    return {
      status: 'well-calibrated',
      message: `Your confidence (${avgConfidence.toFixed(0)}%) closely matches your actual success rate (${successRate.toFixed(0)}%).`
    };
  } else if (diff > 5) {
    return {
      status: 'overconfident',
      message: `You're ${diff.toFixed(0)}% overconfident. Your predictions are more optimistic than reality.`
    };
  } else {
    return {
      status: 'underconfident',
      message: `You're ${Math.abs(diff).toFixed(0)}% underconfident. You're succeeding more than you expect.`
    };
  }
};
