import { create } from "zustand";

import { tokenStore } from "../../lib/auth-token";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrating: true,
  hydrate: async () => {
    await tokenStore.getAccessToken();
    set({ isHydrating: false });
  },
  setUser: (user) => set({ user, isHydrating: false }),
  clearUser: async () => {
    await tokenStore.clear();
    set({ user: null, isHydrating: false });
  },
}));
