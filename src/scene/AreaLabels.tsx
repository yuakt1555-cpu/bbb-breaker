import { Html } from '@react-three/drei';
import type { AreaId, Vec3 } from '../types';
import { AREA_LABELS } from '../constants/labels';
import { PARACELLULAR, WORLD, ZONES } from '../constants/world';

const LABEL_X = WORLD.xMin + 2;
const LABEL_Y = WORLD.yMax - 1.5;

const LABELS: { id: AreaId; pos: Vec3 }[] = [
  { id: 'lumen', pos: [LABEL_X, LABEL_Y, ZONES.lumen.zEnd - 5] },
  { id: 'luminalMembrane', pos: [LABEL_X, LABEL_Y, (ZONES.luminalMembrane.zStart + ZONES.luminalMembrane.zEnd) / 2] },
  { id: 'cytoplasm', pos: [LABEL_X, LABEL_Y, ZONES.cytoplasm.zStart + 2] },
  { id: 'abluminalMembrane', pos: [LABEL_X, LABEL_Y, (ZONES.abluminalMembrane.zStart + ZONES.abluminalMembrane.zEnd) / 2] },
  { id: 'brain', pos: [LABEL_X, LABEL_Y, ZONES.brain.zStart + 3] },
  { id: 'paracellular', pos: [(PARACELLULAR.xMin + PARACELLULAR.xMax) / 2, LABEL_Y, PARACELLULAR.zStart + 4] },
];

/** 各エリア入口付近の日本語ラベル（クリックを通さない）。 */
export function AreaLabels() {
  return (
    <>
      {LABELS.map((l) => (
        <Html key={l.id} position={l.pos} center pointerEvents="none" zIndexRange={[5, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded border border-cyan-500/30 bg-slate-950/60 px-1.5 py-0.5 text-[10px] font-medium text-cyan-100/90 backdrop-blur-sm">
            {AREA_LABELS[l.id]}
          </div>
        </Html>
      ))}
    </>
  );
}
