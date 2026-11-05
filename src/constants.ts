export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Varavuselavu';

export const GROQ_MODEL = 'llama-3.1-8b-instant';
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface DefaultCategory {
  name: string;
  type: 'in' | 'out';
  icon: string;
  color: string;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Income categories
  { name: "Daddy's money", type: 'in', icon: 'wallet', color: '#7C3AED', sortOrder: 1 },
  { name: 'Side hustle', type: 'in', icon: 'briefcase', color: '#16A34A', sortOrder: 2 },
  { name: 'Other', type: 'in', icon: 'gift', color: '#0EA5E9', sortOrder: 3 },
  // Expense categories
  { name: 'Food & snacks', type: 'out', icon: 'fast-food', color: '#F97316', sortOrder: 4 },
  { name: 'Travel & fuel', type: 'out', icon: 'bus', color: '#3B82F6', sortOrder: 5 },
  { name: 'Education', type: 'out', icon: 'school', color: '#8B5CF6', sortOrder: 6 },
  { name: 'Recharge & subscriptions', type: 'out', icon: 'phone-portrait', color: '#14B8A6', sortOrder: 7 },
  { name: 'Shopping', type: 'out', icon: 'bag-handle', color: '#EC4899', sortOrder: 8 },
  { name: 'Outings & fun', type: 'out', icon: 'game-controller', color: '#EAB308', sortOrder: 9 },
  { name: 'Others', type: 'out', icon: 'ellipsis-horizontal', color: '#94A3B8', sortOrder: 10 },
];

