# BBB Breaker 3D — 設計書（CLAUDE.md）

ブラウザで動作する 3D 薬学学習シミュレーションゲーム。薬物分子を操作し、
脳毛細血管内腔 → 管腔側脂質二重膜 → 内皮細胞質（P-gp） → 脳側脂質二重膜 → 脳実質（ゴール）
へと血液脳関門（BBB）を突破させる。パラメータ（薬物タイプ・pKa・logP・P-gp・髄膜炎）は
リアルタイムに分子の見た目と物理判定へ反映される。

> **このファイルが唯一の仕様書である。** 実装者（サブエージェント）は作業前に必ず全文を読み、
> 自分の担当ファイル以外は編集しないこと。仕様と実装が食い違う場合は仕様を正とする。

---

## 0. 技術スタック

| 項目 | 採用 |
|---|---|
| ビルド | Vite 6 系 + TypeScript 5（`strict: true`） |
| UI | React 19 |
| 3D | three（0.17x 系）, @react-three/fiber 9 系, @react-three/drei 10 系 |
| 状態管理 | zustand 5 系 |
| スタイル | Tailwind CSS 4 系（`@tailwindcss/vite` プラグイン、`src/index.css` で `@import "tailwindcss";`） |
| アイコン | lucide-react |
| テスト | vitest（ロジックのみ） |
| 公開 | GitHub Pages（GitHub Actions）。`vite.config.ts` の `base` は `'/bbb-breaker/'` |

npm scripts: `dev` / `build`（`tsc -b && vite build`）/ `preview` / `test`（`vitest run`）。

---

## 1. ディレクトリ構成と責務

```
bbb-breaker/
├─ CLAUDE.md                     本設計書
├─ .claude/agents/*.md           サブエージェント定義（scene-builder / ui-builder / logic-builder）
├─ .github/workflows/deploy.yml  GitHub Pages 自動デプロイ                         [T6]
├─ index.html                    lang="ja"、タイトル、viewport（user-scalable=no）   [T0]
├─ package.json / tsconfig*.json / vite.config.ts                                     [T0]
└─ src/
   ├─ main.tsx                   React エントリ                                       [T0]
   ├─ index.css                  Tailwind 読込・全画面・スクロール禁止・touch-action    [T0]
   ├─ App.tsx                    レイアウト合成（Scene/HUD/Panel/Modal/Joystick）       [T0, T5 が Joystick 追加]
   ├─ types.ts                   全共有型（§2.1 をそのまま転記）                        [T0]
   ├─ constants/
   │  ├─ world.ts                座標・物理定数・PK 定数（§4, §5 をそのまま転記）         [T0]
   │  ├─ presets.ts              プリセット 4 薬物（§6 をそのまま転記）                   [T0]
   │  └─ labels.ts               日本語ラベル辞書（§2.4）                               [T0]
   ├─ state/
   │  ├─ store.ts                zustand ストア（§2.2）                                 [T0]
   │  ├─ runtime.ts              毎フレーム更新する可変物理状態の共有 ref（§2.3）         [T0]
   │  └─ input.ts                キーボード / ジョイスティック入力の共有バッファ（§2.3）  [T0]
   ├─ logic/
   │  ├─ pharmacokinetics.ts     Henderson-Hasselbalch・障壁・トラップ・予測（§3）       [T1]
   │  ├─ physics.ts              stepPhysics / classifyArea（§5）                       [T1]
   │  ├─ useDrugProfile.ts       ストアの params/env から DrugProfile を返すフック       [T1]
   │  └─ pharmacokinetics.test.ts / physics.test.ts   vitest                            [T1]
   ├─ scene/
   │  ├─ SceneRoot.tsx           <Canvas> と全 3D 要素の合成（named export SceneRoot）   [T2]
   │  ├─ Lighting.tsx            ライト・fog・背景                                     [T2]
   │  ├─ BloodLumen.tsx          内腔＋流れる赤血球（InstancedMesh）                    [T2]
   │  ├─ TightJunction.tsx       発光格子バリア＋細胞間隙の側壁（髄膜炎で開く）           [T2]
   │  ├─ LipidBilayer.tsx        波打つ半透明脂質二重膜（props: zStart）                 [T2]
   │  ├─ Cytoplasm.tsx           細胞質の浮遊粒子＋ PgpPump の配置                       [T2]
   │  ├─ PgpPump.tsx             回転する吸引渦（P-gp）                                 [T2]
   │  ├─ BrainParenchyma.tsx     脳実質の背景＋ TargetReceptor                          [T2]
   │  ├─ TargetReceptor.tsx      光るゴール受容体                                       [T2]
   │  ├─ DrugMolecule.tsx        薬物分子本体＋水和殻（HydrationShell）                  [T2]
   │  ├─ MoleculeController.tsx  useFrame で入力→stepPhysics→runtime/store 反映         [T2]
   │  ├─ FollowCamera.tsx        OrbitControls ＋分子追従（T5 がタッチ設定を追記）        [T2, T5]
   │  └─ AreaLabels.tsx          各エリアの 3D ラベル（drei <Html>）                     [T2]
   ├─ ui/
   │  ├─ ControlPanel.tsx        右側コントロールパネル（named export ControlPanel）      [T3]
   │  ├─ PresetSelector.tsx      プリセット 4 ボタン＋解説カード                         [T3]
   │  ├─ ParamSlider.tsx         スライダー部品                                         [T3]
   │  ├─ ToggleSwitch.tsx        トグル部品                                             [T3]
   │  ├─ ClearModal.tsx          クリア演出＋薬学解説モーダル                            [T3]
   │  ├─ Hud.tsx                 左上 HUD（named export Hud）                           [T4]
   │  └─ VirtualJoystick.tsx     左下仮想ジョイスティック                               [T5]
   └─ input/
      └─ useKeyboardControls.ts  WASD/矢印/Space/Shift/R → input.ts                     [T4]
```

---

## 2. 状態管理の設計

### 2.1 共有型（`src/types.ts` — この内容をそのまま転記）

```ts
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
```

### 2.2 ストア（`src/state/store.ts`, zustand）

再レンダー削減のため、**60fps で変わる値（位置・速度）はストアに入れない**（§2.3 の runtime へ）。
ストアには「変化したときだけ」更新される値を置く。

```ts
interface SimStore {
  params: DrugParams;          // 既定 DEFAULT_PARAMS
  env: EnvParams;              // 既定 DEFAULT_ENV
  presetId: PresetId | null;   // 既定 'diazepam'

  area: AreaId;                // 既定 'lumen'
  status: PermeationStatus;    // 既定 'free'
  route: Route | null;         // 既定 null
  effluxCount: number;         // 既定 0

  cleared: boolean;
  clearInfo: ClearInfo | null;
  startedAt: number;           // performance.now()（ms）
  resetToken: number;          // resetRun のたびに +1。MoleculeController が監視して物理状態を初期化
  panelOpen: boolean;          // モバイルでのパネル開閉。既定: window.innerWidth >= 768

  setDrugParams(p: Partial<DrugParams>): void; // presetId を null にする
  setEnv(p: Partial<EnvParams>): void;         // presetId は維持
  applyPreset(id: PresetId): void;             // params をプリセット値に、env.bloodPH=7.4、meningitis は維持、presetId 設定、resetRun()
  setRuntime(r: { area: AreaId; status: PermeationStatus; route: Route | null; effluxCount: number }): void; // 値が変わったときだけ set
  markCleared(route: Route, effluxCount: number): void; // cleared=true, status='cleared', clearInfo を作成（elapsedSec は startedAt から算出）
  resetRun(): void;            // resetToken++, cleared=false, clearInfo=null, area='lumen', status='free', route=null, effluxCount=0, startedAt=now
  closeModal(): void;          // cleared は true のまま clearInfo だけ null（分子は停止したまま）
  setPanelOpen(open: boolean): void;
}
export const useSimStore = create<SimStore>()(...);
```

派生値（分子形比率など）はストアに保存せず、`useDrugProfile()`（T1）で `deriveDrugProfile(params, env)` を `useMemo` して得る。

### 2.3 可変共有 ref（再レンダーを起こさない）

`src/state/runtime.ts`
```ts
export function createInitialPhysicsState(): PhysicsState; // pos: START_POS のコピー, vel: [0,0,0], effluxActive:false, heldStatus:null, holdTimer:0, route:'transcellular', effluxCount:0
export const physicsRef: { current: PhysicsState };        // MoleculeController だけが書き込む。描画系は useFrame で読む
```

`src/state/input.ts`
```ts
export const inputState: { keyboard: InputAxes; joystick: InputAxes }; // 全て 0 で初期化。各入力源が自分のスロットだけ書く
export function getCombinedInput(): InputAxes; // keyboard + joystick を成分ごとに足して [-1,1] に clamp
```

### 2.4 ラベル辞書（`src/constants/labels.ts`）

```ts
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
```

Tone の配色（UI 共通）: ok = emerald, info = cyan, warn = amber, danger = rose。

---

## 3. 薬物動態の数式仕様（`src/logic/pharmacokinetics.ts`）

補助関数（同ファイルで export）:
- `clamp(x, lo, hi)`
- `smoothstep(e0, e1, x)`: `t = clamp((x - e0)/(e1 - e0), 0, 1); return t*t*(3 - 2*t)`
- `lerp(a, b, t)`

### 3.1 Henderson-Hasselbalch 式（分子形＝非解離型の比率）

`unionizedFraction(drugType, pKa, pH): number`

| タイプ | 解離平衡 | 分子形比率 f<sub>un</sub> |
|---|---|---|
| 酸性（HA ⇌ H⁺ + A⁻） | pH − pKa = log([A⁻]/[HA]) | `f_un = 1 / (1 + 10^(pH − pKa))` |
| 塩基性（BH⁺ ⇌ B + H⁺） | pKa − pH = log([BH⁺]/[B]) | `f_un = 1 / (1 + 10^(pKa − pH))` |
| 中性 | 解離しない | `f_un = 1`（pKa は無視） |

- 分子形 % = `f_un × 100`、イオン形 % = `100 − 分子形 %`。
- 数値安定のため `f_un` は計算後 `[1e-12, 1]` に clamp。

### 3.2 イオン化による反発（水和殻）

- イオン化ペナルティ `p = −log10(f_un)`（≥ 0。分子形が 1 桁減るごとに +1）
- 水和レベル `H = clamp(p / PK.HYDRATION_FULL_PENALTY, 0, 1)`（`HYDRATION_FULL_PENALTY = 4`）
  - 水和殻の水分子パーティクル数 = `round(H × PK.HYDRATION_MAX_PARTICLES)`（最大 60）
  - 殻半径 = `1.1 + 0.9 × H`
- イオン障壁 `B_ion = smoothstep(1.5, 3.0, p)`
  - 分子形 ≥ 約 3.2%（p ≤ 1.5）なら障壁 0：分子形が膜に分配されると平衡が移動して分子形が補充されるため（pH 分配仮説）。
  - 分子形 ≤ 0.1%（p ≥ 3.0）で障壁 1（完全反発）。間は連続。
  - 対数スケールを用いる理由は、受動拡散速度が f<sub>un</sub> に比例し、桁で効くため。

### 3.3 logP 閾値ごとの挙動（連続関数で定義）

**(a) 膜進入時の疎水性不足障壁**
`B_lipo = 1 − smoothstep(0.5, 1.0, logP)`

| logP | B_lipo | 挙動 |
|---|---|---|
| < 0.5 | 1 | 膜表面（親水性頭部層）で弾かれる |
| 0.5 – 1.0 | 1 → 0 を smoothstep で連続減少 | 弾かれ方が徐々に弱まり、約 0.78 以上で（押し続ければ）ゆっくり進入可能。進入速度も連続的に上がる |
| ≥ 1.0 | 0 | 抵抗なく進入 |

**(b) 合成進入障壁**
`B = 1 − (1 − B_ion)(1 − B_lipo)`（どちらか一方でも高ければ高い）

膜を押し通せる条件（§5 の力の釣り合いから導出）: `ACCEL × M_HEAD > K_REPEL × B`
⇔ `B < BARRIER_PASS_LIMIT = ACCEL × M_HEAD / K_REPEL = 20 × 0.6 / 30 = 0.4` → `membranePassable`

**(c) 脂質トラップ（疎水層内）**
- トラップ度 `s = smoothstep(4.0, 4.5, logP)`
- 疎水層内の移動度 `m_core = lerp(0.75, 0.03, s)`
- 疎水層中心へ引き戻す保持力の最大値 `K_TRAP × s³`

| logP | s | 挙動 |
|---|---|---|
| 1.0 – 4.0 | 0 | 適正。m_core = 0.75 で膜をすり抜ける |
| 4.0 – 4.5 | 0 → 1 連続 | 移動度が連続的に低下（`lipidSlowed`）し、保持力が s³ で増加。約 4.28 を超えると脱出不能（`lipidTrapped`） |
| > 4.5 | 1 | m_core = 0.03（速度が極端に低下）＋保持力 30 で膜内にスタック。警告表示 |

脱出可能条件: `ACCEL × m_core > K_TRAP × s³` → `coreEscapable`

**(d) lipoZone 判定**（表示用）
`logP < 0.5: tooHydrophilic` / `< 1.0: borderLow` / `≤ 4.0: optimal` / `< 4.5: borderHigh` / それ以上 `lipidTrap`

### 3.4 P-gp 斥力

- `params.pgpSubstrate === true` のときのみ作用。
- 経細胞ルート（x < 8）で分子中心が `z ≥ PGP_CAPTURE_Z (=5)` かつ `z < 22`（細胞質内）に達した瞬間に「捕捉」（`effluxActive = true`, `effluxCount++`）。
- 捕捉中は区域に関係なく `−Z` 方向に `PGP_PUSH = 35` の加速度を与え、膜の障壁力・トラップ力・移動度低下を無視する（ポンプが能動輸送で押し出すため）。プレイヤーの推進 `ACCEL = 20` を常に上回るので必ず押し戻される。
- ポンプ渦の近傍（各ポンプ軸から XY 距離 d < 5、|z − pump.z| < 6）では接線方向の渦力 `PGP_SWIRL × (1 − d/5)` を加える（演出）。
- `z < PGP_RELEASE_Z (=−4)`（血管内腔に戻った）で解放。解放時に `heldStatus='pgpEfflux'` を `PGP_HOLD_TIME = 2.0` 秒保持。
- 捕捉中に P-gp トグルが OFF にされたら即解放。

### 3.5 髄膜炎モード（タイトジャンクション）

- 細胞間隙ルート: `x ∈ [8, 12]` かつ `z ∈ [0, 26)`。
- タイトジャンクション格子: 平面 `z = 0`, `x ∈ [8, 12]`, `y ∈ [−8, 8]`。
- `env.meningitis === false`: 格子は剛体壁。前フレーム z < 0 かつ新 z ≥ 0 かつ新 x ≥ 8 なら `z = −0.01`, `vel.z = −|vel.z| × 0.5`, `heldStatus='tightJunctionBlocked'`（1.2 秒）。**どんな薬物も通れない。**
- `env.meningitis === true`: 格子が開き、薬物の性質（イオン形・logP・P-gp）に関係なく細胞間隙を通過できる（膜障壁・P-gp は細胞間隙ルートでは作用しない）。
- 細胞間隙と細胞の境界 `x = 8`（z ∈ [0, 26)）は側壁（細胞の側面膜）で、横方向には相互に通り抜けられない。

### 3.6 予測（`predictOutcome` — パネル表示用、§5 の物理と同じ不等式を使う）

```
if (membranePassable && coreEscapable && !pgpSubstrate) return 'transcellular';
if (meningitis) return 'paracellular';
if (!membranePassable) return ionBarrier >= lipoBarrier ? 'blockedIonized' : 'blockedHydrophilic';
if (!coreEscapable) return 'lipidTrap';
return 'pgpEfflux';
```

### 3.7 export 一覧（`pharmacokinetics.ts`）

```ts
export function clamp(x: number, lo: number, hi: number): number;
export function smoothstep(e0: number, e1: number, x: number): number;
export function lerp(a: number, b: number, t: number): number;
export function unionizedFraction(drugType: DrugType, pKa: number, pH: number): number;
export function ionPenalty(fUn: number): number;
export function hydrationLevel(fUn: number): number;
export function ionBarrier(fUn: number): number;
export function lipoEntryBarrier(logP: number): number;
export function combinedEntryBarrier(bIon: number, bLipo: number): number;
export function lipidTrapSeverity(logP: number): number;
export function coreMobility(logP: number): number;
export function lipoZone(logP: number): LipoZone;
export function deriveDrugProfile(params: DrugParams, env: EnvParams): DrugProfile;
```

---

## 4. 3D 空間：各エリアの座標範囲と当たり判定

座標系: 右手系、+Y が上。**進行方向は +Z（血管 → 脳）**。単位は任意（1 = 約分子 1 個分）。
判定はすべて**分子中心座標**で行う（分子半径 0.8 は描画のみ）。

| エリア (AreaId) | Z 区間 | X 区間 | 内容 |
|---|---|---|---|
| lumen | [−30, 0) | [−12, 12] | スタート地点。赤血球が +X 方向へ流れる（演出のみ、分子に力は与えない） |
| luminalMembrane | [0, 4) | [−12, 8) | 下側頭部層 [0, 0.8) / 疎水層 [0.8, 3.2) / 上側頭部層 [3.2, 4.0) |
| cytoplasm | [4, 22) | [−12, 8) | P-gp ポンプ 2 基 |
| abluminalMembrane | [22, 26) | [−12, 8) | 下側頭部層 [22, 22.8) / 疎水層 [22.8, 25.2) / 上側頭部層 [25.2, 26) |
| brain | [26, 48] | [−12, 12] | ゴール受容体 |
| paracellular | [0, 26) | [8, 12] | 細胞間隙。入口 z=0 にタイトジャンクション格子 |

- 世界境界: `x ∈ [−12, 12]`, `y ∈ [−8, 8]`, `z ∈ [−30, 48]`。超えたら clamp し、その軸の速度を 0。
- スタート: `START_POS = [−2, 0, −22]`
- ゴール: `GOAL.pos = [0, 0, 40]`, 到達判定 `|pos − GOAL.pos| < GOAL.radius (= 3.5)`
- P-gp ポンプ: `[−4, 2.5, 11]`, `[3, −2.5, 15]`（描画半径 3）
- `classifyArea(pos)`: `x ≥ 8 && 0 ≤ z < 26` → `paracellular`。それ以外は z 区間で判定（z < 0 → lumen、z ≥ 26 → brain）。
- `membraneLayer(pos)`: 膜エリア内なら `lowerHead | core | upperHead`、それ以外 `null`。

### 4.1 定数（`src/constants/world.ts` — この内容をそのまま転記）

```ts
import type { DrugParams, EnvParams, Vec3 } from '../types';

export const WORLD = { xMin: -12, xMax: 12, yMin: -8, yMax: 8, zMin: -30, zMax: 48 } as const;

export interface MembraneSpec { zStart: number; zEnd: number; headThickness: number }
export const ZONES = {
  lumen: { zStart: -30, zEnd: 0 },
  luminalMembrane: { zStart: 0, zEnd: 4, headThickness: 0.8 } as MembraneSpec,
  cytoplasm: { zStart: 4, zEnd: 22 },
  abluminalMembrane: { zStart: 22, zEnd: 26, headThickness: 0.8 } as MembraneSpec,
  brain: { zStart: 26, zEnd: 48 },
} as const;

export const PARACELLULAR = { xMin: 8, xMax: 12, zStart: 0, zEnd: 26 } as const;
export const TIGHT_JUNCTION = { z: 0, xMin: 8, xMax: 12 } as const;

export const START_POS: Vec3 = [-2, 0, -22];
export const GOAL = { pos: [0, 0, 40] as Vec3, radius: 3.5 } as const;
export const MOLECULE_RADIUS = 0.8;

export const PGP_PUMPS: { pos: Vec3; radius: number }[] = [
  { pos: [-4, 2.5, 11], radius: 3 },
  { pos: [3, -2.5, 15], radius: 3 },
];

export const PHYS = {
  ACCEL: 20,            // 入力による最大加速度
  DRAG: 3,              // 速度減衰係数 v *= exp(-DRAG*dt)
  MAX_SPEED: 8,
  EFFLUX_MAX_SPEED: 12,
  M_HEAD: 0.6,          // 親水性頭部層の移動度
  K_REPEL: 30,          // 頭部層の反発加速度係数（× 進入障壁 B）
  K_TRAP: 30,           // 脂質トラップ保持力係数（× s^3）
  PGP_PUSH: 35,
  PGP_SWIRL: 8,
  PGP_SWIRL_RADIUS: 5,
  PGP_SWIRL_HALF_DEPTH: 6,
  PGP_CAPTURE_Z: 5,
  PGP_RELEASE_Z: -4,
  HOLD_TIME: 1.2,
  PGP_HOLD_TIME: 2.0,
  TJ_RESTITUTION: 0.5,
  MAX_DT: 1 / 30,
} as const;

export const PK = {
  ION_BARRIER_START: 1.5,
  ION_BARRIER_FULL: 3.0,
  HYDRATION_FULL_PENALTY: 4.0,
  HYDRATION_MAX_PARTICLES: 60,
  LOGP_LOW_BLOCK: 0.5,
  LOGP_LOW_OK: 1.0,
  LOGP_HIGH_OK: 4.0,
  LOGP_HIGH_TRAP: 4.5,
  CORE_MOBILITY_BASE: 0.75,
  CORE_MOBILITY_TRAPPED: 0.03,
  BARRIER_PASS_LIMIT: 0.4, // = ACCEL * M_HEAD / K_REPEL
} as const;

export const SLIDER_RANGES = {
  pKa: { min: 2.0, max: 11.0, step: 0.1 },
  logP: { min: -2.0, max: 6.0, step: 0.1 },
  bloodPH: { min: 6.8, max: 7.8, step: 0.05 },
} as const;

export const DEFAULT_PARAMS: DrugParams = { drugType: 'base', pKa: 3.4, logP: 2.8, pgpSubstrate: false };
export const DEFAULT_ENV: EnvParams = { bloodPH: 7.4, meningitis: false };
```

---

## 5. 物理ステップ仕様（`src/logic/physics.ts`）

```ts
export function classifyArea(pos: Vec3): AreaId;
export function membraneLayer(pos: Vec3): MembraneLayer | null;
export function stepPhysics(prev: PhysicsState, input: StepInput, params: DrugParams, env: EnvParams): StepResult;
```

`stepPhysics` は純関数（prev を破壊しない）。手順:

1. `dt = min(input.dt, PHYS.MAX_DT)`、`profile = deriveDrugProfile(params, env)`。
2. 前位置で `area0 = classifyArea(prev.pos)`、`layer0 = membraneLayer(prev.pos)`。
3. **P-gp 捕捉/解放**: §3.4 に従い `effluxActive` を更新。`!pgpSubstrate` なら即解放（holdStatus は付けない）。
4. **移動度 m**: 水相（lumen/cytoplasm/brain/paracellular）= 1、頭部層 = `M_HEAD`、疎水層 = `profile.coreMobility`。`effluxActive` 中は 1。
5. **加速度** `a = move × ACCEL × m`（move の長さは 1 に clamp）。
6. **膜の力**（`!effluxActive` かつ膜エリア内のみ）:
   - `lowerHead`: `a.z −= K_REPEL × profile.entryBarrier`（低 z 側の水相へ押し出す）
   - `upperHead`: `a.z += K_REPEL × profile.entryBarrier`（高 z 側の水相へ押し出す）
   - `core`: `zMid` = 疎水層中心、`half` = 疎水層厚/2 = 1.2、`a.z −= K_TRAP × s³ × clamp((z − zMid)/half, −1, 1)`
7. **P-gp 力**（`effluxActive` 中）: `a.z −= PGP_PUSH`、渦力（§3.4）。
8. `vel = (vel + a·dt) × exp(−DRAG·dt)`、`|vel| ≤ MAX_SPEED`（排出中は `EFFLUX_MAX_SPEED`）。
9. `pos = prev.pos + vel·dt`。
10. **当たり判定**（順に適用）:
    1. タイトジャンクション（§3.5）。
    2. 側壁 x = 8（新旧の z がともに [0, 26) のとき）: 旧 x ≥ 8 かつ新 x < 8 → x = 8、`vel.x = 0`。旧 x < 8 かつ新 x ≥ 8 → x = 8 − 1e−3、`vel.x = 0`。
    3. 世界境界 clamp。
11. **反発ステータス**: 新位置が頭部層、`!effluxActive`、`profile.entryBarrier ≥ BARRIER_PASS_LIMIT` → `heldStatus = ionBarrier ≥ lipoBarrier ? 'repelledIonized' : 'repelledHydrophilic'`、`holdTimer = HOLD_TIME`。
12. `holdTimer −= dt`、0 以下で `heldStatus = null`。
13. **route**: 新 area が paracellular → `'paracellular'`、膜/細胞質 → `'transcellular'`、それ以外は維持。
14. `reachedGoal = |pos − GOAL.pos| < GOAL.radius`。
15. **ステータス優先順位**:
    1. reachedGoal → `cleared`
    2. effluxActive → `pgpEfflux`
    3. heldStatus ≠ null → heldStatus
    4. area = paracellular → `paracellular`
    5. layer = core: `!coreEscapable` → `lipidTrapped`、`trapSeverity > 0` → `lipidSlowed`、それ以外 `permeating`
    6. layer = lowerHead/upperHead → `permeating`
    7. それ以外 → `free`

### 5.1 期待される挙動（テストで検証する）

| プリセット/条件 | 期待 |
|---|---|
| ジアゼパム | 前進入力のみで約 15 秒以内に reachedGoal（経細胞） |
| ドンペリドン | 細胞質で捕捉 → lumen へ戻される（effluxCount ≥ 1、z < −4 に到達） |
| ロペラミド | 膜を通過（lipidSlowed は出てよい）→ 細胞質で捕捉・排出 |
| ペニシリン G（通常） | 管腔側膜の lowerHead で弾かれ z < 1 に留まる。x=10 の細胞間隙ルートでも TJ で阻止 |
| ペニシリン G（髄膜炎） | `[10, 0, −22]` から開始し、z < 1 の間は move = [0,0,1]、以降は毎ステップ「ゴール方向への単位ベクトル」を move として与えると、細胞間隙ルート（側壁で x ≥ 8 に保たれる）を通過して reachedGoal、最終 route = 'paracellular' |
| logP = 5.5（中性, P-gp OFF） | 疎水層で `lipidTrapped`、10 秒前進しても z < 4 |
| logP = 0.0（中性） | `repelledHydrophilic`、z < 1 |

---

## 6. プリセット 4 薬物（`src/constants/presets.ts` — この内容をそのまま転記）

```ts
import type { DrugPreset, PresetId } from '../types';

export const PRESETS: Record<PresetId, DrugPreset> = {
  diazepam: {
    id: 'diazepam', name: 'ジアゼパム', nameEn: 'Diazepam', category: 'ベンゾジアゼピン系抗不安薬・抗けいれん薬',
    cnsLabel: '中枢移行 ◎',
    params: { drugType: 'base', pKa: 3.4, logP: 2.8, pgpSubstrate: false },
    summary: 'pKa 3.4 の弱塩基で pH 7.4 ではほぼ 100% が分子形。logP 2.8 の適正脂溶性で、受動拡散により BBB を速やかに通過する。',
    explanation: 'ジアゼパムは塩基性官能基の pKa が 3.4 と低く、血液 pH 7.4 ではほとんど解離しない（分子形 ≒ 99.99%）。脂溶性も logP 約 2.8 と適正域にあり、P-gp の基質でもないため、内皮細胞膜を受動拡散で次々と通過する。静注後の作用発現が速く、てんかん重積状態の第一選択薬の一つとして用いられる理由がここにある。',
    keyPoints: ['分子形比率が高い（非解離型）', 'logP 1〜4 の適正脂溶性', 'P-gp 非基質 → 経細胞ルートで受動拡散'],
  },
  domperidone: {
    id: 'domperidone', name: 'ドンペリドン', nameEn: 'Domperidone', category: 'ドパミン D2 受容体遮断薬（制吐薬・消化管運動改善薬）',
    cnsLabel: '中枢移行 ×',
    params: { drugType: 'base', pKa: 7.9, logP: 3.9, pgpSubstrate: true },
    summary: '脂溶性は十分で膜は通過できるが、P-gp の基質のため内皮細胞から血管側へ強制的に汲み出される。',
    explanation: 'ドンペリドンは logP 約 3.9 と脂溶性が高く、pH 7.4 でも分子形が約 24% 存在するため、脂質二重膜そのものは通過できる。しかし P-gp（MDR1 / ABCB1）の基質であるため、内皮細胞内に入った分子は ATP 依存的に血管腔側へ排出される。その結果、中枢の D2 受容体はほとんど遮断されず、メトクロプラミドと比べて錐体外路症状が起こりにくい。制吐作用は、BBB の外側にある最後野の化学受容器引き金帯（CTZ）と消化管の D2 受容体遮断による。',
    keyPoints: ['P-gp 基質 → 血管側へ排出', 'BBB 外の CTZ（最後野）に作用して制吐', '錐体外路症状が少ない（vs メトクロプラミド）'],
  },
  loperamide: {
    id: 'loperamide', name: 'ロペラミド', nameEn: 'Loperamide', category: 'μオピオイド受容体作動薬（止瀉薬）',
    cnsLabel: '中枢移行 ×',
    params: { drugType: 'base', pKa: 8.7, logP: 4.2, pgpSubstrate: true },
    summary: '脂溶性が高いオピオイドだが、P-gp に強力に排出されるため中枢作用（鎮痛・呼吸抑制）をほとんど示さない。',
    explanation: 'ロペラミドは脂溶性の高いμオピオイド受容体作動薬で、膜透過性そのものは十分にある。しかし P-gp の代表的な基質であり、BBB の内皮細胞に入ってもすぐに血管側へ排出されるため、通常量では中枢性の鎮痛・多幸感・呼吸抑制をほとんど示さず、腸管のμ受容体に作用して止瀉薬として用いられる。キニジンなど P-gp 阻害薬との併用や大量摂取では中枢へ移行し、呼吸抑制が報告されている。',
    keyPoints: ['高脂溶性でも P-gp 基質なら中枢へ移行しない', '末梢（腸管）のμ受容体に選択的に作用', 'P-gp 阻害薬併用で中枢毒性（呼吸抑制）'],
    note: '実測の logP は約 5 と報告されるが、本ゲームでは脂質トラップより P-gp 排出を主因として示すため、境界域の 4.2 に設定している（膜内で減速する様子も観察できる）。',
  },
  penicillinG: {
    id: 'penicillinG', name: 'ペニシリン G', nameEn: 'Benzylpenicillin', category: 'β-ラクタム系抗菌薬（天然ペニシリン）',
    cnsLabel: '通常 × / 髄膜炎時 ○',
    params: { drugType: 'acid', pKa: 2.7, logP: 1.8, pgpSubstrate: false },
    summary: 'カルボキシ基（pKa 約 2.7）が pH 7.4 でほぼ完全に解離し、水和したイオン形となって膜で弾かれる。髄膜炎で TJ が緩むと細胞間隙から移行できる。',
    explanation: 'ペニシリン G はカルボキシ基の pKa が約 2.7 の酸で、pH 7.4 では分子形が約 0.002% しかなく、ほぼ全量がイオン形として水和している。このため脂質二重膜には分配されず、正常な BBB はほとんど通過できない。一方、細菌性髄膜炎では炎症によってタイトジャンクションが緩み、細胞間隙ルート（傍細胞輸送）からの透過性が上昇する。そのため高用量のペニシリン G は髄膜炎の治療に用いることができる。炎症が治まるにつれて移行性は再び低下する。',
    keyPoints: ['酸性薬物：pH > pKa でイオン形が増える', 'イオン形は水和して膜を透過しにくい', '髄膜炎では TJ が緩み細胞間隙から移行（高用量で治療）'],
  },
};

export const PRESET_ORDER: PresetId[] = ['diazepam', 'domperidone', 'loperamide', 'penicillinG'];
```

検算（pH 7.4）: ジアゼパム 99.99% / ドンペリドン 1/(1+10^0.5) = 24.0% / ロペラミド 1/(1+10^1.3) = 4.77%（p = 1.32 < 1.5 なので B_ion = 0）/ ペニシリン G 1/(1+10^4.7) = 0.0020%（p = 4.70 → B_ion = 1）。

---

## 7. 3D・UI 表現仕様

### 7.1 シーン（T2）
- 背景 `#04060c`、`fog`（near 20, far 70）。ACESFilmic トーンマッピング、`dpr={[1, 2]}`。
- **BloodLumen**: 半透明の赤い内腔ボリューム。赤血球 ~120 個を InstancedMesh（扁平な円盤/トーラス）で +X 方向へ流し、x > 12 で x = −12 へ戻す。
- **TightJunction**: z = 0, x ∈ [8, 12] の発光シアン格子（線分）。meningitis ON で格子が開くアニメーション（格子の隙間が広がる・色がオレンジに・明滅）。x = 8, z ∈ [0, 26] に半透明の側壁（細胞側面膜）。
- **LipidBilayer**（`zStart` を props で受け取り、2 か所に配置）: x ∈ [−12, 8], y ∈ [−8, 8] にリン脂質を格子配置（間隔 ~0.9）。頭部 = 球（親水性、淡いクリーム/水色、半透明）、尾部 = 細い円柱 2 本（疎水性、黄橙）を膜の内側へ伸ばす。InstancedMesh で描画し、`sin(x·0.5 + y·0.3 + t)` で z 方向に ±0.15 波打たせる（毎フレーム更新が重ければ 2 フレームに 1 回）。
- **Cytoplasm / PgpPump**: 紫系の浮遊粒子。各 P-gp は回転する螺旋/トーラス群の渦。`pgpSubstrate` ON で赤く強く発光・高速回転、OFF で暗く低速。
- **BrainParenchyma / TargetReceptor**: 神経細胞風の発光粒子。受容体は `GOAL.pos` に発光する多面体＋回転リング、脈動。クリア時に強く光る。
- **DrugMolecule**: 半径 0.8 の発光多面体。色は酸性 = `#fb7185`、塩基性 = `#a78bfa`、中性 = `#34d399`。水和殻 = §3.2 の数・半径で青い小球（`#38bdf8`, 半透明）が周回。ステータスで発光色を変える: lipidTrapped/lipidSlowed = 琥珀、repelled*/tightJunctionBlocked = 赤フラッシュ、pgpEfflux = 赤の明滅。位置は `physicsRef.current.pos` を useFrame で読んで imperatively に設定。
- **MoleculeController**（描画なし）: useFrame で `getCombinedInput()` を取得 → カメラの向きを XZ 平面に射影した forward/right ベクトルで world move に変換（up は +Y）→ `stepPhysics` → `physicsRef.current` 更新 → `setRuntime` → `reachedGoal && !cleared` なら `markCleared`。`cleared` 中は物理停止。`resetToken` の変化で `physicsRef.current = createInitialPhysicsState()`。
- **FollowCamera**: drei `OrbitControls`（`enablePan={false}`, `minDistance=4`, `maxDistance=30`, `enableDamping`）。毎フレーム、target を分子位置へ lerp し、camera.position も同じ差分だけ平行移動して相対オフセットを保つ。初期オフセットは分子の背後上方 `(0, 4, −10)`（+Z を向く）。リセット時にオフセットを初期化。
- **AreaLabels**: drei `<Html>` で各エリア入口付近に小さな日本語ラベル（`AREA_LABELS`）。`pointer-events: none`。
- drei の `<Text>` は外部フォント取得が発生するため使用しない。

### 7.2 UI（T3 / T4）— ダークモードのラボ・HUD 風
- 共通: `bg-slate-950/70 backdrop-blur-md border border-cyan-500/20 rounded-xl shadow`、数値は `font-mono tabular-nums`、見出しは小さな大文字トラッキング、lucide-react アイコン。
- **ControlPanel**（右側、幅 340px、縦スクロール）。md 未満では `panelOpen` で開閉（右上にトグルボタン、開くと右からスライド）。セクション:
  1. プリセット（PresetSelector: 4 ボタン＋選択中の summary / cnsLabel / note）
  2. 薬物タイプ（酸性/塩基性/中性のセグメント）、pKa スライダー（中性では無効化）、血液 pH スライダー
  3. logP スライダー（下に lipoZone の色帯 −2〜6：赤 <0.5 / 琥珀 0.5–1.0 / 緑 1.0–4.0 / 琥珀 4.0–4.5 / 赤 >4.5 と現在値マーカー）
  4. P-gp 基質トグル、髄膜炎モードトグル（ON 時に「細胞間隙（x ≥ 8 の右端）から突破可能」のヒント）
  5. 計算結果: 分子形 %・イオン形 %（バー）、水和レベル、膜進入障壁 B、脂質トラップ度 s、予測（PREDICTED_LABELS）
  6. 「リスタート」ボタン（resetRun）
- **ClearModal**: `clearInfo` があるとき表示。紙吹雪/グロー演出、薬物名（presetId が null なら「カスタム薬物」）、ルート、所要時間、P-gp 排出回数、最終パラメータ、プリセットの explanation と keyPoints（カスタムなら DrugProfile から自動生成した解説）、「もう一度」（resetRun）と「閉じる」（closeModal）。
- **Hud**（左上）: 分子形比率 %（大きな数字＋バー）、膜透過ステータス（tone 色のバッジ＋アイコン）、現在エリア。警告バナー: lipidTrapped / pgpEfflux / tightJunctionBlocked / repelled*。操作ヒント（PC: WASD・矢印・Space/Shift 上下・ドラッグで回転・ホイールでズーム・R でリスタート／スマホ: 左下スティック・ピンチでズーム）。
- **useKeyboardControls**: `keydown/keyup` で `inputState.keyboard` を更新。W/↑ = forward +1、S/↓ = −1、D/→ = right +1、A/← = −1、Space = up +1、Shift = −1、R = resetRun。`event.target` が input/textarea/select/button の場合は無視（スライダー操作と干渉させない）。`blur` で全軸 0。
- **VirtualJoystick**（T5）: 左下固定（`bottom-6 left-6`、直径 ~120px）。Pointer Events で操作し、ノブの変位を `inputState.joystick.forward/right` に書く（上方向 = forward +）。離したら 0。`touch-action: none`。PC でも表示してよいが md 以上では半透明。

### 7.3 モバイル（T5）
- ピンチズーム: OrbitControls の `touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }`。
- `index.css` で `html, body, #root { height: 100%; overflow: hidden; overscroll-behavior: none; }`、Canvas に `touch-action: none`。

---

## 8. タスク一覧（担当ファイルは重複させない）

| ID | 担当エージェント | 担当ファイル | 入力（依存） | 出力（export） | 完了条件 |
|---|---|---|---|---|---|
| **T0** 基盤 | logic-builder | `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/index.css`, `src/App.tsx`, `src/vite-env.d.ts`, `src/types.ts`, `src/constants/*.ts`, `src/state/*.ts` | 本書 §0–2, 4.1, 6 | §2 の型・ストア・ref、§4.1 定数、§6 プリセット、App レイアウト | `npm install` 成功。§2.1/§4.1/§6 を逐語転記。`npx tsc --noEmit` で T0 担当ファイルにエラーがない（未作成コンポーネントの import エラーのみ許容） |
| **T1** ロジック | logic-builder | `src/logic/*` | `types.ts`, `constants/world.ts` | §3.7, §5 の関数、`useDrugProfile(): DrugProfile` | `npm test` で §3 の数値（§6 検算値）と §5.1 の全シナリオが pass。React/three に依存しない（useDrugProfile を除く） |
| **T2** 3D シーン | scene-builder | `src/scene/*` | T0 の型・ストア・ref・定数、T1 の `stepPhysics` / `deriveDrugProfile` / `hydrationLevel`（シグネチャのみ依存） | `SceneRoot` | §7.1 を満たす。担当ファイルに型エラーがない |
| **T3** パネル・モーダル | ui-builder | `src/ui/ControlPanel.tsx`, `PresetSelector.tsx`, `ParamSlider.tsx`, `ToggleSwitch.tsx`, `ClearModal.tsx` | T0、T1 の `useDrugProfile` | `ControlPanel`, `ClearModal` | §7.2 を満たす。担当ファイルに型エラーがない |
| **T4** HUD・キー入力 | ui-builder | `src/ui/Hud.tsx`, `src/input/useKeyboardControls.ts` | T0、T1 の `useDrugProfile` | `Hud`, `useKeyboardControls()` | §7.2 を満たす。担当ファイルに型エラーがない |
| **T5** モバイル操作 | ui-builder | `src/ui/VirtualJoystick.tsx`（新規）、`src/scene/FollowCamera.tsx`（touches 設定のみ追記）、`src/App.tsx`（Joystick 追加のみ） | T0–T4 完了後 | `VirtualJoystick` | §7.2/§7.3 を満たし `npm run build` 成功 |
| **T6** デプロイ | logic-builder | `.github/workflows/deploy.yml` | T0 | — | main/作業ブランチ push 時に build → `actions/deploy-pages` で公開。`vite.config.ts` の base が `/bbb-breaker/` であることを確認（編集はしない） |

実行順: **T0 →（T1, T2, T3, T4 を並列）→ 統合ビルド（メイン）→（T5, T6 を並列）→ 最終ビルド・push**。
T5 は T2/T0 の完了後に `FollowCamera.tsx` と `App.tsx` の所有権を一時的に引き継ぐ（同時編集は発生しない）。

### App.tsx の構成（T0 が作成）
```tsx
import { SceneRoot } from './scene/SceneRoot';
import { Hud } from './ui/Hud';
import { ControlPanel } from './ui/ControlPanel';
import { ClearModal } from './ui/ClearModal';
import { useKeyboardControls } from './input/useKeyboardControls';

export default function App() {
  useKeyboardControls();
  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#04060c] text-slate-100 select-none">
      <SceneRoot />
      <Hud />
      <ControlPanel />
      <ClearModal />
    </div>
  );
}
```

---

## 9. 実装ルール（全エージェント共通）

- 作業前にこの CLAUDE.md を全文読む。**担当ファイル以外は編集・作成しない**（他タスクのファイルにバグを見つけたら報告のみ）。
- 数式・閾値・座標は必ず `constants/world.ts` の定数を参照し、マジックナンバーを重複定義しない。
- `any` 禁止、`try { } catch { }` で例外を握りつぶさない。
- 60fps で変わる値で React state / zustand を更新しない（`physicsRef` を使う）。
- UI テキストは日本語。
- 完了時に「作成/変更したファイル」「完了条件の確認結果」「仕様からの逸脱（あれば理由）」を報告する。
