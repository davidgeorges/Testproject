import { Platform } from 'react-native';
import { useSession } from '../store/session';
import type {
  BankAccount,
  BankTransaction,
  Connection,
  CategoryBudget,
  Dashboard,
  FinanceFilters,
  FinanceOverview,
  FinanceTransaction,
  Notification,
  Payment,
  Profile,
  PremiumStatus,
  Recommendation,
  UserDocument,
  DocumentCategory,
} from '../types/api';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:5080' : 'http://localhost:5080');
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const idempotencyKey = () => `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
type ApiRequestInit = RequestInit & { timeoutMs?: number };

async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const token = useSession.getState().token;
  const controller = new AbortController();
  // Render Free can need up to 50 seconds to wake after inactivity.
  const { timeoutMs = 60000, ...requestInit } = init;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, {
      ...requestInit,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...requestInit.headers,
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) useSession.getState().setToken(null);
      throw new ApiError(
        response.status,
        body.code ?? 'NETWORK',
        body.message ?? 'Le service est momentanément indisponible.',
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Connexion au service impossible. Vérifiez votre réseau puis réessayez.');
  } finally {
    clearTimeout(timeout);
  }
}
async function requestText(path: string, init: ApiRequestInit = {}): Promise<string> {
  const token = useSession.getState().token;
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401) useSession.getState().setToken(null);
    throw new ApiError(response.status, 'EXPORT_FAILED', 'L’export des transactions a échoué.');
  }
  return response.text();
}
async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const token = useSession.getState().token;
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) useSession.getState().setToken(null);
    throw new ApiError(
      response.status,
      body.code ?? 'UPLOAD_FAILED',
      body.message ?? 'L’import a échoué.',
    );
  }
  return (await response.json()) as T;
}
const financeQuery = (filters: FinanceFilters = {}) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
};
export const api = {
  session: () => request<{ token: string }>('/demo/sessions', { method: 'POST' }),
  dashboard: () => request<Dashboard>('/dashboard'),
  subscriptions: () => request<{ items: Payment[]; total: number }>('/subscriptions?limit=100'),
  subscription: (id: string) => request<Payment>(`/subscriptions/${encodeURIComponent(id)}`),
  updateSubscription: (id: string, category: string | null, status: 'active' | 'ignored') =>
    request(`/subscriptions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ category, status }),
    }),
  recommendations: () => request<Recommendation[]>('/recommendations'),
  realizedRecommendations: () =>
    request<
      { recommendationId: string; confirmedAnnualSaving: number | null; occurredAt: string }[]
    >('/recommendations/realized'),
  markRecommendationRealized: (id: string) =>
    request<{ realized: boolean }>(`/recommendations/${encodeURIComponent(id)}/realized`, {
      method: 'POST',
    }),
  recommendation: (id: string) =>
    request<Recommendation>(`/recommendations/${encodeURIComponent(id)}`),
  connections: () => request<Connection[]>('/bank/connections'),
  accounts: () => request<BankAccount[]>('/bank/accounts'),
  bankTransactions: (connectionId?: string, limit = 30) =>
    request<{ items: BankTransaction[]; total: number }>(
      `/bank/transactions?limit=${limit}${connectionId ? `&connectionId=${encodeURIComponent(connectionId)}` : ''}`,
    ),
  financeOverview: (filters: FinanceFilters = {}) =>
    request<FinanceOverview>(`/finances/overview${financeQuery(filters)}`),
  financeTransactions: (filters: FinanceFilters = {}, limit = 500) =>
    request<{ items: FinanceTransaction[]; total: number }>(
      `/finances/transactions${financeQuery({ ...filters })}${financeQuery(filters) ? '&' : '?'}limit=${limit}`,
    ),
  financeBudgets: () => request<CategoryBudget[]>('/finances/budgets'),
  saveFinanceBudget: (
    category: string,
    monthlyLimit: number,
    categoryType: 'fixed' | 'variable',
    displayName?: string | null,
  ) =>
    request<CategoryBudget>(`/finances/budgets/${encodeURIComponent(category)}`, {
      method: 'PUT',
      body: JSON.stringify({ monthlyLimit, categoryType, displayName }),
    }),
  deleteFinanceBudget: (category: string) =>
    request(`/finances/budgets/${encodeURIComponent(category)}`, { method: 'DELETE' }),
  saveTransactionCategory: (transactionId: string, category: string) =>
    request(`/finances/transactions/${encodeURIComponent(transactionId)}/category`, {
      method: 'PUT',
      body: JSON.stringify({ category }),
    }),
  deleteTransactionCategory: (transactionId: string) =>
    request(`/finances/transactions/${encodeURIComponent(transactionId)}/category`, {
      method: 'DELETE',
    }),
  exportFinanceCsv: (filters: FinanceFilters = {}) =>
    requestText(`/finances/export.csv${financeQuery(filters)}`),
  tinkLink: (native = false) =>
    request<{ url: string }>(`/bank/tink/link${native ? '?native=true' : ''}`),
  completeTink: (code: string, credentialsId: string | null, state: string | null, key: string) =>
    request<Connection>('/bank/tink/callback', {
      method: 'POST',
      timeoutMs: 60000,
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ code, credentialsId, state }),
    }),
  connect: (bankName: string, key: string) =>
    request<Connection>('/bank/connections', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ bankName, consentGranted: true }),
    }),
  sync: (id: string, key: string) =>
    request(`/bank/connections/${id}/sync`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
    }),
  queueSync: (id: string, key: string) =>
    request<{ id: string; connectionId: string; status: string }>(
      `/bank/connections/${encodeURIComponent(id)}/sync-jobs`,
      { method: 'POST', headers: { 'Idempotency-Key': key } },
    ),
  syncJob: (id: string) =>
    request<{
      id: string;
      connectionId: string;
      status: 'queued' | 'processing' | 'completed' | 'failed';
      attempts: number;
      transactionCount: number | null;
      errorCode: string | null;
    }>(`/bank/sync-jobs/${encodeURIComponent(id)}`),
  disconnect: (id: string) => request(`/bank/connections/${id}`, { method: 'DELETE' }),
  click: (id: string, key: string) =>
    request<{ tracked: boolean; isDemo: boolean; url: string | null }>(
      `/recommendations/${id}/click`,
      { method: 'POST', headers: { 'Idempotency-Key': key } },
    ),
  profile: () => request<Profile>('/profile'),
  saveProfile: (
    profile: Pick<Profile, 'firstName' | 'theme' | 'accentColor' | 'notificationsEnabled'>,
  ) => request<Profile>('/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  acceptLegal: (version: string) =>
    request('/consents/legal', { method: 'POST', body: JSON.stringify({ version }) }),
  notifications: () => request<Notification[]>('/notifications'),
  readNotification: (id: string) =>
    request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  pushDevices: () => request<Array<{ id: string; platform: string }>>('/push/devices'),
  registerPushDevice: (platform: 'ios' | 'android', token: string) =>
    request<{ id: string; platform: string }>('/push/devices', {
      method: 'POST',
      body: JSON.stringify({ platform, token }),
    }),
  removePushDevice: (id: string) =>
    request(`/push/devices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  premiumStatus: () => request<PremiumStatus>('/premium/status'),
  documents: (search = '', category = 'all') => {
    const query = new URLSearchParams();
    if (search.trim()) query.set('search', search.trim());
    if (category !== 'all') query.set('category', category);
    const encoded = query.toString();
    return request<UserDocument[]>(`/documents${encoded ? `?${encoded}` : ''}`);
  },
  document: (id: string) => request<UserDocument>(`/documents/${encodeURIComponent(id)}`),
  uploadDocument: (form: FormData) => requestForm<UserDocument>('/documents', form),
  updateDocument: (
    id: string,
    value: {
      title: string;
      category: DocumentCategory;
      issuer: string | null;
      amount: number | null;
      documentDate: string | null;
      dueDate: string | null;
      contractNumber: string | null;
    },
  ) =>
    request<UserDocument>(`/documents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(value),
    }),
  deleteDocument: (id: string) =>
    request(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  documentContent: async (id: string) => {
    const token = useSession.getState().token;
    const response = await fetch(`${API_URL}/api/v1/documents/${encodeURIComponent(id)}/content`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok)
      throw new ApiError(
        response.status,
        'DOCUMENT_OPEN_FAILED',
        'Le document ne peut pas être ouvert.',
      );
    return response.blob();
  },
  verifyRevenueCat: (productId: string, transactionId: string, key: string) =>
    request<PremiumStatus>('/premium/verify-purchase', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ provider: 'revenuecat', productId, transactionId, signedPayload: '' }),
    }),
  deleteAccount: () => request('/account', { method: 'DELETE' }),
};
