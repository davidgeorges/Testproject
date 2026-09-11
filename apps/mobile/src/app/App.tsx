import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PREVIEW_ENABLED, useSession, useLiveToken } from '../store/session';
import { DEFAULT_ACCENT_COLOR, normalizeAccentColor } from '../theme/accent';
import { api } from '../services/api';
import { watchFirebaseToken } from '../services/firebase';
import { registerForPushNotifications } from '../services/notifications';
import { useColors, Label } from '../design/ui';
import {
  DashboardScreen,
  SubscriptionsScreen,
  SubscriptionDetail,
  SavingsScreen,
  RecommendationDetail,
  BottomBar,
} from '../design/MainScreens';
import { FinancesScreen } from '../features/finances/Finances';
import { DocumentsScreen, DocumentDetailScreen } from '../features/documents/Documents';
import { DeadlinesScreen } from '../features/deadlines/Deadlines';
import {
  Welcome,
  Login,
  Register,
  ResetPassword,
  Onboarding,
  BankScreen,
  SyncScreen,
  TinkCallbackScreen,
} from '../design/EntryScreens';
import {
  ProfileScreen,
  SettingsScreen,
  PremiumScreen,
  NotificationsScreen,
  SystemScreen,
  InfoScreen,
  MenuScreen,
} from '../design/AccountScreens';
import type { RootStackParams, TabsParams } from './navigation';
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 }, mutations: { retry: 0 } },
});
const navigation = createNavigationContainerRef<RootStackParams>();
const Stack = createNativeStackNavigator<RootStackParams>();
const Tabs = createBottomTabNavigator<TabsParams>();
const scenes = [
  'Splash',
  'Connexion',
  'Créer un compte',
  'Onboarding · 1/4',
  'Onboarding · 2/4',
  'Onboarding · 3/4',
  'Onboarding · 4/4',
  'Connexion bancaire',
  'Synchronisation',
  'Accueil',
  'Abonnements',
  'Finances',
  'Détail abonnement',
  'Économies',
  'Recommandation',
  'Premium',
  'Profil',
  'Notifications',
  'Paramètres',
  'Erreur',
  'Aucune économie',
  'Économie réalisée',
  'Menu',
  'Mode sombre',
];
function selectScene(i: number) {
  if (!navigation.isReady()) return;
  useSession.getState().setPreview(true);
  if (i >= 3 && i <= 6) {
    navigation.navigate('Onboarding', { step: i - 3 });
    return;
  }
  switch (i) {
    case 0:
      navigation.navigate('Welcome');
      break;
    case 1:
      navigation.navigate('Login');
      break;
    case 2:
      navigation.navigate('Register');
      break;
    case 7:
      navigation.navigate('Bank');
      break;
    case 8:
      navigation.navigate('Sync', { connectionId: undefined });
      break;
    case 9:
      navigation.navigate('Main', { screen: 'Home' });
      break;
    case 10:
      navigation.navigate('Main', { screen: 'Subscriptions' });
      break;
    case 11:
      navigation.navigate('Main', { screen: 'Finances' });
      break;
    case 12:
      navigation.navigate('Subscription', { id: 'netflix' });
      break;
    case 13:
      navigation.navigate('Main', { screen: 'Savings' });
      break;
    case 14:
      navigation.navigate('Recommendation', { id: 'mobile' });
      break;
    case 15:
      navigation.navigate('Main', { screen: 'Premium' });
      break;
    case 16:
      navigation.navigate('Main', { screen: 'Profile' });
      break;
    case 17:
      navigation.navigate('Notifications');
      break;
    case 18:
      navigation.navigate('Settings');
      break;
    case 19:
      navigation.navigate('System', { kind: 'error' });
      break;
    case 20:
      navigation.navigate('System', { kind: 'empty' });
      break;
    case 21:
      navigation.navigate('System', { kind: 'success' });
      break;
    case 22:
      navigation.navigate('Menu');
      break;
    case 23:
      useSession.getState().setTheme('dark');
      navigation.navigate('Main', { screen: 'Home' });
      break;
  }
}
function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <BottomBar active={props.state.routes[props.state.index]!.name as keyof TabsParams} />
      )}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} options={{ title: 'Accueil' }} />
      <Tabs.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{ title: 'Abonnements' }}
      />
      <Tabs.Screen name="Finances" component={FinancesScreen} options={{ title: 'Finances' }} />
      <Tabs.Screen name="Savings" component={SavingsScreen} options={{ title: 'Économies' }} />
      <Tabs.Screen name="Premium" component={PremiumScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tabs.Navigator>
  );
}
function Navigator({ onChange }: { onChange: () => void }) {
  const c = useColors();
  const dark = useSession((s) => s.theme) === 'dark';
  const token = useLiveToken();
  const authInitialized = useSession((s) => s.authInitialized);
  const base = dark ? DarkTheme : DefaultTheme;
  const redirectRestoredSession = () => {
    if (!authInitialized || !token || !navigation.isReady()) return;
    const route = navigation.getCurrentRoute();
    if (route && ['Welcome', 'Login', 'Register', 'ResetPassword'].includes(route.name))
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };
  useEffect(redirectRestoredSession, [authInitialized, token]);
  return (
    <NavigationContainer
      ref={navigation}
      linking={{
        prefixes: ['http://localhost:8081', 'subscriptionapp://'],
        config: { screens: { BankCallback: 'banking/callback' } },
      }}
      onReady={() => {
        onChange();
        redirectRestoredSession();
      }}
      onStateChange={onChange}
      theme={{
        ...base,
        colors: {
          ...base.colors,
          background: c.background,
          card: c.background,
          text: c.text,
          border: c.border,
          primary: '#087AFF',
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={token || PREVIEW_ENABLED ? 'Main' : 'Welcome'}
        screenOptions={({ navigation: nav }) => ({
          contentStyle: { backgroundColor: c.background },
          animation: 'fade',
          headerTransparent: true,
          header: ({ options }) => {
            const controls = (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retour"
                  onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Main'))}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    opacity: pressed ? 0.78 : 1,
                  })}
                >
                  <Ionicons name="chevron-back" size={20} color={c.text} />
                </Pressable>
                {options.title ? (
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        minHeight: 30,
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                      }}
                    >
                      <Label style={{ textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
                        {options.title}
                      </Label>
                    </View>
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                <View style={{ width: 34 }} />
              </>
            );
            const style = {
              height: 52,
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              paddingHorizontal: 10,
            };
            return <View style={style}>{controls}</View>;
          },
        })}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPassword}
          options={{ title: 'Réinitialisation' }}
        />
        <Stack.Screen name="Onboarding" component={Onboarding} options={{ headerShown: false }} />
        <Stack.Screen name="Bank" component={BankScreen} />
        <Stack.Screen
          name="BankCallback"
          component={TinkCallbackScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Sync" component={SyncScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Subscription" component={SubscriptionDetail} options={{ title: '' }} />
        <Stack.Screen
          name="Recommendation"
          component={RecommendationDetail}
          options={{ title: 'Recommandation' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Paramètres' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications' }}
        />
        <Stack.Screen name="System" component={SystemScreen} />
        <Stack.Screen name="Info" component={InfoScreen} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
        <Stack.Screen name="Documents" component={DocumentsScreen} options={{ title: '' }} />
        <Stack.Screen name="Document" component={DocumentDetailScreen} options={{ title: '' }} />
        <Stack.Screen name="Deadlines" component={DeadlinesScreen} options={{ title: '' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
function Experience() {
  const { width, height } = useWindowDimensions();
  const [active, setActive] = useState(9);
  const desktop = Platform.OS === 'web' && width >= 760;
  const deviceHeight = active === 0 || (active >= 9 && active <= 15) ? 864 : 844;
  const scale = desktop ? Math.min(1, (height - 54) / deviceHeight) : 1;
  const c = useColors();
  const [picker, setPicker] = useState(false);
  const token = useLiveToken();
  const dark = useSession((s) => s.theme) === 'dark';
  const homePreview = active === 9;
  const homeChromeBackground = homePreview ? (dark ? '#0B0B0F' : '#F4F3F7') : c.background;
  const homeChromeText = homePreview ? (dark ? '#F8F7FA' : '#171719') : c.text;
  const onChange = () => {
    const route = navigation.getCurrentRoute() as
      | ({
          name: keyof RootStackParams | keyof TabsParams;
          state?: { routes: Array<{ name: string }>; index: number };
          params?: unknown;
        } & object)
      | undefined;
    const names: Record<string, number> = {
      Welcome: 0,
      Login: 1,
      Register: 2,
      Bank: 7,
      Sync: 8,
      Home: 9,
      Subscriptions: 10,
      Finances: 11,
      Subscription: 12,
      Savings: 13,
      Recommendation: 14,
      Premium: 15,
      Profile: 16,
      Notifications: 17,
      Settings: 18,
      Menu: 22,
      Main: 9,
      System: 19,
    };
    if (route) {
      if (route.name === 'Main') {
        const tab = route.state?.routes[route.state.index]?.name;
        if (tab && typeof tab === 'string' && Object.hasOwn(names, tab)) {
          setActive(names[tab] ?? 9);
          return;
        }
      }
      if (route.name === 'Onboarding') {
        setActive(3 + ((route.params as { step?: number })?.step ?? 0));
      } else if (route.name === 'System') {
        const kind = (route.params as { kind: string }).kind;
        setActive(kind === 'error' ? 19 : kind === 'empty' ? 20 : 21);
      } else setActive(names[route.name] ?? 9);
    }
  };
  const list = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: 3, paddingVertical: 8 }}
    >
      {scenes.map((name, i) => (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel={`Écran ${i + 1} : ${name}`}
          accessibilityState={{ selected: i === active }}
          onPress={() => {
            setActive(i);
            setPicker(false);
            selectScene(i);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 8,
            backgroundColor: i === active ? '#254B703D' : pressed ? '#FFFFFF0A' : 'transparent',
            borderWidth: 1,
            borderColor: i === active ? '#335776' : 'transparent',
          })}
        >
          <Text
            style={{
              fontSize: 11,
              color: i === active ? '#68B4FF' : '#536A83',
              width: 20,
              fontVariant: ['tabular-nums'],
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </Text>
          <Text
            style={{
              color: i === active ? '#EFF6FF' : '#A2B2C7',
              fontSize: 12,
              fontWeight: i === active ? '600' : '400',
            }}
          >
            {name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
  return (
    <LinearGradient
      colors={
        desktop ? ['#182633', '#0D1723', '#111C29'] : [c.background, c.background, c.background]
      }
      style={{ flex: 1 }}
    >
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {PREVIEW_ENABLED && !desktop && Platform.OS === 'web' && (
        <View
          style={{
            height: 30,
            backgroundColor: '#162438',
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#B4C5DA', fontSize: 10 }}>
            {token ? 'COMPTE GOOGLE CONNECTÉ · BANQUE À RELIER' : 'MAQUETTE · DONNÉES D’EXEMPLE'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choisir un écran"
            onPress={() => setPicker(!picker)}
            hitSlop={10}
          >
            <Ionicons name="grid-outline" color="#91BCED" size={17} />
          </Pressable>
        </View>
      )}
      {picker && (
        <View
          style={{
            position: 'absolute',
            top: 30,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            backgroundColor: '#101D2E',
            padding: 16,
          }}
        >
          {list}
        </View>
      )}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: desktop ? 58 : 0,
          padding: desktop ? 20 : 0,
        }}
      >
        {PREVIEW_ENABLED && desktop && (
          <View style={{ width: 240, height: '100%', maxHeight: deviceHeight, gap: 12 }}>
            <View style={{ paddingVertical: 10, gap: 8 }}>
              <Text
                style={{ fontSize: 10, letterSpacing: 2.5, color: '#6482A5', fontWeight: '700' }}
              >
                PROJET SANS NOM
              </Text>
              <Text
                style={{ fontSize: 27, fontWeight: '600', color: '#ECF4FF', letterSpacing: -0.5 }}
              >
                Interface V1
              </Text>
              <Text style={{ fontSize: 12, lineHeight: 18, color: '#8CA2BB' }}>
                Les 24 vues de votre maquette.{'\n'}Sélectionnez un écran pour l’explorer.
              </Text>
            </View>
            {list}
            <View
              style={{ paddingVertical: 8, gap: 6, borderTopWidth: 1, borderTopColor: '#283C50' }}
            >
              <Text style={{ fontSize: 10, color: '#A8B8CB' }}>
                ● {token ? 'Compte Firebase connecté' : 'Connexion requise'}
              </Text>
              <Text style={{ fontSize: 10, lineHeight: 15, color: '#607992' }}>
                Les tarifs et fonctionnalités illustrés{'\n'}ne constituent pas des offres actives.
              </Text>
            </View>
          </View>
        )}
        <View
          style={
            desktop
              ? { width: 390 * scale, height: deviceHeight * scale }
              : { flex: 1, height: '100%' }
          }
        >
          <View
            style={
              desktop
                ? {
                    width: 390,
                    height: deviceHeight,
                    transform: [{ scale }],
                    transformOrigin: 'top left',
                    borderWidth: 2,
                    borderColor: '#41566E',
                    borderRadius: 31,
                    overflow: 'hidden',
                    backgroundColor: homeChromeBackground,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 20 },
                    shadowRadius: 40,
                    shadowOpacity: 0.5,
                  }
                : { flex: 1, backgroundColor: homeChromeBackground }
            }
          >
            {Platform.OS === 'web' && (
              <View
                style={{
                  height: 35,
                  paddingTop: 8,
                  paddingHorizontal: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: homeChromeBackground,
                }}
              >
                <Label
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: homeChromeText,
                  }}
                >
                  9:41
                </Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="cellular" size={12} color={homeChromeText} />
                  <Ionicons name="wifi" size={12} color={homeChromeText} />
                  <Ionicons name="battery-full" size={19} color={homeChromeText} />
                </View>
              </View>
            )}
            <SafeAreaView
              edges={Platform.OS === 'web' ? [] : ['top', 'bottom']}
              style={{ flex: 1, backgroundColor: homeChromeBackground }}
            >
              <Navigator onChange={onChange} />
            </SafeAreaView>
            {desktop && (
              <View
                style={{
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: homeChromeBackground,
                }}
              >
                <View
                  style={{
                    height: 4,
                    width: 115,
                    backgroundColor: homeChromeText,
                    borderRadius: 5,
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
export default function App() {
  useEffect(
    () =>
      watchFirebaseToken((firebase) => {
        useSession.getState().setToken(firebase?.token ?? null);
        useSession.getState().setIdentity(firebase);
        useSession.getState().setAuthInitialized(true);
        if (firebase) {
          useSession.getState().setPreview(false);
          const firstName =
            firebase.displayName?.trim().split(/\s+/)[0] ||
            firebase.email?.split('@')[0] ||
            'Utilisateur';
          void api
            .profile()
            .then(async (profile) =>
              profile.firstName === 'Utilisateur'
                ? api.saveProfile({
                    ...profile,
                    firstName,
                    accentColor: normalizeAccentColor(profile.accentColor) ?? DEFAULT_ACCENT_COLOR,
                  })
                : profile,
            )
            .then((profile) => {
              useSession.getState().setTheme(profile.theme);
              useSession
                .getState()
                .setAccentColor(normalizeAccentColor(profile.accentColor) ?? DEFAULT_ACCENT_COLOR);
            })
            .catch(() => undefined);
          void registerForPushNotifications().catch(() => undefined);
        }
      }),
    [],
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <Experience />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
