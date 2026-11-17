import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD, ZONES } from '../constants/world';
import { createRng } from './random';

const RBC_COUNT = 120;

interface Rbc {
  x: number;
  y: number;
  z: number;
  speed: number;
  rx: number;
  ry: number;
  spin: number;
}

/** 半透明の赤い内腔ボリュームと、+X 方向へ流れる赤血球（InstancedMesh 1 つ、120 個）。 */
export function BloodLumen() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const width = WORLD.xMax - WORLD.xMin;
  const height = WORLD.yMax - WORLD.yMin;
  const depth = ZONES.lumen.zEnd - ZONES.lumen.zStart;

  const cells = useMemo<Rbc[]>(() => {
    const rnd = createRng(1234);
    const list: Rbc[] = [];
    for (let i = 0; i < RBC_COUNT; i++) {
      list.push({
        x: WORLD.xMin + rnd() * width,
        y: WORLD.yMin + 0.8 + rnd() * (height - 1.6),
        z: ZONES.lumen.zStart + 1 + rnd() * (depth - 2),
        speed: 1.5 + rnd() * 1.5,
        rx: rnd() * Math.PI,
        ry: rnd() * Math.PI,
        spin: 0.4 + rnd() * 1.2,
      });
    }
    return list;
  }, [width, height, depth]);

  const geometry = useMemo(() => {
    const g = new THREE.TorusGeometry(0.42, 0.26, 10, 18);
    g.scale(1, 1, 0.9);
    return g;
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    cells.forEach((c, i) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(c.rx, c.ry, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, dummy]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      c.x += c.speed * delta;
      if (c.x > WORLD.xMax) c.x = WORLD.xMin;
      dummy.position.set(c.x, c.y + Math.sin(t * 0.8 + i) * 0.15, c.z);
      dummy.rotation.set(c.rx + t * c.spin, c.ry + t * c.spin * 0.5, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh position={[0, 0, ZONES.lumen.zStart + depth / 2]}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <instancedMesh ref={meshRef} args={[geometry, undefined, RBC_COUNT]} frustumCulled={false}>
        <meshStandardMaterial color="#b91c1c" emissive="#450a0a" emissiveIntensity={0.6} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}
