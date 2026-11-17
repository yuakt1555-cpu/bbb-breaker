import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../types';
import { createInitialPhysicsState, physicsRef } from '../state/runtime';
import { getCombinedInput } from '../state/input';
import { useSimStore } from '../state/store';
import { stepPhysics } from '../logic/physics';
import { PHYS } from '../constants/world';

/** 1 フレームで進めるゲーム内時間の上限（秒）。タブ復帰時などの暴走防止。 */
const MAX_FRAME_DELTA = 0.25;

/** 描画なし。入力 → stepPhysics → physicsRef / ストア反映のループを担う。 */
export function MoleculeController() {
  const lastResetRef = useRef<number>(useSimStore.getState().resetToken);
  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const up = useRef(new THREE.Vector3(0, 1, 0)).current;

  useFrame((state, delta) => {
    const store = useSimStore.getState();
    if (store.resetToken !== lastResetRef.current) {
      lastResetRef.current = store.resetToken;
      physicsRef.current = createInitialPhysicsState();
    }
    if (store.cleared) return;

    const input = getCombinedInput();
    state.camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1);
    fwd.normalize();
    right.crossVectors(fwd, up); // (−fz, 0, fx)

    let mx = fwd.x * input.forward + right.x * input.right;
    let my = input.up;
    let mz = fwd.z * input.forward + right.z * input.right;
    const len = Math.hypot(mx, my, mz);
    if (len > 1) {
      mx /= len;
      my /= len;
      mz /= len;
    }
    const move: Vec3 = [mx, my, mz];

    // 低 fps でもゲーム内時間が実時間どおり進むよう、PHYS.MAX_DT 以下の均等なサブステップに分割する
    const frameDt = Math.min(delta, MAX_FRAME_DELTA);
    const steps = Math.max(1, Math.ceil(frameDt / PHYS.MAX_DT));
    const subDt = frameDt / steps;
    let result = stepPhysics(physicsRef.current, { move, dt: subDt }, store.params, store.env);
    for (let i = 1; i < steps && !result.reachedGoal; i++) {
      result = stepPhysics(result.state, { move, dt: subDt }, store.params, store.env);
    }
    physicsRef.current = result.state;

    const route = result.area === 'lumen' && result.state.effluxCount === 0 ? null : result.state.route;
    store.setRuntime({
      area: result.area,
      status: result.status,
      route,
      effluxCount: result.state.effluxCount,
    });

    if (result.reachedGoal && !useSimStore.getState().cleared) {
      useSimStore.getState().markCleared(result.state.route, result.state.effluxCount);
    }
  });

  return null;
}
