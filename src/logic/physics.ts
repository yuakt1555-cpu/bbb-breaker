import type {
  AreaId, DrugParams, EnvParams, MembraneLayer, PermeationStatus, PhysicsState,
  Route, StepInput, StepResult, Vec3,
} from '../types';
import type { MembraneSpec } from '../constants/world';
import {
  GOAL, PARACELLULAR, PGP_PUMPS, PHYS, TIGHT_JUNCTION, WORLD, ZONES,
} from '../constants/world';
import { clamp, deriveDrugProfile } from './pharmacokinetics';

const TJ_PUSHBACK_Z = -0.01;
const SIDEWALL_EPS = 1e-3;

export function classifyArea(pos: Vec3): AreaId {
  const [x, , z] = pos;
  if (x >= PARACELLULAR.xMin && z >= PARACELLULAR.zStart && z < PARACELLULAR.zEnd) return 'paracellular';
  if (z < ZONES.luminalMembrane.zStart) return 'lumen';
  if (z < ZONES.luminalMembrane.zEnd) return 'luminalMembrane';
  if (z < ZONES.abluminalMembrane.zStart) return 'cytoplasm';
  if (z < ZONES.abluminalMembrane.zEnd) return 'abluminalMembrane';
  return 'brain';
}

function membraneSpecOf(area: AreaId): MembraneSpec | null {
  if (area === 'luminalMembrane') return ZONES.luminalMembrane;
  if (area === 'abluminalMembrane') return ZONES.abluminalMembrane;
  return null;
}

export function membraneLayer(pos: Vec3): MembraneLayer | null {
  const spec = membraneSpecOf(classifyArea(pos));
  if (!spec) return null;
  const z = pos[2];
  if (z < spec.zStart + spec.headThickness) return 'lowerHead';
  if (z >= spec.zEnd - spec.headThickness) return 'upperHead';
  return 'core';
}

export function stepPhysics(
  prev: PhysicsState,
  input: StepInput,
  params: DrugParams,
  env: EnvParams,
): StepResult {
  // 1
  const dt = Math.min(input.dt, PHYS.MAX_DT);
  const profile = deriveDrugProfile(params, env);

  // 2
  const area0 = classifyArea(prev.pos);
  const layer0 = membraneLayer(prev.pos);

  let effluxActive = prev.effluxActive;
  let effluxCount = prev.effluxCount;
  let heldStatus = prev.heldStatus;
  let holdTimer = prev.holdTimer;
  let effluxStarted = false;

  // 3 P-gp 捕捉/解放
  if (effluxActive) {
    if (!params.pgpSubstrate) {
      effluxActive = false;
    } else if (prev.pos[2] < PHYS.PGP_RELEASE_Z) {
      effluxActive = false;
      heldStatus = 'pgpEfflux';
      holdTimer = PHYS.PGP_HOLD_TIME;
    }
  } else if (
    params.pgpSubstrate &&
    prev.pos[0] < PARACELLULAR.xMin &&
    prev.pos[2] >= PHYS.PGP_CAPTURE_Z &&
    prev.pos[2] < ZONES.cytoplasm.zEnd
  ) {
    effluxActive = true;
    effluxCount += 1;
    effluxStarted = true;
  }

  // 4 移動度
  let m = 1;
  if (!effluxActive) {
    if (layer0 === 'lowerHead' || layer0 === 'upperHead') m = PHYS.M_HEAD;
    else if (layer0 === 'core') m = profile.coreMobility;
  }

  // 5 加速度
  let [mx, my, mz] = input.move;
  const len = Math.hypot(mx, my, mz);
  if (len > 1) { mx /= len; my /= len; mz /= len; }
  const a: Vec3 = [mx * PHYS.ACCEL * m, my * PHYS.ACCEL * m, mz * PHYS.ACCEL * m];

  // 6 膜の力
  if (!effluxActive && layer0 !== null) {
    if (layer0 === 'lowerHead') a[2] -= PHYS.K_REPEL * profile.entryBarrier;
    else if (layer0 === 'upperHead') a[2] += PHYS.K_REPEL * profile.entryBarrier;
    else {
      const spec = membraneSpecOf(area0);
      if (spec) {
        const half = (spec.zEnd - spec.zStart - 2 * spec.headThickness) / 2;
        const zMid = (spec.zStart + spec.zEnd) / 2;
        const s = profile.trapSeverity;
        a[2] -= PHYS.K_TRAP * s * s * s * clamp((prev.pos[2] - zMid) / half, -1, 1);
      }
    }
  }

  // 7 P-gp 力
  if (effluxActive) {
    a[2] -= PHYS.PGP_PUSH;
    for (const pump of PGP_PUMPS) {
      const dx = prev.pos[0] - pump.pos[0];
      const dy = prev.pos[1] - pump.pos[1];
      const d = Math.hypot(dx, dy);
      if (
        d < PHYS.PGP_SWIRL_RADIUS && d > 0 &&
        Math.abs(prev.pos[2] - pump.pos[2]) < PHYS.PGP_SWIRL_HALF_DEPTH
      ) {
        const f = PHYS.PGP_SWIRL * (1 - d / PHYS.PGP_SWIRL_RADIUS);
        a[0] += (-dy / d) * f;
        a[1] += (dx / d) * f;
      }
    }
  }

  // 8 速度
  const damp = Math.exp(-PHYS.DRAG * dt);
  const vel: Vec3 = [
    (prev.vel[0] + a[0] * dt) * damp,
    (prev.vel[1] + a[1] * dt) * damp,
    (prev.vel[2] + a[2] * dt) * damp,
  ];
  const maxSpeed = effluxActive ? PHYS.EFFLUX_MAX_SPEED : PHYS.MAX_SPEED;
  const speed = Math.hypot(vel[0], vel[1], vel[2]);
  if (speed > maxSpeed) {
    const k = maxSpeed / speed;
    vel[0] *= k; vel[1] *= k; vel[2] *= k;
  }

  // 9 位置
  const pos: Vec3 = [
    prev.pos[0] + vel[0] * dt,
    prev.pos[1] + vel[1] * dt,
    prev.pos[2] + vel[2] * dt,
  ];

  // 10 当たり判定
  // 10.1 タイトジャンクション
  if (
    !env.meningitis &&
    prev.pos[2] < TIGHT_JUNCTION.z &&
    pos[2] >= TIGHT_JUNCTION.z &&
    pos[0] >= TIGHT_JUNCTION.xMin
  ) {
    pos[2] = TJ_PUSHBACK_Z;
    vel[2] = -Math.abs(vel[2]) * PHYS.TJ_RESTITUTION;
    heldStatus = 'tightJunctionBlocked';
    holdTimer = PHYS.HOLD_TIME;
  }
  // 10.2 側壁
  const inCell = (z: number) => z >= PARACELLULAR.zStart && z < PARACELLULAR.zEnd;
  if (inCell(prev.pos[2]) && inCell(pos[2])) {
    if (prev.pos[0] >= PARACELLULAR.xMin && pos[0] < PARACELLULAR.xMin) {
      pos[0] = PARACELLULAR.xMin;
      vel[0] = 0;
    } else if (prev.pos[0] < PARACELLULAR.xMin && pos[0] >= PARACELLULAR.xMin) {
      pos[0] = PARACELLULAR.xMin - SIDEWALL_EPS;
      vel[0] = 0;
    }
  }
  // 10.3 世界境界
  if (pos[0] < WORLD.xMin) { pos[0] = WORLD.xMin; vel[0] = 0; }
  else if (pos[0] > WORLD.xMax) { pos[0] = WORLD.xMax; vel[0] = 0; }
  if (pos[1] < WORLD.yMin) { pos[1] = WORLD.yMin; vel[1] = 0; }
  else if (pos[1] > WORLD.yMax) { pos[1] = WORLD.yMax; vel[1] = 0; }
  if (pos[2] < WORLD.zMin) { pos[2] = WORLD.zMin; vel[2] = 0; }
  else if (pos[2] > WORLD.zMax) { pos[2] = WORLD.zMax; vel[2] = 0; }

  const area = classifyArea(pos);
  const layer = membraneLayer(pos);

  // 11 反発ステータス
  if (
    (layer === 'lowerHead' || layer === 'upperHead') &&
    !effluxActive &&
    !profile.membranePassable
  ) {
    heldStatus = profile.ionBarrier >= profile.lipoBarrier ? 'repelledIonized' : 'repelledHydrophilic';
    holdTimer = PHYS.HOLD_TIME;
  }

  // 12
  holdTimer -= dt;
  if (holdTimer <= 0) {
    holdTimer = 0;
    heldStatus = null;
  }

  // 13 route
  let route: Route = prev.route;
  if (area === 'paracellular') route = 'paracellular';
  else if (area === 'luminalMembrane' || area === 'cytoplasm' || area === 'abluminalMembrane') {
    route = 'transcellular';
  }

  // 14
  const reachedGoal =
    Math.hypot(pos[0] - GOAL.pos[0], pos[1] - GOAL.pos[1], pos[2] - GOAL.pos[2]) < GOAL.radius;

  // 15
  let status: PermeationStatus;
  if (reachedGoal) status = 'cleared';
  else if (effluxActive) status = 'pgpEfflux';
  else if (heldStatus !== null) status = heldStatus;
  else if (area === 'paracellular') status = 'paracellular';
  else if (layer === 'core') {
    if (!profile.coreEscapable) status = 'lipidTrapped';
    else if (profile.trapSeverity > 0) status = 'lipidSlowed';
    else status = 'permeating';
  } else if (layer === 'lowerHead' || layer === 'upperHead') status = 'permeating';
  else status = 'free';

  return {
    state: { pos, vel, effluxActive, heldStatus, holdTimer, route, effluxCount },
    area,
    layer,
    status,
    reachedGoal,
    effluxStarted,
  };
}
