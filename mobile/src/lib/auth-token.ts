import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "navisha.access_token";
const REFRESH_TOKEN_KEY = "navisha.refresh_token";

export const tokenStore = {
  getAccessToken: () => getToken(ACCESS_TOKEN_KEY),
  getRefreshToken: () => getToken(REFRESH_TOKEN_KEY),
  setTokens: async (accessToken: string, refreshToken: string) => {
    await setToken(ACCESS_TOKEN_KEY, accessToken);
    await setToken(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: async () => {
    await deleteToken(ACCESS_TOKEN_KEY);
    await deleteToken(REFRESH_TOKEN_KEY);
  },
};

async function getToken(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setToken(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteToken(key: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
