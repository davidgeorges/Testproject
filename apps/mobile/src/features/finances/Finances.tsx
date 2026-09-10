import React, { useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBankAccounts, useBankConnections, useProfile } from '../../design/reference';
import { Card, Label, Page, State, useColors } from '../../design/ui';
import { dashboardScrollY, ScreenWithTabs, useNav } from '../../design/MainScreens';
import { api } from '../../services/api';
import { useLiveToken, useSession } from '../../store/session';
import {
  accentTextColor,
  accentWithAlpha,
  DEFAULT_ACCENT_COLOR,
  mixAccentColor,
  normalizeAccentColor,
  ORIGINAL_THEME_ACCENT,
} from '../../theme/accent';
import type { FinanceCategoryType, FinanceFilters } from '../../types/api';
import { date, money } from '../../utils/format';

type KindFilter = 'all' | 'income' | 'expense';
type Choice = { id: string; label: string };

const categories: Array<{ id: string; label: string; type: FinanceCategoryType }> = [
  { id: 'logement', label: 'Logement', type: 'fixed' },
  { id: 'transport', label: 'Transport', type: 'variable' },
  { id: 'courses', label: 'Courses', type: 'variable' },
  { id: 'restauration', label: 'Restauration', type: 'variable' },
  { id: 'abonnements', label: 'Abonnements', type: 'fixed' },
  { id: 'sante', label: 'Santé', type: 'variable' },
  { id: 'loisirs', label: 'Loisirs', type: 'variable' },
  { id: 'energie', label: 'Énergie', type: 'fixed' },
  { id: 'assurance', label: 'Assurances', type: 'fixed' },
  { id: 'impots', label: 'Impôts', type: 'fixed' },
  { id: 'education', label: 'Éducation', type: 'fixed' },
  { id: 'achats', label: 'Achats', type: 'variable' },
  { id: 'voyage', label: 'Voyage', type: 'variable' },
  { id: 'other', label: 'Autres', type: 'variable' },
];

const currentMonth = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (value: string) => {
  const [year, month] = value.split('-');
  return `${month}/${year}`;
};
const monthStart = (value: string) => `${value}-01`;
const monthEnd = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return `${value}-${String(new Date(Date.UTC(year!, month!, 0)).getUTCDate()).padStart(2, '0')}`;
};
const numeric = (value: string) => value.replace(',', '.').replace(/[^0-9.]/gu, '');

function MonthField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const c = useColors();
  const [draft, setDraft] = useState(monthLabel(value));
  React.useEffect(() => setDraft(monthLabel(value)), [value]);
  const commit = () => {
    const match = /^(0[1-9]|1[0-2])\/(\d{4})$/u.exec(draft.trim());
    if (!match) {
      setDraft(monthLabel(value));
      return;
    }
    onChange(`${match[2]}-${match[1]}`);
  };
  const webMonthPicker =
    Platform.OS === 'web'
      ? React.createElement('input', {
          type: 'month',
          value,
          'aria-label': `${label}, ouvrir le calendrier`,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
          style: {
            position: 'absolute',
            right: 0,
            top: 0,
            width: 44,
            height: 44,
            opacity: 0,
            cursor: 'pointer',
          },
        })
      : null;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Label style={{ color: c.muted, fontSize: 11 }}>{label}</Label>
      <View
        style={{
          height: 44,
          borderRadius: 14,
          paddingLeft: 12,
          paddingRight: 42,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
        }}
      >
        <TextInput
          accessibilityLabel={label}
          value={draft}
          maxLength={7}
          keyboardType="numbers-and-punctuation"
          placeholder="MM/AAAA"
          placeholderTextColor={c.muted}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          style={{ flex: 1, color: c.text, fontSize: 13, fontWeight: '700' }}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: 0, width: 42, alignItems: 'center' }}
        >
          <Ionicons name="calendar-outline" size={18} color={c.muted} />
        </View>
        {webMonthPicker}
      </View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const accent =
    normalizeAccentColor(useSession((state) => state.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 32,
        borderRadius: 16,
        paddingHorizontal: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? accent : c.elevated,
        borderWidth: 1,
        borderColor: selected ? accent : c.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Label style={{ color: selected ? accentTextColor(accent) : c.muted, fontSize: 11 }}>
        {label}
      </Label>
    </Pressable>
  );
}

function ChoiceRow({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Label style={{ color: c.muted, fontSize: 11 }}>{title}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {options.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              selected={option.id === value}
              onPress={() => onChange(option.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function FinancesScreen() {
  const nav = useNav();
  const token = useLiveToken();
  const isDark = useSession((state) => state.theme) === 'dark';
  const accentColor = useSession((state) => state.accentColor);
  const normalizedAccent = normalizeAccentColor(accentColor) ?? DEFAULT_ACCENT_COLOR;
  const accentForeground = accentTextColor(normalizedAccent);
  const heroText =
    isDark && normalizedAccent === ORIGINAL_THEME_ACCENT
      ? '#FFFFFF'
      : accentTextColor(normalizedAccent);
  const pageColors = isDark
    ? {
        background: '#0B0B0F',
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
        background: '#F4F3F7',
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
  const queryClient = useQueryClient();
  const profile = useProfile();
  const [fromMonth, setFromMonth] = useState(currentMonth());
  const [toMonth, setToMonth] = useState(currentMonth());
  const [kind, setKind] = useState<KindFilter>('all');
  const [connectionId, setConnectionId] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [excludeInternalTransfers, setExcludeInternalTransfers] = useState(true);
  const [editingBudget, setEditingBudget] = useState<{
    category: string;
    value: string;
    displayName: string;
  } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [creatingBudget, setCreatingBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetValue, setNewBudgetValue] = useState('');
  const [newBudgetType, setNewBudgetType] = useState<FinanceCategoryType>('variable');
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);

  const orderedMonths = fromMonth <= toMonth ? [fromMonth, toMonth] : [toMonth, fromMonth];
  const filters = useMemo<FinanceFilters>(
    () => ({
      from: monthStart(orderedMonths[0]!),
      to: monthEnd(orderedMonths[1]!),
      connectionId: connectionId === 'all' ? undefined : connectionId,
      accountId: accountId === 'all' ? undefined : accountId,
      category: category === 'all' ? undefined : category,
      kind: kind === 'all' ? undefined : kind,
      search: search.trim() || undefined,
      excludeInternalTransfers,
    }),
    [accountId, category, connectionId, excludeInternalTransfers, fromMonth, kind, search, toMonth],
  );

  const connections = useBankConnections();
  const accounts = useBankAccounts();
  const overview = useQuery({
    queryKey: ['finance-overview', token, filters],
    queryFn: () => api.financeOverview(filters),
    enabled: Boolean(token),
    placeholderData: (previous) => previous,
  });
  const transactions = useQuery({
    queryKey: ['finance-transactions', token, filters],
    queryFn: () => api.financeTransactions(filters),
    enabled: Boolean(token),
    placeholderData: (previous) => previous,
  });
  const budgets = useQuery({
    queryKey: ['finance-budgets', token],
    queryFn: api.financeBudgets,
    enabled: Boolean(token),
  });

  const refreshFinance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] }),
    ]);
  };
  const retryAll = async () => {
    await Promise.all([
      connections.refetch(),
      accounts.refetch(),
      overview.refetch(),
      transactions.refetch(),
      budgets.refetch(),
    ]);
  };
  const saveBudget = useMutation({
    mutationFn: ({
      categoryId,
      amount,
      type,
      displayName,
    }: {
      categoryId: string;
      amount: number;
      type: FinanceCategoryType;
      displayName?: string | null;
    }) => api.saveFinanceBudget(categoryId, amount, type, displayName),
    onSuccess: async () => {
      setEditingBudget(null);
      setCreatingBudget(false);
      setNewBudgetCategory('');
      setNewBudgetName('');
      setNewBudgetValue('');
      await refreshFinance();
    },
    onError: (error: Error) => Alert.alert('Budget', error.message),
  });
  const removeBudget = useMutation({
    mutationFn: api.deleteFinanceBudget,
    onSuccess: async () => {
      setDeletingBudget(null);
      setEditingBudget(null);
      await refreshFinance();
    },
    onError: (error: Error) => Alert.alert('Budget', error.message),
  });
  const saveCategory = useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      api.saveTransactionCategory(id, categoryId),
    onSuccess: async () => {
      setEditingTransaction(null);
      await refreshFinance();
    },
    onError: (error: Error) => Alert.alert('Catégorie', error.message),
  });
  const resetCategory = useMutation({
    mutationFn: api.deleteTransactionCategory,
    onSuccess: async () => {
      setEditingTransaction(null);
      await refreshFinance();
    },
    onError: (error: Error) => Alert.alert('Catégorie', error.message),
  });

  const bankChoices = useMemo<Choice[]>(
    () => [
      { id: 'all', label: 'Toutes les banques' },
      ...(connections.data ?? []).map((item) => ({ id: item.id, label: item.bankName })),
    ],
    [connections.data],
  );
  const accountChoices = useMemo<Choice[]>(
    () => [
      { id: 'all', label: 'Tous les comptes' },
      ...(accounts.data ?? [])
        .filter((item) => connectionId === 'all' || item.connectionId === connectionId)
        .map((item) => ({ id: item.id, label: item.maskedName || item.accountType })),
    ],
    [accounts.data, connectionId],
  );
  const budgetMap = useMemo(
    () => new Map((budgets.data ?? []).map((item) => [item.category, item])),
    [budgets.data],
  );
  const summaryMap = useMemo(
    () => new Map((overview.data?.categories ?? []).map((item) => [item.category, item])),
    [overview.data?.categories],
  );
  const availableBudgetCategories = categories.filter((item) => !budgetMap.has(item.id));

  const exportCsv = async () => {
    try {
      const csv = await api.exportFinanceCsv(filters);
      if (csv.trim().split(/\r?\n/u).length <= 1)
        return Alert.alert('Export', 'Aucune transaction avec ces filtres.');
      await Share.share({ message: csv, title: `transactions-${fromMonth}-${toMonth}.csv` });
    } catch (error) {
      Alert.alert('Export', error instanceof Error ? error.message : 'L’export a échoué.');
    }
  };

  if (!token)
    return (
      <ScreenWithTabs active="Finances">
        <Page>
          <State
            error={new Error('Connectez-vous pour accéder à vos données financières réelles.')}
          />
        </Page>
      </ScreenWithTabs>
    );
  if (overview.isPending || transactions.isPending || budgets.isPending)
    return (
      <ScreenWithTabs active="Finances">
        <View style={{ flex: 1, backgroundColor: pageColors.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <Page transparent>
            <State loading />
          </Page>
        </View>
      </ScreenWithTabs>
    );
  const error =
    overview.error || transactions.error || budgets.error || connections.error || accounts.error;
  if (error && !overview.data)
    return (
      <ScreenWithTabs active="Finances">
        <View style={{ flex: 1, backgroundColor: pageColors.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <Page transparent>
            <State
              error={error as Error}
              retry={() => {
                void retryAll();
              }}
            />
          </Page>
        </View>
      </ScreenWithTabs>
    );

  const data = overview.data!;
  const period =
    fromMonth === toMonth
      ? monthLabel(fromMonth)
      : `${monthLabel(fromMonth)} → ${monthLabel(toMonth)}`;
  const alerts = data.categories.filter(
    (item) => item.status === 'exceeded' || item.status === 'near',
  );
  const topCategories = [...data.categories]
    .filter((item) => item.expense > 0)
    .sort((left, right) => right.expense - left.expense)
    .slice(0, 4);
  const heroGradient = [
    mixAccentColor(normalizedAccent, '#FFFFFF', isDark ? 0.1 : 0.2),
    mixAccentColor(normalizedAccent, '#000000', isDark ? 0.16 : 0.06),
  ] as const;
  const heroMuted = mixAccentColor(
    normalizedAccent,
    heroText === '#FFFFFF' ? '#FFFFFF' : '#000000',
    0.72,
  );
  const initial = (profile.data?.firstName?.trim() || 'Vous').charAt(0).toLocaleUpperCase('fr');
  const activeFilterCount = [
    fromMonth !== currentMonth() || toMonth !== currentMonth(),
    connectionId !== 'all',
    accountId !== 'all',
    category !== 'all',
    kind !== 'all',
    !excludeInternalTransfers,
  ].filter(Boolean).length;
  const editingItem = transactions.data?.items.find((item) => item.id === editingTransaction);
  const resetFilters = () => {
    const month = currentMonth();
    setFromMonth(month);
    setToMonth(month);
    setKind('all');
    setConnectionId('all');
    setAccountId('all');
    setCategory('all');
    setExcludeInternalTransfers(true);
  };

  return (
    <ScreenWithTabs active="Finances">
      <View style={{ flex: 1, backgroundColor: pageColors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Page
          fill
          transparent
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: dashboardScrollY } } }], {
            useNativeDriver: false,
          })}
          scrollEventThrottle={16}
          style={{ gap: 0, paddingHorizontal: 14, paddingTop: 7, paddingBottom: 128 }}
        >
          <View style={{ minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voir mon profil"
              onPress={() => nav.navigate('Main', { screen: 'Profile' })}
              style={({ pressed }) => ({
                width: 43,
                height: 43,
                borderRadius: 22,
                backgroundColor: pageColors.avatar,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Label style={{ color: pageColors.avatarText, fontSize: 17, fontWeight: '900' }}>
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
                  backgroundColor: pageColors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? '#3A3940' : '#DAD9DE',
                }}
              >
                <Ionicons name="settings-outline" size={12} color={pageColors.secondary} />
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
                backgroundColor: pageColors.surface,
              }}
            >
              <Ionicons name="search-outline" size={20} color={pageColors.muted} />
              <TextInput
                accessibilityLabel="Rechercher une transaction"
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher"
                placeholderTextColor={pageColors.muted}
                style={
                  { flex: 1, color: pageColors.text, fontSize: 15, outlineStyle: 'none' } as never
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
                backgroundColor: pageColors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Ionicons name="notifications-outline" size={23} color={pageColors.text} />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 18,
              paddingHorizontal: 4,
            }}
          >
            <Label style={{ flex: 1, color: pageColors.text, fontSize: 18, fontWeight: '800' }}>
              Finances
            </Label>
            <Label style={{ color: pageColors.secondary, fontSize: 13 }}>{period}</Label>
          </View>

          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              minHeight: 205,
              marginTop: 13,
              borderRadius: 24,
              padding: 19,
              overflow: 'hidden',
              shadowColor: pageColors.shadow,
              shadowOpacity: isDark ? 0.34 : 0.2,
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
                backgroundColor: accentWithAlpha(
                  mixAccentColor(normalizedAccent, '#FFFFFF', 0.58),
                  0.34,
                ),
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: mixAccentColor(normalizedAccent, '#000000', 0.2),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="wallet-outline" size={17} color={heroText} />
              </View>
              <Label style={{ marginLeft: 10, color: heroText, fontSize: 19, fontWeight: '900' }}>
                Solde du mois
              </Label>
            </View>
            <Label
              style={{
                marginTop: 18,
                color: heroText,
                fontSize: 34,
                lineHeight: 40,
                fontWeight: '900',
                letterSpacing: -0.9,
              }}
            >
              {money(data.net)}
            </Label>
            <View
              style={{
                flexDirection: 'row',
                marginTop: 18,
                paddingTop: 13,
                borderTopWidth: 1,
                borderTopColor: accentWithAlpha(heroText, 0.24),
              }}
            >
              <View style={{ flex: 1 }}>
                <Label style={{ color: heroMuted, fontSize: 10, fontWeight: '700' }}>REVENUS</Label>
                <Label style={{ color: heroText, fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                  {money(data.income)}
                </Label>
              </View>
              <View style={{ flex: 1 }}>
                <Label style={{ color: heroMuted, fontSize: 10, fontWeight: '700' }}>
                  DÉPENSES
                </Label>
                <Label style={{ color: heroText, fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                  {money(data.expense)}
                </Label>
              </View>
            </View>
          </LinearGradient>

          <View style={{ flexDirection: 'row', gap: 7, marginTop: 24 }}>
            {[
              {
                label: 'Filtres',
                icon: 'options-outline' as const,
                badge: activeFilterCount || undefined,
                action: () => setFiltersOpen(true),
              },
              {
                label: 'Budgets',
                icon: 'pie-chart-outline' as const,
                action: () => setBudgetsOpen(true),
              },
              {
                label: 'Analyse',
                icon: 'stats-chart-outline' as const,
                action: () => setAnalysisOpen(true),
              },
              {
                label: 'Exporter',
                icon: 'share-outline' as const,
                action: () => void exportCsv(),
              },
            ].map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.action}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <View
                  style={{
                    width: 57,
                    height: 58,
                    borderRadius: 19,
                    backgroundColor: pageColors.elevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: pageColors.shadow,
                    shadowOpacity: isDark ? 0.24 : 0.06,
                    shadowRadius: 7,
                    shadowOffset: { width: 0, height: 3 },
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 30,
                      borderRadius: 9,
                      backgroundColor: normalizedAccent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={action.icon} size={16} color={accentForeground} />
                  </View>
                  {action.badge ? (
                    <View
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: 5,
                        minWidth: 17,
                        height: 17,
                        borderRadius: 9,
                        paddingHorizontal: 4,
                        backgroundColor: '#E55454',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Label style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>
                        {action.badge}
                      </Label>
                    </View>
                  ) : null}
                </View>
                <Label
                  style={{
                    color: pageColors.body,
                    fontSize: 10,
                    fontWeight: '700',
                    marginTop: 7,
                  }}
                >
                  {action.label}
                </Label>
              </Pressable>
            ))}
          </View>

          {alerts.length ? (
            <Pressable
              onPress={() => setBudgetsOpen(true)}
              style={({ pressed }) => ({
                marginTop: 22,
                minHeight: 62,
                borderRadius: 17,
                paddingHorizontal: 15,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#2D211B' : '#FFF1E7',
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Ionicons name="warning-outline" size={22} color="#E9864F" />
              <View style={{ flex: 1, marginLeft: 11 }}>
                <Label style={{ color: pageColors.text, fontSize: 13, fontWeight: '800' }}>
                  {alerts.length} alerte{alerts.length > 1 ? 's' : ''} budget
                </Label>
                <Label style={{ color: pageColors.secondary, fontSize: 11, marginTop: 2 }}>
                  Appuyez pour voir les catégories concernées
                </Label>
              </View>
              <Ionicons name="chevron-forward" size={17} color={pageColors.muted} />
            </Pressable>
          ) : null}

          {topCategories.length ? (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
                <Label style={{ flex: 1, color: pageColors.text, fontSize: 18, fontWeight: '800' }}>
                  Dépenses principales
                </Label>
                <Pressable onPress={() => setAnalysisOpen(true)}>
                  <Label style={{ color: pageColors.secondary, fontSize: 12 }}>Voir tout</Label>
                </Pressable>
              </View>
              <View
                style={{
                  marginTop: 10,
                  borderRadius: 17,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: pageColors.surface,
                  shadowColor: pageColors.shadow,
                  shadowOpacity: isDark ? 0.28 : 0.07,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                }}
              >
                {topCategories.map((item, index) => (
                  <View
                    key={item.category}
                    style={{
                      minHeight: 58,
                      justifyContent: 'center',
                      borderBottomWidth: index === topCategories.length - 1 ? 0 : 1,
                      borderBottomColor: pageColors.separator,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Label
                        style={{ flex: 1, color: pageColors.body, fontSize: 13, fontWeight: '700' }}
                      >
                        {item.label}
                      </Label>
                      <Label style={{ color: pageColors.body, fontSize: 13, fontWeight: '800' }}>
                        {money(item.expense)}
                      </Label>
                    </View>
                    <View
                      style={{
                        height: 5,
                        marginTop: 7,
                        borderRadius: 3,
                        overflow: 'hidden',
                        backgroundColor: pageColors.separator,
                      }}
                    >
                      <View
                        style={{
                          height: 5,
                          width: `${Math.min((item.expense / Math.max(data.expense, 1)) * 100, 100)}%`,
                          borderRadius: 3,
                          backgroundColor: normalizedAccent,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
              <Label style={{ flex: 1, color: pageColors.text, fontSize: 18, fontWeight: '800' }}>
                Transactions
              </Label>
              <Label style={{ color: pageColors.secondary, fontSize: 12 }}>
                {transactions.data?.total ?? 0}
              </Label>
            </View>
          </View>
          <View
            style={{
              marginTop: 10,
              borderRadius: 17,
              paddingHorizontal: 15,
              backgroundColor: pageColors.surface,
              overflow: 'hidden',
              shadowColor: pageColors.shadow,
              shadowOpacity: isDark ? 0.28 : 0.07,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 5 },
            }}
          >
            {(transactions.data?.items ?? []).map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => setEditingTransaction(item.id)}
                style={{
                  borderBottomWidth: index === (transactions.data?.items.length ?? 0) - 1 ? 0 : 1,
                  borderBottomColor: pageColors.separator,
                }}
              >
                <View
                  style={{
                    minHeight: 68,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor:
                        item.amount >= 0
                          ? accentWithAlpha(normalizedAccent, isDark ? 0.5 : 0.18)
                          : isDark
                            ? '#2B2B32'
                            : '#171719',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={item.amount >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                      size={17}
                      color={item.amount >= 0 ? normalizedAccent : '#FFFFFF'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label
                      numberOfLines={1}
                      style={{ color: pageColors.body, fontSize: 14, fontWeight: '700' }}
                    >
                      {item.merchantName || 'Transaction'}
                    </Label>
                    <Label
                      numberOfLines={1}
                      style={{ color: pageColors.secondary, fontSize: 10, marginTop: 2 }}
                    >
                      {date(item.bookedAt)} · {item.categoryLabel}
                      {' · '}
                      {item.bankName}
                    </Label>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Label
                      style={{
                        color: item.amount >= 0 ? '#20B657' : pageColors.body,
                        fontSize: 14,
                        fontWeight: '800',
                      }}
                    >
                      {item.amount > 0 ? '+' : ''}
                      {money(item.amount)}
                    </Label>
                    <Label style={{ color: pageColors.muted, fontSize: 9, marginTop: 2 }}>
                      {item.accountName}
                    </Label>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={pageColors.muted} />
                </View>
              </Pressable>
            ))}
            {!transactions.data?.items.length ? (
              <View style={{ padding: 20, alignItems: 'center', gap: 7 }}>
                <Ionicons name="search-outline" size={22} color={pageColors.muted} />
                <Label style={{ color: pageColors.secondary }}>Aucune transaction trouvée.</Label>
              </View>
            ) : null}
          </View>
          {error && (!connections.data?.length || !accounts.data?.length) ? (
            <State
              error={error as Error}
              retry={() => {
                void retryAll();
              }}
            />
          ) : null}
        </Page>
      </View>

      {filtersOpen ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            backgroundColor: '#000000B8',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              maxHeight: '88%',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 18,
              paddingBottom: 28,
              backgroundColor: pageColors.background,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Label style={{ flex: 1, color: pageColors.text, fontSize: 21, fontWeight: '900' }}>
                Filtrer les finances
              </Label>
              <Pressable
                accessibilityLabel="Fermer les filtres"
                onPress={() => setFiltersOpen(false)}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={24} color={pageColors.text} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ gap: 15, paddingBottom: 78 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <MonthField label="Date de début" value={fromMonth} onChange={setFromMonth} />
                <MonthField label="Date de fin" value={toMonth} onChange={setToMonth} />
              </View>
              <ChoiceRow
                title="Banques"
                options={bankChoices}
                value={connectionId}
                onChange={(value) => {
                  setConnectionId(value);
                  setAccountId('all');
                }}
              />
              <ChoiceRow
                title="Comptes"
                options={accountChoices}
                value={accountId}
                onChange={setAccountId}
              />
              <View style={{ gap: 7 }}>
                <Label style={{ color: pageColors.muted, fontSize: 11 }}>Catégories</Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {[{ id: 'all', label: 'Toutes' }, ...categories].map((item) => (
                    <Chip
                      key={item.id}
                      label={item.label}
                      selected={category === item.id}
                      onPress={() => setCategory(item.id)}
                    />
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 7 }}>
                <Chip label="Toutes" selected={kind === 'all'} onPress={() => setKind('all')} />
                <Chip
                  label="Revenus"
                  selected={kind === 'income'}
                  onPress={() => setKind('income')}
                />
                <Chip
                  label="Dépenses"
                  selected={kind === 'expense'}
                  onPress={() => setKind('expense')}
                />
              </View>
              <Pressable
                onPress={() => setExcludeInternalTransfers((value) => !value)}
                style={{
                  minHeight: 48,
                  borderRadius: 15,
                  paddingHorizontal: 13,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: pageColors.surface,
                  borderWidth: 1,
                  borderColor: pageColors.separator,
                }}
              >
                <Ionicons
                  name={excludeInternalTransfers ? 'checkmark-circle' : 'ellipse-outline'}
                  size={21}
                  color={excludeInternalTransfers ? normalizedAccent : pageColors.muted}
                />
                <Label style={{ flex: 1, marginLeft: 9, color: pageColors.body, fontSize: 12 }}>
                  Exclure les virements internes des calculs
                </Label>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                <Pressable
                  onPress={resetFilters}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 40,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: pageColors.separator,
                    backgroundColor: pageColors.surface,
                    opacity: pressed ? 0.68 : 1,
                  })}
                >
                  <Label style={{ color: pageColors.secondary, fontSize: 12, fontWeight: '700' }}>
                    Réinitialiser
                  </Label>
                </Pressable>
                <Pressable
                  onPress={() => setFiltersOpen(false)}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 40,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: normalizedAccent,
                    opacity: pressed ? 0.68 : 1,
                  })}
                >
                  <Label style={{ color: accentForeground, fontSize: 12, fontWeight: '800' }}>
                    Afficher les résultats
                  </Label>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}

      {analysisOpen ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            backgroundColor: '#000000B8',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              maxHeight: '86%',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 18,
              paddingBottom: 28,
              backgroundColor: pageColors.background,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Label style={{ flex: 1, color: pageColors.text, fontSize: 21, fontWeight: '900' }}>
                Analyse du mois
              </Label>
              <Pressable
                accessibilityLabel="Fermer l’analyse"
                onPress={() => setAnalysisOpen(false)}
                style={{ width: 40, alignItems: 'center' }}
              >
                <Ionicons name="close" size={24} color={pageColors.text} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ gap: 12, paddingBottom: 78 }}
              showsVerticalScrollIndicator={false}
            >
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Label muted style={{ fontSize: 11 }}>
                      Dépenses fixes
                    </Label>
                    <Label style={{ fontSize: 18, fontWeight: '900' }}>
                      {money(data.fixedExpense)}
                    </Label>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label muted style={{ fontSize: 11 }}>
                      Dépenses variables
                    </Label>
                    <Label style={{ fontSize: 18, fontWeight: '900' }}>
                      {money(data.variableExpense)}
                    </Label>
                  </View>
                </View>
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: pageColors.separator,
                    paddingTop: 11,
                  }}
                >
                  <Label style={{ color: pageColors.body, fontWeight: '800' }}>
                    {data.forecast.available
                      ? `Projection : ${money(data.forecast.projected)}`
                      : 'Prévision indisponible'}
                  </Label>
                  <Label style={{ color: pageColors.secondary, fontSize: 11, marginTop: 3 }}>
                    {data.forecast.available
                      ? data.forecast.isOverrun
                        ? `Risque de dépassement de ${money(data.forecast.overrunAmount)}`
                        : `Rythme compatible avec votre plafond · ${data.forecast.remainingDays} jours restants`
                      : 'Définissez au moins un budget pour activer la prévision.'}
                  </Label>
                </View>
              </Card>
              {data.cashflow.map((row) => {
                const max = Math.max(row.expense, row.planned, 1);
                return (
                  <Card key={row.month} style={{ gap: 7 }}>
                    <View style={{ flexDirection: 'row' }}>
                      <Label style={{ flex: 1, fontWeight: '800' }}>{monthLabel(row.month)}</Label>
                      <Label style={{ color: row.delta > 0 ? '#E86D67' : '#20B657', fontSize: 11 }}>
                        Écart {money(row.delta)}
                      </Label>
                    </View>
                    <Label muted style={{ fontSize: 11 }}>
                      Prévu {money(row.planned)} · Réel {money(row.expense)} · Net {money(row.net)}
                    </Label>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: pageColors.separator,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          width: `${Math.min((row.expense / max) * 100, 100)}%`,
                          backgroundColor: row.delta > 0 ? '#E86D67' : normalizedAccent,
                        }}
                      />
                    </View>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {budgetsOpen ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            backgroundColor: '#000000B8',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              maxHeight: '90%',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 18,
              paddingBottom: 28,
              backgroundColor: pageColors.background,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Label style={{ color: pageColors.text, fontSize: 21, fontWeight: '900' }}>
                  Budgets
                </Label>
                <Label style={{ color: pageColors.secondary, fontSize: 11 }}>
                  Plafonds mensuels par catégorie
                </Label>
              </View>
              <Pressable
                accessibilityLabel="Fermer les budgets"
                onPress={() => setBudgetsOpen(false)}
                style={{ width: 40, alignItems: 'center' }}
              >
                <Ionicons name="close" size={24} color={pageColors.text} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ gap: 8, paddingBottom: 78 }}
              showsVerticalScrollIndicator={false}
            >
              {!creatingBudget ? (
                <Pressable
                  disabled={availableBudgetCategories.length === 0}
                  onPress={() => {
                    const first = availableBudgetCategories[0];
                    if (!first) return;
                    setNewBudgetCategory(first.id);
                    setNewBudgetType(first.type);
                    setCreatingBudget(true);
                  }}
                  style={({ pressed }) => ({
                    height: 42,
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    backgroundColor: normalizedAccent,
                    opacity: availableBudgetCategories.length === 0 ? 0.45 : pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="add" size={18} color={accentForeground} />
                  <Label style={{ color: accentForeground, fontSize: 12, fontWeight: '900' }}>
                    Créer un budget
                  </Label>
                </Pressable>
              ) : null}

              {creatingBudget ? (
                <Card style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Label style={{ fontSize: 15, fontWeight: '900' }}>Nouveau budget</Label>
                      <Label muted style={{ fontSize: 10 }}>
                        Choisissez ce que vous souhaitez plafonner.
                      </Label>
                    </View>
                    <Pressable
                      accessibilityLabel="Annuler la création du budget"
                      onPress={() => setCreatingBudget(false)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close" size={20} color={pageColors.muted} />
                    </Pressable>
                  </View>
                  <View style={{ gap: 7 }}>
                    <Label muted style={{ fontSize: 11 }}>
                      Catégorie
                    </Label>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {availableBudgetCategories.map((item) => (
                        <Chip
                          key={item.id}
                          label={item.label}
                          selected={newBudgetCategory === item.id}
                          onPress={() => {
                            setNewBudgetCategory(item.id);
                            setNewBudgetType(item.type);
                            if (item.id !== 'other') setNewBudgetName('');
                          }}
                        />
                      ))}
                    </View>
                  </View>
                  {newBudgetCategory === 'other' ? (
                    <TextInput
                      accessibilityLabel="Intitulé personnalisé du budget"
                      value={newBudgetName}
                      maxLength={60}
                      onChangeText={setNewBudgetName}
                      placeholder="Intitulé personnalisé (facultatif)"
                      placeholderTextColor={pageColors.muted}
                      style={{
                        minHeight: 44,
                        borderRadius: 13,
                        borderWidth: 1,
                        borderColor: pageColors.separator,
                        backgroundColor: pageColors.elevated,
                        color: pageColors.text,
                        paddingHorizontal: 12,
                        fontWeight: '700',
                      }}
                    />
                  ) : null}
                  <TextInput
                    accessibilityLabel="Montant mensuel du budget"
                    value={newBudgetValue}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => setNewBudgetValue(numeric(value))}
                    placeholder="Montant mensuel en €"
                    placeholderTextColor={pageColors.muted}
                    style={{
                      minHeight: 44,
                      borderRadius: 13,
                      borderWidth: 1,
                      borderColor: pageColors.separator,
                      backgroundColor: pageColors.elevated,
                      color: pageColors.text,
                      paddingHorizontal: 12,
                      fontWeight: '700',
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: 7 }}>
                    <Chip
                      label="Dépense fixe"
                      selected={newBudgetType === 'fixed'}
                      onPress={() => setNewBudgetType('fixed')}
                    />
                    <Chip
                      label="Dépense variable"
                      selected={newBudgetType === 'variable'}
                      onPress={() => setNewBudgetType('variable')}
                    />
                  </View>
                  <Pressable
                    disabled={
                      !newBudgetCategory ||
                      !Number.isFinite(Number(newBudgetValue)) ||
                      Number(newBudgetValue) <= 0 ||
                      saveBudget.isPending
                    }
                    onPress={() => {
                      const amount = Number(newBudgetValue);
                      if (newBudgetCategory && Number.isFinite(amount) && amount > 0)
                        saveBudget.mutate({
                          categoryId: newBudgetCategory,
                          amount,
                          type: newBudgetType,
                          displayName:
                            newBudgetCategory === 'other' ? newBudgetName.trim() || null : null,
                        });
                    }}
                    style={({ pressed }) => ({
                      height: 40,
                      borderRadius: 13,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: normalizedAccent,
                      opacity:
                        !newBudgetCategory || Number(newBudgetValue) <= 0 || saveBudget.isPending
                          ? 0.45
                          : pressed
                            ? 0.7
                            : 1,
                    })}
                  >
                    <Label style={{ color: accentForeground, fontSize: 12, fontWeight: '900' }}>
                      {saveBudget.isPending ? 'Création…' : 'Créer ce budget'}
                    </Label>
                  </Pressable>
                </Card>
              ) : null}

              {(budgets.data ?? []).length === 0 && !creatingBudget ? (
                <Card style={{ alignItems: 'center', gap: 7, paddingVertical: 24 }}>
                  <Ionicons name="wallet-outline" size={25} color={pageColors.muted} />
                  <Label style={{ fontWeight: '800' }}>Aucun budget créé</Label>
                  <Label muted style={{ maxWidth: 250, textAlign: 'center', fontSize: 11 }}>
                    Créez uniquement les budgets utiles à votre quotidien, par exemple Logement ou
                    Courses.
                  </Label>
                </Card>
              ) : null}

              {availableBudgetCategories.length === 0 && !creatingBudget ? (
                <Label muted style={{ textAlign: 'center', fontSize: 10 }}>
                  Toutes les catégories disposent déjà d’un budget.
                </Label>
              ) : null}

              {(budgets.data ?? []).map((budget) => {
                const definition = categories.find((item) => item.id === budget.category) ?? {
                  id: budget.category,
                  label: budget.category,
                  type: budget.categoryType,
                };
                const summary = summaryMap.get(budget.category);
                const limit = summary?.periodLimit ?? budget.monthlyLimit;
                const spent = summary?.expense ?? 0;
                const progress = limit ? Math.min((spent / limit) * 100, 100) : 0;
                const status = summary?.status ?? 'unset';
                const type = budget.categoryType;
                const displayName = budget.displayName?.trim() || definition.label;
                return (
                  <Card key={budget.id} style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Label style={{ fontWeight: '800' }}>{displayName}</Label>
                        <Label muted style={{ fontSize: 10 }}>
                          {type === 'fixed' ? 'Fixe' : 'Variable'} · {money(spent)} dépensés
                        </Label>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable
                          accessibilityLabel={`Modifier le budget ${displayName}`}
                          onPress={() =>
                            setEditingBudget({
                              category: definition.id,
                              value: String(budget.monthlyLimit),
                              displayName: budget.displayName ?? '',
                            })
                          }
                        >
                          <Label
                            style={{ color: normalizedAccent, fontSize: 11, fontWeight: '800' }}
                          >
                            {money(budget.monthlyLimit)}
                          </Label>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Supprimer le budget ${displayName}`}
                          onPress={() => setDeletingBudget(definition.id)}
                          style={({ pressed }) => ({
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#E86D6718',
                            opacity: pressed ? 0.6 : 1,
                          })}
                        >
                          <Ionicons name="close" size={15} color="#E86D67" />
                        </Pressable>
                      </View>
                    </View>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: pageColors.separator,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          width: `${progress}%`,
                          backgroundColor:
                            status === 'exceeded'
                              ? '#E86D67'
                              : status === 'near'
                                ? '#E7A942'
                                : normalizedAccent,
                        }}
                      />
                    </View>
                    {editingBudget?.category === definition.id ? (
                      <View style={{ gap: 8 }}>
                        {definition.id === 'other' ? (
                          <TextInput
                            accessibilityLabel={`Intitulé du budget ${displayName}`}
                            value={editingBudget.displayName}
                            maxLength={60}
                            onChangeText={(value) =>
                              setEditingBudget({ ...editingBudget, displayName: value })
                            }
                            placeholder="Intitulé personnalisé (facultatif)"
                            placeholderTextColor={pageColors.muted}
                            style={{
                              minHeight: 42,
                              borderRadius: 12,
                              backgroundColor: pageColors.elevated,
                              color: pageColors.text,
                              paddingHorizontal: 11,
                            }}
                          />
                        ) : null}
                        <View style={{ flexDirection: 'row', gap: 7 }}>
                          <TextInput
                            autoFocus
                            value={editingBudget.value}
                            keyboardType="decimal-pad"
                            onChangeText={(value) =>
                              setEditingBudget({ ...editingBudget, value: numeric(value) })
                            }
                            placeholder="Budget mensuel"
                            placeholderTextColor={pageColors.muted}
                            style={{
                              flex: 1,
                              minHeight: 42,
                              borderRadius: 12,
                              backgroundColor: pageColors.elevated,
                              color: pageColors.text,
                              paddingHorizontal: 11,
                            }}
                          />
                          <Pressable
                            onPress={() => {
                              const amount = Number(editingBudget.value);
                              if (Number.isFinite(amount) && amount > 0)
                                saveBudget.mutate({
                                  categoryId: definition.id,
                                  amount,
                                  type,
                                  displayName:
                                    definition.id === 'other'
                                      ? editingBudget.displayName.trim() || null
                                      : null,
                                });
                            }}
                            style={{
                              minWidth: 52,
                              borderRadius: 12,
                              backgroundColor: normalizedAccent,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Label style={{ color: accentForeground, fontWeight: '900' }}>OK</Label>
                          </Pressable>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 7 }}>
                          <Chip
                            label="Fixe"
                            selected={type === 'fixed'}
                            onPress={() =>
                              saveBudget.mutate({
                                categoryId: definition.id,
                                amount: budget.monthlyLimit,
                                type: 'fixed',
                                displayName: budget.displayName,
                              })
                            }
                          />
                          <Chip
                            label="Variable"
                            selected={type === 'variable'}
                            onPress={() =>
                              saveBudget.mutate({
                                categoryId: definition.id,
                                amount: budget.monthlyLimit,
                                type: 'variable',
                                displayName: budget.displayName,
                              })
                            }
                          />
                        </View>
                      </View>
                    ) : null}
                    {deletingBudget === definition.id ? (
                      <View
                        style={{
                          borderTopWidth: 1,
                          borderTopColor: pageColors.separator,
                          paddingTop: 9,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Label muted style={{ flex: 1, fontSize: 11 }}>
                          Supprimer ce budget ?
                        </Label>
                        <Pressable
                          onPress={() => setDeletingBudget(null)}
                          style={{ paddingHorizontal: 8, paddingVertical: 7 }}
                        >
                          <Label muted style={{ fontSize: 11, fontWeight: '700' }}>
                            Annuler
                          </Label>
                        </Pressable>
                        <Pressable
                          disabled={removeBudget.isPending}
                          onPress={() => removeBudget.mutate(definition.id)}
                          style={({ pressed }) => ({
                            borderRadius: 10,
                            backgroundColor: '#E86D67',
                            paddingHorizontal: 11,
                            paddingVertical: 7,
                            opacity: pressed || removeBudget.isPending ? 0.65 : 1,
                          })}
                        >
                          <Label style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                            Supprimer
                          </Label>
                        </Pressable>
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {editingItem ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            backgroundColor: '#000000B8',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 18,
              paddingBottom: 102,
              backgroundColor: pageColors.background,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 13 }}>
              <View style={{ flex: 1 }}>
                <Label style={{ color: pageColors.text, fontSize: 20, fontWeight: '900' }}>
                  {editingItem?.merchantName}
                </Label>
                <Label style={{ color: pageColors.secondary, fontSize: 11 }}>
                  Modifier la catégorie
                </Label>
              </View>
              <Pressable
                accessibilityLabel="Fermer les catégories"
                onPress={() => setEditingTransaction(null)}
                style={{ width: 40, alignItems: 'center' }}
              >
                <Ionicons name="close" size={24} color={pageColors.text} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 7 }}>
                {categories.map((entry) => (
                  <Chip
                    key={entry.id}
                    label={entry.label}
                    selected={editingItem?.category === entry.id}
                    onPress={() =>
                      editingItem &&
                      saveCategory.mutate({ id: editingItem.id, categoryId: entry.id })
                    }
                  />
                ))}
              </View>
            </ScrollView>
            {editingItem?.isCustomCategory ? (
              <Pressable
                onPress={() => resetCategory.mutate(editingItem.id)}
                style={{ marginTop: 14 }}
              >
                <Label style={{ color: normalizedAccent, fontSize: 12, fontWeight: '700' }}>
                  Revenir à la catégorie automatique
                </Label>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ScreenWithTabs>
  );
}
