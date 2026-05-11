import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  return NextResponse.json({
    email: admin.email,
    name: admin.name,
    role: admin.role,
    is_owner: admin.is_owner,
  });
}
