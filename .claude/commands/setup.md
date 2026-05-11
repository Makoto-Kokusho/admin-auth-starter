---
description: admin-auth-starter から新規プロジェクトの初期セットアップを対話形式で実行
---

# /setup — 新規プロジェクトのセットアップウィザード

ユーザーは admin-auth-starter から新しいプロジェクトを始めたばかり。
このコマンドで、ログインが実際に動く状態まで一気に整える。

## あなた（Claude）が順番にやること

### 0. 状況確認

- `package.json` の `name` を読み、まだ `admin-auth-starter` のままなら、新しいプロジェクト名を聞いて書き換える（任意。スキップ可）
- `node_modules/` の有無を確認
- `.env.local` の有無を確認

### 1. 依存インストール（`node_modules/` がなければ）

```
npm install
```

### 2. Supabase 接続情報の収集

ユーザーに以下を順に質問する（一度に全部聞かず、1つずつ）:

1. **Supabase は既に作成済みか？**
   - まだなら: 「https://app.supabase.com/projects で『New project』を押して作ってください。リージョンは Asia (Tokyo) が速いです。完了したら『できた』と言ってください」
2. **Project URL**（Supabase: Project Settings → API → `Project URL`）
   - 例: `https://abcdefghijk.supabase.co`
3. **anon public key**（同画面の `anon` 行）
   - 「公開してもOKなキー」と補足する
4. **service_role secret key**（同画面の `service_role` 行）
   - 「これは秘密キー。絶対に外部に出さないでください」と強く補足する
5. **このシステムの表示名**（例: `請求書管理`, `勤怠システム`）
   - パスキー登録のダイアログとブラウザタブに出る

### 3. `.env.local` の書き出し

収集した値で `.env.local` を作成（既存ファイルがある場合は上書き前に確認）:

```
NEXT_PUBLIC_SUPABASE_URL=<上記2>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<上記3>
SUPABASE_SERVICE_ROLE_KEY=<上記4>
NEXT_PUBLIC_APP_NAME=<上記5>
```

書いた後、「`.env.local` は git にコミットされません（`.gitignore` で除外済み）」と一言伝える。

### 4. オーナー登録情報の収集

ユーザーに質問:

1. **オーナーになるメールアドレス**（あなた自身のメール）
2. **オーナーの名前**（任意。スキップ可）

### 5. 統合 SQL の生成と提示

`supabase/migrations/001_admin_auth.sql` の内容に、収集したオーナー情報の INSERT 文を追記した「貼り付け用 SQL」を作って、コードブロックで提示する。

例:

```sql
-- ↓これを Supabase ダッシュボードの SQL Editor で実行してください

-- (001_admin_auth.sql の中身をそのまま展開)

-- オーナー登録
INSERT INTO admin_users (email, name, is_owner, role)
VALUES ('<上記オーナーのメール>', '<上記オーナーの名前>', true, 'owner');
```

提示後、ユーザーへ以下を案内:

1. Supabase ダッシュボード → 左メニュー **SQL Editor**
2. 「New query」を押す
3. 上の SQL を貼り付けて右下の **Run** をクリック
4. 「Success」が出れば完了
5. 完了したら「実行した」と教えてもらう

### 6. Supabase Auth の Redirect URL 設定を案内

ユーザーへ以下を案内（手動作業が必要）:

1. Supabase ダッシュボード → **Authentication → URL Configuration**
2. **Site URL** に本番URL（まだなければローカル: `http://localhost:3000`）を設定
3. **Redirect URLs** に以下を追加:
   - `http://localhost:3000/admin/auth/callback`
   - 本番URLが決まったら `<本番URL>/admin/auth/callback` も追加

### 7. ローカル起動の案内

```
npm run dev
```

その後、ブラウザで http://localhost:3000 を開き、`/admin/login` に飛ばされたら、オーナー登録したメールアドレスを入力して「ログインリンクをメールで受け取る」をクリック → 届いたメールのリンクで入れることを確認するよう案内する。

### 8. デプロイの案内（任意）

「本番にデプロイしますか？ Vercel が一番簡単です」と聞き、yes なら:

1. `npx vercel` を実行
2. その後、Vercel ダッシュボードで `.env.local` の中身を環境変数として登録
3. 再度 `npx vercel --prod` でデプロイ

## トーン

- ユーザーは非エンジニア。各ステップで「何を達成するための作業か」を1行で先に書く
- 「Supabase」「マイグレーション」「環境変数」など専門用語には初出時に補足を入れる
- 一度に大量に質問せず、1問ずつ進める
- エラーが出たら、まず原因の切り分け（環境変数？SQL未実行？）から始める
