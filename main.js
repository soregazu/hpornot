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
    ohtyn: { src: 'assets/images/assets/ohtyn logo.png', alt: 'oh.tyn' },
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
  const navAudioSpd = $('#nav-audio-spd');
  const navAudioSpdLabel = $('#nav-audio-spd-label');
  const heroNow = $('#hero-now');
  const heroNowTitle = $('#hero-now-title');
  let logoState = 'ohtyn';
  let clickTimes = [];
  let sonohokaEnteredAt = 0;

  /* ---------- 상단 바 데모 오디오 플레이어 (sonohoka 전용 + 볼륨/속도 + 지구본 스크러빙) ---------- */
  const demos = Array.isArray(S.demos) ? S.demos : [];
  const demoAudio = new Audio();
  demoAudio.preload = 'auto';
  demoAudio.loop = true;
  let masterVol = navAudioVol ? parseFloat(navAudioVol.value) || 0.75 : 0.75;
  let userSpeedRate = navAudioSpd ? parseFloat(navAudioSpd.value) || 1 : 1;
  demoAudio.volume = masterVol;
  let currentDemoIdx = -1;
  let userPlaying = false;      // 사용자가 재생 버튼(♪)을 켜 두었는지 여부
  let audioEngaged = false;     // 모터 재생 중이거나 손으로 돌려서 지구본이 아직 회전 중인 상태
  let lastAnnouncedIdx = -1;    // 이미 now playing을 표시한 곡 인덱스 (같은 곡 재시작 시 미표시)
  let nowHideTimer = null;
  let nowFadeTimer = null;

  // Web Audio API (역재생 버퍼 & 아날로그 테이프 리와인드 사운드용)
  let audioCtx = null;
  const revBuffers = {}; // idx -> reversed AudioBuffer
  let revSource = null;
  let revGain = null;
  let revStartedAtCtx = 0;
  let revStartOffset = 0;
  let revRate = 1;
  let isReversing = false;
  let virtualTime = 0;

  // file:// 등 역재생 버퍼 디코딩 불가 환경용 부드러운 테이프 스크럽 노이즈
  let tapeNoiseNode = null;
  let tapeFilterNode = null;
  let tapeGainNode = null;

  function ensureAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => { });
    }
    return audioCtx;
  }

  function preloadReverseBuffer(idx, url) {
    if (revBuffers[idx] !== undefined) return;
    if (location.protocol === 'file:') {
      revBuffers[idx] = null;
      return;
    }
    revBuffers[idx] = null; // 중복 요청 방지
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const ctx = ensureAudioCtx();
        if (!ctx) return null;
        return ctx.decodeAudioData(buf);
      })
      .then((decoded) => {
        if (!decoded || !audioCtx) return;
        const rev = audioCtx.createBuffer(decoded.numberOfChannels, decoded.length, decoded.sampleRate);
        for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
          const srcData = decoded.getChannelData(ch);
          const dstData = rev.getChannelData(ch);
          for (let i = 0, len = srcData.length; i < len; i++) {
            dstData[i] = srcData[len - 1 - i];
          }
        }
        revBuffers[idx] = rev;
      })
      .catch(() => { });
  }

  function startReversePlayback(rate) {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const revBuf = revBuffers[currentDemoIdx];

    if (revBuf) {
      const dur = revBuf.duration;
      if (!isReversing || !revSource) {
        stopReversePlayback(false);
        isReversing = true;
        demoAudio.muted = true; // forward 오디오는 seek 하지 않고 음소거만 유지 (끊김 방지)

        revGain = ctx.createGain();
        revGain.gain.value = masterVol;
        revGain.connect(ctx.destination);

        revSource = ctx.createBufferSource();
        revSource.buffer = revBuf;
        revSource.loop = true;
        revRate = rate;
        revSource.playbackRate.value = rate;
        revSource.connect(revGain);

        revStartOffset = ((dur - virtualTime) % dur + dur) % dur;
        revStartedAtCtx = ctx.currentTime;
        revSource.start(0, revStartOffset);
      } else {
        // 이미 역재생 중이면 현재 위치 누적 후 배속만 매끄럽게 변경
        const nowCtx = ctx.currentTime;
        const elapsedRev = (nowCtx - revStartedAtCtx) * revRate;
        revStartOffset = (revStartOffset + elapsedRev) % dur;
        virtualTime = ((dur - revStartOffset) % dur + dur) % dur;
        revStartedAtCtx = nowCtx;
        revRate = rate;
        revSource.playbackRate.setTargetAtTime(rate, nowCtx, 0.02);
      }
    } else {
      // 로컬(file://) 폴백: 반복 seek 대신 가상 시간만 이동시키고 부드러운 테이프 와인딩 사운드 재생
      isReversing = true;
      demoAudio.muted = true;
      if (!tapeNoiseNode) {
        const bufSize = ctx.sampleRate;
        const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) out[i] = (Math.random() * 2 - 1) * 0.25;

        tapeNoiseNode = ctx.createBufferSource();
        tapeNoiseNode.buffer = noiseBuf;
        tapeNoiseNode.loop = true;

        tapeFilterNode = ctx.createBiquadFilter();
        tapeFilterNode.type = 'bandpass';
        tapeFilterNode.Q.value = 3.2;

        tapeGainNode = ctx.createGain();
        tapeGainNode.gain.value = 0;

        tapeNoiseNode.connect(tapeFilterNode);
        tapeFilterNode.connect(tapeGainNode);
        tapeGainNode.connect(ctx.destination);
        tapeNoiseNode.start();
      }
      tapeFilterNode.frequency.setTargetAtTime(320 + rate * 420, ctx.currentTime, 0.03);
      tapeGainNode.gain.setTargetAtTime(masterVol * Math.min(0.28, rate * 0.12), ctx.currentTime, 0.03);
    }
  }

  function stopReversePlayback(syncToAudio = true) {
    if (revSource) {
      try {
        if (audioCtx && revBuffers[currentDemoIdx]) {
          const dur = revBuffers[currentDemoIdx].duration;
          const elapsedRev = (audioCtx.currentTime - revStartedAtCtx) * revRate;
          revStartOffset = (revStartOffset + elapsedRev) % dur;
          virtualTime = ((dur - revStartOffset) % dur + dur) % dur;
        }
        revSource.stop();
        revSource.disconnect();
      } catch (_) { }
      revSource = null;
    }
    if (revGain) {
      try { revGain.disconnect(); } catch (_) { }
      revGain = null;
    }
    if (tapeGainNode && audioCtx) {
      tapeGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
    }
    if (isReversing) {
      isReversing = false;
      if (syncToAudio && Number.isFinite(demoAudio.duration) && demoAudio.duration > 0) {
        // 역재생이 끝나는 순간 딱 한 번만 currentTime 동기화 (버퍼 끊김 최소화)
        demoAudio.currentTime = ((virtualTime % demoAudio.duration) + demoAudio.duration) % demoAudio.duration;
      }
      demoAudio.muted = false;
    }
  }

  function hideNowPlaying(immediate = false) {
    clearTimeout(nowHideTimer);
    clearTimeout(nowFadeTimer);
    if (!heroNow) return;
    if (immediate) {
      heroNow.classList.remove('is-on', 'is-out');
      heroNow.hidden = true;
      return;
    }
    heroNow.classList.add('is-out');
    nowFadeTimer = setTimeout(() => {
      heroNow.classList.remove('is-on', 'is-out');
      heroNow.hidden = true;
    }, 380);
  }

  function announceTrackOnce() {
    if (!heroNow || currentDemoIdx < 0 || !demos[currentDemoIdx]) return;
    if (lastAnnouncedIdx === currentDemoIdx) return; // 같은 곡 다시 재생 시 표시하지 않음
    lastAnnouncedIdx = currentDemoIdx;

    clearTimeout(nowHideTimer);
    clearTimeout(nowFadeTimer);
    const prefix = 'now playing: ';
    const full = prefix + demos[currentDemoIdx].title;
    heroNow.innerHTML = [...full].map((ch, i) => {
      if (ch === ' ') return ' ';
      const delay = Math.round(i * 26 + (i % 3) * 18);
      const cls = i >= prefix.length ? 'hero__now-ch is-title' : 'hero__now-ch';
      const safe = ch.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      return `<span class="${cls}" style="--d:${delay}ms">${safe}</span>`;
    }).join('');
    heroNow.hidden = false;
    heroNow.classList.remove('is-out');
    void heroNow.offsetWidth;
    heroNow.classList.add('is-on');

    // 5초 뒤 자동으로 사라짐
    nowHideTimer = setTimeout(() => {
      hideNowPlaying(false);
    }, 5000);
  }

  function updateGlobePlaySpeed(playing) {
    if (typeof window.setGlobeSpeedMult === 'function') {
      if (logoState === 'sonohoka') {
        // sonohoka 모드: 재생 중에는 8.8 * userSpeedRate 배속, 정지 시에는 0(완전 정지까지 감속)
        window.setGlobeSpeedMult(playing ? 8.8 * userSpeedRate : 0);
      } else {
        // 기본(ohtyn / waveroad) 모드: 원래 속도(1x)
        window.setGlobeSpeedMult(1);
      }
    }
  }

  function setPitchPreserve(preserve) {
    try {
      demoAudio.preservesPitch = preserve;
      demoAudio.mozPreservesPitch = preserve;
      demoAudio.webkitPreservesPitch = preserve;
    } catch (_) { }
  }

  function loadDemoTrack(idx) {
    if (!demos.length) return;
    stopReversePlayback(false);
    currentDemoIdx = ((idx % demos.length) + demos.length) % demos.length;
    const track = demos[currentDemoIdx];
    const encoded = encodeURI(track.src);
    demoAudio.src = encoded;
    virtualTime = 0;
    if (navAudioTip) navAudioTip.textContent = track.title;
    if (heroNowTitle) heroNowTitle.textContent = track.title;
    preloadReverseBuffer(currentDemoIdx, encoded);
  }

  function pickRandomDemo() {
    if (!demos.length) return;
    let nextIdx = Math.floor(Math.random() * demos.length);
    if (demos.length > 1 && nextIdx === currentDemoIdx) {
      nextIdx = (nextIdx + 1) % demos.length;
    }
    loadDemoTrack(nextIdx);
  }

  function stopDemoAudio(immediate = false) {
    userPlaying = false;
    updateGlobePlaySpeed(false);
    if (navAudioBtn) {
      navAudioBtn.classList.remove('is-playing', 'is-scrubbing');
      navAudioBtn.setAttribute('aria-pressed', 'false');
    }

    if (immediate) {
      audioEngaged = false;
      stopReversePlayback(false);
      demoAudio.pause();
      demoAudio.muted = false;
      demoAudio.volume = masterVol;
      demoAudio.playbackRate = userSpeedRate;
      setPitchPreserve(Math.abs(userSpeedRate - 1) < 0.02);
      hideNowPlaying(true);
    }
    // immediate가 아닐 때는 지구본이 멈출 때까지 onFrame에서 회전 속도에 비례해 계속 재생 후 멈춤
  }

  if (navAudioVol) {
    navAudioVol.addEventListener('input', () => {
      masterVol = Math.max(0, Math.min(1, parseFloat(navAudioVol.value) || 0));
      demoAudio.volume = masterVol;
      if (revGain) revGain.gain.value = masterVol;
    });
  }

  function applySpeedSlider(val) {
    userSpeedRate = Math.max(0.5, Math.min(1.6, Number(val) || 1));
    if (navAudioSpd) navAudioSpd.value = String(userSpeedRate);
    if (navAudioSpdLabel) {
      navAudioSpdLabel.textContent = Math.abs(userSpeedRate - 1) < 0.01 ? 'SPD' : `${userSpeedRate.toFixed(2)}x`;
    }
    if (logoState === 'sonohoka') {
      updateGlobePlaySpeed(userPlaying);
    }
  }

  if (navAudioSpd) {
    navAudioSpd.addEventListener('input', () => applySpeedSlider(navAudioSpd.value));
    navAudioSpd.addEventListener('dblclick', () => applySpeedSlider(1));
  }
  if (navAudioSpdLabel) {
    navAudioSpdLabel.addEventListener('dblclick', () => applySpeedSlider(1));
  }

  if (navAudioWrap && navAudioVol) {
    navAudioWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.05 : -0.05;
      masterVol = Math.max(0, Math.min(1, masterVol + step));
      demoAudio.volume = masterVol;
      if (revGain) revGain.gain.value = masterVol;
      navAudioVol.value = masterVol.toFixed(2);
    }, { passive: false });
  }

  function switchNextDemoTrack() {
    if (logoState !== 'sonohoka' || !demos.length) return;
    ensureAudioCtx();
    loadDemoTrack((currentDemoIdx + 1) % demos.length);
    if (userPlaying) {
      audioEngaged = true;
      demoAudio.muted = false;
      setPitchPreserve(false);
      demoAudio.playbackRate = 0.15;
      demoAudio.play().then(() => {
        navAudioBtn.classList.add('is-playing');
        navAudioBtn.setAttribute('aria-pressed', 'true');
        updateGlobePlaySpeed(true);
        announceTrackOnce();
      }).catch(() => { });
    }
  }

  if (navAudioTip) {
    navAudioTip.title = 'Click to switch track';
    navAudioTip.addEventListener('click', (e) => {
      e.stopPropagation();
      switchNextDemoTrack();
    });
  }

  if (navAudioBtn) {
    navAudioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (logoState !== 'sonohoka' || !demos.length) return;
      ensureAudioCtx();
      if (currentDemoIdx < 0) pickRandomDemo();
      if (!userPlaying) {
        userPlaying = true;
        audioEngaged = true;
        demoAudio.muted = false;
        setPitchPreserve(false);
        demoAudio.playbackRate = 0.12;
        demoAudio.play().then(() => {
          navAudioBtn.classList.add('is-playing');
          navAudioBtn.setAttribute('aria-pressed', 'true');
          updateGlobePlaySpeed(true);
          announceTrackOnce();
        }).catch(() => {
          userPlaying = false;
          updateGlobePlaySpeed(false);
        });
      } else {
        stopDemoAudio(false);
      }
    });
    // 우클릭 시 다른 데모 곡으로 전환
    navAudioBtn.addEventListener('contextmenu', (e) => {
      if (logoState !== 'sonohoka' || !demos.length) return;
      e.preventDefault();
      switchNextDemoTrack();
    });
  }

  // 회전 중인 글로브를 손으로 '탁' 잡았을 때 0.08초간의 미세한 바이닐/테이프 마찰음
  function playBrakeFriction(speedMag = 1) {
    const ctx = ensureAudioCtx();
    if (!ctx || masterVol <= 0.01) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const startFreq = Math.min(220, 95 + speedMag * 14);
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.085);

    const amp = Math.min(0.18, 0.04 + speedMag * 0.015) * masterVol;
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  /* ---------- sonohoka 모드 지구본 회전 속도 1:1 비례 오디오 엔진 ---------- */
  window.GlobeAudio = {
    onGrab(speedMag = 0) {
      if (logoState !== 'sonohoka' || !demos.length) return;
      ensureAudioCtx();
      if (currentDemoIdx < 0) pickRandomDemo();
      if (speedMag > 0.4) {
        playBrakeFriction(speedMag);
      }
      audioEngaged = true;
      virtualTime = demoAudio.currentTime || 0;
      setPitchPreserve(false);
      if (navAudioBtn) navAudioBtn.classList.add('is-scrubbing');
    },
    onRelease() {
      if (logoState !== 'sonohoka') return;
      if (navAudioBtn) navAudioBtn.classList.remove('is-scrubbing');
    },
    onFrame(playRatio, dt, isDragging) {
      if (logoState !== 'sonohoka' || !audioEngaged) return;

      // 지구본이 거의 멈춘 상태 (|playRatio| <= 0.025)
      if (Math.abs(playRatio) <= 0.025) {
        if (isReversing) stopReversePlayback(true);
        if (!demoAudio.paused && !userPlaying) {
          demoAudio.pause();
          demoAudio.volume = masterVol;
        } else if (!demoAudio.paused && isDragging) {
          demoAudio.pause();
          virtualTime = demoAudio.currentTime;
        }
        if (!userPlaying && !isDragging) {
          audioEngaged = false;
        }
        return;
      }

      // 일시정지 상태에서 손으로 지구본을 돌려 소리가 나기 시작할 때도 처음 곡이면 now playing 표시
      if (Math.abs(playRatio) > 0.15) {
        announceTrackOnce();
      }

      if (playRatio > 0.025) {
        // 정방향 회전 (모터 가속/감속 중이거나 손으로 정방향 스크러빙 중)
        if (isReversing) {
          stopReversePlayback(true);
        }
        const rate = Math.max(0.08, Math.min(3.8, playRatio));
        // 목표 속도에 도달해 안정적으로 돌고 있을 때만 (1.0x 부근) 피치 보정 적용
        const isSteadyOne = !isDragging && userPlaying && Math.abs(rate - 1) < 0.02 && Math.abs(userSpeedRate - 1) < 0.02;
        setPitchPreserve(isSteadyOne);
        demoAudio.playbackRate = rate;
        // 극저속(정지 직전 0.025 ~ 0.14) 구간에서는 볼륨도 자연스럽게 감쇠
        demoAudio.volume = rate < 0.14 ? masterVol * (rate / 0.14) : masterVol;
        if (demoAudio.paused) {
          demoAudio.play().catch(() => { });
        }
        virtualTime = demoAudio.currentTime;
      } else if (playRatio < -0.025) {
        // 역방향 회전 (손으로 오른쪽으로 돌리거나 역방향 관성 회전 중)
        const revSpeed = Math.max(0.18, Math.min(3.4, Math.abs(playRatio)));
        const dur = demoAudio.duration;
        if (Number.isFinite(dur) && dur > 0) {
          virtualTime = ((virtualTime - revSpeed * (dt / 1000)) % dur + dur) % dur;
        }
        startReversePlayback(revSpeed);
      }
    },
  };

    function applyLogoState(nextState, stage = 1) {
      const isSonohoka = nextState === 'sonohoka';
      const isWaveroad = nextState === 'waveroad';
      if (logoState !== nextState) {
        logoState = nextState;
        const { src, alt } = LOGOS[nextState];

        heroLogoImg.classList.remove('is-switching', 'is-stage-1', 'is-stage-2', 'is-stage-3', 'is-tremor');
        void heroLogoImg.offsetWidth; // reflow for animation restart
        heroLogoImg.src = src;
        heroLogoImg.alt = alt;
        if (isSonohoka) {
          heroLogoImg.classList.add('is-tremor');
        } else if (stage >= 3) {
          heroLogoImg.classList.add('is-stage-3');
        } else if (stage === 2) {
          heroLogoImg.classList.add('is-stage-2');
        } else {
          heroLogoImg.classList.add('is-stage-1');
        }

        if (aboutLogoImg) {
          aboutLogoImg.classList.remove('is-switching');
          void aboutLogoImg.offsetWidth;
          aboutLogoImg.src = src;
          aboutLogoImg.alt = alt;
          aboutLogoImg.classList.add('is-switching');
        }

        if (isSonohoka) {
          lastAnnouncedIdx = -1;
          pickRandomDemo();
          if (navAudioWrap) navAudioWrap.hidden = false;
          updateGlobePlaySpeed(userPlaying);
        } else {
          stopDemoAudio(true);
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

      // sonohoka(다크모드) 상태에서 다시 누르면 원래대로(ohtyn) 복귀
      // (단, 5연타 진입 직후 0.65초 동안의 여분 클릭은 무시)
      if (logoState === 'sonohoka') {
        if (now - sonohokaEnteredAt < 650) return;
        clickTimes = [];
        applyLogoState('ohtyn', 1);
        return;
      }

      const lastClick = clickTimes[clickTimes.length - 1] || 0;
      if (now - lastClick > 500) {
        clickTimes = [];
      }
      clickTimes = clickTimes.filter((t) => now - t < 1800);
      clickTimes.push(now);

      // 빠르게 5번 연속 클릭 시 sonohoka 다크모드로 진입
      if (clickTimes.length >= 5) {
        clickTimes = [];
        sonohokaEnteredAt = now;
        applyLogoState('sonohoka', 3);
        return;
      }

      // 1~4번째 클릭: 씹힘 없이 매 클릭마다 즉시 ohtyn ↔ waveroad 전환 + 점진적으로 강해지는 진동
      const stage = clickTimes.length >= 4 ? 3 : clickTimes.length === 3 ? 2 : 1;
      applyLogoState(logoState === 'ohtyn' ? 'waveroad' : 'ohtyn', stage);
    }

    heroLogoBtn.addEventListener('click', handleLogoActivate);
    heroLogoBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleLogoActivate();
      }
    });

    /* ---------- About + 언어 (초기상태: 영어, 순서: EN / KR / JP, 높이는 JP 기준 고정) ---------- */
    const langSwitch = $('#lang-switch');
    const aboutText = $('#about-text');
    const moreWorksBtn = $('#more-works');
    const LANG_ATTR = { en: 'en', kr: 'ko', jp: 'ja' };
    let currentLang = 'en';

    function syncAboutHeightToJp() {
      if (!aboutText || !S.about.jp) return;
      const prevHtml = aboutText.innerHTML;
      const prevLang = aboutText.lang;
      const prevData = aboutText.dataset.lang;
      aboutText.style.minHeight = '';
      aboutText.innerHTML = S.about.jp.map((p) => `<p>${p}</p>`).join('');
      aboutText.lang = LANG_ATTR.jp;
      aboutText.dataset.lang = 'jp';
      const jpHeight = aboutText.offsetHeight;
      aboutText.innerHTML = prevHtml;
      aboutText.lang = prevLang;
      aboutText.dataset.lang = prevData;
      if (jpHeight > 0) {
        aboutText.style.minHeight = `${jpHeight}px`;
      }
    }

    function setLang(lang, immediate = false) {
      currentLang = lang;
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
    syncAboutHeightToJp();
    window.addEventListener('resize', syncAboutHeightToJp, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncAboutHeightToJp).catch(() => { });
    }

    // More Works 버튼: 아직 페이지 구축 전이므로 클릭 시 이동하지 않고 도리도리(흔들림) 연출
    if (moreWorksBtn) {
      moreWorksBtn.addEventListener('click', (e) => {
        e.preventDefault();
        moreWorksBtn.classList.remove('is-shaking');
        void moreWorksBtn.offsetWidth;
        moreWorksBtn.classList.add('is-shaking');
      });
    }

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
            <div class="card__overlay-top">
              <span class="card__overlay-no">${no}</span>
              <span class="card__overlay-tag">${w.tag === 'Release' ? '♪ RELEASE' : esc(w.tag.toUpperCase())}</span>
            </div>
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
