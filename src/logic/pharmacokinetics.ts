import type { DrugParams, DrugProfile, DrugType, EnvParams, LipoZone, PredictedOutcome } from '../types';
import { PHYS, PK } from '../constants/world';

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const F_UN_MIN = 1e-12;

/** Henderson-Hasselbalch: 分子形（非解離型）の比率 */
export function unionizedFraction(drugType: DrugType, pKa: number, pH: number): number {
  let f: number;
  if (drugType === 'acid') f = 1 / (1 + Math.pow(10, pH - pKa));
  else if (drugType === 'base') f = 1 / (1 + Math.pow(10, pKa - pH));
  else f = 1;
  return clamp(f, F_UN_MIN, 1);
}

export function ionPenalty(fUn: number): number {
  return Math.max(0, -Math.log10(fUn));
}

export function hydrationLevel(fUn: number): number {
  return clamp(ionPenalty(fUn) / PK.HYDRATION_FULL_PENALTY, 0, 1);
}

export function ionBarrier(fUn: number): number {
  return smoothstep(PK.ION_BARRIER_START, PK.ION_BARRIER_FULL, ionPenalty(fUn));
}

export function lipoEntryBarrier(logP: number): number {
  return 1 - smoothstep(PK.LOGP_LOW_BLOCK, PK.LOGP_LOW_OK, logP);
}

export function combinedEntryBarrier(bIon: number, bLipo: number): number {
  return 1 - (1 - bIon) * (1 - bLipo);
}

export function lipidTrapSeverity(logP: number): number {
  return smoothstep(PK.LOGP_HIGH_OK, PK.LOGP_HIGH_TRAP, logP);
}

export function coreMobility(logP: number): number {
  return lerp(PK.CORE_MOBILITY_BASE, PK.CORE_MOBILITY_TRAPPED, lipidTrapSeverity(logP));
}

export function lipoZone(logP: number): LipoZone {
  if (logP < PK.LOGP_LOW_BLOCK) return 'tooHydrophilic';
  if (logP < PK.LOGP_LOW_OK) return 'borderLow';
  if (logP <= PK.LOGP_HIGH_OK) return 'optimal';
  if (logP < PK.LOGP_HIGH_TRAP) return 'borderHigh';
  return 'lipidTrap';
}

export function deriveDrugProfile(params: DrugParams, env: EnvParams): DrugProfile {
  const fUn = unionizedFraction(params.drugType, params.pKa, env.bloodPH);
  const bIon = ionBarrier(fUn);
  const bLipo = lipoEntryBarrier(params.logP);
  const entry = combinedEntryBarrier(bIon, bLipo);
  const s = lipidTrapSeverity(params.logP);
  const mCore = coreMobility(params.logP);
  const membranePassable = entry < PK.BARRIER_PASS_LIMIT;
  const coreEscapable = PHYS.ACCEL * mCore > PHYS.K_TRAP * Math.pow(s, 3);

  let predicted: PredictedOutcome;
  if (membranePassable && coreEscapable && !params.pgpSubstrate) predicted = 'transcellular';
  else if (env.meningitis) predicted = 'paracellular';
  else if (!membranePassable) predicted = bIon >= bLipo ? 'blockedIonized' : 'blockedHydrophilic';
  else if (!coreEscapable) predicted = 'lipidTrap';
  else predicted = 'pgpEfflux';

  return {
    unionizedFraction: fUn,
    unionizedPercent: fUn * 100,
    ionizedPercent: 100 - fUn * 100,
    ionPenalty: ionPenalty(fUn),
    hydrationLevel: hydrationLevel(fUn),
    ionBarrier: bIon,
    lipoBarrier: bLipo,
    entryBarrier: entry,
    trapSeverity: s,
    coreMobility: mCore,
    lipoZone: lipoZone(params.logP),
    membranePassable,
    coreEscapable,
    predicted,
  };
}
