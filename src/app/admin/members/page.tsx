'use client';

import { useState, useEffect } from 'react';

type Role = 'owner' | 'admin' | 'member';

interface Member {
  id: string;
  email: string;
  name: string | null;
  is_owner: boolean;
  role: Role;
  created_at: string;
}

const ROLE_LABEL: Record<Role, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
};

const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: '全ての権限（メンバー管理を含む）',
  admin: '業務上の重要操作が可能（編集・承認など）',
  member: '閲覧のみ（重要操作の権限なし）',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/members');
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!email) return;
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || '追加に失敗しました');
        return;
      }
      if (d.invited) {
        setSuccess(`✓ ${email} を追加し、招待メールを送信しました（権限: メンバー）`);
      } else if (d.inviteError) {
        setSuccess(`✓ ${email} を追加しました（招待メール送信失敗: ${d.inviteError}。手動でURLを共有してください）`);
      } else {
        setSuccess(`✓ ${email} を追加しました`);
      }
      setEmail('');
      setName('');
      load();
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditName(m.name || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/auth/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || '更新に失敗しました');
      return;
    }
    const updated = await res.json();
    setMembers(prev => prev.map(m => (m.id === id ? { ...m, name: updated.name } : m)));
    cancelEdit();
  };

  const remove = async (m: Member) => {
    if (!confirm(`${m.email} さんをメンバーから削除します。よろしいですか？\n\n※このメンバーは管理画面にアクセスできなくなります。`)) return;
    const res = await fetch(`/api/auth/members/${m.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || '削除に失敗しました');
      return;
    }
    setMembers(prev => prev.filter(x => x.id !== m.id));
  };

  const resendInvite = async (m: Member) => {
    if (!confirm(`${m.email} さんへログインリンクを再送します。よろしいですか？`)) return;
    setResendingId(m.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/auth/members/${m.id}/resend-invite`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || '送信に失敗しました');
        return;
      }
      setSuccess(`${m.email} へログインリンクを再送しました`);
    } finally {
      setResendingId(null);
    }
  };

  const changeRole = async (m: Member, newRole: 'admin' | 'member') => {
    if (m.role === newRole) return;
    const promote = newRole === 'admin';
    const msg = promote
      ? `${m.name || m.email} さんを「管理者」に変更します。\n\n業務上の重要操作（編集・承認など）ができるようになります。よろしいですか？`
      : `${m.name || m.email} さんを「メンバー」に変更します。\n\n閲覧のみとなり、重要操作の権限はなくなります。よろしいですか？`;
    if (!confirm(msg)) return;

    setUpdatingRoleId(m.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/auth/members/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || '権限の変更に失敗しました');
        return;
      }
      setMembers(prev => prev.map(x => (x.id === m.id ? { ...x, role: newRole } : x)));
      setSuccess(`${m.email} の権限を「${ROLE_LABEL[newRole]}」に変更しました`);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  if (forbidden) {
    return (
      <div>
        <a href="/admin" className="text-sm text-primary hover:underline mb-4 inline-block">&larr; 管理画面に戻る</a>
        <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-2xl">
          <div className="font-bold text-red-700 mb-2">アクセス権限がありません</div>
          <p className="text-sm text-red-700">メンバー管理はオーナーのみ実行可能です。</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <a href="/admin" className="text-sm text-primary hover:underline mb-4 inline-block">&larr; 管理画面に戻る</a>

      <div className="bg-card border border-border rounded-md p-6 max-w-2xl">
        <h1 className="text-xl font-bold mb-2">メンバー管理</h1>
        <p className="text-sm text-muted mb-3">
          管理画面にアクセスできるメンバーを管理します。追加したメンバーへは自動でログインリンク付きの招待メールが送信されます。
        </p>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          リンクの有効期限が切れた / メールが届かない等で初回ログインに詰まったメンバーには、一覧の「ログインリンク再送」ボタンから新しいリンクを送り直せます。
        </p>

        {/* 権限の説明 */}
        <div className="mb-6 p-3 border border-border rounded-md bg-slate-50 text-xs text-slate-700 leading-relaxed">
          <div className="font-bold mb-1">権限の種類</div>
          <ul className="space-y-0.5">
            <li><span className="font-medium">オーナー</span>: {ROLE_DESCRIPTION.owner}</li>
            <li><span className="font-medium">管理者</span>: {ROLE_DESCRIPTION.admin}</li>
            <li><span className="font-medium">メンバー</span>: {ROLE_DESCRIPTION.member}</li>
          </ul>
        </div>

        {/* 追加フォーム */}
        <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
          <h2 className="text-sm font-bold mb-3">メンバーを追加</h2>
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="名前（任意）"
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              onClick={add}
              disabled={adding || !email}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50"
            >
              {adding ? '追加中…' : '+ メンバーを追加して招待メール送信'}
            </button>
            <p className="text-xs text-muted leading-relaxed">
              新規メンバーは「メンバー」権限（閲覧のみ）で追加されます。重要操作の権限を持たせたい場合は、追加後に下の一覧から「管理者」に変更してください。
            </p>
          </div>
          {error && <p className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</p>}
          {success && <p className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">{success}</p>}
        </div>

        {/* 一覧 */}
        <h2 className="text-sm font-bold mb-3">登録済みメンバー（{members.length}人）</h2>
        {loading ? (
          <div className="text-sm text-muted text-center py-6">読み込み中...</div>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const isEditing = editingId === m.id;
              const isOwner = m.role === 'owner' || m.is_owner;
              return (
                <div key={m.id} className="p-3 border border-border rounded-md">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(m.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                            className="flex-1 min-w-[160px] px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                          <button onClick={() => saveEdit(m.id)} className="text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded px-2 py-1">
                            保存
                          </button>
                          <button onClick={cancelEdit} className="text-xs text-muted hover:underline">
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{m.name || <span className="text-muted italic">名前未設定</span>}</span>
                            <span className="text-xs text-muted">[{ROLE_LABEL[m.role]}]</span>
                            <button
                              onClick={() => startEdit(m)}
                              className="text-xs text-primary hover:underline"
                              title="名前を編集"
                            >
                              名前を編集
                            </button>
                          </div>
                          <div className="text-xs text-muted">{m.email}</div>
                          <div className="text-xs text-muted">追加: {new Date(m.created_at).toLocaleDateString('ja-JP')}</div>
                        </>
                      )}
                    </div>

                    {!isOwner && !isEditing && (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => resendInvite(m)}
                          disabled={resendingId === m.id}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                          title="このメンバーへログインリンクをメールで再送します"
                        >
                          {resendingId === m.id ? '送信中…' : 'ログインリンク再送'}
                        </button>
                        <button
                          onClick={() => remove(m)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 権限切替（オーナー以外、編集中以外） */}
                  {!isOwner && !isEditing && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted">権限:</span>
                      <div className="inline-flex border border-border rounded-md overflow-hidden">
                        <button
                          onClick={() => changeRole(m, 'admin')}
                          disabled={updatingRoleId === m.id || m.role === 'admin'}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            m.role === 'admin'
                              ? 'bg-primary text-white'
                              : 'bg-white text-muted hover:bg-gray-50'
                          } disabled:opacity-100 disabled:cursor-default`}
                        >
                          管理者
                        </button>
                        <button
                          onClick={() => changeRole(m, 'member')}
                          disabled={updatingRoleId === m.id || m.role === 'member'}
                          className={`px-3 py-1 text-xs font-medium transition-colors border-l border-border ${
                            m.role === 'member'
                              ? 'bg-primary text-white'
                              : 'bg-white text-muted hover:bg-gray-50'
                          } disabled:opacity-100 disabled:cursor-default`}
                        >
                          メンバー
                        </button>
                      </div>
                      <span className="text-xs text-muted">
                        {ROLE_DESCRIPTION[m.role]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
