import { Decision } from '../types';

/**
 * Calibration bin - represents confidence bucket and actual success rate
 */
export interface CalibrationBin {
  minConfidence: number;
  maxConfidence: number;
  avgConfidence: number;
  actualSuccessRate: number;
  sampleCount: number;
  decisions: Decision[];
}

/**
 * Domain breakdown by tags
 */
export interface DomainStats {
  tag: string;
  totalDecisions: number;
  completedDecisions: number;
  successRate: number;
  avgConfidence: number;
  overconfidenceGap: number;
}

/**
 * Sample size assessment
 */
export type SampleSizeWarning = 'insufficient' | 'small' | 'adequate' | 'robust';

/**
 * Complete calibration metrics
 */
export interface CalibrationMetrics {
  brierScore: number | null;
  overconfidenceGap: number | null;
  calibrationCurve: CalibrationBin[];
  sampleSizeWarning: SampleSizeWarning;
  totalDecisions: number;
  completedDecisions: number;
  domainBreakdown: DomainStats[];
}

/**
 * CalibrationEngine - Research-backed behavioral science for decision tracking
 * Based on Tetlock's forecasting research and Brier (1950) accuracy scoring
 */
export class CalibrationEngine {
  /**
   * Calculate comprehensive calibration metrics
   */
  static calculateMetrics(decisions: Decision[]): CalibrationMetrics {
    const completed = decisions.filter(d => d.status === 'completed' && d.outcome !== null);

    // Determine sample size warning
    const sampleSizeWarning = this.getSampleSizeWarning(completed.length);

    // Calculate calibration curve (10 bins: 0-10%, 10-20%, ..., 90-100%)
    const calibrationCurve = this.calculateCalibrationCurve(completed);

    // Calculate Brier score
    const brierScore = this.calculateBrierScore(completed);

    // Calculate overconfidence gap
    const overconfidenceGap = this.calculateOverconfidenceGap(completed);

    // Calculate domain breakdown
    const domainBreakdown = this.calculateDomainBreakdown(decisions);

    return {
      brierScore,
      overconfidenceGap,
      calibrationCurve,
      sampleSizeWarning,
      totalDecisions: decisions.length,
      completedDecisions: completed.length,
      domainBreakdown,
    };
  }

  /**
   * Calculate 10-bin calibration curve
   * Each bin represents a 10% confidence range (0-10%, 10-20%, etc.)
   * Minimum bin size: 5 samples for reliability
   */
  static calculateCalibrationCurve(completed: Decision[]): CalibrationBin[] {
    const bins: CalibrationBin[] = [];

    for (let i = 0; i < 10; i++) {
      const minConfidence = i * 10;
      const maxConfidence = (i + 1) * 10;

      // Filter decisions in this confidence range
      const decisionsInBin = completed.filter(d =>
        d.confidence >= minConfidence && d.confidence < maxConfidence
      );

      // Only include bins with sufficient data
      if (decisionsInBin.length > 0) {
        const successCount = decisionsInBin.filter(d => d.outcome === 'success').length;
        const actualSuccessRate = (successCount / decisionsInBin.length) * 100;
        const avgConfidence = decisionsInBin.reduce((sum, d) => sum + d.confidence, 0) / decisionsInBin.length;

        bins.push({
          minConfidence,
          maxConfidence,
          avgConfidence,
          actualSuccessRate,
          sampleCount: decisionsInBin.length,
          decisions: decisionsInBin,
        });
      }
    }

    return bins;
  }

  /**
   * Calculate Brier score - measure of prediction accuracy
   * Formula: (1/N) * Σ(predicted - actual)²
   * Range: 0 (perfect) to 1 (worst possible)
   *
   * Thresholds based on forecasting research:
   * - Excellent: <0.10
   * - Good: 0.10-0.15
   * - Fair: 0.15-0.20
   * - Poor: >0.20
   */
  static calculateBrierScore(completed: Decision[]): number | null {
    if (completed.length === 0) return null;

    const scores = completed.map(d => {
      const predicted = d.confidence / 100; // Convert to 0-1 scale
      const actual = d.outcome === 'success' ? 1 : 0;
      return Math.pow(predicted - actual, 2);
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Calculate overconfidence gap - weighted difference between predicted and actual
   * Positive values indicate overconfidence, negative values indicate underconfidence
   *
   * Thresholds based on Tetlock's research:
   * - Well-calibrated: ±5%
   * - Moderate overconfidence: >5% (Tetlock benchmark × 1.67)
   * - Severe overconfidence: >10% (Tetlock benchmark × 3.33)
   */
  static calculateOverconfidenceGap(completed: Decision[]): number | null {
    if (completed.length === 0) return null;

    const avgConfidence = completed.reduce((sum, d) => sum + d.confidence, 0) / completed.length;
    const successRate = (completed.filter(d => d.outcome === 'success').length / completed.length) * 100;

    return avgConfidence - successRate;
  }

  /**
   * Determine sample size warning level
   * - <10: insufficient (don't show metrics)
   * - 10-20: small (show warning)
   * - 20-50: adequate
   * - 50+: robust
   */
  static getSampleSizeWarning(completedCount: number): SampleSizeWarning {
    if (completedCount < 10) return 'insufficient';
    if (completedCount < 20) return 'small';
    if (completedCount < 50) return 'adequate';
    return 'robust';
  }

  /**
   * Calculate domain breakdown by tags
   * Shows calibration metrics for each tag category
   */
  static calculateDomainBreakdown(decisions: Decision[]): DomainStats[] {
    // Get all unique tags
    const allTags = new Set<string>();
    decisions.forEach(d => d.tags.forEach(tag => allTags.add(tag)));

    const domainStats: DomainStats[] = [];

    allTags.forEach(tag => {
      const decisionsWithTag = decisions.filter(d => d.tags.includes(tag));
      const completedWithTag = decisionsWithTag.filter(d => d.status === 'completed' && d.outcome !== null);

      if (completedWithTag.length > 0) {
        const successCount = completedWithTag.filter(d => d.outcome === 'success').length;
        const successRate = (successCount / completedWithTag.length) * 100;
        const avgConfidence = completedWithTag.reduce((sum, d) => sum + d.confidence, 0) / completedWithTag.length;
        const overconfidenceGap = avgConfidence - successRate;

        domainStats.push({
          tag,
          totalDecisions: decisionsWithTag.length,
          completedDecisions: completedWithTag.length,
          successRate,
          avgConfidence,
          overconfidenceGap,
        });
      }
    });

    // Sort by number of decisions (most common tags first)
    return domainStats.sort((a, b) => b.totalDecisions - a.totalDecisions);
  }

  /**
   * Get all available tags from decisions (for autocomplete)
   */
  static getAvailableTags(decisions: Decision[]): string[] {
    const tags = new Set<string>();
    decisions.forEach(d => d.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  /**
   * Interpret Brier score
   */
  static interpretBrierScore(brierScore: number | null): string {
    if (brierScore === null) return 'Insufficient data';
    if (brierScore < 0.10) return 'Excellent';
    if (brierScore < 0.15) return 'Good';
    if (brierScore < 0.20) return 'Fair';
    return 'Poor';
  }

  /**
   * Interpret overconfidence gap
   */
  static interpretOverconfidenceGap(gap: number | null): {
    level: 'well-calibrated' | 'moderate' | 'severe' | 'underconfident';
    message: string;
  } {
    if (gap === null) {
      return {
        level: 'well-calibrated',
        message: 'Insufficient data to assess calibration',
      };
    }

    if (Math.abs(gap) <= 5) {
      return {
        level: 'well-calibrated',
        message: `Your predictions are well-calibrated (${gap > 0 ? '+' : ''}${gap.toFixed(1)}% gap)`,
      };
    }

    if (gap > 10) {
      return {
        level: 'severe',
        message: `Severe overconfidence detected (+${gap.toFixed(1)}%). You're significantly more confident than your results justify.`,
      };
    }

    if (gap > 5) {
      return {
        level: 'moderate',
        message: `Moderate overconfidence detected (+${gap.toFixed(1)}%). Consider reducing confidence estimates by 5-10%.`,
      };
    }

    return {
      level: 'underconfident',
      message: `You're underconfident (${gap.toFixed(1)}% gap). Your results are better than you expect.`,
    };
  }
}
