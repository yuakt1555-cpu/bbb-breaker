import { PRESETS, PRESET_ORDER } from '../constants/presets';
import { useSimStore } from '../state/store';

export function PresetSelector() {
  const presetId = useSimStore((s) => s.presetId);
  const applyPreset = useSimStore((s) => s.applyPreset);
  const preset = presetId ? PRESETS[presetId] : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {PRESET_ORDER.map((id) => {
          const p = PRESETS[id];
          const active = id === presetId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              aria-pressed={active}
              className={`rounded-lg border px-2 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                active
                  ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                  : 'border-slate-700/70 bg-slate-900/60 hover:border-cyan-500/40'
              }`}
            >
              <span className="block text-sm font-medium text-slate-100">{p.name}</span>
              <span className="block text-[11px] text-slate-400">{p.cnsLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-900/50 p-3">
        {preset ? (
          <>
            <p className="text-[11px] text-cyan-300">{preset.category}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-200">{preset.summary}</p>
            {preset.note ? (
              <p className="mt-2 text-[11px] leading-snug text-amber-300/90">注：{preset.note}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-100">カスタム</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              パラメータを自由に変更中です。プリセットを選ぶと設定が戻ります。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
