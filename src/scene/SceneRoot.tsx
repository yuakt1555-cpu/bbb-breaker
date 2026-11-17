import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { START_POS, ZONES } from '../constants/world';
import { Lighting } from './Lighting';
import { BloodLumen } from './BloodLumen';
import { TightJunction } from './TightJunction';
import { LipidBilayer } from './LipidBilayer';
import { Cytoplasm } from './Cytoplasm';
import { BrainParenchyma } from './BrainParenchyma';
import { DrugMolecule } from './DrugMolecule';
import { MoleculeController } from './MoleculeController';
import { FollowCamera, INITIAL_CAMERA_OFFSET } from './FollowCamera';
import { AreaLabels } from './AreaLabels';

/** 全画面 <Canvas> と全 3D 要素の合成。 */
export function SceneRoot() {
  return (
    <Canvas
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{
        fov: 55,
        near: 0.1,
        far: 200,
        position: [
          START_POS[0] + INITIAL_CAMERA_OFFSET[0],
          START_POS[1] + INITIAL_CAMERA_OFFSET[1],
          START_POS[2] + INITIAL_CAMERA_OFFSET[2],
        ],
      }}
    >
      <Lighting />
      <BloodLumen />
      <TightJunction />
      <LipidBilayer zStart={ZONES.luminalMembrane.zStart} spec={ZONES.luminalMembrane} />
      <Cytoplasm />
      <LipidBilayer zStart={ZONES.abluminalMembrane.zStart} spec={ZONES.abluminalMembrane} />
      <BrainParenchyma />
      <DrugMolecule />
      <MoleculeController />
      <FollowCamera />
      <AreaLabels />
    </Canvas>
  );
}
