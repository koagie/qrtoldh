// 管理ダッシュボードのデモ用データ。
// 実データ（Supabase の admin_measurements）が0件のときの表示や、デモ提示に使う。
// ※画面には必ず「デモデータ」と明示すること（実績値と誤認させない）。
// ※個人を特定する情報は持たない：所属コード・スコア・測定日のみ。

export interface DemoMeasurement {
  org_code: string | null;
  color_value: number; // 1〜8
  measured_at: string; // YYYY-MM-DD
}

export const DEMO_ORGS: { code: string; name: string }[] = [
  { code: "medipal_event_1018", name: "メディパル イベント(10/18)" },
  { code: "kenpo_A", name: "健保組合A" },
  { code: "kenpo_B", name: "健保組合B" },
];

// 決定的な擬似乱数（SSR/CSRで同一結果＝ハイドレーション不一致を防ぐ）
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generate(): DemoMeasurement[] {
  const rng = makeRng(20260615);
  const months = ["01", "02", "03", "04", "05", "06"];
  const center: Record<string, number> = {
    medipal_event_1018: 4.6,
    kenpo_A: 3.6,
    kenpo_B: 5.2,
  };
  const out: DemoMeasurement[] = [];
  for (const { code } of DEMO_ORGS) {
    for (const m of months) {
      const n = 12 + Math.floor(rng() * 16); // 月あたり12〜27件
      const monthIdx = months.indexOf(m);
      const c = center[code] - monthIdx * 0.18; // 月が進むとゆるやかに変化
      for (let i = 0; i < n; i++) {
        const raw = c + (rng() - 0.5) * 4.5;
        const color_value = Math.min(8, Math.max(1, Math.round(raw)));
        const day = String(1 + Math.floor(rng() * 27)).padStart(2, "0");
        out.push({ org_code: code, color_value, measured_at: `2026-${m}-${day}` });
      }
    }
  }
  return out;
}

export const DEMO_MEASUREMENTS: DemoMeasurement[] = generate();
