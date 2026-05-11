'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-auth-browser';
import { startAuthentication } from '@simplewebauthn/browser';

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';
  const errorParam = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [sendingMagic, setSendingMagic] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const firstTimeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorParam === 'not_allowed') {
      setError('そのメールアドレスは管理画面へのアクセスが許可されていません。オーナーにメンバー追加を依頼してください。');
    } else if (errorParam === 'auth_failed') {
      setInfo('ログインリンクの有効期限が切れているか、すでに使用されています。下のフォームでメールアドレスを入力し、新しいログインリンクを受け取ってください。');
      // 初回ログインセクションへスクロール + メール欄にフォーカス
      setTimeout(() => {
        firstTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailRef.current?.focus();
      }, 100);
    }
    // URLからエラーパラメータを除去（再表示を防ぐ）
    if (errorParam && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [errorParam]);

  const signInWithPassword = async () => {
    if (!email || !password) return;
    setSigningIn(true);
    setError('');
    setInfo('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: sbError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (sbError) throw sbError;
      window.location.href = redirect;
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'ログインに失敗しました';
      if (/invalid.*credentials|invalid.*login/i.test(raw)) {
        setError('メールアドレスまたはパスワードが正しくありません。初めてログインする方は下のセクションから「ログインリンクをメールで受け取る」をお試しください。');
        // 初回ログインセクションへスクロール
        setTimeout(() => {
          firstTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else {
        setError(raw);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const sendMagicLink = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('メールアドレスを入力してください');
      emailRef.current?.focus();
      return;
    }
    if (!/.+@.+\..+/.test(cleanEmail)) {
      setError('有効なメールアドレスを入力してください');
      emailRef.current?.focus();
      return;
    }
    setSendingMagic(true);
    setError('');
    setInfo('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/auth/callback?next=${encodeURIComponent(redirect)}`,
          shouldCreateUser: true,
        },
      });
      if (sbError) throw sbError;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'メール送信に失敗しました');
    } finally {
      setSendingMagic(false);
    }
  };

  const loginWithPasskey = async () => {
    setPasskeyBusy(true);
    setError('');
    setInfo('');
    try {
      const optRes = await fetch('/api/auth/passkey/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        throw new Error(d.error || 'パスキー認証オプション取得に失敗しました');
      }
      const options = await optRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch('/api/auth/passkey/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assertion }),
      });
      if (!verifyRes.ok) {
        const d = await verifyRes.json();
        throw new Error(d.error || 'パスキー認証に失敗しました');
      }
      const { redirect_url } = await verifyRes.json();
      window.location.href = redirect_url || redirect;
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') {
        setError('パスキー認証がキャンセルされました。');
      } else {
        setError(e instanceof Error ? e.message : 'パスキー認証に失敗しました');
      }
    } finally {
      setPasskeyBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-8 max-w-sm w-full">
        <h1 className="text-xl font-bold mb-2 text-center">管理画面ログイン</h1>
        <p className="text-xs text-muted text-center mb-6">{process.env.NEXT_PUBLIC_APP_NAME || '管理画面'}</p>

        {sent ? (
          <div className="text-center py-4">
            <h2 className="font-bold mb-3">メールを送信しました</h2>
            <p className="text-sm text-muted leading-relaxed">
              <strong className="break-all">{email.trim().toLowerCase()}</strong> 宛にログイン用のリンクを送信しました。
            </p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-left text-xs text-slate-700 leading-relaxed">
              <div className="font-bold mb-1">次にすること</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>メールボックスを開く（迷惑メールも確認）</li>
                <li>届いたメール内のリンクをクリック</li>
                <li>自動でログインされます</li>
              </ol>
            </div>
            <button
              onClick={() => { setSent(false); }}
              className="mt-5 text-sm text-primary hover:underline"
            >
              ログイン画面に戻る
            </button>
          </div>
        ) : (
          <>
            {info && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-slate-700 leading-relaxed">
                {info}
              </div>
            )}

            {/* 初回ログイン用 - 招待メール経由のユーザーが最初に目にする位置 */}
            <div ref={firstTimeRef} className="mb-6 p-4 border border-border rounded-md bg-slate-50">
              <h2 className="text-sm font-bold mb-1">初めてログインする / パスワードを忘れた方</h2>
              <p className="text-xs text-muted mb-3 leading-relaxed">
                メールアドレスを入力すると、ログイン用のリンクをメールでお送りします。クリックするだけでログインできます。
              </p>
              <label className="block text-xs font-medium mb-1">メールアドレス</label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-3"
              />
              <button
                onClick={sendMagicLink}
                disabled={sendingMagic}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50"
              >
                {sendingMagic ? '送信中…' : 'ログインリンクをメールで受け取る'}
              </button>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                ログイン後「設定」からパスワードやパスキーを登録すると、次回以降もっと簡単にログインできます。
              </p>
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">登録済みの方</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* パスキー */}
            <button
              onClick={loginWithPasskey}
              disabled={passkeyBusy}
              className="w-full px-4 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50"
            >
              {passkeyBusy ? '認証中…' : 'パスキーでログイン'}
            </button>
            <p className="text-xs text-muted text-center mt-2 mb-4">
              Touch ID / Face ID / セキュリティキー
            </p>

            {/* パスワード */}
            <details className="mt-3">
              <summary className="text-xs text-muted hover:text-foreground cursor-pointer text-center">
                パスワードでログイン
              </summary>
              <div className="mt-3">
                <label className="block text-xs font-medium mb-1">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && signInWithPassword()}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-3"
                />
                <button
                  onClick={signInWithPassword}
                  disabled={signingIn || !email || !password}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50"
                >
                  {signingIn ? 'ログイン中…' : '上記のメールアドレスとパスワードでログイン'}
                </button>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  上記の「メールアドレス」欄に入力したアドレスとパスワードでログインします。
                </p>
              </div>
            </details>

            {error && (
              <p className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs leading-relaxed">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
