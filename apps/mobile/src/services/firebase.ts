import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { initializeApp, getApps } from 'firebase/app';
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
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';

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

export function useGoogleSignIn() {
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId,
    iosClientId,
    webClientId,
  });
  return async (): Promise<FirebaseSession> => {
    const instance = requiredAuth();
    if (Platform.OS === 'web') {
      await setPersistence(instance, browserLocalPersistence);
      return session((await signInWithPopup(instance, new GoogleAuthProvider())).user);
    }
    const clientId = Platform.OS === 'android' ? androidClientId : iosClientId;
    if (!clientId)
      throw new Error(
        `La clé OAuth Google ${Platform.OS === 'android' ? 'Android' : 'iOS'} doit être renseignée dans la configuration du build.`,
      );
    const result = await promptAsync();
    if (result.type !== 'success') throw new Error('Connexion Google annulée.');
    const idToken = result.params.id_token;
    if (!idToken) throw new Error('Google n’a retourné aucun jeton d’identité.');
    return session(
      (await signInWithCredential(instance, GoogleAuthProvider.credential(idToken))).user,
    );
  };
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseSession> {
  return session((await signInWithEmailAndPassword(requiredAuth(), email.trim(), password)).user);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<FirebaseSession> {
  const result = await createUserWithEmailAndPassword(requiredAuth(), email.trim(), password);
  await updateProfile(result.user, { displayName: displayName.trim() });
  return session(result.user);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(requiredAuth(), email.trim());
}

export function watchFirebaseToken(callback: (value: FirebaseSession | null) => void): Unsubscribe {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onIdTokenChanged(
    auth,
    async (user) => callback(user ? await session(user) : null),
    () => callback(null),
  );
}

export async function signOutFirebase(): Promise<void> {
  if (auth) await signOut(auth);
}

export async function deleteCurrentFirebaseUser(): Promise<void> {
  if (auth?.currentUser) await deleteUser(auth.currentUser);
}
