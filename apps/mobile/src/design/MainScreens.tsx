import React, { useState } from 'react';
import { View, Pressable, Share, Modal, Text, TextInput } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
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
  BrandIcon,
  CategoryIcon,
  State,
  ReferenceCrop,
  useColors,
} from './ui';
import {
  referencePayments,
  useOverview,
  usePayments,
  useRecommendations,
  useProfile,
} from './reference';
import { PREVIEW_ENABLED, useSession, useLiveToken } from '../store/session';
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
  const glassTheme = active === 'Home' || active === 'Subscriptions' || active === 'Savings';
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
        backgroundColor: glassTheme ? '#05090D' : c.background,
        borderTopWidth: 1,
        borderColor: glassTheme ? '#202A33' : c.border,
        paddingTop: glassTheme ? 6 : 6,
        paddingBottom: glassTheme ? 4 : 7,
        paddingHorizontal: glassTheme ? 8 : 0,
      }}
    >
      {items.map(([key, title, icon]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: key === active }}
          accessibilityLabel={title}
          onPress={() => nav.navigate('Main', { screen: key })}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 46,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            borderRadius: 16,
            opacity: pressed ? 0.72 : 1,
            backgroundColor: glassTheme && key === active ? '#151C23' : 'transparent',
          })}
        >
          <Ionicons
            name={active === key && key === 'Home' ? 'home' : icon}
            size={glassTheme ? 23 : 21}
            color={
              glassTheme
                ? key === active
                  ? '#FFFFFF'
                  : '#778293'
                : key === active
                  ? '#1888FF'
                  : c.muted
            }
          />
          <Label
            style={{
              fontSize: glassTheme ? 10 : 9,
              lineHeight: 13,
              fontWeight: key === active ? '700' : '500',
              color: glassTheme
                ? key === active
                  ? '#FFFFFF'
                  : '#778293'
                : key === active
                  ? '#1888FF'
                  : c.muted,
            }}
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
export function SavingsHero({ amount = 0, green = false }: { amount?: number; green?: boolean }) {
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

function GlassBrandIcon({ name, size = 38 }: { name: string; size?: number }) {
  const key = name.toLowerCase();
  if (key.includes('adobe')) {
    return (
      <LinearGradient
        colors={['#FF3264', '#FF9A26', '#35D264', '#237CFF', '#BA43FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: size * 0.66, lineHeight: size * 0.74 }}>∞</Text>
      </LinearGradient>
    );
  }
  if (key.includes('spotify')) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#1ED760',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#1ED760',
          shadowOpacity: 0.38,
          shadowRadius: 7,
        }}
      >
        <FontAwesome5 name="spotify" size={size * 0.79} color="#07120B" />
      </View>
    );
  }
  return <BrandIcon name={name} size={size} />;
}

export function DashboardScreen() {
  const nav = useNav();
  const c = useColors();
  const q = useOverview();
  const payments = usePayments();
  const profile = useProfile();
  const d = q.data;
  const showReference = PREVIEW_ENABLED && !useSession.getState().token;
  const featuredPayments = (
    PREVIEW_ENABLED
      ? ['Netflix', 'Spotify', 'Adobe'].map((merchant, index) => ({
          ...referencePayments.find((item) => item.merchant === merchant)!,
          monthlyCost: [13.99, 10.99, 52.99][index]!,
        }))
      : (payments.data?.items ?? []).slice(0, 3)
  ).filter(Boolean);
  return (
    <Page
      backgroundColor="#020609"
      style={{ gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 0,
        }}
      >
        <View style={{ gap: 1 }}>
          <Label style={{ fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.8 }}>
            Bonjour {showReference ? 'Georges' : (profile.data?.firstName ?? 'Utilisateur')} 👋
          </Label>
          <Label muted style={{ fontSize: 14, lineHeight: 19, color: '#8E98A9' }}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mes comptes"
            onPress={() => nav.navigate('Bank')}
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
          >
            <LinearGradient
              colors={['#252E37', '#11171D', '#070B0F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                minHeight: 210,
                borderRadius: 29,
                borderWidth: 1,
                borderColor: '#AAB5C260',
                padding: 20,
                overflow: 'hidden',
                shadowColor: '#B9C7D5',
                shadowOffset: { width: 0, height: 10 },
                shadowRadius: 24,
                shadowOpacity: 0.22,
              }}
            >
              <LinearGradient
                colors={['#FFFFFF4A', '#FFFFFF0A', '#00000000']}
                style={{
                  position: 'absolute',
                  left: -45,
                  top: -68,
                  width: 330,
                  height: 145,
                  borderRadius: 80,
                  transform: [{ rotate: '-7deg' }],
                }}
              />
              <LinearGradient
                colors={['#FFFFFF00', '#B8C5D535', '#FFFFFF08']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  left: -18,
                  right: -18,
                  bottom: -35,
                  height: 82,
                  borderRadius: 44,
                  transform: [{ rotate: '-2deg' }],
                }}
              />
              <View
                accessible={false}
                style={{
                  position: 'absolute',
                  left: 6,
                  right: 6,
                  top: 7,
                  bottom: 7,
                  borderRadius: 25,
                  borderWidth: 1,
                  borderColor: '#F2F7FB2E',
                  transform: [{ rotate: '-0.7deg' }],
                }}
              />
              <LinearGradient
                colors={['#FFFFFF10', '#EAF3FCB8', '#FFFFFF18']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: 'absolute',
                  left: 20,
                  right: 22,
                  top: 3,
                  height: 2,
                  borderRadius: 4,
                  transform: [{ rotate: '-1.5deg' }],
                }}
              />
              <LinearGradient
                colors={['#FFFFFF1A', '#DCE9F6C0', '#FFFFFF16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: 'absolute',
                  left: 18,
                  right: 14,
                  bottom: 5,
                  height: 3,
                  borderRadius: 5,
                  transform: [{ rotate: '-1deg' }],
                }}
              />
              <LinearGradient
                colors={['#FFFFFF18', '#EEF6FF9C', '#FFFFFF12']}
                style={{
                  position: 'absolute',
                  left: 3,
                  top: 24,
                  bottom: 24,
                  width: 3,
                  borderRadius: 5,
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#DDE7F01A',
                    borderWidth: 1,
                    borderColor: '#FFFFFF24',
                  }}
                >
                  <Ionicons name="card-outline" size={25} color="#F8FAFC" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Label style={{ fontSize: 15, fontWeight: '700' }}>Votre compte</Label>
                  <Label muted style={{ fontSize: 13, color: '#9BA6B7' }}>
                    Solde disponible
                  </Label>
                </View>
                <Ionicons name="chevron-forward" size={23} color="#8E99A8" />
              </View>
              <Label
                style={{
                  marginTop: 22,
                  fontSize: 38,
                  lineHeight: 44,
                  fontWeight: '800',
                  letterSpacing: -1.2,
                }}
              >
                {money(showReference ? 145.81 : d.monthlyRecurringCost)}
              </Label>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 }}>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: '#AAB7C550',
                    borderRadius: 22,
                    paddingHorizontal: 14,
                    minHeight: 36,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Label style={{ fontSize: 12, fontWeight: '700' }}>Voir mes comptes</Label>
                  <Ionicons name="arrow-forward" size={17} color="#F8FAFC" />
                </View>
                <View
                  accessible={false}
                  style={{
                    flex: 1,
                    height: 45,
                    marginLeft: 16,
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: 5,
                  }}
                >
                  {[8, 12, 16, 22, 18, 25, 21, 29, 34, 42, 48, 36].map((height, index) => (
                    <View
                      key={`${height}-${index}`}
                      style={{
                        flex: 1,
                        height,
                        maxHeight: 45,
                        borderRadius: 4,
                        backgroundColor: index > 8 ? '#F3F6F9' : '#46515F',
                      }}
                    />
                  ))}
                </View>
              </View>
            </LinearGradient>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 11 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Voir les ${showReference ? 6 : d.subscriptionCount} abonnements détectés`}
              onPress={() => nav.navigate('Main', { screen: 'Subscriptions' })}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
            >
              <LinearGradient
                colors={['#111820', '#080D12']}
                style={{
                  padding: 13,
                  minHeight: 129,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: '#27323C',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#18212B',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Ionicons name="people-outline" size={21} color="#F4F7FA" />
                </View>
                <Label style={{ fontSize: 27, lineHeight: 31, fontWeight: '800' }}>
                  {showReference ? 6 : d.subscriptionCount}
                </Label>
                <Label muted style={{ fontSize: 13, lineHeight: 17, color: '#929DAE' }}>
                  Abonnements{'\n'}détectés
                </Label>
              </LinearGradient>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Voir le détail du total mensuel de ${money(showReference ? 145.81 : d.monthlyRecurringCost)}`}
              onPress={() => nav.navigate('Main', { screen: 'Subscriptions' })}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
            >
              <LinearGradient
                colors={['#111820', '#080D12']}
                style={{
                  padding: 13,
                  minHeight: 129,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: '#27323C',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#18212B',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Ionicons name="card-outline" size={21} color="#F4F7FA" />
                </View>
                <Label style={{ fontSize: 25, lineHeight: 31, fontWeight: '800' }}>
                  {money(showReference ? 145.81 : d.monthlyRecurringCost)}
                </Label>
                <Label muted style={{ fontSize: 13, lineHeight: 17, color: '#929DAE' }}>
                  Total mensuel
                </Label>
              </LinearGradient>
            </Pressable>
          </View>
          <Pressable onPress={() => nav.navigate('Bank')} accessibilityRole="button">
            <LinearGradient
              colors={['#10171E', '#080D12']}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 17,
                paddingVertical: 10,
                minHeight: 61,
                borderRadius: 21,
                borderWidth: 1,
                borderColor: '#27323C',
              }}
            >
              <Ionicons name="timer-outline" size={29} color="#F4F7FA" />
              <View style={{ flex: 1 }}>
                <Label muted style={{ fontSize: 11, lineHeight: 14 }}>
                  Dernière synchronisation
                </Label>
                <Label style={{ fontSize: 12, lineHeight: 15 }}>
                  Aujourd’hui à{' '}
                  {!useSession.getState().preview && d.lastSyncAt
                    ? new Date(d.lastSyncAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : showReference
                      ? '10:28'
                      : '08:41'}
                </Label>
              </View>
              <View
                style={{
                  backgroundColor: '#063E2C',
                  borderRadius: 22,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <View
                  style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#20F2A0' }}
                />
                <Label style={{ color: '#20F2A0', fontSize: 11, fontWeight: '600' }}>
                  Tout est à jour
                </Label>
              </View>
            </LinearGradient>
          </Pressable>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 35,
              marginTop: 3,
            }}
          >
            <Label
              style={{
                flex: 1,
                fontSize: 20,
                lineHeight: 25,
                fontWeight: '800',
                letterSpacing: -0.35,
              }}
            >
              Top recommandations
            </Label>
            <Pressable
              accessibilityRole="button"
              onPress={() => nav.navigate('Main', { screen: 'Savings' })}
              style={{
                minHeight: 35,
                paddingLeft: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Label muted style={{ fontSize: 13, fontWeight: '600', color: '#9AA5B5' }}>
                Voir tout
              </Label>
              <Ionicons name="chevron-forward" size={18} color="#8792A2" />
            </Pressable>
          </View>
          <View style={{ gap: 6 }}>
            {featuredPayments.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => nav.navigate('Subscription', { id: item.id })}
                accessibilityRole="button"
                style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
              >
                <LinearGradient
                  colors={['#111820', '#080D12']}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 13,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    minHeight: 52,
                    borderRadius: 19,
                    borderWidth: 1,
                    borderColor: '#27323C',
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      backgroundColor: item.merchant.toLowerCase().includes('netflix')
                        ? '#05070A'
                        : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GlassBrandIcon name={item.merchant} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Label style={{ fontWeight: '700', fontSize: 14 }}>{item.merchant}</Label>
                    <Label muted style={{ fontSize: 12, color: '#929DAE' }}>
                      {item.category === 'streaming'
                        ? item.merchant.toLowerCase().includes('spotify')
                          ? 'Musique'
                          : 'Divertissement'
                        : fr.categories[item.category]}
                    </Label>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Label style={{ fontSize: 15, fontWeight: '700' }}>
                      {money(item.monthlyCost)}
                    </Label>
                    <Label muted style={{ fontSize: 11 }}>
                      par mois
                    </Label>
                  </View>
                  <Ionicons name="chevron-forward" size={21} color="#8792A2" />
                </LinearGradient>
              </Pressable>
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
  const showReference = PREVIEW_ENABLED && !useSession.getState().token;
  const categories: Record<string, string> = {
    Streaming: 'streaming',
    Télécom: 'mobile',
    Assurance: 'insurance',
  };
  const previewPrices: Record<string, number> = { Netflix: 13.99, Spotify: 10.99, Adobe: 52.99 };
  const sourceItems = showReference
    ? referencePayments.slice(0, 6).map((item) => ({
        ...item,
        amount: previewPrices[item.merchant] ?? item.amount,
        monthlyCost: previewPrices[item.merchant] ?? item.monthlyCost,
      }))
    : (q.data?.items ?? []);
  const items = sourceItems.filter(
    (p) =>
      p.merchant.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'Tous' || p.category === categories[filter]),
  );
  return (
    <Page
      backgroundColor="#020609"
      style={{ gap: 11, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Label style={{ fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7 }}>
            Vos abonnements
          </Label>
          <Label muted style={{ fontSize: 14, color: '#8E98A9' }}>
            {showReference ? 6 : (q.data?.total ?? 0)} abonnements détectés
          </Label>
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#28333D',
            backgroundColor: '#111820',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="search-outline" size={20} color="#F1F5F9" />
        </View>
      </View>
      <View
        style={{
          height: 43,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          paddingHorizontal: 14,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#26313B',
          backgroundColor: '#10171E',
        }}
      >
        <Ionicons name="search-outline" size={18} color="#8995A5" />
        <TextInput
          accessibilityLabel="Rechercher un abonnement"
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un abonnement…"
          placeholderTextColor="#778393"
          style={{ flex: 1, height: 41, color: '#F8FAFC', fontSize: 13 }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {['Tous', 'Streaming', 'Télécom', 'Assurance'].map((item) => {
          const selected = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item)}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.75 : 1 })}
            >
              <View
                style={{
                  minHeight: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: selected ? '#65717E' : '#232D36',
                  backgroundColor: selected ? '#202A34' : '#0D1319',
                }}
              >
                <Label
                  style={{
                    fontSize: 10,
                    fontWeight: selected ? '700' : '500',
                    color: selected ? '#FFFFFF' : '#8D98A8',
                  }}
                >
                  {item}
                </Label>
              </View>
            </Pressable>
          );
        })}
      </View>
      {q.isPending || q.error ? (
        <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      ) : items.length ? (
        <View style={{ gap: 7 }}>
          {items.map((payment) => (
            <Pressable
              key={payment.id}
              onPress={() => nav.navigate('Subscription', { id: payment.id })}
              accessibilityRole="button"
              accessibilityLabel={`${payment.merchant}, ${money(payment.monthlyCost)} par mois`}
              style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
            >
              <LinearGradient
                colors={['#111820', '#080D12']}
                style={{
                  minHeight: 67,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#26313B',
                }}
              >
                <GlassBrandIcon name={payment.merchant} size={44} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Label style={{ fontSize: 15, fontWeight: '700' }}>{payment.merchant}</Label>
                  <Label muted style={{ fontSize: 12, color: '#8E99A9' }}>
                    {payment.merchant.toLowerCase().includes('spotify')
                      ? 'Musique'
                      : fr.categories[payment.category]}
                  </Label>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Label style={{ fontSize: 14, fontWeight: '700' }}>
                    {money(payment.monthlyCost)}
                  </Label>
                  <Label muted style={{ fontSize: 11, color: '#8E99A9' }}>
                    par mois
                  </Label>
                </View>
                <Ionicons name="chevron-forward" size={21} color="#8792A2" />
              </LinearGradient>
            </Pressable>
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
  const preview = PREVIEW_ENABLED && !useLiveToken();
  const previewPrice = p
    ? ({ Netflix: 13.99, Spotify: 10.99, Adobe: 52.99 }[p.merchant] ?? p.amount)
    : 0;
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
      <Page
        backgroundColor="#020609"
        style={{ gap: 10, paddingHorizontal: 16, paddingTop: 3, paddingBottom: 10 }}
      >
        {!p ? (
          <State loading={q.isPending} error={q.error} title="Abonnement introuvable" />
        ) : (
          <>
            <LinearGradient
              colors={['#121A22', '#070C11']}
              style={{
                alignItems: 'center',
                gap: 5,
                paddingVertical: 14,
                borderRadius: 25,
                borderWidth: 1,
                borderColor: '#28333D',
              }}
            >
              <GlassBrandIcon name={p.merchant} size={58} />
              <Label style={{ fontWeight: '800', fontSize: 21 }}>{p.merchant}</Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Modifier la catégorie"
                onPress={() =>
                  preview
                    ? setMessage('Les modifications sont désactivées dans la maquette.')
                    : setDialog('category')
                }
              >
                <Label muted style={{ fontSize: 12, color: '#929DAE' }}>
                  {fr.categories[p.category]} · Modifier
                </Label>
              </Pressable>
              <Label
                style={{
                  marginTop: 3,
                  fontWeight: '800',
                  fontSize: 31,
                  lineHeight: 37,
                  letterSpacing: -0.5,
                }}
              >
                {money(preview ? previewPrice : p.amount)}
                <Label style={{ fontSize: 15, color: '#A0AABA' }}> /{cadence[p.cadence]}</Label>
              </Label>
              <View
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  borderRadius: 15,
                  backgroundColor: '#063E2C',
                }}
              >
                <Label style={{ color: '#20F2A0', fontSize: 11, fontWeight: '700' }}>● Actif</Label>
              </View>
            </LinearGradient>
            <LinearGradient
              colors={['#111820', '#080D12']}
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: '#27323C',
                paddingHorizontal: 14,
                overflow: 'hidden',
              }}
            >
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
                    paddingVertical: 9,
                    borderBottomWidth: 0.5,
                    borderColor: '#26313B',
                  }}
                >
                  <View
                    style={{
                      width: 29,
                      height: 29,
                      borderRadius: 15,
                      backgroundColor: '#18212A',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={icon as 'calendar-outline'} color="#DDE5ED" size={15} />
                  </View>
                  <Label muted style={{ flex: 1, fontSize: 12, color: '#919CAB' }}>
                    {label}
                  </Label>
                  <Label style={{ fontSize: 12, fontWeight: '600' }}>{value}</Label>
                </View>
              ))}
            </LinearGradient>
            <LinearGradient
              colors={['#111820', '#080D12']}
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: '#27323C',
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 8,
              }}
            >
              <Label style={{ fontWeight: '700', fontSize: 15 }}>Historique des paiements</Label>
              <View
                style={{
                  height: 88,
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 13,
                  paddingHorizontal: 3,
                  marginTop: 5,
                }}
              >
                {p.history.slice(-6).map((h, i) => (
                  <View key={h.date} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                    {i === 5 && (
                      <Label
                        style={{
                          fontSize: 10,
                          position: 'absolute',
                          top: -14,
                          width: 70,
                          textAlign: 'center',
                        }}
                      >
                        {money(preview ? previewPrice : h.amount)}
                      </Label>
                    )}
                    <LinearGradient
                      colors={i === 5 ? ['#E7EEF5', '#778596'] : ['#515E6D', '#202A34']}
                      style={{
                        height: [34, 52, 36, 39, 37, 42][i],
                        width: '76%',
                        borderTopLeftRadius: 5,
                        borderTopRightRadius: 5,
                      }}
                    />
                    <Label muted style={{ fontSize: 9 }}>
                      {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(
                        new Date(h.date),
                      )}
                    </Label>
                  </View>
                ))}
              </View>
            </LinearGradient>
            <Pressable
              onPress={() => nav.navigate('Main', { screen: 'Savings' })}
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
            >
              <LinearGradient
                colors={['#111820', '#080D12']}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  minHeight: 61,
                  paddingHorizontal: 13,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#27323C',
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#063E2C',
                  }}
                >
                  <Ionicons name="sparkles-outline" size={20} color="#20F2A0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Label style={{ fontSize: 13, fontWeight: '700' }}>Voir les alternatives</Label>
                  <Label muted style={{ fontSize: 10, color: '#8E99A9' }}>
                    Des offres similaires moins chères
                  </Label>
                </View>
                <Ionicons name="chevron-forward" color="#8792A2" size={21} />
              </LinearGradient>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={update.isPending}
              onPress={() =>
                preview
                  ? setMessage(
                      'Aucun contrat n’a été annulé. La résiliation doit être effectuée auprès du fournisseur après votre validation.',
                    )
                  : setDialog('ignore')
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
            >
              <View
                style={{
                  minHeight: 45,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#84323A',
                  backgroundColor: '#2A0D12',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color="#FF6B78" />
                <Label style={{ color: '#FF7A86', fontSize: 13, fontWeight: '700' }}>
                  {update.isPending ? 'Chargement…' : 'Annuler cet abonnement'}
                </Label>
              </View>
            </Pressable>
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
      colors={['#191D22', '#090E13']}
      style={{
        padding: 13,
        borderRadius: 21,
        borderColor: '#353E47',
        borderWidth: 1,
        gap: 11,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#32280D',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="star" color="#FFD35A" size={21} />
        </View>
        <View style={{ flex: 1 }}>
          <Label style={{ fontSize: 13, fontWeight: '700', color: 'white' }}>
            Passez au Premium
          </Label>
          <Label style={{ fontSize: 10, lineHeight: 14, color: '#9BA6B5' }}>
            Recevez des alertes et des recommandations en temps réel.
          </Label>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Découvrir Premium"
          onPress={() => nav.navigate('Main', { screen: 'Premium' })}
          style={{
            paddingHorizontal: 12,
            minHeight: 34,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: '#6B5A25',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label style={{ color: '#FFD35A', fontSize: 10, fontWeight: '700' }}>Découvrir</Label>
        </Pressable>
      </View>
    </LinearGradient>
  );
}
export function SavingsScreen() {
  const nav = useNav();
  const q = useRecommendations();
  const d = useOverview();
  const [filter, setFilter] = useState('Toutes');
  const token = useLiveToken();
  const items = q.data?.filter((item) =>
    filter === 'Réalisées' ? item.realized : filter === 'Disponibles' ? !item.realized : true,
  );
  const realizedTotal =
    q.data
      ?.filter((item) => item.realized)
      .reduce((sum, item) => sum + (item.realizedAnnualSaving ?? 0), 0) ?? 0;
  const showReference = PREVIEW_ENABLED && !token;
  const displayedTotal =
    filter === 'Réalisées'
      ? realizedTotal
      : showReference
        ? 496
        : (d.data?.annualPotentialSaving ?? 0);
  return (
    <Page
      backgroundColor="#020609"
      style={{ gap: 11, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}
    >
      <Label style={{ fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7 }}>
        Vos économies
      </Label>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {['Toutes', 'Disponibles', 'Réalisées'].map((item) => {
          const selected = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item)}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.75 : 1 })}
            >
              <View
                style={{
                  minHeight: 35,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: selected ? '#65717E' : '#232D36',
                  backgroundColor: selected ? '#202A34' : '#0D1319',
                }}
              >
                <Label
                  style={{
                    fontSize: 11,
                    fontWeight: selected ? '700' : '500',
                    color: selected ? '#FFFFFF' : '#8D98A8',
                  }}
                >
                  {item}
                </Label>
              </View>
            </Pressable>
          );
        })}
      </View>
      <LinearGradient
        colors={['#12352F', '#0C2527', '#081116']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: 143,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: '#3A74685C',
          padding: 18,
          overflow: 'hidden',
          shadowColor: '#20F2A0',
          shadowOpacity: 0.12,
          shadowRadius: 20,
        }}
      >
        <LinearGradient
          colors={['#41F5BD2B', '#FFFFFF08', '#00000000']}
          style={{
            position: 'absolute',
            left: -35,
            right: 80,
            top: -50,
            height: 110,
            borderRadius: 60,
            transform: [{ rotate: '-5deg' }],
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label style={{ color: '#9EAAA9', fontSize: 12 }}>Économies potentielles</Label>
            <Label
              style={{
                color: '#FFFFFF',
                fontSize: 38,
                lineHeight: 46,
                fontWeight: '800',
                letterSpacing: -0.8,
              }}
            >
              {money(displayedTotal)}
              <Label style={{ color: '#20F2A0', fontSize: 18 }}> /an</Label>
            </Label>
          </View>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#0A4735',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trending-up" size={27} color="#20F2A0" />
          </View>
        </View>
        <View
          style={{
            marginTop: 13,
            height: 5,
            borderRadius: 4,
            backgroundColor: '#FFFFFF12',
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#20F2A0', '#4EE4E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '72%', height: 5, borderRadius: 4 }}
          />
        </View>
        <Label muted style={{ marginTop: 8, fontSize: 10, color: '#8D9A9C' }}>
          Des économies accessibles dès maintenant
        </Label>
      </LinearGradient>
      {q.isPending || q.error ? (
        <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      ) : items?.length === 0 ? (
        <State
          title={
            filter === 'Réalisées' ? 'Pas encore d’économie réalisée' : 'Aucune économie disponible'
          }
          description={
            filter === 'Réalisées'
              ? 'Confirmez une recommandation après avoir changé d’offre.'
              : 'De nouvelles offres apparaîtront après la prochaine analyse.'
          }
        />
      ) : (
        <View style={{ gap: 7 }}>
          {items?.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => nav.navigate('Recommendation', { id: item.id })}
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
            >
              <LinearGradient
                colors={['#111820', '#080D12']}
                style={{
                  minHeight: 64,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#26313B',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: '#18212A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={
                      item.category === 'mobile'
                        ? 'phone-portrait-outline'
                        : item.category === 'insurance'
                          ? 'shield-checkmark-outline'
                          : item.category === 'internet'
                            ? 'wifi-outline'
                            : 'heart-outline'
                    }
                    size={21}
                    color="#E7EDF3"
                  />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Label style={{ fontSize: 14, fontWeight: '700' }}>{item.title}</Label>
                  <Label muted style={{ fontSize: 11, color: '#8D98A8' }}>
                    Économie possible
                  </Label>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 15,
                    backgroundColor: '#063E2C',
                  }}
                >
                  <Label style={{ fontSize: 11, color: '#20F2A0', fontWeight: '700' }}>
                    {money(item.annualSaving)} /an
                  </Label>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8792A2" />
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      )}
      <PremiumBanner />
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
        token
          ? 'La consultation a été enregistrée. Vérifiez les conditions du partenaire avant toute souscription.'
          : 'Connectez-vous pour ouvrir une offre.',
      ),
  });
  const realized = useMutation({
    mutationFn: () => api.markRecommendationRealized(route.params.id),
    onSuccess: () => {
      void q.refetch();
      setMessage('Cette économie est maintenant classée comme réalisée.');
    },
  });
  return (
    <Page
      backgroundColor="#020609"
      style={{ gap: 10, paddingHorizontal: 16, paddingTop: 3, paddingBottom: 14 }}
    >
      {!r ? (
        <State loading={q.isPending} error={q.error} title="Recommandation introuvable" />
      ) : (
        <>
          <LinearGradient
            colors={['#111820', '#080D12']}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 74,
              padding: 13,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: '#28333D',
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#18212A',
              }}
            >
              <Ionicons
                name={r.category === 'mobile' ? 'phone-portrait-outline' : 'sparkles-outline'}
                size={24}
                color="#F3F6F9"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label style={{ fontWeight: '800', fontSize: 16 }}>{r.title}</Label>
              <Label muted style={{ fontSize: 11, color: '#8E99A9' }}>
                Recommandation personnalisée
              </Label>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 16,
                backgroundColor: '#063E2C',
              }}
            >
              <Label style={{ color: '#20F2A0', fontSize: 11, fontWeight: '700' }}>
                + {money(r.annualSaving)} /an
              </Label>
            </View>
          </LinearGradient>
          <Label style={{ fontWeight: '800', fontSize: 16, marginTop: 2 }}>
            Votre situation actuelle
          </Label>
          <LinearGradient
            colors={['#111820', '#080D12']}
            style={{
              borderRadius: 21,
              borderWidth: 1,
              borderColor: '#27323C',
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
          >
            {[
              ['Prix mensuel', money(r.currentCost)],
              ...(PREVIEW_ENABLED && !token && r.id === 'mobile'
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
                  alignItems: 'center',
                  minHeight: 31,
                  borderBottomWidth: k === 'Consommation moyenne' ? 0 : 0.5,
                  borderBottomColor: '#25303A',
                }}
              >
                <Label muted style={{ fontSize: 12, color: '#8E99A9' }}>
                  {k}
                </Label>
                <Label style={{ fontSize: 12, fontWeight: '600' }}>{v}</Label>
              </View>
            ))}
          </LinearGradient>
          <Label style={{ fontWeight: '800', fontSize: 16, marginTop: 2 }}>
            Notre recommandation
          </Label>
          <LinearGradient
            colors={['#15231F', '#0A1514', '#070C11']}
            style={{
              gap: 9,
              padding: 14,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#32605466',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['#20F2A020', '#FFFFFF04', '#00000000']}
              style={{
                position: 'absolute',
                left: -35,
                right: 90,
                top: -55,
                height: 120,
                borderRadius: 60,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LinearGradient
                colors={['#18C7C7', '#067A8B']}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Label style={{ color: 'white', fontSize: 16, fontWeight: '800' }}>
                  {PREVIEW_ENABLED && !token && r.id === 'mobile' ? 'Sosh' : 'Offre'}
                </Label>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Label style={{ fontSize: 15, fontWeight: '700' }}>
                  {PREVIEW_ENABLED && !token && r.id === 'mobile'
                    ? 'Série 80 Go'
                    : r.offer.providerName}
                </Label>
                <Label style={{ fontSize: 18, fontWeight: '800', marginTop: 2 }}>
                  {money(r.suggestedCost)}
                  <Label style={{ fontSize: 12, color: '#9AA5B5' }}> /mois</Label>
                </Label>
              </View>
            </View>
            {r.offer.benefits.map((b) => (
              <View key={b} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#063E2C',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" color="#20F2A0" size={12} />
                </View>
                <Label muted style={{ fontSize: 11, flex: 1, color: '#A1ACB8' }}>
                  {b}
                </Label>
              </View>
            ))}
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 15,
                backgroundColor: '#063E2C',
              }}
            >
              <Label style={{ color: '#20F2A0', fontSize: 11, fontWeight: '700' }}>
                Économie : {money(r.annualSaving)} /an
              </Label>
            </View>
          </LinearGradient>
          <LinearGradient
            colors={['#111820', '#080D12']}
            style={{
              gap: 5,
              padding: 13,
              borderRadius: 21,
              borderWidth: 1,
              borderColor: '#27323C',
            }}
          >
            <Label style={{ fontWeight: '800', fontSize: 15 }}>Pourquoi ?</Label>
            <Label muted style={{ fontSize: 11, lineHeight: 16, color: '#98A3B2' }}>
              {r.explanation}
            </Label>
            <Pressable onPress={() => setExplain(!explain)} accessibilityRole="button">
              <Label style={{ fontSize: 10, color: '#20F2A0', marginTop: 2 }}>
                Partenaire · confiance faible · conditions {explain ? '−' : '+'}
              </Label>
            </Pressable>
          </LinearGradient>
          {explain && (
            <LinearGradient
              colors={['#161B20', '#0A0F14']}
              style={{ padding: 12, borderRadius: 18, borderWidth: 1, borderColor: '#343D46' }}
            >
              {r.assumptions.map((a) => (
                <Label key={a} muted style={{ fontSize: 11 }}>
                  • {a}
                </Label>
              ))}
              <Badge text="Confiance faible · à vérifier" tone="warning" />
            </LinearGradient>
          )}
          <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => click.mutate()}
              disabled={click.isPending}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.78 : 1 })}
            >
              <LinearGradient
                colors={['#20D994', '#0D9F72']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  minHeight: 46,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Label style={{ color: '#03110B', fontSize: 13, fontWeight: '800' }}>
                  {click.isPending ? 'Chargement…' : 'Voir l’offre'}
                </Label>
              </LinearGradient>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Partager la recommandation"
              onPress={() => {
                void Share.share({
                  message: `${r.title} : économie estimée à ${money(r.annualSaving)}/an. Vérifiez les conditions de l’offre avant toute souscription.`,
                }).catch(() => setMessage('Le partage n’est pas disponible sur cet appareil.'));
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#343E48',
                  backgroundColor: '#111820',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="share-social-outline" size={20} color="#F0F4F8" />
              </View>
            </Pressable>
          </View>
          {token && !r.realized && (
            <Button
              title="J’ai changé d’offre"
              secondary
              loading={realized.isPending}
              onPress={() => realized.mutate()}
            />
          )}
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
