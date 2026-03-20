export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  color: string;
}

export const DEFAULT_CATEGORIES = [
  { name: 'work', color: '#3B82F6' },
  { name: 'exercise', color: '#10B981' },
  { name: 'family', color: '#F59E0B' },
  { name: 'personal', color: '#8B5CF6' },
  { name: 'errand', color: '#EF4444' },
  { name: 'learning', color: '#06B6D4' },
] as const;
