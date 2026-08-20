"use client";

import { useMemo, useState } from "react";
import ZoneBadge from "../components/ZoneBadge";
import { hexForColorValue } from "../lib/colors";
import { ZONE_MESSAGE } from "../lib/messages";
import { formatJP, toYMD } from "../lib/date";
import { useRecords, useToday } from "../lib/hooks";
import { zoneFromColor } from "../lib/types";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const today = useToday();
  const records = useRecords();
  // 現在月からの相対オフセット（前後の月へ移動）。effect 不要。
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 日付 → 記録 の索引
  const byDate = useMemo(() => {
    const map = new Map<string, (typeof records)[number]>();
    for (const r of records) map.set(r.measured_on, r);
    return map;
  }, [records]);

  const view = useMemo(() => {
    if (!today) return null;
    const base = new Date(`${today}T00:00:00`);
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const startPad = d.getDay(); // 日曜始まり
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(toYMD(new Date(y, m, day)));
    return { y, m, cells };
  }, [today, offset]);

  const monthCount = useMemo(() => {
    if (!view) return 0;
    const prefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}`;
    return records.filter((r) => r.measured_on.startsWith(prefix)).length;
  }, [records, view]);

  if (!view) return null;

  const selectedRecord = selectedDate ? byDate.get(selectedDate) : undefined;

  function shiftMonth(delta: number) {
    setSelectedDate(null);
    setOffset((o) => o + delta);
  }

  return (
    <div className="px-4 pt-5">
      <header className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-full px-3 py-2 text-xl text-zinc-400 active:bg-zinc-100"
          aria-label="前の月"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold text-zinc-800">
          {view.y}年{view.m + 1}月
        </h1>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-full px-3 py-2 text-xl text-zinc-400 active:bg-zinc-100"
          aria-label="次の月"
        >
          ›
        </button>
      </header>

      <p className="mb-4 text-center text-sm text-zinc-500">
        今月<span className="mx-1 text-lg font-bold text-brand">{monthCount}</span>回観察
      </p>

      <div className="grid grid-cols-7 text-center text-[11px] text-zinc-400">
        {WEEK.map((w) => (
          <div key={w} className="pb-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5">
        {view.cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
          const rec = byDate.get(date);
          const day = Number(date.split("-")[2]);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(rec ? date : null)}
              className={`mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-2xl ${
                isSelected ? "bg-brand-soft ring-2 ring-brand-sky" : ""
              }`}
            >
              <span
                className={`text-sm ${isToday ? "font-bold text-brand" : "text-zinc-600"}`}
              >
                {day}
              </span>
              {/* その日の色のドット（記録がある日のみ） */}
              <span className="mt-0.5 h-2.5 w-2.5">
                {rec ? (
                  <span
                    className="block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: hexForColorValue(rec.color_value) }}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* 日タップでその日の記録詳細（評価語なし・事実のみ） */}
      {selectedRecord && (
        <section className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">
              {formatJP(selectedRecord.measured_on)}
            </span>
            <ZoneBadge zone={zoneFromColor(selectedRecord.color_value)} size="sm" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: hexForColorValue(selectedRecord.color_value) }}
            />
            <span className="text-sm text-zinc-600">
              この日の色は {selectedRecord.color_value} 番
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {ZONE_MESSAGE[zoneFromColor(selectedRecord.color_value)]}
          </p>
        </section>
      )}

      {records.length === 0 && (
        <p className="mt-8 text-center text-sm text-zinc-400">
          まだ記録がありません。「記録」タブから今日の色を選んでみよう。
        </p>
      )}
    </div>
  );
}
