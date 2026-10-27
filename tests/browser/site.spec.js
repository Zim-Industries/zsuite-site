const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('mobile navigation expands, follows a link and closes with Escape', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  const menu=page.getByRole('button',{name:'Menu'});
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.getByRole('navigation').getByRole('link',{name:'Is it a fit?'}).click();
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await menu.click();await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await expect(menu).toBeFocused();
});

test('compact mobile header keeps the brand and menu on one row',async({page})=>{
  await page.setViewportSize({width:320,height:900});await page.goto('./');
  const brand=await page.locator('.site-header .brand').boundingBox();
  const menu=await page.getByRole('button',{name:'Menu'}).boundingBox();
  expect(menu.y+menu.height/2).toBeLessThan(brand.y+brand.height);
});

test('desktop uses direct navigation without a redundant menu button',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('./');
  await expect(page.getByRole('button',{name:'Menu'})).toBeHidden();
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('workflow tabs select panels and support keyboard navigation', async ({page}) => {
  await page.goto('./');
  const tabs=page.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('tabpanel')).toContainText('An asset has');
  await page.keyboard.press('ArrowDown');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Not just submitted.');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
});

for (const width of [320,390,820,1440]) {
  test(`responsive layout and accessibility at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)errors.push(response.url()+':'+response.status());});
    await page.goto('./');await page.evaluate(()=>document.fonts.ready);
    await page.locator('#guide').scrollIntoViewIfNeeded();
    await expect(page.locator('.guide-cover img')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`review/site-${width}.png`,fullPage:true,animations:'disabled'});
    await page.screenshot({path:`review/hero-${width}.png`,animations:'disabled'});
  });
}

test('PDF download is a real PDF and FAQ opens', async ({page,request})=>{
  await page.goto('./');
  const response=await request.get('downloads/Z-Suite_Capabilities_and_Roadmap.pdf');
  expect(response.status()).toBe(200);expect((await response.body()).subarray(0,5).toString()).toBe('%PDF-');
  const item=page.locator('details').filter({hasText:'What is available today?'});
  await item.locator('summary').click();await expect(item).toHaveAttribute('open','');
});

test('content and navigation remain available with JavaScript disabled',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();await page.goto(process.env.SITE_URL||'http://127.0.0.1:8765');
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.locator('.workflow-panel')).toHaveCount(3);
  for(const panel of await page.locator('.workflow-panel').all())await expect(panel).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await context.close();
});
