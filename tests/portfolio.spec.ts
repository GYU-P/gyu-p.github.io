import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Work } from '../src/data/works';
const works: Work[] = JSON.parse(readFileSync(new URL('../src/data/works.json', import.meta.url), 'utf8'));

test('ページ移動・再読み込み・戻る操作と現在位置', async ({ page }) => {
  await page.goto('/');
  for (const section of ['PROFILE', 'CONTACT']) {
    await page.getByRole('link', { name: section, exact: true }).click();
    await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: section, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'PROFILE', exact: true })).toBeVisible();
});

for (const width of [1440, 900, 390, 320]) {
  test(`${width}pxで全ページが収まり、画像とメニューが表示される`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['', 'profile/', 'contact/']) {
      await page.goto(`/${route}`);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const label of ['WORKS', 'PROFILE', 'CONTACT']) {
        await expect(page.locator('.site-shell .site-menu').getByRole('link', { name: label, exact: true })).toBeInViewport();
      }
      await page.screenshot({ path: `artifacts/review/${route.replace('/', '') || 'works'}-${width}-after.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

test('PROFILEは静的に全曲を掲載し、指定順と担当範囲を保持する', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/profile/');
  await expect(page.getByText('2006年生まれ', { exact: true })).toBeVisible();
  await expect(page.locator('.profile-discography h2')).toHaveText(['提供曲', 'オリジナル曲']);
  let remaining = works.filter(w => !w.sample && w.kind === 'provided').sort((a, b) => b.latest - a.latest);
  const provided: Work[] = [];
  const compare = (a: Work, b: Work) => (b.viewCount ?? -1) - (a.viewCount ?? -1) || b.latest - a.latest;
  while (remaining.length) {
    const top = [...remaining].sort(compare)[0];
    provided.push(...remaining.filter(w => w.artist === top.artist).sort(compare));
    remaining = remaining.filter(w => w.artist !== top.artist);
  }
  const originals = works.filter(w => !w.sample && w.kind === 'original').sort((a, b) => b.latest - a.latest);
  for (const [index, expected] of [provided, originals].entries()) {
    const links = page.locator('.profile-discography').nth(index).locator('li a');
    expect(await links.evaluateAll(items => items.map(item => item.getAttribute('href')))).toEqual(expected.map(w => w.url));
    for (const text of await links.allTextContents()) expect(text).toMatch(/\(.+\)/);
    await expect(links.first()).toHaveCSS('text-decoration-line', 'none');
  }
  await context.close();
});

test('CONTACTのメール表示・作成・コピーとXリンク', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto('/contact/');
  const email = ['gyup.2018', 'gmail.com'].join('@');
  expect(await page.locator('main').innerText()).not.toContain(email);
  await expect(page.locator('a[href="https://x.com/GYUP_bokaroP"]')).toBeVisible();
  await page.locator('[data-reveal]').click();
  await expect(page.locator('[data-email-address]')).toHaveText(email);
  await expect(page.locator('[data-mailto]')).toHaveAttribute('href', `mailto:${email}`);
  await page.locator('[data-copy]').click();
  await expect(page.locator('[data-copy-status]')).toHaveText('メールアドレスをコピーしました。');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(email);
  await context.close();
});

test('JavaScript無効でもWORKS・PROFILE・CONTACTの内容を閲覧できる', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('[data-work]:visible')).toHaveCount(works.length);
  await expect(page.locator('[data-toolbar]')).toBeHidden();
  await page.goto('/contact/');
  await expect(page.locator('[data-reveal]')).toBeHidden();
  expect(await page.locator('main').innerText()).toContain('gyup.2018 [at] gmail.com');
  await context.close();
});

test('スマホの全画面メニューの開閉とページ移動', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'メニューを開く' });
  await expect(trigger).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.locator('#mobile-menu-dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await trigger.click();
  await dialog.getByRole('link', { name: 'PROFILE', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/$/);
});

test('レコードのホバー表示と詳細ダイアログのキーボード操作', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const card = page.locator('[data-work]:visible').nth(3);
  await card.hover();
  await expect(page.locator('.record-portal.is-active')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const button = card.locator('[data-open-work]');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.record-portal')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(button).toBeFocused();
});
