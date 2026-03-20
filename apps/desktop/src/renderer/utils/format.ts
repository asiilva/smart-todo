export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const categoryColors: Record<string, string> = {
  work: '#3B82F6',
  exercise: '#10B981',
  family: '#F59E0B',
  personal: '#8B5CF6',
  errand: '#EF4444',
  learning: '#06B6D4',
};
