export const PILLARS = ['Family', 'Finance', 'Faith', 'Fitness', 'Friends', 'Fun', 'Field'] as const;
export type Pillar = typeof PILLARS[number];

export const PILLAR_SUBTOPICS: Record<Pillar, string> = {
  Family: 'Spouses, Partners, Parents, Children, Connection, Intimacy, Parenting, Conflict Management',
  Finance: 'Income, Taxes, Savings, Debt, Estate Planning, Career, Wealth Planning, Insurance',
  Faith: 'Morals/Ethics, Spiritual Accountability, Stewardship, Meditation/Prayer, Disciplines, Study',
  Fitness: 'Exercise, Nutrition, Stress Reduction, Hydration, Mind-Body Wellness, Strength',
  Friends: 'Community, Neighbors, Social Groups, Workplace Relations, Deep Conversations, Empathy',
  Fun: 'Art, Music, Hobbies, Travel, Relaxation, Me-Time, Entertainment, Laughter, Celebration',
  Field: 'Profession, Purpose, Career Progression, Culture, Professional Development, Leaders, Training',
};

export interface PillarScore {
  pillar: Pillar;
  score: number;
  whats_happening?: string;
  how_it_feels?: string;
}

export interface CheckIn {
  id: string;
  date: string;
  scores: PillarScore[];
}

export interface JournalEntry {
  id: string;
  date: string;
  dailyRating: number; // -2 to +2
  stepCount: number;
  topPriority: string;
  topPriorityDone: boolean;
  gratitude: [string, string, string];
  bestSelfHabits: Record<string, boolean>;
}

export interface TruthStatement {
  id: string;
  date: string;
  priority: string;
  levels: string[];
  statement: string;
}

export const DEFAULT_HABITS = [
  'Morning Routine',
  'No Sugar',
  'Exercise',
  'Read 10 Pages',
  'Meditate',
  'Gratitude Journal',
  'Early Sleep',
  'Hydrate 8 Glasses',
];

// Sample fixtures removed — all data now lives in Supabase (user_checkins, user_journal_entries, user_truth_statements).
