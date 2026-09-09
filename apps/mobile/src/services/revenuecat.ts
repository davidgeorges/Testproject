import { Platform } from 'react-native';
import Purchases, { PACKAGE_TYPE } from 'react-native-purchases';

const apiKey =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY
    : Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY;

let configuredFor: string | null = null;

async function configure(userId: string) {
  if (!apiKey) throw new Error('RevenueCat doit être configuré pour cette plateforme.');
  if (configuredFor === userId) return;
  if (!configuredFor) Purchases.configure({ apiKey });
  await Purchases.logIn(userId);
  configuredFor = userId;
}

export async function purchasePremium(userId: string, plan: 'monthly' | 'annual') {
  await configure(userId);
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const wanted = plan === 'annual' ? PACKAGE_TYPE.ANNUAL : PACKAGE_TYPE.MONTHLY;
  const selected = packages.find((item) => item.packageType === wanted);
  if (!selected) throw new Error(`L’offre Premium ${plan === 'annual' ? 'annuelle' : 'mensuelle'} est absente de RevenueCat.`);
  await Purchases.purchasePackage(selected);
  return { productId: selected.product.identifier, transactionId: `${userId}:${selected.product.identifier}` };
}

export async function restorePremium(userId: string) {
  await configure(userId);
  const customer = await Purchases.restorePurchases();
  const entitlement = customer.entitlements.active.premium
    ?? Object.values(customer.entitlements.active)[0];
  if (!entitlement) throw new Error('Aucun abonnement Premium actif n’a été trouvé.');
  return { productId: entitlement.productIdentifier, transactionId: `${userId}:${entitlement.productIdentifier}` };
}
