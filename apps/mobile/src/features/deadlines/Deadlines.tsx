import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import type { Deadline } from '../../types/api';
import type { RootStackParams } from '../../app/navigation';
import { useSession } from '../../store/session';
import { accentTextColor, DEFAULT_ACCENT_COLOR, normalizeAccentColor } from '../../theme/accent';
import { Card, Label, Page, State, useColors } from '../../design/ui';

const categories = [
  ['administrative', 'Administratif', 'folder-outline'],
  ['invoice', 'Facture', 'receipt-outline'],
  ['insurance', 'Assurance', 'shield-checkmark-outline'],
  ['housing', 'Logement', 'home-outline'],
  ['vehicle', 'Véhicule', 'car-outline'],
  ['health', 'Santé', 'medkit-outline'],
  ['tax', 'Impôts', 'document-text-outline'],
  ['subscription', 'Abonnement', 'repeat-outline'],
  ['other', 'Autre', 'calendar-outline'],
] as const;

const reminders = [
  [0, 'À l’heure'],
  [60, '1 heure avant'],
  [1440, '1 jour avant'],
  [4320, '3 jours avant'],
  [10080, '1 semaine avant'],
] as const;

const pad = (value: number) => value.toString().padStart(2, '0');
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseLocal = (date: string, time: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const dateParts = date.split('-').map(Number);
  const timeParts = time.split(':').map(Number);
  const year = dateParts[0]!;
  const month = dateParts[1]!;
  const day = dateParts[2]!;
  const hour = timeParts[0]!;
  const minute = timeParts[1]!;
  const value = new Date(year, month - 1, day, hour, minute);
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  )
    return null;
  return value;
};

type FormValue = {
  id?: string;
  title: string;
  category: string;
  notes: string;
  date: string;
  time: string;
  reminderMinutesBefore: number;
  completed: boolean;
};

const freshForm = (date: Date): FormValue => ({
  title: '',
  category: 'administrative',
  notes: '',
  date: dateKey(date),
  time: '09:00',
  reminderMinutesBefore: 1440,
  completed: false,
});

export function DeadlinesScreen() {
  const c = useColors();
  const accent = normalizeAccentColor(useSession((s) => s.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  const foreground = accentTextColor(accent);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [form, setForm] = useState<FormValue | null>(null);
  const query = useQuery({ queryKey: ['deadlines'], queryFn: api.deadlines });

  const save = useMutation({
    mutationFn: async (value: FormValue) => {
      const due = parseLocal(value.date, value.time);
      if (!due || !value.title.trim())
        throw new Error('Renseignez un titre, une date et une heure valides.');
      const payload = {
        title: value.title.trim(),
        category: value.category,
        notes: value.notes.trim() || null,
        dueAt: due.toISOString(),
        reminderMinutesBefore: value.reminderMinutesBefore,
        completed: value.completed,
      };
      return value.id ? api.updateDeadline(value.id, payload) : api.createDeadline(payload);
    },
    onSuccess: async (deadline) => {
      setForm(null);
      setSelected(new Date(deadline.dueAt));
      setMonth(
        new Date(new Date(deadline.dueAt).getFullYear(), new Date(deadline.dueAt).getMonth(), 1),
      );
      await queryClient.invalidateQueries({ queryKey: ['deadlines'] });
    },
    onError: (error) =>
      Alert.alert(
        'Échéance non enregistrée',
        error instanceof Error ? error.message : 'Réessayez.',
      ),
  });
  const remove = useMutation({
    mutationFn: api.deleteDeadline,
    onSuccess: async () => {
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ['deadlines'] });
    },
  });
  const toggle = useMutation({
    mutationFn: (deadline: Deadline) =>
      api.updateDeadline(deadline.id, {
        title: deadline.title,
        category: deadline.category,
        notes: deadline.notes,
        dueAt: deadline.dueAt,
        reminderMinutesBefore: deadline.reminderMinutesBefore ?? 1440,
        completed: !deadline.completedAt,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deadlines'] }),
  });

  const all = query.data ?? [];
  const selectedItems = all.filter((item) => dateKey(new Date(item.dueAt)) === dateKey(selected));
  const startOffset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendar = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const now = Date.now();
  const active = all.filter((item) => !item.completedAt);
  const overdue = active.filter((item) => new Date(item.dueAt).getTime() < now).length;
  const upcoming = active.filter((item) => new Date(item.dueAt).getTime() >= now).length;

  const edit = (deadline: Deadline) => {
    if (deadline.sourceType === 'document' && deadline.sourceId) {
      nav.navigate('Document', { id: deadline.sourceId });
      return;
    }
    const due = new Date(deadline.dueAt);
    setForm({
      id: deadline.id,
      title: deadline.title,
      category: deadline.category,
      notes: deadline.notes ?? '',
      date: dateKey(due),
      time: `${pad(due.getHours())}:${pad(due.getMinutes())}`,
      reminderMinutesBefore: deadline.reminderMinutesBefore ?? 1440,
      completed: Boolean(deadline.completedAt),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Page style={{ paddingTop: 20, paddingBottom: 110, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Label style={{ fontSize: 30, lineHeight: 36, fontWeight: '900' }}>Échéances</Label>
            <Label muted>Vos dates importantes au même endroit</Label>
          </View>
          <Pressable
            accessibilityLabel="Ajouter une échéance"
            onPress={() => setForm(freshForm(selected))}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={25} color={foreground} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1, padding: 13 }}>
            <Label muted style={{ fontSize: 11 }}>
              À VENIR
            </Label>
            <Label style={{ fontSize: 24, fontWeight: '900' }}>{upcoming}</Label>
          </Card>
          <Card style={{ flex: 1, padding: 13 }}>
            <Label muted style={{ fontSize: 11 }}>
              EN RETARD
            </Label>
            <Label style={{ fontSize: 24, fontWeight: '900', color: overdue ? '#E86D67' : c.text }}>
              {overdue}
            </Label>
          </Card>
        </View>

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              accessibilityLabel="Mois précédent"
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={20} color={c.text} />
            </Pressable>
            <Label
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 17,
                fontWeight: '900',
                textTransform: 'capitalize',
              }}
            >
              {month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </Label>
            <Pressable
              accessibilityLabel="Mois suivant"
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-forward" size={20} color={c.text} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
              <Label
                key={`${day}-${index}`}
                muted
                style={{ width: '14.285%', textAlign: 'center', fontSize: 11 }}
              >
                {day}
              </Label>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendar.map((day, index) => {
              if (!day)
                return <View key={`blank-${index}`} style={{ width: '14.285%', height: 43 }} />;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const chosen = dateKey(date) === dateKey(selected);
              const isToday = dateKey(date) === dateKey(today);
              const items = all.filter((item) => dateKey(new Date(item.dueAt)) === dateKey(date));
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelected(date)}
                  style={{
                    width: '14.285%',
                    height: 43,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: chosen ? accent : 'transparent',
                      borderWidth: isToday && !chosen ? 1 : 0,
                      borderColor: accent,
                    }}
                  >
                    <Label
                      style={{
                        fontSize: 13,
                        fontWeight: chosen || isToday ? '800' : '500',
                        color: chosen ? foreground : c.text,
                      }}
                    >
                      {day}
                    </Label>
                  </View>
                  {items.length > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 1,
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: items.some((item) => !item.completedAt) ? accent : c.muted,
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Label style={{ flex: 1, fontSize: 18, fontWeight: '900', textTransform: 'capitalize' }}>
            {selected.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Label>
          <Pressable
            onPress={() => {
              setSelected(today);
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            }}
          >
            <Label style={{ color: accent, fontWeight: '800' }}>Aujourd’hui</Label>
          </Pressable>
        </View>

        {query.isPending || query.error ? (
          <State loading={query.isPending} error={query.error} retry={() => query.refetch()} />
        ) : selectedItems.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="calendar-clear-outline" size={32} color={c.muted} />
            <Label style={{ fontWeight: '800' }}>Rien de prévu ce jour</Label>
            <Pressable onPress={() => setForm(freshForm(selected))}>
              <Label style={{ color: accent, fontWeight: '800' }}>Ajouter une échéance</Label>
            </Pressable>
          </Card>
        ) : (
          selectedItems.map((item) => {
            const info = categories.find(([id]) => id === item.category) ?? categories.at(-1)!;
            return (
              <Pressable key={item.id} onPress={() => edit(item)}>
                <Card
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: item.completedAt ? 0.55 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: `${accent}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={info[2]} size={21} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label
                      style={{
                        fontWeight: '900',
                        textDecorationLine: item.completedAt ? 'line-through' : 'none',
                      }}
                    >
                      {item.title}
                    </Label>
                    <Label muted style={{ fontSize: 12 }}>
                      {new Date(item.dueAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {info[1]}
                      {item.sourceType === 'document' ? ' · Document' : ''}
                    </Label>
                  </View>
                  {item.editable && (
                    <Pressable
                      accessibilityLabel={item.completedAt ? 'Rouvrir' : 'Marquer comme terminée'}
                      onPress={() => toggle.mutate(item)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: item.completedAt ? accent : c.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={item.completedAt ? 'checkmark' : 'ellipse-outline'}
                        size={20}
                        color={item.completedAt ? accent : c.muted}
                      />
                    </Pressable>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={c.muted} />
                </Card>
              </Pressable>
            );
          })
        )}
      </Page>

      <Modal
        visible={Boolean(form)}
        transparent
        animationType="slide"
        onRequestClose={() => setForm(null)}
      >
        <Pressable
          onPress={() => setForm(null)}
          style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => undefined}
            style={{
              backgroundColor: c.background,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '88%',
              padding: 20,
            }}
          >
            {form && (
              <ScrollView
                contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
              >
                <View
                  style={{
                    width: 42,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: c.border,
                    alignSelf: 'center',
                  }}
                />
                <Label style={{ fontSize: 22, fontWeight: '900' }}>
                  {form.id ? 'Modifier l’échéance' : 'Nouvelle échéance'}
                </Label>
                <View style={{ gap: 6 }}>
                  <Label muted style={{ fontSize: 12 }}>
                    Titre
                  </Label>
                  <TextInput
                    value={form.title}
                    onChangeText={(title) => setForm({ ...form, title })}
                    placeholder="Ex. Renouveler l’assurance"
                    placeholderTextColor={c.muted}
                    style={{
                      minHeight: 48,
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      color: c.text,
                      backgroundColor: c.surface,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {categories.map(([id, label, icon]) => (
                    <Pressable
                      key={id}
                      onPress={() => setForm({ ...form, category: id })}
                      style={{
                        height: 38,
                        borderRadius: 19,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderWidth: 1,
                        borderColor: form.category === id ? accent : c.border,
                        backgroundColor: form.category === id ? accent : c.surface,
                      }}
                    >
                      <Ionicons
                        name={icon}
                        size={15}
                        color={form.category === id ? foreground : c.muted}
                      />
                      <Label
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: form.category === id ? foreground : c.text,
                        }}
                      >
                        {label}
                      </Label>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Label muted style={{ fontSize: 12 }}>
                      Date
                    </Label>
                    <TextInput
                      value={form.date}
                      onChangeText={(date) => setForm({ ...form, date })}
                      placeholder="AAAA-MM-JJ"
                      placeholderTextColor={c.muted}
                      style={{
                        minHeight: 48,
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        color: c.text,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                      }}
                    />
                  </View>
                  <View style={{ width: 100, gap: 6 }}>
                    <Label muted style={{ fontSize: 12 }}>
                      Heure
                    </Label>
                    <TextInput
                      value={form.time}
                      onChangeText={(time) => setForm({ ...form, time })}
                      placeholder="09:00"
                      placeholderTextColor={c.muted}
                      style={{
                        minHeight: 48,
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        color: c.text,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                      }}
                    />
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <Label muted style={{ fontSize: 12 }}>
                    Rappel
                  </Label>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {reminders.map(([minutes, label]) => (
                      <Pressable
                        key={minutes}
                        onPress={() => setForm({ ...form, reminderMinutesBefore: minutes })}
                        style={{
                          height: 36,
                          borderRadius: 18,
                          paddingHorizontal: 12,
                          justifyContent: 'center',
                          backgroundColor:
                            form.reminderMinutesBefore === minutes ? accent : c.surface,
                          borderWidth: 1,
                          borderColor: form.reminderMinutesBefore === minutes ? accent : c.border,
                        }}
                      >
                        <Label
                          style={{
                            color: form.reminderMinutesBefore === minutes ? foreground : c.text,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {label}
                        </Label>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <View style={{ gap: 6 }}>
                  <Label muted style={{ fontSize: 12 }}>
                    Note facultative
                  </Label>
                  <TextInput
                    value={form.notes}
                    onChangeText={(notes) => setForm({ ...form, notes })}
                    placeholder="Information utile…"
                    placeholderTextColor={c.muted}
                    multiline
                    maxLength={1000}
                    style={{
                      minHeight: 76,
                      borderRadius: 16,
                      padding: 14,
                      color: c.text,
                      backgroundColor: c.surface,
                      borderWidth: 1,
                      borderColor: c.border,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>
                <Pressable
                  disabled={save.isPending}
                  onPress={() => save.mutate(form)}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    borderRadius: 24,
                    backgroundColor: accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed || save.isPending ? 0.65 : 1,
                  })}
                >
                  <Label style={{ color: foreground, fontWeight: '900' }}>
                    {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Label>
                </Pressable>
                {form.id && (
                  <Pressable
                    onPress={() =>
                      Alert.alert('Supprimer cette échéance ?', 'Cette action est définitive.', [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Supprimer',
                          style: 'destructive',
                          onPress: () => remove.mutate(form.id!),
                        },
                      ])
                    }
                    style={{
                      minHeight: 44,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: '#E86D6755',
                      backgroundColor: '#E86D6712',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Label style={{ color: '#E86D67', fontWeight: '800' }}>
                      Supprimer l’échéance
                    </Label>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
