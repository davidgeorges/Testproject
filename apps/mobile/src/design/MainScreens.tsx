import React, { useMemo, useState } from 'react';
import {
  View,
  Pressable,
  Share,
  Modal,
  Text,
  TextInput,
  ImageBackground,
  Animated,
  ScrollView,
  StatusBar,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  accentTextColor,
  accentWithAlpha,
  mixAccentColor,
  normalizeAccentColor,
  DEFAULT_ACCENT_COLOR,
} from '../theme/accent';
import { resolveBackgroundColor } from '../theme/background';
export function useNav() {
  return useNavigation<NativeStackNavigationProp<RootStackParams>>();
}
export const dashboardScrollY = new Animated.Value(0);

export function BottomBar({ active }: { active: keyof TabsParams }) {
  const nav = useNav();
  const c = useColors();
  const isDark = useSession((s) => s.theme) === 'dark';
  const accentColor = useSession((s) => s.accentColor);
  const normalizedAccent = normalizeAccentColor(accentColor) ?? DEFAULT_ACCENT_COLOR;
  const accentForeground = accentTextColor(normalizedAccent);
  if (active === 'Profile') return null;
  const homeLight = active === 'Home';
  const glassTheme =
    active === 'Home' ||
    active === 'Subscriptions' ||
    active === 'Finances' ||
    active === 'Savings' ||
    active === 'Premium';
  const items: [keyof TabsParams, string, React.ComponentProps<typeof Ionicons>['name']][] = [
    ['Home', 'Accueil', 'home-outline'],
    ['Subscriptions', 'Abonnements', 'reader-outline'],
    ['Finances', 'Finances', 'wallet-outline'],
    ['Savings', 'Économies', 'water-outline'],
    ['Profile', 'Profil', 'person-outline'],
  ];
  if (homeLight) {
    return (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          height: 82,
          paddingHorizontal: 12,
          paddingBottom: 7,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? '#17171CFA' : '#FFFFFFFA',
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          shadowColor: isDark ? '#000000' : '#25233A',
          shadowOpacity: isDark ? 0.34 : 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -5 },
        }}
      >
        {items.map(([key, title, icon]) => {
          const center = key === 'Finances';
          const selected = key === active;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={title}
              onPress={() => nav.navigate('Main', { screen: key })}
              style={({ pressed }) => ({
                flex: 1,
                height: 68,
                alignItems: 'center',
                justifyContent: center ? 'flex-start' : 'center',
                gap: 4,
                opacity: pressed ? 0.66 : 1,
              })}
            >
              <View
                style={{
                  width: center ? 55 : 30,
                  height: center ? 55 : 30,
                  marginTop: center ? -18 : 0,
                  borderRadius: center ? 28 : 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: center ? normalizedAccent : 'transparent',
                  borderWidth: center ? 5 : 0,
                  borderColor: center ? (isDark ? '#0B0B0F' : '#F7F6F8') : 'transparent',
                  shadowColor: center
                    ? mixAccentColor(normalizedAccent, '#000000', 0.45)
                    : 'transparent',
                  shadowOpacity: center ? 0.28 : 0,
                  shadowRadius: 9,
                  shadowOffset: { width: 0, height: 5 },
                }}
              >
                <Ionicons
                  name={selected && key === 'Home' ? 'home' : icon}
                  size={center ? 22 : 22}
                  color={
                    center
                      ? accentForeground
                      : selected
                        ? isDark
                          ? '#FFFFFF'
                          : '#171719'
                        : isDark
                          ? '#777780'
                          : '#929295'
                  }
                />
              </View>
              <Label
                style={{
                  color: selected
                    ? isDark
                      ? '#FFFFFF'
                      : '#171719'
                    : isDark
                      ? '#777780'
                      : '#929295',
                  fontSize: 10,
                  lineHeight: 12,
                  fontWeight: selected ? '800' : '500',
                }}
              >
                {title}
              </Label>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        position: glassTheme ? 'absolute' : 'relative',
        left: glassTheme ? 0 : undefined,
        right: glassTheme ? 0 : undefined,
        bottom: glassTheme ? 7 : undefined,
        zIndex: glassTheme ? 20 : 0,
        backgroundColor: homeLight ? '#FFFFFFF5' : glassTheme ? '#555D66D9' : c.background,
        borderTopWidth: glassTheme ? 0 : 1,
        borderWidth: homeLight ? 0 : glassTheme ? 1 : 0,
        borderColor: homeLight ? '#E7E7EA' : glassTheme ? '#EEF3F526' : c.border,
        paddingVertical: homeLight ? 9 : glassTheme ? 2 : 6,
        paddingHorizontal: homeLight ? 14 : glassTheme ? 5 : 0,
        marginHorizontal:
          active === 'Subscriptions' || active === 'Finances' || active === 'Savings'
            ? dashboardScrollY.interpolate({
                inputRange: [0, 95],
                outputRange: [15, 91],
                extrapolate: 'clamp',
              })
            : glassTheme
              ? homeLight
                ? 0
                : 15
              : 0,
        marginBottom: 0,
        borderRadius: homeLight ? 0 : glassTheme ? 27 : 0,
        shadowColor: glassTheme ? '#000000' : 'transparent',
        shadowOpacity: homeLight ? 0.08 : glassTheme ? 0.44 : 0,
        shadowRadius: homeLight ? 12 : glassTheme ? 18 : 0,
        shadowOffset: { width: 0, height: 8 },
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
            minHeight: homeLight ? 50 : glassTheme ? 47 : 46,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            borderRadius: glassTheme ? 23 : 16,
            opacity: pressed ? 0.72 : 1,
            backgroundColor:
              !homeLight && glassTheme && key === active ? '#868D95A3' : 'transparent',
          })}
        >
          <Ionicons
            name={icon}
            size={homeLight ? 25 : glassTheme ? 18 : 20}
            color={
              homeLight
                ? key === active
                  ? '#050A20'
                  : '#B8B8BA'
                : glassTheme
                  ? key === active
                    ? '#FFFFFF'
                    : '#D1D5DA'
                  : key === active
                    ? '#1888FF'
                    : c.muted
            }
          />
          <Animated.View
            style={{
              overflow: 'hidden',
              opacity: homeLight
                ? 0
                : active === 'Subscriptions' || active === 'Finances' || active === 'Savings'
                  ? dashboardScrollY.interpolate({
                      inputRange: [0, 55, 95],
                      outputRange: [1, 0.35, 0],
                      extrapolate: 'clamp',
                    })
                  : 1,
              maxHeight: homeLight
                ? 0
                : active === 'Subscriptions' || active === 'Finances' || active === 'Savings'
                  ? dashboardScrollY.interpolate({
                      inputRange: [0, 95],
                      outputRange: [13, 0],
                      extrapolate: 'clamp',
                    })
                  : 13,
            }}
          >
            <Label
              style={{
                fontSize: glassTheme ? 10 : 9,
                lineHeight: 13,
                fontWeight: key === active ? '700' : '500',
                color: glassTheme
                  ? key === active
                    ? '#FFFFFF'
                    : '#D1D5DA'
                  : key === active
                    ? '#1888FF'
                    : c.muted,
              }}
            >
              {title}
            </Label>
          </Animated.View>
        </Pressable>
      ))}
    </Animated.View>
  );
}
export function ScreenWithTabs({
  children,
  active,
}: {
  children: React.ReactNode;
  active: keyof TabsParams;
}) {
  const theme = useSession((s) => s.theme);
  const selectedBackground = useSession((s) => s.backgroundColor);
  const pageBackground = resolveBackgroundColor(selectedBackground, theme);
  return (
    <View style={{ flex: 1, backgroundColor: pageBackground }}>
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
  const token = useLiveToken();
  const isDark = useSession((s) => s.theme) === 'dark';
  const accentColor = useSession((s) => s.accentColor);
  const selectedBackground = useSession((s) => s.backgroundColor);
  const pageBackground = resolveBackgroundColor(selectedBackground, isDark ? 'dark' : 'light');
  const normalizedAccent = normalizeAccentColor(accentColor) ?? DEFAULT_ACCENT_COLOR;
  const accentForeground = accentTextColor(normalizedAccent);
  const homeColors = isDark
    ? {
        background: pageBackground,
        surface: '#18181D',
        elevated: '#222228',
        text: '#F8F7FA',
        body: '#ECEBF0',
        secondary: '#AAA8B1',
        muted: '#777780',
        separator: '#2A292F',
        avatar: '#493B34',
        avatarText: '#FFF7F0',
        shadow: '#000000',
      }
    : {
        background: pageBackground,
        surface: '#FFFFFF',
        elevated: '#FFFFFF',
        text: '#171719',
        body: '#242328',
        secondary: '#858489',
        muted: '#A4A3A9',
        separator: '#F0EFF2',
        avatar: '#E8D6C8',
        avatarText: '#2B2420',
        shadow: '#34313D',
      };
  const summaryGradient = [
    mixAccentColor(normalizedAccent, '#FFFFFF', isDark ? 0.1 : 0.2),
    mixAccentColor(normalizedAccent, '#000000', isDark ? 0.16 : 0.06),
  ] as const;
  const summaryText = accentTextColor(normalizedAccent);
  const summaryMuted = mixAccentColor(
    normalizedAccent,
    summaryText === '#FFFFFF' ? '#FFFFFF' : '#000000',
    0.72,
  );
  const summaryProgress = summaryText;
  const summaryTrack = accentWithAlpha(summaryText, 0.26);
  const accentShadow = mixAccentColor(normalizedAccent, '#000000', 0.48);
  const accentCore = mixAccentColor(
    normalizedAccent,
    '#000000',
    summaryText === '#FFFFFF' ? 0.36 : 0.14,
  );
  const accentHalo = accentWithAlpha(mixAccentColor(normalizedAccent, '#FFFFFF', 0.58), 0.34);
  const dashboard = useOverview();
  const profile = useProfile();
  const finance = useQuery({
    queryKey: ['finance-overview', token, 'home'],
    queryFn: () => api.financeOverview({ excludeInternalTransfers: true }),
    enabled: Boolean(token),
  });
  const transactions = useQuery({
    queryKey: ['finance-transactions', token, 'home'],
    queryFn: () => api.financeTransactions({ excludeInternalTransfers: true }, 40),
    enabled: Boolean(token),
  });
  const [search, setSearch] = useState('');
  const d = dashboard.data;
  const financeData = finance.data;
  const normalizedSearch = search.trim().toLocaleLowerCase('fr');
  const recentTransactions = (transactions.data?.items ?? [])
    .filter(
      (item) =>
        !normalizedSearch ||
        item.merchantName.toLocaleLowerCase('fr').includes(normalizedSearch) ||
        item.categoryLabel.toLocaleLowerCase('fr').includes(normalizedSearch) ||
        item.bankName.toLocaleLowerCase('fr').includes(normalizedSearch),
    )
    .slice(0, 3);
  const spent = financeData?.expense ?? 0;
  const remaining = financeData
    ? financeData.monthlyBudget > 0
      ? financeData.monthlyBudget - financeData.expense
      : financeData.net
    : 0;
  const remainingLabel =
    (financeData?.monthlyBudget ?? 0) > 0 ? 'Reste du budget' : 'Solde du mois';
  const hasMonthlyBudget = (financeData?.monthlyBudget ?? 0) > 0;
  const progressBase = hasMonthlyBudget
    ? (financeData?.monthlyBudget ?? 0)
    : (financeData?.income ?? 0);
  const progressRatio = progressBase > 0 ? Math.min(spent / progressBase, 1) : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const progressLabel = hasMonthlyBudget
    ? `${progressPercent} % du budget utilisé`
    : progressBase > 0
      ? `${progressPercent} % des revenus dépensés`
      : 'Définir un budget mensuel';
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(new Date())
    .replace(/^./, (letter) => letter.toLocaleUpperCase('fr'));
  const firstName = profile.data?.firstName?.trim() || 'Vous';
  const initial = firstName.charAt(0).toLocaleUpperCase('fr');
  const actions: {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
  }[] = [
    {
      label: 'Transactions',
      icon: 'swap-vertical',
      onPress: () => nav.navigate('Main', { screen: 'Finances' }),
    },
    {
      label: 'Abonnements',
      icon: 'repeat',
      onPress: () => nav.navigate('Main', { screen: 'Subscriptions' }),
    },
    {
      label: 'Budgets',
      icon: 'wallet',
      onPress: () => nav.navigate('Main', { screen: 'Finances' }),
    },
    {
      label: 'Économies',
      icon: 'stats-chart',
      onPress: () => nav.navigate('Main', { screen: 'Savings' }),
    },
  ];

  return (
    <ScreenWithTabs active="Home">
      <ImageBackground
        source={require('../../assets/home-fabric.png')}
        resizeMode="cover"
        imageStyle={{ opacity: 0.28 }}
        style={{ flex: 1, backgroundColor: homeColors.background }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ['#00000070', '#00000018', '#00000055']
              : ['#FFFFFF70', '#FFFFFF18', '#FFFFFF55']
          }
          locations={[0, 0.46, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Page
          fill
          transparent
          style={{ gap: 0, paddingHorizontal: 14, paddingTop: 7, paddingBottom: 108 }}
        >
          <View style={{ minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le profil"
              onPress={() => nav.navigate('Main', { screen: 'Profile' })}
              style={({ pressed }) => ({
                width: 43,
                height: 43,
                borderRadius: 22,
                backgroundColor: homeColors.avatar,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Label style={{ color: homeColors.avatarText, fontSize: 17, fontWeight: '900' }}>
                {initial}
              </Label>
              <View
                style={{
                  position: 'absolute',
                  right: -3,
                  bottom: -2,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: homeColors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? '#3A3940' : '#DAD9DE',
                }}
              >
                <Ionicons name="settings-outline" size={12} color={homeColors.secondary} />
              </View>
            </Pressable>
            <View
              style={{
                flex: 1,
                height: 46,
                paddingHorizontal: 16,
                borderRadius: 23,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: homeColors.surface,
              }}
            >
              <Ionicons name="search-outline" size={20} color={homeColors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher"
                placeholderTextColor={homeColors.muted}
                accessibilityLabel="Rechercher une transaction"
                style={
                  { flex: 1, color: homeColors.text, fontSize: 15, outlineStyle: 'none' } as never
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => nav.navigate('Notifications')}
              style={({ pressed }) => ({
                width: 43,
                height: 43,
                borderRadius: 22,
                backgroundColor: homeColors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Ionicons name="notifications-outline" size={23} color={homeColors.text} />
            </Pressable>
          </View>

          {!d ? (
            <View style={{ marginTop: 100 }}>
              <State
                loading={dashboard.isPending}
                error={dashboard.error}
                retry={() => dashboard.refetch()}
              />
            </View>
          ) : !d.hasConnectedBank && !d.lastSyncAt ? (
            <View style={{ marginTop: 80 }}>
              <State
                title="Connectez votre première banque"
                description="Retrouvez vos abonnements et vos économies possibles."
                action={
                  <Button title="Connecter une banque" onPress={() => nav.navigate('Bank')} />
                }
              />
            </View>
          ) : (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 18,
                  paddingHorizontal: 4,
                }}
              >
                <Label style={{ flex: 1, color: homeColors.text, fontSize: 18, fontWeight: '800' }}>
                  Aperçu
                </Label>
                <Pressable onPress={() => nav.navigate('Main', { screen: 'Finances' })}>
                  <Label style={{ color: homeColors.secondary, fontSize: 13 }}>Voir tout</Label>
                </Pressable>
              </View>

              <View style={{ marginTop: 13 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voir le détail de mes finances"
                  onPress={() => nav.navigate('Main', { screen: 'Finances' })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                >
                  <LinearGradient
                    colors={summaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      minHeight: 215,
                      borderRadius: 24,
                      padding: 19,
                      overflow: 'hidden',
                      shadowColor: isDark ? '#000000' : accentShadow,
                      shadowOpacity: isDark ? 0.34 : 0.22,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 9 },
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        width: 190,
                        height: 190,
                        borderRadius: 95,
                        right: -68,
                        top: -72,
                        backgroundColor: accentHalo,
                      }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        width: 86,
                        height: 86,
                        borderRadius: 43,
                        right: 24,
                        bottom: -51,
                        backgroundColor: '#3518B91C',
                      }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 11,
                          backgroundColor: accentCore,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={17}
                          color={accentTextColor(accentCore)}
                        />
                      </View>
                      <Label
                        style={{
                          marginLeft: 10,
                          flex: 1,
                          color: summaryText,
                          fontSize: 19,
                          fontWeight: '900',
                        }}
                      >
                        Ce mois
                      </Label>
                      <Label style={{ color: summaryMuted, fontSize: 11, fontWeight: '700' }}>
                        {monthLabel}
                      </Label>
                    </View>
                    <View style={{ marginTop: 23 }}>
                      <Label
                        style={{
                          color: summaryMuted,
                          fontSize: 10,
                          fontWeight: '700',
                          letterSpacing: 0.7,
                        }}
                      >
                        DÉPENSÉ
                      </Label>
                      <Label
                        style={{
                          color: summaryText,
                          fontSize: 31,
                          lineHeight: 38,
                          fontWeight: '900',
                          letterSpacing: -0.9,
                        }}
                      >
                        {finance.isPending ? '—' : money(spent)}
                      </Label>
                    </View>
                    <View style={{ marginTop: 15 }}>
                      <View
                        style={{
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: summaryTrack,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${progressRatio * 100}%`,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor:
                              hasMonthlyBudget && spent > (financeData?.monthlyBudget ?? 0)
                                ? '#B21D1D'
                                : summaryProgress,
                          }}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7 }}>
                        <Label
                          style={{ flex: 1, color: summaryMuted, fontSize: 10, fontWeight: '700' }}
                        >
                          {finance.isPending ? 'Calcul en cours…' : progressLabel}
                        </Label>
                        <Label style={{ color: summaryMuted, fontSize: 10, fontWeight: '700' }}>
                          {remainingLabel}
                        </Label>
                        <Label
                          style={{
                            color: remaining < 0 ? '#FFB1B1' : summaryText,
                            fontSize: 13,
                            fontWeight: '900',
                            marginLeft: 5,
                          }}
                        >
                          {finance.isPending ? '—' : money(remaining)}
                        </Label>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 7, marginTop: 25 }}>
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    onPress={action.onPress}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: 'center',
                      opacity: pressed ? 0.65 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 57,
                        height: 63,
                        borderRadius: 19,
                        backgroundColor: homeColors.elevated,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: homeColors.shadow,
                        shadowOpacity: isDark ? 0.24 : 0.06,
                        shadowRadius: 7,
                        shadowOffset: { width: 0, height: 3 },
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 28,
                          borderRadius: 7,
                          backgroundColor: normalizedAccent,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={action.icon} size={15} color={accentForeground} />
                      </View>
                    </View>
                    <Label
                      style={{
                        color: homeColors.body,
                        fontSize: 10,
                        fontWeight: '700',
                        marginTop: 8,
                        textAlign: 'center',
                      }}
                    >
                      {action.label}
                    </Label>
                  </Pressable>
                ))}
              </View>

              <View
                style={{
                  marginTop: 24,
                  borderRadius: 17,
                  paddingHorizontal: 15,
                  paddingTop: 17,
                  paddingBottom: 7,
                  backgroundColor: homeColors.surface,
                  shadowColor: homeColors.shadow,
                  shadowOpacity: isDark ? 0.28 : 0.07,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
                  <Label
                    style={{ flex: 1, color: homeColors.text, fontSize: 18, fontWeight: '800' }}
                  >
                    Historique
                  </Label>
                  <Pressable
                    onPress={() => nav.navigate('Main', { screen: 'Finances' })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                  >
                    <Label style={{ color: homeColors.secondary, fontSize: 12 }}>Voir plus</Label>
                    <Ionicons name="chevron-forward" size={15} color={homeColors.secondary} />
                  </Pressable>
                </View>
                {transactions.isPending ? (
                  <View style={{ minHeight: 116, alignItems: 'center', justifyContent: 'center' }}>
                    <Label style={{ color: homeColors.secondary }}>
                      Chargement des transactions…
                    </Label>
                  </View>
                ) : transactions.error ? (
                  <Pressable
                    onPress={() => transactions.refetch()}
                    style={{ minHeight: 95, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Label style={{ color: '#B14B4B', textAlign: 'center' }}>
                      Impossible de charger l’historique. Appuyez pour réessayer.
                    </Label>
                  </Pressable>
                ) : recentTransactions.length === 0 ? (
                  <View style={{ minHeight: 95, alignItems: 'center', justifyContent: 'center' }}>
                    <Label style={{ color: homeColors.secondary, textAlign: 'center' }}>
                      {search
                        ? 'Aucune transaction ne correspond à cette recherche.'
                        : 'Aucune transaction disponible.'}
                    </Label>
                  </View>
                ) : (
                  recentTransactions.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={() => nav.navigate('Main', { screen: 'Finances' })}
                      style={({ pressed }) => ({
                        minHeight: 62,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 11,
                        borderBottomWidth: index === recentTransactions.length - 1 ? 0 : 1,
                        borderBottomColor: homeColors.separator,
                        opacity: pressed ? 0.68 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor:
                            item.isInternalTransfer ||
                            item.merchantName.trim().toLocaleLowerCase('fr').startsWith('virement')
                              ? isDark
                                ? '#2B2B32'
                                : '#E9E8ED'
                              : item.amount >= 0
                                ? accentWithAlpha(normalizedAccent, isDark ? 0.55 : 0.2)
                                : isDark
                                  ? '#2B2B32'
                                  : '#171719',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Label
                          style={{
                            color:
                              item.isInternalTransfer ||
                              item.merchantName
                                .trim()
                                .toLocaleLowerCase('fr')
                                .startsWith('virement')
                                ? isDark
                                  ? '#EDECF1'
                                  : '#56545C'
                                : item.amount >= 0
                                  ? isDark
                                    ? '#FFFFFF'
                                    : mixAccentColor(normalizedAccent, '#000000', 0.38)
                                  : '#FFFFFF',
                            fontSize: 13,
                            fontWeight: '900',
                          }}
                        >
                          {(item.merchantName || '?').charAt(0).toLocaleUpperCase('fr')}
                        </Label>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Label
                          numberOfLines={1}
                          style={{ color: homeColors.body, fontSize: 15, fontWeight: '700' }}
                        >
                          {item.merchantName || 'Transaction'}
                        </Label>
                        <Label
                          numberOfLines={1}
                          style={{ color: homeColors.secondary, fontSize: 11, marginTop: 2 }}
                        >
                          {item.categoryLabel} · {item.bankName}
                        </Label>
                      </View>
                      <Label
                        style={{
                          color:
                            item.amount >= 0 ? (isDark ? '#44D56A' : '#10A330') : homeColors.body,
                          fontSize: 14,
                          fontWeight: '800',
                        }}
                      >
                        {item.amount > 0 ? '+' : ''}
                        {money(item.amount)}
                      </Label>
                    </Pressable>
                  ))
                )}
              </View>
            </>
          )}
        </Page>
      </ImageBackground>
    </ScreenWithTabs>
  );
}
export function SubscriptionsScreen() {
  const nav = useNav();
  const theme = useSession((s) => s.theme);
  const selectedBackground = useSession((s) => s.backgroundColor);
  const pageBackground = resolveBackgroundColor(selectedBackground, theme);
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
  React.useEffect(() => {
    dashboardScrollY.setValue(0);
    return () => dashboardScrollY.setValue(0);
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/home-fabric.png')}
      resizeMode="cover"
      imageStyle={{ opacity: 0.28 }}
      style={{ flex: 1, backgroundColor: pageBackground }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          theme === 'dark'
            ? ['#00000070', '#00000018', '#00000055']
            : ['#FFFFFF70', '#FFFFFF18', '#FFFFFF55']
        }
        locations={[0, 0.46, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <Page
        fill
        transparent
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: dashboardScrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        style={{ gap: 0, paddingHorizontal: 17, paddingTop: 10, paddingBottom: 150 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mon profil"
            onPress={() => nav.navigate('Main', { screen: 'Profile' })}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#8FAC9CDA',
              borderWidth: 2,
              borderColor: '#D9E7DF9C',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons name="person-outline" size={20} color="#FFFFFF" />
          </Pressable>
          <View
            style={{
              flex: 1,
              minHeight: 32,
              borderRadius: 20,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#5B6068D9',
            }}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
            <TextInput
              accessibilityLabel="Rechercher un abonnement"
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher"
              placeholderTextColor="#E6EBEFB8"
              style={{ flex: 1, height: 32, color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}
            />
          </View>
        </View>

        <View style={{ marginTop: 31 }}>
          <Label
            style={{
              color: '#FFFFFF',
              fontSize: 27,
              lineHeight: 33,
              fontWeight: '700',
              letterSpacing: -0.65,
            }}
          >
            Vos abonnements
          </Label>
          <Label style={{ marginTop: 2, color: '#D0D8DF', fontSize: 13 }}>
            {showReference ? 6 : (q.data?.total ?? 0)} abonnements détectés
          </Label>
        </View>

        <View style={{ flexDirection: 'row', gap: 7, marginTop: 18 }}>
          {['Tous', 'Streaming', 'Télécom', 'Assurance'].map((item) => {
            const selected = filter === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(item)}
                style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.72 : 1 })}
              >
                <View
                  style={{
                    height: 32,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: selected ? '#EAF1F259' : '#DDE6EC26',
                    backgroundColor: selected ? '#7E8995C7' : '#394653A8',
                  }}
                >
                  <Label
                    style={{
                      color: selected ? '#FFFFFF' : '#D5DCE2',
                      fontSize: 10,
                      fontWeight: selected ? '700' : '500',
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
          <View style={{ marginTop: 85 }}>
            <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
          </View>
        ) : items.length ? (
          <View
            style={{
              marginTop: 17,
              borderRadius: 23,
              overflow: 'hidden',
              paddingHorizontal: 16,
              backgroundColor: '#4B5966D4',
              borderWidth: 1,
              borderColor: '#E9EFF238',
            }}
          >
            {items.map((payment, index) => (
              <Pressable
                key={payment.id}
                onPress={() => nav.navigate('Subscription', { id: payment.id })}
                accessibilityRole="button"
                accessibilityLabel={`${payment.merchant}, ${money(payment.monthlyCost)} par mois`}
                style={({ pressed }) => ({
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderBottomWidth: index === items.length - 1 ? 0 : 1,
                  borderBottomColor: '#DDE5EA24',
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <GlassBrandIcon name={payment.merchant} size={40} />
                <View style={{ flex: 1 }}>
                  <Label style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                    {payment.merchant}
                  </Label>
                  <Label style={{ color: '#CFD7DE', fontSize: 11 }}>
                    {payment.merchant.toLowerCase().includes('spotify')
                      ? 'Musique'
                      : payment.category === 'streaming'
                        ? 'Divertissement'
                        : fr.categories[payment.category]}
                  </Label>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Label style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                    {money(payment.monthlyCost)}
                  </Label>
                  <Label style={{ color: '#D3DAE0', fontSize: 10 }}>par mois</Label>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D3DBE2" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 85 }}>
            <State
              title="Aucun abonnement trouvé"
              description="Essayez une autre recherche ou connectez votre banque."
            />
          </View>
        )}
      </Page>
    </ImageBackground>
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
      <Page style={{ gap: 10, paddingHorizontal: 16, paddingTop: 58, paddingBottom: 10 }}>
        {!p ? (
          <State loading={q.isPending} error={q.error} title="Abonnement introuvable" />
        ) : (
          <>
            <LinearGradient
              colors={['#4B5966D4', '#354451D4', '#202B35D9']}
              style={{
                alignItems: 'center',
                gap: 5,
                paddingVertical: 14,
                borderRadius: 25,
                borderWidth: 1,
                borderColor: '#E9EFF238',
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
              colors={['#4B5966D4', '#354451D4']}
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
                      backgroundColor: '#34424FCE',
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
              colors={['#4B5966D4', '#354451D4']}
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
                colors={['#4B5966D4', '#354451D4']}
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
                    backgroundColor: '#34424FCE',
                  }}
                >
                  <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
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
export function SavingsScreen() {
  const nav = useNav();
  const theme = useSession((s) => s.theme);
  const selectedBackground = useSession((s) => s.backgroundColor);
  const pageBackground = resolveBackgroundColor(selectedBackground, theme);
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
  React.useEffect(() => {
    dashboardScrollY.setValue(0);
    return () => dashboardScrollY.setValue(0);
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/home-fabric.png')}
      resizeMode="cover"
      imageStyle={{ opacity: 0.28 }}
      style={{ flex: 1, backgroundColor: pageBackground }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          theme === 'dark'
            ? ['#00000070', '#00000018', '#00000055']
            : ['#FFFFFF70', '#FFFFFF18', '#FFFFFF55']
        }
        locations={[0, 0.46, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <Page
        fill
        transparent
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: dashboardScrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        style={{ gap: 0, paddingHorizontal: 17, paddingTop: 10, paddingBottom: 150 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mon profil"
            onPress={() => nav.navigate('Main', { screen: 'Profile' })}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#8FAC9CDA',
              borderWidth: 2,
              borderColor: '#D9E7DF9C',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons name="person-outline" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rechercher un abonnement"
            onPress={() => nav.navigate('Main', { screen: 'Subscriptions' })}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 32,
              borderRadius: 20,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#5B6068D9',
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
            <Label style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '500' }}>Rechercher</Label>
          </Pressable>
        </View>

        <Label
          style={{
            marginTop: 31,
            color: '#FFFFFF',
            fontSize: 27,
            lineHeight: 33,
            fontWeight: '700',
            letterSpacing: -0.65,
          }}
        >
          Vos économies
        </Label>

        <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
          {['Toutes', 'Disponibles', 'Réalisées'].map((item) => {
            const selected = filter === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(item)}
                style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.72 : 1 })}
              >
                <View
                  style={{
                    height: 32,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: selected ? '#EAF1F259' : '#DDE6EC26',
                    backgroundColor: selected ? '#7E8995C7' : '#394653A8',
                  }}
                >
                  <Label
                    style={{
                      color: selected ? '#FFFFFF' : '#D5DCE2',
                      fontSize: 10,
                      fontWeight: selected ? '700' : '500',
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
          colors={['#5A6672E8', '#3C4A57E8', '#263541E8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            minHeight: 132,
            marginTop: 17,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: '#E8F1EF3B',
            padding: 17,
            overflow: 'hidden',
            shadowColor: '#000000',
            shadowOpacity: 0.2,
            shadowRadius: 15,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['#FFFFFF20', '#C9D5DF0D', '#00000000']}
            style={{ position: 'absolute', left: -35, right: 70, top: -50, height: 110 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Label style={{ color: '#D3DDD9', fontSize: 12 }}>Économies potentielles</Label>
              <Label
                style={{
                  marginTop: 1,
                  color: '#FFFFFF',
                  fontSize: 38,
                  lineHeight: 46,
                  fontWeight: '700',
                  letterSpacing: -0.9,
                }}
              >
                {money(displayedTotal)}
                <Label style={{ color: '#38F5AE', fontSize: 17 }}> /an</Label>
              </Label>
            </View>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: '#34434FC7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="trending-up" size={24} color="#38F5AE" />
            </View>
          </View>
          <View
            style={{
              marginTop: 10,
              height: 4,
              borderRadius: 3,
              backgroundColor: '#FFFFFF1A',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['#F2F6F8', '#9FB9CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: '72%', height: 4, borderRadius: 3 }}
            />
          </View>
          <Label style={{ marginTop: 7, color: '#D0D9D8', fontSize: 10 }}>
            Des économies accessibles dès maintenant
          </Label>
        </LinearGradient>

        {q.isPending || q.error ? (
          <View style={{ marginTop: 70 }}>
            <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
          </View>
        ) : items?.length === 0 ? (
          <View style={{ marginTop: 70 }}>
            <State
              title={
                filter === 'Réalisées'
                  ? 'Pas encore d’économie réalisée'
                  : 'Aucune économie disponible'
              }
              description={
                filter === 'Réalisées'
                  ? 'Confirmez une recommandation après avoir changé d’offre.'
                  : 'De nouvelles offres apparaîtront après la prochaine analyse.'
              }
            />
          </View>
        ) : (
          <View
            style={{
              marginTop: 12,
              borderRadius: 23,
              overflow: 'hidden',
              paddingHorizontal: 16,
              backgroundColor: '#4B5966D4',
              borderWidth: 1,
              borderColor: '#E9EFF238',
            }}
          >
            {items?.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => nav.navigate('Recommendation', { id: item.id })}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderBottomWidth: index === items.length - 1 ? 0 : 1,
                  borderBottomColor: '#DDE5EA24',
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: '#34424FCE',
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
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Label style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                    {item.title}
                  </Label>
                  <Label style={{ color: '#CFD7DE', fontSize: 11 }}>Économie possible</Label>
                </View>
                <View
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 6,
                    borderRadius: 15,
                    backgroundColor: '#0A513AC7',
                  }}
                >
                  <Label style={{ color: '#38F5AE', fontSize: 10, fontWeight: '700' }}>
                    {money(item.annualSaving)} /an
                  </Label>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D3DBE2" />
              </Pressable>
            ))}
          </View>
        )}
      </Page>
    </ImageBackground>
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
    <Page style={{ gap: 10, paddingHorizontal: 16, paddingTop: 58, paddingBottom: 14 }}>
      {!r ? (
        <State loading={q.isPending} error={q.error} title="Recommandation introuvable" />
      ) : (
        <>
          <LinearGradient
            colors={['#4B5966D4', '#354451D4']}
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
                backgroundColor: '#34424FCE',
              }}
            >
              <Label style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                + {money(r.annualSaving)} /an
              </Label>
            </View>
          </LinearGradient>
          <Label style={{ fontWeight: '800', fontSize: 16, marginTop: 2 }}>
            Votre situation actuelle
          </Label>
          <LinearGradient
            colors={['#4B5966D4', '#354451D4']}
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
            colors={['#4B5966D4', '#354451D4', '#202B35D9']}
            style={{
              gap: 9,
              padding: 14,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#E9EFF238',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['#FFFFFF16', '#FFFFFF06', '#00000000']}
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
                    backgroundColor: '#34424FCE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" color="#FFFFFF" size={12} />
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
                backgroundColor: '#34424FCE',
              }}
            >
              <Label style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                Économie : {money(r.annualSaving)} /an
              </Label>
            </View>
          </LinearGradient>
          <LinearGradient
            colors={['#4B5966D4', '#354451D4']}
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
