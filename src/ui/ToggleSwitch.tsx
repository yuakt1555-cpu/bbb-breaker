import type { ReactNode } from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
  description?: string;
  /** ON 時の色（Tailwind クラスは静的に列挙） */
  tone?: 'rose' | 'amber' | 'cyan';
}

const ON_BG: Record<NonNullable<ToggleSwitchProps['tone']>, string> = {
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
};

export function ToggleSwitch({
  label,
  checked,
  onChange,
  icon,
  description,
  tone = 'cyan',
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-left transition hover:border-cyan-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
    >
      {icon ? <span className="shrink-0 text-slate-300">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-100">{label}</span>
        {description ? (
          <span className="block text-[11px] leading-snug text-slate-400">{description}</span>
        ) : null}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? ON_BG[tone] : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
