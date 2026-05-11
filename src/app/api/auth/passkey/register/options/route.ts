import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { getRpConfig, CHALLENGE_TTL_MS } from '@/lib/webauthn';

// ログイン済みユーザーに対してパスキー登録のチャレンジを発行
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { rpID, rpName } = getRpConfig(request.nextUrl.origin);
  const service = getServiceSupabase();

  // 既存のパスキーを除外リストに
  const { data: existing } = await service
    .from('admin_passkeys')
    .select('credential_id, transports')
    .eq('email', admin.email);

  const excludeCredentials = (existing || []).map(p => ({
    id: p.credential_id,
    transports: p.transports || undefined,
  }));

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: new TextEncoder().encode(admin.id),
    userName: admin.email,
    userDisplayName: admin.name || admin.email,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  // challenge を DB に保存
  await service.from('admin_webauthn_challenges').insert({
    email: admin.email,
    challenge: options.challenge,
    type: 'registration',
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });

  return NextResponse.json(options);
}
