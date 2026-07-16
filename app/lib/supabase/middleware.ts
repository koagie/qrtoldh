import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// リクエストごとにセッション cookie を更新（トークンの自動リフレッシュ）。
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() を呼ぶことでトークンのリフレッシュが走る
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 管理者エリアのガード（/admin。ただし /admin/login と 公開デモ /admin/demo は除外）
  const path = request.nextUrl.pathname;
  const isAdminArea =
    path.startsWith("/admin") &&
    !path.startsWith("/admin/login") &&
    !path.startsWith("/admin/demo");
  if (isAdminArea) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}
