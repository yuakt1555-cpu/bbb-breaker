import { useState } from 'react';
import type { ComponentType } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Gauge,
  Keyboard,
  Lock,
  ShieldAlert,
  Undo2,
  Waves,
  Zap,
} from 'lucide-react';
import { useSimStore } from '../state/store';
import { useDrugProfile } from '../logic/useDrugProfile';
import { AREA_LABELS, STATUS_LABELS } from '../constants/labels';
import type { Tone } from '../constants/labels';
import type { AreaId, PermeationStatus } from '../types';

type IconType = ComponentType<{ className?: string }>;

const STATUS_ICONS: Record<PermeationStatus, IconType> = {
  free: Waves,
  permeating: Activity,
  repelledIonized: Zap,
  repelledHydrophilic: Droplets,
  lipidSlowed: Gauge,
  lipidTrapped: Lock,
  pgpEfflux: Undo2,
  tightJunctionBlocked: Ban,
  paracellular: Waves,
  cleared: CheckCircle2,
};

const TONE_BADGE: Record<Tone, string> = {
  ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  info: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
};

const STAGES: { id: AreaId; short: string }[] = [
  { id: 'lumen', short: '①' },
  { id: 'luminalMembrane', short: '②' },
  { id: 'cytoplasm', short: '③' },
  { id: 'abluminalMembrane', short: '④' },
  { id: 'brain', short: '⑤' },
];

function formatPercent(p: number): string {
  if (!Number.isFinite(p)) return '0.00000';
  if (p >= 1) return Math.min(p, 100).toFixed(2);
  if (p <= 0) return '0.00000';
  if (p < 1e-5) return p.toExponential(2);
  return p.toPrecision(3);
}

function warningFor(status: PermeationStatus, effluxCount: number): { text: string; tone: Tone } | null {
  switch (status) {
    case 'lipidTrapped':
      return { text: '脂質トラップ！膜の疎水層から抜け出せません。logP を下げてください', tone: 'danger' };
    case 'pgpEfflux':
      return { text: `P-gp が血管側へ排出中（排出 ${effluxCount} 回）`, tone: 'danger' };
    case 'tightJunctionBlocked':
      return { text: 'タイトジャンクションは閉じています（髄膜炎モードで開放）', tone: 'warn' };
    case 'repelledIonized':
      return { text: 'イオン形が水和して膜に弾かれた', tone: 'danger' };
    case 'repelledHydrophilic':
      return { text: '脂溶性不足で膜に弾かれた（logP ≥ 1.0 推奨）', tone: 'danger' };
    default:
      return null;
  }
}

export function Hud() {
  const area = useSimStore((s) => s.area);
  const status = useSimStore((s) => s.status);
  const effluxCount = useSimStore((s) => s.effluxCount);
  const profile = useDrugProfile();
  const [hintOpen, setHintOpen] = useState(true);

  const unionized = Math.max(0, Math.min(100, profile.unionizedPercent));
  const statusInfo = STATUS_LABELS[status];
  const StatusIcon = STATUS_ICONS[status];
  const warning = warningFor(status, effluxCount);
  const currentIdx = STAGES.findIndex((s) => s.id === area);

  return (
    <div className="pointer-events-none absolute top-3 left-3 z-10 w-[min(300px,calc(100vw-1.5rem))] space-y-2 text-slate-100">
      <div className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-3 shadow backdrop-blur-md">
        <div className="text-[10px] font-semibold tracking-widest text-cyan-300/80 uppercase">
          分子形（非解離型）比率
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="font-mono text-3xl leading-none font-bold text-cyan-200 tabular-nums">
            {formatPercent(profile.unionizedPercent)}
          </span>
          <span className="font-mono text-sm text-cyan-300/80">%</span>
        </div>
        <div
          className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-800"
          role="img"
          aria-label={`分子形 ${formatPercent(profile.unionizedPercent)}%、イオン形 ${formatPercent(profile.ionizedPercent)}%`}
        >
          <div className="h-full bg-cyan-400 transition-[width] duration-200" style={{ width: `${unionized}%` }} />
          <div className="h-full bg-fuchsia-400/70 transition-[width] duration-200" style={{ width: `${100 - unionized}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span><span className="text-cyan-300">■</span> 分子形</span>
          <span><span className="text-fuchsia-300">■</span> イオン形</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${TONE_BADGE[statusInfo.tone]}`}
          >
            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{statusInfo.label}</span>
          </span>
        </div>

        <div className="mt-3">
          <div className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">現在エリア</div>
          <div className="mt-0.5 text-sm font-medium text-slate-100">{AREA_LABELS[area]}</div>
          <div className="mt-1.5 flex items-center gap-1" aria-hidden="true">
            {STAGES.map((s, i) => {
              const active = s.id === area;
              const passed = currentIdx >= 0 && i < currentIdx;
              return (
                <div
                  key={s.id}
                  className={`flex h-5 flex-1 items-center justify-center rounded text-[10px] font-mono ${
                    active
                      ? 'bg-cyan-400 font-bold text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                      : passed
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {s.short}
                </div>
              );
            })}
          </div>
          {area === 'paracellular' && (
            <div className="mt-1 text-[10px] text-amber-300">細胞間隙ルートを移動中</div>
          )}
        </div>
      </div>

      {warning && (
        <div
          role="alert"
          className={`animate-pulse rounded-xl border px-3 py-2 text-xs font-semibold shadow backdrop-blur-md ${
            warning.tone === 'danger'
              ? 'border-rose-400/60 bg-rose-950/70 text-rose-200'
              : 'border-amber-400/60 bg-amber-950/70 text-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {warning.tone === 'danger' ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{warning.text}</span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-cyan-500/20 bg-slate-950/70 shadow backdrop-blur-md">
        <button
          type="button"
          onClick={() => setHintOpen((v) => !v)}
          aria-expanded={hintOpen}
          className="pointer-events-auto flex w-full items-center justify-between gap-2 px-3 py-2 text-[10px] font-semibold tracking-widest text-slate-300 uppercase"
        >
          <span className="inline-flex items-center gap-1.5">
            <Keyboard className="h-3.5 w-3.5 text-cyan-300" />
            操作ヒント
          </span>
          {hintOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {hintOpen && (
          <div className="space-y-2 px-3 pb-3 text-[11px] leading-relaxed text-slate-300">
            <div>
              <div className="font-semibold text-cyan-300">PC</div>
              WASD/矢印: 移動、Space/Shift: 上下、ドラッグ: 視点回転、ホイール: ズーム、R: リスタート
            </div>
            <div>
              <div className="font-semibold text-cyan-300">スマホ</div>
              左下スティック: 移動、1 本指ドラッグ: 視点回転、ピンチ: ズーム
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
