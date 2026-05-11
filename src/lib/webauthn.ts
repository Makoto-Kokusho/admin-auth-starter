// WebAuthn共通ユーティリティ
// - RP ID はリクエストhostから抽出
// - RP Name は環境変数 NEXT_PUBLIC_APP_NAME から取得（パスキー登録ダイアログに表示される名前）

export function getRpConfig(origin: string) {
  const url = new URL(origin);
  const rpID = url.hostname;
  const rpName = process.env.NEXT_PUBLIC_APP_NAME || '管理画面';
  return { rpID, rpName, origin };
}

// Base64URL <-> Uint8Array ヘルパ
export function b64urlToBuffer(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function bufferToB64url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5分

// Supabase BYTEA は `\xDEADBEEF...` 形式の hex 文字列で返ってくるため、Uint8Array に復元する
export function byteaToUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'string') {
    const hex = value.startsWith('\\x') ? value.slice(2) : value;
    const buf = Buffer.from(hex, 'hex');
    const out = new Uint8Array(buf.byteLength);
    out.set(buf);
    return out;
  }
  // ArrayBuffer or Buffer
  if (value && typeof value === 'object' && 'length' in value) {
    const src = value as ArrayLike<number>;
    const out = new Uint8Array(src.length);
    for (let i = 0; i < src.length; i++) out[i] = src[i];
    return out;
  }
  throw new Error(`Unsupported bytea format: ${typeof value}`);
}
