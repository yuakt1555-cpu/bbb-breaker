import type { InputAxes } from '../types';

export const inputState: { keyboard: InputAxes; joystick: InputAxes } = {
  keyboard: { forward: 0, right: 0, up: 0 },
  joystick: { forward: 0, right: 0, up: 0 },
};

function clamp1(x: number): number {
  return Math.max(-1, Math.min(1, x));
}

export function getCombinedInput(): InputAxes {
  const k = inputState.keyboard;
  const j = inputState.joystick;
  return {
    forward: clamp1(k.forward + j.forward),
    right: clamp1(k.right + j.right),
    up: clamp1(k.up + j.up),
  };
}
