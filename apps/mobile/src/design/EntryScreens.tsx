import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Page,
  Label,
  Button,
  Field,
  ReferenceCrop,
  IconButton,
  Search,
  Card,
  State,
  useColors,
  type IconName,
} from './ui';
import { useNav } from './MainScreens';
import { api, ApiError, idempotencyKey } from '../services/api';
import {
  registerWithEmail,
  resetPassword,
  signInWithEmail,
  useGoogleSignIn,
  type FirebaseSession,
} from '../services/firebase';
import { PREVIEW_ENABLED, useSession, useLiveToken } from '../store/session';
import type { RootStackParams } from '../app/navigation';
import { date, money } from '../utils/format';
export function Welcome() {
  const nav = useNav();
  return (
    <LinearGradient
      colors={['#071426', '#030B19', '#130766']}
      locations={[0, 0.62, 1]}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={['#07306580', 'transparent']}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 190,
          height: 220,
          borderRadius: 100,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Commencer"
        onPress={() => nav.navigate('Login')}
        style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 24 }}
      >
        <LinearGradient
          colors={['#007CFF', '#1240ED']}
          style={{
            height: 98,
            width: 98,
            borderRadius: 25,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#007AFF',
            shadowRadius: 30,
            shadowOpacity: 0.45,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Ionicons name="layers" size={61} color="#DAE7FF" />
        </LinearGradient>
        <Label style={{ fontSize: 36, lineHeight: 43, fontWeight: '700', color: 'white' }}>
          Votre application
        </Label>
        <Label style={{ fontSize: 25, lineHeight: 33, color: 'white', textAlign: 'center' }}>
          Votre argent{'\n'}mérite mieux
        </Label>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 24 }}>
          {[
            ['reader-outline', 'Analyse'],
            ['search-outline', 'Compare'],
            ['wallet-outline', 'Économise'],
          ].map(([icon, label]) => (
            <View key={label} style={{ alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: '#42417D', borderRadius: 25, padding: 12 }}>
                <Ionicons name={icon as IconName} size={23} color="white" />
              </View>
              <Label style={{ color: '#fff', fontSize: 13 }}>{label}</Label>
            </View>
          ))}
        </View>
      </Pressable>
      <View style={{ padding: 30, paddingBottom: 38, gap: 8 }}>
        <Label style={{ textAlign: 'center', fontSize: 13, color: '#B8C5E4' }}>
          Un avenir plus serein{'\n'}commence aujourd’hui
        </Label>
        <Label style={{ textAlign: 'center', fontSize: 10, color: '#7B8BAE' }}>
          Touchez l’écran pour commencer · Nom à définir
        </Label>
      </View>
    </LinearGradient>
  );
}
export function AuthScreen({ register = false }: { register?: boolean }) {
  const nav = useNav();
  const queryClient = useQueryClient();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accept, setAccept] = useState(false);
  const [message, setMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const googleSignIn = useGoogleSignIn();
  const rules = [
    ['Au moins 8 caractères', password.length >= 8],
    ['Une majuscule', /[A-Z]/.test(password)],
    ['Un chiffre', /\d/.test(password)],
  ] as const;
  async function finishAuthentication(firebase: FirebaseSession) {
    useSession.getState().setToken(firebase.token);
    useSession.getState().setIdentity(firebase);
    useSession.getState().setPreview(false);
    const firstName =
      (register ? name.trim().split(/\s+/)[0] : '') ||
      firebase.displayName?.trim().split(/\s+/)[0] ||
      firebase.email?.split('@')[0] ||
      'Utilisateur';
    const existing = await api.profile();
    const profile =
      existing.firstName === 'Utilisateur'
        ? await api.saveProfile({ ...existing, firstName })
        : existing;
    if (register && accept) await api.acceptLegal('1.0');
    queryClient.setQueryData(['profile', firebase.token], profile);
  }
  async function submit() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setMessage('Indiquez une adresse e-mail valide.');
      return;
    }
    if (
      password.length < 8 ||
      (register && (!name.trim() || !accept || !rules.every(([, valid]) => valid)))
    ) {
      setMessage('Complétez les informations et les critères indiqués.');
      return;
    }
    setAuthBusy(true);
    setMessage('');
    try {
      const firebase = register
        ? await registerWithEmail(email, password, name)
        : await signInWithEmail(email, password);
      await finishAuthentication(firebase);
      setPassword('');
      nav.navigate(register ? 'Onboarding' : 'Main');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentification impossible.');
    } finally {
      setAuthBusy(false);
    }
  }
  async function googleLogin() {
    setAuthBusy(true);
    setMessage('');
    try {
      const firebase = await googleSignIn();
      await finishAuthentication(firebase);
      nav.navigate('Main');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connexion Google impossible.');
    } finally {
      setAuthBusy(false);
    }
  }
  return (
    <Page fill style={{ gap: 19, paddingTop: 10 }}>
      <View style={{ gap: 8 }}>
        <Label style={{ fontSize: 25, lineHeight: 32, fontWeight: '700' }}>
          {register ? 'Créer un compte' : 'Bienvenue !'}
        </Label>
        <Label muted style={{ fontSize: 13, lineHeight: 19 }}>
          {register
            ? 'Quelques informations pour bien commencer.'
            : 'Connectez-vous pour reprendre\nle contrôle de vos dépenses.'}
        </Label>
      </View>
      {register && (
        <Field label="Nom complet" placeholder="Jean Dupont" value={name} onChangeText={setName} />
      )}
      <Field label="Email" placeholder="votre@email.com" value={email} onChangeText={setEmail} />
      <Field
        label="Mot de passe"
        placeholder=""
        value={password}
        onChangeText={setPassword}
        password
      />
      {register ? (
        <View style={{ gap: 7 }}>
          {rules.map(([label, valid]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color={valid ? '#00DE86' : '#395466'} />
              <Label muted style={{ fontSize: 12 }}>
                {label}
              </Label>
            </View>
          ))}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accept }}
            onPress={() => setAccept(!accept)}
            style={{ flexDirection: 'row', gap: 9, minHeight: 44, alignItems: 'center' }}
          >
            <Ionicons name={accept ? 'checkbox' : 'square-outline'} color="#3983FF" size={21} />
            <Label style={{ flex: 1, fontSize: 12 }}>
              J’accepte les <Label style={{ fontSize: 12, color: '#168CFF' }}>CGU</Label> et la{' '}
              <Label style={{ fontSize: 12, color: '#168CFF' }}>Politique de confidentialité</Label>
            </Label>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => nav.navigate('ResetPassword')}
          style={{ alignSelf: 'flex-end', minHeight: 32 }}
        >
          <Label style={{ color: '#168CFF', fontSize: 12 }}>Mot de passe oublié ?</Label>
        </Pressable>
      )}
      {message && <Label style={{ fontSize: 12, color: '#FF7485' }}>{message}</Label>}
      <Button
        title={register ? 'Créer mon compte' : 'Se connecter'}
        loading={authBusy}
        onPress={() => void submit()}
      />
      {!register && (
        <>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
            <Label muted style={{ fontSize: 12 }}>
              ou
            </Label>
            <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              accessibilityLabel="Connexion Google"
              accessibilityRole="button"
              disabled={authBusy}
              onPress={() => void googleLogin()}
              style={{
                flex: 1,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 12,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {authBusy ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <Ionicons name="logo-google" size={25} color="#4285F4" />
              )}
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => nav.navigate('Register')}
            style={{ alignItems: 'center', paddingTop: 5, minHeight: 44 }}
          >
            <Label muted style={{ fontSize: 12 }}>
              Pas encore de compte ?{' '}
              <Label style={{ fontSize: 12, color: '#168CFF' }}>Créer un compte</Label>
            </Label>
          </Pressable>
        </>
      )}
      <View style={{ flex: 1 }} />
      <Label muted style={{ fontSize: 10, lineHeight: 15, textAlign: 'center' }}>
        Vos identifiants sont protégés par Firebase Authentication.
      </Label>
    </Page>
  );
}
export function Login() {
  return <AuthScreen />;
}
export function Register() {
  return <AuthScreen register />;
}
export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setMessage('Indiquez une adresse e-mail valide.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Label style={{ fontSize: 24, lineHeight: 31, fontWeight: '700' }}>
        Mot de passe oublié ?
      </Label>
      <Label muted>Indiquez votre adresse e-mail pour retrouver l’accès à votre compte.</Label>
      <Field label="Email" placeholder="votre@email.com" value={email} onChangeText={setEmail} />
      <Button title="Réinitialiser mon mot de passe" loading={busy} onPress={() => void submit()} />
      {message && <Label style={{ color: '#FF7485' }}>{message}</Label>}
      {sent && (
        <Card>
          <Label muted>Un e-mail de réinitialisation vient de vous être envoyé.</Label>
        </Card>
      )}
    </Page>
  );
}
const slides = [
  {
    title: 'Découvrez tous\nvos abonnements',
    body: 'Nous analysons vos transactions pour détecter automatiquement tous vos abonnements.',
    rect: [531, 177, 127, 116],
  },
  {
    title: 'Identifiez les\néconomies possibles',
    body: 'Notre IA compare vos dépenses et vous propose les meilleures offres du marché.',
    rect: [690, 174, 130, 117],
  },
  {
    title: 'Recevez des\nrecommandations\npersonnalisées',
    body: 'Des conseils clairs et conformes à votre situation.',
    rect: [850, 170, 130, 115],
  },
  {
    title: 'Connectez\nvotre banque',
    body: '100 % sécurisé et conforme\nà la réglementation européenne\n(DSP2).',
    rect: [1014, 173, 132, 126],
  },
] as const;
export function Onboarding() {
  const nav = useNav();
  const route = useRoute<RouteProp<RootStackParams, 'Onboarding'>>();
  const [step, setStep] = useState(route.params?.step ?? 0);
  useEffect(() => {
    setStep(route.params?.step ?? 0);
  }, [route.params?.step]);
  const slide = slides[step]!;
  return (
    <Page fill style={{ paddingTop: 8, gap: 18 }}>
      <Label muted style={{ fontSize: 15 }}>
        {step + 1}/4
      </Label>
      <Label style={{ fontSize: 25, lineHeight: 32, fontWeight: '700' }}>{slide.title}</Label>
      <Label muted style={{ fontSize: 15, lineHeight: 23 }}>
        {slide.body}
      </Label>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 235 }}>
        <ReferenceCrop rect={[...slide.rect]} width={315} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        {slides.map((_, i) => (
          <Pressable
            key={i}
            accessibilityLabel={`Étape ${i + 1}`}
            onPress={() => setStep(i)}
            style={{ padding: 5 }}
          >
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 8,
                backgroundColor: i === step ? '#1978FF' : '#29426B',
              }}
            />
          </Pressable>
        ))}
      </View>
      <Button
        title={step === 3 ? 'Commencer' : 'Suivant'}
        onPress={() => (step < 3 ? setStep(step + 1) : nav.navigate('Bank'))}
      />
    </Page>
  );
}
const banks: [string, string, string][] = [
  ['Boursorama Banque', '↗', '#E62596'],
  ['BNP Paribas', '✦', '#04A66F'],
  ['Crédit Agricole', 'CA', '#FFFFFF'],
  ['Société Générale', '━', '#EB243B'],
  ['LCL', 'LCL', '#142485'],
  ['Banque Populaire', '↗', '#183A92'],
  ['Caisse d’Épargne', '▱', '#F21A25'],
  ['Autres banques', 'lock-closed', '#263246'],
];
export function BankScreen() {
  const nav = useNav();
  const c = useColors();
  const cache = useQueryClient();
  const token = useLiveToken();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const key = useRef(idempotencyKey());
  const connections = useQuery({
    queryKey: ['connections', token],
    queryFn: api.connections,
    enabled: !!token,
  });
  const accounts = useQuery({
    queryKey: ['bank-accounts', token],
    queryFn: api.accounts,
    enabled: !!token,
  });
  const transactions = useQuery({
    queryKey: ['bank-transactions', token],
    queryFn: () => api.bankTransactions(undefined, 30),
    enabled: !!token,
  });
  const connect = useMutation({
    mutationFn: async () => {
      if (!useSession.getState().token) {
        throw new Error('Connectez-vous avec Google avant de relier votre banque.');
      }
      const native = Platform.OS !== 'web';
      const { url } = await api.tinkLink(native);
      if (!native) {
        await Linking.openURL(url);
        return null;
      }
      const redirectUri =
        process.env.EXPO_PUBLIC_TINK_REDIRECT_URI ?? 'subscriptionapp://banking/callback';
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
      if (result.type !== 'success') throw new Error('La connexion bancaire a été annulée.');
      const params = new URL(result.url).searchParams;
      const code = params.get('code');
      if (!code) throw new Error(params.get('message') ?? 'Tink n’a retourné aucun code.');
      const bank = await api.completeTink(
        code,
        params.get('credentials_id') ?? params.get('credentialsId'),
        params.get('state'),
        key.current,
      );
      cache.invalidateQueries();
      nav.replace('Sync', { connectionId: bank.id });
      return bank;
    },
    onSuccess: () => {
      setSelected(null);
      useSession.getState().setPreview(false);
    },
  });
  const remove = useMutation({
    mutationFn: api.disconnect,
    onSuccess: () => cache.invalidateQueries(),
  });
  const openConsent = (name: string) => {
    setSelected(name);
    setConsent(false);
    key.current = idempotencyKey();
    connect.reset();
  };
  const queryError = connections.error ?? accounts.error ?? transactions.error;
  return (
    <Page style={{ gap: 15, paddingTop: 6 }}>
      {!!connections.data?.length && (
        <>
          <Label style={{ fontSize: 23, lineHeight: 30, fontWeight: '700' }}>Mes banques</Label>
          {connections.data.map((bank) => {
            const bankAccounts =
              accounts.data?.filter((account) => account.connectionId === bank.id) ?? [];
            const expired = new Date(bank.consentExpiresAt).getTime() <= Date.now();
            const connected = bank.status === 'connected' && !expired;
            return (
              <Card key={bank.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: '#087BFF22',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="business" color="#168CFF" size={23} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label style={{ fontSize: 17, fontWeight: '700' }}>{bank.bankName}</Label>
                    <Label muted style={{ fontSize: 12 }}>
                      {bank.lastSyncAt
                        ? `Synchronisée le ${date(bank.lastSyncAt)}`
                        : 'Jamais synchronisée'}
                    </Label>
                  </View>
                  <View
                    style={{
                      backgroundColor: connected ? '#005439' : '#4A3315',
                      borderRadius: 20,
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                    }}
                  >
                    <Label
                      style={{
                        color: connected ? '#3DFFB0' : '#FBBF24',
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                    >
                      {connected ? 'Connectée' : 'À reconnecter'}
                    </Label>
                  </View>
                </View>
                {bankAccounts.length > 0 ? (
                  bankAccounts.map((account) => (
                    <View
                      key={account.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        padding: 11,
                        borderRadius: 10,
                        backgroundColor: c.elevated,
                      }}
                    >
                      <Ionicons name="card-outline" color={c.muted} size={20} />
                      <View style={{ flex: 1 }}>
                        <Label style={{ fontWeight: '600' }}>
                          {account.maskedName || 'Compte bancaire'}
                        </Label>
                        <Label muted style={{ fontSize: 11 }}>
                          {account.accountType || 'Compte'}
                        </Label>
                      </View>
                    </View>
                  ))
                ) : (
                  <Label muted style={{ fontSize: 12 }}>
                    Aucun compte détaillé transmis par la banque.
                  </Label>
                )}
                {connected ? (
                  <Button
                    title="Synchroniser maintenant"
                    secondary
                    onPress={() => nav.navigate('Sync', { connectionId: bank.id })}
                  />
                ) : (
                  <Button
                    title="Reconnecter avec Tink"
                    onPress={() => openConsent(bank.bankName)}
                  />
                )}
                <Button
                  title="Retirer la connexion"
                  secondary
                  loading={remove.isPending}
                  onPress={() => remove.mutate(bank.id)}
                />
              </Card>
            );
          })}
          <Label style={{ fontSize: 19, fontWeight: '700', marginTop: 4 }}>
            Dernières transactions
          </Label>
          <Card style={{ paddingVertical: 4 }}>
            {transactions.isLoading ? (
              <ActivityIndicator color="#168CFF" style={{ margin: 20 }} />
            ) : transactions.data?.items.length ? (
              transactions.data.items.map((transaction, index) => (
                <View
                  key={transaction.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                    paddingVertical: 11,
                    borderBottomWidth: index === transactions.data!.items.length - 1 ? 0 : 0.5,
                    borderColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: c.elevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={transaction.amount >= 0 ? 'arrow-down' : 'arrow-up'}
                      color={transaction.amount >= 0 ? '#3DFFB0' : '#FF7485'}
                      size={18}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label numberOfLines={1} style={{ fontWeight: '600' }}>
                      {transaction.merchantName || 'Transaction bancaire'}
                    </Label>
                    <Label muted style={{ fontSize: 11 }}>
                      {date(transaction.bookedAt)} · {transaction.category || 'Autre'}
                    </Label>
                  </View>
                  <Label
                    style={{
                      fontWeight: '700',
                      color: transaction.amount >= 0 ? '#3DFFB0' : c.text,
                    }}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {money(transaction.amount)}
                  </Label>
                </View>
              ))
            ) : (
              <View style={{ padding: 18, alignItems: 'center', gap: 6 }}>
                <Ionicons name="receipt-outline" color={c.muted} size={26} />
                <Label muted style={{ textAlign: 'center' }}>
                  Aucune transaction importée pour le moment.
                </Label>
              </View>
            )}
          </Card>
          <Label muted style={{ fontSize: 11, textAlign: 'center' }}>
            {transactions.data
              ? `${transactions.data.total} transaction${transactions.data.total > 1 ? 's' : ''} importée${transactions.data.total > 1 ? 's' : ''}`
              : ''}
          </Label>
          <Label style={{ fontSize: 19, fontWeight: '700', marginTop: 8 }}>
            Ajouter une banque
          </Label>
        </>
      )}
      <Label style={{ fontSize: 23, lineHeight: 30, fontWeight: '700' }}>
        {connections.data?.length ? 'Choisir une banque' : 'Connecter une banque'}
      </Label>
      <Search value={search} onChangeText={setSearch} placeholder="Rechercher votre banque" />
      <View>
        {banks
          .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
          .map(([name, mark, color], i) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => {
                openConsent(name);
              }}
              style={{
                minHeight: 61,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderBottomWidth: 0.5,
                borderColor: c.border,
              }}
            >
              <View
                style={{
                  height: 39,
                  width: 39,
                  borderRadius: 7,
                  backgroundColor: color,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {name === 'Autres banques' ? (
                  <Ionicons name="lock-closed" size={22} color="white" />
                ) : (
                  <ReferenceCrop
                    rect={[
                      1179,
                      [119, 150, 180, 211, 242, 272, 304][
                        banks.findIndex(([bank]) => bank === name)
                      ]!,
                      24,
                      24,
                    ]}
                    width={39}
                    style={{ borderRadius: 7 }}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Label style={{ fontSize: 14, fontWeight: '500' }}>{name}</Label>
                {name === 'Autres banques' && (
                  <Label muted style={{ fontSize: 10 }}>
                    via notre partenaire agréé
                  </Label>
                )}
              </View>
              <Ionicons name="chevron-forward" color={c.muted} size={17} />
            </Pressable>
          ))}
      </View>
      {queryError && <State error={queryError} retry={() => cache.invalidateQueries()} />}
      {remove.error && <State error={remove.error} />}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#000000B8',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Card style={{ width: '100%', maxWidth: 350, gap: 17, padding: 22 }}>
            <Label style={{ fontSize: 21, fontWeight: '700' }}>{selected}</Label>
            <Label muted>
              Vous allez être redirigé vers Tink pour vous authentifier directement auprès de votre
              banque.
            </Label>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              onPress={() => setConsent(!consent)}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 }}
            >
              <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={25} color="#168CFF" />
              <Label style={{ flex: 1, fontSize: 12 }}>
                J’autorise l’import et l’analyse de mes transactions bancaires.
              </Label>
            </Pressable>
            {connect.error && (
              <Label style={{ color: '#FF7485', fontSize: 12 }}>{connect.error.message}</Label>
            )}
            <Button
              title="Autoriser et continuer"
              disabled={!consent}
              loading={connect.isPending}
              onPress={() => connect.mutate()}
            />
            <Button title="Annuler" secondary onPress={() => setSelected(null)} />
          </Card>
        </View>
      </Modal>
    </Page>
  );
}
export function TinkCallbackScreen() {
  const nav = useNav();
  const cache = useQueryClient();
  const token = useLiveToken();
  const [error, setError] = useState<Error | null>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || !token || submitted.current) return;
    submitted.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) {
      setError(new Error(params.get('message') ?? 'Tink n’a retourné aucun code.'));
      return;
    }
    api
      .completeTink(code, params.get('credentials_id'), params.get('state'), idempotencyKey())
      .then((bank) => {
        cache.invalidateQueries();
        nav.replace('Sync', { connectionId: bank.id });
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason : new Error('Connexion Tink impossible.')),
      );
  }, [token]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!useSession.getState().token)
        setError(
          new Error(
            'Votre session Google n’est plus active. Reconnectez-vous avant de relier votre banque.',
          ),
        );
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <Page fill style={{ justifyContent: 'center', gap: 18 }}>
      {error ? (
        <>
          <State error={error} />
          <Button title="Retour aux banques" onPress={() => nav.replace('Bank')} />
        </>
      ) : (
        <>
          <ActivityIndicator color="#168CFF" size="large" />
          <Label style={{ textAlign: 'center' }}>Connexion bancaire en cours…</Label>
        </>
      )}
    </Page>
  );
}
export function SyncScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'Sync'>>();
  const nav = useNav();
  const cache = useQueryClient();
  const key = useRef(idempotencyKey());
  const connectionId = route.params?.connectionId;
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      setProgress(10);
      const job = await api.queueSync(id, key.current);
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const current = await api.syncJob(job.id);
        setProgress(
          current.status === 'processing' ? Math.min(90, 35 + current.attempts * 15) : 20,
        );
        if (current.status === 'completed') return current;
        if (current.status === 'failed')
          throw new ApiError(
            503,
            current.errorCode ?? 'BANK_SYNC_FAILED',
            current.errorCode === 'CONSENT_EXPIRED' ||
            current.errorCode === 'TINK_TOKEN_MISSING' ||
            current.errorCode === 'TINK_TOKEN_INVALID' ||
            current.errorCode?.includes('401') ||
            current.errorCode?.includes('403')
              ? 'Votre connexion bancaire doit être renouvelée.'
              : 'La synchronisation bancaire a échoué.',
          );
      }
      throw new ApiError(
        504,
        'BANK_SYNC_TIMEOUT',
        'La synchronisation continue en arrière-plan. Revenez dans quelques instants.',
      );
    },
    onSuccess: () => cache.invalidateQueries(),
  });
  const run = useRef<string | null>(null);
  useEffect(() => {
    if (connectionId && run.current !== connectionId) {
      run.current = connectionId;
      key.current = idempotencyKey();
      mutation.mutate(connectionId);
    }
  }, [connectionId]);
  const preview = PREVIEW_ENABLED && !connectionId;
  const percent = preview ? 75 : mutation.isSuccess ? 100 : progress;
  const reconnectRequired =
    mutation.error instanceof ApiError &&
    [
      'CONSENT_EXPIRED',
      'TINK_TOKEN_MISSING',
      'TINK_TOKEN_INVALID',
      'TINK_TRANSACTIONS_401',
      'TINK_TRANSACTIONS_403',
    ].includes(mutation.error.code);
  const retry = () => {
    key.current = idempotencyKey();
    setProgress(0);
    mutation.mutate(connectionId!);
  };
  return (
    <Page
      fill
      style={{ alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32 }}
    >
      <Label style={{ fontSize: 23, lineHeight: 30, fontWeight: '700' }}>
        {mutation.isSuccess ? 'Analyse terminée' : 'Analyse en cours…'}
      </Label>
      <Label muted style={{ textAlign: 'center', fontSize: 15, lineHeight: 23 }}>
        Nous analysons vos transactions pour détecter vos abonnements et les économies possibles.
      </Label>
      <View
        style={{
          width: 163,
          height: 163,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 90,
          borderWidth: 16,
          borderColor: '#12283C',
          marginVertical: 10,
        }}
      >
        <View
          style={{
            position: 'absolute',
            inset: -16,
            borderRadius: 90,
            borderWidth: 16,
            borderColor: percent > 0 ? '#087AFF' : '#12283C',
            borderTopColor: percent === 75 ? '#12283C' : '#087AFF',
            transform: [{ rotate: '-40deg' }],
          }}
        />
        {mutation.isPending ? (
          <ActivityIndicator size="large" color="#168CFF" />
        ) : (
          <Label style={{ fontSize: 37, lineHeight: 46, fontWeight: '700' }}>{percent}%</Label>
        )}
      </View>
      <View style={{ gap: 17, width: '100%' }}>
        {[
          'Lecture des transactions',
          'Détection des abonnements',
          'Analyse des dépenses',
          'Comparaison des offres',
        ].map((text, i) => (
          <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons
              name="checkmark-circle"
              color={preview || mutation.isSuccess ? '#00DE81' : '#28475D'}
              size={25}
            />
            <Label muted style={{ fontSize: 13 }}>
              {text}
            </Label>
          </View>
        ))}
      </View>
      <Label muted style={{ fontSize: 12, textAlign: 'center' }}>
        Cette opération peut prendre{'\n'}quelques secondes.
      </Label>
      {mutation.error && (
        <View style={{ width: '100%', gap: 10 }}>
          <State error={mutation.error} retry={reconnectRequired ? undefined : retry} />
          {reconnectRequired && (
            <Button title="Reconnecter la banque" onPress={() => nav.replace('Bank')} />
          )}
        </View>
      )}
      {(preview || mutation.isSuccess) && (
        <View style={{ width: '100%' }}>
          <Button
            title="Voir mon résumé"
            onPress={() => nav.navigate('Main', { screen: 'Home' })}
          />
        </View>
      )}
    </Page>
  );
}
