import React, { useState } from 'react';
import { View, Pressable, Switch, Share, Modal } from 'react-native';
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
import { useNav } from './MainScreens';
import { useProfile } from './reference';
import { PREVIEW_ENABLED, useSession, useLiveToken } from '../store/session';
import { api, idempotencyKey } from '../services/api';
import { logOutRevenueCat, purchasePremium, restorePremium } from '../services/revenuecat';
import { deleteCurrentFirebaseUser, signOutFirebase } from '../services/firebase';
import { unregisterPushNotifications } from '../services/notifications';
import type { RootStackParams } from '../app/navigation';
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
        minHeight: 65,
        borderBottomWidth: 0.5,
        borderColor: c.border,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: c.surface,
        borderRadius: 10,
        marginBottom: 5,
      }}
    >
      <LinearGradient
        colors={[color, color]}
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
  const email = useSession((s) => s.email);
  const preview = PREVIEW_ENABLED && !token;
  const logout = async () => {
    if (token) await unregisterPushNotifications().catch(() => undefined);
    await logOutRevenueCat().catch(() => undefined);
    await signOutFirebase();
    cache.clear();
    useSession.getState().setToken(null);
    useSession.getState().setIdentity(null);
    nav.navigate('Login');
  };
  const profileRows: {
    icon: IconName;
    title: string;
    subtitle: string;
    accent?: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'home-outline',
      title: 'Mes banques',
      subtitle: preview ? '2 banques connectées' : 'Gérer mes connexions',
      onPress: () => nav.navigate('Bank'),
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: token ? 'Activées sur cet appareil' : 'Aperçu',
      accent: '#FF7180',
      onPress: () => nav.navigate('Notifications'),
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Sécurité',
      subtitle: preview ? 'Face ID activé' : 'Gérer mon accès',
      onPress: () => nav.navigate('Info', { kind: 'security' }),
    },
    {
      icon: 'lock-closed-outline',
      title: 'Confidentialité',
      subtitle: 'Gérer mes données',
      onPress: () => nav.navigate('Info', { kind: 'privacy' }),
    },
    {
      icon: 'settings-outline',
      title: 'Paramètres',
      subtitle: 'Langue, apparence',
      onPress: () => nav.navigate('Settings'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Aide & Support',
      subtitle: 'Une question ?',
      onPress: () => nav.navigate('Info', { kind: 'support' }),
    },
  ];
  return (
    <Page
      backgroundColor="#020609"
      style={{ gap: 11, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}
    >
      <LinearGradient
        colors={['#151C22', '#090E13']}
        style={{
          alignItems: 'center',
          gap: 5,
          paddingVertical: 15,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: '#2D3842',
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['#FFFFFF18', '#FFFFFF02', '#00000000']}
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            top: -55,
            height: 125,
            borderRadius: 70,
          }}
        />
        <ReferenceCrop
          rect={[1411, 435, 45, 45]}
          width={72}
          style={{ borderRadius: 36, borderWidth: 2, borderColor: '#606B76' }}
        />
        <Label style={{ fontSize: 21, lineHeight: 27, fontWeight: '800' }}>
          {preview ? 'Georges' : (profile.data?.firstName ?? 'Utilisateur')}
        </Label>
        <Label muted style={{ fontSize: 11, color: '#929DAE' }}>
          {token ? (email ?? 'Compte Firebase') : 'georges@email.com'}
        </Label>
        <View
          style={{
            backgroundColor: '#063E2C',
            borderRadius: 15,
            paddingVertical: 4,
            paddingHorizontal: 11,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="diamond" color="#20F2A0" size={11} />
          <Label style={{ fontSize: 10, color: '#20F2A0', lineHeight: 14, fontWeight: '700' }}>
            {token ? 'Compte' : 'Premium'}
          </Label>
        </View>
      </LinearGradient>
      <LinearGradient
        colors={['#111820', '#080D12']}
        style={{
          borderRadius: 23,
          borderWidth: 1,
          borderColor: '#28333D',
          paddingHorizontal: 13,
          overflow: 'hidden',
        }}
      >
        {profileRows.map((item, index) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => ({
              minHeight: 61,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              borderBottomWidth: index === profileRows.length - 1 ? 0 : 0.5,
              borderBottomColor: '#26313B',
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                backgroundColor: item.accent ? '#30161A' : '#18212A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icon} color={item.accent ?? '#EEF3F7'} size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Label style={{ fontSize: 13, fontWeight: '700' }}>{item.title}</Label>
              <Label muted style={{ fontSize: 10, color: '#8F9AAA' }}>
                {item.subtitle}
              </Label>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#7F8A99" />
          </Pressable>
        ))}
      </LinearGradient>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Passer au Premium"
        onPress={() => nav.navigate('Main', { screen: 'Premium' })}
        style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
      >
        <LinearGradient
          colors={['#292515', '#11120D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            minHeight: 58,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#665A2D',
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#3A2F0D',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="diamond" size={19} color="#FFD35A" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Label style={{ fontSize: 13, fontWeight: '800' }}>Passer au Premium</Label>
            <Label muted style={{ fontSize: 10, color: '#A69E7F' }}>
              Débloquer toutes les recommandations
            </Label>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#D6BE63" />
        </LinearGradient>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => void logout()}
        style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
      >
        <View
          style={{
            minHeight: 44,
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
          <Ionicons name="log-out-outline" size={18} color="#FF6B78" />
          <Label style={{ color: '#FF7A86', fontSize: 13, fontWeight: '700' }}>Déconnexion</Label>
        </View>
      </Pressable>
    </Page>
  );
}
export function SettingsScreen() {
  const nav = useNav();
  const c = useColors();
  const theme = useSession((s) => s.theme);
  const token = useLiveToken();
  const q = useProfile();
  const cache = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Indiquez votre prénom.');
      return token
        ? api.saveProfile({
            firstName: name.trim(),
            theme,
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
        await api.saveProfile({ ...q.data, theme: next });
      } catch {
        setMessage('Le thème est appliqué localement. La sauvegarde serveur a échoué.');
      }
  };
  return (
    <Page style={{ gap: 24 }}>
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
      {message && (
        <Label muted style={{ fontSize: 12 }}>
          {message}
        </Label>
      )}
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
    <LinearGradient colors={['#020609', '#07100E', '#020609']} style={{ flex: 1 }}>
      <Page
        fill
        transparent
        style={{ gap: 11, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}
      >
        <LinearGradient
          colors={['#1E211C', '#101512', '#070C0B']}
          style={{
            alignItems: 'center',
            gap: 7,
            paddingVertical: 17,
            borderRadius: 27,
            borderWidth: 1,
            borderColor: '#5A51325E',
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#FFD65A2D', '#FFFFFF05', '#00000000']}
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
              backgroundColor: '#32280D',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FFD35A',
              shadowOpacity: 0.3,
              shadowRadius: 15,
            }}
          >
            <Ionicons name="diamond" size={30} color="#FFD35A" />
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
          colors={['#111820', '#080D12']}
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
                  backgroundColor: '#063E2C',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark" color="#20F2A0" size={14} />
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
                colors={plan === id ? ['#26312D', '#111A17'] : ['#111820', '#080D12']}
                style={{
                  padding: 14,
                  borderRadius: 21,
                  borderWidth: 1,
                  borderColor: plan === id ? '#5A776B' : '#28333D',
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
                      backgroundColor: '#0B6B4B',
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 15,
                    }}
                  >
                    <Label style={{ color: '#8CFFD0', fontSize: 10, fontWeight: '700' }}>
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
            colors={['#12352F', '#081713']}
            style={{
              alignItems: 'center',
              padding: 16,
              gap: 5,
              borderRadius: 21,
              borderWidth: 1,
              borderColor: '#32705E',
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
    <Page style={{ gap: 18 }}>
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
    <Page>
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
    <Page style={{ gap: 20 }}>
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
