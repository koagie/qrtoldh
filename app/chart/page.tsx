"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ZONE_RANGES, ZONE_STYLE } from "../lib/colors";
import { formatJP, formatShort } from "../lib/date";
import { useRecords } from "../lib/hooks";

type Period = "week" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "週" },
  { key: "month", label: "月" },
  { key: "all", label: "全期間" },
];

export default function ChartPage() {
  const records = useRecords();
  const [period, setPeriod] = useState<Period>("month");

  const data = useMemo(() => {
    let list = records;
    if (period !== "all") {
      const since = new Date();
      since.setDate(since.getDate() - (period === "week" ? 7 : 30));
      const sinceStr = since.toISOString().slice(0, 10);
      list = records.filter((r) => r.measured_on >= sinceStr);
    }
    return list.map((r) => ({
      date: r.measured_on,
      label: formatShort(r.measured_on),
      value: r.color_value,
    }));
  }, [records, period]);

  return (
    <div className="px-4 pt-5">
      <header className="mb-1">
        <h1 className="text-xl font-bold text-zinc-800">あなたの色の記録</h1>
        <p className="mt-0.5 text-sm text-zinc-400">色の位置がどう動いたかの記録です。</p>
      </header>

      {/* 期間切り替え（週／月／全期間） */}
      <div className="my-3 flex gap-2">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              period === key
                ? "bg-brand text-white"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="mt-12 text-center text-sm text-zinc-400">
          この期間の記録はまだありません。
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              {/* 縦軸のゾーン帯（背景に薄く・判定ではなく観察の補助） */}
              {ZONE_RANGES.map(({ zone, min, max }) => (
                <ReferenceArea
                  key={zone}
                  y1={min - 0.5}
                  y2={max + 0.5}
                  fill={ZONE_STYLE[zone].accent}
                  fillOpacity={0.08}
                  ifOverflow="extendDomain"
                />
              ))}
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                domain={[0.5, 8.5]}
                ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                reversed
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={24}
              />
              <Tooltip content={<ColorTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1A4684"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#1A4684", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 凡例：ゾーンは「見直しのきっかけの段階」。改善／悪化の語は使わない */}
      <div className="mt-3 flex justify-center gap-3 text-[11px] text-zinc-500">
        {ZONE_RANGES.map(({ zone, min, max }) => (
          <span key={zone} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: ZONE_STYLE[zone].accent }}
            />
            {ZONE_STYLE[zone].label}（{min}–{max}）
          </span>
        ))}
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-400">
        縦軸は色の位置（1〜8）です。上下の動きは日々の色の変化を表すもので、状態の良し悪しを示すものではありません。
      </p>
    </div>
  );
}

// 折れ線のツールチップ（事実のみ：日付と色番号）
function ColorTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { date: string; value: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-zinc-100 bg-white px-3 py-2 text-xs shadow">
      <div className="font-semibold text-zinc-700">{formatJP(p.date)}</div>
      <div className="text-zinc-500">色 {p.value} 番</div>
    </div>
  );
}
