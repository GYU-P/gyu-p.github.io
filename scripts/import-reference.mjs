// 原案から必要な画像とサンプルデータだけを取り出す、一度限りの移行用スクリプト。
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

await mkdir('public/images/works', { recursive: true });
const assets = {
  'asset-d744f5821fa273.png': 'avatar.png',
  'asset-436fa8b93b83ee.png': 'watercolor.png',
  'asset-1b0ab3e2a16a16.png': 'vinyl.png',
};
for (const [source, target] of Object.entries(assets)) {
  await copyFile(`reference/assets/${source}`, `public/images/${target}`);
}
const html = await readFile('reference/index.html', 'utf8');
const matches = [...html.matchAll(/class="work-card" data-kind="(.*?)" data-latest="(.*?)" data-pop="(.*?)"[\s\S]*?<div class="jacket"><img alt="" src="assets\/(.*?)"/g)];
const works = [];
for (const [index, match] of matches.entries()) {
  const number = String(index + 1).padStart(2, '0');
  await copyFile(`reference/assets/${match[4]}`, `public/images/works/track-${number}.svg`);
  works.push({ id: `track-${number}`, number, title: `仮ジャケット ${number}`, kind: match[1], latest: Number(match[2]), popularity: Number(match[3]), image: `/images/works/track-${number}.svg`, description: 'デザイン確認用のサンプル作品です。正式な楽曲情報とリンクは準備中です。', url: null, sample: true });
}
if (works.length !== 20) throw new Error('Expected 20 reference works');
await writeFile('src/data/works.json', JSON.stringify(works, null, 2) + '\n');
