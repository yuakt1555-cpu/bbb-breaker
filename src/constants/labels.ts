import type { AreaId, DrugType, LipoZone, PermeationStatus, PredictedOutcome, Route } from '../types';

export type Tone = 'ok' | 'info' | 'warn' | 'danger';
export const AREA_LABELS: Record<AreaId, string> = {
  lumen: '① 脳毛細血管内腔', luminalMembrane: '② 管腔側 脂質二重膜', cytoplasm: '③ 内皮細胞質（P-gp）',
  abluminalMembrane: '④ 脳側 脂質二重膜', brain: '⑤ 脳実質（ゴール）', paracellular: '細胞間隙（タイトジャンクション経路）',
};
export const STATUS_LABELS: Record<PermeationStatus, { label: string; tone: Tone }> = {
  free: { label: '自由拡散中', tone: 'info' },
  permeating: { label: '膜透過中', tone: 'ok' },
  repelledIonized: { label: 'イオン形：水和殻で反発', tone: 'danger' },
  repelledHydrophilic: { label: '脂溶性不足：膜表面で反発', tone: 'danger' },
  lipidSlowed: { label: '脂溶性過多：膜内で減速', tone: 'warn' },
  lipidTrapped: { label: '脂質トラップ：膜内でスタック', tone: 'danger' },
  pgpEfflux: { label: 'P-gp により血管側へ排出', tone: 'danger' },
  tightJunctionBlocked: { label: 'タイトジャンクションに阻まれた', tone: 'danger' },
  paracellular: { label: '細胞間隙ルートを通過中', tone: 'warn' },
  cleared: { label: '受容体に到達！', tone: 'ok' },
};
export const DRUG_TYPE_LABELS: Record<DrugType, string> = { acid: '酸性', base: '塩基性', neutral: '中性' };
export const LIPO_ZONE_LABELS: Record<LipoZone, { label: string; tone: Tone }> = {
  tooHydrophilic: { label: '脂溶性不足（膜で反発）', tone: 'danger' },
  borderLow: { label: '境界域（低）：進入が困難', tone: 'warn' },
  optimal: { label: '適正脂溶性', tone: 'ok' },
  borderHigh: { label: '境界域（高）：膜内で減速', tone: 'warn' },
  lipidTrap: { label: '脂質トラップ', tone: 'danger' },
};
export const PREDICTED_LABELS: Record<PredictedOutcome, { label: string; tone: Tone }> = {
  transcellular: { label: '経細胞ルートで中枢移行可', tone: 'ok' },
  paracellular: { label: '細胞間隙ルート（髄膜炎時）で移行可', tone: 'warn' },
  blockedIonized: { label: 'イオン形のため膜で阻止', tone: 'danger' },
  blockedHydrophilic: { label: '脂溶性不足のため膜で阻止', tone: 'danger' },
  lipidTrap: { label: '脂質トラップで膜内に滞留', tone: 'danger' },
  pgpEfflux: { label: 'P-gp により血管側へ排出', tone: 'danger' },
};
export const ROUTE_LABELS: Record<Route, string> = { transcellular: '経細胞ルート（受動拡散）', paracellular: '細胞間隙ルート（傍細胞輸送）' };
