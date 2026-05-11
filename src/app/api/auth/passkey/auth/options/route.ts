import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getRpConfig, CHALLENGE_TTL_MS } from '@/lib/webauthn';

// 認証開始: resident key 対応のため allowCredentials は空配列
// ユーザーがデバイス上の登録済みパスキーから選択する
export async function POST(request: NextRequest) {
  const { rpID } = getRpConfig(request.nextUrl.origin);
  const service = getServiceSupabase();

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: [],
  });

  await service.from('admin_webauthn_challenges').insert({
    email: null,
    challenge: options.challenge,
    type: 'authentication',
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });

  return NextResponse.json(options);
}
