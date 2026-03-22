import { create } from "zustand";
import type { User, School } from "@/types";

interface AppState {
  user: User | null;
  school: School | null;
  isAuthReady: boolean;
  setUser: (user: User | null) => void;
  setSchool: (school: School | null) => void;
  setAuthReady: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  school: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  setSchool: (school) => set({ school }),
  setAuthReady: () => set({ isAuthReady: true }),
  reset: () => set({ user: null, school: null }),
}));
