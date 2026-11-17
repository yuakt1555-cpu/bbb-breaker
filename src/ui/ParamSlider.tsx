import { useId } from 'react';
import type { ReactNode } from 'react';

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** 値の表示用フォーマット */
  format?: (value: number) => string;
  /** スライダー下に出す補足（無効理由など） */
  hint?: ReactNode;
  /** スライダー本体の下に差し込む要素（色帯など） */
  children?: ReactNode;
}

export function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  format,
  hint,
  children,
}: ParamSliderProps) {
  const id = useId();
  const text = format ? format(value) : value.toFixed(1);
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs text-slate-300">
          {label}
        </label>
        <span className="font-mono text-sm tabular-nums text-cyan-300">{text}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-5 w-full cursor-pointer accent-cyan-400 disabled:cursor-not-allowed"
      />
      {children}
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p> : null}
    </div>
  );
}
