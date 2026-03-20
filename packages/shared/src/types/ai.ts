export interface EstimationResult {
  projectedDurationMinutes: number;
  confidence: number;
  reasoning: string;
  suggestedPriority?: 'low' | 'medium' | 'high' | 'critical';
  suggestedCategory?: string;
  suggestedLabels?: string[];
}

export interface ParsedTask {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  labels?: string[];
}
