import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, Switch, TextInput, View } from 'react-native';
import { api } from '../../services/api';
import { useSession } from '../../store/session';
import { DEFAULT_ACCENT_COLOR, accentTextColor, normalizeAccentColor } from '../../theme/accent';
import type {
  HouseholdBudget,
  HouseholdBankTransaction,
  HouseholdContract,
  HouseholdExpense,
  HouseholdMember,
  HouseholdResidence,
  HouseholdVehicle,
  HouseholdWorkspace,
} from '../../types/api';
import { Card, Label, Page, State, useColors } from '../../design/ui';

type Section = 'members' | 'budgets' | 'expenses' | 'homes' | 'vehicles' | 'contracts';
type Editor = Section | 'join' | 'bank' | 'rename' | null;
type Editable =
  | HouseholdMember
  | HouseholdBudget
  | HouseholdResidence
  | HouseholdVehicle
  | HouseholdContract
  | HouseholdExpense
  | null;

const sections: Array<[Section, string, React.ComponentProps<typeof Ionicons>['name']]> = [
  ['members', 'Membres', 'people-outline'],
  ['budgets', 'Budgets', 'wallet-outline'],
  ['expenses', 'Dépenses', 'receipt-outline'],
  ['homes', 'Logements', 'home-outline'],
  ['vehicles', 'Véhicules', 'car-outline'],
  ['contracts', 'Contrats', 'document-text-outline'],
];
const relations = [
  ['partner', 'Conjoint(e)'],
  ['child', 'Enfant'],
  ['parent', 'Parent'],
  ['relative', 'Proche'],
  ['other', 'Autre'],
] as const;
const uid = () => {
  const h = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`;
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'La demande a échoué.';

function AddButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const accent = normalizeAccentColor(useSession((s) => s.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        backgroundColor: accent,
        opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
      })}
    >
      <Ionicons name="add" size={19} color={accentTextColor(accent)} />
      <Label style={{ color: accentTextColor(accent), fontWeight: '800' }}>{label}</Label>
    </Pressable>
  );
}

function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  text: string;
}) {
  const c = useColors();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 6 }}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 17,
          backgroundColor: c.elevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={22} color={c.muted} />
      </View>
      <Label style={{ fontWeight: '800' }}>{title}</Label>
      <Label muted style={{ textAlign: 'center' }}>
        {text}
      </Label>
    </Card>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  onDelete,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress?: () => void;
  onDelete?: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 15,
            backgroundColor: c.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={20} color={c.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Label style={{ fontWeight: '800' }}>{title}</Label>
          <Label muted style={{ fontSize: 12 }}>
            {subtitle}
          </Label>
        </View>
        {onDelete ? (
          <Pressable
            accessibilityLabel={`Supprimer ${title}`}
            onPress={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            style={{ padding: 7 }}
          >
            <Ionicons name="close" size={18} color={c.muted} />
          </Pressable>
        ) : null}
        <Ionicons name="chevron-forward" size={17} color={c.muted} />
      </Card>
    </Pressable>
  );
}

export function HouseholdScreen() {
  const c = useColors();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('members');
  const [editor, setEditor] = useState<Editor>(null);
  const [editing, setEditing] = useState<Editable>(null);
  const household = useQuery({ queryKey: ['household'], queryFn: api.household });
  const month = new Date().toISOString().slice(0, 7);
  const bankTransactions = useQuery({
    queryKey: ['household-bank-transactions', month],
    queryFn: () => api.householdBankTransactions(month),
    enabled: editor === 'bank',
  });
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['household'] });
  const remove = useMutation({
    mutationFn: async ({ kind, id }: { kind: Section; id: string }) => {
      if (kind === 'members') return api.deleteHouseholdMember(id);
      if (kind === 'budgets') return api.deleteHouseholdBudget(id);
      if (kind === 'expenses') return api.deleteHouseholdExpense(id);
      if (kind === 'homes') return api.deleteHouseholdResidence(id);
      if (kind === 'vehicles') return api.deleteHouseholdVehicle(id);
      return api.deleteHouseholdContract(id);
    },
    onSuccess: refresh,
    onError: (error) => Alert.alert('Suppression impossible', message(error)),
  });
  const confirmDelete = (kind: Section, id: string, label: string) =>
    Alert.alert(
      `Supprimer ${label} ?`,
      'Les associations avec cet élément seront également retirées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate({ kind, id }) },
      ],
    );
  const open = (kind: Editor, value: Editable = null) => {
    setEditing(value);
    setEditor(kind);
  };
  const data = household.data;
  const expenses = data?.expenses ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Page style={{ paddingTop: 18, paddingBottom: 40 }}>
        <View>
          <Label style={{ fontSize: 30, lineHeight: 36, fontWeight: '900' }}>Votre foyer</Label>
          <Label muted>Organisez ce qui concerne toute la famille</Label>
        </View>
        {household.isPending || household.error || !data ? (
          <State
            loading={household.isPending}
            error={household.error}
            retry={() => household.refetch()}
          />
        ) : (
          <>
            <Card style={{ padding: 18, gap: 13 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Label muted style={{ fontSize: 12, fontWeight: '700' }}>
                    MON FOYER
                  </Label>
                  <Pressable disabled={!data.canManageMembers} onPress={() => open('rename')}>
                    <Label style={{ fontSize: 22, lineHeight: 28, fontWeight: '900' }}>
                      {data.name}
                    </Label>
                    {data.canManageMembers ? (
                      <Label muted style={{ fontSize: 11 }}>
                        Toucher pour renommer
                      </Label>
                    ) : null}
                  </Pressable>
                </View>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 18,
                    backgroundColor: c.elevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="people" size={24} color={c.text} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  [data.members.length, 'membres'],
                  [data.budgets.length, 'budgets'],
                  [data.contracts.length, 'contrats'],
                ].map(([number, label]) => (
                  <View
                    key={label}
                    style={{ flex: 1, backgroundColor: c.elevated, padding: 10, borderRadius: 14 }}
                  >
                    <Label style={{ fontWeight: '900' }}>{number}</Label>
                    <Label muted style={{ fontSize: 11 }}>
                      {label}
                    </Label>
                  </View>
                ))}
              </View>
            </Card>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ width: '100%', flexGrow: 0 }}
              contentContainerStyle={{ gap: 8, paddingRight: 20 }}
            >
              {sections.map(([id, label, icon]) => (
                <Pressable
                  key={id}
                  onPress={() => setSection(id)}
                  style={{
                    height: 38,
                    borderRadius: 19,
                    paddingHorizontal: 13,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: section === id ? c.text : c.surface,
                    borderWidth: 1,
                    borderColor: section === id ? c.text : c.border,
                  }}
                >
                  <Ionicons name={icon} size={15} color={section === id ? c.background : c.muted} />
                  <Label
                    style={{
                      color: section === id ? c.background : c.text,
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {label}
                  </Label>
                </Pressable>
              ))}
            </ScrollView>
            {section === 'members' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Label style={{ flex: 1, fontSize: 19, fontWeight: '900' }}>Membres</Label>
                  {data.canManageMembers ? (
                    <Pressable onPress={() => open('join')}>
                      <Label muted style={{ fontWeight: '700' }}>
                        J’ai un code
                      </Label>
                    </Pressable>
                  ) : null}
                </View>
                {data.members.map((item) => (
                  <Row
                    key={item.id}
                    icon={
                      item.relationship === 'child'
                        ? 'happy-outline'
                        : item.relationship === 'self'
                          ? 'person-circle-outline'
                          : 'person-outline'
                    }
                    title={item.displayName}
                    subtitle={`${item.relationship === 'self' ? 'Moi' : (relations.find((x) => x[0] === item.relationship)?.[1] ?? 'Membre')} · ${item.accountStatus === 'managed' ? 'Sans compte' : item.accountStatus === 'invited' ? 'Invitation en attente' : 'Compte connecté'}`}
                    onPress={() =>
                      item.accountStatus !== 'owner' && data.canManageMembers
                        ? open('members', item)
                        : undefined
                    }
                    onDelete={
                      item.accountStatus !== 'owner' && data.canManageMembers
                        ? () => confirmDelete('members', item.id, item.displayName)
                        : undefined
                    }
                  />
                ))}
                <AddButton
                  label="Ajouter une personne"
                  disabled={!data.canManageMembers}
                  onPress={() => open('members')}
                />
                <Label muted style={{ fontSize: 12, textAlign: 'center' }}>
                  Un enfant ou un proche peut faire partie du foyer sans créer de compte.
                </Label>
              </>
            ) : null}
            {section === 'budgets' ? (
              <>
                <Label style={{ fontSize: 19, fontWeight: '900' }}>Budgets partagés</Label>
                {data.budgets.length ? (
                  data.budgets.map((item) => (
                    <Row
                      key={item.id}
                      icon="wallet-outline"
                      title={item.name}
                      subtitle={`${(item.spent ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} sur ${item.monthlyLimit.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} · ${Math.round(item.usagePercent ?? 0)} %`}
                      onPress={data.canManageBudgets ? () => open('budgets', item) : undefined}
                      onDelete={
                        data.canManageBudgets
                          ? () => confirmDelete('budgets', item.id, item.name)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <Empty
                    icon="wallet-outline"
                    title="Aucun budget partagé"
                    text="Créez par exemple un budget pour vos trois enfants, même s’ils n’ont pas de compte."
                  />
                )}
                <AddButton
                  label="Créer un budget partagé"
                  disabled={!data.canManageBudgets}
                  onPress={() => open('budgets')}
                />
              </>
            ) : null}
            {section === 'expenses' ? (
              <>
                <Label style={{ fontSize: 19, fontWeight: '900' }}>Dépenses du foyer</Label>
                {expenses.length ? (
                  expenses.map((item) => (
                    <Row
                      key={item.id}
                      icon={item.source === 'bank' ? 'card-outline' : 'create-outline'}
                      title={item.title}
                      subtitle={`${item.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} · ${new Date(`${item.occurredOn}T12:00:00`).toLocaleDateString('fr-FR')} · ${item.splits.length} ${item.splits.length === 1 ? 'personne' : 'personnes'}`}
                      onPress={() =>
                        item.source === 'manual' && data.canManageBudgets
                          ? open('expenses', item)
                          : undefined
                      }
                      onDelete={
                        data.canManageBudgets
                          ? () => confirmDelete('expenses', item.id, item.title)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <Empty
                    icon="receipt-outline"
                    title="Aucune dépense partagée"
                    text="Ajoutez une dépense ou affectez une opération bancaire réelle à votre foyer."
                  />
                )}
                <AddButton
                  label="Ajouter une dépense"
                  disabled={!data.canManageBudgets}
                  onPress={() => open('expenses')}
                />
                <AddButton
                  label="Affecter une opération bancaire"
                  disabled={!data.canManageBudgets}
                  onPress={() => open('bank')}
                />
              </>
            ) : null}
            {section === 'homes' ? (
              <>
                <Label style={{ fontSize: 19, fontWeight: '900' }}>Logements</Label>
                {data.residences.length ? (
                  data.residences.map((item) => (
                    <Row
                      key={item.id}
                      icon="home-outline"
                      title={item.name}
                      subtitle={
                        item.address ??
                        (item.kind === 'primary' ? 'Résidence principale' : 'Résidence secondaire')
                      }
                      onPress={data.canManageAssets ? () => open('homes', item) : undefined}
                      onDelete={
                        data.canManageAssets
                          ? () => confirmDelete('homes', item.id, item.name)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <Empty
                    icon="home-outline"
                    title="Aucun logement"
                    text="Ajoutez les logements liés à votre foyer et à ses contrats."
                  />
                )}
                <AddButton
                  label="Ajouter un logement"
                  disabled={!data.canManageAssets}
                  onPress={() => open('homes')}
                />
              </>
            ) : null}
            {section === 'vehicles' ? (
              <>
                <Label style={{ fontSize: 19, fontWeight: '900' }}>Véhicules</Label>
                {data.vehicles.length ? (
                  data.vehicles.map((item) => (
                    <Row
                      key={item.id}
                      icon="car-outline"
                      title={item.name}
                      subtitle={item.registration ?? 'Immatriculation non renseignée'}
                      onPress={data.canManageAssets ? () => open('vehicles', item) : undefined}
                      onDelete={
                        data.canManageAssets
                          ? () => confirmDelete('vehicles', item.id, item.name)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <Empty
                    icon="car-outline"
                    title="Aucun véhicule"
                    text="Ajoutez les véhicules du foyer pour regrouper leurs contrats."
                  />
                )}
                <AddButton
                  label="Ajouter un véhicule"
                  disabled={!data.canManageAssets}
                  onPress={() => open('vehicles')}
                />
              </>
            ) : null}
            {section === 'contracts' ? (
              <>
                <Label style={{ fontSize: 19, fontWeight: '900' }}>Contrats du foyer</Label>
                {data.contracts.length ? (
                  data.contracts.map((item) => (
                    <Row
                      key={item.id}
                      icon="document-text-outline"
                      title={item.name}
                      subtitle={`${item.provider ?? item.category}${item.monthlyAmount != null ? ` · ${item.monthlyAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}/mois` : ''}`}
                      onPress={data.canManageContracts ? () => open('contracts', item) : undefined}
                      onDelete={
                        data.canManageContracts
                          ? () => confirmDelete('contracts', item.id, item.name)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <Empty
                    icon="document-text-outline"
                    title="Aucun contrat"
                    text="Centralisez les assurances, abonnements et contrats utiles au foyer."
                  />
                )}
                <AddButton
                  label="Ajouter un contrat"
                  disabled={!data.canManageContracts}
                  onPress={() => open('contracts')}
                />
              </>
            ) : null}
          </>
        )}
      </Page>
      {data ? (
        <HouseholdEditor
          key={`${editor ?? 'closed'}-${editing?.id ?? 'new'}`}
          kind={editor}
          editing={editing}
          data={data}
          bankTransactions={bankTransactions.data ?? []}
          bankTransactionsLoading={bankTransactions.isPending}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await refresh();
          }}
        />
      ) : null}
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'decimal-pad';
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Label style={{ fontSize: 12, fontWeight: '800' }}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboardType}
        style={{
          height: 46,
          borderRadius: 15,
          paddingHorizontal: 13,
          backgroundColor: c.elevated,
          color: c.text,
          borderWidth: 1,
          borderColor: c.border,
        }}
      />
    </View>
  );
}

function Chips({
  values,
  selected,
  onToggle,
}: {
  values: Array<[string, string]>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const c = useColors();
  const accent = normalizeAccentColor(useSession((s) => s.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {values.map(([id, label]) => {
        const active = selected.includes(id);
        return (
          <Pressable
            key={id}
            onPress={() => onToggle(id)}
            style={{
              paddingHorizontal: 11,
              paddingVertical: 8,
              borderRadius: 14,
              backgroundColor: active ? accent : c.elevated,
              borderWidth: 1,
              borderColor: active ? accent : c.border,
            }}
          >
            <Label
              style={{
                color: active ? accentTextColor(accent) : c.text,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {label}
            </Label>
          </Pressable>
        );
      })}
    </View>
  );
}

function HouseholdEditor({
  kind,
  editing,
  data,
  bankTransactions,
  bankTransactionsLoading,
  onClose,
  onSaved,
}: {
  kind: Editor;
  editing: Editable;
  data: HouseholdWorkspace;
  bankTransactions: HouseholdBankTransaction[];
  bankTransactionsLoading: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const c = useColors();
  const accent = normalizeAccentColor(useSession((s) => s.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  const member = kind === 'members' ? (editing as HouseholdMember | null) : null;
  const budget = kind === 'budgets' ? (editing as HouseholdBudget | null) : null;
  const home = kind === 'homes' ? (editing as HouseholdResidence | null) : null;
  const vehicle = kind === 'vehicles' ? (editing as HouseholdVehicle | null) : null;
  const contract = kind === 'contracts' ? (editing as HouseholdContract | null) : null;
  const expense = kind === 'expenses' ? (editing as HouseholdExpense | null) : null;
  const [name, setName] = useState(
    member?.displayName ??
      budget?.name ??
      home?.name ??
      vehicle?.name ??
      contract?.name ??
      expense?.title ??
      (kind === 'rename' ? data.name : ''),
  );
  const [relation, setRelation] = useState(member?.relationship ?? 'child');
  const [birthDate, setBirthDate] = useState(member?.birthDate ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [invite, setInvite] = useState(
    member?.accountStatus === 'invited' || member?.accountStatus === 'linked',
  );
  const [editorAccess, setEditorAccess] = useState(member?.accessRole === 'editor');
  const [manageBudgets, setManageBudgets] = useState(member?.canManageBudgets ?? false);
  const [manageAssets, setManageAssets] = useState(member?.canManageAssets ?? false);
  const [manageContracts, setManageContracts] = useState(member?.canManageContracts ?? false);
  const [amount, setAmount] = useState(
    budget?.monthlyLimit?.toString() ??
      contract?.monthlyAmount?.toString() ??
      expense?.amount?.toString() ??
      '',
  );
  const [category, setCategory] = useState(
    budget?.category ?? contract?.category ?? expense?.category ?? 'other',
  );
  const [notes, setNotes] = useState(
    budget?.notes ?? home?.notes ?? vehicle?.notes ?? contract?.notes ?? expense?.notes ?? '',
  );
  const [address, setAddress] = useState(home?.address ?? '');
  const [homeKind, setHomeKind] = useState(home?.kind ?? 'primary');
  const [registration, setRegistration] = useState(vehicle?.registration ?? '');
  const [provider, setProvider] = useState(contract?.provider ?? '');
  const [renewalDate, setRenewalDate] = useState(contract?.renewalDate ?? '');
  const [residenceId, setResidenceId] = useState(contract?.residenceId ?? '');
  const [vehicleId, setVehicleId] = useState(contract?.vehicleId ?? '');
  const [members, setMembers] = useState<string[]>(
    budget?.memberIds ?? contract?.memberIds ?? expense?.splits.map((x) => x.memberId) ?? [],
  );
  const [expenseDate, setExpenseDate] = useState(
    expense?.occurredOn ?? new Date().toISOString().slice(0, 10),
  );
  const [budgetId, setBudgetId] = useState(expense?.budgetId ?? '');
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const save = useMutation({
    mutationFn: async () => {
      if (kind === 'join') return api.acceptHouseholdInvitation(joinCode.trim());
      if (kind === 'rename') return api.renameHousehold(name.trim());
      if (kind === 'members')
        return api.saveHouseholdMember(member?.id ?? null, {
          displayName: name,
          relationship: relation,
          birthDate: birthDate || null,
          email: email || null,
          inviteToAccount: invite,
          accessRole: editorAccess ? 'editor' : 'viewer',
          canManageBudgets: !editorAccess && manageBudgets,
          canManageAssets: !editorAccess && manageAssets,
          canManageContracts: !editorAccess && manageContracts,
        });
      const id = editing?.id ?? uid();
      if (kind === 'budgets')
        return api.saveHouseholdBudget(id, {
          name,
          category,
          monthlyLimit: Number(amount.replace(',', '.')),
          notes: notes || null,
          memberIds: members,
        });
      if (kind === 'homes')
        return api.saveHouseholdResidence(id, {
          name,
          kind: homeKind,
          address: address || null,
          notes: notes || null,
        });
      if (kind === 'vehicles')
        return api.saveHouseholdVehicle(id, {
          name,
          registration: registration || null,
          notes: notes || null,
        });
      if (kind === 'expenses')
        return api.saveHouseholdExpense(id, {
          title: name,
          category,
          amount: Number(amount.replace(',', '.')),
          occurredOn: expenseDate,
          budgetId: budgetId || null,
          notes: notes || null,
          memberIds: members,
        });
      if (kind === 'bank') {
        const selected = bankTransactions.find((x) => x.id === selectedTransactionId);
        return api.assignHouseholdTransaction({
          transactionId: selectedTransactionId,
          budgetId: budgetId || null,
          notes: notes || null,
          memberIds: members.length ? members : selected ? [selected.memberId] : [],
        });
      }
      return api.saveHouseholdContract(id, {
        name,
        category,
        provider: provider || null,
        monthlyAmount: amount ? Number(amount.replace(',', '.')) : null,
        renewalDate: renewalDate || null,
        residenceId: residenceId || null,
        vehicleId: vehicleId || null,
        notes: notes || null,
        memberIds: members,
      });
    },
    onSuccess: async (result) => {
      if (kind === 'members' && 'invitationCode' in result && result.invitationCode) {
        const invitation = `Rejoignez mon foyer dans l’application avec ce code : ${result.invitationCode}. Il expire dans 7 jours.`;
        if (result.invitationEmailSent)
          Alert.alert('Invitation envoyée', `L’invitation a été envoyée à ${result.email}.`);
        else {
          Alert.alert('Invitation prête à partager', invitation);
          await Share.share({
            title: `Invitation pour ${result.displayName}`,
            message: invitation,
          });
        }
      }
      await onSaved();
    },
    onError: (error) => Alert.alert('Enregistrement impossible', message(error)),
  });
  const title =
    kind === 'join'
      ? 'Rejoindre un foyer'
      : kind === 'rename'
        ? 'Renommer le foyer'
        : kind === 'bank'
          ? 'Affecter une opération'
          : `${editing ? 'Modifier' : 'Ajouter'} ${kind === 'members' ? 'une personne' : kind === 'budgets' ? 'un budget' : kind === 'expenses' ? 'une dépense' : kind === 'homes' ? 'un logement' : kind === 'vehicles' ? 'un véhicule' : 'un contrat'}`;
  return (
    <Modal visible={kind !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            maxHeight: '88%',
            backgroundColor: c.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 14 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Label style={{ flex: 1, fontSize: 21, fontWeight: '900' }}>{title}</Label>
              <Pressable onPress={onClose} style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>
            {kind === 'join' ? (
              <>
                <Label muted>
                  Entrez le code reçu d’un membre de votre foyer. Votre compte sera relié aux
                  informations partagées.
                </Label>
                <Input
                  label="Code d’invitation"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="Code de 36 caractères"
                />
              </>
            ) : kind !== 'bank' ? (
              <Input
                label="Nom"
                value={name}
                onChangeText={setName}
                placeholder={kind === 'members' ? 'Prénom ou surnom' : 'Intitulé'}
              />
            ) : null}
            {kind === 'members' ? (
              <>
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Lien avec vous</Label>
                <Chips
                  values={relations.map((x) => [x[0], x[1]])}
                  selected={[relation]}
                  onToggle={(id) => setRelation(id as HouseholdMember['relationship'])}
                />
                <Input
                  label="Date de naissance facultative"
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="AAAA-MM-JJ"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Label style={{ fontWeight: '800' }}>Cette personne a un compte</Label>
                    <Label muted style={{ fontSize: 12 }}>
                      Une invitation sera créée. Facultatif.
                    </Label>
                  </View>
                  <Switch value={invite} onValueChange={setInvite} />
                </View>
                {invite ? (
                  <>
                    <Input
                      label="Adresse e-mail"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="personne@exemple.fr"
                      keyboardType="email-address"
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Label style={{ fontWeight: '800' }}>Peut modifier le foyer</Label>
                        <Label muted style={{ fontSize: 12 }}>
                          Sinon, accès en lecture seule.
                        </Label>
                      </View>
                      <Switch value={editorAccess} onValueChange={setEditorAccess} />
                    </View>
                    {!editorAccess ? (
                      <Card style={{ gap: 12, backgroundColor: c.elevated }}>
                        <Label style={{ fontWeight: '800' }}>Autorisations précises</Label>
                        {[
                          ['Gérer les budgets et dépenses', manageBudgets, setManageBudgets],
                          ['Gérer les logements et véhicules', manageAssets, setManageAssets],
                          ['Gérer les contrats', manageContracts, setManageContracts],
                        ].map(([label, value, setter]) => (
                          <View
                            key={label as string}
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                          >
                            <Label style={{ flex: 1, fontSize: 13 }}>{label as string}</Label>
                            <Switch
                              value={value as boolean}
                              onValueChange={setter as (value: boolean) => void}
                            />
                          </View>
                        ))}
                      </Card>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {kind === 'budgets' ? (
              <>
                <Input
                  label="Plafond mensuel"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="300"
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Catégorie"
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Enfants, courses, vacances…"
                />
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Personnes concernées</Label>
                <Chips
                  values={data.members.map((x) => [x.id, x.displayName])}
                  selected={members}
                  onToggle={(id) =>
                    setMembers((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))
                  }
                />
                <Input label="Note facultative" value={notes} onChangeText={setNotes} />
              </>
            ) : null}
            {kind === 'expenses' ? (
              <>
                <Input
                  label="Montant"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="42,50"
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Date"
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="AAAA-MM-JJ"
                />
                <Input label="Catégorie" value={category} onChangeText={setCategory} />
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Budget concerné</Label>
                <Chips
                  values={[
                    ['', 'Sans budget'],
                    ...data.budgets.map((x) => [x.id, x.name] as [string, string]),
                  ]}
                  selected={[budgetId]}
                  onToggle={setBudgetId}
                />
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Répartir entre</Label>
                <Chips
                  values={data.members.map((x) => [x.id, x.displayName])}
                  selected={members}
                  onToggle={(id) =>
                    setMembers((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))
                  }
                />
                <Label muted style={{ fontSize: 12 }}>
                  Le montant est réparti à parts égales, avec un total exact au centime.
                </Label>
                <Input label="Note facultative" value={notes} onChangeText={setNotes} />
              </>
            ) : null}
            {kind === 'bank' ? (
              <>
                <Label muted>Sélectionnez une dépense bancaire réelle non encore affectée.</Label>
                {bankTransactionsLoading ? (
                  <State loading />
                ) : bankTransactions.length ? (
                  <Chips
                    values={bankTransactions.map((x) => [
                      x.id,
                      `${x.title} · ${x.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} · ${x.memberName}`,
                    ])}
                    selected={[selectedTransactionId]}
                    onToggle={setSelectedTransactionId}
                  />
                ) : (
                  <Empty
                    icon="checkmark-circle-outline"
                    title="Tout est classé"
                    text="Aucune dépense bancaire disponible ce mois-ci."
                  />
                )}
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Budget concerné</Label>
                <Chips
                  values={[
                    ['', 'Sans budget'],
                    ...data.budgets.map((x) => [x.id, x.name] as [string, string]),
                  ]}
                  selected={[budgetId]}
                  onToggle={setBudgetId}
                />
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Répartir entre</Label>
                <Chips
                  values={data.members.map((x) => [x.id, x.displayName])}
                  selected={members}
                  onToggle={(id) =>
                    setMembers((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))
                  }
                />
                <Input label="Note facultative" value={notes} onChangeText={setNotes} />
              </>
            ) : null}
            {kind === 'homes' ? (
              <>
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Type de logement</Label>
                <Chips
                  values={[
                    ['primary', 'Résidence principale'],
                    ['secondary', 'Résidence secondaire'],
                  ]}
                  selected={[homeKind]}
                  onToggle={(id) => setHomeKind(id as HouseholdResidence['kind'])}
                />
                <Input label="Adresse facultative" value={address} onChangeText={setAddress} />
                <Input label="Note facultative" value={notes} onChangeText={setNotes} />
              </>
            ) : null}
            {kind === 'vehicles' ? (
              <>
                <Input
                  label="Immatriculation facultative"
                  value={registration}
                  onChangeText={setRegistration}
                />
                <Input label="Note facultative" value={notes} onChangeText={setNotes} />
              </>
            ) : null}
            {kind === 'contracts' ? (
              <>
                <Input
                  label="Organisme"
                  value={provider}
                  onChangeText={setProvider}
                  placeholder="Assureur, opérateur…"
                />
                <Input label="Catégorie" value={category} onChangeText={setCategory} />
                <Input
                  label="Montant mensuel facultatif"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Date de renouvellement"
                  value={renewalDate}
                  onChangeText={setRenewalDate}
                  placeholder="AAAA-MM-JJ"
                />
                {data.residences.length ? (
                  <>
                    <Label style={{ fontSize: 12, fontWeight: '800' }}>Logement lié</Label>
                    <Chips
                      values={[
                        ['', 'Aucun'],
                        ...data.residences.map((x) => [x.id, x.name] as [string, string]),
                      ]}
                      selected={[residenceId]}
                      onToggle={setResidenceId}
                    />
                  </>
                ) : null}
                {data.vehicles.length ? (
                  <>
                    <Label style={{ fontSize: 12, fontWeight: '800' }}>Véhicule lié</Label>
                    <Chips
                      values={[
                        ['', 'Aucun'],
                        ...data.vehicles.map((x) => [x.id, x.name] as [string, string]),
                      ]}
                      selected={[vehicleId]}
                      onToggle={setVehicleId}
                    />
                  </>
                ) : null}
                <Label style={{ fontSize: 12, fontWeight: '800' }}>Personnes concernées</Label>
                <Chips
                  values={data.members.map((x) => [x.id, x.displayName])}
                  selected={members}
                  onToggle={(id) =>
                    setMembers((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))
                  }
                />
                <Input label="Note facultative" value={notes} onChangeText={setNotes} />
              </>
            ) : null}
            <Pressable
              disabled={save.isPending}
              onPress={() => save.mutate()}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accent,
                opacity: save.isPending ? 0.5 : pressed ? 0.82 : 1,
              })}
            >
              <Label style={{ color: accentTextColor(accent), fontWeight: '900' }}>
                {save.isPending
                  ? 'Enregistrement…'
                  : kind === 'join'
                    ? 'Rejoindre le foyer'
                    : 'Enregistrer'}
              </Label>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
