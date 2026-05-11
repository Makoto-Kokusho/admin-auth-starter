# /add-auth — ログイン認証 + メンバー管理の統合

このプロジェクトに、汎用テンプレ admin-auth-starter (https://github.com/Makoto-Kokusho/admin-auth-starter) のログイン・メンバー管理機能を統合する。

含まれている機能:
- パスキー / パスワード / マジックリンクでのログイン
- メンバー招待（自動メール + リンク再送ボタン）
- 3段階権限（owner / admin / member）と切替UI
- 各自のパスキー・パスワード設定画面
- middleware による認証ゲート

## あなた（Claude）がやること

### 1. テンプレートを取得

```bash
git clone https://github.com/Makoto-Kokusho/admin-auth-starter.git /tmp/admin-auth-starter
```

既に `/tmp/admin-auth-starter` がある場合は最新化:

```bash
cd /tmp/admin-auth-starter && git pull
```

### 2. テンプレの指示書を読む

- `/tmp/admin-auth-starter/CLAUDE.md`（プロジェクトの取扱説明）
- `/tmp/admin-auth-starter/.claude/commands/setup.md`（セットアップ手順）

### 3. 現在のプロジェクトの状況を確認

以下をチェックし、衝突しそうな箇所をユーザーに報告:

- `package.json` の dependencies に `@supabase/*` や `@simplewebauthn/*` が既にあるか
- `src/middleware.ts` が既にあるか
- `src/app/admin/` が既にあるか
- `src/app/api/auth/` が既にあるか
- `supabase/migrations/` の既存ファイル番号

衝突があれば「○○を上書きすると××が壊れる可能性がある」と平易に説明し、進めていいかユーザーに必ず確認する。

### 4. ファイルの統合（衝突なし、または承認された場合）

以下を `/tmp/admin-auth-starter/` から現在プロジェクトにコピー:

- `src/lib/admin-auth.ts`, `supabase.ts`, `supabase-auth.ts`, `supabase-auth-server.ts`, `supabase-auth-browser.ts`, `webauthn.ts`
- `src/middleware.ts`（既存があれば統合 or 置換、ユーザーに確認）
- `src/app/admin/layout.tsx`, `login/`, `members/`, `settings/`, `auth/callback/`
- `src/app/api/auth/` 配下すべて
- `supabase/migrations/001_admin_auth.sql`（既存マイグレーション番号と被らないよう必要に応じて番号調整）

`package.json` の依存パッケージを追加（既存にないもののみ）:

- `@simplewebauthn/browser`, `@simplewebauthn/server`
- `@supabase/ssr`, `@supabase/supabase-js`

`npm install` を実行して反映。

CLAUDE.md がプロジェクトにあれば、テンプレの CLAUDE.md から「触ってはいけないファイル」セクションをマージ提案する。なければ新規作成して内容を統合。

### 5. setup.md の手順実行

テンプレの `/tmp/admin-auth-starter/.claude/commands/setup.md` の手順:

- Supabase 接続情報の対話的収集（URL / anon key / service_role key / 表示名）
- `.env.local` 生成
- オーナー登録 SQL の生成と提示
- Supabase Auth Redirect URL 設定の案内
- `npm run dev` 起動の案内

を順番に進める。

## ユーザーの特性

- 非エンジニア。専門用語には素人にわかる平易な補足を併記
- ファイル上書きは必ず事前に確認（勝手にやらない）
- 一度に大量の質問はせず、1問ずつ
- エラーが出たら、原因を切り分けて平易に伝える

## 想定するユーザーの呼び方

ユーザーが「ログイン機能を追加して」「認証つけたい」「メンバー管理いれたい」と言ったら、このコマンドの内容を実行する。
