import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TabNav from "./components/TabNav";
import Footer from "./components/Footer";
import ServiceWorker from "./components/ServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "お口の観察ログ",
  description:
    "試験紙の色を自分で記録し、日々の変化を観察してセルフケアの習慣化を応援する健康教育用ツールです。",
  applicationName: "お口の観察ログ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "お口の観察ログ",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A4684",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* モバイルファースト：スマホ縦画面前提。中央に最大幅を固定 */}
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-sm">
          {/* ブランドヘッダー（ロゴ常時表示） */}
          <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-100 bg-white/95 px-4 py-2.5 backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-7 w-7" />
            <span className="font-wordmark text-[15px] font-semibold tracking-tight text-brand">
              LDH test NAGATA
            </span>
          </header>
          <main className="flex-1 pb-2">{children}</main>
          <Footer />
          <TabNav />
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
