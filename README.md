# GYU P 公式サイト

公開URL: https://gyu-p.github.io/

GYU Pの楽曲制作・楽曲提供を紹介する音楽ポートフォリオです。Astro + TypeScriptで、WORKS・PROFILE・CONTACTの3ページを静的HTMLとして生成します。

## 開発

Node.js 24以上とpnpm 10.32.1を使用します。

```sh
npx --yes pnpm@10.32.1 install --frozen-lockfile
npm run dev
```

ローカル表示: http://127.0.0.1:4321/

```sh
npm run check
npm test
node --test tests/work-credits.test.mjs tests/works-review.test.mjs
npm run build
npm run preview
```

画面テストはインストール済みのGoogle Chromeを使用します。ビルド成果物は `dist/` です。

## サイトの構成

- **WORKS**: レコード風ジャケット、曲名・歌唱ラベル、4クレジットの詳細。提供／オリジナルの独立トグル、文字検索、担当・歌唱者タグ、投稿順／再生数順に対応。
- **PROFILE**: 自己紹介とSNS、WORKSと共通データを使った静的な全曲一覧。提供曲は歌唱者ごとにまとめ、各歌唱者の最多再生曲を基準に並び、グループ内も再生数順。オリジナル曲は投稿順。
- **CONTACT**: Xへの案内とメールの表示・コピー・メール作成。メールは簡易的な収集対策としてクリック後に表示。JavaScript無効時にも連絡先の案内を表示。

| 変更する内容 | 編集先 |
| --- | --- |
| 自己紹介・連絡先・ナビゲーション | `src/data/site.ts` |
| 作品データ | `src/data/works.json` |
| 動画別の曲名・歌唱・クレジット補正 | `src/data/work-overrides.json` |
| 基本のクレジット | `src/data/work-credit-defaults.json` |
| 提供／オリジナルの再生リスト | `src/data/youtube-playlists.json` |
| 色・書体・基本寸法 | `src/styles/tokens.css` |
| 各ページの内容とスタイル | `src/pages/` |
| レコードのアニメーション | `src/scripts/record-portal.ts` |

## 作品データの更新

**新曲の追加・曲名や歌唱・クレジットの変更はMuseで手動管理します。再生数だけはGitHub Actionsで毎日更新します。** 定期処理が再生リストを取得したり、新しい曲を追加・削除したりすることはありません。

既存54曲は曲名・歌唱名・作詞・作曲・編曲を確認済みです。新規動画や概要欄変更を取り込むときは、次の手順で更新できます。Python 3が必要で、初回はローカルの `.tools/youtube` にyt-dlpを用意します。動画・音声はダウンロードしません。

```sh
npm run prepare:works
# .tools/works-review.json を確認して src/data/work-overrides.json を補正
npm run apply:works
npm run build
```

確認対象がない場合は `npm run update:works` でも取得から反映まで実行できます。新規・変更動画に完全な補正がない場合は反映を停止し、既存データを保持します。ソースの指紋は `src/data/work-review-state.json` に保存されます。

補正はYouTube動画IDをキーに、`title`、`artist`、`credits`（`lyrics`・`composition`・`arrangement`）、`image`、`description`、`hidden` などを指定します。曲名に動画タイトルの装飾は含めず、グループ歌唱はグループ名にします。

Music・音楽・曲の表記は作詞・作曲・編曲に展開し、個別のクレジットを優先します。このポートフォリオの省略された担当はGYU Pを基本として補完します。共作者・共同編曲者は保持します。概要欄全体や歌詞はサイトに転載しません。

`automation/works-update.txt` はMuseで新曲を追加するときの参考手順です。Codexなどの定期実行を登録する設定ファイルではありません。再生数はボットがコミットするため、Museで作業を始める前に `git pull --ff-only` で最新状態を取得してください。

## 再生数の自動更新

毎日日本時間6:17ごろ（GitHubの混雑等で遅れる場合あり）、掲載済み動画IDだけをYouTube Data API v3に照会します。更新するのは `src/data/works.json` の `viewCount`・`popularity`・`syncedAt` だけです。WORKSの人気順、歌唱タグの順序、PROFILEの提供曲順が連動します。新曲・曲名・歌唱・クレジット・ジャケット・公開日は変更しません。

設定には、Google CloudでYouTube Data API v3を有効にして発行したAPIキーを使います。GitHubリポジトリの Settings → Secrets and variables → Actions → New repository secret に **YOUTUBE_API_KEY** として登録してください。キーはリポジトリやサイトに埋め込みません。未登録・API通信失敗時は公開処理を停止し、現在の公開サイトを維持します。非公開などで個別に再生数を取得できない動画は、前回値と取得日時を保持します。

取得後に検証・ビルドし、成功した再生数データをボットがコミットしてGitHub Pagesに公開します。途中でMuseが新しいコミットをpushした場合は、古い内容を公開しないよう処理を停止します。

手動で確認するときは、Actions → **Publish site to GitHub Pages** → **Run workflow** の `refresh_views` をオンにします。ローカルでは `.env` に同名のキーを設定して `npm run update:views` を実行できます。APIキーをチャットやコミットに貼り付けないでください。

## GitHub Pagesへの公開

`.github/workflows/pages.yml` は毎日の再生数更新・公開と、**Run workflowからの手動公開** に対応します。pushでは自動実行しません。Museで新曲を追加・pushした後は、手動公開してください。手動公開では `refresh_views` をオフにするとAPIキーなしでコミット済みデータを公開できます。

1. リポジトリの Settings → Pages → Source を **GitHub Actions** に設定。
2. Actions → **Publish site to GitHub Pages** → **Run workflow** を実行。

公開URLとサブディレクトリはPages設定から自動取得します。手動ビルドの場合は `SITE_URL` と `BASE_PATH` で指定できます。

## リポジトリに含めないもの

依存パッケージ、ビルド結果、テスト画像、ローカル取得キャッシュ、`.env`、原案保管用の `reference/` は `.gitignore` で除外します。デザイン参照用のファイルはローカルに保持します。
