const {test,expect}=require('@playwright/test');
for(const width of [1440,390]){
 test(`five static capability screenshots load in normal flow at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('./');
  const rows=page.locator('.capability');await expect(rows).toHaveCount(5);
  await expect(page.locator('main video,[data-showcase]')).toHaveCount(0);
  for(let i=0;i<5;i++){
   const row=rows.nth(i),image=row.locator('.capability-shot img');
   await row.scrollIntoViewIfNeeded();await expect(image).toBeVisible();
   await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   await expect(row).toHaveCSS('position','static');
   const copy=await row.locator('.capability-copy').boundingBox(),shot=await row.locator('.capability-shot').boundingBox();
   if(width>850)expect(shot.x).toBeGreaterThan(copy.x+copy.width);
   else expect(shot.y).toBeGreaterThanOrEqual(copy.y+copy.height-1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
