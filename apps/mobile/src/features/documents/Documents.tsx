import React, { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { api, API_URL, ApiError } from '../../services/api';
import { useSession } from '../../store/session';
import { accentTextColor, DEFAULT_ACCENT_COLOR, normalizeAccentColor } from '../../theme/accent';
import type { DocumentCategory, UserDocument } from '../../types/api';
import type { RootStackParams } from '../../app/navigation';
import { Button, Card, Field, Label, Page, Search, State, useColors } from '../../design/ui';

const categories: Array<{
  id: 'all' | DocumentCategory;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { id: 'all', label: 'Tous', icon: 'apps-outline' },
  { id: 'invoice', label: 'Factures', icon: 'receipt-outline' },
  { id: 'insurance', label: 'Assurances', icon: 'shield-checkmark-outline' },
  { id: 'housing', label: 'Logement', icon: 'home-outline' },
  { id: 'vehicle', label: 'Véhicule', icon: 'car-outline' },
  { id: 'work', label: 'Travail', icon: 'briefcase-outline' },
  { id: 'tax', label: 'Impôts', icon: 'document-text-outline' },
  { id: 'bank', label: 'Banque', icon: 'wallet-outline' },
  { id: 'other', label: 'Autres', icon: 'folder-outline' },
];

const categoryInfo = (id: string) =>
  categories.find((item) => item.id === id) ?? categories.at(-1)!;
const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(`${value}T12:00:00`),
      )
    : null;

function UploadSheet({
  visible,
  close,
  upload,
}: {
  visible: boolean;
  close: () => void;
  upload: (asset: { uri: string; name: string; mimeType: string; file?: File }) => void;
}) {
  const c = useColors();
  const chooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0] as (typeof result.assets)[0] & { file?: File };
      upload({
        uri: asset.uri,
        name: asset.name,
        mimeType:
          asset.mimeType ??
          (asset.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        file: asset.file,
      });
    }
  };
  const chooseImage = async (camera: boolean) => {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted)
        return Alert.alert(
          'Appareil photo',
          'Autorisez l’accès à l’appareil photo pour scanner un document.',
        );
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      upload({
        uri: asset.uri,
        name: asset.fileName ?? `document-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        file: asset.file,
      });
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: c.background,
            padding: 20,
            paddingBottom: 34,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            gap: 12,
          }}
        >
          <View
            style={{
              width: 42,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.border,
              alignSelf: 'center',
              marginBottom: 6,
            }}
          />
          <Label style={{ fontSize: 22, fontWeight: '900' }}>Ajouter un document</Label>
          <Label muted>PDF, JPEG ou PNG · 10 Mo maximum</Label>
          {[
            ['Scanner un document', 'camera-outline', () => chooseImage(true)],
            ['Choisir une photo', 'image-outline', () => chooseImage(false)],
            ['Importer un PDF', 'document-outline', chooseFile],
          ].map(([label, icon, action]) => (
            <Pressable
              key={String(label)}
              accessibilityRole="button"
              accessibilityLabel={label as string}
              onPress={action as () => void}
              style={{
                minHeight: 58,
                borderRadius: 18,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 13,
              }}
            >
              <Ionicons
                name={icon as React.ComponentProps<typeof Ionicons>['name']}
                size={22}
                color={c.text}
              />
              <Label style={{ flex: 1, fontWeight: '700' }}>{label as string}</Label>
              <Ionicons name="chevron-forward" size={18} color={c.muted} />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DocumentsScreen() {
  const c = useColors();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | DocumentCategory>('all');
  const [sheet, setSheet] = useState(false);
  const documents = useQuery({
    queryKey: ['documents', search, category],
    queryFn: () => api.documents(search, category),
  });
  const upload = useMutation({
    mutationFn: async (asset: { uri: string; name: string; mimeType: string; file?: File }) => {
      const form = new FormData();
      if (Platform.OS === 'web' && asset.file) form.append('file', asset.file, asset.name);
      else form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType } as never);
      return api.uploadDocument(form);
    },
    onSuccess: async (document) => {
      setSheet(false);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      nav.navigate('Document', { id: document.id });
    },
    onError: (error) =>
      Alert.alert(
        'Import impossible',
        error instanceof Error ? error.message : 'L’import a échoué.',
      ),
  });
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Page style={{ paddingTop: 20, paddingBottom: 110 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Label style={{ fontSize: 30, lineHeight: 36, fontWeight: '900' }}>Documents</Label>
            <Label muted>Votre coffre administratif privé</Label>
          </View>
          <Pressable
            accessibilityLabel="Ajouter un document"
            onPress={() => setSheet(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.text,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={25} color={c.background} />
          </Pressable>
        </View>
        <Search value={search} onChangeText={setSearch} placeholder="Rechercher un document…" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {categories.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item.id }}
              onPress={() => setCategory(item.id)}
              style={{
                paddingHorizontal: 13,
                height: 36,
                borderRadius: 18,
                flexDirection: 'row',
                gap: 6,
                alignItems: 'center',
                backgroundColor: category === item.id ? c.text : c.surface,
                borderWidth: 1,
                borderColor: category === item.id ? c.text : c.border,
              }}
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={category === item.id ? c.background : c.muted}
              />
              <Label
                style={{
                  color: category === item.id ? c.background : c.text,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {item.label}
              </Label>
            </Pressable>
          ))}
        </ScrollView>
        {documents.isPending || documents.error ? (
          <State
            loading={documents.isPending}
            error={documents.error}
            retry={() => documents.refetch()}
          />
        ) : documents.data?.length === 0 ? (
          <State
            title="Aucun document"
            description="Importez une facture, un contrat ou une photo. Le texte sera extrait et classé automatiquement."
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajouter un document"
                onPress={() => setSheet(true)}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: 18,
                  borderRadius: 22,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: c.text,
                  opacity: pressed ? 0.78 : 1,
                })}
              >
                <Ionicons name="add" size={18} color={c.background} />
                <Label style={{ color: c.background, fontSize: 14, fontWeight: '800' }}>
                  Ajouter un document
                </Label>
              </Pressable>
            }
          />
        ) : (
          <View style={{ gap: 10 }}>
            <Label style={{ fontSize: 17, fontWeight: '800' }}>
              {documents.data?.length} document{documents.data?.length === 1 ? '' : 's'}
            </Label>
            {documents.data?.map((document) => {
              const info = categoryInfo(document.category);
              return (
                <Pressable
                  key={document.id}
                  onPress={() => nav.navigate('Document', { id: document.id })}
                >
                  <Card
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 }}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 52,
                        borderRadius: 14,
                        backgroundColor: c.elevated,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={info.icon} size={23} color={c.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label numberOfLines={1} style={{ fontWeight: '800' }}>
                        {document.title}
                      </Label>
                      <Label muted numberOfLines={1} style={{ fontSize: 12 }}>
                        {document.issuer ?? document.originalFileName}
                      </Label>
                      <Label muted style={{ fontSize: 11 }}>
                        {info.label}
                        {document.dueDate ? ` · Échéance ${dateLabel(document.dueDate)}` : ''}
                      </Label>
                    </View>
                    {document.status === 'failed' ? (
                      <Ionicons name="alert-circle" size={20} color={c.danger} />
                    ) : document.status === 'confirmed' ? (
                      <Ionicons name="checkmark-circle" size={20} color={c.success} />
                    ) : (
                      <Ionicons name="chevron-forward" size={19} color={c.muted} />
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </Page>
      <UploadSheet
        visible={sheet}
        close={() => setSheet(false)}
        upload={(asset) => upload.mutate(asset)}
      />
      {upload.isPending && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000A',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 30,
          }}
        >
          <Card style={{ width: '100%', alignItems: 'center', padding: 24 }}>
            <Ionicons name="scan-outline" size={34} color={c.text} />
            <Label style={{ fontSize: 18, fontWeight: '900' }}>Analyse du document…</Label>
            <Label muted style={{ textAlign: 'center' }}>
              Lecture, classement et extraction des informations.
            </Label>
          </Card>
        </View>
      )}
    </View>
  );
}

export function DocumentDetailScreen() {
  const c = useColors();
  const accent = normalizeAccentColor(useSession((s) => s.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, 'Document'>>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['document', route.params.id],
    queryFn: () => api.document(route.params.id),
  });
  const d = query.data;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<UserDocument>>({});
  const value = useMemo(() => ({ ...d, ...form }), [d, form]);
  const save = useMutation({
    mutationFn: () =>
      api.updateDocument(route.params.id, {
        title: value.title ?? 'Document',
        category: value.category ?? 'other',
        issuer: value.issuer ?? null,
        amount: value.amount ?? null,
        documentDate: value.documentDate ?? null,
        dueDate: value.dueDate ?? null,
        contractNumber: value.contractNumber ?? null,
      }),
    onSuccess: async () => {
      setEditing(false);
      setForm({});
      await queryClient.invalidateQueries({ queryKey: ['document', route.params.id] });
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) =>
      Alert.alert('Modification impossible', error instanceof Error ? error.message : 'Réessayez.'),
  });
  const remove = useMutation({
    mutationFn: () => api.deleteDocument(route.params.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      nav.goBack();
    },
  });
  const openOriginal = async () => {
    try {
      if (Platform.OS === 'web') {
        const blob = await api.documentContent(route.params.id);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      const token = useSession.getState().token;
      const target = `${FileSystem.cacheDirectory}${d?.originalFileName ?? 'document'}`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/v1/documents/${route.params.id}/content`,
        target,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(result.uri, { mimeType: d?.contentType });
    } catch (error) {
      Alert.alert('Ouverture impossible', error instanceof ApiError ? error.message : 'Réessayez.');
    }
  };
  if (query.isPending || query.error || !d)
    return (
      <Page fill>
        <State loading={query.isPending} error={query.error} retry={() => query.refetch()} />
      </Page>
    );
  const info = categoryInfo(value.category ?? 'other');
  return (
    <Page style={{ paddingTop: 8, paddingBottom: 40 }}>
      <Card style={{ alignItems: 'center', padding: 22 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={info.icon} size={30} color={accentTextColor(accent)} />
        </View>
        <Label style={{ fontSize: 23, lineHeight: 29, fontWeight: '900', textAlign: 'center' }}>
          {value.title}
        </Label>
        <Label muted>{value.issuer ?? value.originalFileName}</Label>
        {d.status === 'failed' && (
          <Label style={{ color: c.danger, textAlign: 'center' }}>
            Le texte n’a pas pu être extrait. Vous pouvez tout de même classer et conserver ce
            document.
          </Label>
        )}
      </Card>
      {editing ? (
        <Card>
          <Field
            label="Titre"
            placeholder="Titre du document"
            value={value.title ?? ''}
            onChangeText={(title) => setForm((current) => ({ ...current, title }))}
          />
          <Field
            label="Organisme"
            placeholder="Organisme émetteur"
            value={value.issuer ?? ''}
            onChangeText={(issuer) => setForm((current) => ({ ...current, issuer }))}
          />
          <Label style={{ fontWeight: '700' }}>Catégorie</Label>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            {categories
              .filter((item) => item.id !== 'all')
              .map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    setForm((current) => ({ ...current, category: item.id as DocumentCategory }))
                  }
                  style={{
                    borderRadius: 16,
                    paddingHorizontal: 11,
                    paddingVertical: 8,
                    backgroundColor: value.category === item.id ? accent : c.elevated,
                  }}
                >
                  <Label
                    style={{
                      color: value.category === item.id ? accentTextColor(accent) : c.text,
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    {item.label}
                  </Label>
                </Pressable>
              ))}
          </ScrollView>
          <Field
            label="Montant"
            placeholder="0,00"
            value={value.amount?.toString() ?? ''}
            onChangeText={(amount) =>
              setForm((current) => ({
                ...current,
                amount: Number(amount.replace(',', '.')) || null,
              }))
            }
          />
          <Field
            label="Date du document"
            placeholder="AAAA-MM-JJ"
            value={value.documentDate ?? ''}
            onChangeText={(documentDate) => setForm((current) => ({ ...current, documentDate }))}
          />
          <Field
            label="Échéance"
            placeholder="AAAA-MM-JJ"
            value={value.dueDate ?? ''}
            onChangeText={(dueDate) => setForm((current) => ({ ...current, dueDate }))}
          />
          <Field
            label="Numéro de contrat"
            placeholder="Référence"
            value={value.contractNumber ?? ''}
            onChangeText={(contractNumber) =>
              setForm((current) => ({ ...current, contractNumber }))
            }
          />
          <Button title="Enregistrer" loading={save.isPending} onPress={() => save.mutate()} />
          <Button
            title="Annuler"
            secondary
            onPress={() => {
              setForm({});
              setEditing(false);
            }}
          />
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Label style={{ flex: 1, fontSize: 17, fontWeight: '900' }}>
                Informations extraites
              </Label>
              <Pressable onPress={() => setEditing(true)}>
                <Label style={{ color: accent, fontWeight: '700' }}>Corriger</Label>
              </Pressable>
            </View>
            {[
              ['Catégorie', info.label],
              ['Organisme', d.issuer],
              ['Montant', d.amount === null ? null : `${d.amount.toFixed(2).replace('.', ',')} €`],
              ['Date', dateLabel(d.documentDate)],
              ['Échéance', dateLabel(d.dueDate)],
              ['Contrat', d.contractNumber],
            ].map(([label, item]) =>
              item ? (
                <View
                  key={label}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 7,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                  }}
                >
                  <Label muted style={{ flex: 1 }}>
                    {label}
                  </Label>
                  <Label style={{ maxWidth: '62%', textAlign: 'right', fontWeight: '700' }}>
                    {item}
                  </Label>
                </View>
              ) : null,
            )}
          </Card>
          <Card>
            <Label style={{ fontSize: 17, fontWeight: '900' }}>Texte reconnu</Label>
            <Label muted numberOfLines={10}>
              {d.extractedText || 'Aucun texte reconnu.'}
            </Label>
          </Card>
          <Button title="Ouvrir le document original" secondary onPress={openOriginal} />
          <Button
            title="Supprimer le document"
            danger
            onPress={() =>
              Alert.alert(
                'Supprimer ce document ?',
                'Le fichier et les informations extraites seront supprimés définitivement.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate() },
                ],
              )
            }
          />
        </>
      )}
    </Page>
  );
}
