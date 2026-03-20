export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechProfile {
  id: string;
  userId: string;
  rawText?: string;
  structuredProfile: StructuredProfile;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredProfile {
  languages: SkillEntry[];
  frameworks: SkillEntry[];
  domains: string[];
  yearsOfExperience: number;
}

export interface SkillEntry {
  name: string;
  proficiency: 'beginner' | 'intermediate' | 'senior' | 'expert';
}
