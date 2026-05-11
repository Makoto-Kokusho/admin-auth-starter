import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getServiceSupabase } from '@/lib/supabase';

// メンバー一覧（オーナーのみ）
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin?.is_owner) {
    return NextResponse.json({ error: 'この操作はオーナーのみ可能です' }, { status: 403 });
  }
  const service = getServiceSupabase();
  const { data } = await service
    .from('admin_users')
    .select('id, email, name, is_owner, role, created_at')
    .order('created_at', { ascending: true });
  // role 未設定の古い行のフォールバック（マイグレーション未適用時用）
  const rows = (data || []).map(r => ({
    ...r,
    role: r.role ?? (r.is_owner ? 'owner' : 'admin'),
  }));
  return NextResponse.json(rows);
}

// メンバー追加（オーナーのみ）+ 招待メール自動送信
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin?.is_owner) {
    return NextResponse.json({ error: 'この操作はオーナーのみ可能です' }, { status: 403 });
  }

  const { email, name } = await request.json();
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  const cleanEmail = email.toLowerCase().trim();
  const service = getServiceSupabase();

  // 1. admin_usersに登録（新規メンバーは最小権限の 'member' で作成）
  // 古いスキーマ（role未追加）でも動くよう、roleカラムが無い場合は再試行
  let insertResult = await service
    .from('admin_users')
    .insert({ email: cleanEmail, name: name?.trim() || null, is_owner: false, role: 'member' })
    .select()
    .single();
  if (insertResult.error && /role/i.test(insertResult.error.message)) {
    insertResult = await service
      .from('admin_users')
      .insert({ email: cleanEmail, name: name?.trim() || null, is_owner: false })
      .select()
      .single();
  }
  const { data, error } = insertResult;

  if (error) {
    if (/duplicate/.test(error.message)) {
      return NextResponse.json({ error: 'そのメールアドレスは既に登録されています' }, { status: 409 });
    }
    return NextResponse.json({ error: `追加失敗: ${error.message}` }, { status: 500 });
  }

  // 2. 招待メール送信
  let invited = false;
  let inviteError: string | undefined;
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const origin = request.nextUrl.origin;
    const redirectTo = `${origin}/admin/auth/callback?next=${encodeURIComponent('/admin/settings')}`;

    // まずは inviteUserByEmail を試行（新規ユーザーの場合に有効）
    const { error: invError } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo,
    });

    if (invError) {
      // 既にSupabase Auth上にユーザーが存在する場合は magiclink を生成して送信
      if (/already|exists|registered/i.test(invError.message)) {
        const { error: magicError } = await adminClient.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
        });
        if (magicError) {
          inviteError = magicError.message;
        } else {
          invited = true;
        }
      } else {
        inviteError = invError.message;
      }
    } else {
      invited = true;
    }
  } catch (e) {
    inviteError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ ...data, invited, inviteError });
}
