export type Category =
  | 'streaming'
  | 'software'
  | 'mobile'
  | 'internet'
  | 'insurance'
  | 'energy'
  | 'sport'
  | 'press'
  | 'cloud';
export interface Payment {
  id: string;
  merchant: string;
  category: Category;
  cadence: 'monthly' | 'quarterly' | 'annual';
  amount: number;
  monthlyCost: number;
  confidence: string;
  firstSeenAt: string;
  lastSeenAt: string;
  nextPaymentAt: string;
  history: { date: string; amount: number }[];
}
export interface Offer {
  id: string;
  providerName: string;
  monthlyPrice: number;
  setupFee: number;
  benefits: string[];
  assumptions: string[];
  isPartner: boolean;
  url: string | null;
}
export interface Recommendation {
  id: string;
  subscriptionId: string;
  title: string;
  category: Category;
  currentCost: number;
  suggestedCost: number;
  annualSaving: number;
  confidence: string;
  explanation: string;
  assumptions: string[];
  offer: Offer;
}
export interface Dashboard {
  subscriptionCount: number;
  monthlyRecurringCost: number;
  annualPotentialSaving: number;
  lastSyncAt: string | null;
  topRecommendations: Recommendation[];
  isDemo: boolean;
}
export interface Connection {
  id: string;
  bankName: string;
  status: string;
  lastSyncAt: string | null;
  consentExpiresAt: string;
}
export interface Profile {
  id: string;
  firstName: string;
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
}

export interface Notification {
  id: string;
  type: 'sync_completed' | 'saving_found' | string;
  title: string;
  body: string;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
}
