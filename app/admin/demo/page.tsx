"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { DEMO_MEASUREMENTS, DEMO_ORGS, demoStats } from "../../lib/admin-dummy";
import DashboardView, { type OrgStats } from "../DashboardView";

// 公開デモ用ダッシュボード（認証不要）。
// デモデータのみを表示し、Supabase の実データには一切アクセスしない。
// → 誰が開いてもサンプル値しか出ないため、実績値の漏えいが起こりえない。
export default function AdminDemoPage() {
  const [stats, setStats] = useState<OrgStats | null>(null);

  const handleFilterChange = useCallback((org: string, period: string) => {
    setStats(demoStats(org, period));
  }, []);

  return (
    <DashboardView
      rows={DEMO_MEASUREMENTS}
      orgs={DEMO_ORGS}
      demo
      stats={stats}
      onFilterChange={handleFilterChange}
      headerAction={
        <Link
          href="/admin/login"
          className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
        >
          管理者ログイン
        </Link>
      }
    />
  );
}
