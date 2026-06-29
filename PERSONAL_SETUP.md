# 個人用クラウド設定

この手順は、自分のスマホでホーム画面アプリとして使うためのものです。
ホスティングはCloudflare Pages Free、ログインと同期はSupabase Freeを使います。

## 1. Supabase Freeプロジェクトを作る

1. Supabaseで新しいプロジェクトを作成します。
2. SQL Editorを開き、`supabase-schema.sql`を実行します。
3. Project Settings > APIを開きます。
4. Project URLとpublishable anon keyをコピーします。
5. Authentication > URL Configurationを開きます。
6. Site URLに使うURLを設定します。
   - ローカル試用: `http://localhost:4173`
   - Cloudflare Pages: `https://YOUR_PROJECT.pages.dev`
7. Redirect URLsにも同じURLを追加します。

個人用なら、まず自分のメールアドレスでログイン確認をします。動作確認後、他人が
アカウントを作れないようにしたい場合は、Supabase Authentication設定で新規登録を
オフにしてください。

## 2. アプリを設定する

`app-config.js`を編集します。

```js
window.APP_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "YOUR_PUBLISHABLE_ANON_KEY",
  supabaseStateTable: "user_states",
  supabaseRedirectUrl: "https://YOUR_PROJECT.pages.dev",
  ownerEmail: "you@example.com",
  cloudSyncEnabled: true,
  webAdsEnabled: false,
  nativeBannerAdsEnabled: false,
  nativeBannerAdsProvider: "admob",
  nativeRewardedVideoEnabled: false,
  nativeRewardedVideoProvider: "",
  nativePurchaseEnabled: false,
  freeAccountLimit: 3
};
```

publishable anon keyは静的アプリに入れて問題ありません。SupabaseのRow Level
Securityでユーザーごとのデータを保護します。service role keyは絶対にこの
リポジトリへ入れないでください。

## 3. ローカルで試す

このフォルダでローカルサーバーを起動します。

```sh
python3 -m http.server 4173
```

ブラウザで開きます。

```text
http://localhost:4173
```

設定 > メールリンクでログイン、から自分のメールアドレスへログインリンクを送り
ます。リンクを開いたあと、データを入力して「今すぐ同期」を押します。ページ更新
または別ブラウザで開き直し、同じデータが戻れば同期成功です。

## 4. Cloudflare Pagesへデプロイする

まず試すだけなら、手動アップロードが一番早いです。

1. Cloudflare dashboard > Workers & Pagesを開きます。
2. Create application > Pages > Upload assetsを選びます。
3. このプロジェクトフォルダをアップロードします。
4. Deployします。
5. `https://YOUR_PROJECT.pages.dev`のURLをコピーします。
6. SupabaseのSite URLとRedirect URLsをPages URLへ変更します。
7. `app-config.js`の`supabaseRedirectUrl`も同じPages URLへ変更します。
8. もう一度Cloudflare Pagesへアップロードします。

GitHub連携で自動デプロイする場合は次の設定です。

1. このGitHubリポジトリをCloudflare Pagesへ接続します。
2. Framework preset: None
3. Build command: 空欄
4. Build output directory: `/`
5. Deploy

## 5. スマホへ入れる

iPhone:

1. SafariでCloudflare Pages URLを開きます。
2. 共有ボタンをタップします。
3. 「ホーム画面に追加」をタップします。
4. ホーム画面からアプリを起動します。
5. 設定を開き、メールリンクでログインします。

Android:

1. ChromeでCloudflare Pages URLを開きます。
2. メニューをタップします。
3. 「ホーム画面に追加」または「アプリをインストール」をタップします。
4. ホーム画面から起動し、設定でログインします。

## メモ

- Supabase未設定でも、従来どおりローカル保存で動きます。
- 同期は「新しい方を採用」に近い簡易方式です。個人用では、同じタイミングで
  複数端末から同じデータを編集しない運用にしてください。
- Supabase Freeプロジェクトは非アクティブ状態が続くと一時停止することがあり
  ます。試用中はアプリかSupabaseダッシュボードを定期的に開いてください。
