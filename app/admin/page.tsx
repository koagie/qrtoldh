"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { DEMO_MEASUREMENTS, DEMO_ORGS, demoStats } from "../lib/admin-dummy";
import { useAppData } from "../components/AppDataProvider";
import DashboardView, { type Measurement, type Org, type OrgStats } from "./DashboardView";

// "all" | "YYYY-MM" → [開始, 終了) のISO文字列。終了は翌月1日（未満で比較）。
function periodRange(period: string): [string | null, string | null] {
  if (period === "all") return [null, null];
  const [y, m] = period.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 1);
  return [from.toISOString(), to.toISOString()];
}

// 管理ダッシュボード（管理者のみ。middleware でガード）。
// 実データ（匿名ビュー admin_measurements）から集計し、まだ0件ならデモデータを表示する。
export default function AdminDashboardPage() {
  const { signOut } = useAppData();
  const router = useRouter();

  const [realRows, setRealRows] = useState<Measurement[]>([]);
  const [realOrgs, setRealOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false); // 実データが0件なら自動でデモ表示
  const [stats, setStats] = useState<OrgStats | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [m, o] = await Promise.all([
        supabase.from("admin_measurements").select("org_code,color_value,measured_at"),
        supabase
          .from("organizations")
          .select("code,name,is_demo,distributed_count")
          .order("name"),
      ]);
      const rows = (m.data as Measurement[] | null) ?? [];
      setRealRows(rows);
      setRealOrgs((o.data as Org[] | null) ?? []);
      setDemo(rows.length === 0); // 実データがまだ無ければデモを表示
      setLoading(false);
    })();
  }, []);

  // 絞り込みに応じて実施人数・継続人数を取り直す（返るのは集約済みの数値のみ）
  const handleFilterChange = useCallback(
    (org: string, period: string) => {
      if (demo) {
        setStats(demoStats(org, period));
        return;
      }
      // 「所属なし」は org_code が null のため、関数の集計対象外
      if (org === "none") {
        setStats(null);
        return;
      }
      const [from, to] = periodRange(period);
      const supabase = createClient();
      supabase
        .rpc("admin_org_stats", {
          p_org_code: org === "all" ? null : org,
          p_from: from,
          p_to: to,
        })
        .then(({ data }) => {
          const list = (data as OrgStats[] | null) ?? [];
          if (list.length === 0) {
            setStats(null);
            return;
          }
          // すべての所属を選択中は団体ごとの行が返るため合算する
          setStats({
            participants: list.reduce((s, r) => s + r.participants, 0),
            repeaters: list.reduce((s, r) => s + r.repeaters, 0),
            measurements: list.reduce((s, r) => s + r.measurements, 0),
          });
        });
    },
    [demo],
  );

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
      stats={stats}
      onFilterChange={handleFilterChange}
      headerAction={
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/admin/qr"
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white"
          >
            QR
          </Link>
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
