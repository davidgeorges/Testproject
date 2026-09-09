import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSession, useLiveToken } from '../store/session';
import type { Payment, Recommendation, Dashboard } from '../types/api';

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
export const referenceDashboard: Dashboard = {
  subscriptionCount: 12,
  monthlyRecurringCost: 284,
  annualPotentialSaving: 420,
  lastSyncAt: '2026-09-08T08:41:00Z',
  // The reference dashboard and recommendation pages intentionally use different sample amounts.
  topRecommendations: referenceRecommendations
    .slice(0, 3)
    .map((r, i) => ({ ...r, annualSaving: [180, 240, 96][i]! })),
  isDemo: true,
};
export function useOverview() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['dashboard', token],
    queryFn: token ? api.dashboard : async () => referenceDashboard,
  });
}
export function usePayments() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['subscriptions', token],
    queryFn: token ? api.subscriptions : async () => ({ items: referencePayments, total: 12 }),
  });
}
export function useRecommendations() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['recommendations', token],
    queryFn: token ? api.recommendations : async () => referenceRecommendations,
  });
}
export function useProfile() {
  const token = useLiveToken();
  return useQuery({
    queryKey: ['profile', token],
    queryFn: token
      ? api.profile
      : async () => ({
          id: 'preview',
          firstName: 'Thomas',
          theme: useSession.getState().theme,
          notificationsEnabled: true,
        }),
  });
}
