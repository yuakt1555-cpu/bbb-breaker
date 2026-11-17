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
