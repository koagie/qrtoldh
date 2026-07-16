"use client";

import Link from "next/link";
import { DEMO_MEASUREMENTS, DEMO_ORGS } from "../../lib/admin-dummy";
import DashboardView from "../DashboardView";

// 公開デモ用ダッシュボード（認証不要）。
// デモデータのみを表示し、Supabase の実データには一切アクセスしない。
// → 誰が開いてもサンプル値しか出ないため、実績値の漏えいが起こりえない。
export default function AdminDemoPage() {
  return (
    <DashboardView
      rows={DEMO_MEASUREMENTS}
      orgs={DEMO_ORGS}
      demo
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
