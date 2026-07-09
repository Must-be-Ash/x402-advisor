"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { ChatMessage } from "./plan-client";
import type { Inspection } from "./x402/inspect";
import type { AdvisorPlan } from "./x402/plan";

export interface AppState {
  inspection: Inspection | null;
  plan: AdvisorPlan | null;
  messages: ChatMessage[];
}

const DEFAULT_STATE: AppState = { inspection: null, plan: null, messages: [] };
const STORAGE_KEY = "x402-advisor-v1";

interface Store {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  reset: () => void;
  hydrated: boolean;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as AppState);
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / serialization errors
    }
  }, [state, hydrated]);

  function reset() {
    setState(DEFAULT_STATE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <Ctx.Provider value={{ state, setState, reset, hydrated }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used within <AppProvider>");
  return c;
}
