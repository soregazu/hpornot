/* ==========================================================
   페이지 렌더링 / 인터랙션
   ========================================================== */
(function () {
  const S = window.SITE;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- 섹션 순서 ---------- */
  const main = $('#main');
  const all = [...main.querySelectorAll('[data-section]')];
  all.forEach((el) => { if (!S.sectionOrder.includes(el.dataset.section)) el.remove(); });
  S.sectionOrder.forEach((key) => {
    const el = all.find((s) => s.dataset.section === key);
    if (el) main.appendChild(el);
  });
  $('#more-works').href = S.moreWorksHref;
  // 섹션이 빠졌으면 해당 메뉴 링크는 more works 링크로 대체
  if (!S.sectionOrder.includes('works')) $('#nav-works').href = S.moreWorksHref;

  /* ---------- Sites 팝업 ---------- */
  const ICONS = {
    spotify: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 9.5c3.5-1 7-.6 10 1M7.6 12.6c2.8-.8 5.6-.4 8 .9M8.3 15.5c2.1-.5 4.1-.2 5.9.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    bandcamp: '<path d="M8.2 6.5h13L15.8 17.5h-13z" fill="currentColor"/>',
    ytmusic: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.4 9.4v5.2l4.3-2.6z" fill="currentColor"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="7" r="1.2" fill="currentColor"/>',
  };
  const popup = $('#sites-popup');
  popup.innerHTML = S.sites.map((s) => `
    <a class="sites__item" id="site-${s.id}" href="${s.href}" target="_blank" rel="noopener"
       role="menuitem" style="--brand:${s.color}" aria-label="${s.label}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.id] || ''}</svg>
      <span class="sites__tip">${s.label}</span>
    </a>`).join('');

  const sitesBtn = $('#nav-sites');
  const setSites = (open) => {
    popup.classList.toggle('is-open', open);
    sitesBtn.setAttribute('aria-expanded', open);
  };
  sitesBtn.addEventListener('click', (e) => { e.stopPropagation(); setSites(!popup.classList.contains('is-open')); });
  // 마우스 호버로 열기 (닫힐 때는 살짝 지연을 줘서 팝업으로 이동 가능하게)
  const sitesWrap = sitesBtn.parentElement;
  let closeTimer;
  if (window.matchMedia('(hover: hover)').matches) {
    sitesWrap.addEventListener('mouseenter', () => { clearTimeout(closeTimer); setSites(true); });
    sitesWrap.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => setSites(false), 220); });
  }
  document.addEventListener('click', (e) => { if (!popup.contains(e.target)) setSites(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setSites(false); });

  /* ---------- 상단 바 스크롤 상태 ---------- */
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- News ---------- */
  $('#news-list').innerHTML = S.news.map((n, i) => {
    const ext = n.href && n.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `
    <li><a class="news__item" id="news-${i}" href="${n.href}"${ext}>
      <time>${n.date}</time><span class="news__title">${n.title}</span>
      <span class="news__arrow" aria-hidden="true">→</span>
    </a></li>`;
  }).join('');

  /* ---------- 히어로 로고 클릭 (waveroad / 5연타 시 sonohoka 다크모드·역회전) ---------- */
  const LOGOS = {
    ohtyn:    { src: 'assets/images/assets/ohtyn logo.png',    alt: 'oh.tyn' },
    waveroad: { src: 'assets/images/assets/waveroad logo.png', alt: 'waveroad' },
    sonohoka: { src: 'assets/images/assets/sonohoka logo.png', alt: 'sonohoka (そのほかの夢)' },
  };
  // 이미지 프리로드
  Object.values(LOGOS).forEach(({ src }) => { const img = new Image(); img.src = src; });

  const heroLogoBtn = $('#hero-logo-btn');
  const heroLogoImg = $('#hero-logo');
  const aboutLogoImg = $('#about-logo');
  const navAudioWrap = $('#nav-audio-wrap');
  const navAudioBtn = $('#nav-audio');
  const navAudioTip = $('#nav-audio-tip');
  const navAudioVol = $('#nav-audio-vol');
  let logoState = 'ohtyn';
  let clickTimes = [];
  let sonohokaEnteredAt = 0;
  let burstResetTimer = null;

  /* ---------- 상단 바 데모 오디오 플레이어 (sonohoka 전용 + 볼륨 + 지구본 스크러빙) ---------- */
  const demos = Array.isArray(S.demos) ? S.demos : [];
  const demoAudio = new Audio();
  demoAudio.preload = 'metadata';
  demoAudio.loop = true;
  demoAudio.volume = navAudioVol ? parseFloat(navAudioVol.value) || 0.75 : 0.75;
  let currentDemoIdx = -1;
  let userPlaying = false; // 사용자가 재생 상태로 두었는지 여부
  let spinUpTimer = null;

  function setPitchPreserve(preserve) {
    try {
      demoAudio.preservesPitch = preserve;
      demoAudio.mozPreservesPitch = preserve;
      demoAudio.webkitPreservesPitch = preserve;
    } catch (_) {}
  }

  function loadDemoTrack(idx) {
    if (!demos.length) return;
    currentDemoIdx = ((idx % demos.length) + demos.length) % demos.length;
    const track = demos[currentDemoIdx];
    demoAudio.src = encodeURI(track.src);
    if (navAudioTip) navAudioTip.textContent = track.title;
  }

  function pickRandomDemo() {
    if (!demos.length) return;
    let nextIdx = Math.floor(Math.random() * demos.length);
    if (demos.length > 1 && nextIdx === currentDemoIdx) {
      nextIdx = (nextIdx + 1) % demos.length;
    }
    loadDemoTrack(nextIdx);
  }

  function stopDemoAudio() {
    clearInterval(spinUpTimer);
    userPlaying = false;
    demoAudio.pause();
    demoAudio.playbackRate = 1;
    setPitchPreserve(true);
    if (navAudioBtn) {
      navAudioBtn.classList.remove('is-playing', 'is-scrubbing');
      navAudioBtn.setAttribute('aria-pressed', 'false');
    }
  }

  if (navAudioVol) {
    navAudioVol.addEventListener('input', () => {
      demoAudio.volume = Math.max(0, Math.min(1, parseFloat(navAudioVol.value) || 0));
    });
  }

  if (navAudioWrap && navAudioVol) {
    navAudioWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.05 : -0.05;
      const nextVol = Math.max(0, Math.min(1, demoAudio.volume + step));
      demoAudio.volume = nextVol;
      navAudioVol.value = nextVol.toFixed(2);
    }, { passive: false });
  }

  if (navAudioBtn) {
    navAudioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (logoState !== 'sonohoka' || !demos.length) return;
      if (currentDemoIdx < 0) pickRandomDemo();
      if (!userPlaying) {
        userPlaying = true;
        demoAudio.playbackRate = 1;
        setPitchPreserve(true);
        demoAudio.play().then(() => {
          navAudioBtn.classList.add('is-playing');
          navAudioBtn.setAttribute('aria-pressed', 'true');
        }).catch(() => { userPlaying = false; });
      } else {
        stopDemoAudio();
      }
    });
    // 우클릭 시 다른 데모 곡으로 전환
    navAudioBtn.addEventListener('contextmenu', (e) => {
      if (logoState !== 'sonohoka' || !demos.length) return;
      e.preventDefault();
      loadDemoTrack((currentDemoIdx + 1) % demos.length);
      if (userPlaying) {
        demoAudio.playbackRate = 1;
        demoAudio.play().then(() => {
          navAudioBtn.classList.add('is-playing');
          navAudioBtn.setAttribute('aria-pressed', 'true');
        }).catch(() => {});
      }
    });
  }

  /* ---------- sonohoka 모드 지구본 턴테이블 홀드/스크러빙 연동 ---------- */
  let lastSeekAt = 0;
  window.GlobeAudio = {
    onGrab() {
      if (logoState !== 'sonohoka' || !userPlaying) return;
      clearInterval(spinUpTimer);
      setPitchPreserve(false);
      if (navAudioBtn) navAudioBtn.classList.add('is-scrubbing');
    },
    onHoldStill(dt) {
      if (logoState !== 'sonohoka' || !userPlaying) return;
      // 지구본을 잡고 멈춰 있으면 바이닐 플래터를 손으로 잡은 것처럼 피치가 떨어지며 일시정지
      if (!demoAudio.paused) {
        const nextRate = demoAudio.playbackRate * Math.pow(0.72, dt / 16);
        if (nextRate < 0.28) {
          demoAudio.pause();
        } else {
          demoAudio.playbackRate = nextRate;
        }
      }
    },
    onScrub(degDelta, dtMove) {
      if (logoState !== 'sonohoka' || !userPlaying) return;
      const dur = demoAudio.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;

      // sonohoka 모드에서는 역회전(왼쪽, degDelta < 0)이 정방향 진행, 오른쪽(degDelta > 0)이 되감기
      const timeShift = -degDelta * 0.085;
      const now = performance.now();
      if (now - lastSeekAt > 28) {
        demoAudio.currentTime = ((demoAudio.currentTime + timeShift) % dur + dur) % dur;
        lastSeekAt = now;
      }

      // 드래그 속도에 비례해 테이프/턴테이블 피치 변화 (0.45x ~ 2.2x)
      const speedDegPerMs = Math.abs(degDelta) / Math.max(8, dtMove);
      const targetRate = Math.max(0.45, Math.min(2.2, 0.45 + speedDegPerMs * 2.8));
      demoAudio.playbackRate = targetRate;
      if (demoAudio.paused) {
        demoAudio.play().catch(() => {});
      }
    },
    onRelease() {
      if (logoState !== 'sonohoka' || !userPlaying) return;
      if (navAudioBtn) navAudioBtn.classList.remove('is-scrubbing');
      if (demoAudio.paused) {
        demoAudio.playbackRate = 0.35;
        demoAudio.play().catch(() => {});
      }
      // 손을 떼면 지구본이 다시 돌기 시작하면서 곡도 원래 속도(1.0x)로 부드럽게 복귀
      clearInterval(spinUpTimer);
      spinUpTimer = setInterval(() => {
        const diff = 1 - demoAudio.playbackRate;
        if (Math.abs(diff) < 0.03) {
          demoAudio.playbackRate = 1;
          setPitchPreserve(true);
          clearInterval(spinUpTimer);
        } else {
          demoAudio.playbackRate += diff * 0.28;
        }
      }, 24);
    },
  };

  function applyLogoState(nextState) {
    const isSonohoka = nextState === 'sonohoka';
    const isWaveroad = nextState === 'waveroad';
    if (logoState !== nextState) {
      logoState = nextState;
      const { src, alt } = LOGOS[nextState];

      heroLogoImg.classList.remove('is-switching', 'is-tremor');
      void heroLogoImg.offsetWidth; // reflow for animation restart
      heroLogoImg.src = src;
      heroLogoImg.alt = alt;
      heroLogoImg.classList.add(isSonohoka ? 'is-tremor' : 'is-switching');

      if (aboutLogoImg) {
        aboutLogoImg.classList.remove('is-switching');
        void aboutLogoImg.offsetWidth;
        aboutLogoImg.src = src;
        aboutLogoImg.alt = alt;
        aboutLogoImg.classList.add('is-switching');
      }

      if (isSonohoka) {
        pickRandomDemo();
        if (navAudioWrap) navAudioWrap.hidden = false;
      } else {
        stopDemoAudio();
        if (navAudioWrap) navAudioWrap.hidden = true;
      }
    }
    document.body.classList.toggle('is-waveroad', isWaveroad);
    document.body.classList.toggle('is-dark', isSonohoka);
    if (typeof window.setGlobeReverse === 'function') {
      window.setGlobeReverse(isSonohoka);
    }
  }

  function handleLogoActivate() {
    const now = performance.now();
    clearTimeout(burstResetTimer);

    // sonohoka(다크모드) 상태에서 다시 누르면 원래대로(ohtyn) 복귀
    if (logoState === 'sonohoka') {
      if (now - sonohokaEnteredAt < 320) return; // 5연타 직후 여분 클릭 무시
      clickTimes = [];
      applyLogoState('ohtyn');
      return;
    }

    const lastClick = clickTimes[clickTimes.length - 1] || 0;
    if (now - lastClick > 450) {
      clickTimes = [];
    }
    clickTimes = clickTimes.filter((t) => now - t < 1600);
    clickTimes.push(now);

    if (clickTimes.length >= 5) {
      clickTimes = [];
      sonohokaEnteredAt = now;
      applyLogoState('sonohoka');
      return;
    }

    if (clickTimes.length === 1) {
      applyLogoState(logoState === 'ohtyn' ? 'waveroad' : 'ohtyn');
    } else {
      // 2~4번째 빠른 연타 중: 5연타에 도달하지 않고 멈추면 짝수/홀수 클릭에 맞춰 상태 정리
      burstResetTimer = setTimeout(() => {
        if (logoState !== 'sonohoka' && clickTimes.length > 1 && clickTimes.length < 5) {
          if (clickTimes.length % 2 === 0) {
            applyLogoState(logoState === 'waveroad' ? 'ohtyn' : 'waveroad');
          }
          clickTimes = [];
        }
      }, 420);
    }
  }

  heroLogoBtn.addEventListener('click', handleLogoActivate);
  heroLogoBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLogoActivate();
    }
  });

  /* ---------- About + 언어 (초기상태: 영어, 순서: EN / KR / JP) ---------- */
  const langSwitch = $('#lang-switch');
  const aboutText = $('#about-text');
  const LANG_ATTR = { en: 'en', kr: 'ko', jp: 'ja' };

  function setLang(lang, immediate = false) {
    const render = () => {
      aboutText.innerHTML = S.about[lang].map((p) => `<p>${p}</p>`).join('');
      aboutText.lang = LANG_ATTR[lang];
      aboutText.dataset.lang = lang;
      aboutText.classList.remove('is-fading');
    };
    if (immediate) {
      render();
    } else {
      aboutText.classList.add('is-fading');
      setTimeout(render, 180);
    }
    langSwitch.querySelectorAll('button').forEach((b, i) => {
      const on = b.dataset.lang === lang;
      b.setAttribute('aria-selected', on);
      if (on) langSwitch.style.setProperty('--i', i);
    });
  }
  langSwitch.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setLang(b.dataset.lang);
  });
  setLang('en', true);

  /* ---------- Works ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const imgRoot = S.worksImageRoot || 'assets/images/web/';
  // 번호가 클수록 최근 작업 → 위로
  const works = [...S.works].sort((a, b) => b.no - a.no).map((w) => ({
    ...w,
    images: Array.from({ length: w.count || 1 }, (_, k) => `${imgRoot}${w.folder}/${k + 1}.jpg`),
  }));

  const grid = $('#works-grid');
  grid.innerHTML = works.map((w, i) => {
    const no = String(w.no).padStart(2, '0');
    return `
    <li class="card" id="work-${no}" data-tag="${esc(w.tag)}" style="--ratio:${w.ratio || '4/3'}">
      <div class="card__inner" role="button" tabindex="0" data-index="${i}" aria-label="${esc(w.title)} — OPEN">
        <div class="card__face card__front">
          ${w.images.length
            ? `<img src="${esc(w.images[0])}" alt="${esc(w.title)}" loading="lazy">`
            : `<div class="placeholder" data-label="${no}"></div>`}
          <div class="card__overlay" aria-hidden="true">
            <span class="card__overlay-no">${no}</span>
            <span class="card__open">OPEN</span>
            <div class="card__overlay-info">
              <h3 class="card__overlay-title">${esc(w.title)}</h3>
              <p class="card__overlay-desc">${esc(w.desc)}</p>
            </div>
          </div>
        </div>
        <div class="card__face card__back">
          <span class="card__no">${no}</span>
          <h3 class="card__title">${esc(w.title)}</h3>
          <p class="card__desc">${esc(w.desc)}</p>
          <span class="card__tag">${esc(w.tag)}</span>
        </div>
      </div>
    </li>`;
  }).join('');

  // 카드 클릭 → 트레이 열기
  const openWork = (el) => {
    const w = works[+el.dataset.index];
    if (w && window.Tray) window.Tray.open(w, el.closest('.card'));
  };
  grid.addEventListener('click', (e) => {
    const el = e.target.closest('.card__inner');
    if (el) openWork(el);
  });
  grid.addEventListener('keydown', (e) => {
    const el = e.target.closest('.card__inner');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openWork(el); }
  });

  // 앞면 3D 틸트 효과 (가장자리 이동 시 기울어짐)
  grid.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;  // -1(좌) ~ +1(우)
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;  // -1(상) ~ +1(하)
      const maxTilt = 11;
      card.style.setProperty('--rx', `${(-ny * maxTilt).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(nx * maxTilt).toFixed(2)}deg`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  // 메이슨리: 카드 높이(비율 기준)만큼 2px 행을 차지하게
  const ROW = 2, GAP = 12;
  const layout = () => {
    const cards = [...grid.querySelectorAll('.card')];
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const heights = Array(cols).fill(0);
    cards.forEach((card) => {
      const [w, h] = (card.style.getPropertyValue('--ratio') || '4/3').split('/').map(Number);
      const span = Math.ceil((card.clientWidth * (h / w) + GAP) / ROW);
      const c = heights.indexOf(Math.min(...heights)); // 가장 짧은 열
      card.style.gridColumn = cols > 1 ? `${c + 1}` : '';
      card.style.gridRow = cols > 1 ? `${heights[c] + 1} / span ${span}` : '';
      heights[c] += span;
    });
  };
  new ResizeObserver(layout).observe(grid);
  layout();

  /* ---------- Contact ---------- */
  $('#contact-list').innerHTML = S.contact.map((c) =>
    `<p><span>${c.label}</span> | ${c.links.map((l) =>
      `<a href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${l.text}</a>`).join(' / ')}</p>`).join('');

  $('#year').textContent = new Date().getFullYear();

  /* ---------- 스크롤 등장 애니메이션 ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.section, .card, .news__item').forEach((el) => { el.classList.add('reveal'); io.observe(el); });
})();
