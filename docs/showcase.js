/* Local progressive enhancement: native scroll owns navigation. No input is cancelled. */
(() => {
  const root = document.querySelector('[data-showcase]');
  if (!root) return;
  const header = document.querySelector('.site-header');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [...root.querySelectorAll('[data-chapter]')].map(el => ({
    el, frame: el.querySelector('.chapter-frame'), video: el.querySelector('video'),
    stage: el.querySelector('.chapter-stage'), status: el.querySelector('.chapter-status'),
    play: el.querySelector('[data-play]'), replay: el.querySelector('[data-replay]'),
    complete: false, failed: false, pending: false, epoch: 0, consumed: false, resumeTime: 0,
    suppressed: true,
  }));
  let active = -1;
  let furthest = -1;
  let autoProgress = !reduced.matches;
  let headerHeight = 0;
  let lastY = scrollY;
  let direction = 1;
  let transition = null;
  let frameRequest = 0;
  let settleTimer;

  function state(c, value, message) {
    c.stage.dataset.state = value;
    c.status.textContent = message;
    c.stage.querySelector('.chapter-placeholder p').textContent = {
      loading: 'Loading workflow film…', blocked: 'Play to start the film.',
      error: 'Workflow film unavailable.', stalled: 'Waiting for the film…',
    }[value] || 'Workflow film not loaded.';
    const playing = value === 'playing' || value === 'loading';
    c.play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${c.el.dataset.chapter.replaceAll('-', ' ')} chapter`);
    c.play.title = playing ? 'Pause chapter' : 'Play chapter';
    c.play.firstElementChild.textContent = playing ? 'Ⅱ' : '▶';
  }
  function pause(c) {
    c.epoch++;
    c.pending = false;
    c.video.pause();
    if (c.stage.dataset.state === 'playing' || c.stage.dataset.state === 'loading') {
      state(c, c.video.readyState >= 2 ? 'paused' : 'idle', 'Paused. Play to resume, or scroll to explore.');
    }
  }
  function eligible(index) {
    if (index !== active || document.hidden) return false;
    const r = chapters[index].stage.getBoundingClientRect();
    const visible = Math.min(r.bottom, innerHeight) - Math.max(r.top, headerHeight);
    return visible >= Math.min(r.height * .55, (innerHeight - headerHeight) * .55);
  }
  function load(c, isActive) {
    if (!c.video.hasAttribute('src')) {
      c.video.preload = isActive ? 'auto' : 'metadata';
      c.video.src = c.video.dataset.src;
      c.video.load();
    } else c.video.preload = isActive ? 'auto' : 'metadata';
    // A missing poster never displaces the reserved stage or hides the copy.
    if (!c.posterChecked) {
      c.posterChecked = true;
      const poster = new Image();
      poster.onload = () => {
        c.video.poster = c.video.dataset.poster;
        c.stage.classList.add('has-poster');
      };
      poster.src = c.video.dataset.poster;
    }
  }
  async function play(index) {
    const c = chapters[index];
    if (!eligible(index) || c.complete || c.failed || c.pending || !c.video.paused) return;
    load(c, true);
    c.pending = true;
    const epoch = ++c.epoch;
    state(c, 'loading', 'Loading workflow film…');
    try {
      await c.video.play();
      // The playing-event guard handles a late start after interruption.
      // Never let an old promise pause a newer explicit playback request.
      if (epoch !== c.epoch) return;
      if (c.suppressed || !eligible(index)) { pause(c); return; }
      c.pending = false;
      // Only the playing event confirms playback. Promise resolution can arrive
      // after waiting, and must not relabel buffering as an uninterrupted run.
    } catch (error) {
      if (epoch !== c.epoch) return;
      c.pending = false;
      c.suppressed = true;
      state(c, 'blocked', 'Playback unavailable. Use Play to retry, or scroll to explore.');
    }
  }
  function interrupt() {
    if (active < 0 && !transition) return;
    autoProgress = false;
    if (transition) {
      // Stop our smooth scroll where the visitor intervened, without cancelling input.
      window.scrollTo({top: scrollY, behavior: 'instant'});
      transition = null;
    }
    chapters.forEach(c => {
      // Interrupt this attempt, not an unplayed chapter's opportunity to start
      // once incremental scrolling makes its stage sufficiently visible.
      if (c.pending || !c.video.paused || c.stage.dataset.state === 'stalled') c.suppressed = true;
      pause(c);
    });
  }
  function moveTo(target) {
    const top = target.getBoundingClientRect().top + scrollY - headerHeight - 16;
    transition = {top, until: performance.now() + 1600};
    window.scrollTo({top, behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  function measure() {
    headerHeight = header ? header.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--showcase-header', `${headerHeight}px`);
    chapters.forEach(c => {
      // A full reading column must remain in document flow on short/narrow screens.
      c.el.classList.toggle('is-tall', c.frame.getBoundingClientRect().height > innerHeight - headerHeight - 32 + 2);
    });
    schedule();
  }
  function update() {
    frameRequest = 0;
    const zone = headerHeight + (innerHeight - headerHeight) * .38;
    const next = chapters.findIndex(c => {
      const r = c.el.getBoundingClientRect();
      return r.top <= zone && r.bottom > zone;
    });
    if (next !== active) {
      active = next;
      if (active >= 0) {
        // First forward visits may play, but never restore scroll consent.
        // Backtracking and returning to paused chapters require explicit Play.
        chapters[active].suppressed = reduced.matches || direction < 0 || active <= furthest;
        furthest = Math.max(furthest, active);
      }
      chapters.forEach((c, i) => {
        c.el.classList.toggle('is-active', i === active);
        if (i !== active) pause(c);
      });
    }
    chapters.forEach((c, i) => {
      if (active >= 0 && (i === active || i === active + 1)) load(c, i === active);
      else if (c.video.hasAttribute('src')) {
        pause(c);
        // Before metadata, currentTime is the reload's reset value, not a new position.
        if (c.video.readyState >= 1) c.resumeTime = c.video.currentTime;
        c.video.removeAttribute('src');
        c.video.preload = 'none';
        c.video.load();
      }
      if (i === active && !eligible(i)) pause(c);
    });
    if (active >= 0 && !chapters[active].suppressed) play(active);
  }
  function schedule() {
    if (!frameRequest) frameRequest = requestAnimationFrame(update);
  }
  function settle() {
    if (transition || active < 0 || document.hidden || reduced.matches) return;
    // Small proximity settle only after native scrolling stops. No global snap,
    // no forced step, and no snapping into/out of the first or last boundary.
    const candidates = [chapters[active], chapters[active + direction]];
    for (const candidate of candidates) {
      if (!candidate || candidate.el.classList.contains('is-tall')) continue;
      const delta = candidate.el.getBoundingClientRect().top - headerHeight - 16;
      // Only settle in the visitor's direction, not back toward a row they left.
      if (delta * direction > 2 && Math.abs(delta) < Math.min(140, (innerHeight - headerHeight) * .18)) {
        moveTo(candidate.el);
        break;
      }
    }
  }
  chapters.forEach((c, index) => {
    c.el.querySelector('.chapter-controls').hidden = false;
    c.video.muted = true;
    c.play.addEventListener('click', () => {
      if (!c.video.paused || c.pending) { interrupt(); return; }
      c.suppressed = false;
      autoProgress = true;
      if (c.complete) { c.resumeTime = 0; c.video.currentTime = 0; c.complete = false; c.consumed = false; }
      if (c.failed) { c.failed = false; c.video.load(); }
      play(index);
    });
    c.replay.addEventListener('click', () => {
      interrupt();
      c.resumeTime = 0;
      c.video.currentTime = 0;
      c.complete = false;
      c.consumed = false;
      c.failed = false;
      c.video.load();
      c.suppressed = false;
      play(index);
    });
    c.video.addEventListener('loadedmetadata', () => {
      if (c.video.hasAttribute('src') && c.resumeTime > 0 && !c.complete) c.video.currentTime = c.resumeTime;
    });
    c.video.addEventListener('playing', () => {
      if (!eligible(index) || c.suppressed) { pause(c); return; }
      state(c, 'playing', 'Playing · Scroll at any time to take control.');
    });
    c.video.addEventListener('ended', () => {
      if (c.consumed) return;
      const advance = eligible(index) && !c.suppressed && autoProgress && !c.failed && c.stage.dataset.state === 'playing';
      c.consumed = true;
      c.complete = true;
      c.pending = false;
      state(c, 'complete', 'Chapter complete. Replay, or scroll to explore.');
      if (advance) moveTo(chapters[index + 1]?.el || document.querySelector('#workflows'));
    });
    c.video.addEventListener('error', () => {
      if (!c.video.hasAttribute('src')) return;
      c.failed = true;
      pause(c);
      state(c, 'error', 'Film unavailable. Replay to retry, or scroll to explore.');
    });
    // stalled describes the fetch, not playback: buffered frames may keep
    // running all the way to ended without another playing event.
    c.video.addEventListener('stalled', () => {
      if (c.stage.dataset.state === 'playing') c.status.textContent = 'Playing buffered film · Network download stalled.';
    });
    c.video.addEventListener('waiting', () => {
      if (!eligible(index) || c.failed || c.complete) return;
      state(c, 'stalled', 'Film is buffering. Replay to retry, or scroll to explore.');
    });
  });
  // Listening is passive: wheel/touch always retain native browser behavior.
  window.addEventListener('wheel', interrupt, {passive:true});
  for (const event of ['touchstart', 'pointerdown']) window.addEventListener(event, event => {
    if (!event.target.closest('.chapter-controls')) interrupt();
  }, {passive:true});
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) && !event.target.closest('button, input, textarea, select')) interrupt();
  });
  window.addEventListener('scroll', () => {
    const delta = scrollY - lastY;
    if (Math.abs(delta) > 1) {
      direction = Math.sign(delta);
      if (!transition && active >= 0) interrupt();
    }
    lastY = scrollY;
    if (transition && (Math.abs(scrollY - transition.top) < 2 || performance.now() > transition.until)) transition = null;
    schedule();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 180);
  }, {passive:true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) interrupt();
    schedule();
  });
  reduced.addEventListener('change', () => { if (reduced.matches) interrupt(); });
  const observer = new ResizeObserver(measure);
  if (header) observer.observe(header);
  chapters.forEach(c => observer.observe(c.frame));
  window.addEventListener('resize', measure);
  measure();
})();
