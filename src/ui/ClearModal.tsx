import { useEffect, useMemo } from 'react';
import { Award, RotateCcw, X } from 'lucide-react';
import { useSimStore } from '../state/store';
import { PRESETS } from '../constants/presets';
import { DRUG_TYPE_LABELS, LIPO_ZONE_LABELS, ROUTE_LABELS } from '../constants/labels';
import { deriveDrugProfile } from '../logic/pharmacokinetics';
import type { ClearInfo } from '../types';

const CONFETTI_COLORS = ['#22d3ee', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#38bdf8'];

function fmtPercent(p: number): string {
  if (p >= 10) return p.toFixed(1);
  if (p >= 1e-4) return p.toPrecision(3);
  return p.toExponential(2);
}

/** カスタム薬物用の自動解説 */
function buildCustomExplanation(info: ClearInfo): string[] {
  const profile = deriveDrugProfile(info.params, info.env);
  const lines: string[] = [];
  if (info.params.drugType === 'neutral') {
    lines.push('中性薬物は解離しないため、血液 pH に関係なく分子形 100% で存在します。');
  } else {
    lines.push(
      `${DRUG_TYPE_LABELS[info.params.drugType]}薬物（pKa ${info.params.pKa.toFixed(1)}）は血液 pH ${info.env.bloodPH.toFixed(2)} で分子形が ${fmtPercent(profile.unionizedPercent)}% でした。` +
        (profile.ionBarrier > 0
          ? 'イオン形が多く水和殻ができるため、脂質二重膜に入りにくくなります。'
          : '分子形が十分に存在するため、膜への分配が妨げられません。'),
    );
  }
  lines.push(`脂溶性は logP ${info.params.logP.toFixed(1)} で「${LIPO_ZONE_LABELS[profile.lipoZone].label}」の領域です。`);
  lines.push(
    info.params.pgpSubstrate
      ? 'P-gp 基質に設定されていましたが、排出に抗って到達しました。'
      : 'P-gp の基質ではないため、内皮細胞から排出されませんでした。',
  );
  lines.push(
    info.route === 'paracellular'
      ? '髄膜炎でタイトジャンクションが緩み、細胞間隙（傍細胞輸送）ルートで脳へ移行しました。'
      : '脂質二重膜を受動拡散で通る経細胞ルートで脳へ移行しました。',
  );
  return lines;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 97) % 100,
        delay: ((i * 37) % 20) / 10,
        dur: 2.4 + ((i * 53) % 18) / 10,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + (i % 4) * 2,
        rot: (i * 47) % 360,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes bbb-confetti-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1 } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8 } }
        @keyframes bbb-modal-pop { 0% { transform: scale(0.85); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes bbb-glow { 0%,100% { box-shadow: 0 0 24px rgba(34,211,238,0.35) } 50% { box-shadow: 0 0 56px rgba(52,211,153,0.6) } }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `bbb-confetti-fall ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="font-mono text-sm tabular-nums text-slate-100">{value}</p>
    </div>
  );
}

export function ClearModal() {
  const clearInfo = useSimStore((s) => s.clearInfo);
  const resetRun = useSimStore((s) => s.resetRun);
  const closeModal = useSimStore((s) => s.closeModal);

  useEffect(() => {
    if (!clearInfo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearInfo, closeModal]);

  const customLines = useMemo(
    () => (clearInfo && !clearInfo.presetId ? buildCustomExplanation(clearInfo) : []),
    [clearInfo],
  );

  if (!clearInfo) return null;

  const preset = clearInfo.presetId ? PRESETS[clearInfo.presetId] : null;
  const { params, env } = clearInfo;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="クリア"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <Confetti />
      <div
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-400/40 bg-slate-950/90 p-5 backdrop-blur-md"
        style={{ animation: 'bbb-modal-pop 0.35s ease-out, bbb-glow 2.4s ease-in-out infinite' }}
      >
        <div className="flex items-center gap-3">
          <Award className="shrink-0 text-emerald-300" size={32} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">BBB 突破成功</p>
            <h2 className="truncate text-xl font-bold text-slate-50">
              {preset ? preset.name : 'カスタム薬物'}
            </h2>
            {preset ? <p className="text-xs text-slate-400">{preset.nameEn}</p> : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Stat label="ルート" value={ROUTE_LABELS[clearInfo.route]} />
          </div>
          <Stat label="所要時間" value={`${clearInfo.elapsedSec.toFixed(1)} 秒`} />
          <Stat label="P-gp 排出回数" value={`${clearInfo.effluxCount} 回`} />
          <div className="col-span-2">
            <Stat
              label="最終パラメータ"
              value={`${DRUG_TYPE_LABELS[params.drugType]}${params.drugType === 'neutral' ? '' : ` pKa ${params.pKa.toFixed(1)}`} / logP ${params.logP.toFixed(1)} / pH ${env.bloodPH.toFixed(2)} / P-gp ${params.pgpSubstrate ? 'ON' : 'OFF'} / 髄膜炎 ${env.meningitis ? 'ON' : 'OFF'}`}
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-cyan-500/20 bg-slate-900/60 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">解説</p>
          {preset ? (
            <>
              <p className="text-xs leading-relaxed text-slate-200">{preset.explanation}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-emerald-200">
                {preset.keyPoints.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-200">
              {customLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={resetRun}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/25 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <RotateCcw size={16} />
            もう一度
          </button>
          <button
            type="button"
            onClick={closeModal}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/70 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <X size={16} />
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
