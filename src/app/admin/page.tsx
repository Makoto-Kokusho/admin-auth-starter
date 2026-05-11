'use client';

import { useEffect, useState } from 'react';

interface Me {
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member';
  is_owner: boolean;
}

export default function AdminDashboard() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch('/api/auth/whoami')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setMe(d); })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="bg-card border border-border rounded-md p-6 max-w-2xl">
        <h1 className="text-xl font-bold mb-2">管理画面</h1>
        <p className="text-sm text-muted leading-relaxed">
          ログインに成功しました。このページを業務画面に書き換えてください
          （ファイル: <code className="text-xs">src/app/admin/page.tsx</code>）。
        </p>

        {me && (
          <div className="mt-6 p-4 border border-border rounded-md bg-slate-50 text-sm leading-relaxed">
            <div className="font-bold mb-2">ログイン中のあなた</div>
            <div className="text-xs text-muted">名前: <span className="text-foreground">{me.name || '(未設定)'}</span></div>
            <div className="text-xs text-muted">メール: <span className="text-foreground">{me.email}</span></div>
            <div className="text-xs text-muted">権限: <span className="text-foreground font-medium">{me.role}</span></div>
          </div>
        )}

        <div className="mt-6 p-4 border border-border rounded-md text-sm leading-relaxed">
          <div className="font-bold mb-2">このスターターに含まれている機能</div>
          <ul className="text-xs text-muted space-y-1 list-disc pl-5">
            <li>パスワード / マジックリンク / パスキー（WebAuthn）でのログイン</li>
            <li>メンバー招待（自動メール送信 + リンク再送ボタン）</li>
            <li>3段階権限（owner / admin / member）</li>
            <li>オーナーがメンバー画面で admin ⇄ member を切替可能</li>
            <li>ログイン後に各自で「設定」からパスワード・パスキー登録可能</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
