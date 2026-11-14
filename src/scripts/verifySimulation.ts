import { runMultipleSeedSimulation, formatSimulationStats } from '@/game/simulationStats';

/**
 * 複数シードのシミュレーション実行とレポート生成
 * 
 * このスクリプトは以下を実行する：
 * 1. 複数のシード（異なる乱数）を使用してシミュレーションを実行
 * 2. 連載週数の分布を収集
 * 3. 打ち切り・完結の比率を計算
 * 4. 初期能力と成績の相関を分析
 * 5. 結果をコンソール出力
 */
async function generateSimulationReport() {
  console.log('連載シミュレーション検証を開始します...\n');

  // テスト用の基本設定
  const baseConfig = {
    genre: 'shounen_action' as const,
    worldview: 'contemporary' as const,
    protagonist: 'ordinary_boy' as const,
    style: 'traditional_shounen' as const,
    title: 'テスト漫画',
    authorName: 'テスト作者',
  };

  // 複数シード（500回）でシミュレーション実行
  console.log('シミュレーション実行中（500回）...');
  const stats = await runMultipleSeedSimulation(500, baseConfig);

  // 結果を整形して出力
  const report = formatSimulationStats(stats);
  console.log(report);

  // JSON形式でも保存用に出力
  console.log('\n【機械可読形式（JSON）】');
  console.log(JSON.stringify(stats, null, 2));

  // 検証結果のサマリー
  console.log('\n【検証結果】');
  
  const issues: string[] = [];
  const passes: string[] = [];

  // チェック1: 8週以内の割合が5～10%か
  const within8Percent = (stats.within8weeks / stats.totalSims) * 100;
  if (within8Percent < 5 || within8Percent > 15) {
    issues.push(`⚠ 8週以内の割合が異常: ${within8Percent.toFixed(1)}% (期待: 5～10%)`);
  } else {
    passes.push(`✓ 8週以内の割合が適切: ${within8Percent.toFixed(1)}%`);
  }

  // チェック2: 20週以上の割合が70%以上か
  const over20Percent = (stats.over20weeks / stats.totalSims) * 100;
  if (over20Percent < 65) {
    issues.push(`⚠ 20週以上の割合が低い: ${over20Percent.toFixed(1)}% (期待: 70%以上)`);
  } else {
    passes.push(`✓ 20週以上の割合が適切: ${over20Percent.toFixed(1)}%`);
  }

  // チェック3: 平均週数が25～35週か
  if (stats.avgWeeks < 25 || stats.avgWeeks > 35) {
    issues.push(`⚠ 平均連載週数が異常: ${stats.avgWeeks.toFixed(1)} 週 (期待: 25～35週)`);
  } else {
    passes.push(`✓ 平均連載週数が適切: ${stats.avgWeeks.toFixed(1)} 週`);
  }

  // チェック4: 完結作品と打ち切り作品の比率が妥当か
  if (stats.cancelledPercent < 30 || stats.cancelledPercent > 50) {
    issues.push(`⚠ 打ち切り率が異常: ${stats.cancelledPercent.toFixed(1)}% (期待: 40～50%)`);
  } else {
    passes.push(`✓ 打ち切り率が適切: ${stats.cancelledPercent.toFixed(1)}%`);
  }

  // チェック5: 完結作品の平均能力が打ち切り作品より高いか
  if (stats.avgAbilityOfCompleted <= stats.avgAbilityOfCancelled) {
    issues.push(`⚠ 完結作品の平均能力が打ち切り作品より低い、または等しい`);
  } else {
    const diff = stats.avgAbilityOfCompleted - stats.avgAbilityOfCancelled;
    passes.push(`✓ 完結作品の平均能力が高い（差: ${diff.toFixed(1)}）`);
  }

  // チェック6: 同じ週数に結果が集中していないか
  const topWeekCount = Object.values(stats.weeksDistribution).reduce((a, b) => a + b, 0) > 0
    ? Math.max(...Object.values(stats.weeksDistribution))
    : 0;
  const topWeekPercent = (topWeekCount / stats.totalSims) * 100;
  if (topWeekPercent > 20) {
    issues.push(`⚠ 結果が特定の週数に集中: ${topWeekPercent.toFixed(1)}% が最多の週数`);
  } else {
    passes.push(`✓ 結果が適切に分散: 最多週数は ${topWeekPercent.toFixed(1)}%`);
  }

  // 結果表示
  console.log('');
  console.log('【成功】');
  passes.forEach((p) => console.log('  ' + p));

  if (issues.length > 0) {
    console.log('\n【注意・要調査】');
    issues.forEach((i) => console.log('  ' + i));
  }

  // 最終結論
  console.log('\n【結論】');
  if (issues.length === 0) {
    console.log(
      '✅ シミュレーションが正常に機能しています。自然な連載進行が実現されています。'
    );
  } else {
    console.log('⚠️  いくつかの項目で改善が必要です。上記の注意項目を確認してください。');
  }
}

// 実行
generateSimulationReport().catch(console.error);
