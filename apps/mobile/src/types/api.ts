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
  realized?: boolean;
  realizedAnnualSaving?: number;
  realizedAt?: string;
}
export interface Dashboard {
  subscriptionCount: number;
  monthlyRecurringCost: number;
  annualPotentialSaving: number;
  lastSyncAt: string | null;
  topRecommendations: Recommendation[];
  hasConnectedBank: boolean;
  isDemo: boolean;
}
export interface Connection {
  id: string;
  bankName: string;
  status: string;
  lastSyncAt: string | null;
  consentExpiresAt: string;
}
export interface BankAccount {
  id: string;
  connectionId: string;
  accountType: string;
  maskedName: string;
}
export interface BankTransaction {
  id: string;
  connectionId: string;
  accountId: string | null;
  bookedAt: string;
  amount: number;
  currency: string;
  merchantName: string;
  category: string;
}
export type FinanceCategoryType = 'fixed' | 'variable';
export interface FinanceTransaction extends BankTransaction {
  categoryLabel: string;
  providerCategory: string;
  isCustomCategory: boolean;
  isInternalTransfer: boolean;
  bankName: string;
  accountName: string;
}
export interface CategoryBudget {
  id: string;
  category: string;
  displayName: string | null;
  monthlyLimit: number;
  categoryType: FinanceCategoryType;
  createdAt: string;
  updatedAt: string;
}
export interface FinanceCategorySummary {
  category: string;
  label: string;
  income: number;
  expense: number;
  count: number;
  categoryType: FinanceCategoryType;
  monthlyLimit: number | null;
  periodLimit: number | null;
  remaining: number | null;
  status: 'unset' | 'ok' | 'near' | 'exceeded';
}
export interface FinanceCashflow {
  month: string;
  income: number;
  expense: number;
  net: number;
  planned: number;
  delta: number;
}
export interface FinanceForecast {
  available: boolean;
  planned: number;
  spent: number;
  projected: number;
  remainingDays: number;
  isOverrun: boolean;
  overrunAmount: number;
}
export interface FinanceOverview {
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
  fixedExpense: number;
  variableExpense: number;
  monthlyBudget: number;
  categories: FinanceCategorySummary[];
  cashflow: FinanceCashflow[];
  forecast: FinanceForecast;
  transactionCount: number;
  internalTransferCount: number;
}
export interface FinanceFilters {
  from?: string;
  to?: string;
  connectionId?: string;
  accountId?: string;
  category?: string;
  kind?: 'income' | 'expense';
  search?: string;
  excludeInternalTransfers?: boolean;
}
export interface Profile {
  id: string;
  firstName: string;
  theme: 'dark' | 'light';
  accentColor: string;
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
export interface PremiumStatus {
  status: 'active' | 'cancelled' | 'inactive' | string;
  isPremium: boolean;
  plan: 'monthly' | 'annual' | null;
  renewsAt: string | null;
  provider: string | null;
  isDemo: boolean;
}

export type DocumentCategory =
  | 'invoice'
  | 'insurance'
  | 'bank'
  | 'work'
  | 'housing'
  | 'vehicle'
  | 'tax'
  | 'other';

export interface UserDocument {
  id: string;
  originalFileName: string;
  contentType: string;
  size: number;
  status: 'processing' | 'ready' | 'confirmed' | 'failed' | string;
  category: DocumentCategory;
  title: string;
  issuer: string | null;
  extractedText: string | null;
  amount: number | null;
  documentDate: string | null;
  dueDate: string | null;
  contractNumber: string | null;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deadline {
  id: string;
  title: string;
  category: string;
  notes: string | null;
  dueAt: string;
  reminderMinutesBefore: number | null;
  reminderSentAt: string | null;
  completedAt: string | null;
  sourceType: 'manual' | 'document';
  sourceId: string | null;
  editable: boolean;
}

export interface HouseholdMember {
  id: string;
  displayName: string;
  relationship: 'self' | 'partner' | 'child' | 'parent' | 'relative' | 'other';
  birthDate: string | null;
  email: string | null;
  accountStatus: 'owner' | 'managed' | 'invited' | 'linked';
  accessRole: 'owner' | 'editor' | 'viewer';
  hasAccount: boolean;
  invitationPending: boolean;
  invitationExpiresAt: string | null;
  invitationCode?: string | null;
}
export interface HouseholdBudget {
  id: string;
  name: string;
  category: string;
  monthlyLimit: number;
  notes: string | null;
  memberIds: string[];
}
export interface HouseholdResidence {
  id: string;
  name: string;
  kind: 'primary' | 'secondary';
  address: string | null;
  notes: string | null;
}
export interface HouseholdVehicle {
  id: string;
  name: string;
  registration: string | null;
  notes: string | null;
}
export interface HouseholdContract {
  id: string;
  name: string;
  category: string;
  provider: string | null;
  monthlyAmount: number | null;
  renewalDate: string | null;
  residenceId: string | null;
  vehicleId: string | null;
  notes: string | null;
  memberIds: string[];
}
export interface HouseholdWorkspace {
  id: string;
  name: string;
  canManageMembers: boolean;
  canEdit: boolean;
  members: HouseholdMember[];
  budgets: HouseholdBudget[];
  residences: HouseholdResidence[];
  vehicles: HouseholdVehicle[];
  contracts: HouseholdContract[];
}
