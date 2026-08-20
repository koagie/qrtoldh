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
import {
  clearLocalRecords,
  getOrgCode,
  getRecords as getLocalRecords,
  setOrgCode,
} from "../lib/storage";
import type { Measurement } from "../lib/types";
import type { AppUser, Gender } from "../lib/profile";
import { POLICY_VERSION, REQUIRED_CONSENTS } from "../lib/policy";

// デモ用アカウント。メールアドレスだけをブラウザに置き、
// パスワードはサーバー限定の環境変数に置いて /api/demo-login 経由でログインする。
export const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "";
export const DEMO_ENABLED = Boolean(DEMO_EMAIL);

interface AppData {
  user: User | null;
  authReady: boolean;
  isDemo: boolean;
  appUser: AppUser | null; // 内部の利用者（app_users）
  profileReady: boolean; // 属性の確認が終わったか
  profileAvailable: boolean; // app_users を利用できるか（未作成なら false）
  needsSetup: boolean; // 属性の登録がまだ必要か
  measurements: Measurement[];
  measurementsReady: boolean;
  saveMeasurement: (measuredOn: string, colorValue: number) => Promise<void>;
  completeSetup: (age: number, gender: Gender) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}

// 測定値を返す薄いフック（既存ページ互換）
export function useRecords(): Measurement[] {
  return useAppData().measurements;
}

export default function AppDataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [profileAvailable, setProfileAvailable] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [measurementsReady, setMeasurementsReady] = useState(false);

  // QRで開かれたら配布コードを保存し、以降の記録に付与する。
  // ?c= が現行仕様（10桁の不透明ID）。?org= は以前のQR向けの後方互換。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("c") ?? params.get("org");
    if (code) setOrgCode(code);
  }, []);

  // 認証状態の購読
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

  // ログインしたら app_users の行を用意し、測定値を読み込む
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      // ① app_users の行を確保（無ければ作る）
      const found = await supabase
        .from("app_users")
        .select("id,age,gender,entry_code")
        .eq("auth_user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (found.error) {
        // app_users がまだ無い環境では属性登録で足止めしない
        if (active) {
          setProfileAvailable(false);
          setProfileReady(true);
          setMeasurementsReady(true);
        }
        return;
      }

      let row = found.data as AppUser | null;
      if (!row) {
        const created = await supabase
          .from("app_users")
          .insert({ auth_user_id: user.id, entry_code: getOrgCode() })
          .select("id,age,gender,entry_code")
          .single();
        row = (created.data as AppUser | null) ?? null;
      } else if (!row.entry_code && getOrgCode()) {
        // あとからQRを読んだ場合は最初の1回だけ配布コードを記録する
        await supabase
          .from("app_users")
          .update({ entry_code: getOrgCode() })
          .eq("id", row.id);
      }

      if (!active) return;
      setAppUser(row);
      setProfileAvailable(true);
      setProfileReady(true);
      if (!row) return;

      // ② ログイン前にローカルへ貯めた記録をクラウドへ移す
      const local = getLocalRecords();
      if (local.length > 0) {
        const code = getOrgCode();
        const rows = local.map((r) => ({
          app_user_id: row!.id,
          measured_on: r.measured_at,
          color_value: r.color_value,
          distribution_code: code,
          context: "self" as const,
        }));
        const { error } = await supabase
          .from("measurements")
          .upsert(rows, { onConflict: "app_user_id,measured_on,context" });
        if (!error) clearLocalRecords();
      }

      // ③ 測定値を読み込む
      const { data } = await supabase
        .from("measurements")
        .select("*")
        .order("measured_on", { ascending: true });
      if (active) {
        setMeasurements((data as Measurement[] | null) ?? []);
        setMeasurementsReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, supabase]);

  // 測定の記録（同じ日・同じ文脈は上書き）
  const saveMeasurement = useCallback(
    async (measuredOn: string, colorValue: number) => {
      if (!appUser) return;
      const { data, error } = await supabase
        .from("measurements")
        .upsert(
          {
            app_user_id: appUser.id,
            measured_on: measuredOn,
            color_value: colorValue,
            distribution_code: getOrgCode(),
            context: "self",
            recorded_at: new Date().toISOString(),
          },
          { onConflict: "app_user_id,measured_on,context" },
        )
        .select()
        .single();
      if (error || !data) return;
      const saved = data as Measurement;
      setMeasurements((prev) =>
        [...prev.filter((m) => m.measured_on !== measuredOn), saved].sort((a, b) =>
          a.measured_on.localeCompare(b.measured_on),
        ),
      );
    },
    [supabase, appUser],
  );

  // 属性の登録と、同意の記録（目的ごとに1行ずつ）
  const completeSetup = useCallback(
    async (age: number, gender: Gender) => {
      if (!appUser) return;

      const { data, error } = await supabase
        .from("app_users")
        .update({ age, gender })
        .eq("id", appUser.id)
        .select("id,age,gender,entry_code")
        .single();
      if (error) throw error;

      // 同意した目的ごとに consents へ1行。文書の版と必ず紐づける。
      const { data: docs } = await supabase
        .from("consent_documents")
        .select("id,purpose,version")
        .in("purpose", REQUIRED_CONSENTS)
        .eq("version", POLICY_VERSION);

      const rows = (docs ?? []).map((d: { id: string; purpose: string; version: string }) => ({
        app_user_id: appUser.id,
        consent_document_id: d.id,
        purpose: d.purpose,
        version: d.version,
      }));
      if (rows.length > 0) await supabase.from("consents").insert(rows);

      setAppUser(data as AppUser);
    },
    [supabase, appUser],
  );

  const signInDemo = useCallback(async () => {
    const res = await fetch("/api/demo-login", { method: "POST" });
    if (!res.ok) throw new Error("demo sign-in failed");
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user ?? null);
    setAuthReady(true);
  }, [supabase]);

  function reset() {
    setAppUser(null);
    setProfileReady(false);
    setProfileAvailable(false);
    setMeasurements([]);
    setMeasurementsReady(false);
  }

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    reset();
  }, [supabase]);

  // 本人のデータとアカウントを削除する
  const deleteAccount = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    clearLocalRecords();
    await supabase.auth.signOut();
    reset();
  }, [supabase, user]);

  const isDemo = Boolean(
    DEMO_ENABLED && user?.email && user.email.toLowerCase() === DEMO_EMAIL.toLowerCase(),
  );

  // 属性が未登録なら、まず登録してもらう
  const needsSetup = Boolean(
    user && profileReady && profileAvailable && appUser && appUser.age == null,
  );

  const value = useMemo<AppData>(
    () => ({
      user,
      authReady,
      isDemo,
      appUser,
      profileReady,
      profileAvailable,
      needsSetup,
      measurements,
      measurementsReady,
      saveMeasurement,
      completeSetup,
      signInDemo,
      signOut,
      deleteAccount,
    }),
    [
      user,
      authReady,
      isDemo,
      appUser,
      profileReady,
      profileAvailable,
      needsSetup,
      measurements,
      measurementsReady,
      saveMeasurement,
      completeSetup,
      signInDemo,
      signOut,
      deleteAccount,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
