import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, isValidRole } from '@/lib/admin-auth';
import { getServiceSupabase } from '@/lib/supabase';

// メンバー名・権限編集（オーナーのみ）
// - name: 名前更新
// - role: 'admin' | 'member' のみ受け付ける（owner昇格・降格はUIから不可）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin?.is_owner) {
    return NextResponse.json({ error: 'この操作はオーナーのみ可能です' }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const service = getServiceSupabase();

  const update: { name?: string; role?: 'admin' | 'member' } = {};

  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: '名前を入力してください' }, { status: 400 });
    }
    update.name = trimmed;
  }

  if (body.role !== undefined) {
    if (!isValidRole(body.role) || body.role === 'owner') {
      return NextResponse.json({ error: '指定できる権限は admin / member のみです' }, { status: 400 });
    }
    // 対象のオーナーチェック：オーナーの権限はUIから変更不可
    const { data: target } = await service
      .from('admin_users')
      .select('id, is_owner, role')
      .eq('id', id)
      .single();
    if (!target) {
      return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
    }
    if (target.is_owner || target.role === 'owner') {
      return NextResponse.json({ error: 'オーナーの権限は変更できません' }, { status: 400 });
    }
    update.role = body.role;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '更新対象がありません' }, { status: 400 });
  }

  const { data, error } = await service
    .from('admin_users')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `更新失敗: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json(data);
}

// メンバー削除（オーナーのみ。オーナー自身・他オーナーは削除不可）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin?.is_owner) {
    return NextResponse.json({ error: 'この操作はオーナーのみ可能です' }, { status: 403 });
  }
  const { id } = await params;
  const service = getServiceSupabase();

  // 対象チェック
  const { data: target } = await service
    .from('admin_users')
    .select('id, email, is_owner')
    .eq('id', id)
    .single();

  if (!target) {
    return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
  }
  if (target.is_owner) {
    return NextResponse.json({ error: 'オーナーは削除できません' }, { status: 400 });
  }

  const { error } = await service.from('admin_users').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: `削除失敗: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
