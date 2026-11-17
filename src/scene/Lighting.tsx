import { PARACELLULAR, GOAL, ZONES } from '../constants/world';

/** 背景色・フォグ・ライト一式。 */
export function Lighting() {
  return (
    <>
      <color attach="background" args={['#04060c']} />
      <fog attach="fog" args={['#04060c', 20, 70]} />
      <ambientLight intensity={0.55} color="#8aa4d6" />
      <directionalLight position={[8, 14, -10]} intensity={1.1} color="#cfe3ff" />
      <pointLight
        position={[0, 4, ZONES.lumen.zStart / 2]}
        intensity={120}
        distance={40}
        color="#ff6b6b"
      />
      <pointLight
        position={[0, 0, (ZONES.cytoplasm.zStart + ZONES.cytoplasm.zEnd) / 2]}
        intensity={90}
        distance={30}
        color="#a78bfa"
      />
      <pointLight
        position={[PARACELLULAR.xMin + 2, 0, PARACELLULAR.zStart + 2]}
        intensity={30}
        distance={14}
        color="#22d3ee"
      />
      <pointLight position={[GOAL.pos[0], GOAL.pos[1] + 4, GOAL.pos[2] - 4]} intensity={80} distance={30} color="#38bdf8" />
    </>
  );
}
