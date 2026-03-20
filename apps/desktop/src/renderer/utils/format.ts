export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const categoryColors: Record<string, string> = {
  work: '#7C5CFC',
  exercise: '#2CC197',
  family: '#F5A623',
  personal: '#A855F7',
  errand: '#8B8BA8',
  learning: '#F472B6',
};
