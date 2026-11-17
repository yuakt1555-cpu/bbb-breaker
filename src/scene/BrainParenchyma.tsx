import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD, ZONES } from '../constants/world';
import { TargetReceptor } from './TargetReceptor';
import { createRng } from './random';

const GLOW_COUNT = 220;
const SOMA_COUNT = 14;

/** 脳実質：神経細胞風の発光粒子（Points）と神経細胞体（少数の球）＋ゴール受容体。 */
export function BrainParenchyma() {
  const { zStart, zEnd } = ZONES.brain;
  const width = WORLD.xMax - WORLD.xMin;
  const height = WORLD.yMax - WORLD.yMin;

  const points = useMemo(() => {
    const rnd = createRng(555);
    const arr = new Float32Array(GLOW_COUNT * 3);
    for (let i = 0; i < GLOW_COUNT; i++) {
      arr[i * 3] = WORLD.xMin + rnd() * width;
      arr[i * 3 + 1] = WORLD.yMin + rnd() * height;
      arr[i * 3 + 2] = zStart + 1 + rnd() * (zEnd - zStart - 1);
    }
    return arr;
  }, [width, height, zStart, zEnd]);

  const somas = useMemo(() => {
    const rnd = createRng(808);
    return Array.from({ length: SOMA_COUNT }, () => ({
      pos: [
        WORLD.xMin + 1 + rnd() * (width - 2),
        WORLD.yMin + 1 + rnd() * (height - 2),
        zStart + 3 + rnd() * (zEnd - zStart - 4),
      ] as [number, number, number],
      r: 0.4 + rnd() * 0.6,
    }));
  }, [width, height, zStart, zEnd]);

  return (
    <group>
      <mesh position={[0, 0, zStart + (zEnd - zStart) / 2]}>
        <boxGeometry args={[width, height, zEnd - zStart]} />
        <meshBasicMaterial color="#0c4a6e" transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#7dd3fc" size={0.16} transparent opacity={0.65} depthWrite={false} sizeAttenuation />
      </points>
      {somas.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <icosahedronGeometry args={[s.r, 1]} />
          <meshStandardMaterial color="#1e3a8a" emissive="#38bdf8" emissiveIntensity={0.5} transparent opacity={0.6} />
        </mesh>
      ))}
      <TargetReceptor />
    </group>
  );
}
