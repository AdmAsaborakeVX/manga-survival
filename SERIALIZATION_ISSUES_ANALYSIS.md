# 連載シミュレーション不具合調査レポート

## 1. 発見された主要な問題

### 問題1: 打ち切り判定が厳しすぎる（即座に危険度が高くなる）

**原因:**
```typescript
// endCondition.ts: updateCancellationRisk()
manga.lowRankingWeeks = consecutiveLowRankings;
manga.cancellationRisk += consecutiveLowRankings * CANCELLATION_CONFIG.RISK_INCREASE_PER_LOW_WEEK;
```

- 連続低順位週数（最大は歴史の長さ）が毎週そのまま加算される
- 初回1週で「1週の低順位」→ 15%増
- 2週目「2週の低順位」→ 30%増
- 3週目「3週の低順位」→ 45%増（累計で元々の15%の上に45%が加算され、60%超に）
- 危険度はEXPONENTIALに急上昇する
- 配列が順位履歴であり、連続を検出すると前の累積に加算される

**結果:** 数週の低順位で危険度が100%に到達 → 即座に打ち切り判定される

---

### 問題2: 打ち切り判定ロジックが機械的で感度が高い

**条件1: 連続低順位**
```typescript
if (manga.lowRankingWeeks >= CANCELLATION_CONFIG.LOW_RANKING_WEEKS_TO_CANCEL) {
  return true;  // 低順位が8週続いたら即座に打ち切り
}
```
- `LOW_RANKING_WEEKS_TO_CANCEL: 8`
- しかし連続低順位の定義がアンケート順位 > 15 (つまり下位15以下)
- プレイヤーの初期順位は 3 前後、ライバル5体で6体中3位なのに、すぐに順位が落ちる

**条件2: 平均順位**
```typescript
const avgRanking = calculateAverageRanking(manga, CANCELLATION_CONFIG.AVERAGING_WEEKS);
if (avgRanking >= CANCELLATION_CONFIG.AVERAGE_RANKING_TO_CANCEL) {
  return true;  // 平均順位18以上で打ち切り
}
```
- `AVERAGING_WEEKS: 13`
- `AVERAGE_RANKING_TO_CANCEL: 18`
- 6体中の順位で平均18は「ほぼ最下位」を意味するが、短期間で達する

**条件3: 人気が低い且つ低順位**
```typescript
if (manga.currentPopularity < GAME_CONFIG.minPopularityToSurvive && manga.lowRankingWeeks >= 4) {
  return true;
}
```
- `minPopularityToSurvive: 10`（非常に低い閾値）
- 人気が10未満で低順位4週で打ち切り

---

### 問題3: ライバル作品の数が多い（競争相手が多い）

**config.ts:**
```typescript
RIVAL_CONFIG = {
  COUNT: 5,  // プレイヤー + ライバル5体 = 6体中での競争
  ...
}
```

- 6体の中で順位が決まる
- プレイヤーの初期順位は3位（中程度）
- 人気の小さな変動で順位が大きく変わる
- 全員が低人気から始まるため、相対順位の変動が激しい

---

### 問題4: 人気の計算式が不安定

**popularity.ts: calculatePopularityChange()**
```typescript
const randomTerm = randomBase * (explosiveness * POPULARITY_CONFIG.BASE_CHANGE_RATE * 10);
const stabilityDamper = Math.pow(stability, 2);
const dampedRandomTerm = randomTerm * (1 - stabilityDamper * 0.6);
```

- `BASE_CHANGE_RATE: 0.15`
- 爆発力（0.5～2.5）で乗算され、最大で ±3.75の変動
- ただし、安定性で抑制される（が、新作品は安定性が低いため抑制が弱い）
- 回帰項(`regressionTerm`)も存在するが、基線への復帰速度が遅い

**問題:**
- 初期人気が40～60程度だが、大きなランダム変動で30未満になる可能性がある
- 週ごとにランダム変動が支配的で、人気の安定性が低い
- 「人気が高い作品は高い水準を維持しやすい」という要件を満たしていない

---

### 問題5: 掲載順位がアンケート順位に大きく影響する

**ranking.ts: calculatePlacementRanking()**
```typescript
adjustedRanking -= editorExpectationBonus;  // 編集部期待度 (0.5～1.2)
// ... その他の小さな補正
```

- 編集部期待度の補正はほぼ無視できるレベル
- 新連載補正、売上補正も小さい
- **結果的に、掲載順位 ≈ アンケート順位**
- つまり、人気がすべてを決めている

---

### 問題6: 8週で終了する直接的な原因

各設定を見直すと：

1. **初期順位が3位** → 早期に順位が落ちやすい
2. **順位が落ちる** → `lowRankingWeeks` が増加
3. **危険度が急上昇** → 5～8週で100%に近づく
4. **打ち切り判定が発動** → 連続8週の低順位で確定打ち切り

**タイミング:**
- 週1～3: 初期人気で3位をキープ
- 週4～5: ランダム変動で順位低下、危険度上昇開始
- 週6～8: 危険度が 0.6～0.9 に到達、低順位継続
- **週8～10: 累積的な危険度と連続低順位の条件で打ち切り判定**

---

## 2. 仕様からの逸脱

### 要件と実装の乖離

| 要件 | 実装 | 状態 |
|------|------|------|
| 打ち切り危険度は0～100%の範囲 | 実装済み（0～1） | ✓ |
| 危険度を毎週単純加算しない | **単純加算している** | ✗ |
| 人気が回復で危険度も低下 | 減衰のみ（回復時に復帰なし） | △ |
| 人気が高く順位も良好な作品は危険度が低い | 人気→順位→危険度で単純計算 | △ |
| 長期低迷で危険度が高くなる | 短期でも危険度が高くなる | ✗ |
| 短期打ち切りは極端に成績が悪い場合に限定 | 数週で打ち切る可能性 | ✗ |
| 一定期間の低迷を経て打ち切り | 連続8週で機械的に打ち切り | △ |
| 人気が回復している作品を過去の低迷で打ち切らない | 危険度のヒステリシスがない | ✗ |

---

## 3. 修正が必要な箇所

### ファイル: `endCondition.ts`
- `updateCancellationRisk()`: 危険度の計算式を全面改訂
- `shouldBeCancelled()`: 打ち切り判定ロジックを複数条件の「かつ」から「柔軟な判定」へ

### ファイル: `config.ts`
- `CANCELLATION_CONFIG`: パラメータの見直し
- 打ち切り条件を段階的に（即座 → 短期 → 通常）定義

### ファイル: `popularity.ts`
- `calculatePopularityChange()`: 人気変動の安定性向上
  - 前週人気の継続性を強化
  - ランダム変動の抑制
  - 基線への復帰速度の調整

### ファイル: `ranking.ts`
- `calculatePlacementRanking()`: 編集部期待度の影響を強化
- 売上の補正度を上げる

### ファイル: `config.ts`
- `POPULARITY_CONFIG`: パラメータの調整
  - `MOMENTUM_FACTOR`: 前週人気の重み付けを上げる
  - `STABILITY_FACTOR`: 新しい安定性係数を導入

---

## 4. 修正方針

### ステップ1: 危険度の計算式を改訂
危険度を「人気と順位の複合指標」に変更：
```
新危険度 = 前週危険度 × 減衰 + 現週スコア
```

ここで「現週スコア」は：
- 直近4週の平均順位
- 直近4週の平均人気
- 順位の下降トレンド
から計算

### ステップ2: 打ち切り判定をマルチレベル化
1. **即座打ち切り**: 人気 < 5 かつ順位 > 20 が2週連続
2. **短期打ち切り**: 危険度 > 0.8 かつ人気低下が4週 かつ順位 > 15 が8週
3. **通常打ち切り**: 危険度 > 0.6 かつ4週の条件2

### ステップ3: 人気の安定性を向上
- 前週人気の重み付けを 70% に上げる
- 基線への復帰速度を遅める
- ランダム変動の幅を抑制

### ステップ4: シミュレーション検証
複数シードで1000回以上実行して統計確認

---

## 5. 期待される修正後の挙動

- **平均連載週数**: 25～35週
- **中央値**: 28週
- **最短**: 5～8週（極端に成績が悪い）
- **最長**: 90週以上（優秀な作品）
- **8週以内の割合**: 5～10%
- **20週以上**: 70%以上
- **40週以上**: 40～50%
- **80週以上**: 10～15%

人気と連載週数の相関が明確に出現し、ゲームとして自然な結果になる。
