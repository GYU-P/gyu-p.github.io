# GYU P — Music Portfolio

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

**現在、定期的な自動更新は設定していません。** 将来の自動更新はMuse側で管理する予定です。サイトのビルド・公開だけではYouTubeへのアクセスも、AIによる補正も行いません。

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

`automation/works-update.txt` は更新時の参考手順です。Codexなどの定期実行を登録する設定ファイルではありません。別途、開発用の `sync:works` はYouTube APIキーが必要ですが、上記の手動更新やサイトの公開には不要です。

## GitHub Pagesへの手動公開

`.github/workflows/pages.yml` は **Run workflowから実行する手動公開専用** です。スケジュールやpushでの自動実行はなく、コミット済み作品データからビルドします。作品の自動更新とは別の処理です。

1. リポジトリの Settings → Pages → Source を **GitHub Actions** に設定。
2. Actions → **Publish site to GitHub Pages** → **Run workflow** を実行。

公開URLとサブディレクトリはPages設定から自動取得します。手動ビルドの場合は `SITE_URL` と `BASE_PATH` で指定できます。

## リポジトリに含めないもの

依存パッケージ、ビルド結果、テスト画像、ローカル取得キャッシュ、`.env`、原案保管用の `reference/` は `.gitignore` で除外します。デザイン参照用のファイルはローカルに保持します。
