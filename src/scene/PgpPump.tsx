import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../types';
import { useSimStore } from '../state/store';

interface Props {
  position: Vec3;
  radius: number;
}

const RINGS = 6;
const ON_COLOR = new THREE.Color('#ef4444');
const OFF_COLOR = new THREE.Color('#7c3aed');

/** P-gp ポンプ。z 軸まわりに回転する螺旋トーラス群（漏斗状）。基質 ON で赤く強発光・高速回転。 */
export function PgpPump({ position, radius }: Props) {
  const spinRef = useRef<THREE.Group>(null);
  const speedRef = useRef(0.8);
  const substrate = useSimStore((s) => s.params.pgpSubstrate);
  const substrateRef = useRef(substrate);
  substrateRef.current = substrate;

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: OFF_COLOR, emissive: OFF_COLOR, emissiveIntensity: 0.4, roughness: 0.4 }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  const rings = useMemo(() => {
    const arr: { r: number; z: number; rot: number }[] = [];
    for (let k = 0; k < RINGS; k++) {
      const f = k / (RINGS - 1);
      arr.push({ r: radius * (1 - 0.7 * f), z: (f - 0.5) * 5, rot: k * 0.95 });
    }
    return arr;
  }, [radius]);

  useFrame((_, delta) => {
    const on = substrateRef.current;
    const k = 1 - Math.exp(-5 * delta);
    speedRef.current += ((on ? 5 : 0.8) - speedRef.current) * k;
    if (spinRef.current) spinRef.current.rotation.z += speedRef.current * delta;
    mat.emissive.lerp(on ? ON_COLOR : OFF_COLOR, k);
    mat.color.lerp(on ? ON_COLOR : OFF_COLOR, k);
    mat.emissiveIntensity += ((on ? 2.2 : 0.4) - mat.emissiveIntensity) * k;
  });

  return (
    <group position={position}>
      <group ref={spinRef}>
        {rings.map((ring, i) => (
          <mesh key={i} position={[0, 0, ring.z]} rotation={[0, 0, ring.rot]} material={mat}>
            <torusGeometry args={[ring.r, 0.12, 8, 36, Math.PI * 1.5]} />
          </mesh>
        ))}
      </group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 5.4, 10, 1, true]} />
        <meshBasicMaterial color="#6d28d9" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
