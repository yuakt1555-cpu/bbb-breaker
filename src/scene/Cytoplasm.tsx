import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARACELLULAR, PGP_PUMPS, WORLD, ZONES } from '../constants/world';
import { PgpPump } from './PgpPump';
import { createRng } from './random';

const PARTICLE_COUNT = 260;

/** 内皮細胞質：紫系の浮遊粒子（Points 1 つ）と P-gp ポンプの配置。 */
export function Cytoplasm() {
  const attrRef = useRef<THREE.BufferAttribute>(null);
  const { zStart, zEnd } = ZONES.cytoplasm;
  const xMin = WORLD.xMin;
  const xMax = PARACELLULAR.xMin;

  const base = useMemo(() => {
    const rnd = createRng(99);
    const b = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      b[i * 3] = xMin + rnd() * (xMax - xMin);
      b[i * 3 + 1] = WORLD.yMin + rnd() * (WORLD.yMax - WORLD.yMin);
      b[i * 3 + 2] = zStart + 0.5 + rnd() * (zEnd - zStart - 1);
    }
    return b;
  }, [xMin, xMax, zStart, zEnd]);
  const positions = useMemo(() => new Float32Array(base), [base]);

  useFrame((state) => {
    const attr = attrRef.current;
    if (!attr) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const o = i * 3;
      positions[o] = base[o] + Math.sin(t * 0.25 + i) * 0.5;
      positions[o + 1] = base[o + 1] + Math.cos(t * 0.3 + i * 1.7) * 0.5;
      positions[o + 2] = base[o + 2] + Math.sin(t * 0.2 + i * 0.6) * 0.4;
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      <mesh position={[(xMin + xMax) / 2, 0, (zStart + zEnd) / 2]}>
        <boxGeometry args={[xMax - xMin, WORLD.yMax - WORLD.yMin, zEnd - zStart]} />
        <meshBasicMaterial color="#4c1d95" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute ref={attrRef} attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#c4b5fd" size={0.18} transparent opacity={0.7} depthWrite={false} sizeAttenuation />
      </points>
      {PGP_PUMPS.map((p, i) => (
        <PgpPump key={i} position={p.pos} radius={p.radius} />
      ))}
    </group>
  );
}
