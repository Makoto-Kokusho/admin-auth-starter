import { getServiceSupabase } from './supabase';
import { createSupabaseServerClient } from './supabase-auth-server';

export type AdminRole = 'owner' | 'admin' | 'member';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  is_owner: boolean;
}

// ===== 権限ヘルパー =====
// プロジェクトに合わせて canApprove, canEdit などを追加してください。

// メンバー管理（招待・削除・権限変更）: owner のみ
export function canManageMembers(role: AdminRole | undefined | null): boolean {
  return role === 'owner';
}

// 業務上の重要操作（承認、削除など）の権限: owner + admin
// プロジェクト固有のチェックはこのファイルに追加するのを推奨
export function canPerformAdminActions(role: AdminRole | undefined | null): boolean {
  return role === 'owner' || role === 'admin';
}

const VALID_ROLES: AdminRole[] = ['owner', 'admin', 'member'];
export function isValidRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (VALID_ROLES as string[]).includes(value);
}

// role カラムが未設定の古い行のフォールバック（is_owner から導出）
function resolveRole(row: { role?: string | null; is_owner?: boolean | null }): AdminRole {
  if (isValidRole(row.role)) return row.role;
  return row.is_owner ? 'owner' : 'admin';
}

// Supabase Authセッションから現在のメールを取得し、admin_users許可リストに含まれているか確認
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const service = getServiceSupabase();
  const { data } = await service
    .from('admin_users')
    .select('id, email, name, is_owner, role')
    .eq('email', user.email.toLowerCase())
    .single();

  if (!data) return null;
  const role = resolveRole(data);
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role,
    is_owner: role === 'owner',
  };
}

// 指定emailが許可リストに含まれているか
export async function isAllowedEmail(email: string): Promise<boolean> {
  if (!email) return false;
  const service = getServiceSupabase();
  const { data } = await service
    .from('admin_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return !!data;
}
