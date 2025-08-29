import { create } from 'zustand';

export interface LayerState {
  id: string;
  opacity?: number;
  params?: Record<string, unknown>;
}

export interface ViewState {
  bbox: [number, number, number, number];
  zoom: number;
  timeISO: string;
  activeLayers: LayerState[];
  setTime: (iso: string) => void;
  toggleLayer: (id: string) => void;
  setOpacity: (id: string, value: number) => void;
  setWorkspace: (id: string) => void;
  setCompare: (enabled: boolean) => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  bbox: [-180, -90, 180, 90],
  zoom: 0,
  timeISO: new Date().toISOString(),
  activeLayers: [],
  setTime: (iso) => set({ timeISO: iso }),
  toggleLayer: (id) => {
    const exists = get().activeLayers.find((l) => l.id === id);
    set({
      activeLayers: exists
        ? get().activeLayers.filter((l) => l.id !== id)
        : [...get().activeLayers, { id }],
    });
  },
  setOpacity: (id, value) =>
    set({
      activeLayers: get().activeLayers.map((l) =>
        l.id === id ? { ...l, opacity: value } : l,
      ),
    }),
  setWorkspace: () => {},
  setCompare: () => {},
}));
