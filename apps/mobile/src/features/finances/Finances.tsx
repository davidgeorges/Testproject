import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBankAccounts, useBankConnections } from '../../design/reference';
import { Card, Label, Page, Search, Section, State, useColors } from '../../design/ui';
import { ScreenWithTabs } from '../../design/MainScreens';
import { api } from '../../services/api';
import { useLiveToken } from '../../store/session';
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
const monthChoices = () => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, index) => {
    const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const id = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
    return { id, label: monthLabel(id) };
  });
};
const numeric = (value: string) => value.replace(',', '.').replace(/[^0-9.]/gu, '');

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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
        backgroundColor: selected ? '#5F7285' : '#2B3542',
        borderWidth: selected ? 1 : 0,
        borderColor: '#8CB7DF',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Label style={{ color: selected ? '#F0F7FF' : '#B5C3D1', fontSize: 11 }}>{label}</Label>
    </Pressable>
  );
}

function ChoiceRow({ title, options, value, onChange }: { title: string; options: Choice[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Label style={{ color: '#94A8BB', fontSize: 11 }}>{title}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {options.map((option) => <Chip key={option.id} label={option.label} selected={option.id === value} onPress={() => onChange(option.id)} />)}
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, minHeight: 82, borderRadius: 14, backgroundColor: '#1B2735', padding: 11, justifyContent: 'space-between' }}>
      <Label style={{ color: '#9EB0C2', fontSize: 11 }}>{title}</Label>
      <Label style={{ color, fontSize: 16, fontWeight: '800' }}>{value}</Label>
    </View>
  );
}

export function FinancesScreen() {
  const token = useLiveToken();
  const colors = useColors();
  const queryClient = useQueryClient();
  const months = useMemo(monthChoices, []);
  const [fromMonth, setFromMonth] = useState(currentMonth());
  const [toMonth, setToMonth] = useState(currentMonth());
  const [kind, setKind] = useState<KindFilter>('all');
  const [connectionId, setConnectionId] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [excludeInternalTransfers, setExcludeInternalTransfers] = useState(true);
  const [editingBudget, setEditingBudget] = useState<{ category: string; value: string } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);

  const orderedMonths = fromMonth <= toMonth ? [fromMonth, toMonth] : [toMonth, fromMonth];
  const filters = useMemo<FinanceFilters>(() => ({
    from: monthStart(orderedMonths[0]!),
    to: monthEnd(orderedMonths[1]!),
    connectionId: connectionId === 'all' ? undefined : connectionId,
    accountId: accountId === 'all' ? undefined : accountId,
    category: category === 'all' ? undefined : category,
    kind: kind === 'all' ? undefined : kind,
    search: search.trim() || undefined,
    excludeInternalTransfers,
  }), [accountId, category, connectionId, excludeInternalTransfers, fromMonth, kind, search, toMonth]);

  const connections = useBankConnections();
  const accounts = useBankAccounts();
  const overview = useQuery({ queryKey: ['finance-overview', token, filters], queryFn: () => api.financeOverview(filters), enabled: Boolean(token) });
  const transactions = useQuery({ queryKey: ['finance-transactions', token, filters], queryFn: () => api.financeTransactions(filters), enabled: Boolean(token) });
  const budgets = useQuery({ queryKey: ['finance-budgets', token], queryFn: api.financeBudgets, enabled: Boolean(token) });

  const refreshFinance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] }),
    ]);
  };
  const saveBudget = useMutation({
    mutationFn: ({ categoryId, amount, type }: { categoryId: string; amount: number; type: FinanceCategoryType }) => api.saveFinanceBudget(categoryId, amount, type),
    onSuccess: async () => { setEditingBudget(null); await refreshFinance(); },
    onError: (error: Error) => Alert.alert('Budget', error.message),
  });
  const removeBudget = useMutation({ mutationFn: api.deleteFinanceBudget, onSuccess: refreshFinance, onError: (error: Error) => Alert.alert('Budget', error.message) });
  const saveCategory = useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) => api.saveTransactionCategory(id, categoryId),
    onSuccess: async () => { setEditingTransaction(null); await refreshFinance(); },
    onError: (error: Error) => Alert.alert('Catégorie', error.message),
  });
  const resetCategory = useMutation({
    mutationFn: api.deleteTransactionCategory,
    onSuccess: async () => { setEditingTransaction(null); await refreshFinance(); },
    onError: (error: Error) => Alert.alert('Catégorie', error.message),
  });

  const bankChoices = useMemo<Choice[]>(() => [{ id: 'all', label: 'Toutes les banques' }, ...(connections.data ?? []).map((item) => ({ id: item.id, label: item.bankName }))], [connections.data]);
  const accountChoices = useMemo<Choice[]>(() => [{ id: 'all', label: 'Tous les comptes' }, ...(accounts.data ?? []).filter((item) => connectionId === 'all' || item.connectionId === connectionId).map((item) => ({ id: item.id, label: item.maskedName || item.accountType }))], [accounts.data, connectionId]);
  const budgetMap = useMemo(() => new Map((budgets.data ?? []).map((item) => [item.category, item])), [budgets.data]);
  const summaryMap = useMemo(() => new Map((overview.data?.categories ?? []).map((item) => [item.category, item])), [overview.data?.categories]);

  const exportCsv = async () => {
    try {
      const csv = await api.exportFinanceCsv(filters);
      if (csv.trim().split(/\r?\n/u).length <= 1) return Alert.alert('Export', 'Aucune transaction avec ces filtres.');
      await Share.share({ message: csv, title: `transactions-${fromMonth}-${toMonth}.csv` });
    } catch (error) {
      Alert.alert('Export', error instanceof Error ? error.message : 'L’export a échoué.');
    }
  };

  if (!token) return <ScreenWithTabs active="Finances"><Page><State error={new Error('Connectez-vous pour accéder à vos données financières réelles.')} /></Page></ScreenWithTabs>;
  if (overview.isPending || transactions.isPending || budgets.isPending) return <ScreenWithTabs active="Finances"><Page><State loading /></Page></ScreenWithTabs>;
  const error = overview.error || transactions.error || budgets.error || connections.error || accounts.error;
  if (error && !overview.data) return <ScreenWithTabs active="Finances"><Page><State error={error as Error} retry={() => { void refreshFinance(); }} /></Page></ScreenWithTabs>;

  const data = overview.data!;
  const period = fromMonth === toMonth ? monthLabel(fromMonth) : `${monthLabel(fromMonth)} → ${monthLabel(toMonth)}`;
  const alerts = data.categories.filter((item) => item.status === 'exceeded' || item.status === 'near');

  return (
    <ScreenWithTabs active="Finances">
      <Page>
        <View style={{ gap: 4 }}><Label style={{ color: '#F2F7FF', fontSize: 28, fontWeight: '800' }}>Finances</Label><Label style={{ color: '#91A6BA' }}>Données synchronisées de vos comptes connectés</Label></View>
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><ChoiceRow title="Du mois" options={months} value={fromMonth} onChange={setFromMonth} /></View><View style={{ flex: 1 }}><ChoiceRow title="Au mois" options={months} value={toMonth} onChange={setToMonth} /></View></View>
          <ChoiceRow title="Banques" options={bankChoices} value={connectionId} onChange={(value) => { setConnectionId(value); setAccountId('all'); }} />
          <ChoiceRow title="Comptes" options={accountChoices} value={accountId} onChange={setAccountId} />
          <ChoiceRow title="Catégories" options={[{ id: 'all', label: 'Toutes' }, ...categories]} value={category} onChange={setCategory} />
          <Search value={search} onChangeText={setSearch} placeholder="Commerçant, libellé banque, compte…" />
          <View style={{ flexDirection: 'row', gap: 7 }}><Chip label="Toutes" selected={kind === 'all'} onPress={() => setKind('all')} /><Chip label="Revenus" selected={kind === 'income'} onPress={() => setKind('income')} /><Chip label="Dépenses" selected={kind === 'expense'} onPress={() => setKind('expense')} /></View>
          <Pressable onPress={() => setExcludeInternalTransfers((value) => !value)} style={{ minHeight: 36, borderRadius: 12, backgroundColor: '#2C3C4C', justifyContent: 'center', paddingHorizontal: 12 }}><Label style={{ color: '#D9E7F4', fontSize: 11 }}>{excludeInternalTransfers ? '✓ Virements internes exclus des calculs' : 'Virements internes inclus dans les calculs'}</Label></Pressable>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}><Metric title="Revenus" value={money(data.income)} color="#4DE3A8" /><Metric title="Dépenses" value={money(data.expense)} color="#FFAA78" /><Metric title="Solde" value={money(data.net)} color="#8CCBFF" /></View>
        {alerts.length ? <Card style={{ borderColor: '#8D6544', gap: 7 }}><Label style={{ color: '#FFC182', fontWeight: '800' }}>Alertes budget</Label>{alerts.map((item) => <Label key={item.category} style={{ color: item.status === 'exceeded' ? '#FF9A91' : '#FFD28A', fontSize: 12 }}>{item.status === 'exceeded' ? 'Dépassement' : 'Seuil de 85 % atteint'} · {item.label}{item.remaining !== null && item.remaining < 0 ? ` de ${money(Math.abs(item.remaining))}` : ''}</Label>)}</Card> : null}

        <Section title={`Cashflow · ${period}`} />
        <Card style={{ gap: 11 }}>
          {data.cashflow.map((row) => { const max = Math.max(row.expense, row.planned, 1); return <View key={row.month} style={{ gap: 5 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Label style={{ fontWeight: '700' }}>{monthLabel(row.month)}</Label><Label style={{ color: row.delta > 0 ? '#FF928A' : '#79DFAE', fontSize: 11 }}>Écart {money(row.delta)}</Label></View><Label style={{ color: '#93A6B7', fontSize: 11 }}>Prévu {money(row.planned)} · Réel {money(row.expense)} · Net {money(row.net)}</Label><View style={{ height: 7, borderRadius: 5, backgroundColor: '#293746', overflow: 'hidden' }}><View style={{ height: 7, width: `${Math.min(row.expense / max * 100, 100)}%`, backgroundColor: row.delta > 0 ? '#F47F76' : '#59D29B' }} /></View></View>; })}
        </Card>

        <Section title="Prévision et structure des dépenses" />
        <Card style={{ gap: 9 }}>
          <View style={{ flexDirection: 'row', gap: 14 }}><View style={{ flex: 1 }}><Label style={{ color: '#9CAFC1', fontSize: 11 }}>Fixes</Label><Label style={{ fontWeight: '800' }}>{money(data.fixedExpense)}</Label></View><View style={{ flex: 1 }}><Label style={{ color: '#9CAFC1', fontSize: 11 }}>Variables</Label><Label style={{ fontWeight: '800' }}>{money(data.variableExpense)}</Label></View></View>
          {data.forecast.available ? <View style={{ borderTopWidth: 1, borderTopColor: '#2D3C4B', paddingTop: 9 }}><Label style={{ color: data.forecast.isOverrun ? '#FF988D' : '#7DDFAD', fontWeight: '700' }}>Projection : {money(data.forecast.projected)} sur {money(data.forecast.planned)}</Label><Label style={{ color: '#92A6B9', fontSize: 11, marginTop: 3 }}>{data.forecast.isOverrun ? `Risque de dépassement de ${money(data.forecast.overrunAmount)}` : 'Rythme compatible avec votre plafond'} · {data.forecast.remainingDays} jours restants</Label></View> : <Label style={{ color: '#92A6B9', fontSize: 11 }}>Ajoutez au moins un budget pour activer la prévision mensuelle.</Label>}
        </Card>

        <Section title="Budgets par catégorie" />
        <View style={{ gap: 8 }}>
          {categories.map((definition) => {
            const budget = budgetMap.get(definition.id); const summary = summaryMap.get(definition.id); const limit = summary?.periodLimit ?? budget?.monthlyLimit ?? null; const spent = summary?.expense ?? 0; const progress = limit ? Math.min(spent / limit * 100, 100) : 0; const status = summary?.status ?? 'unset'; const type = budget?.categoryType ?? definition.type;
            return <Card key={definition.id} style={{ gap: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Label style={{ fontWeight: '800' }}>{definition.label}</Label><Label style={{ color: '#8FA3B7', fontSize: 10 }}>{type === 'fixed' ? 'Dépense fixe' : 'Dépense variable'}</Label></View><Pressable onPress={() => setEditingBudget({ category: definition.id, value: budget ? String(budget.monthlyLimit) : '' })}><Label style={{ color: '#83C8FF', fontSize: 11 }}>{budget ? 'Modifier' : 'Définir'}</Label></Pressable></View><View style={{ height: 7, borderRadius: 5, backgroundColor: '#293746', overflow: 'hidden' }}><View style={{ height: 7, width: `${progress}%`, backgroundColor: status === 'exceeded' ? '#F47470' : status === 'near' ? '#EDB55B' : '#54D39A' }} /></View><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Label style={{ color: '#9BADBE', fontSize: 11 }}>Dépensé {money(spent)}</Label><Label style={{ color: '#D8E5F2', fontSize: 11 }}>{limit ? `Plafond ${money(limit)}` : 'Sans plafond'}</Label></View>
              {editingBudget?.category === definition.id ? <View style={{ gap: 7 }}><View style={{ flexDirection: 'row', gap: 7 }}><TextInput autoFocus value={editingBudget.value} keyboardType="decimal-pad" onChangeText={(value) => setEditingBudget({ category: definition.id, value: numeric(value) })} placeholder="Budget mensuel" placeholderTextColor="#6F8397" style={{ flex: 1, minHeight: 38, borderRadius: 11, backgroundColor: '#192533', color: '#F2F7FF', paddingHorizontal: 10 }} /><Pressable onPress={() => { const amount = Number(editingBudget.value); if (Number.isFinite(amount) && amount > 0) saveBudget.mutate({ categoryId: definition.id, amount, type }); }} style={{ minWidth: 48, borderRadius: 11, backgroundColor: '#3A5268', alignItems: 'center', justifyContent: 'center' }}><Label>OK</Label></Pressable></View><View style={{ flexDirection: 'row', gap: 7 }}><Chip label="Fixe" selected={type === 'fixed'} onPress={() => budget && saveBudget.mutate({ categoryId: definition.id, amount: budget.monthlyLimit, type: 'fixed' })} /><Chip label="Variable" selected={type === 'variable'} onPress={() => budget && saveBudget.mutate({ categoryId: definition.id, amount: budget.monthlyLimit, type: 'variable' })} />{budget ? <Pressable onPress={() => removeBudget.mutate(definition.id)} style={{ justifyContent: 'center', paddingHorizontal: 7 }}><Label style={{ color: '#FF9A91', fontSize: 11 }}>Supprimer</Label></Pressable> : null}</View></View> : null}
            </Card>;
          })}
        </View>

        <Section title={`Transactions · ${transactions.data?.total ?? 0}`} action="Exporter" onPress={() => { void exportCsv(); }} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {(transactions.data?.items ?? []).map((item, index) => <View key={item.id} style={{ borderBottomWidth: index === (transactions.data?.items.length ?? 0) - 1 ? 0 : 1, borderBottomColor: '#2D3B47' }}><View style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#293A49', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.amount >= 0 ? 'trending-up-outline' : 'trending-down-outline'} size={17} color={item.amount >= 0 ? '#4DE3A8' : '#F0B078'} /></View><View style={{ flex: 1 }}><Label style={{ fontWeight: '800' }}>{item.merchantName || 'Transaction'}</Label><Label style={{ color: '#92A6B8', fontSize: 11 }}>{date(item.bookedAt)} · {item.categoryLabel}{item.isCustomCategory ? ' · personnalisée' : ''}</Label><Label style={{ color: '#71879B', fontSize: 10 }}>{item.bankName} · {item.accountName}{item.isInternalTransfer ? ' · virement interne' : ''}</Label></View><View style={{ alignItems: 'flex-end', gap: 5 }}><Label style={{ color: item.amount >= 0 ? '#4DE3A8' : colors.text, fontWeight: '800' }}>{item.amount > 0 ? '+' : ''}{money(item.amount)}</Label><Pressable onPress={() => setEditingTransaction(editingTransaction === item.id ? null : item.id)} style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#2B3C4D', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="swap-horizontal" size={14} color="#DCE9F5" /></Pressable></View></View>{editingTransaction === item.id ? <View style={{ paddingHorizontal: 11, paddingBottom: 11, gap: 7 }}><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 7 }}>{categories.map((entry) => <Chip key={entry.id} label={entry.label} selected={item.category === entry.id} onPress={() => saveCategory.mutate({ id: item.id, categoryId: entry.id })} />)}</View></ScrollView>{item.isCustomCategory ? <Pressable onPress={() => resetCategory.mutate(item.id)}><Label style={{ color: '#8CCBFF', fontSize: 11 }}>Revenir à la catégorie automatique</Label></Pressable> : null}</View> : null}</View>)}
          {!transactions.data?.items.length ? <View style={{ padding: 20, alignItems: 'center', gap: 7 }}><Ionicons name="search-outline" size={22} color="#8498AC" /><Label style={{ color: '#96A8BA' }}>Aucune transaction trouvée.</Label></View> : null}
        </Card>
        {error ? <State error={error as Error} retry={() => { void refreshFinance(); }} /> : null}
      </Page>
    </ScreenWithTabs>
  );
}
