import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DrugType, PermeationStatus } from '../types';
import { MOLECULE_RADIUS, PK } from '../constants/world';
import { physicsRef } from '../state/runtime';
import { useSimStore } from '../state/store';
import { useDrugProfile } from '../logic/useDrugProfile';

const DRUG_COLORS: Record<DrugType, string> = {
  acid: '#fb7185',
  base: '#a78bfa',
  neutral: '#34d399',
};
const AMBER = new THREE.Color('#f59e0b');
const RED = new THREE.Color('#ef4444');
const WHITE = new THREE.Color('#ffffff');

/** 水和殻：青い小球が分子のまわりを周回（InstancedMesh、最大 HYDRATION_MAX_PARTICLES 個）。 */
function HydrationShell({ level }: { level: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const count = Math.round(level * PK.HYDRATION_MAX_PARTICLES);
  const radius = 1.1 + 0.9 * level;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = count > 1 ? 1 - (i / (count - 1)) * 2 : 0;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      dummy.position.set(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, radius]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y += delta * 1.2;
    g.rotation.x += delta * 0.5;
  });

  return (
    <group ref={groupRef} visible={count > 0}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, PK.HYDRATION_MAX_PARTICLES]} frustumCulled={false}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.6} transparent opacity={0.6} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

/** 薬物分子本体。位置は physicsRef を useFrame で読んで命令的に設定する。 */
export function DrugMolecule() {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const drugType = useSimStore((s) => s.params.drugType);
  const status = useSimStore((s) => s.status);
  const profile = useDrugProfile();

  const statusRef = useRef<PermeationStatus>(status);
  statusRef.current = status;

  const baseColor = useMemo(() => new THREE.Color(DRUG_COLORS[drugType]), [drugType]);
  const baseRef = useRef(baseColor);
  baseRef.current = baseColor;
  const target = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    // 薬物タイプ変更時、即座に色を切り替える
    matRef.current?.color.copy(baseColor);
  }, [baseColor]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    const mat = matRef.current;
    if (!g || !mat) return;
    const t = state.clock.elapsedTime;
    const p = physicsRef.current.pos;
    g.position.set(p[0], p[1], p[2]);
    if (bodyRef.current) {
      bodyRef.current.rotation.x = t * 0.7;
      bodyRef.current.rotation.y = t * 1.1;
    }

    let intensity = 0.9;
    target.copy(baseRef.current);
    switch (statusRef.current) {
      case 'lipidSlowed':
      case 'lipidTrapped':
        target.copy(AMBER);
        intensity = 1.6;
        break;
      case 'repelledIonized':
      case 'repelledHydrophilic':
      case 'tightJunctionBlocked':
        target.copy(RED);
        intensity = 0.8 + 2.4 * Math.abs(Math.sin(t * 18));
        break;
      case 'pgpEfflux':
        target.copy(RED);
        intensity = Math.sin(t * 10) > 0 ? 2.6 : 0.5;
        break;
      case 'cleared':
        target.copy(WHITE);
        intensity = 3;
        break;
      default:
        break;
    }
    const k = 1 - Math.exp(-12 * delta);
    mat.emissive.lerp(target, k);
    mat.emissiveIntensity += (intensity - mat.emissiveIntensity) * k;
    if (lightRef.current) {
      lightRef.current.color.copy(mat.emissive);
      lightRef.current.intensity = 6 + mat.emissiveIntensity * 4;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef}>
        <icosahedronGeometry args={[MOLECULE_RADIUS, 1]} />
        <meshStandardMaterial
          ref={matRef}
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.2}
          toneMapped={false}
        />
      </mesh>
      <HydrationShell level={profile.hydrationLevel} />
      <pointLight ref={lightRef} color={baseColor} intensity={10} distance={12} />
    </group>
  );
}
