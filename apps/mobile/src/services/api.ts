import { Platform } from 'react-native';
import { useSession } from '../store/session';
import type {
  BankAccount,
  BankTransaction,
  Connection,
  Dashboard,
  Notification,
  Payment,
  Profile,
  PremiumStatus,
  Recommendation,
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
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useSession.getState().token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
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
    throw new Error(
      'Connexion impossible. Vérifiez votre réseau et que le serveur local est démarré.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
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
  recommendation: (id: string) =>
    request<Recommendation>(`/recommendations/${encodeURIComponent(id)}`),
  connections: () => request<Connection[]>('/bank/connections'),
  accounts: () => request<BankAccount[]>('/bank/accounts'),
  bankTransactions: (connectionId?: string, limit = 30) =>
    request<{ items: BankTransaction[]; total: number }>(
      `/bank/transactions?limit=${limit}${connectionId ? `&connectionId=${encodeURIComponent(connectionId)}` : ''}`,
    ),
  tinkLink: () => request<{ url: string }>('/bank/tink/link'),
  completeTink: (code: string, credentialsId: string | null, key: string) =>
    request<Connection>('/bank/tink/callback', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ code, credentialsId }),
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
  disconnect: (id: string) => request(`/bank/connections/${id}`, { method: 'DELETE' }),
  click: (id: string, key: string) =>
    request<{ tracked: boolean; isDemo: boolean; url: string | null }>(
      `/recommendations/${id}/click`,
      { method: 'POST', headers: { 'Idempotency-Key': key } },
    ),
  profile: () => request<Profile>('/profile'),
  saveProfile: (profile: Pick<Profile, 'firstName' | 'theme' | 'notificationsEnabled'>) =>
    request<Profile>('/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
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
  verifyRevenueCat: (productId: string, transactionId: string, key: string) =>
    request<PremiumStatus>('/premium/verify-purchase', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ provider: 'revenuecat', productId, transactionId, signedPayload: '' }),
    }),
  deleteAccount: () => request('/account', { method: 'DELETE' }),
};
