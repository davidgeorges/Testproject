import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Animated,
  Easing,
  TextInput,
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
import {
  accentTextColor,
  accentWithAlpha,
  DEFAULT_ACCENT_COLOR,
  mixAccentColor,
  normalizeAccentColor,
} from '../theme/accent';
import type { RootStackParams } from '../app/navigation';
import { date, money } from '../utils/format';
export function Welcome() {
  const nav = useNav();
  const intro = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.timing(intro, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1250, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1250, useNativeDriver: true }),
      ]),
    );
    const orbiting = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    entrance.start();
    floating.start();
    pulsing.start();
    orbiting.start();
    return () => {
      entrance.stop();
      floating.stop();
      pulsing.stop();
      orbiting.stop();
    };
  }, [float, intro, orbit, pulse]);

  return (
    <LinearGradient
      colors={['#02060C', '#0B1420', '#182432']}
      locations={[0, 0.55, 1]}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={['#20F2A01A', 'transparent']}
        style={{
          position: 'absolute',
          left: 45,
          right: 45,
          top: 190,
          height: 280,
          borderRadius: 150,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Commencer"
        onPress={() => nav.navigate('Login')}
        style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={{
            opacity: intro,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            transform: [
              {
                translateY: Animated.add(
                  intro.interpolate({ inputRange: [0, 1], outputRange: [105, 48] }),
                  float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }),
                ),
              },
              { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
            ],
          }}
        >
          <View style={{ width: 142, height: 142, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={{
                position: 'absolute',
                width: 132,
                height: 132,
                borderRadius: 66,
                borderWidth: 1,
                borderColor: '#7A8A8566',
                transform: [
                  {
                    rotate: orbit.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 5,
                  left: 33,
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: '#20F2A0',
                  shadowColor: '#20F2A0',
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: 2,
                  bottom: 41,
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: '#DDE5ED',
                }}
              />
            </Animated.View>
            <Animated.View
              style={{
                position: 'absolute',
                width: 112,
                height: 112,
                borderRadius: 56,
                backgroundColor: '#20F2A018',
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }),
                transform: [
                  { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] }) },
                ],
              }}
            />
            <LinearGradient
              colors={['#2B343B', '#111820', '#070C11']}
              style={{
                height: 94,
                width: 94,
                borderRadius: 29,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#78859088',
                shadowColor: '#DDE7F0',
                shadowRadius: 24,
                shadowOpacity: 0.24,
                shadowOffset: { width: 0, height: 10 },
              }}
            >
              <Ionicons name="layers" size={55} color="#F1F5F9" />
            </LinearGradient>
          </View>
          <View style={{ alignItems: 'center', gap: 7 }}>
            <Label
              style={{
                fontSize: 31,
                lineHeight: 38,
                fontWeight: '800',
                color: 'white',
                letterSpacing: -0.8,
              }}
            >
              Votre application
            </Label>
            <Label style={{ fontSize: 18, lineHeight: 25, color: '#A6B0BE', textAlign: 'center' }}>
              Votre argent mérite mieux
            </Label>
          </View>
          <View style={{ flexDirection: 'row', gap: 13, marginTop: 13 }}>
            {[
              ['reader-outline', 'Analyse'],
              ['search-outline', 'Compare'],
              ['wallet-outline', 'Économise'],
            ].map(([icon, label], index) => (
              <Animated.View
                key={label}
                style={{
                  alignItems: 'center',
                  gap: 7,
                  opacity: intro,
                  transform: [
                    {
                      translateY: intro.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28 + index * 8, 0],
                      }),
                    },
                  ],
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#111820',
                    borderWidth: 1,
                    borderColor: '#2D3842',
                  }}
                >
                  <Ionicons name={icon as IconName} size={21} color="#EFF3F7" />
                </View>
                <Label style={{ color: '#AAB4C0', fontSize: 11 }}>{label}</Label>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </Pressable>
      <Animated.View
        style={{
          paddingHorizontal: 30,
          paddingBottom: 35,
          gap: 7,
          opacity: intro,
          transform: [
            { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          ],
        }}
      >
        <Label style={{ textAlign: 'center', fontSize: 12, color: '#A0ABB8' }}>
          Un avenir plus serein{'\n'}commence aujourd’hui
        </Label>
        <Label style={{ textAlign: 'center', fontSize: 10, color: '#687482' }}>
          Touchez l’écran pour commencer · Nom à définir
        </Label>
      </Animated.View>
    </LinearGradient>
  );
}

function GlassAuthField({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  password = false,
}: {
  icon: IconName;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  password?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const c = useColors();
  const accent = normalizeAccentColor(useSession((s) => s.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  return (
    <View style={{ gap: 8 }}>
      <Label style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>{label}</Label>
      <View
        style={{
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          secureTextEntry={password && !visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            minHeight: 52,
            paddingHorizontal: 12,
            color: c.text,
            fontSize: 14,
          }}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onPress={() => setVisible((current) => !current)}
            style={{ width: 38, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={c.muted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function AuthScreen({ register = false }: { register?: boolean }) {
  const nav = useNav();
  const c = useColors();
  const isDark = useSession((state) => state.theme) === 'dark';
  const authAccent =
    normalizeAccentColor(useSession((state) => state.accentColor)) ?? DEFAULT_ACCENT_COLOR;
  const authForeground = accentTextColor(authAccent);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accept, setAccept] = useState(false);
  const [message, setMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const authIntro = useRef(new Animated.Value(0)).current;
  const authPulse = useRef(new Animated.Value(0)).current;
  const googleSignIn = useGoogleSignIn();
  const rules = [
    ['Au moins 8 caractères', password.length >= 8],
    ['Une majuscule', /[A-Z]/.test(password)],
    ['Un chiffre', /\d/.test(password)],
  ] as const;
  useEffect(() => {
    const entrance = Animated.timing(authIntro, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(authPulse, { toValue: 1, duration: 1450, useNativeDriver: true }),
        Animated.timing(authPulse, { toValue: 0, duration: 1450, useNativeDriver: true }),
      ]),
    );
    entrance.start();
    pulsing.start();
    return () => {
      entrance.stop();
      pulsing.stop();
    };
  }, [authIntro, authPulse]);
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
        ? await api.saveProfile({
            ...existing,
            firstName,
            accentColor: normalizeAccentColor(existing.accentColor) ?? DEFAULT_ACCENT_COLOR,
          })
        : existing;
    useSession.getState().setTheme(profile.theme);
    useSession
      .getState()
      .setAccentColor(normalizeAccentColor(profile.accentColor) ?? DEFAULT_ACCENT_COLOR);
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
      if (!firebase) return;
      await finishAuthentication(firebase);
      nav.navigate('Main');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connexion Google impossible.');
    } finally {
      setAuthBusy(false);
    }
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 48,
          left: 62,
          width: 255,
          height: 255,
          borderRadius: 128,
          backgroundColor: accentWithAlpha(authAccent, 0.08),
          opacity: authPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }),
          transform: [
            { scale: authPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) },
          ],
        }}
      />
      <Page
        fill
        transparent
        style={{
          gap: register ? 15 : 18,
          paddingHorizontal: 22,
          paddingTop: register ? 60 : 66,
          paddingBottom: 22,
        }}
      >
        <Animated.View
          style={{
            gap: register ? 15 : 18,
            opacity: authIntro,
            transform: [
              { translateY: authIntro.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
            ],
          }}
        >
          <View style={{ alignItems: 'center', gap: 14 }}>
            <LinearGradient
              colors={[
                mixAccentColor(authAccent, '#FFFFFF', isDark ? 0.1 : 0.2),
                mixAccentColor(authAccent, '#000000', isDark ? 0.16 : 0.06),
              ]}
              style={{
                width: 66,
                height: 66,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border,
                shadowColor: authAccent,
                shadowOpacity: 0.18,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
              }}
            >
              <Ionicons
                name={register ? 'person-add-outline' : 'layers'}
                size={34}
                color={authForeground}
              />
            </LinearGradient>
            <View style={{ alignItems: 'center', gap: 5 }}>
              <Label
                style={{ fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7 }}
              >
                {register ? 'Créer un compte' : 'Bienvenue !'}
              </Label>
              <Label style={{ color: c.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' }}>
                {register
                  ? 'Quelques informations pour bien commencer.'
                  : 'Retrouvez une vision claire de vos dépenses.'}
              </Label>
            </View>
          </View>

          <LinearGradient
            colors={[c.surface, c.surface]}
            style={{
              gap: register ? 13 : 15,
              padding: 17,
              borderRadius: 25,
              borderWidth: 1,
              borderColor: c.border,
              shadowColor: '#000',
              shadowOpacity: 0.42,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
            }}
          >
            {register && (
              <GlassAuthField
                icon="person-outline"
                label="Nom complet"
                placeholder="Jean Dupont"
                value={name}
                onChangeText={setName}
              />
            )}
            <GlassAuthField
              icon="mail-outline"
              label="Email"
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
            />
            <GlassAuthField
              icon="lock-closed-outline"
              label="Mot de passe"
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={setPassword}
              password
            />
            {register ? (
              <View style={{ gap: 7 }}>
                {rules.map(([label, valid]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={valid ? authAccent : c.muted}
                    />
                    <Label style={{ color: c.muted, fontSize: 11 }}>{label}</Label>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: accept }}
                  onPress={() => setAccept(!accept)}
                  style={{ flexDirection: 'row', gap: 9, minHeight: 40, alignItems: 'center' }}
                >
                  <Ionicons
                    name={accept ? 'checkbox' : 'square-outline'}
                    color={accept ? authAccent : c.muted}
                    size={20}
                  />
                  <Label style={{ flex: 1, fontSize: 11, color: c.muted }}>
                    J’accepte les <Label style={{ fontSize: 11, color: authAccent }}>CGU</Label> et
                    la{' '}
                    <Label style={{ fontSize: 11, color: authAccent }}>
                      Politique de confidentialité
                    </Label>
                  </Label>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => nav.navigate('ResetPassword')}
                style={{ alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center' }}
              >
                <Label style={{ color: authAccent, fontSize: 12, fontWeight: '600' }}>
                  Mot de passe oublié ?
                </Label>
              </Pressable>
            )}
            {message && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  borderRadius: 12,
                  padding: 10,
                  backgroundColor: '#3B151B',
                }}
              >
                <Ionicons name="alert-circle-outline" size={17} color="#FF7D8D" />
                <Label style={{ flex: 1, fontSize: 11, color: '#FF9EAA' }}>{message}</Label>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={authBusy}
              onPress={() => void submit()}
              style={({ pressed }) => ({ opacity: pressed || authBusy ? 0.72 : 1 })}
            >
              <LinearGradient
                colors={[authAccent, mixAccentColor(authAccent, '#000000', 0.18)]}
                style={{
                  minHeight: 52,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: authAccent,
                  shadowOpacity: 0.24,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 7 },
                }}
              >
                {authBusy ? (
                  <ActivityIndicator color={authForeground} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Label style={{ color: authForeground, fontSize: 14, fontWeight: '800' }}>
                      {register ? 'Créer mon compte' : 'Se connecter'}
                    </Label>
                    <Ionicons name="arrow-forward" size={18} color={authForeground} />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </LinearGradient>

          {!register && (
            <>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
                <Label style={{ color: c.muted, fontSize: 11 }}>ou continuer avec</Label>
                <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
              </View>
              <Pressable
                accessibilityLabel="Connexion Google"
                accessibilityRole="button"
                disabled={authBusy}
                onPress={() => void googleLogin()}
                style={({ pressed }) => ({
                  opacity: pressed || authBusy ? 0.7 : 1,
                  height: 52,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  backgroundColor: c.surface,
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Ionicons name="logo-google" size={21} color={c.text} />
                <Label style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>
                  Continuer avec Google
                </Label>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => nav.navigate('Register')}
                style={{ alignItems: 'center', minHeight: 42, justifyContent: 'center' }}
              >
                <Label style={{ color: c.muted, fontSize: 12 }}>
                  Pas encore de compte ?{' '}
                  <Label style={{ fontSize: 12, color: authAccent, fontWeight: '700' }}>
                    Créer un compte
                  </Label>
                </Label>
              </Pressable>
            </>
          )}
        </Animated.View>
        <View style={{ flex: 1, minHeight: 6 }} />
        <View
          style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="shield-checkmark-outline" size={14} color={c.muted} />
          <Label style={{ fontSize: 9, lineHeight: 14, color: c.muted, textAlign: 'center' }}>
            Connexion sécurisée par Firebase Authentication
          </Label>
        </View>
      </Page>
    </View>
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
    <Page style={{ paddingTop: 64 }}>
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
    <Page style={{ gap: 15, paddingTop: 62 }}>
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
