import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { getRpConfig } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const { attestation, deviceName } = body;
  const { rpID, origin } = getRpConfig(request.nextUrl.origin);
  const service = getServiceSupabase();

  // 最新の未使用チャレンジを取得
  const { data: challengeRow } = await service
    .from('admin_webauthn_challenges')
    .select('*')
    .eq('email', admin.email)
    .eq('type', 'registration')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!challengeRow) {
    return NextResponse.json({ error: 'チャレンジが見つかりません' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `検証失敗: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: '認証器の登録に失敗しました' }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const transports = attestation.response?.transports || [];

  // public_keyはbase64で保存（BYTEAだとJSON経由で壊れる問題を回避）
  const publicKeyB64 = Buffer.from(credential.publicKey).toString('base64');

  const { error: insertError } = await service.from('admin_passkeys').insert({
    email: admin.email,
    credential_id: credential.id,
    public_key: publicKeyB64,
    counter: credential.counter,
    transports,
    device_name: deviceName || null,
  });

  if (insertError) {
    console.error('Passkey insert error:', insertError);
    return NextResponse.json(
      { error: `登録失敗: ${insertError.message}` },
      { status: 500 },
    );
  }

  // チャレンジ削除
  await service.from('admin_webauthn_challenges').delete().eq('id', challengeRow.id);

  return NextResponse.json({ ok: true });
}
