import { useEffect } from 'react';
import { inputState } from '../state/input';
import { useSimStore } from '../state/store';

const MOVE_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight',
]);

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
}

export function useKeyboardControls(): void {
  useEffect(() => {
    const pressed = new Set<string>();

    const recompute = (): void => {
      const has = (c: string): number => (pressed.has(c) ? 1 : 0);
      const k = inputState.keyboard;
      k.forward = has('KeyW') + has('ArrowUp') > 0 ? 1 : 0;
      const back = has('KeyS') + has('ArrowDown') > 0 ? 1 : 0;
      k.forward = k.forward - back;
      const r = has('KeyD') + has('ArrowRight') > 0 ? 1 : 0;
      const l = has('KeyA') + has('ArrowLeft') > 0 ? 1 : 0;
      k.right = r - l;
      const u = has('Space');
      const d = has('ShiftLeft') + has('ShiftRight') > 0 ? 1 : 0;
      k.up = u - d;
    };

    const releaseAll = (): void => {
      pressed.clear();
      recompute();
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      if (isIgnoredTarget(e.target)) return;
      if (e.code === 'KeyR') {
        if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
          useSimStore.getState().resetRun();
        }
        return;
      }
      if (!MOVE_CODES.has(e.code)) return;
      e.preventDefault();
      pressed.add(e.code);
      recompute();
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      if (!MOVE_CODES.has(e.code)) return;
      // keyup は対象に関わらず解除する（押しっぱなし防止）
      if (!isIgnoredTarget(e.target)) e.preventDefault();
      pressed.delete(e.code);
      recompute();
    };

    const onVisibility = (): void => {
      if (document.hidden) releaseAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibility);
      releaseAll();
    };
  }, []);
}
