import type { PhysicsState } from '../types';
import { START_POS } from '../constants/world';

export function createInitialPhysicsState(): PhysicsState {
  return {
    pos: [START_POS[0], START_POS[1], START_POS[2]],
    vel: [0, 0, 0],
    effluxActive: false,
    heldStatus: null,
    holdTimer: 0,
    route: 'transcellular',
    effluxCount: 0,
  };
}

/** MoleculeController だけが書き込む。描画系は useFrame で読む。 */
export const physicsRef: { current: PhysicsState } = { current: createInitialPhysicsState() };
