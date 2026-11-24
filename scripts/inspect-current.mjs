import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', error => console.log('PAGE ERROR', error.message));
await page.goto('http://127.0.0.1:4321/');
await page.waitForTimeout(800);
console.log(await page.locator('.site-menu__link').first().evaluate(element => {
  const canvas = element.querySelector('ink-border canvas');
  const bounds = canvas.getBoundingClientRect();
  const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  return { border: getComputedStyle(element).borderColor, canvas: { width: canvas.width, height: canvas.height, bounds: bounds.toJSON() }, alphaCount: rgba.filter((n, i) => i % 4 === 3 && n > 0).length };
}));
const card = page.locator('[data-work]:visible').nth(3);
await card.hover();
await page.waitForTimeout(550);
console.log(await page.locator('.record-portal.is-active .work-card__vinyl').evaluate(element => ({rect: element.getBoundingClientRect().toJSON(), transform: getComputedStyle(element).transform})));
console.log(await page.locator('.site-main-frame').evaluate(element => element.getBoundingClientRect().toJSON()));
await page.screenshot({ path: 'artifacts/inspect-current.png' });
await browser.close();
