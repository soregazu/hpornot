/* ==========================================================
   회전하는 지구본 (SVG)
   - 극축(세로축) 기준 회전 + 마우스/터치 좌우 드래그 자전(관성 포함)
   - 앞면 반구의 경도선 + 3개 위선(적도·북회귀선·남회귀선)
   - 2~3초마다 1~2개씩 랜덤 궤도로 지나가는 인공위성 잔상
   - sonohoka 모드에서 지구본 홀드/드래그 시 데모 오디오 턴테이블 스크러빙 연동
   ========================================================== */
(function () {
  const cfg = window.SITE.globe;
  const hero = document.getElementById('hero');
  const svg = document.getElementById('globe');
  const defs = document.getElementById('globe-defs');
  const gLat = document.getElementById('globe-lat');
  const gLon = document.getElementById('globe-lon');
  const gSat = document.getElementById('globe-sats');
  const NS = 'http://www.w3.org/2000/svg';
  const RAD = Math.PI / 180;

  const make = (tag, parent, cls) => {
    const el = document.createElementNS(NS, tag);
    if (cls) el.setAttribute('class', cls);
    parent.appendChild(el);
    return el;
  };

  const lonPaths = Array.from({ length: cfg.meridians }, () => make('path', gLon, 'globe__line'));
  const latLines = cfg.parallels.map(() => make('line', gLat, 'globe__line'));
  const limb = make('ellipse', gLat, 'globe__line'); // 바깥 윤곽

  /* ---------- 인공위성 잔상 풀(Pool) ---------- */
  const POOL_SIZE = 4;
  const satPool = Array.from({ length: POOL_SIZE }, (_, idx) => {
    const grad = make('linearGradient', defs);
    const gradId = `sat-grad-${idx}`;
    grad.setAttribute('id', gradId);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');

    const stop0 = make('stop', grad);
    stop0.setAttribute('offset', '0%');
    stop0.setAttribute('stop-color', 'var(--sat-stroke, var(--ink-2))');
    stop0.setAttribute('stop-opacity', '0');

    const stop1 = make('stop', grad);
    stop1.setAttribute('offset', '55%');
    stop1.setAttribute('stop-color', 'var(--sat-stroke, var(--ink-2))');
    stop1.setAttribute('stop-opacity', '0.32');

    const stop2 = make('stop', grad);
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'var(--sat-stroke, var(--ink))');
    stop2.setAttribute('stop-opacity', '0.85');

    const path = make('path', gSat, 'globe__sat');
    path.setAttribute('stroke', `url(#${gradId})`);
    path.style.opacity = 0;

    return { path, grad, active: false };
  });

  let W = 0, H = 0, cx = 0, cy = 0, Rx = 0, Ry = 0;

  function resize() {
    const r = svg.getBoundingClientRect();
    W = r.width; H = r.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    cx = W / 2; cy = H / 2;
    Rx = W / 2 - 2;          // 가로로 꽉 차게
    Ry = H * 0.92;           // 상하 잘림 비율 (북회귀·남회귀·적도 3개 위선이 안정적으로 보이도록)
    limb.setAttribute('cx', cx); limb.setAttribute('cy', cy);
    limb.setAttribute('rx', Rx); limb.setAttribute('ry', Ry);

    cfg.parallels.forEach((lat, i) => {
      const y = cy - Ry * Math.sin(lat * RAD);
      const hw = Rx * Math.cos(lat * RAD);
      const l = latLines[i];
      l.setAttribute('x1', cx - hw); l.setAttribute('x2', cx + hw);
      l.setAttribute('y1', y); l.setAttribute('y2', y);
    });
  }

  /* 3D 구면 위 대원(great circle) 궤도 좌표 -> 2D 투영 */
  function orbitPoint(sat, uDeg) {
    const u = uDeg * RAD;
    const x0 = Math.sin(u);
    const y0 = Math.sin(sat.latOffset) * Math.cos(u);
    const z0 = Math.cos(sat.latOffset) * Math.cos(u);
    const X = x0 * sat.cosInc - y0 * sat.sinInc;
    const Y = x0 * sat.sinInc + y0 * sat.cosInc;
    const Z = z0;
    return {
      x: cx + Rx * X,
      y: cy - Ry * Y,
      z: Z,
    };
  }

  function spawnSatellite(now, delay = 0) {
    const slot = satPool.find((s) => !s.active);
    if (!slot) return;

    const baseAngle = (Math.random() * 110 - 55) * RAD;
    const flip = Math.random() < 0.5 ? 0 : Math.PI;
    const inc = baseAngle + flip;
    const latOffset = (Math.random() * 44 - 22) * RAD;

    const span = 70 + Math.random() * 35;
    const centerShift = (Math.random() - 0.5) * 24;
    const uStart = -span / 2 + centerShift;
    const uEnd = span / 2 + centerShift;
    const tailDeg = 22 + Math.random() * 12;
    const duration = 1150 + Math.random() * 550;

    slot.active = true;
    slot.startTime = now + delay;
    slot.duration = duration;
    slot.uStart = uStart;
    slot.uEnd = uEnd;
    slot.tailDeg = tailDeg;
    slot.latOffset = latOffset;
    slot.cosInc = Math.cos(inc);
    slot.sinInc = Math.sin(inc);
    slot.path.style.opacity = 0;
  }

  function updateSatellites(now) {
    const SEGMENTS = 10;
    satPool.forEach((sat) => {
      if (!sat.active) return;
      const elapsed = now - sat.startTime;
      if (elapsed < 0) return;

      const t = elapsed / sat.duration;
      if (t >= 1) {
        sat.active = false;
        sat.path.style.opacity = 0;
        return;
      }

      const totalTravel = (sat.uEnd - sat.uStart) + sat.tailDeg;
      const uHead = sat.uStart + t * totalTravel;
      const uTail = Math.max(sat.uStart, uHead - sat.tailDeg);
      const uTip = Math.min(sat.uEnd, uHead);

      if (uTip <= uTail + 0.5) {
        sat.path.style.opacity = 0;
        return;
      }

      let d = '';
      let pTail = null, pTip = null;
      for (let s = 0; s <= SEGMENTS; s++) {
        const u = uTail + (uTip - uTail) * (s / SEGMENTS);
        const pt = orbitPoint(sat, u);
        if (s === 0) {
          pTail = pt;
          d += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        } else {
          if (s === SEGMENTS) pTip = pt;
          d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }
      }

      sat.path.setAttribute('d', d);
      sat.grad.setAttribute('x1', pTail.x.toFixed(1));
      sat.grad.setAttribute('y1', pTail.y.toFixed(1));
      sat.grad.setAttribute('x2', pTip.x.toFixed(1));
      sat.grad.setAttribute('y2', pTip.y.toFixed(1));

      const env = Math.sin(t * Math.PI);
      sat.path.style.opacity = Math.max(0, Math.min(1, env * 1.15)).toFixed(3);
    });
  }

  function frame(rot) {
    const step = 360 / cfg.meridians;

    // 경도선: 앞면(cos>0)의 반 타원 호
    lonPaths.forEach((p, i) => {
      const lon = (i * step + rot) * RAD;
      const c = Math.cos(lon), s = Math.sin(lon);
      if (c < -1e-3) { p.style.opacity = 0; return; }
      const rx = Math.abs(s) * Rx;
      const sweep = s >= 0 ? 1 : 0;
      p.setAttribute('d', `M ${cx} ${cy - Ry} A ${rx} ${Ry} 0 0 ${sweep} ${cx} ${cy + Ry}`);
      p.style.opacity = 1;
    });
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseSpeed = 360 / (cfg.secondsPerTurn * 1000) * (reduce ? 0.25 : 1);
  let targetDir = 1;
  let currentDir = 1;
  let targetSpeedMult = 1;
  let currentSpeedMult = 1;
  let rot = 0, last = performance.now();

  // 외부에서 지구본 회전 방향 제어 (1: 정방향, -1: 역방향)
  window.setGlobeReverse = function (reversed) {
    targetDir = reversed ? -1 : 1;
  };

  // 외부에서 지구본 회전 배속 제어 (0: 정지, 1: 기본, >1: CD/테이프 재생 가속)
  window.setGlobeSpeedMult = function (mult) {
    const n = Number(mult);
    targetSpeedMult = Number.isFinite(n) ? Math.max(0, n) : 1;
  };

  /* ---------- 좌우 드래그 회전 (관성 + sonohoka 턴테이블 스크러빙) ---------- */
  const PLAY_BASE_MULT = 8.8;
  let dragging = false;
  let dragLastX = 0;
  let dragVel = 0;       // deg per ms (손을 뗀 뒤 관성)
  let dragOmega = 0;     // deg per ms (잡고 돌리는 중의 각속도)
  let grabSlipOmega = 0; // deg per ms (잡는 순간 0.05~0.1초간 마찰로 미끄러지며 멈추는 각속도)
  let lastMoveTime = 0;

  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#hero-logo-btn')) return;
    // 잡는 순간의 회전 속도를 물려받아 0.05~0.1초 동안 마찰 제동(Slip-Brake)
    grabSlipOmega = baseSpeed * currentDir * currentSpeedMult + dragVel;
    const speedMag = Math.abs(grabSlipOmega) / baseSpeed;
    dragging = true;
    dragLastX = e.clientX;
    dragVel = 0;
    dragOmega = 0;
    lastMoveTime = performance.now();
    hero.classList.add('is-dragging');

    try { hero.setPointerCapture(e.pointerId); } catch (_) { }
    if (window.GlobeAudio && typeof window.GlobeAudio.onGrab === 'function') {
      window.GlobeAudio.onGrab(speedMag);
    }
  });

  hero.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragLastX;
    dragLastX = e.clientX;
    if (dx === 0) return;
    const now = performance.now();
    const dtMove = Math.max(8, now - lastMoveTime);
    lastMoveTime = now;
    grabSlipOmega *= 0.25;
    const degDelta = (dx / Math.max(300, W)) * 150;
    rot = (rot + degDelta + 3600) % 360;
    const instOmega = degDelta / dtMove;
    dragOmega = dragOmega * 0.35 + instOmega * 0.65;
    dragVel = dragOmega * 0.65;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    grabSlipOmega = 0;
    hero.classList.remove('is-dragging');
    if (window.GlobeAudio && typeof window.GlobeAudio.onRelease === 'function') {
      window.GlobeAudio.onRelease(dragVel);
    }
  };
  hero.addEventListener('pointerup', endDrag);
  hero.addEventListener('pointercancel', endDrag);

  // 인공위성 스폰 타이머 (2~3초마다 1~2개씩 랜덤)
  const [minInt, maxInt] = cfg.satInterval || [2000, 3000];
  let nextSpawn = last + 600;

  function loop(now) {
    const dt = Math.min(64, now - last);
    last = now;

    currentDir += (targetDir - currentDir) * Math.min(1, dt * 0.0045);

    let actualOmega = 0; // deg per ms
    if (!dragging) {
      // 실제 테이프/턴테이블 모터처럼 서서히 가속·감속 (기존 대비 약 20% 빠르게 반응)
      const speedRate = targetSpeedMult > currentSpeedMult ? 0.0021 : 0.00185;
      currentSpeedMult += (targetSpeedMult - currentSpeedMult) * Math.min(1, dt * speedRate);
      if (targetSpeedMult === 0 && currentSpeedMult < 0.015) currentSpeedMult = 0;

      // 드래그 관성 감쇠 + 모터 자전
      dragVel *= Math.pow(0.93, dt / 16);
      if (Math.abs(dragVel) < 1e-5) dragVel = 0;
      actualOmega = baseSpeed * currentDir * currentSpeedMult + dragVel;
      rot = (rot + actualOmega * dt + 3600) % 360;
    } else {
      // 손으로 잡는 순간 0.05~0.1초 동안 마찰로 살짝 밀리다가 '턱' 멈추는 물리 제동
      grabSlipOmega *= Math.pow(0.36, dt / 16);
      if (Math.abs(grabSlipOmega) < 1e-4) grabSlipOmega = 0;
      if (grabSlipOmega !== 0) {
        rot = (rot + grabSlipOmega * dt + 3600) % 360;
      }

      currentSpeedMult *= Math.pow(0.62, dt / 16);
      if (now - lastMoveTime > 42) {
        dragOmega *= Math.pow(0.65, dt / 16);
        dragVel *= Math.pow(0.65, dt / 16);
        if (Math.abs(dragOmega) < 1e-4) dragOmega = 0;
      }
      actualOmega = grabSlipOmega + dragOmega;
    }

    // 지구본의 실제 회전 속도 비율(sonohoka 정방향 1.0x 기준)을 오디오 엔진에 전달
    if (window.GlobeAudio && typeof window.GlobeAudio.onFrame === 'function') {
      const playRatio = -actualOmega / (baseSpeed * PLAY_BASE_MULT);
      window.GlobeAudio.onFrame(playRatio, dt, dragging);
    }

    if (!reduce && now >= nextSpawn) {
      const count = Math.random() < 0.45 ? 2 : 1;
      spawnSatellite(now, 0);
      if (count === 2) {
        spawnSatellite(now, 240 + Math.random() * 380);
      }
      nextSpawn = now + minInt + Math.random() * (maxInt - minInt);
    }

    frame(rot);
    updateSatellites(now);
    requestAnimationFrame(loop);
  }

  new ResizeObserver(() => { resize(); frame(rot); }).observe(svg);
  resize();
  requestAnimationFrame(loop);
})();
