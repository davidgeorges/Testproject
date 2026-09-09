import { initializeApp, getApps } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Unsubscribe,
} from 'firebase/auth';
import { Platform } from 'react-native';

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
const auth = app ? getAuth(app) : null;

export async function signInWithGoogle(): Promise<string> {
  if (Platform.OS !== 'web')
    throw new Error('La connexion Google native sera activée avec le build iOS/Android.');
  if (!auth) throw new Error('Firebase n’est pas configuré.');
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user.getIdToken();
}

export function watchFirebaseToken(callback: (token: string | null) => void): Unsubscribe {
  if (!auth) return () => undefined;
  return onIdTokenChanged(auth, async (user) => callback(user ? await user.getIdToken() : null));
}

export async function signOutFirebase(): Promise<void> {
  if (auth) await signOut(auth);
}
