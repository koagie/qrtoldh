"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { DEMO_MEASUREMENTS, DEMO_ORGS } from "../lib/admin-dummy";
import { useAppData } from "../components/AppDataProvider";
import DashboardView, { type Measurement, type Org } from "./DashboardView";

// 管理ダッシュボード（管理者のみ。middleware でガード）。
// 実データ（匿名ビュー admin_measurements）から集計し、まだ0件ならデモデータを表示する。
export default function AdminDashboardPage() {
  const { signOut } = useAppData();
  const router = useRouter();

  const [realRows, setRealRows] = useState<Measurement[]>([]);
  const [realOrgs, setRealOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false); // 実データが0件なら自動でデモ表示

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [m, o] = await Promise.all([
        supabase.from("admin_measurements").select("org_code,color_value,measured_at"),
        supabase.from("orgs").select("code,name").order("name"),
      ]);
      const rows = (m.data as Measurement[] | null) ?? [];
      setRealRows(rows);
      setRealOrgs((o.data as Org[] | null) ?? []);
      setDemo(rows.length === 0); // 実データがまだ無ければデモを表示
      setLoading(false);
    })();
  }, []);

  async function handleSignOut() {
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <DashboardView
      rows={demo ? DEMO_MEASUREMENTS : realRows}
      orgs={demo ? DEMO_ORGS : realOrgs}
      demo={demo}
      loading={loading}
      headerAction={
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDemo((d) => !d)}
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white"
          >
            {demo ? "実データ" : "デモ"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
          >
            ログアウト
          </button>
        </div>
      }
    />
  );
}
