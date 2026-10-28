const {test, expect} = require('@playwright/test');

// Media files are intentionally absent during integration. Only the browser's
// media transport is mocked; geometry, input, state and scrolling are real.
async function setup(page, {reject = false, delayed = false} = {}) {
  await page.addInitScript(({reject, delayed}) => {
    // The absent/aborted bytes must not introduce codec errors into state tests.
    // Explicit synthetic errors below still exercise the real fallback handlers.
    document.addEventListener('error', event => {
      if (event.isTrusted && event.target instanceof HTMLMediaElement) event.stopImmediatePropagation();
    }, true);
    document.addEventListener('ended', event => {
      if (event.target instanceof HTMLMediaElement) event.target._playing = false;
    }, true);
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {get(){return this._ready ?? 0;}});
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {get(){return !this._playing;}});
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {get(){return this._time || 0;},set(value){this._time=value;}});
    HTMLMediaElement.prototype.load = function() {
      this._time=0;
      this._ready=0;
      const generation = this._loadGeneration = (this._loadGeneration || 0) + 1;
      const metadata = () => {
        if (generation !== this._loadGeneration || !this.hasAttribute('src')) return;
        this._ready=1;
        this.dispatchEvent(new Event('loadedmetadata'));
        this._ready=4;
      };
      if (window.holdMetadata) this._releaseMetadata = metadata;
      else if (delayed) setTimeout(metadata, 100); else metadata();
    };
    window.rejectPlayback = reject;
    HTMLMediaElement.prototype.play = function() {
      if (window.rejectPlayback) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
      const start = () => {
        this._playing = true;
        this.dispatchEvent(new Event('playing'));
      };
      // Intentionally deliver late starts even after pause, exercising stale-start
      // guards rather than letting a friendly transport hide application races.
      if (delayed) return new Promise(resolve => setTimeout(() => {start(); resolve();}, 220));
      start();
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function() {this._playing = false; this.dispatchEvent(new Event('pause'));};
  }, {reject, delayed});
  await page.route('**/assets/showcase/**', route => route.abort());
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
}
async function enter(page, index=0) {
  await page.locator('.chapter').nth(index).evaluate(el => {
    const header = document.querySelector('.site-header').getBoundingClientRect().height;
    window.scrollTo({top:el.getBoundingClientRect().top + scrollY - header - 16,behavior:'instant'});
  });
  await expect(page.locator('.chapter').nth(index)).toHaveClass(/is-active/);
}

test('only active and next media are attached, with one playing chapter', async ({page}) => {
  await setup(page);
  await expect(page.locator('video[src]')).toHaveCount(0);
  await enter(page);
  await expect(page.locator('video[src]')).toHaveCount(2);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  expect(await page.locator('video').evaluateAll(v => v.filter(el=>!el.paused).length)).toBe(1);
  await enter(page,1);
  expect(await page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
  await expect(page.locator('video[src]')).toHaveCount(2);
});

test('completion advances once, last completion exits to workflows, and never steals focus', async ({page}) => {
  await setup(page); await enter(page);
  await page.locator('.chapter [data-play]').first().focus();
  await page.locator('video').first().evaluate(v => {
    v.dispatchEvent(new Event('ended')); v.dispatchEvent(new Event('ended'));
  });
  await expect(page.locator('.chapter').nth(1)).toHaveClass(/is-active/);
  await expect(page.locator('.chapter-stage').nth(1)).toHaveAttribute('data-state','playing');
  await expect(page.locator('.chapter [data-play]').first()).toBeFocused();
  for (let i=1; i<5; i++) {
    await expect(page.locator('.chapter-stage').nth(i)).toHaveAttribute('data-state','playing');
    await page.locator('video').nth(i).evaluate(v=>v.dispatchEvent(new Event('ended')));
  }
  await expect.poll(() => page.locator('#workflows').evaluate(el=>Math.abs(el.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().height-16))).toBeLessThan(3);
  expect(await page.locator('video').evaluateAll(v=>v.every(el=>el.paused))).toBe(true);
});

test('pause and manual backward scrolling cancel progression until explicit Play', async ({page}) => {
  await setup(page); await enter(page);
  await page.locator('[data-play]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','paused');
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await expect(page.locator('.chapter').first()).toHaveClass(/is-active/);
  await page.locator('[data-play]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  await enter(page,1);
  await enter(page,0);
  expect(await page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
  await page.locator('[data-play]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
});

test('hidden, offscreen and waiting media cannot advance; Replay recovers error', async ({page}) => {
  await setup(page); await enter(page);
  await page.evaluate(() => {
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await expect(page.locator('.chapter').first()).toHaveClass(/is-active/);
  await page.evaluate(() => {
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.locator('[data-replay]').first().click();
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('waiting')));
  await expect(page.locator('.chapter-status').first()).toContainText('buffering');
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await expect(page.locator('.chapter').first()).toHaveClass(/is-active/);
  await page.locator('[data-replay]').first().click();
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('error')));
  await expect(page.locator('.chapter-status').first()).toContainText('unavailable');
  await page.locator('[data-replay]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await expect(page.locator('.chapter.is-active')).toHaveCount(0);
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  expect(await page.evaluate(()=>scrollY)).toBe(0);
});

test('autoplay rejection offers explicit resume', async ({page}) => {
  await setup(page,{reject:true}); await enter(page);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','blocked');
  await expect(page.locator('.chapter-status').first()).toContainText('Use Play');
  await page.evaluate(()=>{window.rejectPlayback=false;});
  await page.locator('[data-play]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
});

test('native wheel holds the sticky row, then adjacent chapter settles without trapping boundaries', async ({page}) => {
  await setup(page); await enter(page);
  const frame=page.locator('.chapter-frame').first();
  const initial=(await frame.boundingBox()).y;
  await page.mouse.wheel(0,100);
  await page.waitForTimeout(250);
  expect(Math.abs((await frame.boundingBox()).y-initial)).toBeLessThan(3);
  // Native movement reaches the adjacent row; no wheel handler replaces input.
  const gap=await page.locator('.chapter').nth(1).evaluate(el=>el.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().height-16);
  await page.mouse.wheel(0,gap-60);
  await expect.poll(()=>page.locator('.chapter').nth(1).evaluate(el=>Math.abs(el.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().height-16))).toBeLessThan(3);
  await page.mouse.wheel(0,-10000);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await enter(page,4);
  await page.mouse.wheel(0,2500);
  await expect.poll(()=>page.locator('#workflows').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(0);
});

test('Play resumes an unloaded chapter at its saved position; Replay starts at zero', async ({page}) => {
  await setup(page); await enter(page);
  await page.locator('video').first().evaluate(v=>{v.currentTime=7;});
  await enter(page,2); await enter(page,0);
  await page.locator('[data-play]').first().click();
  expect(await page.locator('video').first().evaluate(v=>v.currentTime)).toBe(7);
  await page.locator('[data-replay]').first().click();
  expect(await page.locator('video').first().evaluate(v=>v.currentTime)).toBe(0);
});

test('touching the pause control does not immediately resume playback', async ({page}) => {
  await setup(page); await enter(page);
  await page.locator('[data-play]').first().evaluate(button=>button.dispatchEvent(new Event('touchstart',{bubbles:true})));
  await page.locator('[data-play]').first().click();
  expect(await page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
});

test('visitor input interrupts an automatic transition and completed chapters do not restart on reentry', async ({page}) => {
  await setup(page); await enter(page);
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await page.mouse.wheel(0,-160);
  await page.waitForTimeout(250);
  await enter(page,0);
  expect(await page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','complete');
  await page.locator('[data-play]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
});

test('Replay restarts only this chapter; Play explicitly restores progression', async ({page}) => {
  await setup(page); await enter(page);
  await page.locator('[data-replay]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await page.waitForTimeout(250);
  await expect(page.locator('.chapter').first()).toHaveClass(/is-active/);
  await page.locator('[data-play]').first().click();
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await expect(page.locator('.chapter').nth(1)).toHaveClass(/is-active/);
});

test('mobile and tall content stay readable in normal flow', async ({page}) => {
  await setup(page);
  await page.setViewportSize({width:390,height:700});
  await enter(page,4);
  await expect(page.locator('.chapter').nth(4)).toHaveClass(/is-tall/);
  expect(await page.locator('.chapter-frame').nth(4).evaluate(el=>getComputedStyle(el).position)).toBe('relative');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.chapter-controls').last().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-replay]').last()).toBeVisible();
});

test('an available poster remains visible when the film fails', async ({page}) => {
  await setup(page);
  // Existing local artwork is a transport fixture, not a product/media claim.
  await page.route('**/assets/showcase/*.webp', route=>route.fulfill({path:require('path').join(__dirname,'../../docs/assets/guide-cover.webp'),contentType:'image/webp'}));
  await enter(page);
  await expect(page.locator('video').first()).toHaveAttribute('poster',/time.webp/);
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('error')));
  expect(await page.locator('video').first().evaluate(v=>getComputedStyle(v).opacity)).toBe('1');
});

test('buffered playback survives a network stall and advances on its real end', async ({page}) => {
  await setup(page); await enter(page);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  await page.locator('video').first().evaluate(v => {
    v.currentTime = 4;
    v.dispatchEvent(new Event('stalled'));
    v.currentTime = 5; // Buffered frames continue; no second playing event follows.
  });
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  expect(await page.locator('video').first().evaluate(v=>getComputedStyle(v).opacity)).toBe('1');
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await expect(page.locator('.chapter').nth(1)).toHaveClass(/is-active/);
});

for (const viewport of [{width:1440,height:1000}, {width:390,height:700}]) {
  test(`incremental forward entry plays new chapters without restoring auto-scroll (${viewport.width}px)`, async ({page}) => {
    await setup(page, {delayed:true});
    await page.setViewportSize(viewport);
    // Approach from before the showcase, rather than teleporting to its stage.
    await page.locator('.chapter').first().evaluate(el => window.scrollTo({
      top:el.getBoundingClientRect().top + scrollY - innerHeight, behavior:'instant',
    }));
    for (let index=0; index<2; index++) {
      const stage=page.locator('.chapter-stage').nth(index);
      for (let step=0; step<60; step++) {
        await page.mouse.wheel(0,80);
        await page.waitForTimeout(50);
        if (['loading','playing'].includes(await stage.getAttribute('data-state'))) break;
        if (await page.locator('.chapter').nth(index).evaluate(el=>el.getBoundingClientRect().bottom<0)) break;
      }
      await expect(stage).toHaveAttribute('data-state','playing');
      if (index===0) {
        // Reading onward takes control of this run, not all future chapters.
        await page.mouse.wheel(0,80);
        await expect.poll(()=>page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
      }
    }
    await page.waitForTimeout(350);
    const y=await page.evaluate(()=>scrollY);
    await page.locator('video').nth(1).evaluate(v=>v.dispatchEvent(new Event('ended')));
    await page.waitForTimeout(350);
    expect(await page.evaluate(()=>scrollY)).toBe(y);
    await expect(page.locator('.chapter').nth(1)).toHaveClass(/is-active/);
  });
}

test('interrupted pending start stays paused despite late media callbacks; a new forward chapter may play', async ({page}) => {
  await setup(page, {delayed:true}); await enter(page);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','loading');
  await page.mouse.wheel(0,30);
  await page.waitForTimeout(350); // Beyond both delayed metadata and playing/promise resolution.
  expect(await page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
  await expect(page.locator('.chapter-stage').first()).not.toHaveAttribute('data-state','playing');
  await enter(page,1);
  await expect(page.locator('.chapter-stage').nth(1)).toHaveAttribute('data-state','playing');
  await page.locator('video').nth(1).evaluate(v=>v.dispatchEvent(new Event('ended')));
  await page.waitForTimeout(300);
  await expect(page.locator('.chapter').nth(1)).toHaveClass(/is-active/);
});

test('delayed metadata restores the saved position without reviving backward playback', async ({page}) => {
  await setup(page, {delayed:true}); await enter(page);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  await page.locator('video').first().evaluate(v=>{v.currentTime=7;});
  await enter(page,2);
  await enter(page,0);
  await page.waitForTimeout(350);
  expect(await page.locator('video').first().evaluate(v=>v.paused)).toBe(true);
  expect(await page.locator('video').first().evaluate(v=>v.currentTime)).toBe(7);
  await page.locator('[data-play]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  expect(await page.locator('video').first().evaluate(v=>v.currentTime)).toBe(7);
});

test('leaving a reload before metadata preserves the saved position for the next Play', async ({page}) => {
  await setup(page, {delayed:true}); await enter(page);
  const video = page.locator('video').first();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  await video.evaluate(v=>{v.currentTime=7;});
  await enter(page,2);
  await expect(video).not.toHaveAttribute('src');
  // Hold the next metadata callback so navigation always beats the reload seek.
  await page.evaluate(()=>{window.holdMetadata=true;});
  await enter(page,0);
  expect(await video.evaluate(v=>({time:v.currentTime, ready:v.readyState}))).toEqual({time:0, ready:0});
  await enter(page,2);
  await expect(video).not.toHaveAttribute('src');
  await page.evaluate(()=>{window.holdMetadata=false;});
  await enter(page,0);
  await expect.poll(()=>video.evaluate(v=>v.readyState)).toBe(4);
  expect(await video.evaluate(v=>v.paused)).toBe(true);
  await page.locator('[data-play]').first().click();
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','playing');
  expect(await video.evaluate(v=>v.currentTime)).toBe(7);
});

test('waiting between playing and play-promise resolution cannot rearm completion', async ({page}) => {
  await setup(page);
  await page.evaluate(() => {
    HTMLMediaElement.prototype.play = function() {
      this._playing=true;
      this.dispatchEvent(new Event('playing'));
      this.dispatchEvent(new Event('waiting'));
      return new Promise(resolve=>setTimeout(resolve,100));
    };
  });
  await enter(page);
  await page.waitForTimeout(200);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','stalled');
  await page.locator('video').first().evaluate(v=>v.dispatchEvent(new Event('ended')));
  await page.waitForTimeout(300);
  await expect(page.locator('.chapter').first()).toHaveClass(/is-active/);
});

test('missing real assets keep a readable fallback without changing layout', async ({page}) => {
  await page.route('**/assets/showcase/**', route=>route.fulfill({status:404,body:'Not found'}));
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('./'); await enter(page);
  await expect(page.locator('.chapter-stage').first()).toHaveAttribute('data-state','error');
  await expect(page.locator('.chapter-placeholder').first()).toBeVisible();
  await expect(page.locator('.chapter-copy').first()).toContainText('Payroll handoff uses files');
  const stage=await page.locator('.chapter-stage').first().boundingBox();
  expect(Math.abs(stage.width/stage.height-4/3)).toBeLessThan(.01);
});
