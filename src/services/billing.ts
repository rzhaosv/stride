import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
export const ENTITLEMENT = 'pro';

let configured = false;

export function configureBilling() {
  if (configured || Platform.OS !== 'ios' || !RC_IOS_KEY) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: RC_IOS_KEY });
    configured = true;
  } catch {
    /* ignore — app still works in free mode */
  }
}

export function isPremium(info: CustomerInfo | null | undefined): boolean {
  return !!info && !!info.entitlements.active[ENTITLEMENT];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function addPremiumListener(cb: (isPro: boolean) => void): () => void {
  if (!configured) return () => {};
  const listener = (info: CustomerInfo) => cb(isPremium(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return isPremium(customerInfo);
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  return isPremium(info);
}

export function isCancelledError(e: any): boolean {
  return !!e && (e.userCancelled === true || e.code === '1');
}
