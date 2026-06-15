"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ZONE_STYLE } from "../lib/colors";
import { zoneFromColor, type Zone } from "../lib/types";
import { DUMMY_MEASUREMENTS, MONTHS, ORG_LABELS } from "../lib/admin-dummy";
import { useAppData } from "../components/AppDataProvider";

const ZONES: Zone[] = ["KEEP", "BOOST", "ACTION"];

// 管理ダッシュボード（タスク3-a：ダミーデータでUI＋フィルタ連動）。
// 集団の匿名集計のみ。個人を特定する情報は扱わない／表示しない。
export default function AdminDashboardPage() {
  const { signOut } = useAppData();
  const [org, setOrg] = useState<string>("all"); // all | 所属コード
  const [period, setPeriod] = useState<string>("all"); // all | YYYY-MM

  const rows = useMemo(() => {
    return DUMMY_MEASUREMENTS.filter(
      (d) =>
        (org === "all" || d.org_code === org) &&
        (period === "all" || d.measured_at.startsWith(period)),
    );
  }, [org, period]);

  // KPI
  const total = rows.length;
  const avg = total ? rows.reduce((s, d) => s + d.score, 0) / total : 0;
  const keepRatio = total
    ? Math.round((rows.filter((d) => d.score <= 3).length / total) * 100)
    : 0;
  const orgCount =
    org === "all" ? new Set(rows.map((d) => d.org_code)).size : rows.length ? 1 : 0;

  // ゾーン分布
  const zoneDist = useMemo(() => {
    const c: Record<Zone, number> = { KEEP: 0, BOOST: 0, ACTION: 0 };
    for (const d of rows) c[zoneFromColor(d.score)]++;
    return ZONES.map((z) => ({ zone: z, value: c[z] }));
  }, [rows]);

  // スコア分布（1〜8）
  const scoreDist = useMemo(() => {
    const c = Array.from({ length: 8 }, (_, i) => ({
      score: i + 1,
      count: 0,
      zone: zoneFromColor(i + 1),
    }));
    for (const d of rows) c[d.score - 1].count++;
    return c;
  }, [rows]);

  // 平均スコアの月次推移
  const trend = useMemo(() => {
    return MONTHS.map((m) => {
      const inMonth = rows.filter((d) => d.measured_at.startsWith(m));
      const a = inMonth.length
        ? inMonth.reduce((s, d) => s + d.score, 0) / inMonth.length
        : null;
      return { month: m.slice(5) + "月", avg: a == null ? null : Number(a.toFixed(2)) };
    });
  }, [rows]);

  return (
    <div className="min-h-dvh bg-zinc-50">
      {/* ヘッダー */}
      <header className="border-b border-zinc-200 bg-brand px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-7 w-7 rounded bg-white p-0.5" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-white">お口のコンディション 全体レポート</h1>
            <p className="text-[11px] text-white/70">
              集団傾向の可視化（匿名集計）。個人を特定する情報は含みません。
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* フィルタ */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Select label="所属" value={org} onChange={setOrg}>
            <option value="all">すべての所属</option>
            {Object.entries(ORG_LABELS).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
          <Select label="期間" value={period} onChange={setPeriod}>
            <option value="all">全期間</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m.replace("-", "/")}
              </option>
            ))}
          </Select>
        </div>

        {/* KPI カード */}
        <div className="grid grid-cols-2 gap-2.5">
          <Kpi label="累計測定件数" value={total.toLocaleString()} unit="件" />
          <Kpi label="平均スコア" value={total ? avg.toFixed(2) : "—"} unit="／8" />
          <Kpi label="KEEPゾーン割合" value={total ? String(keepRatio) : "—"} unit="%" />
          <Kpi label="対象の所属数" value={String(orgCount)} unit="件" />
        </div>

        {/* ゾーン分布 */}
        <Card title="ゾーン分布">
          <div className="flex items-center gap-3">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={zoneDist}
                    dataKey="value"
                    nameKey="zone"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {zoneDist.map((d) => (
                      <Cell key={d.zone} fill={ZONE_STYLE[d.zone].accent} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1.5">
              {zoneDist.map((d) => {
                const pct = total ? Math.round((d.value / total) * 100) : 0;
                return (
                  <li key={d.zone} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: ZONE_STYLE[d.zone].accent }}
                    />
                    <span className="font-medium text-zinc-700">{d.zone}</span>
                    <span className="ml-auto tabular-nums text-zinc-500">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        {/* スコア分布 */}
        <Card title="スコア分布（1〜8）">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDist} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="score"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
                  formatter={(v) => [`${v}件`, "件数"]}
                  labelFormatter={(l) => `スコア ${l}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {scoreDist.map((d) => (
                    <Cell key={d.score} fill={ZONE_STYLE[d.zone].accent} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 平均スコアの推移 */}
        <Card title="平均スコアの推移（月次）">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  domain={[1, 8]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
                  formatter={(v) => [`${v}`, "平均スコア"]}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#1A4684"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#1A4684" }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-400">
          集団の匿名集計です ／ 長田産業株式会社
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-sm">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand">
        {value}
        <span className="ml-0.5 text-xs font-medium text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-zinc-700">{title}</h2>
      {children}
    </section>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm">
      <span className="text-xs text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-medium text-zinc-700 outline-none"
      >
        {children}
      </select>
    </label>
  );
}
