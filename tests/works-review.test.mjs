import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCandidates, sourceHash, validateCorrection } from '../scripts/review-works.mjs';
const video = { id: 'a', snippet: { title: '動画名', description: '概要' }, statistics: { viewCount: '1' } };
test('only new or metadata-changed videos need Codex review, not view counts', () => {
  const snapshot = { videos: [video], memberships: [{ id: 'a', kind: 'provided' }] };
  assert.equal(reviewCandidates(snapshot, {}).length, 1);
  const state = { a: { sourceHash: sourceHash(video) } };
  assert.equal(reviewCandidates(snapshot, state).length, 0);
  assert.equal(reviewCandidates({ ...snapshot, videos: [{ ...video, statistics: { viewCount: '99' } }] }, state).length, 0);
  assert.equal(reviewCandidates({ ...snapshot, videos: [{ ...video, snippet: { ...video.snippet, description: '変更' } }] }, state).length, 1);
});
test('incomplete or video-title-shaped corrections cannot be applied', () => {
  const correction = { title: '曲名', artist: 'グループ名', credits: { lyrics: 'GYU P', composition: 'GYU P', arrangement: 'GYU P・みずな' } };
  assert.doesNotThrow(() => validateCorrection('a', correction));
  assert.throws(() => validateCorrection('a', { ...correction, artist: '' }));
  assert.throws(() => validateCorrection('a', { ...correction, credits: {} }));
  assert.throws(() => validateCorrection('a', { ...correction, title: '【MV】曲名' }));
  assert.throws(() => validateCorrection('a', { ...correction, artist: '歌唱未確認' }));
});
