import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GOAL } from '../constants/world';
import { useSimStore } from '../state/store';

/** ゴール受容体：発光する多面体と回転リング。脈動し、クリア時に強く光る。 */
export function TargetReceptor() {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const glowRef = useRef(1);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const cleared = useSimStore.getState().cleared;
    glowRef.current += ((cleared ? 4 : 1) - glowRef.current) * (1 - Math.exp(-4 * delta));
    const g = glowRef.current;
    const pulse = 1 + 0.12 * Math.sin(t * 3);
    if (coreRef.current) {
      coreRef.current.rotation.x += delta * 0.6;
      coreRef.current.rotation.y += delta * 0.9;
      coreRef.current.scale.setScalar(pulse * (cleared ? 1.25 : 1));
    }
    if (ringARef.current) ringARef.current.rotation.z += delta * 1.1;
    if (ringBRef.current) ringBRef.current.rotation.y += delta * 1.6;
    if (matRef.current) matRef.current.emissiveIntensity = (1.2 + 0.5 * Math.sin(t * 3)) * g;
    if (lightRef.current) lightRef.current.intensity = 60 * g;
  });

  return (
    <group position={GOAL.pos}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial ref={matRef} color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.2} toneMapped={false} roughness={0.3} />
      </mesh>
      <mesh ref={ringARef}>
        <torusGeometry args={[2.3, 0.07, 8, 48]} />
        <meshBasicMaterial color="#a5f3fc" toneMapped={false} />
      </mesh>
      <mesh ref={ringBRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.8, 0.05, 8, 48]} />
        <meshBasicMaterial color="#7dd3fc" toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} color="#22d3ee" intensity={60} distance={24} />
    </group>
  );
}
