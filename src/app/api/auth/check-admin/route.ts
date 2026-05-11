import { NextRequest, NextResponse } from 'next/server';
import { isAllowedEmail } from '@/lib/admin-auth';

// middlewareから呼ばれる内部API: 指定emailが許可リストに含まれているか返す
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await isAllowedEmail(email);
  return NextResponse.json({ ok }, { status: ok ? 200 : 403 });
}
