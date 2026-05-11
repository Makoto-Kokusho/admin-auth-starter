import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-auth-server';
import { getRpConfig, byteaToUint8Array } from '@/lib/webauthn';

// public_keyはbase64 or BYTEA hex どちらの形式でも復号できるようにする（過渡期対応）
function decodePublicKey(value: unknown): Uint8Array {
  if (typeof value === 'string') {
    if (value.startsWith('\\x')) return byteaToUint8Array(value);
    // base64として扱う
    const buf = Buffer.from(value, 'base64');
    const out = new Uint8Array(buf.byteLength);
    out.set(buf);
    return out;
  }
  return byteaToUint8Array(value);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { assertion } = body;
  if (!assertion?.id) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
  }

  const { rpID, origin } = getRpConfig(request.nextUrl.origin);
  const service = getServiceSupabase();

  // 登録済みパスキーを credential_id で取得
  const { data: passkey } = await service
    .from('admin_passkeys')
    .select('*')
    .eq('credential_id', assertion.id)
    .single();

  if (!passkey) {
    return NextResponse.json({ error: 'パスキーが登録されていません' }, { status: 404 });
  }

  // 最新のauthenticationチャレンジを取得（emailフィルタなし）
  const { data: challengeRow } = await service
    .from('admin_webauthn_challenges')
    .select('*')
    .eq('type', 'authentication')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!challengeRow) {
    return NextResponse.json({ error: 'チャレンジが見つかりません' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credential_id,
        publicKey: decodePublicKey(passkey.public_key) as unknown as Uint8Array<ArrayBuffer>,
        counter: Number(passkey.counter),
        transports: passkey.transports,
      },
    });
  } catch (e) {
    console.error('Passkey verify error:', e);
    return NextResponse.json(
      { error: `検証失敗: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }

  // カウンター更新・最終利用日時更新
  await service
    .from('admin_passkeys')
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', passkey.id);

  // チャレンジ削除
  await service.from('admin_webauthn_challenges').delete().eq('id', challengeRow.id);

  // Supabaseセッションを確立：サーバー側で直接 verifyOtp してクッキーにセット
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: passkey.email,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    console.error('generateLink error:', linkError);
    return NextResponse.json(
      { error: `セッション確立に失敗しました: ${linkError?.message || 'hashed_token missing'}` },
      { status: 500 },
    );
  }

  // SSRクライアントでverifyOtp → クッキーに自動セット
  const ssrClient = await createSupabaseServerClient();
  const { error: otpError } = await ssrClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });

  if (otpError) {
    console.error('verifyOtp error:', otpError);
    return NextResponse.json(
      { error: `セッション確立に失敗しました: ${otpError.message}` },
      { status: 500 },
    );
  }

  // セッションはクッキーに自動でセット済み。クライアントはそのまま /admin に遷移すればOK
  return NextResponse.json({ redirect_url: '/admin' });
}
