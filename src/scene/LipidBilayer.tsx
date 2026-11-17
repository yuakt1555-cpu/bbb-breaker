import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARACELLULAR, WORLD, ZONES } from '../constants/world';
import type { MembraneSpec } from '../constants/world';
import { createRng } from './random';

const PITCH = 0.9;
const WAVE_AMP = 0.15;
const HEAD_RADIUS = 0.32;
const TAIL_RADIUS = 0.045;
const TAIL_DX = 0.12;
const X_MIN = WORLD.xMin;
const X_MAX = PARACELLULAR.xMin; // 細胞は x ∈ [-12, 8)
const FADE_NEAR = 3; // これより近い（view space 距離）と完全に透明
const FADE_FAR = 7; // これ以上遠いと元の不透明度

const fadeCacheKey = () => 'bilayer-near-fade';

/** カメラに近い部分ほど alpha を下げ、手前の脂質が視界をふさがないようにする。 */
function fadeNearCamera(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    `#include <dithering_fragment>
    gl_FragColor.a *= smoothstep(${FADE_NEAR.toFixed(1)}, ${FADE_FAR.toFixed(1)}, length(vViewPosition));`,
  );
}

interface Props {
  zStart: number;
  spec?: MembraneSpec;
}

interface Lipid {
  x: number;
  y: number;
  zHead: number; // 頭部の基準 z
  zTail: number; // 尾部中心の基準 z
}

/**
 * 波打つ半透明の脂質二重膜。頭部（球）と尾部（細い円柱 ×2）を InstancedMesh で描画。
 * 2 フレームに 1 回、平行移動成分だけを instanceMatrix へ直接書き込む。
 */
export function LipidBilayer({ zStart, spec = ZONES.luminalMembrane }: Props) {
  const headRef = useRef<THREE.InstancedMesh>(null);
  const tailRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef(0);

  const zEnd = zStart + (spec.zEnd - spec.zStart);
  const tailLen = (zEnd - zStart) / 2 - spec.headThickness - 0.1;

  const lipids = useMemo<Lipid[]>(() => {
    const rnd = createRng(Math.round(zStart * 100) + 7);
    const nx = Math.floor((X_MAX - X_MIN) / PITCH);
    const ny = Math.floor((WORLD.yMax - WORLD.yMin) / PITCH);
    const list: Lipid[] = [];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const x = X_MIN + (i + 0.5) * PITCH + (rnd() - 0.5) * 0.15;
        const y = WORLD.yMin + (j + 0.5) * PITCH + (rnd() - 0.5) * 0.15;
        const jz = (rnd() - 0.5) * 0.12;
        // 下側リーフレット（頭部が低 z 側）
        list.push({
          x,
          y,
          zHead: zStart + spec.headThickness / 2 + jz,
          zTail: zStart + spec.headThickness + tailLen / 2 + jz,
        });
        // 上側リーフレット（頭部が高 z 側）
        list.push({
          x,
          y,
          zHead: zEnd - spec.headThickness / 2 - jz,
          zTail: zEnd - spec.headThickness - tailLen / 2 - jz,
        });
      }
    }
    return list;
  }, [zStart, zEnd, spec.headThickness, tailLen]);

  const headGeo = useMemo(() => new THREE.SphereGeometry(HEAD_RADIUS, 10, 8), []);
  const tailGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(TAIL_RADIUS, TAIL_RADIUS, tailLen, 5, 1);
    g.rotateX(Math.PI / 2); // 軸を Z へ（膜の内側へ向ける）
    return g;
  }, [tailLen]);

  const writeMatrices = (t: number) => {
    const head = headRef.current;
    const tail = tailRef.current;
    if (!head || !tail) return;
    const ha = head.instanceMatrix.array as Float32Array;
    const ta = tail.instanceMatrix.array as Float32Array;
    for (let i = 0; i < lipids.length; i++) {
      const l = lipids[i];
      const w = WAVE_AMP * Math.sin(l.x * 0.5 + l.y * 0.3 + t);
      const h = i * 16;
      ha[h + 12] = l.x;
      ha[h + 13] = l.y;
      ha[h + 14] = l.zHead + w;
      const a = i * 32;
      ta[a + 12] = l.x - TAIL_DX;
      ta[a + 13] = l.y;
      ta[a + 14] = l.zTail + w;
      ta[a + 16 + 12] = l.x + TAIL_DX;
      ta[a + 16 + 13] = l.y;
      ta[a + 16 + 14] = l.zTail + w;
    }
    head.instanceMatrix.needsUpdate = true;
    tail.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const head = headRef.current;
    const tail = tailRef.current;
    if (!head || !tail) return;
    const id = new THREE.Matrix4();
    for (let i = 0; i < lipids.length; i++) {
      head.setMatrixAt(i, id);
      tail.setMatrixAt(i * 2, id);
      tail.setMatrixAt(i * 2 + 1, id);
    }
    writeMatrices(0);
  }, [lipids]);

  useFrame((state) => {
    frameRef.current += 1;
    if (frameRef.current % 2 !== 0) return;
    writeMatrices(state.clock.elapsedTime);
  });

  return (
    <group>
      <instancedMesh key={`h${lipids.length}`} ref={headRef} args={[headGeo, undefined, lipids.length]} frustumCulled={false}>
        <meshStandardMaterial
          color="#bfe9f7"
          emissive="#3b82a6"
          emissiveIntensity={0.35}
          transparent
          opacity={0.7}
          roughness={0.4}
          depthWrite={false}
          onBeforeCompile={fadeNearCamera}
          customProgramCacheKey={fadeCacheKey}
        />
      </instancedMesh>
      <instancedMesh key={`t${lipids.length}`} ref={tailRef} args={[tailGeo, undefined, lipids.length * 2]} frustumCulled={false}>
        <meshStandardMaterial
          color="#f5a524"
          emissive="#b45309"
          emissiveIntensity={0.4}
          transparent
          opacity={0.5}
          roughness={0.6}
          depthWrite={false}
          onBeforeCompile={fadeNearCamera}
          customProgramCacheKey={fadeCacheKey}
        />
      </instancedMesh>
    </group>
  );
}
