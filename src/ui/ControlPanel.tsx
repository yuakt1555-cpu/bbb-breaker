import type { ReactNode } from 'react';
import { Beaker, FlaskConical, PanelRightClose, PanelRightOpen, RotateCcw, ShieldAlert, Sparkles, Waves } from 'lucide-react';
import { useSimStore } from '../state/store';
import { useDrugProfile } from '../logic/useDrugProfile';
import { DRUG_TYPE_LABELS, LIPO_ZONE_LABELS, PREDICTED_LABELS } from '../constants/labels';
import type { Tone } from '../constants/labels';
import { PK, SLIDER_RANGES } from '../constants/world';
import type { DrugType } from '../types';
import { PresetSelector } from './PresetSelector';
import { ParamSlider } from './ParamSlider';
import { ToggleSwitch } from './ToggleSwitch';

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-emerald-300',
  info: 'text-cyan-300',
  warn: 'text-amber-300',
  danger: 'text-rose-300',
};
const TONE_BOX: Record<Tone, string> = {
  ok: 'border-emerald-500/40 bg-emerald-500/10',
  info: 'border-cyan-500/40 bg-cyan-500/10',
  warn: 'border-amber-500/40 bg-amber-500/10',
  danger: 'border-rose-500/40 bg-rose-500/10',
};

const DRUG_TYPES: DrugType[] = ['acid', 'base', 'neutral'];

const FORMULAS: Record<DrugType, string> = {
  acid: '分子形 = 1 / (1 + 10^(pH − pKa))',
  base: '分子形 = 1 / (1 + 10^(pKa − pH))',
  neutral: '分子形 = 1（解離しない）',
};

/** 分子形 % を有効数字 3 桁程度で表示（0.00200% など） */
function formatPercent(p: number): string {
  if (p >= 99.995) return '100.00';
  if (p >= 10) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  if (p < 1e-4) return p.toExponential(2);
  return p.toPrecision(3);
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-3 shadow backdrop-blur-md">
      <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function LipoBand({ logP }: { logP: number }) {
  const { min, max } = SLIDER_RANGES.logP;
  const span = max - min;
  const pct = (v: number) => ((v - min) / span) * 100;
  const segs: { from: number; to: number; cls: string }[] = [
    { from: min, to: PK.LOGP_LOW_BLOCK, cls: 'bg-rose-500/80' },
    { from: PK.LOGP_LOW_BLOCK, to: PK.LOGP_LOW_OK, cls: 'bg-amber-400/80' },
    { from: PK.LOGP_LOW_OK, to: PK.LOGP_HIGH_OK, cls: 'bg-emerald-500/80' },
    { from: PK.LOGP_HIGH_OK, to: PK.LOGP_HIGH_TRAP, cls: 'bg-amber-400/80' },
    { from: PK.LOGP_HIGH_TRAP, to: max, cls: 'bg-rose-500/80' },
  ];
  const marker = Math.min(100, Math.max(0, pct(logP)));
  return (
    <div className="mt-1.5">
      <div className="relative h-3 w-full overflow-hidden rounded-full">
        {segs.map((s) => (
          <div
            key={s.from}
            className={`absolute top-0 h-full ${s.cls}`}
            style={{ left: `${pct(s.from)}%`, width: `${pct(s.to) - pct(s.from)}%` }}
          />
        ))}
        <div
          className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-white shadow-[0_0_4px_#fff]"
          style={{ left: `${marker}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function ResultRow({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono tabular-nums text-slate-100">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Bar({ ratio, cls }: { ratio: number; cls: string }) {
  const w = Math.min(100, Math.max(0, ratio * 100));
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${cls}`} style={{ width: `${w}%`, minWidth: w > 0 ? 2 : 0 }} />
    </div>
  );
}

export function ControlPanel() {
  const params = useSimStore((s) => s.params);
  const env = useSimStore((s) => s.env);
  const panelOpen = useSimStore((s) => s.panelOpen);
  const setPanelOpen = useSimStore((s) => s.setPanelOpen);
  const setDrugParams = useSimStore((s) => s.setDrugParams);
  const setEnv = useSimStore((s) => s.setEnv);
  const resetRun = useSimStore((s) => s.resetRun);
  const profile = useDrugProfile();

  const isNeutral = params.drugType === 'neutral';
  const zone = LIPO_ZONE_LABELS[profile.lipoZone];
  const predicted = PREDICTED_LABELS[profile.predicted];

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label={panelOpen ? 'コントロールパネルを閉じる' : 'コントロールパネルを開く'}
        aria-expanded={panelOpen}
        className="fixed top-3 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-slate-950/80 text-cyan-300 shadow backdrop-blur-md transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        {panelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
      </button>

      <aside
        aria-hidden={!panelOpen}
        className={`fixed top-0 right-0 z-30 h-dvh w-[min(340px,92vw)] overflow-y-auto overscroll-contain border-l border-cyan-500/20 bg-slate-950/60 p-3 pt-16 backdrop-blur-md transition-transform duration-300 ${
          panelOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <div className="space-y-3 pb-6">
          <Section icon={<FlaskConical size={14} />} title="プリセット">
            <PresetSelector />
          </Section>

          <Section icon={<Beaker size={14} />} title="薬物タイプ・pH">
            <div role="group" aria-label="薬物タイプ" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-900/70 p-1">
              {DRUG_TYPES.map((t) => {
                const active = params.drugType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDrugParams({ drugType: t })}
                    className={`rounded-md py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                      active ? 'bg-cyan-500/30 text-cyan-100' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {DRUG_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
            <ParamSlider
              label="pKa"
              value={params.pKa}
              {...SLIDER_RANGES.pKa}
              disabled={isNeutral}
              onChange={(v) => setDrugParams({ pKa: v })}
              hint={isNeutral ? '中性薬物は解離しないため pKa は計算に使われません。' : undefined}
            />
            <ParamSlider
              label="血液 pH"
              value={env.bloodPH}
              {...SLIDER_RANGES.bloodPH}
              format={(v) => v.toFixed(2)}
              onChange={(v) => setEnv({ bloodPH: v })}
            />
            <p className="rounded-md bg-slate-900/70 px-2 py-1.5 font-mono text-[11px] leading-snug text-slate-300">
              {FORMULAS[params.drugType]}
            </p>
          </Section>

          <Section icon={<Waves size={14} />} title="脂溶性 logP">
            <ParamSlider
              label="logP"
              value={params.logP}
              {...SLIDER_RANGES.logP}
              onChange={(v) => setDrugParams({ logP: v })}
            >
              <LipoBand logP={params.logP} />
            </ParamSlider>
            <p className={`text-xs ${TONE_TEXT[zone.tone]}`}>{zone.label}</p>
          </Section>

          <Section icon={<ShieldAlert size={14} />} title="輸送体・病態">
            <ToggleSwitch
              label="P-gp 基質"
              description="ON で細胞質から血管側へ汲み出される"
              tone="rose"
              checked={params.pgpSubstrate}
              onChange={(v) => setDrugParams({ pgpSubstrate: v })}
            />
            <ToggleSwitch
              label="髄膜炎モード"
              description="炎症でタイトジャンクションが緩む"
              tone="amber"
              checked={env.meningitis}
              onChange={(v) => setEnv({ meningitis: v })}
            />
            {env.meningitis ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-200">
                細胞間隙（右端 x ≥ 8 の通路）から突破可能
              </p>
            ) : null}
          </Section>

          <Section icon={<Sparkles size={14} />} title="計算結果">
            <ResultRow label="分子形（非解離型）" value={`${formatPercent(profile.unionizedPercent)}%`}>
              <Bar ratio={profile.unionizedPercent / 100} cls="bg-emerald-400" />
            </ResultRow>
            <ResultRow label="イオン形" value={`${formatPercent(profile.ionizedPercent)}%`}>
              <Bar ratio={profile.ionizedPercent / 100} cls="bg-sky-400" />
            </ResultRow>
            <ResultRow label="水和レベル" value={`${(profile.hydrationLevel * 100).toFixed(0)}%`}>
              <Bar ratio={profile.hydrationLevel} cls="bg-sky-500" />
            </ResultRow>
            <ResultRow label="膜進入障壁 B" value={profile.entryBarrier.toFixed(2)}>
              <Bar ratio={profile.entryBarrier} cls={profile.membranePassable ? 'bg-emerald-400' : 'bg-rose-400'} />
            </ResultRow>
            <ResultRow label="脂質トラップ度 s" value={profile.trapSeverity.toFixed(2)}>
              <Bar ratio={profile.trapSeverity} cls={profile.trapSeverity > 0 ? 'bg-amber-400' : 'bg-slate-600'} />
            </ResultRow>
            <div className={`rounded-lg border px-3 py-2 ${TONE_BOX[predicted.tone]}`}>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">予測</p>
              <p className={`text-sm font-medium ${TONE_TEXT[predicted.tone]}`}>{predicted.label}</p>
            </div>
          </Section>

          <button
            type="button"
            onClick={resetRun}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <RotateCcw size={16} />
            リスタート
          </button>
        </div>
      </aside>
    </>
  );
}
