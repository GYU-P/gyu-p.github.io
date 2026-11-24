import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creditsFrom } from '../scripts/work-credits.mjs';

test('combined credits preserve co-writers and additional arrangers', () => {
  const result = creditsFrom('作詞・作曲・編曲 / GYU P / https://example.com\n編曲 / みずな / https://example.com\nLyrics：GYU P・のんです');
  assert.deepEqual(result.credits, { lyrics: 'GYU P・のんです', composition: 'GYU P', arrangement: 'GYU P・みずな' });
});

test('compound labels without punctuation and styled text are recognized', () => {
  assert.deepEqual(creditsFrom('作曲作詞・編曲: GYU P 様').credits, { lyrics: 'GYU P', composition: 'GYU P', arrangement: 'GYU P' });
  assert.deepEqual(creditsFrom('作詞、作曲　Gyu-p').credits, { lyrics: 'GYU P', composition: 'GYU P' });
  assert.deepEqual(creditsFrom('✦ 𝘔𝘶𝘴𝘪𝘤 GYU P @gyup_bokaroP').credits, { music: 'GYU P', lyrics: 'GYU P', composition: 'GYU P', arrangement: 'GYU P' });
});

test('Music fills all three credits while explicit credits take priority regardless of order', () => {
  for (const description of [
    'Music: GYU P\nLyrics: GYU P・のんです\n編曲: みずな',
    '編曲: みずな\nLyrics: GYU P・のんです\nMusic: GYU P',
  ]) {
    assert.deepEqual(creditsFrom(description).credits, {
      music: 'GYU P', lyrics: 'GYU P・のんです', composition: 'GYU P', arrangement: 'みずな',
    });
  }
});
