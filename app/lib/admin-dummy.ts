// 管理ダッシュボード（タスク3-a）用のダミーデータ。
// 実データ接続（3-b）まではこれで画面・フィルタ連動を作る。
// ※個人を特定する情報は持たない：所属コード・スコア・測定日のみ。

export interface Measurement {
  org_code: string; // 個人を特定しない組織ラベル
  score: number; // 1〜8
  measured_at: string; // YYYY-MM-DD
}

// 所属コード → 表示名
export const ORG_LABELS: Record<string, string> = {
  medipal_event_1018: "メディパル イベント(10/18)",
  kenpo_A: "健保組合A",
  kenpo_B: "健保組合B",
};

// 決定的な擬似乱数（SSR/CSRで同一結果＝ハイドレーション不一致を防ぐ）
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generate(): Measurement[] {
  const rng = makeRng(20260615);
  const orgs = Object.keys(ORG_LABELS);
  // 2026-01 〜 2026-06
  const months = ["01", "02", "03", "04", "05", "06"];
  // 組織ごとに少しずつ傾向を変える（平均スコアの中心）
  const orgCenter: Record<string, number> = {
    medipal_event_1018: 4.6,
    kenpo_A: 3.6,
    kenpo_B: 5.2,
  };
  const out: Measurement[] = [];
  for (const org of orgs) {
    for (const m of months) {
      const n = 12 + Math.floor(rng() * 16); // 月あたり12〜27件
      // 月が進むほどわずかに改善（中心が下がる）傾向を入れる
      const monthIdx = months.indexOf(m);
      const center = orgCenter[org] - monthIdx * 0.18;
      for (let i = 0; i < n; i++) {
        // 中心まわりにばらつかせて 1〜8 にクランプ
        const raw = center + (rng() - 0.5) * 4.5;
        const score = Math.min(8, Math.max(1, Math.round(raw)));
        const day = String(1 + Math.floor(rng() * 27)).padStart(2, "0");
        out.push({ org_code: org, score, measured_at: `2026-${m}-${day}` });
      }
    }
  }
  return out;
}

export const DUMMY_MEASUREMENTS: Measurement[] = generate();

// データに含まれる月の一覧（フィルタ用）
export const MONTHS: string[] = Array.from(
  new Set(DUMMY_MEASUREMENTS.map((d) => d.measured_at.slice(0, 7))),
).sort();
