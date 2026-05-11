import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-auth-server';
import { isAllowedEmail } from '@/lib/admin-auth';

// Supabase Auth のマジックリンクコールバック
// /admin/auth/callback?code=xxx&next=/admin
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/admin';

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`);
  }

  // 許可リスト外ならサインアウト + エラー表示
  const allowed = await isAllowedEmail(data.user.email);
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/login?error=not_allowed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
