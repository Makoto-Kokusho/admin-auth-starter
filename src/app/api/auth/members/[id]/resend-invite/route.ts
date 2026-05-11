import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getServiceSupabase } from '@/lib/supabase';

// 既存メンバーへログインリンクを再送（オーナーのみ）
// 招待リンクが期限切れ等で詰まった場合に使う
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin?.is_owner) {
    return NextResponse.json({ error: 'この操作はオーナーのみ可能です' }, { status: 403 });
  }

  const { id } = await params;
  const service = getServiceSupabase();

  const { data: target } = await service
    .from('admin_users')
    .select('id, email')
    .eq('id', id)
    .single();

  if (!target) {
    return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const origin = request.nextUrl.origin;
  const redirectTo = `${origin}/admin/auth/callback?next=${encodeURIComponent('/admin/settings')}`;

  // まず inviteUserByEmail（Supabase Auth上にユーザー未作成のケース）
  const { error: invError } = await adminClient.auth.admin.inviteUserByEmail(target.email, {
    redirectTo,
  });

  if (!invError) {
    return NextResponse.json({ ok: true, method: 'invite' });
  }

  // 既にAuth上にユーザーが存在する場合は OTP マジックリンク送信に切替
  if (/already|exists|registered/i.test(invError.message)) {
    const { error: magicError } = await adminClient.auth.signInWithOtp({
      email: target.email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (magicError) {
      return NextResponse.json({ error: `送信失敗: ${magicError.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true, method: 'magiclink' });
  }

  return NextResponse.json({ error: `送信失敗: ${invError.message}` }, { status: 500 });
}
