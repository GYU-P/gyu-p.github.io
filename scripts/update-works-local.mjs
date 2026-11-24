import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.platform === 'win32' ? '.tools/youtube/Scripts/python.exe' : '.tools/youtube/bin/python';
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!existsSync(new URL(`../${python}`, import.meta.url))) {
  run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', '.tools/youtube']);
  run(python, ['-m', 'pip', 'install', 'yt-dlp']);
}
run(python, ['scripts/import-youtube.py']);
const memberships = JSON.parse(await readFile(new URL('../.tools/playlist-memberships.json', import.meta.url), 'utf8'));
const publishedIds = new Set(JSON.parse(await readFile(new URL('../src/data/works.json', import.meta.url), 'utf8')).map(work => work.videoId));
const videos = [];
for (const id of new Set(memberships.map(item => item.id))) {
  const response = await fetch(`https://www.youtube.com/watch?v=${id}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`YouTube HTTP ${response.status}; existing works unchanged`);
  const html = await response.text();
  const marker = 'var ytInitialPlayerResponse = ';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Player metadata missing: ${id}`);
  const tail = html.slice(start + marker.length);
  let player;
  for (let end = tail.indexOf('};'); end >= 0; end = tail.indexOf('};', end + 2)) {
    try { player = JSON.parse(tail.slice(0, end + 1)); break; } catch {}
  }
  if (!player) throw new Error(`Invalid metadata: ${id}`);
  const details = player.videoDetails;
  const meta = player.microformat?.playerMicroformatRenderer;
  if (!details) {
    const reason = player.playabilityStatus?.reason ?? '';
    // 掲載済みの曲が取得できない場合は、applyでサイトから消える事故を防ぐため停止して報告する。
    if (publishedIds.has(id)) throw new Error(`Unable to fetch published video: ${id} (${reason}); existing works unchanged`);
    // 未掲載の動画が非公開・削除などで取得できない場合は、無視して次へ進む。
    console.log(`Skipping unavailable video: ${id} (${reason})`); continue;
  }
  if (!meta?.publishDate) throw new Error(`Publish date missing: ${id}`);
  videos.push({ id, status: { privacyStatus: 'public', uploadStatus: 'processed' },
    snippet: { title: details.title, description: details.shortDescription ?? '', channelTitle: details.author ?? '', publishedAt: meta.publishDate,
      thumbnails: { high: { url: details.thumbnail.thumbnails.at(-1).url } } },
    statistics: { viewCount: details.viewCount } });
  console.log(`${videos.length}: ${details.title}`);
}
await writeFile(new URL('../.tools/works-import.json', import.meta.url), JSON.stringify({ memberships, videos }));
if (process.argv.includes('--prepare-only')) {
  run(process.execPath, ['scripts/review-works.mjs', 'prepare']);
} else {
  run(process.execPath, ['scripts/review-works.mjs', 'prepare']);
  run(process.execPath, ['scripts/review-works.mjs', 'apply']);
}
