/**
 * CalibrationEngine.ts
 *
 * Research-backed calibration measurement engine based on:
 * - Brier (1950): Proper scoring rules for probability forecasts
 * - Tetlock (2015): Superforecasting methodology
 * - Murphy & Winkler (1987): Calibration curve analysis
 *
 * This engine provides proper calibration metrics with research-validated
 * thresholds and contextual interpretation.
 */

import { Decision } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type BinningStrategy = 'uniform' | 'quantile';

export interface CalibrationBin {
  binIndex: number;
  binStart: number;        // Lower bound (inclusive)
  binEnd: number;          // Upper bound (exclusive, except last bin)
  binMidpoint: number;     // Center of bin for display
  decisions: Decision[];   // Decisions in this bin
  sampleCount: number;     // Number of decisions
  avgConfidence: number;   // Average stated confidence
  actualAccuracy: number;  // Actual success rate (0-1)
  calibrationGap: number;  // avgConfidence - actualAccuracy (positive = overconfident)
  isReliable: boolean;     // Has minimum 5 samples for statistical reliability
}

export interface BrierScoreResult {
  score: number;           // Raw Brier score (0-1, lower is better)
  interpretation: BrierInterpretation;
  decomposition: {
    reliability: number;   // Calibration component
    resolution: number;    // Discrimination component
    uncertainty: number;   // Base rate uncertainty
  } | null;
}

export type BrierInterpretation =
  | 'excellent'      // <0.10
  | 'good'           // 0.10-0.15
  | 'fair'           // 0.15-0.20
  | 'poor'           // 0.20-0.25
  | 'worse_than_random'; // >0.25

export interface OverconfidenceResult {
  isOverconfident: boolean;
  isUnderconfident: boolean;
  overallGap: number;      // Positive = overconfident, negative = underconfident
  gapPercentage: number;   // Absolute gap in percentage points
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  binAnalysis: {
    binIndex: number;
    gap: number;
    isOverconfident: boolean;
    isSignificant: boolean; // Gap > 5%
  }[];
  tetlockComparison: string; // How user compares to Tetlock's superforecasters
}

export interface SampleSizeStatus {
  totalDecisions: number;
  completedDecisions: number;
  status: 'insufficient' | 'low' | 'adequate' | 'high';
  canShowMetrics: boolean;
  canShowPatterns: boolean;
  warningMessage: string | null;
  recommendation: string | null;
}

export interface DomainPerformance {
  tag: string;
  sampleCount: number;
  brierScore: number | null;
  avgConfidence: number;
  actualAccuracy: number;
  calibrationGap: number;
  isReliable: boolean;
}

export interface CalibrationReport {
  sampleSize: SampleSizeStatus;
  brierScore: BrierScoreResult | null;
  calibrationBins: CalibrationBin[];
  overconfidence: OverconfidenceResult | null;
  domainPerformance: DomainPerformance[];
  timestamp: number;
}

// ============================================================================
// CONSTANTS - Research-backed thresholds
// ============================================================================

/** Minimum samples needed to show any calibration metrics */
export const MIN_SAMPLES_FOR_METRICS = 10;

/** Minimum samples to show metrics without warning */
export const MIN_SAMPLES_FOR_CONFIDENCE = 20;

/** Minimum samples for high-confidence pattern detection */
export const MIN_SAMPLES_FOR_PATTERNS = 50;

/** Minimum samples per bin for statistical reliability */
export const MIN_SAMPLES_PER_BIN = 5;

/** Number of bins for uniform binning strategy */
export const NUM_BINS = 10;

/** Overconfidence alert threshold (percentage points) */
export const OVERCONFIDENCE_ALERT_THRESHOLD = 5;

/** Overconfidence warning threshold (percentage points) */
export const OVERCONFIDENCE_WARNING_THRESHOLD = 10;

/** Tetlock's average overconfidence in geopolitical forecasting (benchmark) */
export const TETLOCK_BENCHMARK = 3;

// Brier score interpretation thresholds (research-validated)
export const BRIER_THRESHOLDS = {
  excellent: 0.10,
  good: 0.15,
  fair: 0.20,
  poor: 0.25,
} as const;

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Get completed decisions with valid outcomes for calibration analysis.
 * Excludes 'mixed' outcomes as they're ambiguous for binary calibration.
 */
export function getCompletedDecisions(decisions: Decision[]): Decision[] {
  return decisions.filter(
    d => d.status === 'completed' &&
    (d.outcome === 'success' || d.outcome === 'failure')
  );
}

/**
 * Calculate Brier Score - the gold standard for probability forecast accuracy.
 *
 * Formula: BS = (1/N) * Σ(f_t - o_t)²
 * Where:
 *   f_t = forecast probability (confidence/100)
 *   o_t = outcome (1 if success, 0 if failure)
 *
 * Range: 0 (perfect) to 1 (worst possible)
 *
 * Reference: Brier, G. W. (1950). "Verification of forecasts expressed in
 * terms of probability." Monthly Weather Review.
 */
export function calculateBrierScore(decisions: Decision[]): BrierScoreResult | null {
  const completed = getCompletedDecisions(decisions);

  if (completed.length < MIN_SAMPLES_FOR_METRICS) {
    return null;
  }

  // Calculate raw Brier score
  const sumSquaredErrors = completed.reduce((sum, d) => {
    const forecast = d.confidence / 100;
    const outcome = d.outcome === 'success' ? 1 : 0;
    return sum + Math.pow(forecast - outcome, 2);
  }, 0);

  const score = sumSquaredErrors / completed.length;

  // Calculate decomposition (Murphy decomposition)
  // This helps understand WHY the score is what it is
  const decomposition = calculateBrierDecomposition(completed);

  return {
    score,
    interpretation: interpretBrierScore(score),
    decomposition,
  };
}

/**
 * Interpret Brier score with contextual labels.
 * Based on forecasting research benchmarks.
 */
function interpretBrierScore(score: number): BrierInterpretation {
  if (score < BRIER_THRESHOLDS.excellent) return 'excellent';
  if (score < BRIER_THRESHOLDS.good) return 'good';
  if (score < BRIER_THRESHOLDS.fair) return 'fair';
  if (score < BRIER_THRESHOLDS.poor) return 'poor';
  return 'worse_than_random';
}

/**
 * Get human-readable label for Brier interpretation.
 */
export function getBrierInterpretationLabel(interpretation: BrierInterpretation): string {
  const labels: Record<BrierInterpretation, string> = {
    excellent: 'Excellent calibration',
    good: 'Good calibration',
    fair: 'Fair calibration',
    poor: 'Poor calibration',
    worse_than_random: 'Worse than random guessing',
  };
  return labels[interpretation];
}

/**
 * Get color class for Brier interpretation.
 */
export function getBrierInterpretationColor(interpretation: BrierInterpretation): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<BrierInterpretation, { bg: string; text: string; border: string }> = {
    excellent: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    good: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    fair: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
    poor: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
    worse_than_random: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  };
  return colors[interpretation];
}

/**
 * Murphy decomposition of Brier score into reliability, resolution, and uncertainty.
 *
 * BS = Reliability - Resolution + Uncertainty
 *
 * - Reliability: How close forecasts are to observed frequencies (lower = better)
 * - Resolution: How much forecasts differ from base rate (higher = better)
 * - Uncertainty: Base rate uncertainty (constant for a given dataset)
 */
function calculateBrierDecomposition(decisions: Decision[]): {
  reliability: number;
  resolution: number;
  uncertainty: number;
} | null {
  if (decisions.length < MIN_SAMPLES_FOR_METRICS) return null;

  // Base rate (overall success rate)
  const successCount = decisions.filter(d => d.outcome === 'success').length;
  const baseRate = successCount / decisions.length;

  // Uncertainty = baseRate * (1 - baseRate)
  const uncertainty = baseRate * (1 - baseRate);

  // Group by confidence bins for reliability/resolution
  const bins = generateUniformBins(decisions);
  const populatedBins = bins.filter(b => b.sampleCount > 0);

  if (populatedBins.length === 0) {
    return { reliability: 0, resolution: 0, uncertainty };
  }

  // Reliability = (1/N) * Σ n_k * (f_k - o_k)²
  const reliability = populatedBins.reduce((sum, bin) => {
    const weight = bin.sampleCount / decisions.length;
    return sum + weight * Math.pow(bin.avgConfidence / 100 - bin.actualAccuracy, 2);
  }, 0);

  // Resolution = (1/N) * Σ n_k * (o_k - baseRate)²
  const resolution = populatedBins.reduce((sum, bin) => {
    const weight = bin.sampleCount / decisions.length;
    return sum + weight * Math.pow(bin.actualAccuracy - baseRate, 2);
  }, 0);

  return { reliability, resolution, uncertainty };
}

// ============================================================================
// BINNING FUNCTIONS
// ============================================================================

/**
 * Generate calibration bins using uniform 10% intervals.
 * Standard approach: [0-10), [10-20), ..., [90-100]
 */
export function generateUniformBins(decisions: Decision[]): CalibrationBin[] {
  const completed = getCompletedDecisions(decisions);

  return Array.from({ length: NUM_BINS }, (_, i) => {
    const binStart = i * 10;
    const binEnd = (i + 1) * 10;
    const binMidpoint = binStart + 5;

    // Last bin includes 100%
    const decisionsInBin = completed.filter(d =>
      i === NUM_BINS - 1
        ? d.confidence >= binStart && d.confidence <= binEnd
        : d.confidence >= binStart && d.confidence < binEnd
    );

    const sampleCount = decisionsInBin.length;

    if (sampleCount === 0) {
      return {
        binIndex: i,
        binStart,
        binEnd,
        binMidpoint,
        decisions: [],
        sampleCount: 0,
        avgConfidence: binMidpoint,
        actualAccuracy: 0,
        calibrationGap: 0,
        isReliable: false,
      };
    }

    const avgConfidence = decisionsInBin.reduce((sum, d) => sum + d.confidence, 0) / sampleCount;
    const successCount = decisionsInBin.filter(d => d.outcome === 'success').length;
    const actualAccuracy = successCount / sampleCount;
    const calibrationGap = (avgConfidence / 100) - actualAccuracy;

    return {
      binIndex: i,
      binStart,
      binEnd,
      binMidpoint,
      decisions: decisionsInBin,
      sampleCount,
      avgConfidence,
      actualAccuracy,
      calibrationGap,
      isReliable: sampleCount >= MIN_SAMPLES_PER_BIN,
    };
  });
}

/**
 * Generate calibration bins using quantile-based intervals.
 * Ensures approximately equal samples per bin.
 * Useful when decisions are not evenly distributed across confidence levels.
 */
export function generateQuantileBins(decisions: Decision[], numBins: number = NUM_BINS): CalibrationBin[] {
  const completed = getCompletedDecisions(decisions);

  if (completed.length < numBins) {
    // Fall back to uniform bins if too few decisions
    return generateUniformBins(decisions);
  }

  // Sort by confidence
  const sorted = [...completed].sort((a, b) => a.confidence - b.confidence);
  const binSize = Math.ceil(sorted.length / numBins);

  return Array.from({ length: numBins }, (_, i) => {
    const startIdx = i * binSize;
    const endIdx = Math.min((i + 1) * binSize, sorted.length);
    const decisionsInBin = sorted.slice(startIdx, endIdx);

    if (decisionsInBin.length === 0) {
      return {
        binIndex: i,
        binStart: 0,
        binEnd: 0,
        binMidpoint: 0,
        decisions: [],
        sampleCount: 0,
        avgConfidence: 0,
        actualAccuracy: 0,
        calibrationGap: 0,
        isReliable: false,
      };
    }

    const minConf = decisionsInBin[0].confidence;
    const maxConf = decisionsInBin[decisionsInBin.length - 1].confidence;
    const avgConfidence = decisionsInBin.reduce((sum, d) => sum + d.confidence, 0) / decisionsInBin.length;
    const successCount = decisionsInBin.filter(d => d.outcome === 'success').length;
    const actualAccuracy = successCount / decisionsInBin.length;
    const calibrationGap = (avgConfidence / 100) - actualAccuracy;

    return {
      binIndex: i,
      binStart: minConf,
      binEnd: maxConf,
      binMidpoint: (minConf + maxConf) / 2,
      decisions: decisionsInBin,
      sampleCount: decisionsInBin.length,
      avgConfidence,
      actualAccuracy,
      calibrationGap,
      isReliable: decisionsInBin.length >= MIN_SAMPLES_PER_BIN,
    };
  });
}

/**
 * Generate bins based on specified strategy.
 */
export function generateBins(
  decisions: Decision[],
  strategy: BinningStrategy = 'uniform'
): CalibrationBin[] {
  return strategy === 'uniform'
    ? generateUniformBins(decisions)
    : generateQuantileBins(decisions);
}

// ============================================================================
// OVERCONFIDENCE DETECTION
// ============================================================================

/**
 * Detect overconfidence patterns using research-validated thresholds.
 *
 * Alert threshold: >5% gap (Tetlock research)
 * Warning threshold: >10% gap (significant miscalibration)
 *
 * Reference: Tetlock, P. E. (2015). "Superforecasting: The Art and Science
 * of Prediction." - Average overconfidence of 3% in geopolitical forecasting.
 */
export function detectOverconfidence(decisions: Decision[]): OverconfidenceResult | null {
  const completed = getCompletedDecisions(decisions);

  if (completed.length < MIN_SAMPLES_FOR_METRICS) {
    return null;
  }

  const bins = generateUniformBins(decisions);
  const populatedBins = bins.filter(b => b.sampleCount > 0);

  // Calculate overall gap
  const avgConfidence = completed.reduce((sum, d) => sum + d.confidence, 0) / completed.length;
  const successRate = completed.filter(d => d.outcome === 'success').length / completed.length;
  const overallGap = (avgConfidence / 100) - successRate;
  const gapPercentage = Math.abs(overallGap * 100);

  // Analyze per-bin overconfidence
  const binAnalysis = populatedBins.map(bin => ({
    binIndex: bin.binIndex,
    gap: bin.calibrationGap * 100,
    isOverconfident: bin.calibrationGap > 0,
    isSignificant: Math.abs(bin.calibrationGap * 100) > OVERCONFIDENCE_ALERT_THRESHOLD,
  }));

  // Determine severity
  let severity: OverconfidenceResult['severity'] = 'none';
  if (gapPercentage > OVERCONFIDENCE_WARNING_THRESHOLD) {
    severity = 'severe';
  } else if (gapPercentage > OVERCONFIDENCE_ALERT_THRESHOLD) {
    severity = 'moderate';
  } else if (gapPercentage > TETLOCK_BENCHMARK) {
    severity = 'mild';
  }

  // Compare to Tetlock benchmark
  let tetlockComparison: string;
  if (gapPercentage <= TETLOCK_BENCHMARK) {
    tetlockComparison = 'Your calibration matches or beats Tetlock\'s superforecasters (3% average gap).';
  } else if (gapPercentage <= OVERCONFIDENCE_ALERT_THRESHOLD) {
    tetlockComparison = `Your ${gapPercentage.toFixed(1)}% gap is slightly above superforecaster level (3%), but within normal range.`;
  } else if (gapPercentage <= OVERCONFIDENCE_WARNING_THRESHOLD) {
    tetlockComparison = `Your ${gapPercentage.toFixed(1)}% gap indicates noticeable miscalibration. Superforecasters average 3%.`;
  } else {
    tetlockComparison = `Your ${gapPercentage.toFixed(1)}% gap is significantly above average. Consider reducing confidence by 10-15%.`;
  }

  return {
    isOverconfident: overallGap > (OVERCONFIDENCE_ALERT_THRESHOLD / 100),
    isUnderconfident: overallGap < -(OVERCONFIDENCE_ALERT_THRESHOLD / 100),
    overallGap,
    gapPercentage,
    severity,
    binAnalysis,
    tetlockComparison,
  };
}

// ============================================================================
// SAMPLE SIZE VALIDATION
// ============================================================================

/**
 * Evaluate sample size status for displaying calibration metrics.
 *
 * Based on statistical requirements for meaningful calibration curves:
 * - <10 decisions: Hide metrics entirely (too noisy)
 * - 10-20 decisions: Show with strong warning
 * - 20-50 decisions: Show with mild warning
 * - 50+ decisions: High confidence in pattern detection
 */
export function evaluateSampleSize(decisions: Decision[]): SampleSizeStatus {
  const completed = getCompletedDecisions(decisions);
  const totalDecisions = decisions.length;
  const completedDecisions = completed.length;

  if (completedDecisions < MIN_SAMPLES_FOR_METRICS) {
    return {
      totalDecisions,
      completedDecisions,
      status: 'insufficient',
      canShowMetrics: false,
      canShowPatterns: false,
      warningMessage: `Add ${MIN_SAMPLES_FOR_METRICS - completedDecisions} more resolved decisions to see calibration insights.`,
      recommendation: 'Continue making and resolving predictions to build your calibration baseline.',
    };
  }

  if (completedDecisions < MIN_SAMPLES_FOR_CONFIDENCE) {
    return {
      totalDecisions,
      completedDecisions,
      status: 'low',
      canShowMetrics: true,
      canShowPatterns: false,
      warningMessage: 'Small sample size — interpret metrics cautiously.',
      recommendation: `${MIN_SAMPLES_FOR_CONFIDENCE - completedDecisions} more decisions needed for reliable patterns.`,
    };
  }

  if (completedDecisions < MIN_SAMPLES_FOR_PATTERNS) {
    return {
      totalDecisions,
      completedDecisions,
      status: 'adequate',
      canShowMetrics: true,
      canShowPatterns: false,
      warningMessage: null,
      recommendation: `${MIN_SAMPLES_FOR_PATTERNS - completedDecisions} more decisions to unlock advanced pattern detection.`,
    };
  }

  return {
    totalDecisions,
    completedDecisions,
    status: 'high',
    canShowMetrics: true,
    canShowPatterns: true,
    warningMessage: null,
    recommendation: null,
  };
}

// ============================================================================
// DOMAIN/TAG ANALYSIS
// ============================================================================

/**
 * Analyze calibration performance by domain/tag.
 * Enables pattern detection across different decision categories.
 */
export function analyzeByDomain(decisions: Decision[]): DomainPerformance[] {
  const completed = getCompletedDecisions(decisions);

  // Collect all unique tags
  const allTags = new Set<string>();
  completed.forEach(d => d.tags.forEach(tag => allTags.add(tag)));

  if (allTags.size === 0) {
    return [];
  }

  return Array.from(allTags).map(tag => {
    const tagDecisions = completed.filter(d => d.tags.includes(tag));
    const sampleCount = tagDecisions.length;

    if (sampleCount === 0) {
      return {
        tag,
        sampleCount: 0,
        brierScore: null,
        avgConfidence: 0,
        actualAccuracy: 0,
        calibrationGap: 0,
        isReliable: false,
      };
    }

    const avgConfidence = tagDecisions.reduce((sum, d) => sum + d.confidence, 0) / sampleCount;
    const successCount = tagDecisions.filter(d => d.outcome === 'success').length;
    const actualAccuracy = successCount / sampleCount;
    const calibrationGap = (avgConfidence / 100) - actualAccuracy;

    // Calculate Brier score for this domain
    let brierScore: number | null = null;
    if (sampleCount >= MIN_SAMPLES_PER_BIN) {
      const sumSquaredErrors = tagDecisions.reduce((sum, d) => {
        const forecast = d.confidence / 100;
        const outcome = d.outcome === 'success' ? 1 : 0;
        return sum + Math.pow(forecast - outcome, 2);
      }, 0);
      brierScore = sumSquaredErrors / sampleCount;
    }

    return {
      tag,
      sampleCount,
      brierScore,
      avgConfidence,
      actualAccuracy,
      calibrationGap,
      isReliable: sampleCount >= MIN_SAMPLES_PER_BIN,
    };
  }).sort((a, b) => b.sampleCount - a.sampleCount);
}

/**
 * Get all unique tags from decisions for suggestions.
 */
export function getAllTags(decisions: Decision[]): string[] {
  const allTags = new Set<string>();
  decisions.forEach(d => d.tags.forEach(tag => allTags.add(tag)));
  return Array.from(allTags).sort();
}

// ============================================================================
// COMPREHENSIVE REPORT GENERATION
// ============================================================================

/**
 * Generate a complete calibration report with all metrics.
 * This is the main entry point for the calibration analysis.
 */
export function generateCalibrationReport(
  decisions: Decision[],
  binningStrategy: BinningStrategy = 'uniform'
): CalibrationReport {
  return {
    sampleSize: evaluateSampleSize(decisions),
    brierScore: calculateBrierScore(decisions),
    calibrationBins: generateBins(decisions, binningStrategy),
    overconfidence: detectOverconfidence(decisions),
    domainPerformance: analyzeByDomain(decisions),
    timestamp: Date.now(),
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR UI
// ============================================================================

/**
 * Format a probability/rate as a percentage string.
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Get severity color for overconfidence display.
 */
export function getOverconfidenceSeverityColor(severity: OverconfidenceResult['severity']): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<OverconfidenceResult['severity'], { bg: string; text: string; border: string }> = {
    none: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    mild: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
    moderate: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
    severe: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  };
  return colors[severity];
}

/**
 * Get sample size status badge color.
 */
export function getSampleSizeStatusColor(status: SampleSizeStatus['status']): {
  bg: string;
  text: string;
} {
  const colors: Record<SampleSizeStatus['status'], { bg: string; text: string }> = {
    insufficient: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400' },
    low: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    adequate: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    high: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  };
  return colors[status];
}
