import { test, expect } from '@playwright/test';

test('正規ページのタイトル・canonical・ページ固有の説明が揃う', async ({ page }) => {
  const descriptions = new Set<string>();
  for (const [path, title] of [['/', 'GYU P 公式サイト'], ['/profile/', 'PROFILE | GYU P 公式サイト'], ['/contact/', 'CONTACT | GYU P 公式サイト']]) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://gyu-p.github.io${path}`);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length).toBeGreaterThan(30);
    descriptions.add(description!);
    expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBe(0);
  }
  expect(descriptions.size).toBe(3);
});

test('サイト名と公式SNSを結び付ける構造化データを静的に掲載', async ({ page }) => {
  await page.goto('/');
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
  const website = data['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'WebSite');
  expect(website.name).toBe('GYU P 公式サイト');
  expect(website.url).toBe('https://gyu-p.github.io/');
  const person = data['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'Person');
  expect(person.name).toBe('GYU P');
  expect(person.sameAs).toEqual(['https://x.com/GYUP_bokaroP', 'https://www.youtube.com/@gyup_bokaroP']);
});

test('サイトマップには正規の3ページだけを載せ、robotsで案内する', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])).toEqual([
    'https://gyu-p.github.io/', 'https://gyu-p.github.io/profile/', 'https://gyu-p.github.io/contact/',
  ]);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: https://gyu-p.github.io/sitemap.xml');
});

test('過去URLは対応ページへの即時転送とcanonicalを返す', async ({ request }) => {
  for (const [old, target] of [
    ['/gyup-music-portfolio/', '/'], ['/gyup-music-portfolio/profile/', '/profile/'],
    ['/gyup-music-portfolio/contact/', '/contact/'], ['/GYUPSITE/GYUPSITE/top/', '/'],
    ['/GYUPSITE/GYUPSITE/profile/', '/profile/'], ['/GYUPSITE/GYUPSITE/works/', '/'],
    ['/GYUPSITE/GYUPSITE/contact/', '/contact/'],
  ]) {
    const response = await request.get(old);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`content="0; url=https://gyu-p.github.io${target}"`);
    expect(html).toContain(`rel="canonical" href="https://gyu-p.github.io${target}"`);
    expect(html).not.toContain('noindex');
  }
});
