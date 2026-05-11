import { redirect } from 'next/navigation';

// トップアクセスは管理画面へ。
// 公開ページ（ランディング・フォーム等）を追加する場合はこのファイルを書き換えてください。
export default function Home() {
  redirect('/admin');
}
