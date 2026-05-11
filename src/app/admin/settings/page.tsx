'use client';

import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { createSupabaseBrowserClient } from '@/lib/supabase-auth-browser';

interface Passkey {
  id: string;
  device_name: string | null;
  last_used_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const setUserPassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (newPassword.length < 8) {
      setPwError('パスワードは8文字以上にしてください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('確認用パスワードが一致しません');
      return;
    }
    setPwBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: e } = await supabase.auth.updateUser({ password: newPassword });
      if (e) {
        setPwError(e.message);
        return;
      }
      setPwSuccess('✓ パスワードを設定しました。次回以降はメール＋パスワードでログインできます');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPwBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/passkey/list');
      if (res.ok) setPasskeys(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // デフォルトのデバイス名（OS + ブラウザ判定）
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      let name = 'このデバイス';
      if (/Macintosh/.test(ua)) name = 'Mac';
      else if (/iPhone/.test(ua)) name = 'iPhone';
      else if (/iPad/.test(ua)) name = 'iPad';
      else if (/Windows/.test(ua)) name = 'Windows PC';
      else if (/Android/.test(ua)) name = 'Android';
      if (/Safari/.test(ua) && !/Chrome/.test(ua)) name += ' / Safari';
      else if (/Chrome/.test(ua)) name += ' / Chrome';
      setDeviceName(name);
    }
  }, []);

  const registerPasskey = async () => {
    setRegistering(true);
    setError('');
    setSuccess('');
    try {
      const optRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        throw new Error(d.error || 'オプション取得失敗');
      }
      const options = await optRes.json();

      const attestation = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestation, deviceName }),
      });
      if (!verifyRes.ok) {
        const d = await verifyRes.json();
        throw new Error(d.error || '登録検証失敗');
      }

      setSuccess('✓ パスキーを登録しました');
      load();
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') {
        setError('パスキー登録がキャンセルされました。');
      } else {
        setError(e instanceof Error ? e.message : '登録に失敗しました');
      }
    } finally {
      setRegistering(false);
    }
  };

  const deletePasskey = async (id: string, name: string | null) => {
    if (!confirm(`「${name || '未命名のパスキー'}」を削除します。このデバイスからはパスキーでログインできなくなります。よろしいですか？`)) return;
    const res = await fetch(`/api/auth/passkey/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPasskeys(prev => prev.filter(p => p.id !== id));
    } else {
      const d = await res.json();
      alert(d.error || '削除に失敗しました');
    }
  };

  return (
    <div>
      <a href="/admin" className="text-sm text-primary hover:underline mb-4 inline-block">&larr; 管理画面に戻る</a>

      {/* パスワード設定 */}
      <div className="bg-card border border-border rounded-xl p-6 max-w-2xl mb-6">
        <h1 className="text-xl font-bold mb-2">🔑 パスワード設定</h1>
        <p className="text-sm text-muted mb-4">
          パスワードを設定すると、メール＋パスワードでかんたんにログインできます（マジックリンク不要）。
        </p>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-muted mb-1">新しいパスワード（8文字以上）</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">確認のためもう一度</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setUserPassword()}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            onClick={setUserPassword}
            disabled={pwBusy || !newPassword || !confirmPassword}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {pwBusy ? '保存中…' : 'パスワードを保存'}
          </button>
          {pwError && <p className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{pwError}</p>}
          {pwSuccess && <p className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">{pwSuccess}</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 max-w-2xl">
        <h1 className="text-xl font-bold mb-2">🔐 パスキー設定</h1>
        <p className="text-sm text-muted mb-6">
          パスキーを登録すると、Touch ID / Face ID / セキュリティキー でワンタップログインできます。デバイスごとに登録が必要です。
        </p>

        {/* 登録フォーム */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-bold mb-2">このデバイスでパスキーを登録</h2>
          <label className="block text-xs text-muted mb-1">デバイス名（任意・識別用）</label>
          <input
            type="text"
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            placeholder="例) Macbook / iPhone"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-3"
          />
          <button
            onClick={registerPasskey}
            disabled={registering}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {registering ? '登録中…' : '🔐 このデバイスでパスキーを登録'}
          </button>
          {error && <p className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</p>}
          {success && <p className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">{success}</p>}
        </div>

        {/* 登録済み一覧 */}
        <h2 className="text-sm font-bold mb-3">登録済みパスキー</h2>
        {loading ? (
          <div className="text-sm text-muted text-center py-6">読み込み中...</div>
        ) : passkeys.length === 0 ? (
          <div className="text-sm text-muted text-center py-6 border border-dashed border-border rounded-lg">
            まだパスキーが登録されていません
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <div className="text-sm font-medium">{p.device_name || '未命名'}</div>
                  <div className="text-xs text-muted">
                    登録: {new Date(p.created_at).toLocaleDateString('ja-JP')}
                    {p.last_used_at && <> / 最終利用: {new Date(p.last_used_at).toLocaleDateString('ja-JP')}</>}
                  </div>
                </div>
                <button
                  onClick={() => deletePasskey(p.id, p.device_name)}
                  className="text-xs text-red-600 hover:underline"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
