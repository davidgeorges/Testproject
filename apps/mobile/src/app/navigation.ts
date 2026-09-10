import type { NavigatorScreenParams } from '@react-navigation/native';
export type TabsParams = {
  Home: undefined;
  Subscriptions: undefined;
  Finances: undefined;
  Savings: undefined;
  Premium: undefined;
  Profile: undefined;
};
export type RootStackParams = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
  Onboarding: { step?: number } | undefined;
  Main: NavigatorScreenParams<TabsParams> | undefined;
  Bank: undefined;
  BankCallback: undefined;
  Sync: { connectionId?: string } | undefined;
  Subscription: { id: string };
  Recommendation: { id: string };
  Settings: undefined;
  Notifications: undefined;
  System: { kind: 'error' | 'empty' | 'success' };
  Menu: undefined;
  Info: { kind: 'security' | 'privacy' | 'support' };
};
