import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-auth';

// /admin/* および認証が必要なAPIを保護
// - 未認証なら /admin/login にリダイレクト（ページ）または 401（API）
// - 認証済みでも admin_users 許可リストにいなければ 403
//
// プロジェクト固有のAPIを保護対象に追加したい場合は、
// 下記の `isProtectedApi` と `isPublicApi` を編集してください。
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // 公開パス（認証不要）
  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/auth/callback') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  // 認証関連APIは常に公開（ログイン処理自体に認証が必要だと無限ループするため）
  // プロジェクト固有の公開APIをここに追加（例: 一般公開フォームの送信エンドポイント）
  const isPublicApi = pathname.startsWith('/api/auth/');

  if (isPublicPage || isPublicApi) return response;

  // 保護対象
  // プロジェクト固有のAPIを保護したい場合はこの条件を拡張してください
  // 例: pathname.startsWith('/api/orders') を OR に追加
  const isProtectedAdminPage = pathname.startsWith('/admin');
  const isProtectedApi = pathname.startsWith('/api/');

  if (!isProtectedAdminPage && !isProtectedApi) return response;

  const supabase = createSupabaseMiddlewareClient(request, response);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    if (isProtectedApi) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 許可リスト確認
  const email = user.email.toLowerCase();
  const allowListUrl = new URL('/api/auth/check-admin', request.url);
  allowListUrl.searchParams.set('email', email);
  try {
    const allowRes = await fetch(allowListUrl.toString(), {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    if (!allowRes.ok) {
      if (isProtectedApi) {
        return NextResponse.json({ error: '許可されていないアカウントです' }, { status: 403 });
      }
      // サインアウトしてログインページへ
      await supabase.auth.signOut();
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('error', 'not_allowed');
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    if (isProtectedApi) {
      return NextResponse.json({ error: '認証チェックに失敗しました' }, { status: 500 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
