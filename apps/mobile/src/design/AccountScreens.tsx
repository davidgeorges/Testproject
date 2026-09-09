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
import { useSession, useLiveToken } from '../store/session';
import { api } from '../services/api';
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
  return (
    <Page style={{ gap: 12, paddingTop: 4 }}>
      <View style={{ alignItems: 'center', gap: 5, paddingBottom: 11 }}>
        <ReferenceCrop
          rect={[1411, 435, 45, 45]}
          width={75}
          style={{ borderRadius: 50, borderWidth: 2, borderColor: '#3C5068' }}
        />
        <Label style={{ fontSize: 21, lineHeight: 27, fontWeight: '700' }}>
          {profile.data?.firstName ?? 'Thomas'} {!token ? 'Dupont' : ''}
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          {token ? 'Compte de démonstration' : 'thomas@email.com'}
        </Label>
        <View
          style={{
            backgroundColor: '#163DCD',
            borderRadius: 15,
            paddingVertical: 3,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="diamond" color="white" size={11} />
          <Label style={{ fontSize: 10, color: 'white', lineHeight: 14 }}>
            {token ? 'Démo' : 'Premium'}
          </Label>
        </View>
      </View>
      <View>
        <Row
          icon="home-outline"
          title="Mes banques"
          subtitle={!token ? '2 banques connectées' : 'Gérer mes connexions'}
          onPress={() => nav.navigate('Bank')}
        />
        <Row
          icon="notifications-outline"
          title="Notifications"
          subtitle={token ? 'Bientôt disponibles' : 'Activées'}
          color="#FB375A"
          onPress={() => nav.navigate('Notifications')}
        />
        <Row
          icon="shield-checkmark-outline"
          title="Sécurité"
          subtitle={!token ? 'Face ID activé' : 'Gérer mon accès'}
          onPress={() => nav.navigate('Info', { kind: 'security' })}
        />
        <Row
          icon="lock-closed-outline"
          title="Confidentialité"
          subtitle="Gérer mes données"
          color="#8099BC"
          onPress={() => nav.navigate('Info', { kind: 'privacy' })}
        />
        <Row
          icon="settings-outline"
          title="Paramètres"
          subtitle="Langue, apparence"
          color="#8099BC"
          onPress={() => nav.navigate('Settings')}
        />
        <Row
          icon="help-circle-outline"
          title="Aide & Support"
          subtitle="Une question ?"
          onPress={() => nav.navigate('Info', { kind: 'support' })}
        />
      </View>
      <Button
        title="↪  Déconnexion"
        danger
        onPress={() => {
          cache.clear();
          useSession.getState().setToken(null);
          nav.navigate('Login');
        }}
      />
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
    mutationFn: async () => (token ? api.deleteAccount() : undefined),
    onSuccess: () => {
      cache.clear();
      useSession.getState().setToken(null);
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
              setName(q.data?.firstName ?? 'Thomas');
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
          <Label>Supprimer les données de cette démonstration ?</Label>
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
  const c = useColors();
  const [plan, setPlan] = useState('monthly');
  const [message, setMessage] = useState('');
  return (
    <LinearGradient
      colors={
        useSession((s) => s.theme) === 'dark'
          ? ['#151052', '#070F1B', '#050D17']
          : [c.background, c.background, c.background]
      }
      style={{ flex: 1 }}
    >
      <Page fill transparent style={{ gap: 21, paddingTop: 15 }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ReferenceCrop rect={[1227, 450, 43, 42]} width={84} />
          <Label style={{ fontSize: 25, lineHeight: 32, fontWeight: '700' }}>
            Passez au Premium
          </Label>
          <Label muted style={{ fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
            Des économies encore plus grandes{'\n'}avec votre application Premium.
          </Label>
        </View>
        <View style={{ gap: 18, marginVertical: 12 }}>
          {[
            'Analyses illimitées',
            'Recommandations en temps réel',
            'Alertes sur les hausses de prix',
            'Rapports mensuels PDF',
            'Support prioritaire',
          ].map((text) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <Ionicons name="checkmark-circle" color="#00E38D" size={23} />
              <Label muted style={{ fontSize: 13 }}>
                {text}
              </Label>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minHeight: 8 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            ['monthly', 'Mensuel', '5 €/mois', 'Soit 60 €/an'],
            ['annual', 'Annuel', '50 €/an', 'Soit 4,17 €/mois'],
          ].map(([id, title, price, note]) => (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: plan === id }}
              onPress={() => setPlan(id!)}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={plan === id ? ['#087AFF', '#2539F3'] : [c.surface, c.background]}
                style={{
                  padding: 17,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: plan === id ? '#5595FF' : c.border,
                  gap: 6,
                  minHeight: 121,
                }}
              >
                {id === 'annual' && (
                  <View
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: -12,
                      backgroundColor: '#00CE74',
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 15,
                    }}
                  >
                    <Label style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>-17%</Label>
                  </View>
                )}
                <Label
                  style={{ fontSize: 16, fontWeight: '600', color: plan === id ? 'white' : c.text }}
                >
                  {title}
                </Label>
                <Label
                  style={{
                    fontSize: 22,
                    lineHeight: 29,
                    fontWeight: '600',
                    color: plan === id ? 'white' : c.text,
                  }}
                >
                  {price}
                </Label>
                <Label style={{ fontSize: 11, color: plan === id ? '#C8E1FF' : c.muted }}>
                  {note}
                </Label>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
        <Button
          title="Commencer maintenant"
          onPress={() =>
            setMessage(
              'Tarifs illustratifs de la maquette. Les achats via les stores ne sont pas encore activés ; aucun paiement ne sera effectué.',
            )
          }
        />
        {message && (
          <Card>
            <Label muted style={{ fontSize: 12 }}>
              {message}
            </Label>
          </Card>
        )}
        <Label muted style={{ fontSize: 11, textAlign: 'center' }}>
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
  const notices = token ? liveNotices : initialNotices;
  const groups = token ? ['Aujourd’hui'] : ['Aujourd’hui', 'Hier'];
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
            ? 'Cette version utilise des sessions de démonstration. Firebase Auth et Face ID seront intégrés dans une prochaine étape. Aucun identifiant bancaire n’est demandé.'
            : kind === 'privacy'
              ? 'Les données de cette version sont fictives. Vous pouvez supprimer une connexion bancaire depuis Mes banques ou supprimer les données de votre session depuis les paramètres.'
              : 'Pour tester le parcours, ouvrez Mes banques, sélectionnez une banque et autorisez la connexion fictive. Aucune souscription ni aucun paiement ne sont effectués.'}
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
