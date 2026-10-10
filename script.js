(() => {
  'use strict';
  const BASE_WIDTH = 800;
  const wrapper = document.getElementById('invitation');
  const canvas = document.getElementById('canvas');
  let measuredHeight = 0;
  let lastScroll = window.scrollY;
  let scheduled = false;

  function resizeInvitation() {
    const scale = wrapper.clientWidth / BASE_WIDTH;
    canvas.style.transform = `scale(${scale})`;
    const target = Math.ceil(canvas.scrollHeight * scale);
    if (target !== measuredHeight) {
      measuredHeight = target;
      wrapper.style.height = `${target}px`;
    }
    updateReveals(false);
  }
  window.addEventListener('resize', resizeInvitation, {passive: true});
  if ('ResizeObserver' in window) {
    new ResizeObserver(resizeInvitation).observe(canvas);
    new ResizeObserver(resizeInvitation).observe(wrapper);
  }
  document.fonts?.ready?.then(resizeInvitation);

  // Mobile scroll reveal: downward-only animation, re-armed after leaving the viewport.
  // Upward scrolling never toggles a reveal state. Backgrounds are not reveal targets.
  const reveals = [...document.querySelectorAll('.reveal')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealState = new WeakMap();
  let scrollDirectionDown = true;
  function updateReveals(initial = false) {
    const y = window.scrollY || window.pageYOffset || 0;
    if (!initial && y < lastScroll - 1) {
      scrollDirectionDown = false;
      lastScroll = y;
      return;
    }
    if (!initial && y <= lastScroll + 1) return;
    scrollDirectionDown = true;
    lastScroll = y;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    reveals.forEach(el => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < vh * .93 && rect.bottom > vh * .08;
      const state = revealState.get(el) || {armed:true};
      if (initial && rect.top < vh && rect.bottom > 0) {
        el.classList.add('is-visible');
        state.armed = false;
      } else if (rect.top >= vh * 1.04 || rect.bottom <= -24) {
        // Offscreen elements can play again on the next downward approach.
        el.classList.remove('is-visible');
        state.armed = true;
      } else if (inView && state.armed) {
        el.classList.add('is-visible');
        state.armed = false;
      }
      revealState.set(el,state);
    });
  }
  if (!reducedMotion) {
    // Mark visible content first so the page never flashes invisible on load.
    updateReveals(true);
    document.documentElement.classList.add('js-reveal-ready');
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        updateReveals(false);
        scheduled = false;
      });
    }, {passive:true});
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  // Files are presented in numerical, not lexical, filename ascending order.
  const count = 27;
  const track = document.getElementById('gallery-track');
  const progress = document.getElementById('gallery-progress-fill');
  const counter = document.getElementById('gallery-counter');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const file = i => `assets/gallery/IMG_${String(i+1).padStart(2,'0')}.jpg`;
  let current = 0;
  let lastFocus = null;
  let didDrag = false;
  for(let i=0;i<count;i++){
    const button=document.createElement('button');
    button.type='button';
    button.className='gallery-photo';
    button.setAttribute('aria-label',`웨딩 사진 ${i+1} 확대해서 보기`);
    const image=document.createElement('img');
    image.src=file(i);
    image.alt=`김병직 김정은 웨딩 사진 ${i+1}`;
    image.loading=i<2?'eager':'lazy';
    image.decoding='async';
    image.draggable=false;
    button.append(image);
    button.addEventListener('click',() => { if (!didDrag) openLightbox(i); });
    track.append(button);
  }
  function indexFromScroll() {
    return Math.max(0,Math.min(count-1,Math.round(track.scrollLeft / 410)));
  }
  function updateGalleryCounter(){
    const i=indexFromScroll();
    counter.textContent=`${String(i+1).padStart(2,'0')} / ${count}`;
    progress.style.width=`${(i+1)/count*100}%`;
  }
  track.addEventListener('scroll',updateGalleryCounter,{passive:true});
  let startX=0,startScroll=0,pressed=false, pointerId=null;
  track.addEventListener('pointerdown',e => {
    if (e.pointerType === 'touch') return;
    startX=e.clientX;startScroll=track.scrollLeft;pressed=true;didDrag=false;pointerId=e.pointerId;
    track.classList.add('dragging');
  });
  track.addEventListener('pointermove',e => {
    if(!pressed || e.pointerId!==pointerId)return;
    if(Math.abs(e.clientX-startX)>6) didDrag=true;
    if(didDrag){track.setPointerCapture(e.pointerId);track.scrollLeft=startScroll-(e.clientX-startX)*(BASE_WIDTH/wrapper.clientWidth)}
  });
  function releaseDrag(){
    if(!pressed)return;
    pressed=false;
    track.classList.remove('dragging');
    if(didDrag){track.scrollTo({left:Math.round(track.scrollLeft/410)*410,behavior:'smooth'});setTimeout(()=>{didDrag=false},120)}
  }
  track.addEventListener('pointerup',releaseDrag);
  track.addEventListener('pointercancel',releaseDrag);
  track.addEventListener('pointerleave', e => {if(pressed && !track.hasPointerCapture(e.pointerId))releaseDrag()});
  track.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
      e.preventDefault();track.scrollBy({left:e.key==='ArrowRight'?410:-410,behavior:'smooth'});
    }
  });

  function updateLightbox(index){
    current=(index+count)%count;
    lightboxImg.src=file(current);
    lightboxImg.alt=`김병직 김정은 웨딩 사진 ${current+1} 크게 보기`;
    lightboxCaption.textContent=`${String(current+1).padStart(2,'0')} / ${count}`;
  }
  function openLightbox(index){
    lastFocus=document.activeElement;
    updateLightbox(index);
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    document.getElementById('lightbox-close').focus();
  }
  function closeLightbox(){
    if(!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    if(lastFocus && typeof lastFocus.focus==='function') lastFocus.focus();
  }
  document.getElementById('lightbox-close').addEventListener('click',closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click',()=>updateLightbox(current-1));
  document.getElementById('lightbox-next').addEventListener('click',()=>updateLightbox(current+1));
  lightbox.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox()});
  document.addEventListener('keydown',e=>{
    if(!lightbox.classList.contains('open'))return;
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft')updateLightbox(current-1);
    if(e.key==='ArrowRight')updateLightbox(current+1);
  });
  let swipeX=null;
  lightboxImg.addEventListener('touchstart',e=>{swipeX=e.touches[0].clientX},{passive:true});
  lightboxImg.addEventListener('touchend',e=>{
    if(swipeX===null)return;
    const d=e.changedTouches[0].clientX-swipeX;
    if(Math.abs(d)>45)updateLightbox(current+(d<0?1:-1));
    swipeX=null;
  },{passive:true});

  // Accounts initially collapsed; CSS animates its actual content height.
  document.querySelectorAll('.account-toggle').forEach(button=>{
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',String(!open));
      document.getElementById(button.getAttribute('aria-controls')).inert=open;
      setTimeout(resizeInvitation,500);
      requestAnimationFrame(resizeInvitation);
    });
  });
  const toast=document.getElementById('toast');
  let toastTimer;
  function showToast(message){
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);
  }
  async function copyText(value){
    try{
      if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(value);return true}
      const field=document.createElement('textarea');
      field.value=value;field.style.cssText='position:fixed;top:-9999px;left:-9999px';
      document.body.append(field);field.select();
      const result=document.execCommand('copy');field.remove();return result;
    }catch(e){return false}
  }
  document.querySelectorAll('.copy-btn').forEach(button=>{
    button.addEventListener('click',async()=>{
      const number=button.dataset.copy.match(/[\d-]{6,}/)?.[0]||button.dataset.copy;
      showToast(await copyText(number)?'계좌번호가 복사되었습니다.':'계좌번호: '+number);
    });
  });
  resizeInvitation();
  requestAnimationFrame(()=>{resizeInvitation();updateReveals(true)});
  window.addEventListener('load',resizeInvitation);
})();
