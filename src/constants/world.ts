import type { DrugParams, EnvParams, Vec3 } from '../types';

export const WORLD = { xMin: -12, xMax: 12, yMin: -8, yMax: 8, zMin: -30, zMax: 48 } as const;

export interface MembraneSpec { zStart: number; zEnd: number; headThickness: number }
export const ZONES = {
  lumen: { zStart: -30, zEnd: 0 },
  luminalMembrane: { zStart: 0, zEnd: 4, headThickness: 0.8 } as MembraneSpec,
  cytoplasm: { zStart: 4, zEnd: 22 },
  abluminalMembrane: { zStart: 22, zEnd: 26, headThickness: 0.8 } as MembraneSpec,
  brain: { zStart: 26, zEnd: 48 },
} as const;

export const PARACELLULAR = { xMin: 8, xMax: 12, zStart: 0, zEnd: 26 } as const;
export const TIGHT_JUNCTION = { z: 0, xMin: 8, xMax: 12 } as const;

export const START_POS: Vec3 = [-2, 0, -22];
export const GOAL = { pos: [0, 0, 40] as Vec3, radius: 3.5 } as const;
export const MOLECULE_RADIUS = 0.8;

export const PGP_PUMPS: { pos: Vec3; radius: number }[] = [
  { pos: [-4, 2.5, 11], radius: 3 },
  { pos: [3, -2.5, 15], radius: 3 },
];

export const PHYS = {
  ACCEL: 20,            // 入力による最大加速度
  DRAG: 3,              // 速度減衰係数 v *= exp(-DRAG*dt)
  MAX_SPEED: 8,
  EFFLUX_MAX_SPEED: 12,
  M_HEAD: 0.6,          // 親水性頭部層の移動度
  K_REPEL: 30,          // 頭部層の反発加速度係数（× 進入障壁 B）
  K_TRAP: 30,           // 脂質トラップ保持力係数（× s^3）
  PGP_PUSH: 35,
  PGP_SWIRL: 8,
  PGP_SWIRL_RADIUS: 5,
  PGP_SWIRL_HALF_DEPTH: 6,
  PGP_CAPTURE_Z: 5,
  PGP_RELEASE_Z: -4,
  HOLD_TIME: 1.2,
  PGP_HOLD_TIME: 2.0,
  TJ_RESTITUTION: 0.5,
  MAX_DT: 1 / 30,
} as const;

export const PK = {
  ION_BARRIER_START: 1.5,
  ION_BARRIER_FULL: 3.0,
  HYDRATION_FULL_PENALTY: 4.0,
  HYDRATION_MAX_PARTICLES: 60,
  LOGP_LOW_BLOCK: 0.5,
  LOGP_LOW_OK: 1.0,
  LOGP_HIGH_OK: 4.0,
  LOGP_HIGH_TRAP: 4.5,
  CORE_MOBILITY_BASE: 0.75,
  CORE_MOBILITY_TRAPPED: 0.03,
  BARRIER_PASS_LIMIT: 0.4, // = ACCEL * M_HEAD / K_REPEL
} as const;

export const SLIDER_RANGES = {
  pKa: { min: 2.0, max: 11.0, step: 0.1 },
  logP: { min: -2.0, max: 6.0, step: 0.1 },
  bloodPH: { min: 6.8, max: 7.8, step: 0.05 },
} as const;

export const DEFAULT_PARAMS: DrugParams = { drugType: 'base', pKa: 3.4, logP: 2.8, pgpSubstrate: false };
export const DEFAULT_ENV: EnvParams = { bloodPH: 7.4, meningitis: false };
