# このプロジェクトについて（Claude 向け指示）

このプロジェクトは [admin-auth-starter](https://github.com/Makoto-Kokusho/admin-auth-starter) というテンプレートから生成された **業務システムの土台**。
ログイン・メンバー管理・権限ロール（owner/admin/member）の仕組みだけが入っており、業務ロジック（フォーム・データモデル・処理ロジック）はまだ実装されていない。

## ユーザーについて

- 非エンジニア。専門用語を使うときは必ず素人にも分かる平易な補足を併記する
  - 例: 「デプロイ (= インターネット上にアプリを置いて誰でも見られるようにすること)」
- 「〜してください」と作業依頼するときは、その作業が **何を達成するか** を先に1行で書く
- 「わからない」と言われたら、専門用語を疑って言い換える（そのまま詳しく説明しても通じない）

## 触ってはいけないファイル / 変更時は要確認

以下は認証の根幹なので、ユーザーから明示的に依頼がない限り変更しないこと:

- `src/lib/admin-auth.ts` の `getCurrentAdmin` / `isAllowedEmail`
- `src/lib/supabase-auth*.ts`
- `src/lib/webauthn.ts`
- `src/middleware.ts` の認証チェック部分
- `src/app/api/auth/` 以下の全API
- `supabase/migrations/001_admin_auth.sql`（既に実行済みの場合、変更が必要なら追加マイグレーションファイルで対応）

## 業務ロジックを書くときに編集する想定のファイル

- `src/app/page.tsx`: トップページ。現在は `/admin` にリダイレクト。一般公開フォームを置くならここを書き換え
- `src/app/admin/page.tsx`: 管理画面ダッシュボード。プレースホルダー実装なので業務一覧などに置き換え
- `src/lib/admin-auth.ts` の権限ヘルパー（`canManageMembers` 等）に、プロジェクト固有の権限関数を追加してよい
- `src/types/index.ts`: 業務ドメインの型を追加
- `supabase/migrations/`: `002_*.sql` 以降で業務テーブルを追加

## セットアップ手順

ユーザーが「セットアップ」「初期設定」「環境構築」を求めたら、`.claude/commands/setup.md` の手順に従って実行する。
ユーザーが `/setup` スラッシュコマンドを打った場合も同じファイルが呼ばれる。

## 使用フレームワーク

- **Next.js 16**（破壊的変更があるため `node_modules/next/dist/docs/` を参照してから書くこと）
- **React 19**
- **TailwindCSS v4**
- **Supabase**（Auth + Postgres）
- **@simplewebauthn/server / browser**（パスキー）

## UIデザインの好み

ユーザーが嫌う「AIっぽい」装飾を避ける:

- 過度なシャドウ（`shadow-md` `shadow-lg`）禁止。`shadow-sm` も避けたほうがよい
- 無意味なグラデーション（`bg-gradient-to-*`）禁止
- 角丸は `rounded-md` まで。`rounded-xl` `rounded-2xl` 禁止
- 絵文字の装飾は明示的依頼があった場合のみ
- カード/ボックスの左に色付き縦ライン（`border-l-4 border-*-500`）禁止
- カラフルなバッジ・ステータスピルの乱用禁止（意味のあるステータス表示は OK）

## Google APIs を使うとき

サーバーサイドで Google 系 API を叩く場合、ユーザーの共通サービスアカウント `claude-ga4-reader@payment-calculation-assistant.iam.gserviceaccount.com` を再利用する。詳細は `~/.claude/google_apis_setup.md` を参照。
