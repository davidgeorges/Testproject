import React, { useState } from 'react';
import {
  View,
  Pressable,
  Switch,
  Share,
  Modal,
  ImageBackground,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  Page,
  Card,
  Label,
  Button,
  Badge,
  ReferenceCrop,
  Field,
  useColors,
  type IconName,
} from './ui';
import { dashboardScrollY, useNav } from './MainScreens';
import { useProfile } from './reference';
import { PREVIEW_ENABLED, useSession, useLiveToken } from '../store/session';
import { api, idempotencyKey } from '../services/api';
import { logOutRevenueCat, purchasePremium, restorePremium } from '../services/revenuecat';
import { deleteCurrentFirebaseUser, signOutFirebase } from '../services/firebase';
import { unregisterPushNotifications } from '../services/notifications';
import type { RootStackParams } from '../app/navigation';
import {
  accentTextColor,
  accentWithAlpha,
  DEFAULT_ACCENT_COLOR,
  mixAccentColor,
  normalizeAccentColor,
  ORIGINAL_THEME_ACCENT,
} from '../theme/accent';
function Row({
  icon,
  title,
  subtitle,
  onPress,
  color = '#0877FF',
  right,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  right?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 61,
        borderBottomWidth: 1,
        borderColor: '#DDE5EA24',
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: 'transparent',
      }}
    >
      <LinearGradient
        colors={color === '#0877FF' ? ['#465665', '#34424F'] : [color, color]}
        style={{
          width: 35,
          height: 35,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 9,
        }}
      >
        <Ionicons name={icon} color="white" size={23} />
      </LinearGradient>
      <View style={{ flex: 1, gap: 2 }}>
        <Label style={{ fontSize: 13, fontWeight: '600' }}>{title}</Label>
        {subtitle && (
          <Label muted style={{ fontSize: 11, lineHeight: 15 }}>
            {subtitle}
          </Label>
        )}
      </View>
      {right && (
        <Label muted style={{ fontSize: 11 }}>
          {right}
        </Label>
      )}
      <Ionicons name="chevron-forward" size={14} color={c.muted} />
    </Pressable>
  );
}
export function ProfileScreen() {
  const nav = useNav();
  const profile = useProfile();
  const cache = useQueryClient();
  const token = useLiveToken();
  const email = useSession((state) => state.email);
  const isDark = useSession((state) => state.theme) === 'dark';
  const accentColor = useSession((state) => state.accentColor);
  const normalizedAccent = normalizeAccentColor(accentColor) ?? DEFAULT_ACCENT_COLOR;
  const accentForeground = accentTextColor(normalizedAccent);
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
  const premium = useQuery({
    queryKey: ['premium-status', token],
    queryFn: api.premiumStatus,
    enabled: Boolean(token),
  });
  const displayName = profile.data?.firstName?.trim() || 'Utilisateur';
  const displayEmail = token ? (email ?? 'Compte connecté') : 'Non connecté';
  const initial = displayName.charAt(0).toLocaleUpperCase('fr');
  const premiumActive = premium.data?.isPremium ?? false;

  const logout = async () => {
    if (token) await unregisterPushNotifications().catch(() => undefined);
    await logOutRevenueCat().catch(() => undefined);
    await signOutFirebase();
    cache.clear();
    useSession.getState().setToken(null);
    useSession.getState().setIdentity(null);
    nav.navigate('Login');
  };

  const accountRows: {
    icon: IconName;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'person-outline',
      title: 'Informations personnelles',
      subtitle: 'Prénom, apparence et préférences',
      onPress: () => nav.navigate('Settings'),
    },
    {
      icon: 'business-outline',
      title: 'Mes banques',
      subtitle: 'Comptes et autorisations bancaires',
      onPress: () => nav.navigate('Bank'),
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: profile.data?.notificationsEnabled ? 'Activées' : 'Désactivées',
      onPress: () => nav.navigate('Notifications'),
    },
  ];
  const protectionRows: {
    icon: IconName;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'shield-checkmark-outline',
      title: 'Sécurité',
      subtitle: 'Protection et accès au compte',
      onPress: () => nav.navigate('Info', { kind: 'security' }),
    },
    {
      icon: 'lock-closed-outline',
      title: 'Confidentialité',
      subtitle: 'Données, autorisations et suppression',
      onPress: () => nav.navigate('Info', { kind: 'privacy' }),
    },
    {
      icon: 'settings-outline',
      title: 'Paramètres',
      subtitle: 'Thème et personnalisation',
      onPress: () => nav.navigate('Settings'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Aide et support',
      subtitle: 'Questions et assistance',
      onPress: () => nav.navigate('Info', { kind: 'support' }),
    },
  ];

  React.useEffect(() => {
    dashboardScrollY.setValue(0);
    return () => dashboardScrollY.setValue(0);
  }, []);

  const renderRows = (
    rows: {
      icon: IconName;
      title: string;
      subtitle?: string;
      onPress: () => void;
    }[],
  ) => (
    <View
      style={{
        borderRadius: 22,
        paddingHorizontal: 14,
        backgroundColor: pageColors.surface,
        shadowColor: pageColors.shadow,
        shadowOpacity: isDark ? 0.24 : 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
      }}
    >
      {rows.map((item, index) => (
        <Pressable
          key={item.title}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={item.onPress}
          style={({ pressed }) => ({
            minHeight: 65,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderBottomWidth: index === rows.length - 1 ? 0 : 1,
            borderBottomColor: pageColors.separator,
            opacity: pressed ? 0.68 : 1,
          })}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accentWithAlpha(normalizedAccent, isDark ? 0.28 : 0.13),
            }}
          >
            <Ionicons name={item.icon} color={normalizedAccent} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={{ color: pageColors.body, fontSize: 14, fontWeight: '800' }}>
              {item.title}
            </Label>
            {item.subtitle ? (
              <Label style={{ marginTop: 2, color: pageColors.secondary, fontSize: 10 }}>
                {item.subtitle}
              </Label>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={17} color={pageColors.muted} />
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: pageColors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Page
        fill
        transparent
        style={{ gap: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 34 }}
      >
        <View style={{ height: 43, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le profil"
            onPress={() =>
              nav.canGoBack() ? nav.goBack() : nav.navigate('Main', { screen: 'Home' })
            }
            style={({ pressed }) => ({
              width: 39,
              height: 39,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pageColors.surface,
              opacity: pressed ? 0.68 : 1,
            })}
          >
            <Ionicons name="close" size={21} color={pageColors.text} />
          </Pressable>
          <Label
            style={{
              flex: 1,
              marginRight: 39,
              color: pageColors.text,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: '900',
            }}
          >
            Profil
          </Label>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modifier mon profil"
          onPress={() => nav.navigate('Settings')}
          style={({ pressed }) => ({
            minHeight: 112,
            marginTop: 17,
            borderRadius: 24,
            padding: 17,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: pageColors.surface,
            opacity: pressed ? 0.72 : 1,
            shadowColor: pageColors.shadow,
            shadowOpacity: isDark ? 0.24 : 0.07,
            shadowRadius: 13,
            shadowOffset: { width: 0, height: 6 },
          })}
        >
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pageColors.avatar,
            }}
          >
            <Label style={{ color: pageColors.avatarText, fontSize: 27, fontWeight: '900' }}>
              {initial}
            </Label>
            <View
              style={{
                position: 'absolute',
                right: -1,
                bottom: 0,
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: normalizedAccent,
                borderWidth: 2,
                borderColor: pageColors.surface,
              }}
            >
              <Ionicons name="pencil" size={11} color={accentForeground} />
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Label style={{ color: pageColors.text, fontSize: 22, fontWeight: '900' }}>
              {displayName}
            </Label>
            <Label
              numberOfLines={1}
              style={{ marginTop: 3, color: pageColors.secondary, fontSize: 11 }}
            >
              {displayEmail}
            </Label>
            <Label
              style={{ marginTop: 8, color: normalizedAccent, fontSize: 10, fontWeight: '800' }}
            >
              Modifier mon profil
            </Label>
          </View>
          <Ionicons name="chevron-forward" size={18} color={pageColors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={premiumActive ? 'Gérer mon abonnement Premium' : 'Passer au Premium'}
          onPress={() => nav.navigate('Main', { screen: 'Premium' })}
          style={({ pressed }) => ({ marginTop: 12, opacity: pressed ? 0.72 : 1 })}
        >
          <LinearGradient
            colors={[
              mixAccentColor(normalizedAccent, '#FFFFFF', isDark ? 0.1 : 0.2),
              mixAccentColor(normalizedAccent, '#000000', isDark ? 0.16 : 0.06),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              minHeight: 82,
              borderRadius: 22,
              paddingHorizontal: 17,
              flexDirection: 'row',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 100,
                height: 100,
                borderRadius: 50,
                right: -18,
                top: -36,
                backgroundColor: accentWithAlpha(accentForeground, 0.12),
              }}
            />
            <View
              style={{
                width: 39,
                height: 39,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accentWithAlpha(accentForeground, 0.15),
              }}
            >
              <Ionicons name="diamond-outline" size={21} color={accentForeground} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Label style={{ color: accentForeground, fontSize: 16, fontWeight: '900' }}>
                {premiumActive ? 'Premium actif' : 'Passer à Premium'}
              </Label>
              <Label
                style={{
                  marginTop: 2,
                  color: mixAccentColor(
                    normalizedAccent,
                    accentForeground === '#FFFFFF' ? '#FFFFFF' : '#000000',
                    0.72,
                  ),
                  fontSize: 10,
                }}
              >
                {premiumActive ? 'Gérer mon abonnement' : 'Découvrir toutes les fonctionnalités'}
              </Label>
            </View>
            <Ionicons name="chevron-forward" size={18} color={accentForeground} />
          </LinearGradient>
        </Pressable>

        <Label
          style={{
            marginTop: 22,
            marginBottom: 8,
            color: pageColors.text,
            fontSize: 17,
            fontWeight: '900',
          }}
        >
          Mon compte
        </Label>
        {renderRows(accountRows)}

        <Label
          style={{
            marginTop: 22,
            marginBottom: 8,
            color: pageColors.text,
            fontSize: 17,
            fontWeight: '900',
          }}
        >
          Sécurité et assistance
        </Label>
        {renderRows(protectionRows)}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
          onPress={() => void logout()}
          style={({ pressed }) => ({
            minHeight: 48,
            marginTop: 14,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: '#E86D674A',
            backgroundColor: isDark ? '#3B1A1D' : '#FFF7F7',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: pressed ? 0.68 : 1,
          })}
        >
          <Ionicons name="log-out-outline" size={18} color="#E86D67" />
          <Label style={{ color: '#E86D67', fontSize: 13, fontWeight: '800' }}>Déconnexion</Label>
        </Pressable>
      </Page>
    </View>
  );
}
const paletteColors = [
  '#0B0B0F',
  '#FFFFFF',
  '#70737A',
  '#6D5CE7',
  '#2F76D2',
  '#168C9E',
  '#2E8B57',
  '#C56A32',
  '#C45C7A',
  '#B84C4C',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];
const ORIGINAL_THEME = 'dark' as const;

function ColorPickerControl({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const webPicker =
    Platform.OS === 'web'
      ? React.createElement('input', {
          type: 'color',
          value,
          disabled,
          'aria-label': 'Palette de la couleur d’accent',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value.toUpperCase()),
          style: {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: disabled ? 'default' : 'pointer',
          },
        })
      : null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir la palette de couleurs"
        disabled={disabled}
        onPress={Platform.OS === 'web' ? undefined : () => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: '#FFFFFF0D',
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed || disabled ? 0.65 : 1,
          overflow: 'hidden',
        })}
      >
        <View
          style={{
            width: 54,
            height: 28,
            borderRadius: 8,
            backgroundColor: value,
            borderWidth: 1,
            borderColor: '#FFFFFF38',
          }}
        />
        <Label style={{ flex: 1, fontSize: 13, fontWeight: '700' }}>Ouvrir la palette</Label>
        <Ionicons name="color-palette-outline" size={20} color={c.muted} />
        {webPicker}
      </Pressable>

      {Platform.OS !== 'web' ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              flex: 1,
              backgroundColor: '#000000AA',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <Pressable
              onPress={() => undefined}
              style={{
                width: '100%',
                maxWidth: 360,
                padding: 18,
                borderRadius: 22,
                backgroundColor: c.surface,
                gap: 15,
              }}
            >
              <Label style={{ fontSize: 18, fontWeight: '800' }}>Couleur d’accent</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {paletteColors.map((color) => (
                  <Pressable
                    key={color}
                    accessibilityLabel={color}
                    onPress={() => {
                      onChange(color);
                      setOpen(false);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 9,
                      backgroundColor: color,
                      borderWidth: color === value ? 3 : 1,
                      borderColor: color === value ? c.text : c.border,
                    }}
                  />
                ))}
              </View>
              <Label muted style={{ fontSize: 12 }}>
                Vous pouvez aussi saisir une valeur hexadécimale dans le champ prévu.
              </Label>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

export function SettingsScreen() {
  const nav = useNav();
  const c = useColors();
  const theme = useSession((s) => s.theme);
  const accentColor = useSession((s) => s.accentColor);
  const token = useLiveToken();
  const q = useProfile();
  const cache = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [customAccent, setCustomAccent] = useState(accentColor);
  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Indiquez votre prénom.');
      return token
        ? api.saveProfile({
            firstName: name.trim(),
            theme,
            accentColor:
              normalizeAccentColor(q.data?.accentColor ?? useSession.getState().accentColor) ??
              DEFAULT_ACCENT_COLOR,
            notificationsEnabled: q.data?.notificationsEnabled ?? true,
          })
        : { ...q.data, firstName: name.trim() };
    },
    onSuccess: (p) => {
      cache.setQueryData(['profile', token], p);
      setEdit(false);
      setMessage('Informations enregistrées.');
    },
  });
  const deletion = useMutation({
    mutationFn: async () => {
      if (token) await api.deleteAccount();
      await deleteCurrentFirebaseUser();
    },
    onSuccess: () => {
      cache.clear();
      useSession.getState().setToken(null);
      useSession.getState().setIdentity(null);
      nav.navigate('Welcome');
    },
  });
  const switchTheme = async (v: boolean) => {
    const next = v ? 'dark' : 'light';
    useSession.getState().setTheme(next);
    if (token && q.data)
      try {
        await api.saveProfile({
          ...q.data,
          theme: next,
          accentColor: normalizeAccentColor(q.data.accentColor) ?? DEFAULT_ACCENT_COLOR,
        });
      } catch {
        setMessage('Le thème est appliqué localement. La sauvegarde serveur a échoué.');
      }
  };
  const saveAccent = useMutation({
    mutationFn: async (nextColor: string) => {
      const normalized = normalizeAccentColor(nextColor);
      if (!normalized) throw new Error('Utilisez une couleur au format #RRGGBB.');
      if (!token || !q.data)
        throw new Error('Votre profil doit être chargé avant la modification.');
      return api.saveProfile({ ...q.data, theme, accentColor: normalized });
    },
    onMutate: (nextColor) => {
      const previous = useSession.getState().accentColor;
      const normalized = normalizeAccentColor(nextColor);
      if (normalized) useSession.getState().setAccentColor(normalized);
      return { previous };
    },
    onSuccess: (profile) => {
      const normalized = normalizeAccentColor(profile.accentColor) ?? DEFAULT_ACCENT_COLOR;
      useSession.getState().setAccentColor(normalized);
      setCustomAccent(normalized);
      cache.setQueryData(['profile', token], profile);
      setMessage('Couleur enregistrée sur votre profil.');
    },
    onError: (error, _nextColor, context) => {
      if (context?.previous) useSession.getState().setAccentColor(context.previous);
      setMessage(error.message);
    },
  });
  const resetAppearance = useMutation({
    mutationFn: async () => {
      if (!token || !q.data)
        throw new Error('Votre profil doit être chargé avant la réinitialisation.');
      return api.saveProfile({
        ...q.data,
        theme: ORIGINAL_THEME,
        accentColor: ORIGINAL_THEME_ACCENT,
      });
    },
    onMutate: () => {
      const previous = {
        theme: useSession.getState().theme,
        accentColor: useSession.getState().accentColor,
      };
      useSession.getState().setTheme(ORIGINAL_THEME);
      useSession.getState().setAccentColor(ORIGINAL_THEME_ACCENT);
      setCustomAccent(ORIGINAL_THEME_ACCENT);
      return previous;
    },
    onSuccess: (profile) => {
      useSession.getState().setTheme(profile.theme);
      useSession
        .getState()
        .setAccentColor(normalizeAccentColor(profile.accentColor) ?? ORIGINAL_THEME_ACCENT);
      cache.setQueryData(['profile', token], profile);
      setMessage('Thème d’origine jaune restauré.');
    },
    onError: (error, _variables, previous) => {
      if (previous) {
        useSession.getState().setTheme(previous.theme);
        useSession.getState().setAccentColor(previous.accentColor);
        setCustomAccent(previous.accentColor);
      }
      setMessage(error.message);
    },
  });
  const applyCustomAccent = () => {
    const normalized = normalizeAccentColor(customAccent);
    if (!normalized) {
      setMessage('Utilisez une couleur au format #RRGGBB.');
      return;
    }
    saveAccent.mutate(normalized);
  };
  return (
    <Page style={{ gap: 24, paddingTop: 64 }}>
      <View style={{ gap: 8 }}>
        <Label style={{ fontWeight: '700', fontSize: 13 }}>Apparence</Label>
        <Card style={{ paddingVertical: 0, paddingHorizontal: 13 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 56,
              borderBottomWidth: 0.5,
              borderColor: c.border,
            }}
          >
            <Ionicons name="moon-outline" color={c.muted} size={21} />
            <Label style={{ flex: 1, fontSize: 13 }}>Mode sombre</Label>
            <Switch
              accessibilityLabel="Mode sombre"
              value={theme === 'dark'}
              onValueChange={(v) => void switchTheme(v)}
              trackColor={{ true: '#126AFF', false: '#65748A' }}
            />
          </View>
          <View
            style={{ paddingVertical: 14, borderBottomWidth: 0.5, borderColor: c.border, gap: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="color-palette-outline" color={c.muted} size={21} />
              <Label style={{ flex: 1, marginLeft: 12, fontSize: 13 }}>Couleur d’accent</Label>
              <Label muted style={{ fontSize: 11 }}>
                {accentColor}
              </Label>
            </View>
            <ColorPickerControl
              value={normalizeAccentColor(customAccent) ?? accentColor}
              onChange={setCustomAccent}
              disabled={saveAccent.isPending}
            />
            <Field
              label="Couleur personnalisée"
              placeholder="#70737A"
              value={customAccent}
              onChangeText={(value) => setCustomAccent(value.toUpperCase().slice(0, 7))}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Appliquer la couleur personnalisée"
              disabled={saveAccent.isPending}
              onPress={applyCustomAccent}
              style={({ pressed }) => ({
                minHeight: 42,
                borderRadius: 15,
                backgroundColor: accentColor,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || saveAccent.isPending ? 0.68 : 1,
              })}
            >
              <Label
                style={{ color: accentTextColor(accentColor), fontSize: 13, fontWeight: '800' }}
              >
                {saveAccent.isPending ? 'Enregistrement…' : 'Appliquer'}
              </Label>
            </Pressable>
            <Button
              title="Réinitialiser le thème d’origine"
              secondary
              disabled={resetAppearance.isPending}
              onPress={() => resetAppearance.mutate()}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMessage('Le français est la langue disponible pour la V1.')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}
          >
            <Ionicons name="language-outline" color={c.muted} size={21} />
            <Label style={{ flex: 1, fontSize: 13 }}>Langue</Label>
            <Label muted style={{ fontSize: 12 }}>
              Français ›
            </Label>
          </Pressable>
        </Card>
      </View>
      <View style={{ gap: 8 }}>
        <Label style={{ fontWeight: '700', fontSize: 13 }}>Compte</Label>
        <Card style={{ paddingVertical: 0 }}>
          <Row
            icon="person-outline"
            color="#263950"
            title="Modifier mes informations"
            onPress={() => {
              setName(q.data?.firstName ?? '');
              setEdit(!edit);
            }}
          />
          <Row
            icon="lock-closed-outline"
            color="#263950"
            title="Modifier mon mot de passe"
            onPress={() => nav.navigate('ResetPassword')}
          />
        </Card>
        {edit && (
          <Card>
            <Field label="Prénom" placeholder="Thomas" value={name} onChangeText={setName} />
            <Button title="Enregistrer" loading={save.isPending} onPress={() => save.mutate()} />
            {save.error && <Label style={{ color: '#FF7485' }}>{save.error.message}</Label>}
          </Card>
        )}
      </View>
      <View style={{ gap: 8 }}>
        <Label style={{ fontWeight: '700', fontSize: 13 }}>Préférences</Label>
        <Card style={{ paddingVertical: 0 }}>
          <Row
            icon="notifications-outline"
            color="#263950"
            title="Notifications"
            onPress={() => nav.navigate('Notifications')}
          />
          <Row
            icon="shield-checkmark-outline"
            color="#263950"
            title="Confidentialité"
            onPress={() => nav.navigate('Info', { kind: 'privacy' })}
          />
        </Card>
      </View>
      <View style={{ height: 20, justifyContent: 'center', overflow: 'hidden' }}>
        {message ? (
          <Label muted style={{ fontSize: 12 }}>
            {message}
          </Label>
        ) : null}
      </View>
      {confirm ? (
        <Card>
          <Label>Supprimer définitivement votre compte et toutes ses données ?</Label>
          <Button
            title="Confirmer la suppression"
            danger
            loading={deletion.isPending}
            onPress={() => deletion.mutate()}
          />
          <Button title="Annuler" secondary onPress={() => setConfirm(false)} />
          {deletion.error && <Label style={{ color: '#FF7485' }}>{deletion.error.message}</Label>}
        </Card>
      ) : (
        <Button title="Supprimer mon compte" danger onPress={() => setConfirm(true)} />
      )}
    </Page>
  );
}
export function PremiumScreen() {
  const token = useLiveToken();
  const profile = useProfile();
  const cache = useQueryClient();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [message, setMessage] = useState('');
  const status = useQuery({
    queryKey: ['premium-status', token],
    queryFn: api.premiumStatus,
    enabled: !!token,
  });
  const activate = useMutation({
    mutationFn: async ({ restore = false }: { restore?: boolean }) => {
      if (!profile.data || !token) throw new Error('Connectez-vous avant d’activer Premium.');
      const purchase = restore
        ? await restorePremium(profile.data.id)
        : await purchasePremium(profile.data.id, plan);
      return api.verifyRevenueCat(purchase.productId, purchase.transactionId, idempotencyKey());
    },
    onSuccess: (premium) => {
      cache.setQueryData(['premium-status', token], premium);
      setMessage('Premium est maintenant actif sur votre compte.');
    },
  });
  const premium = status.data?.isPremium === true;
  return (
    <LinearGradient colors={['#02060C', '#0B1420', '#182432']} style={{ flex: 1 }}>
      <Page
        fill
        transparent
        style={{ gap: 11, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}
      >
        <LinearGradient
          colors={['#4B5966D4', '#354451D4', '#202B35D9']}
          style={{
            alignItems: 'center',
            gap: 7,
            paddingVertical: 17,
            borderRadius: 27,
            borderWidth: 1,
            borderColor: '#E9EFF238',
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#FFFFFF16', '#FFFFFF06', '#00000000']}
            style={{
              position: 'absolute',
              left: 40,
              right: 40,
              top: -55,
              height: 130,
              borderRadius: 70,
            }}
          />
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: '#34424FCE',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FFFFFF',
              shadowOpacity: 0.12,
              shadowRadius: 15,
            }}
          >
            <Ionicons name="diamond" size={30} color="#FFFFFF" />
          </View>
          <Label style={{ fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5 }}>
            Passez au Premium
          </Label>
          <Label
            muted
            style={{ fontSize: 13, lineHeight: 18, textAlign: 'center', color: '#9CA6B4' }}
          >
            Des économies encore plus grandes{'\n'}avec votre application Premium.
          </Label>
        </LinearGradient>
        <LinearGradient
          colors={['#4B5966D4', '#354451D4']}
          style={{
            gap: 0,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: '#28333D',
          }}
        >
          {[
            'Toutes les recommandations détectées',
            'Alternatives détaillées par abonnement',
            'Alertes pour les nouvelles économies',
            'Restauration des achats sur vos appareils',
          ].map((text) => (
            <View
              key={text}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                minHeight: 39,
                borderBottomWidth: text === 'Restauration des achats sur vos appareils' ? 0 : 0.5,
                borderBottomColor: '#25303A',
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#34424FCE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark" color="#FFFFFF" size={14} />
              </View>
              <Label muted style={{ fontSize: 12, color: '#A2ACB9' }}>
                {text}
              </Label>
            </View>
          ))}
        </LinearGradient>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            ['monthly', 'Mensuel', '5 €/mois', 'Soit 60 €/an'],
            ['annual', 'Annuel', '50 €/an', 'Soit 4,17 €/mois'],
          ].map(([id, title, price, note]) => (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: plan === id }}
              onPress={() => setPlan(id as 'monthly' | 'annual')}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={plan === id ? ['#566572D9', '#364551D9'] : ['#4B5966B8', '#354451B8']}
                style={{
                  padding: 14,
                  borderRadius: 21,
                  borderWidth: 1,
                  borderColor: plan === id ? '#F2F6F875' : '#E9EFF238',
                  gap: 4,
                  minHeight: 104,
                }}
              >
                {id === 'annual' && (
                  <View
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: -10,
                      backgroundColor: '#5B6874E8',
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 15,
                    }}
                  >
                    <Label style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                      -17%
                    </Label>
                  </View>
                )}
                <Label style={{ fontSize: 14, fontWeight: '700', color: '#F8FAFC' }}>{title}</Label>
                <Label
                  style={{
                    fontSize: 21,
                    lineHeight: 27,
                    fontWeight: '800',
                    color: plan === id ? '#20F2A0' : '#F8FAFC',
                  }}
                >
                  {price}
                </Label>
                <Label style={{ fontSize: 10, color: '#8E99A9' }}>{note}</Label>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
        {premium ? (
          <LinearGradient
            colors={['#4B5966D4', '#354451D4']}
            style={{
              alignItems: 'center',
              padding: 16,
              gap: 5,
              borderRadius: 21,
              borderWidth: 1,
              borderColor: '#E9EFF238',
            }}
          >
            <Badge text="Premium actif" />
            <Label style={{ fontSize: 17, fontWeight: '700' }}>
              Offre {status.data?.plan === 'annual' ? 'annuelle' : 'mensuelle'}
            </Label>
            {status.data?.renewsAt && (
              <Label muted>
                Prochaine échéance : {new Date(status.data.renewsAt).toLocaleDateString('fr-FR')}
              </Label>
            )}
          </LinearGradient>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={activate.isPending}
            onPress={() => {
              setMessage('');
              activate.mutate({});
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
          >
            <LinearGradient
              colors={['#20D994', '#0D9F72']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                minHeight: 47,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Label style={{ color: '#03110B', fontSize: 13, fontWeight: '800' }}>
                {activate.isPending ? 'Chargement…' : 'Commencer maintenant'}
              </Label>
            </LinearGradient>
          </Pressable>
        )}
        {!premium && (
          <Pressable
            accessibilityRole="button"
            disabled={activate.isPending}
            onPress={() => {
              setMessage('');
              activate.mutate({ restore: true });
            }}
            style={{ alignItems: 'center', padding: 6 }}
          >
            <Label style={{ color: '#A4AFBC', fontSize: 12, fontWeight: '600' }}>
              Restaurer mes achats
            </Label>
          </Pressable>
        )}
        {activate.error && (
          <Card>
            <Label style={{ color: '#FF7485', fontSize: 12 }}>{activate.error.message}</Label>
          </Card>
        )}
        {message && (
          <Card>
            <Label muted style={{ fontSize: 12 }}>
              {message}
            </Label>
          </Card>
        )}
        <Label muted style={{ fontSize: 10, textAlign: 'center', color: '#7D8897' }}>
          Annulation possible à tout moment.
        </Label>
      </Page>
    </LinearGradient>
  );
}
const initialNotices = [
  {
    id: 'saving',
    type: 'saving_found',
    resourceId: 'internet',
    readAt: null,
    group: 'Aujourd’hui',
    icon: 'bulb-outline',
    color: '#00D57A',
    title: 'Nouvelle économie détectée',
    body: 'Vous pouvez économiser 96 €/an sur votre abonnement Internet.',
    time: '09:41',
  },
  {
    id: 'sync',
    type: 'sync_completed',
    resourceId: null,
    readAt: null,
    group: 'Aujourd’hui',
    icon: 'sync-outline',
    color: '#00CCA4',
    title: 'Votre analyse est terminée',
    body: '12 abonnements détectés.',
    time: '09:20',
  },
  {
    id: 'price',
    type: 'saving_found',
    resourceId: 'auto',
    readAt: null,
    group: 'Hier',
    icon: 'star-outline',
    color: '#FFAE13',
    title: 'Votre assurance pourrait être moins chère',
    body: 'Nous avons trouvé une offre plus avantageuse.',
    time: '18:22',
  },
];
export function NotificationsScreen() {
  const nav = useNav();
  const [read, setRead] = useState<string[]>([]);
  const token = useLiveToken();
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ['notifications', token],
    queryFn: api.notifications,
    enabled: Boolean(token),
  });
  const markRead = useMutation({
    mutationFn: api.readNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', token] }),
  });
  const liveNotices = (notifications.data ?? []).map((n) => ({
    ...n,
    group: 'Aujourd’hui',
    icon: n.type === 'saving_found' ? 'bulb-outline' : 'sync-outline',
    color: n.type === 'saving_found' ? '#00D57A' : '#00CCA4',
    time: new Date(n.createdAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));
  const notices = token ? liveNotices : PREVIEW_ENABLED ? initialNotices : [];
  const groups = token ? ['Aujourd’hui'] : PREVIEW_ENABLED ? ['Aujourd’hui', 'Hier'] : [];
  const openNotice = (notice: (typeof notices)[number]) => {
    if (token && !notice.readAt) markRead.mutate(notice.id);
    if (!token) setRead([...read, notice.id]);
    if (notice.type === 'saving_found' && notice.resourceId)
      nav.navigate('Recommendation', { id: notice.resourceId });
    else nav.navigate('Main');
  };
  return (
    <Page style={{ gap: 18, paddingTop: 64 }}>
      {token && notifications.isLoading ? (
        <Card>
          <Label>Chargement des notifications…</Label>
        </Card>
      ) : token && notifications.isError ? (
        <Card style={{ gap: 10 }}>
          <Label>Impossible de charger les notifications.</Label>
          <Button title="Réessayer" onPress={() => notifications.refetch()} />
        </Card>
      ) : token && notices.length === 0 ? (
        <Card>
          <Label>Aucune notification pour le moment</Label>
          <Label muted style={{ fontSize: 12 }}>
            Une notification apparaîtra après votre prochaine synchronisation bancaire.
          </Label>
        </Card>
      ) : (
        groups.map((group) => (
          <View key={group} style={{ gap: 9 }}>
            <Label style={{ fontSize: 13, fontWeight: '600' }}>{group}</Label>
            {notices
              .filter((n) => n.group === group)
              .map((n) => (
                <Pressable accessibilityRole="button" key={n.id} onPress={() => openNotice(n)}>
                  <Card
                    style={{
                      padding: 12,
                      flexDirection: 'row',
                      gap: 10,
                      opacity: read.includes(n.id) || n.readAt ? 0.6 : 1,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: n.color,
                        borderRadius: 30,
                        padding: 7,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Ionicons name={n.icon as IconName} color="white" size={23} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Label style={{ fontSize: 12, fontWeight: '600', lineHeight: 17 }}>
                        {n.title}
                      </Label>
                      <Label muted style={{ fontSize: 11, lineHeight: 16 }}>
                        {n.body}
                      </Label>
                    </View>
                    <Label muted style={{ fontSize: 9 }}>
                      {n.time}
                    </Label>
                  </Card>
                </Pressable>
              ))}
          </View>
        ))
      )}
    </Page>
  );
}
export function SystemScreen() {
  const nav = useNav();
  const route = useRoute<RouteProp<RootStackParams, 'System'>>();
  const kind = route.params.kind;
  const [message, setMessage] = useState('');
  const content =
    kind === 'error'
      ? {
          rect: [471, 878, 80, 46],
          title: 'Une erreur est survenue',
          body: 'Impossible de récupérer vos\ntransactions. Veuillez réessayer.',
          button: 'Réessayer',
        }
      : kind === 'empty'
        ? {
            rect: [701, 880, 53, 37],
            title: 'Bonne nouvelle !',
            body: 'Nous n’avons trouvé aucune économie\naujourd’hui. Nous continuons à analyser\nvos dépenses pour vous proposer\nde nouvelles opportunités.',
            button: 'Parfait !',
          }
        : {
            rect: [916, 879, 68, 40],
            title: 'Bravo !',
            body: 'Vous venez d’économiser',
            button: 'Partager ma réussite',
          };
  return (
    <Page
      fill
      style={{ justifyContent: 'center', alignItems: 'center', gap: 18, paddingHorizontal: 28 }}
    >
      <ReferenceCrop rect={content.rect as [number, number, number, number]} width={145} />
      <Label style={{ fontSize: 25, lineHeight: 32, fontWeight: '700', textAlign: 'center' }}>
        {content.title}
      </Label>
      <Label muted style={{ fontSize: 14, lineHeight: 21, textAlign: 'center' }}>
        {content.body}
      </Label>
      {kind === 'success' && (
        <>
          <Label style={{ fontSize: 35, lineHeight: 43, fontWeight: '700', color: '#16F894' }}>
            180 €/an
          </Label>
          <Label muted>Continuez comme ça !</Label>
          <Label muted style={{ fontSize: 10 }}>
            Exemple de réussite · donnée de maquette
          </Label>
        </>
      )}
      <View style={{ width: '100%', marginTop: 6 }}>
        <Button
          title={content.button}
          onPress={() => {
            if (kind === 'success') {
              void Share.share({ message: 'Exemple de la maquette : 180 €/an d’économie.' }).catch(
                () => setMessage('Le partage n’est pas disponible sur cet appareil.'),
              );
            } else nav.navigate('Main', { screen: 'Home' });
          }}
        />
      </View>
      {kind === 'error' && (
        <Pressable
          onPress={() => nav.navigate('Info', { kind: 'support' })}
          accessibilityRole="button"
          style={{ padding: 10 }}
        >
          <Label style={{ color: '#168CFF', fontSize: 14 }}>Contacter le support</Label>
        </Pressable>
      )}
      {message && <Label muted>{message}</Label>}
    </Page>
  );
}
export function InfoScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'Info'>>();
  const nav = useNav();
  const kind = route.params.kind;
  return (
    <Page style={{ paddingTop: 64 }}>
      <Ionicons
        name={
          kind === 'security'
            ? 'shield-checkmark-outline'
            : kind === 'privacy'
              ? 'lock-closed-outline'
              : 'help-circle-outline'
        }
        size={48}
        color="#168CFF"
      />
      <Label style={{ fontSize: 23, lineHeight: 30, fontWeight: '700' }}>
        {kind === 'security'
          ? 'Sécurité du compte'
          : kind === 'privacy'
            ? 'Vos données personnelles'
            : 'Aide & Support'}
      </Label>
      <Card>
        <Label muted>
          {kind === 'security'
            ? 'La connexion Google et la connexion par e-mail utilisent Firebase. Les identifiants bancaires sont saisis uniquement dans le parcours sécurisé de la banque.'
            : kind === 'privacy'
              ? 'Vous pouvez révoquer une connexion bancaire depuis Mes banques, exporter vos données ou supprimer définitivement votre compte depuis les paramètres.'
              : 'Pour connecter une banque, ouvrez Mes banques et suivez le parcours sécurisé. Le support pourra utiliser l’identifiant de corrélation affiché lorsqu’une requête échoue.'}
        </Label>
      </Card>
      <Button
        title={kind === 'privacy' ? 'Gérer mes données' : 'Mes banques'}
        onPress={() => nav.navigate(kind === 'privacy' ? 'Settings' : 'Bank')}
      />
    </Page>
  );
}
export function MenuScreen() {
  const nav = useNav();
  return (
    <Page style={{ gap: 20, paddingTop: 64 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ backgroundColor: '#0674FF', borderRadius: 7, padding: 5 }}>
          <Ionicons name="layers" color="white" size={20} />
        </View>
        <Label style={{ fontWeight: '700' }}>Votre application</Label>
      </View>
      {[
        ['home-outline', 'Accueil', 'Home'],
        ['reader-outline', 'Abonnements', 'Subscriptions'],
        ['water-outline', 'Économies', 'Savings'],
        ['star-outline', 'Premium', 'Premium'],
        ['person-outline', 'Profil', 'Profile'],
      ].map(([icon, label, screen]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          onPress={() => nav.navigate('Main', { screen: screen as 'Home' })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 15, minHeight: 44 }}
        >
          <Ionicons name={icon as IconName} color="#D5E0F1" size={23} />
          <Label>{label}</Label>
        </Pressable>
      ))}
      <Row icon="settings-outline" title="Paramètres" onPress={() => nav.navigate('Settings')} />
      <Row
        icon="help-circle-outline"
        title="Aide & Support"
        onPress={() => nav.navigate('Info', { kind: 'support' })}
      />
    </Page>
  );
}
