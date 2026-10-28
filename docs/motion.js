/* Paint-only interaction: normal scrolling, pointer tracking only on the hero illustration. */
(() => {
  const root=document.documentElement;
  let scrollFrame=0;
  const paintProgress=()=>{
    scrollFrame=0;
    const range=root.scrollHeight-window.innerHeight;
    const progress=range>0?Math.max(0,Math.min(1,window.scrollY/range)):0;
    root.style.setProperty('--page-progress',progress.toFixed(4));
    document.body.classList.toggle('is-scrolled',window.scrollY>20);
  };
  const queueProgress=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(paintProgress);};
  window.addEventListener('scroll',queueProgress,{passive:true});
  window.addEventListener('resize',queueProgress,{passive:true});
  window.addEventListener('pageshow',queueProgress);
  paintProgress();

  const card=document.querySelector('.day-story');
  if(!card)return;
  const fine=window.matchMedia('(min-width:851px) and (hover:hover) and (pointer:fine)');
  const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
  let pointerFrame=0,point;
  const reset=()=>{
    cancelAnimationFrame(pointerFrame);pointerFrame=0;point=undefined;
    card.classList.remove('is-tracking');
    for(const name of ['--tilt-x','--tilt-y','--light-x','--light-y','--spotlight'])card.style.removeProperty(name);
  };
  const paintPointer=()=>{
    pointerFrame=0;
    if(!point||!fine.matches||reduced.matches)return;
    const box=card.getBoundingClientRect();
    if(!box.width||!box.height)return;
    const x=Math.max(0,Math.min(1,(point.x-box.left)/box.width));
    const y=Math.max(0,Math.min(1,(point.y-box.top)/box.height));
    card.style.setProperty('--tilt-x',((.5-y)*5).toFixed(2)+'deg');
    card.style.setProperty('--tilt-y',((x-.5)*6).toFixed(2)+'deg');
    card.style.setProperty('--light-x',(x*100).toFixed(1)+'%');
    card.style.setProperty('--light-y',(y*100).toFixed(1)+'%');
    card.style.setProperty('--spotlight','1');
    card.classList.add('is-tracking');
  };
  card.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!fine.matches||reduced.matches)return;
    point={x:event.clientX,y:event.clientY};
    if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);
  },{passive:true});
  card.addEventListener('pointerleave',reset);
  card.addEventListener('pointercancel',reset);
  fine.addEventListener('change',reset);reduced.addEventListener('change',reset);
})();
