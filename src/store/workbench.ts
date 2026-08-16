import { create } from "zustand";
import type { HorizonId, TransportMode } from "@/lib/pct/types";
import { DEFAULT_HORIZON, DEFAULT_QUERY, DEFAULT_TEMPLATE, DEFAULT_TRANSPORT } from "@/lib/pct/universe";

interface WorkbenchState {
  dayIndex: number;
  templateId: string;
  horizon: HorizonId;
  transport: TransportMode;
  useGeometry: boolean;
  selectedAnalog: number | null;
  command: string;
  setDay: (i: number) => void;
  setTemplate: (id: string) => void;
  setHorizon: (h: HorizonId) => void;
  setTransport: (m: TransportMode) => void;
  setUseGeometry: (v: boolean) => void;
  setSelectedAnalog: (i: number | null) => void;
  setCommand: (s: string) => void;
}

export const useWorkbench = create<WorkbenchState>((set) => ({
  dayIndex: DEFAULT_QUERY,
  templateId: DEFAULT_TEMPLATE,
  horizon: DEFAULT_HORIZON,
  transport: DEFAULT_TRANSPORT,
  useGeometry: false,
  selectedAnalog: null,
  command: "",
  setDay: (dayIndex) => set({ dayIndex, selectedAnalog: null }),
  setTemplate: (templateId) => set({ templateId, selectedAnalog: null }),
  setHorizon: (horizon) => set({ horizon, selectedAnalog: null }),
  setTransport: (transport) => set({ transport, selectedAnalog: null }),
  setUseGeometry: (useGeometry) => set({ useGeometry, selectedAnalog: null }),
  setSelectedAnalog: (selectedAnalog) => set({ selectedAnalog }),
  setCommand: (command) => set({ command }),
}));
