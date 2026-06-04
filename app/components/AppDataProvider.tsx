"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import { clearLocalRecords, getRecords as getLocalRecords } from "../lib/storage";
import { type RecordEntry, zoneFromColor } from "../lib/types";

interface AppData {
  user: User | null;
  authReady: boolean; // 初回のセッション確認が終わったか
  records: RecordEntry[];
  recordsReady: boolean;
  upsertRecord: (measuredAt: string, colorValue: number) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}

// records を返す薄いフック（既存ページ互換）
export function useRecords(): RecordEntry[] {
  return useAppData().records;
}

export default function AppDataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [recordsReady, setRecordsReady] = useState(false);

  // 認証状態の購読（setState は非同期コールバック内なので effect 同期 setState には当たらない）
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // ログインユーザーが確定したら、ローカル記録を移行 → クラウドから読み込み
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      // ① ローカルに残っている記録をクラウドへ移行（同日重複は上書き）
      const local = getLocalRecords();
      if (local.length > 0) {
        const rows = local.map((r) => ({
          user_id: user.id,
          org_id: null,
          measured_at: r.measured_at,
          color_value: r.color_value,
          zone: zoneFromColor(r.color_value),
        }));
        const { error } = await supabase
          .from("records")
          .upsert(rows, { onConflict: "user_id,measured_at" });
        if (!error) clearLocalRecords();
      }
      // ② クラウドから読み込み
      const { data } = await supabase
        .from("records")
        .select("*")
        .order("measured_at", { ascending: true });
      if (active) {
        setRecords((data as RecordEntry[] | null) ?? []);
        setRecordsReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, supabase]);

  // 記録の作成／上書き（user_id + measured_at をユニークキーに upsert）
  const upsertRecord = useCallback(
    async (measuredAt: string, colorValue: number) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("records")
        .upsert(
          {
            user_id: user.id,
            org_id: null,
            measured_at: measuredAt,
            color_value: colorValue,
            zone: zoneFromColor(colorValue),
          },
          { onConflict: "user_id,measured_at" },
        )
        .select()
        .single();
      if (error || !data) return;
      const saved = data as RecordEntry;
      setRecords((prev) =>
        [...prev.filter((r) => r.measured_at !== measuredAt), saved].sort((a, b) =>
          a.measured_at.localeCompare(b.measured_at),
        ),
      );
    },
    [supabase, user],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRecords([]);
    setRecordsReady(false);
  }, [supabase]);

  const value = useMemo<AppData>(
    () => ({ user, authReady, records, recordsReady, upsertRecord, signOut }),
    [user, authReady, records, recordsReady, upsertRecord, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
