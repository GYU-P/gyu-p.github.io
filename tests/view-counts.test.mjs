import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshViewCounts } from '../scripts/update-view-counts.mjs';

const fixture = (id = 'abcdefghijk') => ({ id: `original-${id}`, videoId: id, title: '曲名', artist: 'グループ名', credits: { lyrics: 'GYU P・共作者', composition: 'GYU P', arrangement: 'GYU P' }, kind: 'original', image: 'https://example.com/a.jpg', latest: 99, viewCount: 10, popularity: 10, syncedAt: 'old', url: `https://www.youtube.com/watch?v=${id}`, sample: false });
const response = items => ({ ok: true, json: async () => ({ items }) });
const item = (id, value) => ({ id, statistics: { viewCount: value } });

test('updates only counts and successful retrieval time; never adds API videos or changes credits', async () => {
  const original = [fixture()];
  const snapshot = structuredClone(original);
  const result = await refreshViewCounts(original, { apiKey: 'test', now: 'today', fetchImpl: async url => {
    assert.equal(url.searchParams.get('part'), 'statistics');
    assert.equal(url.searchParams.get('id'), 'abcdefghijk');
    assert.equal(url.pathname.endsWith('/videos'), true);
    return response([item('abcdefghijk', '123'), item('unlisted123', '999')]);
  } });
  assert.deepEqual(original, snapshot);
  assert.deepEqual(result.records, [{ ...snapshot[0], viewCount: 123, popularity: 123, syncedAt: 'today' }]);
  assert.equal(result.fetched, 1);
});

test('unavailable videos and invalid counts retain previous values and timestamps', async () => {
  const records = [fixture(), fixture('lmnopqrstuv'), fixture('01234567890')];
  const result = await refreshViewCounts(records, { apiKey: 'test', now: 'today', fetchImpl: async () => response([item('abcdefghijk', '0'), item('lmnopqrstuv', 'invalid')]) });
  assert.equal(result.records[0].viewCount, 0);
  assert.deepEqual(result.records.slice(1), records.slice(1));
  assert.equal(result.retained, 2);
});

test('deduplicates and batches at 50 IDs; late HTTP failure leaves input untouched', async () => {
  const records = Array.from({ length: 51 }, (_, index) => fixture(String(index).padStart(11, '0')));
  records.push({ ...records[0], id: 'provided-duplicate', kind: 'provided' });
  const original = structuredClone(records);
  const batches = [];
  const mock = async url => {
    const ids = url.searchParams.get('id').split(','); batches.push(ids);
    return batches.length === 1 ? response(ids.map(id => item(id, '999'))) : { ok: false, status: 403 };
  };
  await assert.rejects(refreshViewCounts(records, { apiKey: 'secret-not-for-logs', fetchImpl: mock }), error => /403/.test(error.message) && !error.message.includes('secret-not-for-logs'));
  assert.deepEqual(batches.map(batch => batch.length), [50, 1]);
  assert.deepEqual(records, original);
});

test('missing key and network failures are explicit and do not disclose credentials', async () => {
  await assert.rejects(refreshViewCounts([fixture()], {}), /YOUTUBE_API_KEY/);
  await assert.rejects(refreshViewCounts([fixture()], { apiKey: 'secret', fetchImpl: async () => { throw Error('https://example.com/?key=secret'); } }), error => !error.message.includes('secret'));
});

test('same video in both categories updates both records without changing membership', async () => {
  const records = [fixture(), { ...fixture(), id: 'provided-a', kind: 'provided' }];
  const result = await refreshViewCounts(records, { apiKey: 'test', fetchImpl: async () => response([item('abcdefghijk', '500')]) });
  assert.deepEqual(result.records.map(work => work.kind), ['original', 'provided']);
  assert.deepEqual(result.records.map(work => work.viewCount), [500, 500]);
});
