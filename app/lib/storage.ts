"use client";

import { v4 as uuidv4 } from "uuid";
import { type RecordEntry, zoneFromColor } from "./types";

// 第1段：localStorage のみ（個人情報を一切預からない・ログイン不要）。
// 保存先を差し替えるだけで第2段(Supabase)へ移行できるよう、CRUDをこの層に閉じ込める。

const USER_KEY = "ocl_user_id";
const RECORDS_KEY = "ocl_records";
const EVENT = "ocl_records_changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ローカル生成の仮ユーザーID（第2段でSupabase認証IDへ移行）
export function getUserId(): string {
  if (!isBrowser()) return "";
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export function getRecords(): RecordEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecordEntry[];
    return parsed.sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  } catch {
    return [];
  }
}

export function getRecordByDate(date: string): RecordEntry | undefined {
  return getRecords().find((r) => r.measured_at === date);
}

function persist(records: RecordEntry[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(EVENT));
}

// 同日に既存記録があれば上書き（measured_at は1日1件を基本）
export function upsertRecord(measured_at: string, color_value: number): RecordEntry {
  const records = getRecords();
  const existing = records.find((r) => r.measured_at === measured_at);
  const entry: RecordEntry = {
    id: existing?.id ?? uuidv4(),
    user_id: getUserId(),
    org_id: null, // 第3段用の箱。第1段は null
    measured_at,
    color_value,
    zone: zoneFromColor(color_value),
    created_at: existing?.created_at ?? new Date().toISOString(),
  };
  const next = existing
    ? records.map((r) => (r.id === existing.id ? entry : r))
    : [...records, entry];
  persist(next);
  return entry;
}

export function deleteRecord(id: string) {
  persist(getRecords().filter((r) => r.id !== id));
}

// 画面間で記録変更を反映するための購読
export function subscribeRecords(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // 別タブ更新も反映
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
