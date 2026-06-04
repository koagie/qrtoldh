"use client";

import { useSyncExternalStore } from "react";
import { todayYMD } from "./date";

// records は Supabase バックの AppDataProvider から購読する（第2段でクラウド保存に移行）。
export { useRecords } from "../components/AppDataProvider";

// クライアントでのみ確定する「今日」。SSR では空文字を返し、ハイドレーション後に実日付。
const noopSubscribe = () => () => {};
export function useToday(): string {
  return useSyncExternalStore(noopSubscribe, todayYMD, () => "");
}
