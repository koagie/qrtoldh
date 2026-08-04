"use client";

import { useEffect, useMemo, useState } from "react";
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
import ComplianceFooter from "../components/ComplianceFooter";
import { MIN_AGGREGATE_N, SUPPRESSED_LABEL, isSuppressed } from "../lib/aggregate";

const ZONES: Zone[] = ["KEEP", "BOOST", "ACTION"];

export interface Measurement {
  org_code: string | null;
  color_value: number;
  measured_at: string;
}
export interface Org {
  code: string;
  name: string;
  is_demo?: boolean; // サンプルデータの団体（バッジ表示の判定に使う）
  distributed_count?: number | null; // 配布枚数（参加率の分母）
}
// 実施人数・継続人数（user_id は含まない。DB側で集約済みの数値のみ）
export interface OrgStats {
  participants: number;
  repeaters: number;
  measurements: number;
}

// 集団の匿名集計ダッシュボード本体（実データ版・公開デモ版で共用）。
// 個人を特定する情報は受け取らない／表示しない。
export default function DashboardView({
  rows: rowsAll,
  orgs,
  demo,
  loading = false,
  headerAction,
  stats,
  onFilterChange,
}: {
  rows: Measurement[];
  orgs: Org[];
  demo: boolean;
  loading?: boolean;
  headerAction?: React.ReactNode;
  stats?: OrgStats | null; // 現在の絞り込みに対応する実施人数など
  onFilterChange?: (org: string, period: string) => void;
}) {
  const [org, setOrg] = useState<string>("all"); // all | 所属コード | none
  const [period, setPeriod] = useState<string>("all"); // all | YYYY-MM

  // 絞り込みが変わったら親に通知（親が集計を取り直す）
  useEffect(() => {
    onFilterChange?.(org, period);
  }, [org, period, onFilterChange]);

  const months = useMemo(
    () => Array.from(new Set(rowsAll.map((d) => d.measured_at.slice(0, 7)))).sort(),
    [rowsAll],
  );

  const rows = useMemo(
    () =>
      rowsAll.filter(
        (d) =>
          (org === "all" || (org === "none" ? d.org_code == null : d.org_code === org)) &&
          (period === "all" || d.measured_at.startsWith(period)),
      ),
    [rowsAll, org, period],
  );

  const total = rows.length;
  const avg = total ? rows.reduce((s, d) => s + d.color_value, 0) / total : 0;
  const keepRatio = total
    ? Math.round((rows.filter((d) => d.color_value <= 3).length / total) * 100)
    : 0;
  const orgCount = new Set(rows.map((d) => d.org_code).filter(Boolean)).size;

  // サンプルデータのバッジ：公開デモ or サンプル団体（organizations.is_demo）を選択中
  const showSampleBadge = demo || orgs.some((o) => o.code === org && o.is_demo);

  // 参加率の分母（配布枚数）。特定の団体を選択中はその値、すべての所属なら合計。
  const distributed = useMemo(() => {
    if (org === "none") return null;
    const target = org === "all" ? orgs : orgs.filter((o) => o.code === org);
    const sum = target.reduce((s, o) => s + (o.distributed_count ?? 0), 0);
    return sum > 0 ? sum : null;
  }, [orgs, org]);

  const participants = stats?.participants ?? null;
  const repeaters = stats?.repeaters ?? null;

  // 実施人数が少ない団体では、参加率・継続率をマスクする
  const statsSuppressed = participants != null && isSuppressed(participants);

  // 参加率：分母未設定なら「未設定」。100%超は入力ミスの可能性があるため表示しない。
  const joinRate = useMemo(() => {
    if (participants == null || distributed == null) return null;
    const r = Math.round((participants / distributed) * 100);
    if (r > 100) {
      console.warn(
        `[dashboard] 参加率が100%を超えています（実施人数 ${participants} / 配布 ${distributed}）。配布枚数の設定を確認してください。`,
      );
      return null;
    }
    return r;
  }, [participants, distributed]);

  // 継続率：2回以上記録した人の割合
  const repeatRate =
    participants != null && repeaters != null && participants > 0
      ? Math.round((repeaters / participants) * 100)
      : null;

  const zoneDist = useMemo(() => {
    const c: Record<Zone, number> = { KEEP: 0, BOOST: 0, ACTION: 0 };
    for (const d of rows) c[zoneFromColor(d.color_value)]++;
    return ZONES.map((z) => ({ zone: z, value: c[z] }));
  }, [rows]);

  const scoreDist = useMemo(() => {
    const c = Array.from({ length: 8 }, (_, i) => ({
      score: i + 1,
      count: 0,
      zone: zoneFromColor(i + 1),
    }));
    for (const d of rows) c[d.color_value - 1].count++;
    return c;
  }, [rows]);

  const trend = useMemo(
    () =>
      months.map((m) => {
        const inMonth = rows.filter((d) => d.measured_at.startsWith(m));
        const a = inMonth.length
          ? inMonth.reduce((s, d) => s + d.color_value, 0) / inMonth.length
          : null;
        return {
          month: m.slice(5) + "月",
          avg: a == null ? null : Number(a.toFixed(2)),
          n: inMonth.length,
        };
      }),
    [rows, months],
  );

  const suppressed = isSuppressed(total);

  return (
    <div className="min-h-dvh bg-zinc-50">
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
          {headerAction}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        {showSampleBadge && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[12px] leading-relaxed text-amber-800">
              サンプルデータ（実際の測定記録ではありません）
            </p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select label="所属" value={org} onChange={setOrg}>
            <option value="all">すべての所属</option>
            {orgs.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
            <option value="none">所属なし</option>
          </Select>
          <Select label="期間" value={period} onChange={setPeriod}>
            <option value="all">全期間</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m.replace("-", "/")}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-sky border-t-transparent" />
          </div>
        ) : total === 0 ? (
          <p className="mt-12 text-center text-sm text-zinc-400">該当する記録がまだありません。</p>
        ) : suppressed ? (
          <div className="mt-10 rounded-2xl border border-zinc-100 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-zinc-700">データが少ないため表示しません</p>
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
              対象の記録が {MIN_AGGREGATE_N} 件未満のときは、個人が推測されないよう集計値を表示しない設定にしています。
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
              <Kpi label="累計測定件数" value={total.toLocaleString()} unit="件" n={total} />
              <Kpi
                label="実施人数"
                value={participants == null ? "—" : participants.toLocaleString()}
                unit="人"
                n={total}
              />
              <Kpi
                label="参加率"
                value={
                  statsSuppressed
                    ? null
                    : distributed == null
                      ? "未設定"
                      : joinRate == null
                        ? "—"
                        : String(joinRate)
                }
                unit={statsSuppressed || distributed == null || joinRate == null ? "" : "%"}
                masked={statsSuppressed}
                note={
                  distributed == null
                    ? "配布数に対する実施人数の割合"
                    : `配布 ${distributed.toLocaleString()}枚中`
                }
              />
              <Kpi
                label="継続率"
                value={statsSuppressed ? null : repeatRate == null ? "—" : String(repeatRate)}
                unit={statsSuppressed || repeatRate == null ? "" : "%"}
                masked={statsSuppressed}
                note="2回以上記録した人の割合"
              />
              <Kpi
                label="平均値"
                value={avg.toFixed(2)}
                unit="／8"
                n={total}
                note="1〜8は比色表の色番号です。判定値ではありません。" // copy-lint-ignore
              />
              <Kpi label="KEEPゾーン割合" value={String(keepRatio)} unit="%" n={total} />
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              対象の所属数：{orgCount}件
            </p>

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
                  {zoneDist.map((d) => (
                    <li key={d.zone} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: ZONE_STYLE[d.zone].accent }}
                      />
                      <span className="font-medium text-zinc-700">{d.zone}</span>
                      <span className="ml-auto tabular-nums text-zinc-500">
                        {Math.round((d.value / total) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">n = {total.toLocaleString()}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                集団の色分布です。健康状態を判定するものではありません。 {/* copy-lint-ignore */}
              </p>
            </Card>

            <Card title="色番号の分布（1〜8）">
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
                      labelFormatter={(l) => `色番号 ${l}`}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {scoreDist.map((d) => (
                        <Cell key={d.score} fill={ZONE_STYLE[d.zone].accent} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">n = {total.toLocaleString()}</p>
            </Card>

            <Card title="平均値の推移（月次）">
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
                    <Tooltip content={<TrendTooltip />} />
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
          </>
        )}

        <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-400">
          集団の匿名集計です
        </p>
        <ComplianceFooter />
      </div>
    </div>
  );
}

// 平均値の推移のツールチップ（平均値と母数nを併記）
function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { month: string; avg: number | null; n: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-zinc-100 bg-white px-3 py-2 text-xs shadow">
      <div className="font-semibold text-zinc-700">{p.month}</div>
      <div className="text-zinc-500">平均値 {p.avg ?? "—"}</div>
      <div className="text-zinc-400">n = {p.n.toLocaleString()}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  n,
  note,
  masked = false,
}: {
  label: string;
  value: string | null;
  unit: string;
  n?: number;
  note?: string;
  masked?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-sm">
      <p className="text-[11px] text-zinc-500">{label}</p>
      {masked ? (
        <p className="mt-1 text-[12px] leading-snug text-zinc-500">{SUPPRESSED_LABEL}</p>
      ) : (
        <p className="mt-1 text-2xl font-bold text-brand">
          {value}
          <span className="ml-0.5 text-xs font-medium text-zinc-400">{unit}</span>
        </p>
      )}
      {!masked && n != null && (
        <p className="mt-0.5 text-[11px] text-zinc-400">n = {n.toLocaleString()}</p>
      )}
      {!masked && note && <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{note}</p>}
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
