import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Work } from '../src/data/works';
const works: Work[] = JSON.parse(readFileSync(new URL('../src/data/works.json', import.meta.url), 'utf8'));

test('種類の4状態と検索・人気順を組み合わせる', async ({ page }) => {
  await page.goto('/');
  const provided = page.locator('[data-filter="kind"][data-value="provided"]');
  const original = page.locator('[data-filter="kind"][data-value="original"]');
  const cards = page.locator('[data-work]:visible');
  await expect(provided).toHaveAttribute('aria-pressed', 'false');
  await expect(original).toHaveAttribute('aria-pressed', 'false');
  await expect(cards).toHaveCount(works.length);
  await provided.click();
  await expect(cards).toHaveCount(works.filter(w => w.kind === 'provided').length);
  await expect(provided).toHaveAttribute('aria-pressed', 'true');
  await original.click();
  await expect(cards).toHaveCount(works.length);
  await expect(original).toHaveAttribute('aria-pressed', 'true');
  await provided.click();
  await expect(cards).toHaveCount(works.filter(w => w.kind === 'original').length);
  await expect(provided).toHaveAttribute('aria-pressed', 'false');
  await original.focus();
  await page.keyboard.press('Space');
  await expect(cards).toHaveCount(works.length);
  await expect(original).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-filter="sort"][data-value="popular"]').click();
  const counts = await cards.evaluateAll(items => items.map(item => Number((item as HTMLElement).dataset.popularity)));
  expect(counts).toEqual([...counts].sort((a, b) => b - a));
  await page.getByRole('searchbox').fill('存在しない作品xyz');
  await expect(cards).toHaveCount(0);
  await expect(page.locator('[data-empty]')).toBeVisible();
});

test('全カードの詳細は4クレジット、ジャケットには常時ラベルを表示', async ({ page }) => {
  await page.goto('/');
  const templates = await page.locator('template[data-work-detail]').evaluateAll(items => items.map(item =>
    Array.from((item as HTMLTemplateElement).content.querySelectorAll('dt')).map(node => node.textContent)));
  expect(templates).toHaveLength(works.length);
  for (const labels of templates) expect(labels).toEqual(['歌唱', '作詞', '作曲', '編曲']);
  const detailText = await page.locator('template[data-work-detail]').evaluateAll(items => items.map(item => (item as HTMLTemplateElement).content.textContent).join('\n'));
  expect(detailText).not.toContain('担当：');
  expect(detailText).not.toContain('歌唱未確認');
  for (const work of works) {
    expect(work.title).not.toMatch(/【|〖|Official Music Video|Dance Practice|feat\./i);
    expect(work.artist).toBeTruthy();
    expect(work.credits?.lyrics).toBeTruthy();
    expect(work.credits?.composition).toBeTruthy();
    expect(work.credits?.arrangement).toBeTruthy();
  }
  await expect(page.locator('.work-card__label')).toHaveCount(works.length);
  const jacketLabels = await page.locator('.work-card__label').allTextContents();
  expect([...jacketLabels].sort()).toEqual(works.map(work => `${work.title} / ${work.artist}`).sort());
  const label = page.locator('.work-card__label').first();
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(label).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.62)');
  await page.locator('[data-open-work]').first().click();
  await expect(page.locator('dialog dt')).toHaveText(['歌唱', '作詞', '作曲', '編曲']);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(label).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
