import { create } from "zustand";
import type { User, School } from "@/types";

interface AppState {
  user: User | null;
  school: School | null;
  setUser: (user: User | null) => void;
  setSchool: (school: School | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  school: null,
  setUser: (user) => set({ user }),
  setSchool: (school) => set({ school }),
  reset: () => set({ user: null, school: null }),
}));
