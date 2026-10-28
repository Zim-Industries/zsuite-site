const { test, expect } = require('@playwright/test');
test('overview video page loads and the video is playable', async ({ page, request }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.url() + ':' + r.status()); });
  await page.goto('video/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('field and the office');
  const video = page.locator('video');
  await expect(video).toBeVisible();
  const duration = await video.evaluate(v => new Promise((res, rej) => {
    if (v.readyState >= 1) return res(v.duration);
    v.addEventListener('loadedmetadata', () => res(v.duration), { once: true });
    v.addEventListener('error', () => rej(new Error('video error')), { once: true });
  }));
  expect(duration).toBeGreaterThan(150);
  const res = await request.get('video/zsuite-overview.mp4', { headers: { Range: 'bytes=0-15' } });
  expect([200, 206]).toContain(res.status());
  expect(errors).toEqual([]);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `review/video-${width}.png`, animations: 'disabled' });
  }
});
