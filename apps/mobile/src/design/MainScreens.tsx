import React, { useState } from 'react';
import { View, Pressable, Share, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Page,
  Label,
  Card,
  Button,
  Badge,
  Section,
  IconButton,
  Chips,
  Search,
  BrandIcon,
  CategoryIcon,
  PaymentRow,
  RecommendationRow,
  State,
  ReferenceCrop,
  useColors,
} from './ui';
import { useOverview, usePayments, useRecommendations, useProfile } from './reference';
import { useSession, useLiveToken } from '../store/session';
import { api, idempotencyKey } from '../services/api';
import { money, cadence, date } from '../utils/format';
import type { RootStackParams, TabsParams } from '../app/navigation';
import { fr } from '../i18n/fr';
import type { Category } from '../types/api';
export function useNav() {
  return useNavigation<NativeStackNavigationProp<RootStackParams>>();
}
export function BottomBar({ active }: { active: keyof TabsParams }) {
  const nav = useNav();
  const c = useColors();
  const items: [keyof TabsParams, string, React.ComponentProps<typeof Ionicons>['name']][] = [
    ['Home', 'Accueil', 'home-outline'],
    ['Subscriptions', 'Abonnements', 'reader-outline'],
    ['Savings', 'Économies', 'water-outline'],
    ['Premium', 'Premium', 'star-outline'],
    ['Profile', 'Profil', 'person-outline'],
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.background,
        borderTopWidth: 0.5,
        borderColor: c.border,
        paddingTop: 6,
        paddingBottom: 7,
      }}
    >
      {items.map(([key, title, icon]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: key === active }}
          accessibilityLabel={title}
          onPress={() => nav.navigate('Main', { screen: key })}
          style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 3 }}
        >
          <Ionicons
            name={active === key && key === 'Home' ? 'home' : icon}
            size={21}
            color={key === active ? '#1888FF' : c.muted}
          />
          <Label
            style={{ fontSize: 9, lineHeight: 12, color: key === active ? '#1888FF' : c.muted }}
          >
            {title}
          </Label>
        </Pressable>
      ))}
    </View>
  );
}
export function ScreenWithTabs({
  children,
  active,
}: {
  children: React.ReactNode;
  active: keyof TabsParams;
}) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <BottomBar active={active} />
    </View>
  );
}
export function SavingsHero({ amount = 420, green = false }: { amount?: number; green?: boolean }) {
  return (
    <LinearGradient
      colors={green ? ['#00C794', '#159BD4'] : ['#00C0D4', '#2465FF', '#9138FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.65 }}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 17,
        borderRadius: 13,
        minHeight: 115,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: green ? '#00DD99' : '#4644FF',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 14,
        shadowOpacity: 0.18,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        {!green && (
          <Label style={{ color: 'white', fontSize: 15, fontWeight: '500' }}>
            Vous pouvez économiser
          </Label>
        )}
        <Label
          style={{
            fontSize: 34,
            lineHeight: 40,
            fontWeight: '700',
            color: 'white',
            letterSpacing: -0.5,
          }}
        >
          {money(amount)}
          <Label style={{ fontSize: 25, color: 'white' }}> /an</Label>
        </Label>
        <Label style={{ fontSize: 12, color: '#E0F6FF' }}>
          {green ? 'Économies potentielles' : `Soit ${money(Math.round(amount / 12))}/mois`}
        </Label>
      </View>
      <Ionicons name="trending-up" size={58} color="#FFFFFF66" />
    </LinearGradient>
  );
}
export function DashboardScreen() {
  const nav = useNav();
  const c = useColors();
  const q = useOverview();
  const profile = useProfile();
  const d = q.data;
  return (
    <Page style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 1,
        }}
      >
        <View style={{ gap: 4 }}>
          <Label style={{ fontSize: 22, lineHeight: 27, fontWeight: '700' }}>
            Bonjour {profile.data?.firstName ?? 'Thomas'} 👋
          </Label>
          <Label muted style={{ fontSize: 13 }}>
            Voici votre résumé aujourd’hui.
          </Label>
        </View>
        <IconButton
          icon="notifications-outline"
          label="Notifications"
          onPress={() => nav.navigate('Notifications')}
        />
      </View>
      {!d ? (
        <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      ) : !d.hasConnectedBank && !d.lastSyncAt ? (
        <State
          title="Connectez votre première banque"
          description="Retrouvez vos abonnements et vos économies possibles."
          action={<Button title="Connecter une banque" onPress={() => nav.navigate('Bank')} />}
        />
      ) : d.subscriptionCount === 0 ? (
        <State
          title="Aucun abonnement détecté"
          description="Votre banque est bien connectée et vos transactions ont été analysées."
          action={<Button title="Voir mes banques" onPress={() => nav.navigate('Bank')} />}
        />
      ) : (
        <>
          <SavingsHero amount={d.annualPotentialSaving} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 16, minHeight: 104 }}>
              <Label style={{ fontSize: 29, lineHeight: 35, fontWeight: '700' }}>
                {d.subscriptionCount}
              </Label>
              <Label muted style={{ fontSize: 13, lineHeight: 17 }}>
                Abonnements{'\n'}détectés
              </Label>
            </Card>
            <Card style={{ flex: 1, padding: 16, minHeight: 104 }}>
              <Label style={{ fontSize: 29, lineHeight: 35, fontWeight: '700' }}>
                {money(d.monthlyRecurringCost)}
              </Label>
              <Label muted style={{ fontSize: 13 }}>
                Total mensuel
              </Label>
            </Card>
          </View>
          <Pressable onPress={() => nav.navigate('Bank')} accessibilityRole="button">
            <Card
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                minHeight: 63,
              }}
            >
              <Ionicons name="timer-outline" size={29} color="#31FFAB" />
              <View style={{ flex: 1 }}>
                <Label muted style={{ fontSize: 11, lineHeight: 16 }}>
                  Dernière synchronisation
                </Label>
                <Label style={{ fontSize: 12, lineHeight: 17 }}>
                  Aujourd’hui à{' '}
                  {!useSession.getState().preview && d.lastSyncAt
                    ? new Date(d.lastSyncAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '08:41'}
                </Label>
              </View>
              <View>
                <Badge text="Tout est à jour" />
              </View>
            </Card>
          </Pressable>
          <Section
            title="Top recommandations"
            action="Voir tout"
            onPress={() => nav.navigate('Main', { screen: 'Savings' })}
          />
          <View style={{ gap: 8 }}>
            {d.topRecommendations.map((item) => (
              <RecommendationRow
                key={item.id}
                item={item}
                onPress={() => nav.navigate('Recommendation', { id: item.id })}
              />
            ))}
          </View>
        </>
      )}
    </Page>
  );
}
export function SubscriptionsScreen() {
  const nav = useNav();
  const q = usePayments();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tous');
  const categories: Record<string, string> = {
    Streaming: 'streaming',
    Télécom: 'mobile',
    Assurance: 'insurance',
  };
  const items = q.data?.items.filter(
    (p) =>
      p.merchant.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'Tous' || p.category === categories[filter]),
  );
  return (
    <Page style={{ gap: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 3 }}>
          <Label style={{ fontSize: 22, lineHeight: 28, fontWeight: '700' }}>Vos abonnements</Label>
          <Label muted style={{ fontSize: 13 }}>
            {q.data?.total ?? 0} abonnements détectés
          </Label>
        </View>
        <Ionicons name="search-outline" size={21} color="#CAD5E5" />
      </View>
      <Search value={search} onChangeText={setSearch} placeholder="Rechercher un abonnement…" />
      <Chips
        items={['Tous', 'Streaming', 'Télécom', 'Assurance']}
        value={filter}
        onChange={setFilter}
      />
      {q.isPending || q.error ? (
        <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      ) : items?.length ? (
        <View>
          {items.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              onPress={() => nav.navigate('Subscription', { id: payment.id })}
            />
          ))}
        </View>
      ) : (
        <State
          title="Aucun abonnement trouvé"
          description="Essayez une autre recherche ou connectez votre banque."
        />
      )}
    </Page>
  );
}
export function SubscriptionDetail() {
  const nav = useNav();
  const route = useRoute<RouteProp<RootStackParams, 'Subscription'>>();
  const q = usePayments();
  const p = q.data?.items.find((p) => p.id === route.params.id);
  const preview = !useLiveToken();
  const c = useColors();
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState<'category' | 'ignore' | null>(null);
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: ({ category, status }: { category: string | null; status: 'active' | 'ignored' }) =>
      api.updateSubscription(route.params.id, category, status),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      await q.refetch();
      setDialog(null);
      if (variables.status === 'ignored') nav.navigate('Main', { screen: 'Subscriptions' });
      else setMessage('La catégorie a été mise à jour.');
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Modification impossible.'),
  });
  return (
    <ScreenWithTabs active="Subscriptions">
      <Page style={{ gap: 15 }}>
        {!p ? (
          <State loading={q.isPending} error={q.error} title="Abonnement introuvable" />
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <BrandIcon name={p.merchant} size={60} />
              <Label style={{ fontWeight: '700', fontSize: 20 }}>{p.merchant}</Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Modifier la catégorie"
                onPress={() =>
                  preview
                    ? setMessage('Les modifications sont désactivées dans la maquette.')
                    : setDialog('category')
                }
              >
                <Label muted style={{ fontSize: 13 }}>
                  {fr.categories[p.category]} · Modifier
                </Label>
              </Pressable>
              <Label style={{ fontWeight: '700', fontSize: 29, lineHeight: 38 }}>
                {money(p.amount)}
                <Label style={{ fontSize: 17 }}> /{cadence[p.cadence]}</Label>
              </Label>
              <View>
                <Badge text="● Actif" />
              </View>
            </View>
            <View>
              {[
                ['calendar-outline', 'Depuis', preview ? 'Janvier 2022' : date(p.firstSeenAt)],
                ['repeat-outline', 'Fréquence', 'Mensuel'],
                [
                  'calendar-outline',
                  'Prochain prélèvement',
                  preview ? '12 mars 2025' : date(p.nextPaymentAt),
                ],
                [
                  'wallet-outline',
                  'Montant total payé',
                  preview ? '575,64 €' : money(p.history.reduce((sum, h) => sum + h.amount, 0)),
                ],
              ].map(([icon, label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 11,
                    borderBottomWidth: 0.5,
                    borderColor: c.border,
                  }}
                >
                  <Ionicons name={icon as 'calendar-outline'} color={c.muted} size={17} />
                  <Label muted style={{ flex: 1, fontSize: 12 }}>
                    {label}
                  </Label>
                  <Label style={{ fontSize: 12, fontWeight: '600' }}>{value}</Label>
                </View>
              ))}
            </View>
            <Label style={{ fontWeight: '700', fontSize: 16 }}>Historique des paiements</Label>
            <View
              style={{
                height: 115,
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 16,
                paddingHorizontal: 7,
              }}
            >
              {p.history.slice(-6).map((h, i) => (
                <View key={h.date} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  {i === 5 && (
                    <Label
                      style={{
                        fontSize: 11,
                        position: 'absolute',
                        top: -20,
                        width: 70,
                        textAlign: 'center',
                      }}
                    >
                      {money(h.amount)}
                    </Label>
                  )}
                  <LinearGradient
                    colors={i === 5 ? ['#7E46FF', '#0C75D0'] : ['#257FFF', '#1046AB']}
                    style={{
                      height: [43, 63, 44, 47, 45, 49][i],
                      width: '80%',
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                    }}
                  />
                  <Label muted style={{ fontSize: 10 }}>
                    {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(h.date))}
                  </Label>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => nav.navigate('Main', { screen: 'Savings' })}
              accessibilityRole="button"
            >
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CategoryIcon category="energy" size={35} />
                <View style={{ flex: 1 }}>
                  <Label style={{ fontSize: 13, fontWeight: '600' }}>Voir les alternatives</Label>
                  <Label muted style={{ fontSize: 10 }}>
                    Des offres similaires moins chères
                  </Label>
                </View>
                <Ionicons name="chevron-forward" color={c.muted} />
              </Card>
            </Pressable>
            <Button
              title="Annuler cet abonnement"
              secondary
              loading={update.isPending}
              onPress={() =>
                preview
                  ? setMessage(
                      'Aucun contrat n’a été annulé. La résiliation doit être effectuée auprès du fournisseur après votre validation.',
                    )
                  : setDialog('ignore')
              }
            />
            {message && (
              <Label muted style={{ fontSize: 12 }}>
                {message}
              </Label>
            )}
            <Modal transparent visible={dialog !== null} animationType="fade">
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#000A',
                  justifyContent: 'center',
                  padding: 24,
                }}
              >
                <Card
                  style={{
                    gap: 12,
                    padding: 18,
                    width: 390,
                    maxWidth: '100%',
                    alignSelf: 'center',
                  }}
                >
                  {dialog === 'category' ? (
                    <>
                      <Label style={{ fontSize: 18, fontWeight: '700' }}>
                        Modifier la catégorie
                      </Label>
                      {(Object.entries(fr.categories) as [Category, string][]).map(
                        ([category, label]) => (
                          <Pressable
                            key={category}
                            accessibilityRole="button"
                            onPress={() => update.mutate({ category, status: 'active' })}
                            style={{ minHeight: 44, justifyContent: 'center' }}
                          >
                            <Label style={{ color: category === p.category ? '#168CFF' : c.text }}>
                              {label}
                            </Label>
                          </Pressable>
                        ),
                      )}
                    </>
                  ) : (
                    <>
                      <Label style={{ fontSize: 18, fontWeight: '700' }}>
                        Ne plus suivre cet abonnement ?
                      </Label>
                      <Label muted style={{ fontSize: 12, lineHeight: 18 }}>
                        Il sera retiré de vos analyses. Cette action ne résilie aucun contrat auprès
                        du fournisseur.
                      </Label>
                      <Button
                        title="Confirmer"
                        danger
                        loading={update.isPending}
                        onPress={() => update.mutate({ category: p.category, status: 'ignored' })}
                      />
                    </>
                  )}
                  <Button title="Fermer" secondary onPress={() => setDialog(null)} />
                </Card>
              </View>
            </Modal>
          </>
        )}
      </Page>
    </ScreenWithTabs>
  );
}
export function PremiumBanner() {
  const nav = useNav();
  return (
    <LinearGradient
      colors={['#192557', '#101B39']}
      style={{ padding: 14, borderRadius: 14, borderColor: '#354A8B', borderWidth: 1, gap: 13 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ backgroundColor: '#FFB400', borderRadius: 30, padding: 8 }}>
          <Ionicons name="star-outline" color="white" size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Label style={{ fontSize: 13, fontWeight: '600', color: 'white' }}>
            Passez au Premium
          </Label>
          <Label style={{ fontSize: 11, lineHeight: 16, color: '#CDD7F6' }}>
            Recevez des alertes et des recommandations en temps réel.
          </Label>
        </View>
      </View>
      <Button
        title="Découvrir Premium"
        onPress={() => nav.navigate('Main', { screen: 'Premium' })}
      />
    </LinearGradient>
  );
}
export function SavingsScreen() {
  const nav = useNav();
  const q = useRecommendations();
  const d = useOverview();
  const [filter, setFilter] = useState('Toutes');
  const token = useLiveToken();
  return (
    <Page style={{ gap: 12 }}>
      <Label style={{ fontSize: 23, lineHeight: 29, fontWeight: '700' }}>Vos économies</Label>
      <Chips items={['Toutes', 'Disponibles', 'Réalisées']} value={filter} onChange={setFilter} />
      <SavingsHero green amount={token ? d.data?.annualPotentialSaving : 496} />
      {q.isPending || q.error ? (
        <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      ) : filter === 'Réalisées' ? (
        <State
          title="Pas encore d’économie réalisée"
          description="Vos économies seront affichées ici après confirmation."
        />
      ) : (
        <View style={{ gap: 9 }}>
          {q.data?.map((item) => (
            <RecommendationRow
              key={item.id}
              item={item}
              available
              onPress={() => nav.navigate('Recommendation', { id: item.id })}
            />
          ))}
        </View>
      )}
      <View style={{ marginTop: 14 }}>
        <PremiumBanner />
      </View>
    </Page>
  );
}
export function RecommendationDetail() {
  const nav = useNav();
  const route = useRoute<RouteProp<RootStackParams, 'Recommendation'>>();
  const q = useRecommendations();
  const r = q.data?.find((r) => r.id === route.params.id);
  const token = useLiveToken();
  const [explain, setExplain] = useState(false);
  const [message, setMessage] = useState('');
  const click = useMutation({
    mutationFn: async () =>
      token
        ? api.click(route.params.id, idempotencyKey())
        : { tracked: false, isDemo: true, url: null },
    onSuccess: () =>
      setMessage(
        'Offre de démonstration : aucun contrat souscrit. ' +
          (token
            ? 'La consultation a été enregistrée.'
            : 'Les tarifs ne sont pas des offres commerciales vérifiées.'),
      ),
  });
  return (
    <Page style={{ gap: 13 }}>
      {!r ? (
        <State loading={q.isPending} error={q.error} title="Recommandation introuvable" />
      ) : (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            <CategoryIcon
              category={r.category}
              accent={r.category === 'mobile' ? '#0877FF' : undefined}
            />
            <View style={{ flex: 1 }}>
              <Label style={{ fontWeight: '600', fontSize: 14 }}>{r.title}</Label>
              <Label muted style={{ fontSize: 11 }}>
                Économie possible :{' '}
                <Label style={{ color: '#24FA95', fontSize: 12, fontWeight: '700' }}>
                  {money(r.annualSaving)}/an
                </Label>
              </Label>
            </View>
          </Card>
          <Label style={{ fontWeight: '700', fontSize: 15 }}>Votre situation actuelle</Label>
          <Card>
            {[
              ['Prix mensuel', money(r.currentCost)],
              ...(!token && r.id === 'mobile'
                ? [
                    ['› Forfait', '200 Go'],
                    ['Consommation moyenne', '21 Go/mois'],
                  ]
                : []),
            ].map(([k, v]) => (
              <View
                key={k}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 3,
                }}
              >
                <Label muted style={{ fontSize: 12 }}>
                  {k}
                </Label>
                <Label style={{ fontSize: 12, fontWeight: '600' }}>{v}</Label>
              </View>
            ))}
          </Card>
          <Label style={{ fontWeight: '700', fontSize: 15 }}>Notre recommandation</Label>
          <Card style={{ gap: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LinearGradient
                colors={['#00BDD2', '#008DA8']}
                style={{ padding: 8, borderRadius: 6 }}
              >
                <Label style={{ color: 'white', fontSize: 23, fontWeight: '800' }}>
                  {!token && r.id === 'mobile' ? 'Sosh' : 'Offre'}
                </Label>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Label style={{ fontSize: 15, fontWeight: '600' }}>
                  {!token && r.id === 'mobile' ? 'Série 80 Go' : r.offer.providerName}
                </Label>
                <Label style={{ fontSize: 16, fontWeight: '600' }}>
                  {money(r.suggestedCost)}/mois
                </Label>
              </View>
            </View>
            {r.offer.benefits.map((b) => (
              <View key={b} style={{ flexDirection: 'row', gap: 8 }}>
                <Ionicons name="checkmark" color="#22FFAC" size={16} />
                <Label muted style={{ fontSize: 12, flex: 1 }}>
                  {b}
                </Label>
              </View>
            ))}
            <Badge text={`Économie : ${money(r.annualSaving)}/an`} />
          </Card>
          <View style={{ gap: 4 }}>
            <Label style={{ fontWeight: '700', fontSize: 15 }}>Pourquoi ?</Label>
            <Label muted style={{ fontSize: 12, lineHeight: 17 }}>
              {r.explanation}
            </Label>
          </View>
          <Pressable onPress={() => setExplain(!explain)} accessibilityRole="button">
            <Label style={{ fontSize: 11, color: '#2896FF' }}>
              Partenaire · confiance faible · conditions {explain ? '−' : '+'}
            </Label>
          </Pressable>
          {explain && (
            <Card>
              {r.assumptions.map((a) => (
                <Label key={a} muted style={{ fontSize: 11 }}>
                  • {a}
                </Label>
              ))}
              <Badge text="Confiance faible · à vérifier" tone="warning" />
            </Card>
          )}
          <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Voir l’offre"
                loading={click.isPending}
                onPress={() => click.mutate()}
              />
            </View>
            <IconButton
              icon="share-social-outline"
              label="Partager la recommandation"
              onPress={() => {
                void Share.share({
                  message: `Exemple de recommandation : ${r.title}. Économie estimée : ${money(r.annualSaving)}/an. Données de démonstration.`,
                }).catch(() => setMessage('Le partage n’est pas disponible sur cet appareil.'));
              }}
            />
          </View>
          {message && (
            <Card>
              <Label style={{ fontSize: 12 }}>{message}</Label>
            </Card>
          )}
          {click.error && <State error={click.error} retry={() => click.mutate()} />}
        </>
      )}
    </Page>
  );
}
