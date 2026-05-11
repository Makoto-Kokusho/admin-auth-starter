import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  const service = getServiceSupabase();
  const { data } = await service
    .from('admin_passkeys')
    .select('id, device_name, last_used_at, created_at')
    .eq('email', admin.email)
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}
