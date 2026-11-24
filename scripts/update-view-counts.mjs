import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function videoIdFor(work) {
  if (work.videoId) return work.videoId;
  try {
    const url = new URL(work.url);
    if (['www.youtube.com', 'youtube.com'].includes(url.hostname)) return url.searchParams.get('v');
    if (url.hostname === 'youtu.be') return url.pathname.slice(1);
  } catch {}
  return null;
}

export async function refreshViewCounts(records, { apiKey, fetchImpl = fetch, now = new Date().toISOString() } = {}) {
  if (!apiKey) throw new Error('GitHubのActions secretにYOUTUBE_API_KEYを登録してください。作品データは変更していません。');
  const ids = [...new Set(records.filter(work => !work.sample).map(work => videoIdFor(work)))];
  if (ids.some(id => typeof id !== 'string' || !/^[\w-]{11}$/.test(id))) throw new Error('動画IDが不正です。作品データは変更していません。');
  const counts = new Map();
  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.search = new URLSearchParams({ part: 'statistics', id: batch.join(','), fields: 'items(id,statistics/viewCount)', key: apiKey }).toString();
    let response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    } catch {
      throw new Error('YouTube APIへの通信に失敗しました。作品データは変更していません。');
    }
    // URLやレスポンス本文はログに出さず、キーが出力されないようにする。
    if (!response.ok) throw new Error(`YouTube API HTTP ${response.status}。作品データは変更していません。`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('YouTube APIの応答が不正です。作品データは変更していません。');
    for (const item of data.items) {
      if (!batch.includes(item.id)) continue;
      const raw = item.statistics?.viewCount;
      if (typeof raw !== 'string' || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) continue;
      counts.set(item.id, Number(raw));
    }
  }
  // 全バッチ取得後にだけ値を反映する。非公開・取得不能動画の値は保持。
  const updated = records.map(work => {
    if (work.sample) return work;
    const count = counts.get(videoIdFor(work));
    return count === undefined ? work : { ...work, viewCount: count, popularity: count, syncedAt: now };
  });
  return { records: updated, fetched: counts.size, retained: ids.length - counts.size };
}

async function main() {
  const target = new URL('../src/data/works.json', import.meta.url);
  const temp = new URL('../src/data/works.json.tmp', import.meta.url);
  const records = JSON.parse(await readFile(target, 'utf8'));
  const result = await refreshViewCounts(records, { apiKey: process.env.YOUTUBE_API_KEY });
  if (result.fetched === 0) throw new Error('再生数を取得できた動画が0件のため、既存データを保持しました。');
  await writeFile(temp, JSON.stringify(result.records, null, 2) + '\n');
  await rename(temp, target);
  console.log(`再生数を更新: ${result.fetched}動画。取得できず前回値を保持: ${result.retained}動画。作品の追加・削除・クレジット変更は行っていません。`);
}
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) await main();
