export interface Transaction {
  id: number | string; // Permitir string para IDs sintéticos (ex: 'session-income-123')
  userId: number;
  sessionId?: number;
  amount: number; // Em centavos
  description: string;
  category: string;
  date: string; // ISO 8601 string date
  type: 'income' | 'expense';
  photographerId?: number;
  createdAt?: string;
} 