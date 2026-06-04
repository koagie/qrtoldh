"use client";

import { useSyncExternalStore } from "react";
import { getRecords, subscribeRecords } from "./storage";
import { todayYMD } from "./date";
import type { RecordEntry } from "./types";

// records を React の外部ストアとして購読する（effect 内 setState を避ける正攻法）。
// getSnapshot は内容が変わらない限り同一参照を返す必要があるため、
// localStorage の生文字列をキーにキャッシュする。
const EMPTY: RecordEntry[] = [];
let lastRaw: string | null = null;
let lastValue: RecordEntry[] = EMPTY;

function getSnapshot(): RecordEntry[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem("ocl_records");
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastValue = getRecords();
  }
  return lastValue;
}

export function useRecords(): RecordEntry[] {
  return useSyncExternalStore(subscribeRecords, getSnapshot, () => EMPTY);
}

// クライアントでのみ確定する「今日」。SSR では空文字を返し、ハイドレーション後に実日付。
const noopSubscribe = () => () => {};
export function useToday(): string {
  return useSyncExternalStore(noopSubscribe, todayYMD, () => "");
}
