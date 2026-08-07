// 管理ダッシュボードのデモ用データ。
// 実データ（Supabase の admin_measurements）が0件のときの表示や、デモ提示に使う。
// ※画面には必ず「デモデータ」と明示すること（実績値と誤認させない）。
// ※個人を特定する情報は持たない：所属コード・スコア・測定日のみ。

export interface DemoMeasurement {
  org_code: string | null;
  color_value: number; // 1〜8
  measured_at: string; // YYYY-MM-DD
  // デモ表示で実施人数・継続率を計算するための擬似的な参加者番号。
  // 実在ユーザーのIDではなく、この配列内だけで完結する連番。
  demo_participant: number;
}

export const DEMO_ORGS: {
  code: string;
  name: string;
  distributed_count?: number | null;
}[] = [
  { code: "medipal_event_1018", name: "メディパル イベント(10/18)", distributed_count: 120 },
  { code: "kenpo_A", name: "健保組合A", distributed_count: 80 },
  { code: "kenpo_B", name: "健保組合B", distributed_count: 60 },
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
  // 団体ごとの擬似的な参加者数（実施人数のデモ表示に使う）
  const people: Record<string, number> = {
    medipal_event_1018: 48,
    kenpo_A: 35,
    kenpo_B: 29,
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
        out.push({
          org_code: code,
          color_value,
          measured_at: `2026-${m}-${day}`,
          demo_participant: Math.floor(rng() * people[code]),
        });
      }
    }
  }
  return out;
}

export const DEMO_MEASUREMENTS: DemoMeasurement[] = generate();

// 擬似参加者ごとの年代・性別（デモ表示用。実在の属性ではない）
const DEMO_AGE_BANDS = ["20代", "30代", "40代", "50代", "60代"];
const DEMO_GENDERS = ["male", "female", "other", "na"];

function demoAttr(orgCode: string | null, participant: number) {
  const seed = (orgCode ?? "").length * 31 + participant * 17;
  return {
    age_band: DEMO_AGE_BANDS[seed % DEMO_AGE_BANDS.length],
    // 男女が多め、その他・回答しないは少数になるよう寄せる
    gender: DEMO_GENDERS[seed % 7 < 3 ? 0 : seed % 7 < 6 ? 1 : (seed % 2) + 2],
  };
}

// デモ表示用の年代・性別集計
export function demoDemographics(
  org: string,
  period: string,
): { age_band: string; gender: string; participants: number; measurements: number }[] {
  const rows = DEMO_MEASUREMENTS.filter(
    (d) =>
      (org === "all" || (org === "none" ? d.org_code == null : d.org_code === org)) &&
      (period === "all" || d.measured_at.startsWith(period)),
  );
  const acc = new Map<string, { participants: Set<string>; measurements: number }>();
  for (const r of rows) {
    const a = demoAttr(r.org_code, r.demo_participant);
    const key = `${a.age_band}#${a.gender}`;
    if (!acc.has(key)) acc.set(key, { participants: new Set(), measurements: 0 });
    const e = acc.get(key)!;
    e.participants.add(`${r.org_code}#${r.demo_participant}`);
    e.measurements++;
  }
  return [...acc.entries()].map(([key, v]) => {
    const [age_band, gender] = key.split("#");
    return { age_band, gender, participants: v.participants.size, measurements: v.measurements };
  });
}

// デモ表示用の実施人数・継続人数。擬似参加者番号から集計する。
export function demoStats(
  org: string,
  period: string,
): { participants: number; repeaters: number; measurements: number } | null {
  const rows = DEMO_MEASUREMENTS.filter(
    (d) =>
      (org === "all" || (org === "none" ? d.org_code == null : d.org_code === org)) &&
      (period === "all" || d.measured_at.startsWith(period)),
  );
  if (rows.length === 0) return null;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.org_code}#${r.demo_participant}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const values = [...counts.values()];
  return {
    participants: values.length,
    repeaters: values.filter((n) => n >= 2).length,
    measurements: rows.length,
  };
}
