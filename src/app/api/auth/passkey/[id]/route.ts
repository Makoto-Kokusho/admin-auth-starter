import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  const { id } = await params;
  const service = getServiceSupabase();
  const { error } = await service
    .from('admin_passkeys')
    .delete()
    .eq('id', id)
    .eq('email', admin.email);
  if (error) {
    return NextResponse.json({ error: `削除失敗: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
