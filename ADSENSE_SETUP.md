# Google AdSense setup

このアプリでWeb広告を出すための初回申請手順です。AdSenseのPublisher IDと広告
ユニットのSlot IDを取得するまでは、アプリは広告リクエストを出しません。

## 1. 申請前に公開URLを決める

AdSense審査では、Googleがブラウザから確認できる本番URLが必要です。ローカルの
`http://localhost:4173`ではなく、Cloudflare Pagesや独自ドメインのURLを使います。

Cloudflare Pagesで公開する場合は、リポジトリ直下のファイルがそのまま配信される
構成にしておくと、後で`https://YOUR_DOMAIN/ads.txt`を公開しやすくなります。

## 2. AdSenseに登録する

1. https://adsense.google.com/ を開き、Googleアカウントで登録します。
2. AdSenseの「サイト」に本番URLを追加します。
3. トップページがログインなしで表示できることを確認します。
4. パスワード保護、クロール拒否、未公開ページだけのサイトは避けます。

## 3. 広告ユニットを作る

1. AdSenseの「広告」を開きます。
2. ディスプレイ広告ユニットを作成します。
3. コード内の`ca-pub-...`をPublisher IDとして控えます。
4. コード内の`data-ad-slot="..."`の値をSlot IDとして控えます。

このアプリでは下部のレスポンシブバナー枠に表示します。自分で広告をクリック
したり、クリックを促す文言を置いたりしないでください。

## 4. アプリ設定にIDを入れる

`app-config.js`を編集します。

```js
webAdsEnabled: true,
webAdsProvider: "adsense",
adsensePublisherId: "ca-pub-XXXXXXXXXXXXXXXX",
adsenseBannerSlotId: "1234567890",
adsenseNonPersonalizedAds: true,
```

初期値は非パーソナライズ広告です。EEA、UK、Switzerland向けにパーソナライズ広告
を配信する場合は、Google認定CMPとIAB TCF対応を用意してから設定を見直します。

## 5. ads.txtを公開する

1. AdSense管理画面の`ads.txt`案内を開きます。
2. 表示された1行をそのまま控えます。
3. `ads.txt.example`を参考に、リポジトリ直下に`ads.txt`を作成します。
4. `pub-0000000000000000`の部分は、AdSenseが`ads.txt`用に表示した値に置き換えます。アプリ設定に入れる`ca-pub-...`とは表記が違う場合があります。
5. デプロイ後、ブラウザで`https://YOUR_DOMAIN/ads.txt`を開いて内容を確認します。

AdSense管理画面への反映には数日かかることがあります。サイトの広告リクエストが
少ない場合は、さらに時間がかかることがあります。

## 6. プライバシー説明を用意する

プライバシーポリシーには、Google広告サービスの利用によりURL、IPアドレス、
CookieなどがGoogleへ送信される場合があること、広告のパーソナライズ、同意や撤回
の方法を説明します。Googleの説明ページも案内先として掲載できます。

- https://policies.google.com/technologies/partner-sites
- https://www.google.com/about/company/user-consent-policy/

## 7. 審査を依頼する

1. 本番URLでアプリが表示されることを確認します。
2. `https://YOUR_DOMAIN/ads.txt`が見えることを確認します。
3. AdSense管理画面で`ads.txt`の再チェック、またはサイト審査を依頼します。
4. 審査中も公開状態を維持します。

広告が表示され始めるまで時間がかかることがあります。ローカル環境、`file:`、
`localhost`、`127.0.0.1`、`0.0.0.0`、`::1`では広告コードを読み込まない実装に
してあります。
