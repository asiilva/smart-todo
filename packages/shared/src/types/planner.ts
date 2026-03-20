export interface DailySettings {
  id: string;
  userId: string;
  availableFrom: string;
  availableUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProtectedTimeBlock {
  id: string;
  userId: string;
  title: string;
  category: string;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
  createdAt: string;
}

export interface DaySummary {
  totalProjectedMinutes: number;
  totalExecutedMinutes: number;
  availableMinutes: number;
  categoryBreakdown: Record<string, number>;
  isOverbooked: boolean;
}
