# admin-auth-starter

社内ツール向けの **管理画面の土台** だけが入った Next.js プロジェクト。
新しい業務システムを作るときの出発点として使う。

## どのプロジェクトからでも `/add-auth` で組み込めるスキルを入れる（推奨）

このリポジトリには `share/add-auth.md` という Claude Code 用のグローバルスキルが含まれている。
これを `~/.claude/commands/` に置けば、別のプロジェクトでも `/add-auth` と打つだけで認証機能を組み込める。

インストール（1回だけ）:

```bash
mkdir -p ~/.claude/commands && \
  curl -sL https://raw.githubusercontent.com/Makoto-Kokusho/admin-auth-starter/main/share/add-auth.md \
  -o ~/.claude/commands/add-auth.md
```

使い方: 認証を追加したいプロジェクトのフォルダで Claude Code を起動し、`/add-auth` を実行。

## 入っているもの

- **ログイン画面** （パスキー / パスワード / メール magic link）
  - 招待リンクが切れたとき向けの再送ボタン込み
- **メンバー管理** （オーナーが招待・権限変更・削除）
- **権限ロール3段階**: `owner` / `admin` / `member`
- **設定画面**: 各自がパスワード・パスキーを登録できる
- **ミドルウェアでの認証ゲート**

業務ロジック（フォーム・スコアリング・通知など）は入っていない。
あなたが追加する。

---

## はじめての立ち上げ手順

### おすすめ: Claude Code に丸投げする

このテンプレートには `CLAUDE.md` と `/setup` スラッシュコマンドが含まれているので、
clone した直後に Claude Code を開いて以下を打つだけで対話的にセットアップできる:

```
/setup
```

Supabase 接続情報・オーナーのメールアドレスなどを順に聞かれて、
最後に Supabase で実行すべき SQL までまとめて生成してくれる。

---

### 手動でやる場合

### 1. このテンプレートから新しいリポジトリを作る

GitHub 上でこのリポジトリの「Use this template」ボタンを押す。
（または `gh repo create` でテンプレート指定）

### 2. ローカルに clone して依存をインストール

```bash
git clone <あなたが作った新しいリポジトリのURL>
cd <そのフォルダ>
npm install
```

### 3. Supabase プロジェクトを用意

1. https://app.supabase.com で新規プロジェクトを作る
2. **Project Settings → API** から下記をメモ:
   - Project URL
   - anon (public) key
   - service_role (secret) key

### 4. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を開いて以下を埋める:

```
NEXT_PUBLIC_SUPABASE_URL=...        # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # anon key
SUPABASE_SERVICE_ROLE_KEY=...       # service_role key
NEXT_PUBLIC_APP_NAME=請求書管理     # このシステムの表示名（タブ・パスキー登録ダイアログ）
```

### 5. DB マイグレーションを実行

Supabase ダッシュボード → **SQL Editor** で
`supabase/migrations/001_admin_auth.sql` の中身を貼り付けて実行。

その後、SQL の最後にコメントアウトされている INSERT 文（オーナー登録）の
コメントを外し、自分のメールアドレスに書き換えて実行。

```sql
INSERT INTO admin_users (email, name, is_owner, role)
VALUES ('あなたのメール@example.com', 'あなたの名前', true, 'owner');
```

### 6. メール送信の設定（Supabase Auth）

Supabase ダッシュボード → **Authentication → URL Configuration** で:

- **Site URL** を本番URL（例 `https://yoursite.vercel.app`）に設定
- **Redirect URLs** に下記を追加:
  - `https://yoursite.vercel.app/admin/auth/callback`
  - `http://localhost:3000/admin/auth/callback`（ローカル開発用）

開発初期は Supabase のデフォルトメールでOK。
将来は **Authentication → Email Templates** をカスタマイズしたり、
SMTPプロバイダ（Resend など）と連携してメール送信を本格化する。

### 7. ローカルで起動

```bash
npm run dev
```

http://localhost:3000 を開く → `/admin/login` にリダイレクトされる →
オーナー登録したメールアドレスでログイン（マジックリンク）→
動けば成功。

### 8. デプロイ（Vercel 例）

```bash
vercel
```

その後、Vercel ダッシュボードで `.env.local` の中身を環境変数として登録。

---

## 業務ロジックの追加方法

このテンプレートは以下のファイルが「あなたが書き換える前提」になっている:

| ファイル | 何をする |
|---|---|
| `src/app/page.tsx` | トップページ（現在は /admin にリダイレクト）。一般公開フォームを置くならここ |
| `src/app/admin/page.tsx` | 管理画面ダッシュボード。業務ロジック（一覧・統計など）を書く |
| `src/middleware.ts` | プロジェクト固有のAPIを保護対象に追加（コメント参照） |
| `src/lib/admin-auth.ts` | プロジェクト固有の権限チェック関数を追加（`canApprove` など） |
| `src/types/index.ts` | プロジェクト共通の型を追加 |
| `supabase/migrations/` | 業務テーブル用のSQLを `002_*.sql` 以降で追加 |

---

## ファイル構成

```
src/
├── app/
│   ├── layout.tsx              ルートレイアウト
│   ├── page.tsx                / → /admin にリダイレクト
│   ├── globals.css             共通スタイル
│   ├── icon.svg                ファビコン（編集自由）
│   ├── admin/
│   │   ├── layout.tsx          管理画面共通ヘッダー
│   │   ├── page.tsx            管理画面トップ（要書き換え）
│   │   ├── login/page.tsx      ログイン画面
│   │   ├── members/page.tsx    メンバー管理画面
│   │   ├── settings/page.tsx   パスキー・パスワード設定
│   │   └── auth/callback/      マジックリンクのコールバック
│   └── api/auth/               認証API（パスキー、メンバー管理、whoami等）
├── lib/
│   ├── admin-auth.ts           ロール定義 + 権限ヘルパー
│   ├── supabase.ts             Supabase クライアント
│   ├── supabase-auth*.ts       SSR/ブラウザ/ミドルウェア用
│   └── webauthn.ts             パスキー用ヘルパー
├── middleware.ts               認証ゲート
└── types/index.ts              プロジェクト共通の型

supabase/migrations/
└── 001_admin_auth.sql          認証テーブル一式
```

---

## 想定する権限の使い分け

| 権限 | できること |
|---|---|
| **owner** | 全部。メンバー追加・削除・権限変更も可能 |
| **admin** | 業務上の重要操作（編集・承認など）が可能 |
| **member** | 閲覧のみ（編集・承認は不可） |

新規招待時のデフォルトは **member**。
オーナーが必要に応じて admin に昇格させる運用。
オーナーの権限は UI から変更不可（SQL で直接変えることは可能）。

---

## ライセンス

社内利用想定。
