import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARACELLULAR, TIGHT_JUNCTION, WORLD } from '../constants/world';
import { useSimStore } from '../state/store';

const V_STEP = 0.5; // 縦バーの間隔（x）
const H_STEP = 1.0; // 横バーの間隔（y）
const CYAN = new THREE.Color('#22d3ee');
const ORANGE = new THREE.Color('#fb923c');

/** タイトジャンクションの発光格子（髄膜炎で開く）と細胞間隙の側壁（x=8）。 */
export function TightJunction() {
  const vRef = useRef<THREE.InstancedMesh>(null);
  const hRef = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.4, toneMapped: false }),
    [],
  );
  const openRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const width = TIGHT_JUNCTION.xMax - TIGHT_JUNCTION.xMin;
  const height = WORLD.yMax - WORLD.yMin;
  const nV = Math.round(width / V_STEP) + 1;
  const nH = Math.round(height / H_STEP) + 1;
  const wallDepth = PARACELLULAR.zEnd - PARACELLULAR.zStart;
  const cx = (TIGHT_JUNCTION.xMin + TIGHT_JUNCTION.xMax) / 2;

  useFrame((state, delta) => {
    const vMesh = vRef.current;
    const hMesh = hRef.current;
    if (!vMesh || !hMesh) return;
    const meningitis = useSimStore.getState().env.meningitis;
    const target = meningitis ? 1 : 0;
    openRef.current += (target - openRef.current) * (1 - Math.exp(-3 * delta));
    const o = openRef.current;
    const t = state.clock.elapsedTime;

    const thick = 0.1 * (1 - 0.65 * o);
    for (let i = 0; i < nV; i++) {
      const x0 = TIGHT_JUNCTION.xMin + i * V_STEP;
      const shift = (i % 2 === 0 ? -1 : 1) * o * 0.18;
      const x = Math.min(TIGHT_JUNCTION.xMax, Math.max(TIGHT_JUNCTION.xMin, x0 + shift));
      dummy.position.set(x, 0, TIGHT_JUNCTION.z);
      dummy.scale.set(thick, height, thick);
      dummy.updateMatrix();
      vMesh.setMatrixAt(i, dummy.matrix);
    }
    for (let j = 0; j < nH; j++) {
      const y0 = WORLD.yMin + j * H_STEP;
      const shift = (j % 2 === 0 ? -1 : 1) * o * 0.3;
      dummy.position.set(cx, y0 + shift, TIGHT_JUNCTION.z);
      dummy.scale.set(width, thick, thick);
      dummy.updateMatrix();
      hMesh.setMatrixAt(j, dummy.matrix);
    }
    vMesh.instanceMatrix.needsUpdate = true;
    hMesh.instanceMatrix.needsUpdate = true;

    tmpColor.copy(CYAN).lerp(ORANGE, o);
    mat.color.copy(tmpColor);
    mat.emissive.copy(tmpColor);
    const flicker = 1 + o * 0.6 * Math.sin(t * 14) * Math.sin(t * 5.3);
    mat.emissiveIntensity = (1.4 + o * 0.8) * flicker;
  });

  return (
    <group>
      <instancedMesh ref={vRef} args={[undefined, mat, nV]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={hRef} args={[undefined, mat, nH]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {/* 細胞間隙の側壁（細胞側面膜）x = 8 */}
      <mesh position={[PARACELLULAR.xMin, 0, PARACELLULAR.zStart + wallDepth / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[wallDepth, height]} />
        <meshBasicMaterial color="#0e7490" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
