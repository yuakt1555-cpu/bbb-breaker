export type Vec3 = [number, number, number];

export type DrugType = 'acid' | 'base' | 'neutral';
export type PresetId = 'diazepam' | 'domperidone' | 'loperamide' | 'penicillinG';

export interface DrugParams {
  drugType: DrugType;
  pKa: number;          // 2.0 – 11.0（neutral では計算に使わない）
  logP: number;         // -2.0 – +6.0
  pgpSubstrate: boolean;
}

export interface EnvParams {
  bloodPH: number;      // 6.8 – 7.8（既定 7.4）
  meningitis: boolean;  // 髄膜炎（炎症）モード
}

export type AreaId =
  | 'lumen'             // 脳毛細血管内腔
  | 'luminalMembrane'   // 管腔側 脂質二重膜
  | 'cytoplasm'         // 内皮細胞質
  | 'abluminalMembrane' // 脳側 脂質二重膜
  | 'brain'             // 脳実質
  | 'paracellular';     // 細胞間隙（タイトジャンクション経路）

export type MembraneLayer = 'lowerHead' | 'core' | 'upperHead';

export type PermeationStatus =
  | 'free'                 // 水相を自由移動中
  | 'permeating'           // 膜を透過中
  | 'repelledIonized'      // イオン形・水和殻により反発
  | 'repelledHydrophilic'  // 脂溶性不足で反発
  | 'lipidSlowed'          // 脂溶性過多で減速（境界域）
  | 'lipidTrapped'         // 脂質トラップ（スタック）
  | 'pgpEfflux'            // P-gp により排出中／排出された
  | 'tightJunctionBlocked' // タイトジャンクションに阻まれた
  | 'paracellular'         // 細胞間隙ルートを通過中
  | 'cleared';             // ゴール到達

export type Route = 'transcellular' | 'paracellular';

export type LipoZone = 'tooHydrophilic' | 'borderLow' | 'optimal' | 'borderHigh' | 'lipidTrap';

export type PredictedOutcome =
  | 'transcellular'       // 経細胞ルートで突破可能
  | 'paracellular'        // 髄膜炎時の細胞間隙ルートでのみ突破可能
  | 'blockedIonized'      // イオン形のため膜で弾かれる
  | 'blockedHydrophilic'  // 脂溶性不足で膜で弾かれる
  | 'lipidTrap'           // 膜内でスタック
  | 'pgpEfflux';          // P-gp で血管側へ排出

export interface DrugProfile {
  unionizedFraction: number;  // 0–1
  unionizedPercent: number;   // 0–100
  ionizedPercent: number;     // 0–100
  ionPenalty: number;         // -log10(unionizedFraction) ≥ 0
  hydrationLevel: number;     // 0–1（水和殻の量）
  ionBarrier: number;         // 0–1
  lipoBarrier: number;        // 0–1
  entryBarrier: number;       // 0–1（膜進入障壁の合成値）
  trapSeverity: number;       // 0–1（脂質トラップ度 s）
  coreMobility: number;       // 疎水層内の移動度 0.03–0.75
  lipoZone: LipoZone;
  membranePassable: boolean;
  coreEscapable: boolean;
  predicted: PredictedOutcome;
}

export interface PhysicsState {
  pos: Vec3;
  vel: Vec3;
  effluxActive: boolean;              // P-gp に捕捉され排出中
  heldStatus: PermeationStatus | null; // 一時的に表示を保持するステータス
  holdTimer: number;                  // 秒
  route: Route;
  effluxCount: number;
}

export interface StepInput {
  move: Vec3;  // ワールド座標の希望移動方向。長さ ≤ 1
  dt: number;  // 秒
}

export interface StepResult {
  state: PhysicsState;
  area: AreaId;
  layer: MembraneLayer | null;
  status: PermeationStatus;
  reachedGoal: boolean;
  effluxStarted: boolean;  // このステップで P-gp 捕捉が始まった
}

export interface InputAxes {
  forward: number; // -1..1（カメラ前方 = +）
  right: number;   // -1..1
  up: number;      // -1..1
}

export interface ClearInfo {
  presetId: PresetId | null;
  route: Route;
  elapsedSec: number;
  effluxCount: number;
  params: DrugParams;
  env: EnvParams;
}

export interface DrugPreset {
  id: PresetId;
  name: string;          // 日本語名
  nameEn: string;
  category: string;      // 薬効分類
  cnsLabel: string;      // 例 '中枢移行 ◎'
  params: DrugParams;
  summary: string;       // パネルに出す 1〜2 文
  explanation: string;   // クリアモーダル等に出す解説
  keyPoints: string[];   // 試験に出るポイント
  note?: string;         // ゲーム上の単純化に関する注記
}
