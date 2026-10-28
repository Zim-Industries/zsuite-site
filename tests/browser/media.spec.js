const {test,expect}=require('@playwright/test');
const chapters=[['time',18],['people',18],['equipment',18],['field-records',18],['safety',20]];
for(const [id,seconds] of chapters){
 test(`encoded ${id} plays, pauses and completes in the real browser`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('./');
  const chapter=page.locator(`[data-chapter="${id}"]`),video=chapter.locator('video');
  await chapter.evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').getBoundingClientRect().height-16,behavior:'instant'}));
  await expect(chapter).toHaveClass(/is-active/);
  await expect.poll(()=>video.evaluate(v=>Number.isFinite(v.duration)?v.duration:0)).toBe(seconds);
  await expect.poll(()=>video.evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(2);
  await expect(chapter.locator('.chapter-stage')).toHaveAttribute('data-state','playing');
  await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(.1);
  await chapter.locator('[data-play]').click();
  expect(await video.evaluate(v=>v.paused)).toBe(true);
  // Decode the real encoded timeline to its native ended event; no event mocks
  // or seek assumptions about the local static server's Range support.
  await video.evaluate(v=>{v.playbackRate=8;});
  await chapter.locator('[data-play]').click();
  await expect(chapter.locator('.chapter-stage')).toHaveAttribute('data-state','complete',{timeout:10000});
  const index=chapters.findIndex(x=>x[0]===id);
  if(index<chapters.length-1)await expect(page.locator(`[data-chapter="${chapters[index+1][0]}"]`)).toHaveClass(/is-active/);
  else await expect.poll(()=>page.locator('#workflows').evaluate(el=>Math.abs(el.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().height-16))).toBeLessThan(3);
 });
}
