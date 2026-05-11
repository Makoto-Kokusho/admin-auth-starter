-- 管理者許可リスト + 権限ロール（3段階）
-- - owner  : 全権限（メンバー管理を含む）
-- - admin  : 業務上の重要操作が可能（承認・削除など、各プロジェクトで定義）
-- - member : 閲覧のみ（重要操作の権限なし）
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_owner BOOLEAN DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- パスキー（WebAuthn credentials）
CREATE TABLE IF NOT EXISTS admin_passkeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL REFERENCES admin_users(email) ON UPDATE CASCADE ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,  -- base64エンコード文字列で保存
  counter BIGINT DEFAULT 0,
  transports TEXT[],
  device_name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_passkeys_email ON admin_passkeys(email);

-- WebAuthn challenge（一時保存・短期TTL）
CREATE TABLE IF NOT EXISTS admin_webauthn_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_webauthn_challenges_challenge ON admin_webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_admin_webauthn_challenges_expires ON admin_webauthn_challenges(expires_at);

-- RLS: 全テーブルはservice roleのみアクセス可（クライアント経由のアクセスを拒否）
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_webauthn_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - admin_users" ON admin_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role only - admin_passkeys" ON admin_passkeys
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role only - admin_webauthn_challenges" ON admin_webauthn_challenges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 初回オーナーの登録
-- ============================================================
-- 以下の YOUR_EMAIL を最初のオーナーのメールアドレスに置き換えて実行してください。
-- このユーザーがログインできるようになり、メンバー画面から他の人を招待できます。
--
-- INSERT INTO admin_users (email, name, is_owner, role)
-- VALUES ('YOUR_EMAIL@example.com', 'あなたの名前', true, 'owner');
