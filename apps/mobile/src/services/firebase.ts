import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { FirebaseError, initializeApp, getApps } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  initializeAuth,
  onIdTokenChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';

const initialWebOAuthParams =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash
    ? new URLSearchParams(window.location.hash.slice(1))
    : null;

WebBrowser.maybeCompleteAuthSession();

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const configured = Object.values(config).every(Boolean);
const app = configured ? (getApps()[0] ?? initializeApp(config)) : null;

function nativeAuth(): Auth | null {
  if (!app) return null;
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

const auth = nativeAuth();

export type FirebaseSession = {
  token: string;
  userId: string;
  displayName: string | null;
  email: string | null;
};

async function session(user: User): Promise<FirebaseSession> {
  return {
    token: await user.getIdToken(),
    userId: user.uid,
    displayName: user.displayName,
    email: user.email,
  };
}

function requiredAuth(): Auth {
  if (!auth) throw new Error('Firebase n’est pas configuré.');
  return auth;
}

function safeFirebaseError(error: unknown, fallback: string): Error {
  if (!(error instanceof FirebaseError))
    return error instanceof Error ? error : new Error(fallback);
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Adresse e-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Adresse e-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'Adresse e-mail ou mot de passe incorrect.',
    'auth/email-already-in-use': 'Cette adresse e-mail possède déjà un compte.',
    'auth/weak-password': 'Choisissez un mot de passe plus robuste.',
    'auth/invalid-email': 'L’adresse e-mail est invalide.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'auth/network-request-failed': 'La connexion réseau a échoué. Réessayez.',
    'auth/popup-closed-by-user': 'Connexion Google annulée.',
    'auth/requires-recent-login': 'Reconnectez-vous avant cette opération sensible.',
  };
  return new Error(messages[error.code] ?? fallback);
}

export function useGoogleSignIn() {
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const usesExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const expoOwner = Constants.expoConfig?.owner;
  const expoSlug = Constants.expoConfig?.slug;
  const expoProxyRedirectUri =
    usesExpoGo && expoOwner && expoSlug
      ? `https://auth.expo.io/@${expoOwner}/${expoSlug}`
      : undefined;
  const webRedirectUri =
    Platform.OS === 'web' ? AuthSession.makeRedirectUri({ path: 'Login' }) : undefined;
  const iosRedirectScheme = iosClientId
    ? `com.googleusercontent.apps.${iosClientId.split('.apps.googleusercontent.com')[0]}`
    : undefined;
  const [request, , promptAsync] = Google.useAuthRequest(
    {
      androidClientId: androidClientId ?? webClientId,
      iosClientId: usesExpoGo ? webClientId : (iosClientId ?? webClientId),
      webClientId,
      redirectUri: webRedirectUri ?? expoProxyRedirectUri,
      responseType:
        usesExpoGo || Platform.OS === 'web' ? AuthSession.ResponseType.IdToken : undefined,
      selectAccount: true,
    },
    iosRedirectScheme ? { native: `${iosRedirectScheme}:/oauthredirect` } : undefined,
  );
  return async (): Promise<FirebaseSession | null> => {
    try {
      const instance = requiredAuth();
      if (Platform.OS === 'web') {
        await setPersistence(instance, browserLocalPersistence);
        if (!request?.url || typeof window === 'undefined')
          throw new Error('La connexion Google n’est pas encore prête. Réessayez dans un instant.');
        const state = new URL(request.url).searchParams.get('state');
        if (!state) throw new Error('La connexion Google n’a pas pu être sécurisée.');
        window.sessionStorage.setItem('google-oauth-state', state);
        window.location.assign(request.url);
        return null;
      }
      const clientId = usesExpoGo
        ? webClientId
        : Platform.OS === 'android'
          ? androidClientId
          : iosClientId;
      if (!clientId)
        throw new Error(
          `La clé OAuth Google ${Platform.OS === 'android' ? 'Android' : 'iOS'} doit être renseignée dans la configuration du build.`,
        );
      const result =
        usesExpoGo && request?.url && expoProxyRedirectUri
          ? await promptAsync({
              url: `${expoProxyRedirectUri}/start?authUrl=${encodeURIComponent(request.url)}&returnUrl=${encodeURIComponent(AuthSession.getDefaultReturnUrl())}`,
            })
          : await promptAsync();
      if (result.type !== 'success') throw new Error('Connexion Google annulée.');
      const idToken = result.params.id_token;
      if (!idToken) throw new Error('Google n’a retourné aucun jeton d’identité.');
      return session(
        (await signInWithCredential(instance, GoogleAuthProvider.credential(idToken))).user,
      );
    } catch (error) {
      throw safeFirebaseError(error, 'Connexion Google impossible.');
    }
  };
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseSession> {
  try {
    return session((await signInWithEmailAndPassword(requiredAuth(), email.trim(), password)).user);
  } catch (error) {
    throw safeFirebaseError(error, 'Connexion impossible.');
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<FirebaseSession> {
  try {
    const result = await createUserWithEmailAndPassword(requiredAuth(), email.trim(), password);
    await updateProfile(result.user, { displayName: displayName.trim() });
    return session(result.user);
  } catch (error) {
    throw safeFirebaseError(error, 'Création du compte impossible.');
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(requiredAuth(), email.trim());
  } catch (error) {
    throw safeFirebaseError(error, 'Envoi impossible.');
  }
}

export function watchFirebaseToken(callback: (value: FirebaseSession | null) => void): Unsubscribe {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  const idToken = initialWebOAuthParams?.get('id_token');
  const returnedState = initialWebOAuthParams?.get('state');
  const expectedState =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.sessionStorage.getItem('google-oauth-state')
      : null;
  let completingWebRedirect = Boolean(idToken && expectedState && returnedState === expectedState);
  const unsubscribe = onIdTokenChanged(
    auth,
    async (user) => {
      if (!user && completingWebRedirect) return;
      callback(user ? await session(user) : null);
    },
    () => callback(null),
  );
  if (completingWebRedirect && idToken && typeof window !== 'undefined') {
    window.sessionStorage.removeItem('google-oauth-state');
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    void signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).catch(() => {
      completingWebRedirect = false;
      callback(null);
    });
  }
  return unsubscribe;
}

export async function signOutFirebase(): Promise<void> {
  if (auth) await signOut(auth);
}

export async function deleteCurrentFirebaseUser(): Promise<void> {
  try {
    if (auth?.currentUser) await deleteUser(auth.currentUser);
  } catch (error) {
    throw safeFirebaseError(error, 'Suppression du compte impossible.');
  }
}
