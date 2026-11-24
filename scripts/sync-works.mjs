import { readFile, writeFile, rename } from 'node:fs/promises';
import { songMetadata } from './work-metadata.mjs';
import { creditsFrom } from './work-credits.mjs';

const root = new URL('../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const key = process.env.YOUTUBE_API_KEY;
const localImport = process.argv.includes('--local-import') ? await read('.tools/works-import.json') : null;
if (!key && !localImport) throw new Error('YOUTUBE_API_KEY を .env に設定してください。現在の作品データは変更していません。');

async function api(resource, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  url.search = new URLSearchParams({ ...params, key }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`YouTube API ${resource}: HTTP ${response.status}（データは更新していません）`);
  return response.json();
}

const playlists = await read('src/data/youtube-playlists.json');
const overrides = await read('src/data/work-overrides.json');
const creditDefaults = await read('src/data/work-credit-defaults.json');
const memberships = [];
for (const [kind, playlistId] of Object.entries(localImport ? {} : playlists)) {
  let pageToken;
  const seen = new Set();
  do {
    const page = await api('playlistItems', { part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
    if (!Array.isArray(page.items)) throw new Error('再生リストの応答が不正です');
    for (const item of page.items) {
      const id = item.contentDetails?.videoId;
      if (id && !seen.has(id)) { memberships.push({ kind, id }); seen.add(id); }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}
if (localImport) memberships.push(...localImport.memberships);
const ids = [...new Set(memberships.map(v => v.id))];
const videos = new Map((localImport?.videos ?? []).map(v => [v.id, v]));
for (let i = 0; i < (localImport ? 0 : ids.length); i += 50) {
  const page = await api('videos', { part: 'snippet,statistics,status', id: ids.slice(i, i + 50).join(',') });
  if (!Array.isArray(page.items)) throw new Error('動画の応答が不正です');
  for (const video of page.items) videos.set(video.id, video);
}
const syncedAt = new Date().toISOString();
const works = [];
for (const { kind, id } of memberships) {
  const video = videos.get(id);
  if (!video || video.status?.privacyStatus === 'private' || video.status?.uploadStatus !== 'processed') continue;
  const snippet = video.snippet;
  const correction = overrides[id] ?? {};
  if (correction.hidden) continue;
  const parsed = creditsFrom(snippet.description ?? '');
  const song = songMetadata(snippet.title);
  const image = snippet.thumbnails?.maxres?.url ?? snippet.thumbnails?.standard?.url ?? snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url;
  if (!image || !Number.isFinite(Date.parse(snippet.publishedAt))) throw new Error(`動画 ${id} の必須データが不正です`);
  const count = video.statistics?.viewCount;
  const viewCount = count != null && /^\d+$/.test(count) && Number.isSafeInteger(Number(count)) ? Number(count) : null;
  works.push({
    id: `${kind}-${id}`, videoId: id, number: String(works.length + 1).padStart(2, '0'), kind,
    title: correction.title ?? song.title,
    artist: correction.artist ?? parsed.artist ?? song.artist,
    credits: { ...creditDefaults, ...parsed.credits, ...correction.credits }, roles: correction.roles ?? parsed.roles,
    latest: Date.parse(snippet.publishedAt), popularity: viewCount ?? -1, viewCount,
    publishedAt: snippet.publishedAt, syncedAt, image: correction.image ?? image,
    description: correction.description ?? '',
    url: `https://www.youtube.com/watch?v=${id}`, sample: false,
  });
}
if (!works.length) throw new Error('公開できる動画が0件のため、既存データを保持しました。');
// 全取得に成功したときだけ差し替える。途中のAPI障害で一覧を消さない。
const target = new URL('src/data/works.json', root);
const temp = new URL('src/data/works.json.tmp', root);
await writeFile(temp, JSON.stringify(works, null, 2) + '\n');
await rename(temp, target);
console.log(`${works.length}件を同期しました。クレジット・歌手・担当の不足は work-overrides.json で補足できます。`);
