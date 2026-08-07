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
import { type RecordEntry, zoneFromColor } from "../lib/types";
import type { Gender, Profile } from "../lib/profile";

// デモ用アカウント（メール待ちなしで見せるため）。ブラウザから見える値である前提。
export const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";
export const DEMO_ENABLED = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

interface AppData {
  user: User | null;
  authReady: boolean; // 初回のセッション確認が終わったか
  isDemo: boolean; // デモ用アカウントでログイン中か
  profile: Profile | null; // 属性（年齢・性別）。未入力なら null
  profileReady: boolean; // 属性の確認が終わったか
  profileAvailable: boolean; // profiles テーブルを利用できるか（未作成なら false）
  records: RecordEntry[];
  recordsReady: boolean;
  upsertRecord: (measuredAt: string, colorValue: number) => Promise<void>;
  saveProfile: (age: number, gender: Gender) => Promise<void>;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [profileAvailable, setProfileAvailable] = useState(false);

  // QRで開かれたら配布ID（所属コード）を保存し、以降の記録に付与する。
  // ?c= が現行仕様（10桁の不透明ID）。?org= は以前のQR向けの後方互換。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("c") ?? params.get("org");
    if (code) setOrgCode(code);
  }, []);

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
        const orgCode = getOrgCode();
        const rows = local.map((r) => ({
          user_id: user.id,
          org_id: null,
          org_code: orgCode,
          measured_at: r.measured_at,
          color_value: r.color_value,
          zone: zoneFromColor(r.color_value),
        }));
        const { error } = await supabase
          .from("records")
          .upsert(rows, { onConflict: "user_id,measured_at" });
        if (!error) clearLocalRecords();
      }
      // ② クラウドから読み込み（記録と属性）
      const [rec, prof] = await Promise.all([
        supabase.from("records").select("*").order("measured_at", { ascending: true }),
        supabase.from("profiles").select("id,age,gender").eq("id", user.id).maybeSingle(),
      ]);
      if (active) {
        setRecords((rec.data as RecordEntry[] | null) ?? []);
        setRecordsReady(true);
        setProfile((prof.data as Profile | null) ?? null);
        // profiles テーブルが未作成などで問い合わせ自体が失敗した場合は、
        // 保存できない画面で足止めしないよう属性入力を求めない。
        setProfileAvailable(!prof.error);
        setProfileReady(true);
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
            org_code: getOrgCode(),
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

  // 属性（年齢・性別）の保存。本人の行のみ作成・更新できる（RLS）
  const saveProfile = useCallback(
    async (age: number, gender: Gender) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, age, gender, updated_at: new Date().toISOString() })
        .select("id,age,gender")
        .single();
      if (error) throw error;
      setProfile(data as Profile);
    },
    [supabase, user],
  );

  // デモ用アカウントでログイン（メール不要。デモ提示・動作確認用）
  const signInDemo = useCallback(async () => {
    if (!DEMO_ENABLED) return;
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (error) throw error;
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRecords([]);
    setRecordsReady(false);
    setProfile(null);
    setProfileReady(false);
    setProfileAvailable(false);
  }, [supabase]);

  // 本人の記録とアカウント（ログイン用メールアドレス含む）を完全削除し、ログアウトする
  const deleteAccount = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    clearLocalRecords();
    await supabase.auth.signOut();
    setRecords([]);
    setRecordsReady(false);
    setProfile(null);
    setProfileReady(false);
    setProfileAvailable(false);
  }, [supabase, user]);

  const isDemo = Boolean(
    DEMO_ENABLED && user?.email && user.email.toLowerCase() === DEMO_EMAIL.toLowerCase(),
  );

  const value = useMemo<AppData>(
    () => ({
      user,
      authReady,
      isDemo,
      profile,
      profileReady,
      profileAvailable,
      records,
      recordsReady,
      upsertRecord,
      saveProfile,
      signInDemo,
      signOut,
      deleteAccount,
    }),
    [
      user,
      authReady,
      isDemo,
      profile,
      profileReady,
      profileAvailable,
      records,
      recordsReady,
      upsertRecord,
      saveProfile,
      signInDemo,
      signOut,
      deleteAccount,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
