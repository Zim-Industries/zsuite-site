const { test, expect } = require('@playwright/test');

test('header wordmark animates once then holds, including after hover and navigation', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('./');
  const logo=page.locator('.site-header .brand img');
  await expect.poll(()=>logo.evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  expect(await logo.evaluate(img=>img.currentSrc)).toContain('zsuite-wordmark-anim.webp');
  const opening=await logo.screenshot({animations:'allow'});
  await page.waitForTimeout(3000);
  const finished=await logo.screenshot({animations:'allow'});
  expect(opening.equals(finished)).toBe(false);
  await page.locator('.site-header .brand').hover();
  await page.waitForTimeout(1100);
  expect((await logo.screenshot({animations:'allow'})).equals(finished)).toBe(true);
  await page.locator('.site-header .brand').click();
  await page.waitForTimeout(400);
  expect((await logo.screenshot({animations:'allow'})).equals(finished)).toBe(true);
});

test('compact header uses the supplied one-shot mark without wrapping navigation',async({page})=>{
  await page.setViewportSize({width:320,height:900});await page.goto('./');
  const logo=page.locator('.site-header .brand img');
  await expect.poll(()=>logo.evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  expect(await logo.evaluate(img=>img.currentSrc)).toContain('zsuite-mark-anim.webp');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('existing capability rows reveal once without changing document scroll behavior',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('./');
  const row=page.locator('.capability').first();
  await expect(row).toHaveClass(/reveal-pending/);
  await row.scrollIntoViewIfNeeded();
  await expect(row).not.toHaveClass(/reveal-pending/);
  await expect(row).toHaveCSS('opacity','1');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await row.scrollIntoViewIfNeeded();
  await expect(row).not.toHaveClass(/reveal-pending/);
});
