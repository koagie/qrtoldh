"use client";

import Footer from "./Footer";
import TabNav from "./TabNav";
import LoginScreen from "./LoginScreen";
import { useAppData } from "./AppDataProvider";

// 認証状態に応じて、ログイン画面 / アプリ本体を出し分けるシェル。
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, authReady, signOut } = useAppData();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-sm">
      {/* ブランドヘッダー（ロゴ常時表示・ログイン中はログアウト） */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-100 bg-white/95 px-4 py-2.5 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="h-7 w-7" />
        <span className="font-wordmark text-[15px] font-semibold tracking-tight text-brand">
          LDH test NAGATA
        </span>
        {user && (
          <button
            type="button"
            onClick={() => signOut()}
            className="ml-auto rounded-full px-3 py-1 text-xs font-medium text-zinc-400 active:bg-zinc-100"
          >
            ログアウト
          </button>
        )}
      </header>

      <main className="flex-1 pb-2">
        {!authReady ? (
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
