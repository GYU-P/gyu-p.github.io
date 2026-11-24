import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
export function sourceHash(video) {
  return createHash('sha256').update(JSON.stringify({ title: video.snippet.title, description: video.snippet.description ?? '' })).digest('hex');
}
export function reviewCandidates(snapshot, state) {
  const active = new Set(snapshot.memberships.map(item => item.id));
  return snapshot.videos.filter(video => active.has(video.id) && state[video.id]?.sourceHash !== sourceHash(video));
}
export function validateCorrection(id, correction) {
  if (correction?.hidden === true) return;
  const fields = { title: correction?.title, artist: correction?.artist,
    lyrics: correction?.credits?.lyrics, composition: correction?.credits?.composition, arrangement: correction?.credits?.arrangement };
  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim() || /未確認|不明|^(?:—|-|unknown)$/i.test(value)) throw new Error(`${id}: ${field} を確認・入力してください。作品データは更新していません。`);
  }
  if (/【|〖|Official Music Video|Dance Practice|feat\./i.test(correction.title)) throw new Error(`${id}: 動画タイトルではなく曲名を入力してください。`);
}

async function main() {
  const snapshot = await read('.tools/works-import.json');
  const state = await read('src/data/work-review-state.json');
  const overrides = await read('src/data/work-overrides.json');
  const candidates = reviewCandidates(snapshot, state);
  if (process.argv[2] === 'prepare') {
    const report = candidates.map(video => ({ videoId: video.id, sourceHash: sourceHash(video),
      kinds: snapshot.memberships.filter(item => item.id === video.id).map(item => item.kind),
      url: `https://www.youtube.com/watch?v=${video.id}`, videoTitle: video.snippet.title,
      description: video.snippet.description ?? '', previousCorrection: overrides[video.id] ?? null }));
    await writeFile(new URL('.tools/works-review.json', root), JSON.stringify(report, null, 2) + '\n');
    console.log(`Codexによる確認対象: ${report.length}件（.tools/works-review.json）。まだWORKSは変更していません。`);
    return;
  }
  if (process.argv[2] !== 'apply') throw new Error('prepare または apply を指定してください');
  for (const video of candidates) validateCorrection(video.id, overrides[video.id]);
  const result = spawnSync(process.execPath, ['scripts/sync-works.mjs', '--local-import'], { cwd: fileURLToPath(root), stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  for (const video of candidates) state[video.id] = { sourceHash: sourceHash(video), reviewedAt: new Date().toISOString() };
  const temp = new URL('src/data/work-review-state.json.tmp', root);
  await writeFile(temp, JSON.stringify(state, null, 2) + '\n');
  await rename(temp, new URL('src/data/work-review-state.json', root));
  console.log(`確認済みデータで更新しました。新規・概要欄変更: ${candidates.length}件。`);
}
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  await main();
}
