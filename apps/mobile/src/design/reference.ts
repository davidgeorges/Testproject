import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { PREVIEW_ENABLED, useSession, useLiveToken } from '../store/session';
import type { BankAccount, BankTransaction, Connection, Dashboard, Payment, Recommendation } from '../types/api';

// Visual fixtures from the supplied mockup, never commercial quotes or live bank data.
const services: [string, string, Payment['category'], number][] = [
  ['netflix', 'Netflix', 'streaming', 15.99],
  ['spotify', 'Spotify', 'streaming', 11.99],
  ['amazon', 'Amazon Prime', 'streaming', 6.99],
  ['canal', 'Canal+', 'streaming', 39.99],
  ['adobe', 'Adobe', 'software', 69.99],
  ['sport', 'Salle de sport', 'sport', 39],
  ['health', 'Mutuelle', 'insurance', 104],
];
export const referencePayments: Payment[] = services.map(([id, merchant, category, amount]) => ({
  id,
  merchant,
  category,
  amount,
  monthlyCost: amount,
  cadence: 'monthly',
  confidence: 'HIGH',
  firstSeenAt: '2022-01-12',
  lastSeenAt: '2025-03-12',
  nextPaymentAt: '2025-04-12',
  history: ['2024-10-12', '2024-11-12', '2024-12-12', '2025-01-12', '2025-02-12', '2025-03-12'].map(
    (date) => ({ date, amount }),
  ),
}));
export const referenceRecommendations: Recommendation[] = [
  {
    id: 'mobile',
    subscriptionId: 'mobile',
    title: 'Forfait mobile',
    category: 'mobile',
    currentCost: 34.99,
    suggestedCost: 14.99,
    annualSaving: 240,
    confidence: 'LOW',
    explanation:
      'Votre consommation moyenne est largement inférieure à votre forfait actuel. Une offre à 80 Go couvre vos besoins tout en réduisant votre facture.',
    assumptions: [
      'Profil de démonstration : forfait actuel de 200 Go, consommation de 21 Go/mois.',
      'Tarif et offre illustratifs, à vérifier avant toute souscription.',
    ],
    offer: {
      id: 'sosh',
      providerName: 'Sosh · Série 80 Go',
      monthlyPrice: 14.99,
      setupFee: 0,
      benefits: [
        '80 Go (largement suffisant)',
        'Appels et SMS illimités',
        'Réseau Orange',
        'Sans engagement',
      ],
      assumptions: [],
      isPartner: true,
      url: null,
    },
  },
  {
    id: 'auto',
    subscriptionId: 'auto',
    title: 'Assurance auto',
    category: 'insurance',
    currentCost: 64,
    suggestedCost: 49,
    annualSaving: 180,
    confidence: 'LOW',
    explanation: 'Une alternative à comparer à garanties et franchises équivalentes.',
    assumptions: ['Profil et garanties fictifs, éligibilité à vérifier.'],
    offer: {
      id: 'auto-demo',
      providerName: 'Offre assurance',
      monthlyPrice: 49,
      setupFee: 0,
      benefits: ['Devis personnalisé', 'Garanties à comparer'],
      assumptions: [],
      isPartner: true,
      url: null,
    },
  },
  {
    id: 'internet',
    subscriptionId: 'internet',
    title: 'Internet',
    category: 'internet',
    currentCost: 39.99,
    suggestedCost: 31.99,
    annualSaving: 96,
    confidence: 'LOW',
    explanation: 'Comparez le tarif de votre accès Internet avec cette alternative.',
    assumptions: ['Éligibilité fibre inconnue. Offre fictive.'],
    offer: {
      id: 'fiber-demo',
      providerName: 'Offre fibre',
      monthlyPrice: 31.99,
      setupFee: 0,
      benefits: ['Fibre Internet', 'Sans engagement'],
      assumptions: [],
      isPartner: true,
      url: null,
    },
  },
  {
    id: 'health',
    subscriptionId: 'health',
    title: 'Mutuelle',
    category: 'insurance',
    currentCost: 104,
    suggestedCost: 94,
    annualSaving: 120,
    confidence: 'LOW',
    explanation: 'Comparez les garanties adaptées à vos besoins avant de choisir.',
    assumptions: ['Données de maquette. Garanties non vérifiées.'],
    offer: {
      id: 'health-demo',
      providerName: 'Offre mutuelle',
      monthlyPrice: 94,
      setupFee: 0,
      benefits: ['Garanties à comparer'],
      assumptions: [],
      isPartner: true,
      url: null,
    },
  },
];
const toDate = (monthOffset: number, day = 1, hour = 10) =>
  new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth() - monthOffset,
      day,
      hour,
      30,
    ),
  ).toISOString();
const inDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

export const referenceConnections: Connection[] = [
  {
    id: 'conn-ccf',
    bankName: 'Crédit Agricole',
    status: 'connected',
    lastSyncAt: toDate(0, 5),
    consentExpiresAt: inDays(120),
  },
  {
    id: 'conn-lcl',
    bankName: 'LCL',
    status: 'connected',
    lastSyncAt: toDate(1, 12),
    consentExpiresAt: inDays(120),
  },
];

export const referenceAccounts: BankAccount[] = [
  { id: 'acc-ccf-01', connectionId: 'conn-ccf', accountType: 'Compte courant', maskedName: 'Compte pro' },
  { id: 'acc-ccf-02', connectionId: 'conn-ccf', accountType: 'Épargne', maskedName: 'Épargne' },
  { id: 'acc-lcl-01', connectionId: 'conn-lcl', accountType: 'Compte courant', maskedName: 'Compte perso' },
];

export const referenceBankTransactions: BankTransaction[] = [
  {
    id: 'tx-ccf-001',
    connectionId: 'conn-ccf',
    accountId: 'acc-ccf-01',
    bookedAt: toDate(0, 3),
    amount: 2850,
    currency: 'EUR',
    merchantName: 'Salaire entreprise',
    category: 'salaire',
  },
  {
    id: 'tx-ccf-002',
    connectionId: 'conn-ccf',
    accountId: 'acc-ccf-01',
    bookedAt: toDate(0, 4),
    amount: -148.99,
    currency: 'EUR',
    merchantName: 'Loyer',
    category: 'logement',
  },
  {
    id: 'tx-ccf-003',
    connectionId: 'conn-ccf',
    accountId: 'acc-ccf-01',
    bookedAt: toDate(0, 6),
    amount: -54.23,
    currency: 'EUR',
    merchantName: 'Carrefour',
    category: 'courses',
  },
  {
    id: 'tx-ccf-004',
    connectionId: 'conn-ccf',
    accountId: 'acc-ccf-01',
    bookedAt: toDate(0, 7),
    amount: -39.99,
    currency: 'EUR',
    merchantName: 'Netflix',
    category: 'streaming',
  },
  {
    id: 'tx-ccf-005',
    connectionId: 'conn-ccf',
    accountId: 'acc-ccf-01',
    bookedAt: toDate(0, 8),
    amount: -22.9,
    currency: 'EUR',
    merchantName: 'Vente essence',
    category: 'transport',
  },
  {
    id: 'tx-ccf-006',
    connectionId: 'conn-ccf',
    accountId: 'acc-ccf-01',
    bookedAt: toDate(0, 11),
    amount: -18.5,
    currency: 'EUR',
    merchantName: 'Deliveroo',
    category: 'restauration',
  },
  {
    id: 'tx-ccf-007',
    connectionId: 'conn-ccf',
    accountId: 'acc-ccf-02',
    bookedAt: toDate(0, 10),
    amount: -9.99,
    currency: 'EUR',
    merchantName: 'Spotify',
    category: 'streaming',
  },
  {
    id: 'tx-lcl-001',
    connectionId: 'conn-lcl',
    accountId: 'acc-lcl-01',
    bookedAt: toDate(0, 2),
    amount: -58.7,
    currency: 'EUR',
    merchantName: 'EDF',
    category: 'energie',
  },
  {
    id: 'tx-lcl-002',
    connectionId: 'conn-lcl',
    accountId: 'acc-lcl-01',
    bookedAt: toDate(0, 9),
    amount: -24.9,
    currency: 'EUR',
    merchantName: 'Free Mobile',
    category: 'mobile',
  },
  {
    id: 'tx-lcl-003',
    connectionId: 'conn-lcl',
    accountId: 'acc-lcl-01',
    bookedAt: toDate(0, 12),
    amount: -89.9,
    currency: 'EUR',
    merchantName: 'Essence',
    category: 'transport',
  },
  {
    id: 'tx-lcl-004',
    connectionId: 'conn-lcl',
    accountId: 'acc-lcl-01',
    bookedAt: toDate(1, 6),
    amount: -54.2,
    currency: 'EUR',
    merchantName: 'César',
    category: 'restaurant',
  },
  {
    id: 'tx-lcl-005',
    connectionId: 'conn-lcl',
    accountId: 'acc-lcl-01',
    bookedAt: toDate(1, 20),
    amount: -79.0,
    currency: 'EUR',
    merchantName: 'Amazon',
    category: 'shopping',
  },
  {
    id: 'tx-lcl-006',
    connectionId: 'conn-lcl',
    accountId: 'acc-lcl-01',
    bookedAt: toDate(1, 25),
    amount: -12.4,
    currency: 'EUR',
    merchantName: 'Virements internes',
    category: 'transfert',
  },
  {
    id: 'tx-lcl-007',
    connectionId: 'conn-lcl',
    accountId: 'acc-lcl-01',
    bookedAt: toDate(2, 13),
    amount: -34.95,
    currency: 'EUR',
    merchantName: 'Prime',
    category: 'invest',
  },
];
export const referenceDashboard: Dashboard = {
  subscriptionCount: 12,
  monthlyRecurringCost: 284,
  annualPotentialSaving: 420,
  lastSyncAt: '2026-09-08T08:41:00Z',
  // The reference dashboard and recommendation pages intentionally use different sample amounts.
  topRecommendations: referenceRecommendations
    .slice(0, 3)
    .map((r, i) => ({ ...r, annualSaving: [180, 240, 96][i]! })),
  hasConnectedBank: true,
  isDemo: true,
};
export function useOverview() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['dashboard', token],
    queryFn: token
      ? api.dashboard
      : async () =>
          PREVIEW_ENABLED
            ? referenceDashboard
            : {
                subscriptionCount: 0,
                monthlyRecurringCost: 0,
                annualPotentialSaving: 0,
                lastSyncAt: null,
                topRecommendations: [],
                hasConnectedBank: false,
                isDemo: false,
              },
  });
}
export function usePayments() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['subscriptions', token],
    queryFn: token
      ? api.subscriptions
      : async () => ({
          items: PREVIEW_ENABLED ? referencePayments : [],
          total: PREVIEW_ENABLED ? 12 : 0,
        }),
  });
}
export function useRecommendations() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['recommendations', token],
    queryFn: token
      ? async () => {
          const [recommendations, realized] = await Promise.all([
            api.recommendations(),
            api.realizedRecommendations(),
          ]);
          const realizedById = new Map(realized.map((event) => [event.recommendationId, event]));
          return recommendations.map((item) => {
            const event = realizedById.get(item.id);
            return {
              ...item,
              realized: !!event,
              realizedAnnualSaving: event?.confirmedAnnualSaving ?? undefined,
              realizedAt: event?.occurredAt,
            };
          });
        }
      : async () => (PREVIEW_ENABLED ? referenceRecommendations : []),
  });
}
export function useProfile() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['profile', token],
    queryFn: token
      ? api.profile
      : async () => ({
          id: 'anonymous',
          firstName: PREVIEW_ENABLED ? 'Thomas' : 'Utilisateur',
          theme: useSession.getState().theme,
          notificationsEnabled: true,
        }),
  });
}
export function useBankConnections() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['bank-connections', token],
    queryFn: token
      ? api.connections
      : async () => (PREVIEW_ENABLED ? referenceConnections : []),
  });
}
export function useBankAccounts() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['bank-accounts', token],
    queryFn: token ? api.accounts : async () => (PREVIEW_ENABLED ? referenceAccounts : []),
  });
}
export function useBankTransactions(limit = 100, connectionId?: string, accountId?: string) {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['bank-transactions', token, connectionId ?? 'all', accountId ?? 'all', limit],
    queryFn: token
      ? () => api.bankTransactions(connectionId, limit)
      : async () => {
          const all = PREVIEW_ENABLED ? referenceBankTransactions : [];
          return {
            items: all.filter(
              (item) =>
                (connectionId ? item.connectionId === connectionId : true) &&
                (accountId ? item.accountId === accountId : true),
            ),
            total: all.length,
          };
        },
  });
}
