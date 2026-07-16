"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import TabNav from "./TabNav";
import LoginScreen from "./LoginScreen";
import { useAppData } from "./AppDataProvider";

// ログイン不要で閲覧できる公開ルート
const PUBLIC_ROUTES = ["/privacy", "/auth/auth-code-error"];

// 認証状態に応じて、ログイン画面 / アプリ本体を出し分けるシェル。
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, authReady, isDemo, signOut } = useAppData();
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.some((p) => pathname.startsWith(p));

  // 管理者エリア（/admin）は独自レイアウト＆認証ガード（middleware）に任せ、
  // 一般利用者向けのヘッダー/フッター/タブや認証ゲートを通さない。
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-sm">
      {/* ブランドヘッダー（ロゴ常時表示・ログイン中はログアウト） */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-100 bg-white/95 px-4 py-2.5 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="h-7 w-7" />
        <span className="font-wordmark text-[15px] font-semibold tracking-tight text-brand">
          LDH test NAGATA
        </span>
        {isDemo && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            デモ
          </span>
        )}
        {user && (
          <button
            type="button"
            onClick={() => signOut()}
            className={`${isDemo ? "" : "ml-auto"} rounded-full px-3 py-1 text-xs font-medium text-zinc-400 active:bg-zinc-100`}
          >
            ログアウト
          </button>
        )}
      </header>

      <main className="flex-1 pb-2">
        {isPublic ? (
          children
        ) : !authReady ? (
          <Splash />
        ) : user ? (
          children
        ) : (
          <LoginScreen />
        )}
      </main>

      <Footer />
      {user && <TabNav />}
    </div>
  );
}

function Splash() {
  return (
    <div className="flex h-[60dvh] items-center justify-center">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-sky border-t-transparent" />
    </div>
  );
}
