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

export const SAMPLE_ENTRIES: JournalEntry[] = [
  { id: '1', date: '2026-03-17', dailyRating: 2, stepCount: 10200, topPriority: 'Launch MVP', topPriorityDone: true, gratitude: ['Great team meeting', 'Sunny weather', 'Good sleep'], bestSelfHabits: { 'Morning Routine': true, 'No Sugar': true, 'Exercise': true, 'Read 10 Pages': false, 'Meditate': true, 'Gratitude Journal': true, 'Early Sleep': false, 'Hydrate 8 Glasses': true } },
  { id: '2', date: '2026-03-18', dailyRating: 1, stepCount: 7800, topPriority: 'Finish report', topPriorityDone: true, gratitude: ['Coffee with friend', 'New book arrived', 'Healthy lunch'], bestSelfHabits: { 'Morning Routine': true, 'No Sugar': false, 'Exercise': true, 'Read 10 Pages': true, 'Meditate': false, 'Gratitude Journal': true, 'Early Sleep': true, 'Hydrate 8 Glasses': false } },
  { id: '3', date: '2026-03-19', dailyRating: 0, stepCount: 4500, topPriority: 'Doctor appointment', topPriorityDone: true, gratitude: ['Family dinner', 'Good podcast', 'Clear evening'], bestSelfHabits: { 'Morning Routine': false, 'No Sugar': true, 'Exercise': false, 'Read 10 Pages': false, 'Meditate': true, 'Gratitude Journal': true, 'Early Sleep': false, 'Hydrate 8 Glasses': true } },
  { id: '4', date: '2026-03-20', dailyRating: 2, stepCount: 12100, topPriority: 'Pitch deck', topPriorityDone: true, gratitude: ['Won new client', 'Family walk', 'Great workout'], bestSelfHabits: { 'Morning Routine': true, 'No Sugar': true, 'Exercise': true, 'Read 10 Pages': true, 'Meditate': true, 'Gratitude Journal': true, 'Early Sleep': true, 'Hydrate 8 Glasses': true } },
  { id: '5', date: '2026-03-21', dailyRating: -1, stepCount: 3200, topPriority: 'Tax filing', topPriorityDone: false, gratitude: ['Good lunch', 'Nice sunset', 'Supportive partner'], bestSelfHabits: { 'Morning Routine': false, 'No Sugar': false, 'Exercise': false, 'Read 10 Pages': false, 'Meditate': false, 'Gratitude Journal': true, 'Early Sleep': false, 'Hydrate 8 Glasses': false } },
  { id: '6', date: '2026-03-22', dailyRating: 1, stepCount: 8900, topPriority: 'Team standup', topPriorityDone: true, gratitude: ['Weekend plans', 'Good weather', 'Finished book'], bestSelfHabits: { 'Morning Routine': true, 'No Sugar': true, 'Exercise': true, 'Read 10 Pages': true, 'Meditate': false, 'Gratitude Journal': true, 'Early Sleep': true, 'Hydrate 8 Glasses': true } },
  { id: '7', date: '2026-03-23', dailyRating: 1, stepCount: 9500, topPriority: 'Strategic planning', topPriorityDone: false, gratitude: ['Morning yoga', 'Fresh air', 'Kind stranger'], bestSelfHabits: { 'Morning Routine': true, 'No Sugar': true, 'Exercise': true, 'Read 10 Pages': false, 'Meditate': true, 'Gratitude Journal': true, 'Early Sleep': false, 'Hydrate 8 Glasses': true } },
];

export const SAMPLE_CHECKIN: CheckIn = {
  id: '1',
  date: '2026-03-01',
  scores: [
    { pillar: 'Family', score: 8 },
    { pillar: 'Finance', score: 6 },
    { pillar: 'Faith', score: 7 },
    { pillar: 'Fitness', score: 4 },
    { pillar: 'Friends', score: 8 },
    { pillar: 'Fun', score: 3 },
    { pillar: 'Field', score: 9 },
  ],
};
