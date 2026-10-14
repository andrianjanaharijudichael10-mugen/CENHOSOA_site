import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'cenhosoa.access_token';
const REFRESH = 'cenhosoa.refresh_token';

function webStorage() {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
    throw new Error('Le stockage sécurisé est indisponible sur cette plateforme.');
  }
  return localStorage;
}

export async function lireAccessToken() {
  return Platform.OS === 'web'
    ? webStorage().getItem(ACCESS)
    : SecureStore.getItemAsync(ACCESS);
}

export async function lireRefreshToken() {
  return Platform.OS === 'web'
    ? webStorage().getItem(REFRESH)
    : SecureStore.getItemAsync(REFRESH);
}

export async function enregistrerTokens(tokens) {
  if (Platform.OS === 'web') {
    webStorage().setItem(ACCESS, tokens.access_token);
    webStorage().setItem(REFRESH, tokens.refresh_token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH, tokens.refresh_token);
}

export async function supprimerTokens() {
  if (Platform.OS === 'web') {
    webStorage().removeItem(ACCESS);
    webStorage().removeItem(REFRESH);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS),
    SecureStore.deleteItemAsync(REFRESH),
  ]);
}
