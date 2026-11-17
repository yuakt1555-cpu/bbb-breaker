import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { inputState } from '../state/input';

const BASE_SIZE = 120;
const KNOB_SIZE = 52;
const MAX_TRAVEL = (BASE_SIZE - KNOB_SIZE) / 2; // ノブ中心の最大変位（px）
const DEAD_ZONE = 0.12;

function resetAxes(): void {
  inputState.joystick.forward = 0;
  inputState.joystick.right = 0;
}

/** 画面左下の仮想ジョイスティック。上 = 前進。 */
export function VirtualJoystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);

  const setKnob = (x: number, y: number) => {
    const knob = knobRef.current;
    if (knob) knob.style.transform = `translate(${x}px, ${y}px)`;
  };

  const release = () => {
    activeId.current = null;
    resetAxes();
    setKnob(0, 0);
  };

  const update = (e: ReactPointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > MAX_TRAVEL) {
      dx = (dx / len) * MAX_TRAVEL;
      dy = (dy / len) * MAX_TRAVEL;
    }
    setKnob(dx, dy);
    const nx = dx / MAX_TRAVEL;
    const ny = dy / MAX_TRAVEL;
    const mag = Math.hypot(nx, ny);
    if (mag < DEAD_ZONE) {
      resetAxes();
      return;
    }
    inputState.joystick.forward = -ny;
    inputState.joystick.right = nx;
  };

  useEffect(() => resetAxes, []);

  return (
    <div
      ref={baseRef}
      role="group"
      aria-label="移動スティック"
      onPointerDown={(e) => {
        if (activeId.current !== null) return;
        activeId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (activeId.current === e.pointerId) update(e);
      }}
      onPointerUp={(e) => {
        if (activeId.current === e.pointerId) release();
      }}
      onPointerCancel={(e) => {
        if (activeId.current === e.pointerId) release();
      }}
      onLostPointerCapture={(e) => {
        if (activeId.current === e.pointerId) release();
      }}
      style={{
        width: BASE_SIZE,
        height: BASE_SIZE,
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        touchAction: 'none',
      }}
      className="pointer-events-auto fixed left-6 z-20 flex items-center justify-center rounded-full border-2 border-cyan-400/50 bg-slate-950/60 opacity-50 shadow-[0_0_16px_rgba(34,211,238,0.25)] backdrop-blur-md transition-opacity select-none hover:opacity-90 max-md:opacity-100"
    >
      <div
        ref={knobRef}
        style={{ width: KNOB_SIZE, height: KNOB_SIZE }}
        className="pointer-events-none rounded-full border border-cyan-300/70 bg-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
      />
    </div>
  );
}
