import { create } from 'zustand';
import type {
  AreaId,
  ClearInfo,
  DrugParams,
  EnvParams,
  PermeationStatus,
  PresetId,
  Route,
} from '../types';
import { DEFAULT_ENV, DEFAULT_PARAMS } from '../constants/world';
import { PRESETS } from '../constants/presets';

export interface SimStore {
  params: DrugParams;
  env: EnvParams;
  presetId: PresetId | null;

  area: AreaId;
  status: PermeationStatus;
  route: Route | null;
  effluxCount: number;

  cleared: boolean;
  clearInfo: ClearInfo | null;
  startedAt: number;
  resetToken: number;
  panelOpen: boolean;

  setDrugParams(p: Partial<DrugParams>): void;
  setEnv(p: Partial<EnvParams>): void;
  applyPreset(id: PresetId): void;
  setRuntime(r: {
    area: AreaId;
    status: PermeationStatus;
    route: Route | null;
    effluxCount: number;
  }): void;
  markCleared(route: Route, effluxCount: number): void;
  resetRun(): void;
  closeModal(): void;
  setPanelOpen(open: boolean): void;
}

export const useSimStore = create<SimStore>()((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  env: { ...DEFAULT_ENV },
  presetId: 'diazepam',

  area: 'lumen',
  status: 'free',
  route: null,
  effluxCount: 0,

  cleared: false,
  clearInfo: null,
  startedAt: performance.now(),
  resetToken: 0,
  panelOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,

  setDrugParams: (p) =>
    set((s) => ({ params: { ...s.params, ...p }, presetId: null })),

  setEnv: (p) => set((s) => ({ env: { ...s.env, ...p } })),

  applyPreset: (id) => {
    const preset = PRESETS[id];
    set((s) => ({
      params: { ...preset.params },
      env: { ...s.env, bloodPH: DEFAULT_ENV.bloodPH },
      presetId: id,
    }));
    get().resetRun();
  },

  setRuntime: (r) => {
    const s = get();
    if (
      s.area === r.area &&
      s.status === r.status &&
      s.route === r.route &&
      s.effluxCount === r.effluxCount
    ) {
      return;
    }
    set({ area: r.area, status: r.status, route: r.route, effluxCount: r.effluxCount });
  },

  markCleared: (route, effluxCount) =>
    set((s) => ({
      cleared: true,
      status: 'cleared',
      route,
      effluxCount,
      clearInfo: {
        presetId: s.presetId,
        route,
        elapsedSec: (performance.now() - s.startedAt) / 1000,
        effluxCount,
        params: { ...s.params },
        env: { ...s.env },
      },
    })),

  resetRun: () =>
    set((s) => ({
      resetToken: s.resetToken + 1,
      cleared: false,
      clearInfo: null,
      area: 'lumen',
      status: 'free',
      route: null,
      effluxCount: 0,
      startedAt: performance.now(),
    })),

  closeModal: () => set({ clearInfo: null }),

  setPanelOpen: (open) => set({ panelOpen: open }),
}));
