import { test, expect } from '@playwright/test';

test('素早いホバーの出入りで重複・点滅せず、戻り切ってから元の画像を表示する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const card = page.locator('[data-work]:visible').nth(3);
  await card.hover();
  const portal = page.locator('.record-portal');
  await expect(portal).toHaveClass(/is-active/);
  const transitioning = await portal.locator('.work-card__vinyl').evaluate(element => element.getAnimations().some(animation => animation.playState === 'running'));
  expect(transitioning).toBe(true);
  for (let index = 0; index < 3; index++) {
    await page.mouse.move(50, 30);
    await expect(portal).not.toHaveClass(/is-active/);
    await expect(card).toHaveClass(/work-card--lifted/);
    await card.hover();
    await expect(portal).toHaveCount(1);
    await expect(portal).toHaveClass(/is-active/);
  }
  await page.mouse.move(50, 30);
  await expect(portal).toHaveCount(0);
  await expect(card).not.toHaveClass(/work-card--lifted/);
});

test('スクロール・画面サイズ変更後もレコードの基準位置がカードと一致する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const card = page.locator('[data-work]:visible').nth(7);
  await card.locator('button').focus();
  const portal = page.locator('.record-portal');
  await expect(portal).toHaveClass(/is-active/);
  await page.locator('.site-main').evaluate(element => { element.scrollTop = 45; });
  const aligned = async () => {
    const source = await card.locator('button').boundingBox();
    const copy = await portal.boundingBox();
    return source && copy ? Math.max(Math.abs(source.x - copy.x), Math.abs(source.y - copy.y), Math.abs(source.width - copy.width)) : 999;
  };
  await expect.poll(aligned).toBeLessThan(1);
  await page.setViewportSize({ width: 1320, height: 900 });
  await expect.poll(aligned).toBeLessThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(portal).toHaveCount(0);
  await expect(card).not.toHaveClass(/work-card--lifted/);
});

test('動きを減らす設定では終了時に待機しない', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('[data-work]:visible').first().hover();
  await expect(page.locator('.record-portal')).toBeVisible();
  await page.mouse.move(50, 30);
  await expect(page.locator('.record-portal')).toHaveCount(0);
});
