import { describe, expect, it } from 'vitest';
import { PRESETS } from '../constants/presets';
import { DEFAULT_ENV } from '../constants/world';
import {
  clamp, coreMobility, deriveDrugProfile, hydrationLevel, ionBarrier, lerp, lipidTrapSeverity,
  lipoEntryBarrier, lipoZone, smoothstep, unionizedFraction,
} from './pharmacokinetics';

describe('helpers', () => {
  it('clamp / smoothstep / lerp', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 10);
    expect(smoothstep(1, 2, 0)).toBe(0);
    expect(smoothstep(1, 2, 3)).toBe(1);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });
});

describe('Henderson-Hasselbalch', () => {
  it('pKa = pH gives 0.5 for acid and base', () => {
    expect(unionizedFraction('acid', 7.4, 7.4)).toBeCloseTo(0.5, 10);
    expect(unionizedFraction('base', 7.4, 7.4)).toBeCloseTo(0.5, 10);
  });
  it('neutral is always 1', () => {
    expect(unionizedFraction('neutral', 3, 7.4)).toBe(1);
  });
  it('clamps to [1e-12, 1]', () => {
    expect(unionizedFraction('acid', 2, 20)).toBeGreaterThanOrEqual(1e-12);
  });
  it('preset check values at pH 7.4', () => {
    const pct = (id: keyof typeof PRESETS) => {
      const p = PRESETS[id].params;
      return unionizedFraction(p.drugType, p.pKa, 7.4) * 100;
    };
    expect(pct('diazepam')).toBeCloseTo(99.99, 2);
    expect(pct('domperidone')).toBeCloseTo(24.0, 1);
    expect(pct('loperamide')).toBeCloseTo(4.77, 2);
    expect(pct('penicillinG')).toBeCloseTo(0.0020, 4);
  });
  it('ion barrier and hydration', () => {
    expect(ionBarrier(unionizedFraction('base', 8.7, 7.4))).toBe(0);
    expect(ionBarrier(unionizedFraction('acid', 2.7, 7.4))).toBe(1);
    expect(hydrationLevel(1)).toBe(0);
    expect(hydrationLevel(1e-12)).toBe(1);
  });
});

describe('logP continuity', () => {
  const eps = 1e-6;
  for (const edge of [0.5, 1.0, 4.0, 4.5]) {
    it(`continuous near logP=${edge}`, () => {
      expect(Math.abs(lipoEntryBarrier(edge - eps) - lipoEntryBarrier(edge + eps))).toBeLessThan(1e-4);
      expect(Math.abs(coreMobility(edge - eps) - coreMobility(edge + eps))).toBeLessThan(1e-4);
      expect(Math.abs(lipidTrapSeverity(edge - eps) - lipidTrapSeverity(edge + eps))).toBeLessThan(1e-4);
    });
  }
  it('limits', () => {
    expect(lipoEntryBarrier(0)).toBe(1);
    expect(lipoEntryBarrier(2)).toBe(0);
    expect(coreMobility(3)).toBe(0.75);
    expect(coreMobility(5)).toBeCloseTo(0.03, 10);
  });
  it('lipoZone boundaries', () => {
    expect(lipoZone(0.49)).toBe('tooHydrophilic');
    expect(lipoZone(0.5)).toBe('borderLow');
    expect(lipoZone(0.99)).toBe('borderLow');
    expect(lipoZone(1.0)).toBe('optimal');
    expect(lipoZone(4.0)).toBe('optimal');
    expect(lipoZone(4.01)).toBe('borderHigh');
    expect(lipoZone(4.49)).toBe('borderHigh');
    expect(lipoZone(4.5)).toBe('lipidTrap');
  });
});

describe('predicted outcome', () => {
  it('diazepam transcellular', () => {
    expect(deriveDrugProfile(PRESETS.diazepam.params, DEFAULT_ENV).predicted).toBe('transcellular');
  });
  it('domperidone / loperamide pgpEfflux', () => {
    expect(deriveDrugProfile(PRESETS.domperidone.params, DEFAULT_ENV).predicted).toBe('pgpEfflux');
    expect(deriveDrugProfile(PRESETS.loperamide.params, DEFAULT_ENV).predicted).toBe('pgpEfflux');
  });
  it('penicillin G blockedIonized, meningitis paracellular', () => {
    expect(deriveDrugProfile(PRESETS.penicillinG.params, DEFAULT_ENV).predicted).toBe('blockedIonized');
    expect(
      deriveDrugProfile(PRESETS.penicillinG.params, { ...DEFAULT_ENV, meningitis: true }).predicted,
    ).toBe('paracellular');
  });
  it('profile invariants', () => {
    const p = deriveDrugProfile(PRESETS.loperamide.params, DEFAULT_ENV);
    expect(p.unionizedPercent + p.ionizedPercent).toBeCloseTo(100, 10);
    expect(p.membranePassable).toBe(true);
    expect(p.coreEscapable).toBe(true);
    expect(p.lipoZone).toBe('borderHigh');
  });
});
