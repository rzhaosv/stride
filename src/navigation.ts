import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Paywall: { fromOnboarding?: boolean } | undefined;
  Settings: undefined;
  Trail: undefined;
  Walks: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
