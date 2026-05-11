import { createClient } from '@supabase/supabase-js';

// Server-side (service role key, RLSをbypass)
// 環境変数は呼び出し時にチェックする（ビルド時に未設定でもimport自体は通るようにするため）
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(url, serviceKey);
}
