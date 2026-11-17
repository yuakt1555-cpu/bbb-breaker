import { describe, expect, it } from 'vitest';
import { PRESETS } from '../constants/presets';
import { DEFAULT_ENV, START_POS } from '../constants/world';
import type { DrugParams, EnvParams, PhysicsState, StepResult, Vec3 } from '../types';
import { classifyArea, membraneLayer, stepPhysics } from './physics';

const DT = 1 / 60;

function initState(pos: Vec3 = START_POS): PhysicsState {
  return {
    pos: [...pos] as Vec3, vel: [0, 0, 0], effluxActive: false, heldStatus: null,
    holdTimer: 0, route: 'transcellular', effluxCount: 0,
  };
}

interface Run { last: StepResult; steps: number; reachedAt: number | null; minZAfterEfflux: number; statuses: Set<string> }

function run(
  params: DrugParams, env: EnvParams, seconds: number,
  moveFn: (s: PhysicsState) => Vec3 = () => [0, 0, 1],
  start?: Vec3,
): Run {
  let state = initState(start);
  let last!: StepResult;
  let reachedAt: number | null = null;
  let minZ = Infinity;
  const statuses = new Set<string>();
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    last = stepPhysics(state, { move: moveFn(state), dt: DT }, params, env);
    state = last.state;
    statuses.add(last.status);
    if (state.effluxCount >= 1) minZ = Math.min(minZ, state.pos[2]);
    if (last.reachedGoal && reachedAt === null) { reachedAt = (i + 1) * DT; break; }
  }
  return { last, steps: n, reachedAt, minZAfterEfflux: minZ, statuses };
}

describe('classifyArea / membraneLayer', () => {
  it('areas', () => {
    expect(classifyArea([0, 0, -1])).toBe('lumen');
    expect(classifyArea([0, 0, 0])).toBe('luminalMembrane');
    expect(classifyArea([0, 0, 4])).toBe('cytoplasm');
    expect(classifyArea([0, 0, 22])).toBe('abluminalMembrane');
    expect(classifyArea([0, 0, 26])).toBe('brain');
    expect(classifyArea([9, 0, 10])).toBe('paracellular');
    expect(classifyArea([9, 0, -1])).toBe('lumen');
    expect(classifyArea([9, 0, 26])).toBe('brain');
  });
  it('layers', () => {
    expect(membraneLayer([0, 0, 0.5])).toBe('lowerHead');
    expect(membraneLayer([0, 0, 2])).toBe('core');
    expect(membraneLayer([0, 0, 3.5])).toBe('upperHead');
    expect(membraneLayer([0, 0, 22.5])).toBe('lowerHead');
    expect(membraneLayer([0, 0, 24])).toBe('core');
    expect(membraneLayer([0, 0, 25.5])).toBe('upperHead');
    expect(membraneLayer([0, 0, 10])).toBeNull();
    expect(membraneLayer([9, 0, 2])).toBeNull();
  });
});

describe('stepPhysics purity', () => {
  it('does not mutate prev', () => {
    const prev = initState();
    const snapshot = JSON.parse(JSON.stringify(prev));
    const r = stepPhysics(prev, { move: [0, 0, 1], dt: DT }, PRESETS.diazepam.params, DEFAULT_ENV);
    expect(prev).toEqual(snapshot);
    expect(r.state).not.toBe(prev);
    expect(r.state.pos).not.toBe(prev.pos);
    expect(r.state.vel).not.toBe(prev.vel);
  });
  it('normalizes move longer than 1', () => {
    const a = stepPhysics(initState(), { move: [0, 0, 5], dt: DT }, PRESETS.diazepam.params, DEFAULT_ENV);
    const b = stepPhysics(initState(), { move: [0, 0, 1], dt: DT }, PRESETS.diazepam.params, DEFAULT_ENV);
    expect(a.state.vel[2]).toBeCloseTo(b.state.vel[2], 10);
  });
});

describe('section 5.1 scenarios', () => {
  it('diazepam reaches goal within 15 s (transcellular)', () => {
    const r = run(PRESETS.diazepam.params, DEFAULT_ENV, 15);
    console.log('diazepam reachedAt', r.reachedAt);
    expect(r.reachedAt).not.toBeNull();
    expect(r.reachedAt!).toBeLessThanOrEqual(15);
    expect(r.last.state.route).toBe('transcellular');
  });

  it('domperidone is captured and returned to lumen', () => {
    const r = run(PRESETS.domperidone.params, DEFAULT_ENV, 30);
    console.log('domperidone', r.last.state.pos, r.last.state.effluxCount, r.minZAfterEfflux);
    expect(r.reachedAt).toBeNull();
    expect(r.last.state.effluxCount).toBeGreaterThanOrEqual(1);
    expect(r.minZAfterEfflux).toBeLessThan(-4);
  });

  it('loperamide passes membrane then is effluxed', () => {
    const r = run(PRESETS.loperamide.params, DEFAULT_ENV, 30);
    console.log('loperamide', r.last.state.pos, r.last.state.effluxCount, [...r.statuses]);
    expect(r.reachedAt).toBeNull();
    expect(r.last.state.effluxCount).toBeGreaterThanOrEqual(1);
    expect(r.statuses.has('pgpEfflux')).toBe(true);
    expect(r.minZAfterEfflux).toBeLessThan(-4);
  });

  it('penicillin G (normal) is repelled at luminal membrane and blocked at TJ', () => {
    const r = run(PRESETS.penicillinG.params, DEFAULT_ENV, 20);
    console.log('penG normal', r.last.state.pos, [...r.statuses]);
    expect(r.reachedAt).toBeNull();
    expect(r.last.state.pos[2]).toBeLessThan(1);
    expect(r.statuses.has('repelledIonized')).toBe(true);

    const tj = run(PRESETS.penicillinG.params, DEFAULT_ENV, 20, () => [0, 0, 1], [10, 0, -22]);
    console.log('penG TJ', tj.last.state.pos, [...tj.statuses]);
    expect(tj.reachedAt).toBeNull();
    expect(tj.last.state.pos[2]).toBeLessThan(0);
    expect(tj.statuses.has('tightJunctionBlocked')).toBe(true);
  });

  it('penicillin G (meningitis) crosses via paracellular route', () => {
    const env: EnvParams = { ...DEFAULT_ENV, meningitis: true };
    const goal: Vec3 = [0, 0, 40];
    const r = run(
      PRESETS.penicillinG.params, env, 40,
      (s) => {
        if (s.pos[2] < 1) return [0, 0, 1];
        const d: Vec3 = [goal[0] - s.pos[0], goal[1] - s.pos[1], goal[2] - s.pos[2]];
        const l = Math.hypot(...d);
        return [d[0] / l, d[1] / l, d[2] / l];
      },
      [10, 0, -22],
    );
    console.log('penG meningitis', r.reachedAt, r.last.state.pos, r.last.state.route);
    expect(r.reachedAt).not.toBeNull();
    expect(r.last.state.route).toBe('paracellular');
    expect(r.statuses.has('paracellular')).toBe(true);
  });

  it('logP 5.5 neutral without P-gp is lipid-trapped', () => {
    const params: DrugParams = { drugType: 'neutral', pKa: 7, logP: 5.5, pgpSubstrate: false };
    const r = run(params, DEFAULT_ENV, 10);
    console.log('logP5.5', r.last.state.pos, [...r.statuses]);
    expect(r.last.state.pos[2]).toBeLessThan(4);
    expect(r.statuses.has('lipidTrapped')).toBe(true);
  });

  it('logP 0 neutral is repelled hydrophilic', () => {
    const params: DrugParams = { drugType: 'neutral', pKa: 7, logP: 0, pgpSubstrate: false };
    const r = run(params, DEFAULT_ENV, 10);
    console.log('logP0', r.last.state.pos, [...r.statuses]);
    expect(r.last.state.pos[2]).toBeLessThan(1);
    expect(r.statuses.has('repelledHydrophilic')).toBe(true);
  });
});

describe('P-gp release when toggled off', () => {
  it('releases immediately without heldStatus', () => {
    const prev: PhysicsState = { ...initState([0, 0, 10]), effluxActive: true, effluxCount: 1 };
    const r = stepPhysics(prev, { move: [0, 0, 0], dt: DT }, { ...PRESETS.domperidone.params, pgpSubstrate: false }, DEFAULT_ENV);
    expect(r.state.effluxActive).toBe(false);
    expect(r.state.heldStatus).toBeNull();
  });
});
