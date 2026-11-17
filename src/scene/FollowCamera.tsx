import { useEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Vec3 } from '../types';
import { START_POS } from '../constants/world';
import { physicsRef } from '../state/runtime';
import { useSimStore } from '../state/store';

/** 分子の背後上方（+Z を向く）の初期オフセット。 */
export const INITIAL_CAMERA_OFFSET: Vec3 = [0, 4, -10];

/** OrbitControls ＋分子追従。target とカメラを同じ差分だけ動かして相対オフセットを保つ。 */
export function FollowCamera() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const resetToken = useSimStore((s) => s.resetToken);
  const delta = useRef(new THREE.Vector3()).current;
  const first = useRef(true);

  useEffect(() => {
    const controls = controlsRef.current;
    const p = first.current ? START_POS : physicsRef.current.pos;
    first.current = false;
    camera.position.set(
      p[0] + INITIAL_CAMERA_OFFSET[0],
      p[1] + INITIAL_CAMERA_OFFSET[1],
      p[2] + INITIAL_CAMERA_OFFSET[2],
    );
    if (controls) {
      controls.target.set(p[0], p[1], p[2]);
      controls.update();
    } else {
      camera.lookAt(p[0], p[1], p[2]);
    }
  }, [resetToken, camera]);

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const p = physicsRef.current.pos;
    delta.set(p[0], p[1], p[2]).sub(controls.target).multiplyScalar(1 - Math.exp(-12 * dt));
    controls.target.add(delta);
    camera.position.add(delta);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      minDistance={4}
      maxDistance={30}
      enableDamping
    />
  );
}
