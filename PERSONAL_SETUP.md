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

### メールOTPを有効にする

1. Authentication > SMTP SettingsでカスタムSMTPを有効にします。
2. Authentication > Email Templates > Magic Linkを開きます。
3. 件名を `引落メモ ログイン認証コード` に変更します。
4. 本文を次の内容に変更します。`{{ .ConfirmationURL }}` は含めません。

```html
<h2>引落メモ ログイン認証コード</h2>
<p>次の6桁コードを引落メモのアプリに入力してください。</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 0.25em;">{{ .Token }}</p>
<p>このコードは10分間有効です。第三者には教えないでください。</p>
<p>心当たりがない場合は、このメールを破棄してください。</p>
```

5. Authentication > Sign In / Providers > EmailでEmail OTP expirationを
   `600`秒に設定します。
6. Authentication > Rate LimitsでOTPの再送間隔を`60`秒に設定します。

2026年6月3日以降に作成したSupabase Freeプロジェクトでは、標準SMTPのままでは
認証メールテンプレートを変更できません。先にSMTP対応のメールサービスを設定し、
SMTPパスワードはリポジトリや`app-config.js`へ絶対に保存しないでください。

個人用なら、まず自分のメールアドレスでログイン確認をします。複数のメール
アドレスでそれぞれ別データを持たせたい場合は、Supabase Authentication設定で
新規登録を有効にしておきます。全員が同じデータを共有する機能は別設計です。

## 2. アプリを設定する

`app-config.js`を編集します。

```js
window.APP_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "YOUR_PUBLISHABLE_ANON_KEY",
  supabaseStateTable: "user_states",
  supabaseRedirectUrl: "https://YOUR_PROJECT.pages.dev",
  cloudSyncEnabled: true,
  webAdsEnabled: false,
  webAdsProvider: "adsense",
  adsensePublisherId: "",
  adsenseBannerSlotId: "",
  adsenseNonPersonalizedAds: true,
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
リポジトリへ入れないでください。メールアドレスは公開設定に入れず、各ユーザーが
ログイン時に自分で入力します。

AdSenseを使う場合は、`ADSENSE_SETUP.md`の手順で審査と広告ユニット作成を
済ませてから、`webAdsEnabled`を`true`にし、`adsensePublisherId`と
`adsenseBannerSlotId`を入力します。IDが空の間やローカル実行中は広告リクエスト
を出さないため、申請前の開発でも安全に使えます。

## 3. ローカルで試す

このフォルダでローカルサーバーを起動します。

```sh
python3 -m http.server 4173
```

ブラウザで開きます。

```text
http://localhost:4173
```

設定から自分のメールアドレスへ6桁の認証コードを送ります。メールに届いた最新の
コードを同じアプリ内で入力し、「コードでログイン」を押します。データを入力して
「今すぐ同期」を押し、ページ更新または別ブラウザで開き直して同じデータが戻れば
同期成功です。認証コードやSMTPパスワードを画面共有やログへ残さないでください。

別のメールアドレスでログインした場合、そのユーザー専用の保存領域に切り替わり
ます。同じ端末でメールを切り替えても、別ユーザーのデータは自動では混ざりません。

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
5. 設定を開き、メールに届く6桁の認証コードでログインします。

Android:

1. ChromeでCloudflare Pages URLを開きます。
2. メニューをタップします。
3. 「ホーム画面に追加」または「アプリをインストール」をタップします。
4. ホーム画面から起動し、設定で6桁の認証コードを使ってログインします。

## メモ

- Supabase未設定でも、従来どおりローカル保存で動きます。
- 同期は「新しい方を採用」に近い簡易方式です。個人用では、同じタイミングで
  複数端末から同じデータを編集しない運用にしてください。
- Supabase Freeプロジェクトは非アクティブ状態が続くと一時停止することがあり
  ます。試用中はアプリかSupabaseダッシュボードを定期的に開いてください。
