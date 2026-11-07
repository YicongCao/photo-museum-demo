/* The HTML shell paints before React/CDN modules arrive. No simulated percentage. */
(() => {
  const panel = document.getElementById('museum-boot');
  if (!panel) return;
  const bar = panel.querySelector('progress'), label = panel.querySelector('[data-boot-label]');
  const detail = panel.querySelector('[data-boot-detail]'), count = panel.querySelector('[data-boot-count]');
  const retry = panel.querySelector('[data-boot-retry]'), skip = panel.querySelector('[data-boot-skip]');
  let closed = false, timer, cleanup = () => {};
  function dismiss() {
    if (closed) return;
    closed = true; clearTimeout(timer); cleanup();
    panel.remove(); document.getElementById('root')?.removeAttribute('inert');
  }
  function stage(value, text, note = '首次访问可能需要稍候') {
    if (closed) return;
    bar.value = value; label.textContent = text; detail.textContent = note;
    count.textContent = `${Math.min(3, Math.floor(value) + 1).toString().padStart(2, '0')} / 03`;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (closed) return;
      detail.textContent = '连接较慢，仍在加载；也可以重新尝试。'; retry.hidden = false;
    }, 15000);
  }
  function fail() {
    if (closed) return;
    clearTimeout(timer); panel.dataset.failed = 'true';
    label.textContent = '暂时无法载入'; detail.textContent = '请检查网络后重试。'; retry.hidden = false;
  }
  const stylesReady=Promise.all([...document.querySelectorAll('link[data-boot-style]')].map(link=>new Promise((resolve,reject)=>{
    const ready=()=>{link.media='all';resolve();};
    if(link.sheet)ready();
    else {link.addEventListener('load',ready,{once:true});link.addEventListener('error',reject,{once:true});}
  })));
  stylesReady.catch(fail);
  async function images(root) {
    try { await stylesReady; } catch { return; }

    if (closed) return;
    cleanup();
    // Only the selected cover, not reflections or the whole collection.
    const nodes = [...root.querySelectorAll('.activity-panel.depth-0 > div:first-child img')];
    if (!nodes.length) { dismiss(); return; }
    let done = 0, cancelled = false;
    const disposers = [];
    cleanup = () => { cancelled = true; disposers.forEach(f => f()); };
    skip.hidden = false;
    stage(2, '布置首屏照片', `0 / ${nodes.length} 张预览`);
    nodes.forEach(img => {
      let settled = false;
      const finish = async () => {
        if (settled || cancelled) return;
        settled = true;
        if (img.naturalWidth) { try { await img.decode(); } catch {} }
        if (cancelled || closed) return;
        done++;
        stage(2 + done / nodes.length, '布置首屏照片', `${done} / ${nodes.length} 张已处理`);
        if (done === nodes.length) requestAnimationFrame(dismiss);
      };
      if (img.complete) finish();
      else { img.addEventListener('load', finish); img.addEventListener('error', finish); }
      disposers.push(() => { img.removeEventListener('load', finish); img.removeEventListener('error', finish); });
    });
  }
  skip.addEventListener('click', dismiss);
  const appEntry = document.querySelector('script[type=module][src]');
  const resourceError = event => {
    // Optional analytics blocked by CSP must not masquerade as an app failure.
    if (event.target === appEntry || event.target?.matches?.('link[rel=stylesheet]')) fail();
  };
  addEventListener('error', resourceError, true);
  addEventListener('vite:preloadError', fail);
  window.museumBoot = {stage, dismiss, images, fail};
  stage(0, '载入展馆界面');
})();
