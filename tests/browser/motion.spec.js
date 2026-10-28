const {test,expect}=require('@playwright/test');

test('hero illustration responds to the pointer then settles back',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('./');
 const card=page.locator('.day-story');
 const box=await card.boundingBox();
 await page.mouse.move(box.x+box.width*.8,box.y+box.height*.25);
 await expect(card).toHaveClass(/is-tracking/);
 const tilt=await card.evaluate(el=>parseFloat(el.style.getPropertyValue('--tilt-y')));
 expect(tilt).toBeGreaterThan(0);expect(tilt).toBeLessThanOrEqual(3);
 await page.mouse.move(1,1);
 await expect(card).not.toHaveClass(/is-tracking/);
 expect(await card.evaluate(el=>el.style.getPropertyValue('--tilt-y'))).toBe('');
});

test('reading progress follows ordinary document scroll and returns to zero',async({page})=>{
 await page.goto('./');
 const progress=()=>page.evaluate(()=>parseFloat(document.documentElement.style.getPropertyValue('--page-progress')));
 await expect.poll(progress).toBe(0);
 await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await expect.poll(progress).toBeGreaterThan(.99);
 await expect(page.locator('body')).toHaveClass(/is-scrolled/);
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await expect.poll(progress).toBe(0);
 await expect(page.locator('body')).not.toHaveClass(/is-scrolled/);
});
