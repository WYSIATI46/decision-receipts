export type DecisionStatus = 'active' | 'completed';
export type OutcomeType = 'success' | 'failure' | 'mixed' | null;

export interface Decision {
  id: string;
  title: string;
  context: string; // The "Why"
  prediction: string; // The "What will happen"
  confidence: number; // 0-100
  assumptions: string; // "What needs to be true"
  preMortem: string; // "Why might this fail?"
  tags: string[];
  createdAt: number;
  targetDate: number; // When do we expect to know?
  status: DecisionStatus;
  outcome: OutcomeType;
  outcomeNotes: string;
  resolvedAt: number | null;
}

export interface Insight {
  type: 'positive' | 'warning' | 'neutral';
  title: string;
  message: string;
}

export type ViewState = 'dashboard' | 'new' | 'active' | 'history' | 'analytics';