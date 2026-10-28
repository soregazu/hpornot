/* ==========================================================
   작품 트레이
   - 카드 위치에서 떠오르며 트레이로 확대 (FLIP)
   - 모든 사진을 슬라이드 트랙에 미리 렌더링하여 깜빡임(flicker) 없이
     가로 슬라이드 + 비율에 맞춘 스테이지 신축 모션으로 전환
   - 1번 사진에서 이전 / 마지막 사진에서 다음으로 순환하지 않도록 제한
   - 하단 밀착인화(Contact Sheet) 썸네일 바로 전체 사진 훑기 및 점프
   - 제목 클릭 시 link로 이동, 링크가 없으면 'NO Link!'
   ========================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  const tray = $('tray');
  const panel = $('tray-panel');
  const content = panel.querySelector('.tray__content');
  const backdrop = tray.querySelector('.tray__backdrop');
  const head = $('tray-head');
  const meta = $('tray-meta');
  const desc = $('tray-desc');
  const stage = $('tray-stage');
  const track = $('tray-track');
  const sheet = $('tray-sheet');
  const ticks = $('tray-ticks');
  const btnPrev = $('tray-prev');
  const btnNext = $('tray-next');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RADIUS = 22;      // 트레이 모서리
  const CARD_RADIUS = 14; // 카드 모서리

  let work = null, card = null, index = 0;
  let isOpen = false, busy = false, lastFocus = null, nolinkTimer = null;
  let currentRatio = 0.75;
  let slideRatios = [];

  /* ---------- 스테이지 크기 계산 (가로/세로 비율 변화 시 부드럽게 신축) ---------- */
  function calcStageSize(r) {
    const mobile = window.innerWidth <= 640;
    const side = mobile ? 30 : 54;
    const gap = mobile ? 8 : 22;
    const padX = mobile ? 24 : 48;
    const maxW = Math.min(window.innerWidth * 0.92, 1000) - side * 2 - gap * 2 - padX;
    const maxH = window.innerHeight * 0.60;
    const h = Math.max(140, Math.round(Math.min(maxH, maxW / r)));
    const w = Math.max(140, Math.round(h * r));
    return { w, h };
  }

  function applyStageRatio(r, animateSize = true) {
    currentRatio = r;
    const { w, h } = calcStageSize(r);
    if (!animateSize) {
      stage.classList.add('is-instant');
    }
    stage.style.width = `${w}px`;
    stage.style.height = `${h}px`;
    panel.style.setProperty('--stage-w', `${w}px`);
    if (!animateSize) {
      void stage.offsetWidth;
      stage.classList.remove('is-instant');
    }
  }

  window.addEventListener('resize', () => {
    if (isOpen && currentRatio) applyStageRatio(currentRatio, false);
  });

  function updateControls() {
    const n = work ? work.images.length : 0;
    [...ticks.children].forEach((t, i) => t.classList.toggle('is-on', i === index));
    [...sheet.children].forEach((t, i) => t.classList.toggle('is-on', i === index));
    // 양 끝에서는 이전/다음으로 순환하지 않도록 버튼 비활성화
    btnPrev.disabled = index <= 0;
    btnNext.disabled = index >= n - 1;
  }

  /* ---------- 슬라이드 이동 (양 끝 클램프 + 트랙 슬라이드 + 비율 신축) ---------- */
  function show(i, animate = true) {
    const n = work.images.length;
    if (i < 0 || i >= n) return;
    index = i;
    updateControls();

    const animateMotion = animate && !reduce;
    if (!animateMotion) {
      track.classList.add('is-instant');
    }
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    if (!animateMotion) {
      void track.offsetWidth;
      track.classList.remove('is-instant');
    }

    const r = slideRatios[index] || currentRatio;
    applyStageRatio(r, animateMotion);
  }

  const next = () => { if (work && index < work.images.length - 1) show(index + 1, true); };
  const prev = () => { if (work && index > 0) show(index - 1, true); };

  /* ---------- 내용 채우기 ---------- */
  function fill(w) {
    const no = w.noLabel || String(w.no).padStart(2, '0');
    const [rw, rh] = (w.ratio || '4/3').split('/').map(Number);
    const defaultRatio = rw / rh;

    if (w.youtubeId) {
      slideRatios = [defaultRatio];
      track.innerHTML = `
        <div class="tray__video">
          <iframe
            id="tray-yt-iframe"
            src="https://www.youtube.com/embed/${esc(w.youtubeId)}?rel=0&playsinline=1&enablejsapi=1"
            title="${esc(w.title)}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen></iframe>
        </div>`;
      const ytIframe = document.getElementById('tray-yt-iframe');
      if (ytIframe) {
        ytIframe.addEventListener('load', () => {
          try {
            ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
          } catch (_) { }
        });
      }
      applyStageRatio(defaultRatio, false);
    } else {
      slideRatios = w.images.map(() => defaultRatio);

      // 모든 사진을 슬라이드 트랙에 한 번에 배치 (넘길 때 src 교체 깜빡임 원천 차단)
      track.innerHTML = w.images.map((src, i) =>
        `<img src="${esc(src)}" alt="${esc(w.title)} — ${i + 1} / ${w.images.length}" draggable="false" />`
      ).join('');

      const imgs = [...track.querySelectorAll('img')];
      imgs.forEach((im, i) => {
        const updateR = () => {
          if (im.naturalWidth && im.naturalHeight) {
            slideRatios[i] = im.naturalWidth / im.naturalHeight;
            if (isOpen && work === w && index === i) {
              applyStageRatio(slideRatios[i], false);
            }
          }
        };
        if (im.complete && im.naturalWidth) updateR();
        else im.addEventListener('load', updateR, { once: true });
      });

      applyStageRatio(slideRatios[0], false);
    }

    meta.innerHTML = `<b>No.${no}</b><span>${esc(w.tag)}</span>`;
    head.innerHTML = w.link
      ? `<a class="tray__title" id="tray-title" href="${esc(w.link)}" target="_blank" rel="noopener">
           <span>${esc(w.title)}</span><i aria-hidden="true">↗</i></a>`
      : `<button class="tray__title is-nolink" id="tray-title" type="button">
           <span>${esc(w.title)}</span></button>
         <span class="tray__bubble" role="status" aria-live="polite">NO Link!</span>`;
    desc.textContent = w.desc || '';

    const many = !w.youtubeId && w.images.length > 1;
    btnPrev.hidden = btnNext.hidden = !many;
    ticks.innerHTML = many
      ? w.images.map((_, i) => `<button type="button" data-i="${i}" aria-label="${i + 1}번째 사진"></button>`).join('')
      : '';
    sheet.hidden = !many;
    sheet.innerHTML = many
      ? w.images.map((src, i) => `
          <button type="button" class="tray__thumb" data-i="${i}" aria-label="${i + 1}번째 사진으로 이동">
            <img src="${esc(src)}" alt="" draggable="false" />
            <span>${String(i + 1).padStart(2, '0')}</span>
          </button>`).join('')
      : '';
    head.classList.remove('show-nolink');
  }

  /* ---------- 스크롤 잠금 ---------- */
  function lockScroll(on) {
    const topbar = document.getElementById('topbar');
    if (on) {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.paddingRight = sbw ? `${sbw}px` : '';
      if (topbar) topbar.style.paddingRight = sbw ? `${sbw}px` : '';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.paddingRight = '';
      if (topbar) topbar.style.paddingRight = '';
    }
  }

  /* 카드 사각형 → 트레이 사각형으로 가는 변환 */
  function fromCard() {
    const a = card.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    const sx = a.width / b.width, sy = a.height / b.height;
    return {
      transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${sx}, ${sy})`,
      borderRadius: `${CARD_RADIUS / sx}px / ${CARD_RADIUS / sy}px`,
    };
  }

  /* ---------- 열기 ---------- */
  async function open(w, cardEl) {
    if (isOpen || busy) return;
    busy = true; isOpen = true;
    work = w; card = cardEl;
    lastFocus = document.activeElement;

    fill(w);
    show(0, false);
    if (w.youtubeId && typeof window.pauseDemoAudio === 'function') {
      window.pauseDemoAudio();
    }

    tray.hidden = false;
    lockScroll(true);
    document.addEventListener('keydown', onKey);
    card.classList.add('is-lifted');

    if (!reduce) {
      const start = fromCard();
      content.style.opacity = 0;

      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      const grow = panel.animate(
        [
          { ...start, opacity: 1, offset: 0 },
          { transform: 'translate(0, -6px) scale(1.012)', borderRadius: `${RADIUS}px`, offset: 0.72 },
          { transform: 'none', borderRadius: `${RADIUS}px`, offset: 1 },
        ],
        { duration: 680, easing: 'cubic-bezier(.25,.8,.25,1)' }
      );
      setTimeout(() => {
        content.style.opacity = '';
        content.animate(
          [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(.22,.8,.24,1)' }
        );
      }, 300);
      await grow.finished.catch(() => {});
    }

    busy = false;
    panel.querySelector('.tray__close').focus({ preventScroll: true });
  }

  /* ---------- 닫기 ---------- */
  async function close() {
    if (!isOpen || busy) return;
    busy = true;
    document.removeEventListener('keydown', onKey);
    clearTimeout(nolinkTimer);

    if (!reduce) {
      await content.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-in', fill: 'forwards' })
        .finished.catch(() => {});
      const end = fromCard();
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      await panel.animate(
        [{ transform: 'none', borderRadius: `${RADIUS}px` }, { ...end }],
        { duration: 460, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }
      ).finished.catch(() => {});
    }

    tray.hidden = true;
    track.innerHTML = '';
    [panel, content, backdrop].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    content.style.opacity = '';
    card.classList.remove('is-lifted');
    lockScroll(false);
    isOpen = false; busy = false;
    const inner = card.querySelector('.card__inner');
    (inner || lastFocus)?.focus?.({ preventScroll: true });
  }

  /* ---------- 이벤트 ---------- */
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' && work.images.length > 1) { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' && work.images.length > 1) { e.preventDefault(); prev(); }
    else if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll('a[href], button:not([hidden]):not(:disabled)')].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  tray.addEventListener('click', (e) => {
    if (e.target.closest('[data-tray-close]')) { close(); return; }
    const t = e.target.closest('.tray__ticks button, .tray__thumb');
    if (t) { const i = +t.dataset.i; if (i !== index) show(i, true); return; }
    if (e.target.closest('.tray__title.is-nolink')) {
      head.classList.remove('show-nolink');
      void head.offsetWidth;
      head.classList.add('show-nolink');
      clearTimeout(nolinkTimer);
      nolinkTimer = setTimeout(() => head.classList.remove('show-nolink'), 1500);
    }
  });
  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);

  // 스테이지 하단 근처에 마우스가 오면 밀착인화(Contact Sheet) 표시
  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    const nearBottom = e.clientY > r.bottom - Math.min(95, r.height * 0.3);
    stage.classList.toggle('show-sheet', nearBottom);
  });
  stage.addEventListener('mouseleave', () => {
    stage.classList.remove('show-sheet');
  });

  // 스와이프 (모바일)
  let sx = 0, sy = 0, tracking = false;
  stage.addEventListener('pointerdown', (e) => { tracking = true; sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (!tracking || !work || work.images.length < 2) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
  });
  stage.addEventListener('pointercancel', () => { tracking = false; });

  window.addEventListener('message', (e) => {
    if (!isOpen || !work || !work.youtubeId || typeof e.data !== 'string') return;
    try {
      const data = JSON.parse(e.data);
      // 유튜브 플레이어가 재생(playerState === 1)되면 우상단 데모 오디오 자동 일시정지
      if (data && data.event === 'infoDelivery' && data.info && data.info.playerState === 1) {
        if (typeof window.pauseDemoAudio === 'function') window.pauseDemoAudio();
      }
    } catch (_) { }
  });

  window.Tray = { open, close };
})();
