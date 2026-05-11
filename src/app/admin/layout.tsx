'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const isLoginPage = pathname?.startsWith('/admin/login');

  useEffect(() => {
    if (isLoginPage) return;
    fetch('/api/auth/whoami')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) {
          setEmail(d.email);
          setIsOwner(!!d.is_owner);
        }
      })
      .catch(() => {});
  }, [isLoginPage]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <a href="/admin" className="font-bold text-lg">{process.env.NEXT_PUBLIC_APP_NAME || '管理画面'}</a>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-xs text-muted hidden sm:inline">{email}</span>}
          {isOwner && (
            <a href="/admin/members" className="text-xs text-muted hover:text-foreground transition-colors" title="メンバー管理">
              👥 メンバー
            </a>
          )}
          <a href="/admin/settings" className="text-xs text-muted hover:text-foreground transition-colors" title="パスキー設定">
            🔐 設定
          </a>
          <button onClick={logout} className="text-xs text-muted hover:text-foreground transition-colors">
            ログアウト
          </button>
        </div>
      </header>
      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}
