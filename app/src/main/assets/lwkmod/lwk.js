/* ===== LwK / lowKey.io — extra features layer =====
   Runs in the page after main-mt.js. Settings come from the popup via tinyscr.js (postMessage bridge).
   Every game-internal access is guarded, so a missing global just disables that feature. */
(function () {
  "use strict";
  if (window.__lwkLoaded) return;
  window.__lwkLoaded = 1;

  var BRAND = "LowKey.io";
  var DEF = {
    hud: true, fps: false, corner: "tl", goal: 0, toast: true,
    aim: false, aimColor: "gold", bright: 100, sat: 100, vig: false,
    chime: false, step: 1000, vol: 60,
    boost: false, boostKey: "y", boss: false, bossKey: "o",
    macro: true, macroKey: "t", ooKey: "o", mapKey: "l",
    hudOpacity: 100, hudScale: 100, reducedMotion: false, lowPower: false, perfFreq: "full",
    spineKey: "p", cleanKey: "6", clean: false, hideKeys: false, stream: false, hudCompact: false, breakMin: 0, tint: 0, eyesKey: "u",
    killHi: false, killRange: 260,
    foodRadar: false, foodMin: 40, targetInd: false, targetMode: "longest",
    killPath: true, pathRange: 900,
    spineView: false, hideEyes: false,
    hitMarker: true, hitSound: false
  };
  var cfg = {}, k;
  for (k in DEF) cfg[k] = DEF[k];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    (parent || document.body).appendChild(e);
    return e;
  }
  function fmt(n) { try { return Number(n).toLocaleString(); } catch (e) { return String(n); } }
  function clock(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return m + ":" + ("0" + (s % 60)).slice(-2);
  }
  function alive() {
    try { return !!(typeof playing !== "undefined" && playing && typeof snake !== "undefined" && snake); }
    catch (e) { return false; }
  }
  function score() {
    try {
      if (typeof snake === "undefined" || !snake || typeof fpsls === "undefined" || !fpsls.length) return 0;
      var s = snake.sct;
      var v = Math.floor(15 * (fpsls[s] + snake.fam / fmlts[s] - 1) - 5);
      return isFinite(v) ? Math.max(0, v) : 0;
    } catch (e) { return 0; }
  }
  /* PERF: is #login shown?  Slither toggles it through inline style.display, so read that first (no style recalc);
     only fall back to getComputedStyle when there is no inline value. */
  function loginShown(lg) {
    var dsp = lg.style.display;
    if (dsp) return dsp !== "none";
    return window.getComputedStyle(lg).display !== "none";
  }
  /* PERF: soft glow drawn as two widened, low-alpha strokes of the CURRENT path. Replaces ctx.shadowBlur, which makes
     Chrome run a separate blur pass for every shadowed draw call. */
  function glowStroke(ctx, rgb, a, w) {
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(" + rgb + "," + (a * 0.10) + ")"; ctx.lineWidth = w * 2.8; ctx.stroke();
    ctx.strokeStyle = "rgba(" + rgb + "," + (a * 0.17) + ")"; ctx.lineWidth = w * 1.8; ctx.stroke();
    ctx.restore();
  }

  function play(file) {
    try {
      var id = localStorage.getItem("tinyscrID");
      if (!id) return;
      var a = new Audio("https://lwkmod.local/" + file);
      a.volume = Math.max(0, Math.min(1, cfg.vol / 100));
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  /* ---------- styles ---------- */
  function addCss() {
    if ($("lwk-extra-css")) return;
    var st = document.createElement("style");
    st.id = "lwk-extra-css";
    st.textContent =
      ".lwk-hud{position:fixed;z-index:8;min-width:132px;padding:9px 12px;border-radius:12px;pointer-events:none;font:600 12px 'Segoe UI Variable','Segoe UI',Inter,Arial,sans-serif;color:#eadfca;" +
      "background:linear-gradient(170deg,rgba(26,26,34,.82),rgba(11,11,16,.82));border:1px solid rgba(217,185,138,.32);box-shadow:0 8px 24px rgba(0,0,0,.45);display:none;}" +
      ".lwk-hud.tl{top:12px;left:12px}.lwk-hud.tr{top:12px;right:12px}.lwk-hud.bl{bottom:64px;left:12px}.lwk-hud.br{bottom:64px;right:12px}" +
      ".lwk-hud .r{display:flex;justify-content:space-between;gap:14px;line-height:1.7}.lwk-hud .r b{color:#a89574;font-weight:600;letter-spacing:1.2px;font-size:10px;text-transform:uppercase}" +
      ".lwk-hud .r span{color:#fff3d6}.lwk-hud .bar{height:5px;margin-top:6px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden}" +
      ".lwk-hud .bar i{display:block;height:100%;background:linear-gradient(90deg,#a97f45,#fff3d6);border-radius:5px}" +
      ".lwk-hud .g{margin-top:5px;font-size:10px;color:#a89574;letter-spacing:1px}" +
      ".lwk-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:9;padding:9px 18px;border-radius:999px;pointer-events:none;opacity:0;transition:opacity .25s;" +
      "font:600 13px 'Segoe UI Variable','Segoe UI',Inter,Arial,sans-serif;letter-spacing:.6px;color:#1a1408;background:linear-gradient(135deg,#f6e6c4,#d9b98a 55%,#b8935c);box-shadow:0 8px 22px rgba(0,0,0,.5);white-space:nowrap}" +
      ".lwk-toast.on{opacity:1}" +
      ".lwk-vig{position:fixed;inset:0;z-index:5;pointer-events:none;display:none;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 52%,rgba(0,0,0,.72) 100%)}" +
      ".lwk-aim{position:fixed;left:0;top:0;z-index:6;pointer-events:none}" +
      ".lwk-kh{position:fixed;left:0;top:0;z-index:6;pointer-events:none}" +
      ".lwk-logo-text{position:fixed;z-index:7;transform:translate(-50%,-50%);pointer-events:none;display:none;white-space:nowrap;font-family:Didot,'Bodoni MT','Playfair Display',Georgia,serif;font-weight:700;letter-spacing:4px;" +
      "background:linear-gradient(180deg,#fff3d6 0%,#e6c58e 45%,#a97f45 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 10px rgba(217,185,138,.4))}" +
      ".lwk-boss{position:fixed;inset:0;z-index:2147483647;display:none;background:#f8f9fa;font-family:Arial,sans-serif;color:#202124}" +
      ".lwk-boss .bar1{height:56px;background:#fff;border-bottom:1px solid #dadce0;display:flex;align-items:center;padding:0 18px;gap:14px;font-size:18px}" +
      ".lwk-boss .dot{width:28px;height:36px;background:#4285f4;border-radius:4px}" +
      ".lwk-boss .page{width:min(816px,92%);height:calc(100% - 110px);margin:24px auto;background:#fff;border:1px solid #dadce0;box-shadow:0 1px 3px rgba(60,64,67,.2);padding:64px 72px;font-size:15px;line-height:1.7}";
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- toast ---------- */
  var toastEl = null, toastTimer = 0;
  function toast(msg, force) {
    if (!force && !cfg.toast) return;
    if (!toastEl) toastEl = el("div", "lwk-toast lwk-own");
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, 2600);
  }

  /* ---------- HUD ---------- */
  var hudEl = null, vigEl = null, hudLast = "", hudKey = "", hudShown = null;
  var S = { alive: false, start: 0, score: 0, lastMile: 0, goalHit: false, runs: 0, sum: 0, best: 0 };
  var allBest = 0;
  try { allBest = parseInt(localStorage.getItem("lwk_best"), 10) || 0; } catch (e) {}
  var fpsVal = 0;

  function renderHud() {
    if (!hudEl) hudEl = el("div", "lwk-hud lwk-own");
    var hk = (cfg.corner || "tl") + "|" + (cfg.hudCompact ? 1 : 0) + "|" + (cfg.hudOpacity || 100) + "|" + (cfg.hudScale || 100);
    if (hk !== hudKey) {   /* PERF: styles/class only rewritten when a HUD setting changed (was: every 200 ms) */
      hudKey = hk;
      hudEl.className = "lwk-hud lwk-own " + (cfg.corner || "tl") + (cfg.hudCompact ? " compact" : "");
      hudEl.style.opacity = String((cfg.hudOpacity || 100) / 100);
      hudEl.style.transform = "scale(" + ((cfg.hudScale || 100) / 100) + ")";
      hudEl.style.transformOrigin = (cfg.corner === "tr" || cfg.corner === "br") ? "right center" : "left center";
    }
    var show = (cfg.hud || cfg.fps) && S.alive;
    if (show !== hudShown) { hudShown = show; hudEl.style.display = show ? "block" : "none"; }
    if (!show) return;
    var h = "";
    if (cfg.hudCompact) {
      var bs = Math.max(allBest, S.score);
      h = '<div class="c1">' + (cfg.fps ? "<b>FPS</b> " + fpsVal + "<i></i>" : "") +
        (cfg.hud ? "<b>SCORE</b> " + fmt(S.score) + "<i></i><b>BEST</b> " + fmt(bs) + "<i></i>" + clock(Date.now() - S.start) : "") + "</div>";
    } else {
    if (cfg.fps) h += '<div class="r"><b>FPS</b><span>' + fpsVal + "</span></div>";
    if (cfg.hud) {
      var best = Math.max(allBest, S.score);
      h += '<div class="r"><b>Score</b><span>' + fmt(S.score) + "</span></div>";
      h += '<div class="r"><b>Best</b><span>' + fmt(best) + "</span></div>";
      h += '<div class="r"><b>Alive</b><span>' + clock(Date.now() - S.start) + "</span></div>";
      h += '<div class="r"><b>Runs</b><span>' + S.runs + (S.runs ? " · avg " + fmt(Math.round(S.sum / S.runs)) : "") + "</span></div>";
      if (cfg.goal > 0) {
        var pct = Math.max(0, Math.min(100, Math.round(S.score * 100 / cfg.goal)));
        h += '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="g">GOAL ' + fmt(cfg.goal) + " · " + pct + "%</div>";
      }
    }
    }
    if (h !== hudLast) { hudEl.innerHTML = h; hudLast = h; }
  }

  var stickyOn = false;

  function endRun() {
    var sc = S.score, ms = Date.now() - S.start;
    S.alive = false;
    S.runs++; S.sum += sc;
    var isBest = sc > allBest && sc > 0;
    if (isBest) { allBest = sc; try { localStorage.setItem("lwk_best", String(sc)); } catch (e) {} }
    if (sc > 0) recordRun(sc, ms);
    if (sc > 0) toast("Run over · " + fmt(sc) + " · " + clock(ms) + (isBest ? " · NEW BEST" : ""));
    stickyOn = false;
    if (OOE.on) { OOE.on = false; OOE.target = null; ooClear(); }
    if (M.on) macroStop(false);
  }

  function tick() {
    var a = alive();
    if (a && !S.alive) { S.alive = true; S.start = Date.now(); S.score = 0; S.lastMile = 0; S.goalHit = false; }
    else if (!a && S.alive) endRun();
    if (a) {
      S.score = score();
      if (cfg.chime && cfg.step > 0) {
        var m = Math.floor(S.score / cfg.step);
        if (m > S.lastMile) { S.lastMile = m; play("beep.mp3"); toast("Milestone · " + fmt(m * cfg.step)); }
      }
      if (cfg.goal > 0 && !S.goalHit && S.score >= cfg.goal) {
        S.goalHit = true; play("chat.mp3"); toast("Goal reached · " + fmt(cfg.goal));
      }
    }
    renderHud();
    window.__lwkSpine = !!(cfg.spineView && S.alive && !spFail);
    brandWatch(!S.alive);          /* PERF: no DOM observer while playing */
    if (S.alive) fixTitle();
    layerTick();
    dashTick();
  }

  /* ---------- aim guide ---------- */
  var aimCv = null, aimCtx = null, mx = 0, my = 0, aimDirty = false;
  var AIM_COL = { gold: "230,197,142", white: "255,255,255", red: "255,90,90", green: "87,227,137", cyan: "90,215,255" };
  window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, true);
  function sizeAim() {
    if (!aimCv) return;
    aimCv.width = window.innerWidth; aimCv.height = window.innerHeight;
  }
  function drawAim() {
    if (!cfg.aim || !S.alive) {
      if (aimDirty && aimCtx) { aimCtx.clearRect(0, 0, aimCv.width, aimCv.height); aimDirty = false; }
      return;
    }
    if (!aimCv) {
      aimCv = el("canvas", "lwk-aim lwk-own");
      aimCtx = aimCv.getContext("2d");
      sizeAim();
    }
    var cx = aimCv.width / 2, cy = aimCv.height / 2, dx = mx - cx, dy = my - cy;
    if (M.on) { dx = M.aimX; dy = M.aimY; }
    var d = Math.sqrt(dx * dx + dy * dy);
    aimCtx.clearRect(0, 0, aimCv.width, aimCv.height);
    aimDirty = true;
    if (d < 30) return;
    var ux = dx / d, uy = dy / d, L = Math.min(d, 320), rgb = AIM_COL[cfg.aimColor] || AIM_COL.gold;
    aimCtx.lineWidth = 2;
    aimCtx.setLineDash([9, 9]);
    aimCtx.strokeStyle = "rgba(" + rgb + ",.55)";
    aimCtx.beginPath();
    aimCtx.moveTo(cx + ux * 34, cy + uy * 34);
    aimCtx.lineTo(cx + ux * L, cy + uy * L);
    aimCtx.stroke();
    aimCtx.setLineDash([]);
    aimCtx.fillStyle = "rgba(" + rgb + ",.85)";
    aimCtx.beginPath();
    aimCtx.moveTo(cx + ux * (L + 10), cy + uy * (L + 10));
    aimCtx.lineTo(cx + ux * (L - 4) - uy * 7, cy + uy * (L - 4) + ux * 7);
    aimCtx.lineTo(cx + ux * (L - 4) + uy * 7, cy + uy * (L - 4) - ux * 7);
    aimCtx.closePath();
    aimCtx.fill();
  }
  window.addEventListener("resize", sizeAim);

  /* ---------- kill-range head highlight ----------
     Marks any visible enemy head red when it is close enough (killRange, world units)
     to your own head that turning into them right now would kill them.
     Purely visual — draws a ring on an overlay canvas, never touches your mouse/controls. */
  var khCv = null, khCtx = null;
  function sizeKh() {
    if (!khCv) return;
    khCv.width = window.innerWidth; khCv.height = window.innerHeight;
  }
  /* Advanced kill highlight + hitmarker (visual only):
     - rotating corner-bracket reticle, colour goes yellow -> red as the enemy gets closer
     - distance + closing speed, short dashed "where they're heading" line
     - the enemy that will reach you soonest gets a bigger reticle tagged LOCK
     - hitmarker: when an enemy that was inside your kill range dies, an X flashes there + "KILL" */
  var khVel = new WeakMap(), khSeen = new Map(), khDead = new WeakSet(), hitMarks = [], khMe = null, khKills = 0;

  function khColor(ratio, a) { return "hsla(" + Math.round(52 * Math.max(0, Math.min(1, ratio))) + ",100%,55%," + a + ")"; }

  function drawBrackets(ctx, x, y, r, rot, len) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    for (var q = 0; q < 4; q++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(r, -r + len); ctx.lineTo(r, -r); ctx.lineTo(r - len, -r); ctx.stroke();
    }
    ctx.restore();
  }

  function addHit(wx, wy) {
    khKills++;
    hitMarks.push({ x: wx, y: wy, t: performance.now(), n: khKills });
    if (cfg.hitSound) play("beep.mp3");
  }

  var khDirty = false;    /* PERF: overlay canvas is only cleared when something was drawn on it last frame */
  function drawKillHi() {
    var need = cfg.killHi || cfg.hitMarker;
    if (!need || !S.alive) {
      if (khDirty && khCtx) { khCtx.clearRect(0, 0, khCv.width, khCv.height); khDirty = false; }
      if (khSeen.size) khSeen.clear();
      hitMarks.length = 0; khMe = null;
      if (!S.alive) khKills = 0;
      return;
    }
    try {
      if (typeof snake === "undefined" || !snake || typeof ef === "undefined" || !ef ||
          typeof gsc === "undefined" || typeof Dl === "undefined" || typeof d === "undefined") return;
    } catch (e) { return; }
    if (!khCv) { khCv = el("canvas", "lwk-kh lwk-own"); khCtx = khCv.getContext("2d"); sizeKh(); }
    var now = performance.now(), W = khCv.width, H = khCv.height, cx = Dl / 2, cy = d / 2;
    var myX = snake.xx + (snake.fx || 0), myY = snake.yy + (snake.fy || 0);
    if (khDirty) { khCtx.clearRect(0, 0, W, H); khDirty = false; }

    /* my own velocity (for closing speed) */
    if (!khMe) khMe = { x: myX, y: myY, t: now, vx: 0, vy: 0 };
    else { var mdt = now - khMe.t; if (mdt >= 16) {
      khMe.vx = 0.7 * khMe.vx + 0.3 * ((myX - khMe.x) / mdt * 1000); khMe.vy = 0.7 * khMe.vy + 0.3 * ((myY - khMe.y) / mdt * 1000);
      khMe.x = myX; khMe.y = myY; khMe.t = now; } }

    var cands = [], i;
    for (i = ef.length - 1; i >= 0; i--) {
      var s = ef[i];
      if (!s || s === snake || typeof s.xx !== "number") continue;
      var wx = s.xx + (s.fx || 0), wy = s.yy + (s.fy || 0);
      var wdx = wx - myX, wdy = wy - myY, wdist = Math.sqrt(wdx * wdx + wdy * wdy);

      if (s.dead_amt) {                                   /* enemy just died */
        var info = khSeen.get(s);
        if (info && !khDead.has(s) && now - info.t < 1500 && cfg.hitMarker) { addHit(wx, wy); }
        khDead.add(s); khSeen.delete(s);
        continue;
      }
      if (!cfg.killHi) {      /* PERF hit-marker only: no velocity tracking / allocation, just remember who was close */
        if (wdist <= cfg.killRange * 1.5) { var inf0 = khSeen.get(s); if (inf0) inf0.t = now; else khSeen.set(s, { x: wx, y: wy, t: now }); }
        continue;
      }
      var v = khVel.get(s);
      if (!v) { v = { x: wx, y: wy, t: now, vx: 0, vy: 0 }; khVel.set(s, v); }
      else { var dt = now - v.t; if (dt >= 16) {
        v.vx = 0.7 * v.vx + 0.3 * ((wx - v.x) / dt * 1000); v.vy = 0.7 * v.vy + 0.3 * ((wy - v.y) / dt * 1000);
        v.x = wx; v.y = wy; v.t = now; } }
      if (wdist <= cfg.killRange * 1.5) { var inf1 = khSeen.get(s); if (inf1) inf1.t = now; else khSeen.set(s, { x: wx, y: wy, t: now }); }

      if (wdist > cfg.killRange || wdist < 1) continue;
      if (headShielded(s, myX, myY)) continue;
      var sx = cx + wdx * gsc, sy = cy + wdy * gsc;
      if (sx < -40 || sy < -40 || sx > W + 40 || sy > H + 40) continue;
      var rvx = v.vx - khMe.vx, rvy = v.vy - khMe.vy;
      var closing = -((wdx * rvx + wdy * rvy) / wdist);          /* >0 = getting closer (units/s) */
      var ttc = closing > 20 ? wdist / closing : 99;              /* rough time to contact */
      cands.push({ s: s, sx: sx, sy: sy, dist: wdist, v: v, closing: closing, ttc: ttc,
                   r: Math.max(14, (s.sc || s.S || 15) * gsc * 1.15) });
    }

    /* who is the most urgent? */
    var lock = null, c, k;
    for (k = 0; k < cands.length; k++) { c = cands[k]; if (!lock || c.ttc < lock.ttc || (c.ttc === lock.ttc && c.dist < lock.dist)) lock = c; }

    var pulse = 0.7 + 0.3 * Math.sin(now / 180);
    if (cands.length || hitMarks.length) khDirty = true;
    for (k = 0; k < cands.length; k++) {
      c = cands[k];
      var ratio = c.dist / cfg.killRange, isLock = (c === lock);
      var rr = c.r * (isLock ? 1.25 : 1), col = khColor(ratio, 0.9 * (isLock ? 1 : pulse));
      khCtx.lineWidth = isLock ? 3 : 2; khCtx.strokeStyle = col; khCtx.lineCap = "round";
      drawBrackets(khCtx, c.sx, c.sy, rr, now / 900 * (isLock ? 1.6 : 1), Math.max(6, rr * 0.5));
      khCtx.beginPath(); khCtx.arc(c.sx, c.sy, rr + 7, 0, TWO_PI_KH);
      khCtx.strokeStyle = khColor(ratio, 0.22); khCtx.lineWidth = 1.5; khCtx.stroke();
      /* heading line: where this head will be in ~0.35s */
      khCtx.beginPath(); khCtx.setLineDash([4, 4]); khCtx.moveTo(c.sx, c.sy);
      khCtx.lineTo(c.sx + c.v.vx * 0.35 * gsc, c.sy + c.v.vy * 0.35 * gsc);
      khCtx.strokeStyle = "rgba(255,255,255,.55)"; khCtx.lineWidth = 1.5; khCtx.stroke(); khCtx.setLineDash([]);
      /* text */
      khCtx.font = "700 11px Arial"; khCtx.textAlign = "center"; khCtx.fillStyle = khColor(ratio, 1);
      khCtx.fillText(Math.round(c.dist) + "u" + (c.closing > 20 ? "  \u25BC" + Math.round(c.closing) : (c.closing < -20 ? "  \u25B2" + Math.round(-c.closing) : "")), c.sx, c.sy + rr + 22);
      if (isLock) { khCtx.fillStyle = "rgba(255,70,70," + pulse + ")"; khCtx.fillText("LOCK", c.sx, c.sy - rr - 12); }
    }

    /* hitmarker (kill confirm) */
    for (k = hitMarks.length - 1; k >= 0; k--) {
      var m = hitMarks[k], age = now - m.t;
      if (age > 900) { hitMarks.splice(k, 1); continue; }
      var p = age / 900, hx = cx + (m.x - myX) * gsc, hy = cy + (m.y - myY) * gsc;
      var r0 = 8 + p * 8, r1 = 22 + p * 26;
      khCtx.save(); khCtx.translate(hx, hy); khCtx.globalAlpha = 1 - p * p;
      khCtx.lineCap = "round";
      khCtx.beginPath();
      for (var q = 0; q < 4; q++) {
        var ang = Math.PI / 4 + q * Math.PI / 2;
        khCtx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); khCtx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      }
      glowStroke(khCtx, "255,42,42", 1, 3.5);       /* PERF: was shadowBlur 14 */
      khCtx.strokeStyle = "#ffffff"; khCtx.lineWidth = 3.5; khCtx.stroke();
      khCtx.font = "800 15px Arial"; khCtx.textAlign = "center"; khCtx.fillStyle = "#ff5a5a";
      khCtx.lineJoin = "round"; khCtx.lineWidth = 4; khCtx.strokeStyle = "rgba(255,42,42,.32)";   /* was shadowBlur 8 */
      khCtx.strokeText("KILL x" + m.n, 0, -r1 - 8 - p * 18);
      khCtx.fillText("KILL x" + m.n, 0, -r1 - 8 - p * 18);
      khCtx.restore();
    }
  }
  var TWO_PI_KH = Math.PI * 2;
  window.addEventListener("resize", sizeKh);

  /* is the straight line from my head to this enemy's head blocked by their OWN coiled-up body?
     (segments right behind their neck are skipped — those are always "close", coiling is what matters) */
  function headShielded(enemy, myX, myY) {
    var segs = enemy.B;
    if (!segs || !segs.length) return false;
    var hx = enemy.xx + (enemy.fx || 0), hy = enemy.yy + (enemy.fy || 0);
    var dx = hx - myX, dy = hy - myY, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return false;
    var steps = Math.min(26, Math.max(6, Math.round(dist / 24)));
    var skipNear = 14, blockR = 24 * 24;
    for (var t = 1; t < steps; t++) {
      var f = t / steps, px = myX + dx * f, py = myY + dy * f;
      for (var j = segs.length - 1; j >= skipNear; j--) {
        var seg = segs[j];
        if (!seg || typeof seg.xx !== "number") continue;
        var sdx = seg.xx - px, sdy = seg.yy - py;
        if (sdx * sdx + sdy * sdy < blockR) return true;
      }
    }
    return false;
  }


  /* ---------- Food Radar + Target Indicator (visual overlay only) ----------
     Food Radar: finds the densest pile of food (dead-snake mass) around you and draws an arrow toward it.
     Target Indicator: marks the longest (or fastest) visible enemy head with a crosshair.
     Both only draw on an overlay canvas — they never touch your mouse, boost or controls. */
  var fxCv = null, fxCtx = null;
  function sizeFx() { if (fxCv) { fxCv.width = window.innerWidth; fxCv.height = window.innerHeight; } }
  window.addEventListener("resize", sizeFx);
  var CELL = 220, spd = new Map();

  var fxDirty = false;    /* PERF: clear only if something was drawn */
  function drawExtras() {
    var want = (cfg.foodRadar || cfg.targetInd) && S.alive;
    if (!want) { if (fxDirty && fxCtx) { fxCtx.clearRect(0, 0, fxCv.width, fxCv.height); fxDirty = false; } return; }
    try {
      if (typeof snake === "undefined" || !snake || typeof gsc === "undefined" ||
          typeof Dl === "undefined" || typeof d === "undefined") return;
    } catch (e) { return; }
    if (!fxCv) { fxCv = el("canvas", "lwk-kh lwk-own"); fxCtx = fxCv.getContext("2d"); sizeFx(); }
    var W = fxCv.width, H = fxCv.height, cx = Dl / 2, cy = d / 2;
    var myX = snake.xx + (snake.fx || 0), myY = snake.yy + (snake.fy || 0);
    fxCtx.clearRect(0, 0, W, H); fxDirty = true;
    var now = performance.now(), pulse = 0.75 + 0.25 * Math.sin(now / 150);

    /* --- food radar --- */
    if (cfg.foodRadar) {
      var foods; try { foods = Be; } catch (e) { foods = null; }
      if (foods && foods.length) {
        var grid = {}, i, f, gx, gy, key, c, best = null;
        for (i = foods.length - 1; i >= 0; i--) {
          f = foods[i];
          if (!f || f.eaten || typeof f.xx !== "number") continue;
          gx = Math.floor(f.xx / CELL); gy = Math.floor(f.yy / CELL); key = gx + "," + gy;
          c = grid[key] || (grid[key] = { m: 0, x: 0, y: 0 });
          c.m += (f.sz || 1); c.x += f.xx * (f.sz || 1); c.y += f.yy * (f.sz || 1);
        }
        for (key in grid) {
          c = grid[key];
          if (c.m < cfg.foodMin) continue;
          var px = c.x / c.m - myX, py = c.y / c.m - myY, dd = Math.sqrt(px * px + py * py);
          if (dd < 120) continue;                     /* already on top of it */
          var score2 = c.m / (1 + dd / 900);          /* big + near wins */
          if (!best || score2 > best.sc) best = { sc: score2, dx: px, dy: py, dist: dd, m: c.m };
        }
        if (best) {
          var ang = Math.atan2(best.dy, best.dx), R = Math.min(W, H) * 0.30;
          var ax = W / 2 + Math.cos(ang) * R, ay = H / 2 + Math.sin(ang) * R;
          fxCtx.save(); fxCtx.translate(ax, ay); fxCtx.rotate(ang);
          fxCtx.fillStyle = "rgba(57,255,20," + (0.8 * pulse) + ")";
          fxCtx.beginPath(); fxCtx.moveTo(26, 0); fxCtx.lineTo(-12, -16); fxCtx.lineTo(-4, 0); fxCtx.lineTo(-12, 16);
          fxCtx.closePath(); glowStroke(fxCtx, "57,255,20", 0.8 * pulse, 6);   /* PERF: was shadowBlur 18 */
          fxCtx.fill(); fxCtx.restore();
          fxCtx.font = "700 11px Arial"; fxCtx.fillStyle = "#b8ffa8"; fxCtx.textAlign = "center";
          fxCtx.fillText(Math.round(best.dist) + "u", ax - Math.cos(ang) * 30, ay - Math.sin(ang) * 30 + 4);
        }
      }
    }

    /* --- target indicator --- */
    if (cfg.targetInd) {
      var en; try { en = ef; } catch (e) { en = null; }
      if (en) {
        var top = null, topV = -1, j, s2, hx, hy, v, prev;
        for (j = en.length - 1; j >= 0; j--) {
          s2 = en[j];
          if (!s2 || s2 === snake || s2.dead_amt || typeof s2.xx !== "number") continue;
          hx = s2.xx + (s2.fx || 0); hy = s2.yy + (s2.fy || 0);
          prev = spd.get(s2);
          if (prev) { var ddx = hx - prev.x, ddy = hy - prev.y, dt = Math.max(1, now - prev.t);
            prev.v = 0.8 * prev.v + 0.2 * (Math.sqrt(ddx * ddx + ddy * ddy) / dt * 1000); prev.x = hx; prev.y = hy; prev.t = now; }
          else spd.set(s2, { x: hx, y: hy, t: now, v: 0 });
          var sx2 = cx + (hx - myX) * gsc, sy2 = cy + (hy - myY) * gsc;
          if (sx2 < -40 || sy2 < -40 || sx2 > W + 40 || sy2 > H + 40) continue;
          v = cfg.targetMode === "fastest" ? (spd.get(s2).v || 0) : (s2.sct || (s2.B ? s2.B.length : 0) || 0);
          if (v > topV) { topV = v; top = { sx: sx2, sy: sy2, r: Math.max(16, (s2.sc || s2.S || 15) * gsc * 1.3) }; }
        }
        if (top) {
          var col = cfg.targetMode === "fastest" ? "255,170,0" : "255,0,200";
          fxCtx.save();
          fxCtx.strokeStyle = "rgba(" + col + "," + pulse + ")"; fxCtx.lineWidth = 2.5;
          var L = top.r + 10;
          fxCtx.beginPath(); fxCtx.arc(top.sx, top.sy, top.r, 0, TWO_PI_KH);      /* ring + 4 ticks in ONE path / one stroke */
          fxCtx.moveTo(top.sx - L, top.sy); fxCtx.lineTo(top.sx - top.r + 4, top.sy);
          fxCtx.moveTo(top.sx + L, top.sy); fxCtx.lineTo(top.sx + top.r - 4, top.sy);
          fxCtx.moveTo(top.sx, top.sy - L); fxCtx.lineTo(top.sx, top.sy - top.r + 4);
          fxCtx.moveTo(top.sx, top.sy + L); fxCtx.lineTo(top.sx, top.sy + top.r - 4);
          glowStroke(fxCtx, col, pulse, 2.5);                                      /* PERF: was shadowBlur 16 */
          fxCtx.stroke(); fxCtx.restore();
        }
      }
    }
  }


  /* ---------- Kill Planner (visual overlay only) ----------
     1) Tracks every enemy head (position, speed, turning) and predicts where it will be (curved path).
     2) Searches ALONG that predicted path for a "cut point": a spot you can reach BEFORE the enemy does,
        so your body is lying across his road when his head arrives -> he hits you and dies.
        It tries many points/times, so it finds a kill even when there is "no room" at first glance.
     3) Only accepts a route that does not run through anybody else's body.
     Draws: predicted head path + AIM ring at the cut point + your route. You steer yourself —
     nothing here touches the mouse, boost or controls. */
  var kpCv = null, kpCtx = null, kpVel = new WeakMap(), kpMe = null, kpBase = null, kpHi = 0;
  var kpGood = null, kpGoodT = 0, kpPlan = [], kpLast = 0, kpGrid = null, G2PI = Math.PI * 2, KG = 90, TURN_RATE = 4.5;
  function sizeKp() { if (kpCv) { kpCv.width = window.innerWidth; kpCv.height = window.innerHeight; } }
  window.addEventListener("resize", sizeKp);
  function angDiff(a, b) { var d2 = Math.abs(a - b) % G2PI; return d2 > Math.PI ? G2PI - d2 : d2; }

  function track(e, ex, ey, now) {
    var v = kpVel.get(e);
    if (!v) { v = { x: ex, y: ey, t: now, vx: 0, vy: 0, th: 0, om: 0, ok: false }; kpVel.set(e, v); return v; }
    var dt = now - v.t;
    if (dt >= 16) {
      v.vx = 0.7 * v.vx + 0.3 * ((ex - v.x) / dt * 1000); v.vy = 0.7 * v.vy + 0.3 * ((ey - v.y) / dt * 1000);
      var sp = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
      if (sp > 40) {
        var th = Math.atan2(v.vy, v.vx);
        if (v.ok) { var dth = th - v.th; while (dth > Math.PI) dth -= G2PI; while (dth < -Math.PI) dth += G2PI; v.om = 0.85 * v.om + 0.15 * (dth / dt * 1000); }
        v.th = th; v.ok = true;
      }
      v.x = ex; v.y = ey; v.t = now;
    }
    return v;
  }

  /* predicted head positions at t = 0, 0.05, 0.10 ... (curved: keeps turning, turn fades out) */
  function trajectory(v, ex, ey, n) {
    var pts = [{ x: ex, y: ey }], sp = Math.sqrt(v.vx * v.vx + v.vy * v.vy), k, x = ex, y = ey, th = v.th, om = Math.max(-4, Math.min(4, v.om));
    if (!v.ok || sp < 40) { for (k = 1; k <= n; k++) pts.push({ x: ex + v.vx * k * 0.05, y: ey + v.vy * k * 0.05 }); return pts; }
    for (k = 1; k <= n; k++) {
      th += om * Math.exp(-k * 0.05 * 1.2) * 0.05;
      x += Math.cos(th) * sp * 0.05; y += Math.sin(th) * sp * 0.05; pts.push({ x: x, y: y });
    }
    return pts;
  }

  /* every body segment on screen-ish, in a grid, built once per plan */
  function buildGrid(myX, myY) {
    var g = new Map(), SX = [], SY = [], SO = [], SI = [], SR = [], i, j;
    function add(x, y, o, idx, r2) {
      if (x - myX > 1500 || myX - x > 1500 || y - myY > 1500 || myY - y > 1500) return;
      var key = (Math.floor(x / KG) + 4000) * 8000 + (Math.floor(y / KG) + 4000), n = SX.length, l = g.get(key);
      SX.push(x); SY.push(y); SO.push(o); SI.push(idx); SR.push(r2);
      if (l) l.push(n); else g.set(key, [n]);
    }
    for (i = ef.length - 1; i >= 0; i--) {
      var e = ef[i]; if (!e || e === snake || e.dead_amt || typeof e.xx !== "number") continue;
      var r = 16 + (e.sc || e.S || 1) * 7, r2 = r * r;
      add(e.xx + (e.fx || 0), e.yy + (e.fy || 0), e, -1, r2);
      if (e.B) for (j = 0; j < e.B.length; j++) { var sg = e.B[j]; if (sg && typeof sg.xx === "number") add(sg.xx + (sg.fx || 0), sg.yy + (sg.fy || 0), e, j, r2); }
    }
    return { g: g, SX: SX, SY: SY, SO: SO, SI: SI, SR: SR };
  }
  function routeClear(G, mx, my, tx, ty, target) {
    var dx = tx - mx, dy = ty - my, dist = Math.sqrt(dx * dx + dy * dy), steps = Math.max(1, Math.ceil(dist / 30)), s2, gx, gy, ox, oy, l, q, idx, px, py, ddx, ddy;
    for (s2 = 1; s2 <= steps; s2++) {
      px = mx + dx * s2 / steps; py = my + dy * s2 / steps; gx = Math.floor(px / KG); gy = Math.floor(py / KG);
      for (ox = -1; ox <= 1; ox++) for (oy = -1; oy <= 1; oy++) {
        l = G.g.get((gx + ox + 4000) * 8000 + (gy + oy + 4000)); if (!l) continue;
        for (q = 0; q < l.length; q++) {
          idx = l[q];
          if (G.SO[idx] === target && G.SI[idx] < 12) continue;         /* target's own head/neck: that's the point */
          ddx = G.SX[idx] - px; ddy = G.SY[idx] - py;
          if (ddx * ddx + ddy * ddy < G.SR[idx]) return false;
        }
      }
    }
    return true;
  }

  /* is this enemy's head "open"?  cast 9 rays over the half-circle in FRONT of the head (250 units).
     covered/coiled heads (own body or other snakes right in front) are NOT killable -> we ignore them. */
  function pointHit(G, px, py, owner) {
    var gx = Math.floor(px / KG), gy = Math.floor(py / KG), ox, oy, l, q, idx, dx, dy;
    for (ox = -1; ox <= 1; ox++) for (oy = -1; oy <= 1; oy++) {
      l = G.g.get((gx + ox + 4000) * 8000 + (gy + oy + 4000)); if (!l) continue;
      for (q = 0; q < l.length; q++) {
        idx = l[q];
        if (G.SO[idx] === owner && G.SI[idx] < 12) continue;            /* own head + neck don't count */
        dx = G.SX[idx] - px; dy = G.SY[idx] - py;
        if (dx * dx + dy * dy < G.SR[idx]) return true;
      }
    }
    return false;
  }
  function headOpenness(G, e, v, ex, ey) {
    if (!v.ok) return 9;                                                /* not moving: unknown, treat as open */
    var free = 0, k, m, a, hit, fwdFree = true;
    for (k = 0; k < 9; k++) {
      a = v.th + (k - 4) * (Math.PI / 8); hit = false;
      for (m = 1; m <= 6; m++) { if (pointHit(G, ex + Math.cos(a) * m * 42, ey + Math.sin(a) * m * 42, e)) { hit = true; break; } }
      if (!hit) free++; else if (k === 4) fwdFree = false;
    }
    return fwdFree ? free : 0;
  }

  function planKills(myX, myY, heading, moving, V1, V2, myLen, tracks) {
    var G = buildGrid(myX, myY), res = [], i, k;
    for (i = 0; i < tracks.length; i++) {
      var T = tracks[i], e = T.e, v = T.v, eLen = e.sct || 0;
      v.opn = headOpenness(G, e, v, T.ex, T.ey); v.open = v.opn >= 6;
      if (!v.open) continue;                                            /* covered head: not killable */
      if (eLen > myLen * 3) continue;
      var traj = trajectory(v, T.ex, T.ey, 44), cands = [];
      for (k = 6; k <= 44; k++) {
        var t = k * 0.05, X = traj[k], dx = X.x - myX, dy = X.y - myY, d2 = Math.sqrt(dx * dx + dy * dy);
        if (d2 > cfg.pathRange || d2 < 40) continue;
        var turn = moving ? angDiff(Math.atan2(dy, dx), heading) : 0, tTurn = turn / TURN_RATE;
        var tN = Math.max(d2 / V1, tTurn), tB = Math.max(d2 / V2, tTurn), mode, tMe;
        if (tN + 0.12 <= t) { mode = "NORMAL"; tMe = tN; }
        else if (tB + 0.12 <= t) { mode = "BOOST"; tMe = tB; }
        else continue;
        var margin = t - tMe; if (margin > 1.0) continue;
        var sc = (eLen + 30) / (0.5 + tMe) * (mode === "BOOST" ? 0.8 : 1) * (margin >= 0.12 && margin <= 0.6 ? 1.15 : 1) * (1 - 0.3 * turn / Math.PI) * (eLen > myLen * 1.5 ? 0.6 : 1);
        cands.push({ k: k, t: t, X: X, mode: mode, tMe: tMe, margin: margin, sc: sc });
      }
      if (!cands.length) continue;
      cands.sort(function (a, b) { return b.sc - a.sc; });
      for (k = 0; k < cands.length && k < 8; k++) {
        var c = cands[k];
        if (routeClear(G, myX, myY, c.X.x, c.X.y, e)) {
          var conf = Math.round(Math.max(20, Math.min(97, 92 - Math.abs(v.om) * 14 - c.t * 12 + Math.min(c.margin, 0.5) * 20 - (c.mode === "BOOST" ? 8 : 0))));
          res.push({ e: e, traj: traj, c: c, len: eLen, conf: conf, sc: c.sc, opn: v.opn });
          break;
        }
      }
    }
    res.sort(function (a, b) { return b.sc - a.sc; });
    if (res.length > 1 && kpGood) {                                     /* stick with the current target if it's still nearly as good */
      for (k = 1; k < res.length; k++) if (res[k].e === kpGood.e && res[k].sc >= res[0].sc * 0.6) { var tmp = res[0]; res[0] = res[k]; res[k] = tmp; break; }
    }
    return res.slice(0, 3);
  }

  function shadowText(ctx, txt, x, y, fill) {
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y);
  }
  function drawArrow(ctx, x, y, ang, size, rgb, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = "rgba(" + rgb + "," + alpha + ")";
    ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.45, -size * 0.62); ctx.lineTo(-size * 0.12, 0); ctx.lineTo(-size * 0.45, size * 0.62);
    ctx.closePath(); glowStroke(ctx, rgb, alpha, 6); ctx.fill(); ctx.restore();
  }

  var kpDirty = false;    /* PERF: clear only if something was drawn last frame */
  function drawKillPath() {
    if (!cfg.killPath || !S.alive) {
      if (kpDirty && kpCtx) { kpCtx.clearRect(0, 0, kpCv.width, kpCv.height); kpDirty = false; }
      kpMe = null; if (kpPlan.length) kpPlan = []; kpGood = null; return;
    }
    try {
      if (typeof snake === "undefined" || !snake || typeof ef === "undefined" || !ef ||
          typeof gsc === "undefined" || typeof Dl === "undefined" || typeof d === "undefined") return;
    } catch (e) { return; }
    if (!kpCv) { kpCv = el("canvas", "lwk-kh lwk-own"); kpCtx = kpCv.getContext("2d"); sizeKp(); }
    var W = kpCv.width, H = kpCv.height, cx = Dl / 2, cy = d / 2, now = performance.now(), ctx = kpCtx, i, k;
    var myX = snake.xx + (snake.fx || 0), myY = snake.yy + (snake.fy || 0), myLen = snake.sct || 1;
    if (kpDirty) { ctx.clearRect(0, 0, W, H); kpDirty = false; }

    if (!kpMe) { kpMe = { x: myX, y: myY, t: now, vx: 0, vy: 0 }; return; }
    var mdt = now - kpMe.t;
    if (mdt >= 16) {
      kpMe.vx = 0.75 * kpMe.vx + 0.25 * ((myX - kpMe.x) / mdt * 1000); kpMe.vy = 0.75 * kpMe.vy + 0.25 * ((myY - kpMe.y) / mdt * 1000);
      kpMe.x = myX; kpMe.y = myY; kpMe.t = now;
      var sp0 = Math.sqrt(kpMe.vx * kpMe.vx + kpMe.vy * kpMe.vy);
      if (sp0 > 40) { kpBase = kpBase === null ? sp0 : (sp0 < kpBase ? kpBase * 0.9 + sp0 * 0.1 : kpBase * 0.999 + sp0 * 0.001); kpHi = Math.max(sp0, kpHi * 0.9995); }
    }
    if (kpBase === null) return;
    var heading = Math.atan2(kpMe.vy, kpMe.vx), moving = (kpMe.vx * kpMe.vx + kpMe.vy * kpMe.vy) > 900;
    var V1 = kpBase, V2 = Math.max(V1 * 2.0, kpHi > V1 * 1.6 ? kpHi * 0.97 : 0);

    /* track every enemy every frame */
    var tracks = [], doPlan = (now - kpLast > 60), rng = cfg.pathRange + 400;
    for (i = ef.length - 1; i >= 0; i--) {
      var e = ef[i];
      if (!e || e === snake || e.dead_amt || typeof e.xx !== "number") continue;
      var ex = e.xx + (e.fx || 0), ey = e.yy + (e.fy || 0), v = track(e, ex, ey, now);   /* velocities still updated every frame */
      if (doPlan) {           /* PERF: the candidate list is only needed on planning frames (no per-frame allocation) */
        var ddx = ex - myX, ddy = ey - myY;
        if (Math.abs(ddx) < rng && Math.abs(ddy) < rng) tracks.push({ e: e, ex: ex, ey: ey, v: v });
      }
    }

    /* re-plan ~16x/second */
    if (doPlan) { kpLast = now; kpPlan = planKills(myX, myY, heading, moving, V1, V2, myLen, tracks); }

    function toS(wx, wy) { return { x: cx + (wx - myX) * gsc, y: cy + (wy - myY) * gsc }; }
    var pulse = 0.7 + 0.3 * Math.sin(now / 130);
    ctx.textAlign = "center"; ctx.lineJoin = "round"; ctx.lineCap = "round";

    /* ONE clean assist in front of your snake — only when a real kill is available. Nothing is drawn on enemies. */
    var P = kpPlan[0];
    if (P && P.conf >= 50) { kpGood = P; kpGoodT = now; }
    else if (kpGood && now - kpGoodT > 250) kpGood = null;              /* short hold so it doesn't flicker */
    if (!kpGood) return;
    kpDirty = true;
    P = kpGood;
    var c = P.c, q = toS(c.X.x, c.X.y), boost = c.mode === "BOOST", col = boost ? "255,170,0" : "60,255,140";
    var dx = q.x - cx, dy = q.y - cy, dd = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / dd, uy = dy / dd, ang = Math.atan2(dy, dx);
    var pulse = 0.75 + 0.25 * Math.sin(now / 130);
    ctx.save(); ctx.lineCap = "round";
    /* short guide line + single arrowhead just ahead of your head */
    var s0 = 46, s1 = Math.min(dd - 24, 170); if (s1 < s0 + 20) s1 = s0 + 20;
    ctx.strokeStyle = "rgba(" + col + ",.9)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + ux * s0, cy + uy * s0); ctx.lineTo(cx + ux * s1, cy + uy * s1);
    glowStroke(ctx, col, .9, 3);                     /* PERF: was shadowBlur 12 */
    ctx.stroke();
    ctx.translate(cx + ux * s1, cy + uy * s1); ctx.rotate(ang);
    ctx.fillStyle = "rgba(" + col + ",.95)"; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -9); ctx.lineTo(-6, 9); ctx.closePath();
    glowStroke(ctx, col, .9, 3); ctx.fill();
    ctx.restore();
    /* small ring where you should go (only if it is on screen) */
    if (q.x > 20 && q.y > 20 && q.x < W - 20 && q.y < H - 20) {
      ctx.save(); ctx.strokeStyle = "rgba(" + col + "," + pulse + ")"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(q.x, q.y, 13, 0, G2PI); glowStroke(ctx, col, pulse, 2.5); ctx.stroke(); ctx.restore();
    }
    if (boost) { ctx.font = "800 12px Arial"; ctx.textAlign = "center"; shadowText(ctx, "BOOST", cx + ux * (s1 + 34), cy + uy * (s1 + 34) + 4, "rgb(" + col + ")"); }
  }

  /* ---------- Spine view + hide enemy eyes (visual only) ----------
     hideEyes : sets the game's own "no eyes" flag (VA) on ENEMY snakes only, restores it when turned off.
     spineView: draws a thin centre line along every enemy body + a small head marker, on an overlay canvas. */
  var spCv = null, spCtx = null, eyeSaved = new WeakMap();
  function sizeSp() { if (spCv) { spCv.width = window.innerWidth; spCv.height = window.innerHeight; } }
  window.addEventListener("resize", sizeSp);

  var eyesTouched = false;   /* PERF: skip the whole enemy loop while the feature is (and was) off */
  function applyEyes() {
    if (!cfg.hideEyes && !eyesTouched) return;
    var list; try { list = ef; } catch (e) { return; }
    if (!list) return;
    for (var i = list.length - 1; i >= 0; i--) {
      var s = list[i];
      if (!s || typeof s.VA === "undefined") continue;
      var mine = false; try { mine = (s === snake); } catch (e) {}
      if (mine) continue;
      var sv = eyeSaved.get(s);
      if (cfg.hideEyes) {
        if (!sv) { sv = { VA: s.VA, EA: s.EA }; eyeSaved.set(s, sv); }
        s.VA = true; if (s.EA) s.EA = false;          /* EA off -> custom-skin eyes fall back to normal eyes, which VA hides */
      } else if (sv) {
        s.VA = sv.VA; s.EA = sv.EA; eyeSaved.delete(s);
      }
    }
    eyesTouched = !!cfg.hideEyes;   /* after one restore pass following "off", the loop goes back to sleep */
  }

  var spFail = false, spDrawn = false;
  /* Spine view is now drawn by the game's own renderer (main-mt.js -> lwkSpineDraw), using the exact same
     path the skinless mode uses, so it can never drift from the real snake. This overlay only cleans up. */
  function drawSpine() {
    if (spCtx && spDrawn) { spCtx.clearRect(0, 0, spCv.width, spCv.height); spDrawn = false; }
  }

  /* ---------- screen filter + vignette ---------- */
  var lookKey = "", lookCvs = [], lookT = 0;
  function applyLook() {
    if (!vigEl) vigEl = el("div", "lwk-vig lwk-own");
    var vd = cfg.vig ? "block" : "none";
    if (vigEl.style.display !== vd) vigEl.style.display = vd;
    var f = (cfg.bright !== 100 || cfg.sat !== 100)
      ? "brightness(" + (cfg.bright / 100) + ") saturate(" + (cfg.sat / 100) + ")" : "";
    var cs = document.getElementsByTagName("canvas"), i, c, now = Date.now();
    /* PERF: the "which canvases are full-screen" scan needs layout (clientWidth/Height). It is now redone only when the
       canvas count, window size, filter or play/lobby state changes (plus a 5 s safety refresh) instead of every second. */
    var key = f + "|" + cs.length + "|" + window.innerWidth + "x" + window.innerHeight + "|" + (S.alive ? 1 : 0);
    if (key !== lookKey || now - lookT > 5000) {
      lookKey = key; lookT = now; lookCvs = [];
      for (i = 0; i < cs.length; i++) {
        c = cs[i];
        if (c.classList.contains("lwk-own")) continue;
        if (c.clientWidth >= window.innerWidth * 0.6 && c.clientHeight >= window.innerHeight * 0.6) lookCvs.push(c);
      }
    }
    for (i = 0; i < lookCvs.length; i++) { c = lookCvs[i]; if (c.style.filter !== f) c.style.filter = f; }
  }

  /* ---------- sticky boost ---------- */
  function releaseBoost() {
    try {
      if (typeof snake !== "undefined" && snake) { snake.nA = 0; if (typeof I8 === "function") I8(); }
    } catch (e) {}
  }
  function boostTick() {
    if (!stickyOn) return;
    if (!alive()) { stickyOn = false; return; }
    try { snake.nA = 1; if (typeof I8 === "function") I8(); } catch (e) {}
  }
  function toggleSticky() {
    if (!alive()) return;
    stickyOn = !stickyOn;
    if (!stickyOn) releaseBoost();
    toast("Sticky boost " + (stickyOn ? "ON" : "OFF"), true);
  }

/* TT-MACRO-START */
  /* ---------- TT macro v2: repeating  circle -> cross through centre -> rejoin circle  loop ----------
     Double-tap T = start, single T = cancel. Real mouse is ignored while it runs.
     0 calib : ~0.6s full-lock turn -> measures the tightest possible turn radius (rmin)
     1 ring  : follow a circle of radius R = 2.4*rmin around a fixed centre C (RING_MS long)
     2 peel  : steer at C (max turn) until lined up, then straight through C
     3 exit  : go straight until ~R past C on the far side
     4 merge : rejoin the ring on the far side; turn toward the side where the TAIL is ("anti"), then back to 1  */
  var M = { on: false, ph: 0, timer: 0, dir: 1, lastAng: 0, cx: 0, cy: 0, R: 0, rmin: 0, lock: 0, t0: 0, tStart: 0,
            aimX: 0, aimY: 0, c0: null, cycles: 0, okSince: 0, pl: 0, lp: null, ma: 0, mp: 0 };
  var lastTT = 0, TT_GAP = 350, TWO_PI = Math.PI * 2, RING_MS = 5000, R_MULT = 2.4;

  /* ---------- O-O AIM ULTRA (low-lag autonomous targeter) ----------
     Double-tap O. Uses a cheap broad scan most frames and a deeper prediction
     pass only when a plausible nearby target exists. No DOM work in the loop. */
  var DAI = { on:false, last:0, GAP:320, timer:0, lock:null, lockUntil:0,
              lastScan:0, lastDeep:0, tx:0, ty:0, confidence:0, phase:"SEARCH" };
  var DAI_RANGE=1350, DAI_MIN=35, DAI_TICK=32, DAI_DEEP=72, DAI_HOLD=240;

  function aimTargetScore(e, ex, ey, H, v, now) {
    var dx=ex-H.x, dy=ey-H.y, d2=dx*dx+dy*dy;
    if (d2 < DAI_MIN*DAI_MIN || d2 > DAI_RANGE*DAI_RANGE) return null;
    var dist=Math.sqrt(d2), sp=0, closing=0;
    if(v && v.ok){ sp=Math.sqrt(v.vx*v.vx+v.vy*v.vy); if(sp>20) closing=(v.vx*(H.x-ex)+v.vy*(H.y-ey))/sp; }
    var t=Math.max(0.045, Math.min(0.65, dist/720));
    var px=ex+(v&&v.ok?v.vx*t:0), py=ey+(v&&v.ok?v.vy*t:0);
    var pdx=px-H.x,pdy=py-H.y,pd=Math.sqrt(pdx*pdx+pdy*pdy);
    var score=dist*0.72 - Math.max(0,closing)*1.25 + pd*0.10;
    if(DAI.lock===e) score-=115;
    if(dist<180) score-=85;
    if(closing>90) score-=70;
    return {e:e,x:ex,y:ey,px:px,py:py,d:dist,pd:pd,closing:closing,score:score,sp:sp};
  }

  function dangerAimTick(){
    if(!DAI.on || !alive() || M.on) return;
    var now=performance.now();
    if(now-DAI.lastScan<DAI_TICK) return;
    DAI.lastScan=now;
    try{
      if(typeof ef==='undefined'||!ef||!ef.length||typeof snake==='undefined'||!snake) return;
      var H=headPt(), best=null, bestScore=1e9;
      /* Broad cheap pass: distance + velocity only. */
      for(var i=ef.length-1;i>=0;i--){
        var e=ef[i];
        if(!e||e===snake||e.dead_amt||typeof e.xx!=="number") continue;
        var ex=e.xx+(e.fx||0), ey=e.yy+(e.fy||0);
        var dx=ex-H.x,dy=ey-H.y,d2=dx*dx+dy*dy;
        if(d2>DAI_RANGE*DAI_RANGE||d2<DAI_MIN*DAI_MIN) continue;
        var v=track(e,ex,ey,now), c=aimTargetScore(e,ex,ey,H,v,now);
        if(c&&c.score<bestScore){bestScore=c.score;best=c;}
      }
      if(!best){
        DAI.phase="SEARCH"; DAI.confidence=0;
        if(DAI.lock && now>DAI.lockUntil) DAI.lock=null;
        return;
      }
      /* Deep check only on a candidate, throttled to avoid frame spikes. */
      if(now-DAI.lastDeep>=DAI_DEEP){
        DAI.lastDeep=now;
        var G=buildGrid(H.x,H.y), opn=headOpenness(G,best.e,track(best.e,best.x,best.y,now),best.x,best.y);
        best.opn=opn;
        if(opn<3 && best.d>210){
          best.score+=180;
          /* Try a few alternative candidates only when the first head is closed. */
          var alt=null,altS=1e9;
          for(var j=ef.length-1;j>=0;j--){
            var ee=ef[j]; if(!ee||ee===snake||ee.dead_amt||typeof ee.xx!=="number") continue;
            var ax=ee.xx+(ee.fx||0),ay=ee.yy+(ee.fy||0),av=track(ee,ax,ay,now),ac=aimTargetScore(ee,ax,ay,H,av,now);
            if(!ac||ac.score>=altS) continue;
            var ao=headOpenness(G,ee,av,ax,ay); if(ao>=3){ac.opn=ao;alt=ac;altS=ac.score;}
          }
          if(alt) best=alt;
        }
      }
      /* Never commit to an attack path that crosses another snake. The old
         targeter could lock a nearby head and then drive straight through a
         third snake's body, which is exactly the self-kill behaviour we want
         to prevent. Only do the deeper route test when we have a candidate,
         so the normal search stays cheap. */
      try {
        var safetyGrid = buildGrid(H.x, H.y);
        var bv = track(best.e, best.x, best.y, now);
        var lead0 = Math.max(0.06, Math.min(0.42, best.d / 900));
        var ax0 = best.x + (bv && bv.ok ? bv.vx * lead0 : 0);
        var ay0 = best.y + (bv && bv.ok ? bv.vy * lead0 : 0);
        if (!routeClear(safetyGrid, H.x, H.y, ax0, ay0, best.e)) {
          var altBest = null, altScore = 1e9, checked = 0;
          for (var ri = 0; ri < ef.length && checked < 10; ri++) {
            var re = ef[ri];
            if (!re || re === snake || re.dead_amt || typeof re.xx !== "number") continue;
            var rx = re.xx + (re.fx || 0), ry = re.yy + (re.fy || 0);
            var rv = track(re, rx, ry, now), rc = aimTargetScore(re, rx, ry, H, rv, now);
            if (!rc || rc.score >= altScore) continue;
            var ro = headOpenness(safetyGrid, re, rv, rx, ry);
            if (ro < 4) continue;
            var rl = Math.max(0.06, Math.min(0.42, rc.d / 900));
            var rtx = rx + (rv && rv.ok ? rv.vx * rl : 0), rty = ry + (rv && rv.ok ? rv.vy * rl : 0);
            checked++;
            if (routeClear(safetyGrid, H.x, H.y, rtx, rty, re)) { rc.opn = ro; rc.px = rtx; rc.py = rty; altBest = rc; altScore = rc.score; }
          }
          if (altBest) best = altBest;
          else {
            DAI.phase = "DEFEND"; DAI.confidence = 0; DAI.lock = null;
            return;
          }
        }
      } catch (routeErr) {}

      DAI.lock=best.e; DAI.lockUntil=now+DAI_HOLD;
      var lead=Math.max(0.06,Math.min(0.42,best.d/900));
      var tx=best.x+(best.sp?best.sp*0:0), ty=best.y;
      var tv=track(best.e,best.x,best.y,now);
      if(tv&&tv.ok){tx=best.x+tv.vx*lead;ty=best.y+tv.vy*lead;}
      /* Bias toward the predicted head, but never beyond a sane lead distance. */
      var lx=tx-H.x,ly=ty-H.y,ld=Math.sqrt(lx*lx+ly*ly), maxLead=Math.max(40,best.d*1.18);
      if(ld>maxLead){tx=H.x+lx/ld*maxLead;ty=H.y+ly/ld*maxLead;}
      DAI.tx=tx;DAI.ty=ty;
      var theta=Math.atan2(ty-H.y,tx-H.x);
      setAim(theta);
      DAI.phase=(best.opn===undefined||best.opn>=3)?"LOCK":"LEAD";
      DAI.confidence=Math.max(1,Math.min(99,Math.round(100-Math.min(95,best.score/14))));
    }catch(e){ /* never let the aim loop break the game */ }
  }

  /* ---------- O-O Largest Visible Snake Map Dot ----------
     Double-tap O toggles a lightweight tracker. It only considers snakes
     already exposed to the client and currently visible in the game view.
     Exactly ONE dot is shown: the largest visible snake by rendered body size.
  */
  var OOE = { on:false, last:0, GAP:340, cv:null, ctx:null, host:null, w:0, h:0,
              target:null, lastScan:0, lastDraw:0, drawn:false };
  var OO_SCAN_MS = 250, OO_DRAW_MS = 33, OO_SWITCH = 1.05;
  function ooEnsure(){
    if(!OOE.host||!OOE.host.isConnected) OOE.host=document.getElementById("mmap");
    if(OOE.cv&&OOE.cv.isConnected) return;
    OOE.cv=document.createElement("canvas");
    OOE.cv.className="nsi lwk-own";
    OOE.cv.style.cssText="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:250;display:none";
    (OOE.host||document.body).appendChild(OOE.cv);
    OOE.ctx=OOE.cv.getContext("2d");
    OOE.w=OOE.h=0;
  }
  function ooSize(){
    if(!OOE.cv||!OOE.host) return;
    var w=Math.max(104,OOE.host.clientWidth||104), h=Math.max(104,OOE.host.clientHeight||104);
    if(w!==OOE.w||h!==OOE.h){ OOE.w=OOE.cv.width=w; OOE.h=OOE.cv.height=h; }
  }
  function ooValid(e){
    return !!(e&&!e.dead_amt&&typeof e.xx==="number"&&typeof e.yy==="number"&&e.B&&e.B.length);
  }
  /* Largest snake in the client's own snake list. Scanned ~4x/sec (not every frame); the
     current target is kept unless another snake is clearly bigger -> no flicker, far less CPU. */
  function ooScan(now){
    if(now-OOE.lastScan<OO_SCAN_MS && ooValid(OOE.target)) return OOE.target;
    OOE.lastScan=now;
    try{
      if(typeof ef==='undefined'||!ef||!ef.length||typeof snake==='undefined'||!snake){ OOE.target=null; return null; }
      var best=null, bs=-1, i, e, sz;
      for(i=ef.length-1;i>=0;i--){
        e=ef[i];
        if(e===snake||!ooValid(e)) continue;
        sz=e.B.length;
        if(sz>bs){best=e;bs=sz;}
      }
      var cur=OOE.target;
      if(ooValid(cur)&&cur!==snake&&best&&best!==cur&&cur.B.length*OO_SWITCH>=bs) best=cur;
      OOE.target=best;
      return best;
    }catch(x){ OOE.target=null; return null; }
  }
  function ooClear(){
    if(OOE.ctx&&OOE.drawn){ OOE.ctx.clearRect(0,0,OOE.cv.width,OOE.cv.height); OOE.drawn=false; }
    if(OOE.cv) OOE.cv.style.display="none";
  }
  function ooDraw(t){
    if(!OOE.on||!S.alive){ if(OOE.drawn||(OOE.cv&&OOE.cv.style.display!=="none")) ooClear(); return; }
    var now=t||performance.now();
    if(now-OOE.lastDraw<OO_DRAW_MS) return;
    OOE.lastDraw=now;
    ooEnsure();
    if(!OOE.cv||!OOE.ctx) return;
    if(OOE.cv.style.display!=="block") OOE.cv.style.display="block";
    if(!OOE.w||!(now-OOE.sizeT<1000)){ OOE.sizeT=now; ooSize(); }   /* PERF: host.clientWidth (layout read) 1x/s instead of 30x/s */
    var ctx=OOE.ctx,W=OOE.w,H=OOE.h;
    ctx.clearRect(0,0,W,H);
    var e=ooScan(now);
    if(!e){ OOE.drawn=false; return; }
    try{
      var denom=(typeof ps!=="undefined"&&ps&&typeof Xf!=="undefined"&&Xf)?Ol:af;
      if(!denom) return;
      var x=W/2+(W*0.385)*(e.xx-af)/denom, y=H/2+(H*0.385)*(e.yy-af)/denom;
      x=Math.max(8,Math.min(W-8,x)); y=Math.max(8,Math.min(H-8,y));
      var pulse=0.5+0.5*Math.sin(now*0.006);
      ctx.fillStyle="rgba(255,55,55,.98)";
      ctx.beginPath(); ctx.arc(x,y,5,0,6.2832); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,"+(0.6+0.35*pulse)+")"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(x,y,8.5+2*pulse,0,6.2832); ctx.stroke();
      OOE.drawn=true;
    }catch(x){}
  }
  function ooToggle(){
    if(!alive()){toast("Map Dot: start a game first",true);return;}
    OOE.on=!OOE.on;
    OOE.target=null; OOE.lastScan=0;
    if(OOE.on){ ooEnsure(); } else ooClear();
    toast("Largest Snake Map Dot "+(OOE.on?"ON":"OFF"),true);
  }
  function dangerKey(){var now=performance.now();if(OOE.last&&now-OOE.last<=OOE.GAP){OOE.last=0;ooToggle();}else OOE.last=now;}

  function normA(a) {
    a %= TWO_PI;
    if (a > Math.PI) a -= TWO_PI; else if (a < -Math.PI) a += TWO_PI;
    return a;
  }
  function headPt() { return { x: snake.xx + (snake.fx || 0), y: snake.yy + (snake.fy || 0) }; }
  function tailPt() {
    var B = snake.B, i, p;
    if (!B || !B.length) return null;
    for (i = 0; i < B.length; i++) {
      p = B[i];
      if (!p.dying) return { x: p.xx + (p.fx || 0), y: p.yy + (p.fy || 0) };
    }
    return null;
  }
  function setAim(theta) {
    var R = 300;
    M.aimX = Math.cos(theta) * R; M.aimY = Math.sin(theta) * R;
    var cx = (typeof Dl === "number" ? Dl : window.innerWidth) / 2;
    var cy = (typeof d === "number" ? d : window.innerHeight) / 2;
    var px = cx + M.aimX, py = cy + M.aimY;
    /* Feed the game's own mouse handler directly.  Writing g4/o4 alone can be
       overwritten by window.onmousemove before the next simulation tick. */
    try {
      if (typeof window.onmousemove === "function") {
        window.onmousemove({ clientX: px, clientY: py });
        if (window.NTL_SENS) window.NTL_SENS.update(M.aimX, M.aimY);
      } else {
        g4 = M.aimX; o4 = M.aimY;
        if (window.NTL_SENS) window.NTL_SENS.update(g4, o4);
      }
    } catch (e) { g4 = M.aimX; o4 = M.aimY; }
  }
  function goPhase(n, msg) { M.ph = n; M.t0 = performance.now(); if (msg) toast(msg, true); }
  function dist2(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }

  /* steer along the ring (centre C, radius R, direction dir): tangent + a correction that pulls back onto radius R */
  function ringAim(H) {
    var dx = H.x - M.cx, dy = H.y - M.cy, r = Math.sqrt(dx * dx + dy * dy), ph = Math.atan2(dy, dx);
    var corr = Math.max(-1.2, Math.min(1.2, 1.6 * (r - M.R) / M.R));
    setAim(ph + M.dir * (Math.PI / 2 + corr));
    return r;
  }

  function macroTick() {
    if (!M.on) return;
    if (!alive()) { macroStop(false); return; }
    try {
      var H = headPt(), a = snake.ang, now = performance.now(), dx, dy, r, t, tl, i;

      if (typeof af === "number" && af > 0 && af < 1e6) {
        dx = H.x - af; dy = H.y - af;
        if (Math.sqrt(dx * dx + dy * dy) > af * 0.9) { macroStop(false); toast("TT macro stopped · map edge", true); return; }
      }

      if (M.ph === 0) {                       /* calibrate: full lock turn, measure v and omega */
        setAim(a + M.dir * Math.PI / 2);
        if (!M.c0) { M.c0 = { t: now, a: a, acc: 0 }; M.lp = { x: H.x, y: H.y }; return; }
        M.c0.acc += Math.abs(normA(a - M.lastAng)); M.lastAng = a;
        M.pl += dist2(H, M.lp); M.lp = { x: H.x, y: H.y };
        var dt = now - M.c0.t;
        if (dt >= 600) {
          if (!(M.c0.acc > 0.2) || !(M.pl > 0)) { macroStop(false); toast("TT macro: calibration failed", true); return; }
          M.rmin = M.pl / M.c0.acc;            /* arc length / angle turned = tightest turn radius */
          M.R = M.rmin * R_MULT;
          M.cx = H.x + Math.cos(a + M.dir * Math.PI / 2) * M.R;
          M.cy = H.y + Math.sin(a + M.dir * Math.PI / 2) * M.R;
          goPhase(1, "TT macro · circle");
        }
        return;
      }

      if (M.ph === 1) {                       /* ring */
        ringAim(H);
        if (now - M.tStart >= RING_MS) { M.ma = 0; M.mp = 0; M.lastAng = a; M.lp = { x: H.x, y: H.y }; goPhase(2, "TT macro · crossing"); }
        return;
      }

      if (M.ph === 2) {                       /* peel off toward the centre */
        dx = M.cx - H.x; dy = M.cy - H.y;
        var d = Math.sqrt(dx * dx + dy * dy), brg = Math.atan2(dy, dx);
        setAim(brg);
        if (M.lp) {
          if (Math.abs(normA(brg - a)) > 0.3) { M.ma += Math.abs(normA(a - M.lastAng)); M.mp += dist2(H, M.lp); }
          if (M.ma > 0.6) {
            var rn = M.mp / M.ma;
            if (rn > 0 && isFinite(rn)) { M.rmin = 0.5 * M.rmin + 0.5 * rn; M.R = Math.max(M.R * 0.98, R_MULT * M.rmin); }
            M.ma = 0; M.mp = 0;
          }
        }
        M.lastAng = a; M.lp = { x: H.x, y: H.y };
        if (Math.abs(normA(brg - a)) < 0.06 || d < 0.35 * M.R || now - M.t0 > 8000) { M.lock = a; goPhase(3); }
        return;
      }

      if (M.ph === 3) {                       /* straight through the centre, out the far side */
        setAim(M.lock);
        var along = (H.x - M.cx) * Math.cos(M.lock) + (H.y - M.cy) * Math.sin(M.lock);
        if (along >= Math.max(0.3 * M.R, M.R - M.rmin) || now - M.t0 > 8000) {
          /* anti: rejoin the ring turning toward the side where the tail currently is */
          tl = tailPt();
          if (tl) {
            var beta = normA(Math.atan2(tl.y - M.cy, tl.x - M.cx) - Math.atan2(H.y - M.cy, H.x - M.cx));
            if (Math.abs(beta) > 0.15) M.dir = beta > 0 ? 1 : -1;
          }
          M.okSince = 0;
          goPhase(4);
        }
        return;
      }

      if (M.ph === 4) {                       /* merge back into the ring */
        r = ringAim(H);
        if (Math.abs(r - M.R) < 0.18 * M.R) {
          if (!M.okSince) M.okSince = now;
          if (now - M.okSince > 250) { M.cycles++; M.tStart = now; goPhase(1, "TT macro · loop " + (M.cycles + 1)); }
        } else M.okSince = 0;
        if (now - M.t0 > 9000) { M.cycles++; M.tStart = now; goPhase(1); }
      }
    } catch (e) {
      macroStop(false); toast("TT macro unavailable in this build", true);
    }
  }

  function macroStart() {
    if (M.on || !alive()) return;
    if (window.NTL_EB && window.NTL_EB.on) { toast("TT macro: turn Eyes Back off first", true); return; }
    if (stickyOn) { stickyOn = false; releaseBoost(); }
    M.on = true; M.dir = 1; M.c0 = null; M.cycles = 0; M.okSince = 0;
    M.tStart = performance.now();
    M.lastAng = snake.ang;
    goPhase(0, "TT macro ON");
    clearInterval(M.timer);
    M.timer = setInterval(macroTick, 10);
  }

  function macroStop(manual) {
    if (!M.on) return;
    M.on = false;
    clearInterval(M.timer); M.timer = 0;
    try {                                     /* hand steering back to where the real mouse is */
      if (mx || my) {
        g4 = mx - (typeof Dl === "number" ? Dl : window.innerWidth) / 2;
        o4 = my - (typeof d === "number" ? d : window.innerHeight) / 2;
        if (window.NTL_SENS) { NTL_SENS.update(g4, o4); NTL_SENS.update(g4, o4); }
      }
    } catch (e) {}
    if (manual) toast("TT macro OFF · manual control", true);
  }

  function macroKey() {
    var now = performance.now();
    if (M.on) { macroStop(true); lastTT = 0; return; }
    if (lastTT && now - lastTT <= TT_GAP) { lastTT = 0; macroStart(); }
    else lastTT = now;
  }

  /* While an autonomous mode runs, stop real mouse input from immediately
     overwriting the bot's steering. stopImmediatePropagation is required here
     because the game installs its own window.onmousemove handler. */
  window.addEventListener("mousemove", function (e) {
    if (M.on || DAI.on) {
      try { e.stopImmediatePropagation(); e.stopPropagation(); e.preventDefault(); } catch (x) {}
    }
  }, true);
/* TT-MACRO-END */

    /* ---------- boss key ---------- */
  var bossEl = null, bossOn = false, bossTitle = "";
  function toggleBoss() {
    if (!bossEl) {
      bossEl = el("div", "lwk-boss lwk-own");
      bossEl.innerHTML =
        '<div class="bar1"><div class="dot"></div><span>Untitled document</span></div>' +
        '<div class="page"><p>Meeting notes</p><p>&nbsp;</p><p>Action items:</p><p>1. Follow up on the quarterly summary</p><p>2. Review the draft and send comments</p></div>';
    }
    bossOn = !bossOn;
    bossEl.style.display = bossOn ? "block" : "none";
    if (bossOn) { bossTitle = document.title; document.title = "Untitled document - Google Docs"; }
    else if (bossTitle) { document.title = bossTitle; }
  }

  /* ---------- double-tap "." opens game settings (works with bot off, independent of the game's own hotkey table) ---------- */
  var dotT = 0;
  window.addEventListener("keydown", function (e) {
    if (e.key !== "." || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    var now = performance.now();
    if (now - dotT > 700) { dotT = now; return; }
    dotT = 0;
    try {
      if (typeof playing === "undefined" || !playing) return;
      if (typeof iA !== "undefined" && iA) return;
      if (typeof sA !== "function") { toast("Settings function not found", true); return; }
      sA(true);
      setTimeout(function () {
        var sp = document.getElementById("settpage");
        if (sp && sp.style.display !== "block") toast("Settings could not open", true);
      }, 400);
    } catch (err) { toast("Settings error: " + (err && err.message), true); }
  }, true);

  window.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    var key = (e.key || "").toLowerCase();
    if (cfg.boss && key === cfg.bossKey) { toggleBoss(); return; }
    if (bossOn && key === "escape") { toggleBoss(); return; }
    if (cfg.macro && key === cfg.macroKey) { macroKey(); return; }
    if (cfg.mapKey && key === cfg.mapKey) { dangerKey(); return; }
    if (cfg.spineKey && key === cfg.spineKey) { setCfg({ spineView: !cfg.spineView }); toast("Spine-only view " + (cfg.spineView ? "ON" : "OFF"), true); return; }
    if (cfg.cleanKey && key === cfg.cleanKey) { setCfg({ clean: !cfg.clean }); toast("Clean UI " + (cfg.clean ? "ON" : "OFF"), true); return; }
    if (cfg.eyesKey && key === cfg.eyesKey) { cfg.hideEyes = !cfg.hideEyes; toast(cfg.hideEyes ? "U / Back Eyes enabled" : "U / Back Eyes disabled"); return; }
    if (cfg.boost && key === cfg.boostKey) toggleSticky();
  }, true);

  /* ---------- lowKey.io branding ---------- */
  var RE_TEST = /slither\.io/i, RE_ALL = /slither\.io/gi;
  function fixNode(n) {
    if (n.nodeType === 3) {
      if (RE_TEST.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(RE_ALL, BRAND);
    } else if (n.nodeType === 1) {
      var tg = n.tagName;
      if (tg === "SCRIPT" || tg === "STYLE" || tg === "TEXTAREA" || tg === "NOSCRIPT") return;
      for (var c = n.firstChild; c; c = c.nextSibling) fixNode(c);
    }
  }
  function fixTitle() {
    if (!bossOn && RE_TEST.test(document.title)) document.title = document.title.replace(RE_ALL, BRAND);
  }
  /* PERF: the brand observer only runs in the lobby / menus. While a game is being played it is disconnected (the game
     itself draws on canvas, so there is no DOM text to rebrand); on death it is re-attached with one full re-scan. Mutations
     inside the extension's own UI (.lwk-own: HUD, dashboard, toast) are ignored - they never contain the game's brand. */
  var brandMO = null, brandOn = false, brandQ = [], brandT = 0;
  function brandFlush() {
    brandT = 0; var arr = brandQ; brandQ = [];
    for (var i = 0; i < arr.length; i++) { var n = arr[i]; if (n && n.isConnected !== false) fixNode(n); }
    fixTitle();
  }
  function brandSkip(t) {
    var e = t && (t.nodeType === 1 ? t : t.parentNode);
    return !!(e && e.closest && e.closest(".lwk-own"));
  }
  function brandWatch(on) {
    if (!brandMO || on === brandOn) return;
    brandOn = on;
    if (on) {
      if (document.body) fixNode(document.body);
      fixTitle();
      brandMO.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } else {
      brandMO.disconnect(); brandQ = [];
      if (brandT) { clearTimeout(brandT); brandT = 0; }
    }
  }
  function startBrand() {
    fixTitle();
    try {
      brandMO = new MutationObserver(function (list) {
        for (var i = 0; i < list.length && brandQ.length < 400; i++) {
          var m = list[i];
          if (brandSkip(m.target)) continue;
          if (m.type === "characterData") brandQ.push(m.target);
          else for (var j = 0; j < m.addedNodes.length; j++) brandQ.push(m.addedNodes[j]);
        }
        if (!brandT && brandQ.length) brandT = setTimeout(brandFlush, 250);
      });
    } catch (e) { brandMO = null; }
    brandWatch(!S.alive);
  }

  var logoTxt = null, logoEl = null, loginEl = null, logoHid = false, logoL = "", logoT = "", logoFS = "";
  function placeLogo() {
    if (!logoEl || !logoEl.isConnected) logoEl = $("logo");   /* PERF: element lookups cached */
    var j = logoEl;
    if (!j) return;
    if (S.alive) { if (logoTxt && logoTxt.style.display !== "none") logoTxt.style.display = "none"; return; }
    if (!logoTxt) { logoTxt = el("div", "lwk-logo-text lwk-own"); logoTxt.textContent = BRAND; }
    if (!logoHid || j.style.visibility !== "hidden") { j.style.visibility = "hidden"; logoHid = true; }
    if (!loginEl || !loginEl.isConnected) loginEl = $("login");
    var r = j.getBoundingClientRect(), lg = loginEl, vis = r.width > 20 && r.height > 10 && !S.alive;
    if (vis && lg) vis = loginShown(lg);              /* PERF: no getComputedStyle in the common case */
    if (!vis) { if (logoTxt.style.display !== "none") logoTxt.style.display = "none"; return; }
    if (logoTxt.style.display !== "block") logoTxt.style.display = "block";
    var L = (r.left + r.width / 2) + "px", T = (r.top + r.height / 2) + "px", FS = Math.max(30, Math.min(66, r.height * 0.7)) + "px";
    if (L !== logoL) { logoL = L; logoTxt.style.left = L; }         /* PERF: only write styles that changed */
    if (T !== logoT) { logoT = T; logoTxt.style.top = T; }
    if (FS !== logoFS) { logoFS = FS; logoTxt.style.fontSize = FS; }
  }

  /* ---------- shared LowKey.io theme ---------- */
  var themeState = { accent:"#e6c58e", secondary:"#fff0b0", cardAlpha:.82, border:.09, glow:.22 };
  function hexRgb(h) {
    try {
      h = String(h || "").replace("#","");
      if (h.length === 3) h = h.split("").map(function(x){ return x+x; }).join("");
      return parseInt(h.slice(0,2),16)+","+parseInt(h.slice(2,4),16)+","+parseInt(h.slice(4,6),16);
    } catch(e) { return "230,197,142"; }
  }
  function applyThemeState(t) {
    if (!t) return;
    for (var k in themeState) if (typeof t[k] !== "undefined") themeState[k] = t[k];
    var root = document.documentElement;
    root.style.setProperty("--lwk-accent", themeState.accent);
    root.style.setProperty("--lwk-accent2", themeState.secondary);
    root.style.setProperty("--lwk-accent-rgb", hexRgb(themeState.accent));
    root.style.setProperty("--lwk-card-alpha", themeState.cardAlpha);
    root.style.setProperty("--lwk-glow", themeState.glow);
    try {
      var pr = hexRgb(themeState.accent).split(",").map(Number);
      var lum = (0.299 * pr[0] + 0.587 * pr[1] + 0.114 * pr[2]) / 255;
      root.style.setProperty("--lwk-on-accent", lum > 0.55 ? "#17130c" : "#ffffff");
    } catch (e) {}
    var old = document.getElementById("lwk-theme-css");
    if (old) old.remove();
    var st = document.createElement("style");
    st.id = "lwk-theme-css";
    st.textContent =
      ".lwk-hud{background:linear-gradient(170deg,rgba(16,19,28,.86),rgba(7,9,14,.88))!important;border-color:rgba(" + hexRgb(themeState.accent) + ",.38)!important;box-shadow:0 8px 24px rgba(0,0,0,.42),0 0 22px rgba(" + hexRgb(themeState.accent) + "," + Math.min(.25,Number(themeState.glow)||.22) + ")!important}" +
      ".lwk-hud .r b,.lwk-hud .g{color:" + themeState.secondary + "!important}.lwk-hud .r span{color:#f7f9ff!important}" +
      ".lwk-hud .bar i{background:" + themeState.accent + "!important}" +
      ".lwk-toast{background:" + themeState.accent + "!important;color:var(--lwk-on-accent,#17130c)!important;box-shadow:0 8px 22px rgba(0,0,0,.45),0 0 18px rgba(" + hexRgb(themeState.accent) + ",.22)!important}" +
      ".lwk-logo-text{background:none!important;color:" + themeState.secondary + "!important;filter:drop-shadow(0 3px 10px rgba(" + hexRgb(themeState.accent) + ",.32))!important}";
    (document.head || document.documentElement).appendChild(st);
  }
  window.addEventListener("message", function(e) {
    if (e.source !== window) return;
    var d = e.data;
    if (d && d.lwkTheme) applyThemeState(d.lwkTheme.theme || d.lwkTheme);
  });

  /* ---------- settings bridge ---------- */
  function applyAll() {
    if (!cfg.boost && stickyOn) { stickyOn = false; releaseBoost(); }
    if (!cfg.macro && M.on) macroStop(false);
    applyLook();
    renderHud();
    document.documentElement.classList.toggle("lwk-rm", !!cfg.reducedMotion);
    var rc = document.documentElement.classList;
    rc.toggle("lwk-clean", !!cfg.clean); rc.toggle("lwk-nokeys", !!cfg.hideKeys); rc.toggle("lwk-stream", !!cfg.stream);
    if (cfg.spineView) spFail = false;
    window.__lwkSpine = !!(cfg.spineView && S.alive && !spFail);
    tintApply();
    dashSync(); secSync();
  }
  window.addEventListener("message", function (e) {
    if (e.source !== window) return;
    var d = e.data;
    if (!d || !d.lwkCfg) return;
    var src = d.lwkCfg.cfg || {}, key;
    for (key in DEF) cfg[key] = (key in src && typeof src[key] === typeof DEF[key]) ? src[key] : DEF[key];
    applyAll();
  });
  function ask() { try { window.postMessage({ lwkReq: 1 }, "*"); } catch (e) {} }

  /* ---------- main loops ---------- */
  var fc = 0, ft = performance.now();
  function frame(t) {
    fc++;
    if (t - ft >= 1000) { fpsVal = Math.round(fc * 1000 / (t - ft)); fc = 0; ft = t; }
    var skip = (cfg.lowPower || cfg.perfFreq === "low") ? 3 : (cfg.perfFreq === "throttle" ? 2 : 1);
    if (skip === 1 || fc % skip === 0) {
      drawAim();
      ooDraw(t);
      drawKillHi();
      drawExtras();
      drawKillPath();
      drawSpine();
      applyEyes();
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    addCss();
    addLuxCss();
    applyThemeState(themeState);
    startBrand();
    placeLogo();
    applyLook();
    ask(); setTimeout(ask, 600); setTimeout(ask, 2000);
    setInterval(tick, 200);
    setInterval(boostTick, 60);
    setInterval(applyLook, 1000);
    setInterval(placeLogo, 300);
    setInterval(secTick, 500);
    requestAnimationFrame(frame);
  }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);


  /* ================= LowKey.io lobby luxe layer ================= */
  function addLuxCss() {
    if ($("lwk-lux-css")) return;
    var AC = "rgba(var(--lwk-accent-rgb),";
    var st = document.createElement("style");
    st.id = "lwk-lux-css";
    var F = "font-family:'Segoe UI Variable','Segoe UI',Inter,Arial,sans-serif;";
    st.textContent = [
      ":root{--lwk-accent-rgb:230,197,142;--lwk-on-accent:#17130c}",
      "html #mybox{background:linear-gradient(160deg,rgba(28,28,36,.90),rgba(9,9,13,.94))!important;border:1px solid " + AC + ".34)!important;border-radius:20px!important;box-shadow:0 22px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08)!important}",
      "html #mybox a{color:var(--lwk-accent2,#f3e2c0)!important}",
      "html .mypb{background:linear-gradient(135deg,var(--lwk-accent2,#f6e6c4),var(--lwk-accent,#d9b98a) 58%," + AC + ".72))!important;color:var(--lwk-on-accent)!important;border:1px solid rgba(255,255,255,.35)!important;box-shadow:0 8px 22px " + AC + ".28),inset 0 1px 0 rgba(255,255,255,.45)!important}",
      "html .mycs,html .mygb,html .mysb{background:rgba(255,255,255,.045)!important;border:1px solid " + AC + ".3)!important;color:#f1e8d6!important}",
      "html .mycs:hover,html .mygb:hover,html .mysb:hover{background:" + AC + ".16)!important;border-color:" + AC + ".65)!important}",
      "html #mybox button:focus-visible,html #mybox input:focus-visible,html #mybox select:focus-visible{outline:2px solid var(--lwk-accent,#e6c58e)!important;outline-offset:2px}",
      "html #ttbox{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;line-height:1.75;scrollbar-width:none;text-shadow:0 1px 3px rgba(0,0,0,.9);" + F + "}",
      "html #ttbox::-webkit-scrollbar{display:none}",
      "html .eem{display:inline!important;min-width:0!important;padding:0!important;margin:0!important;line-height:inherit!important;border-radius:0!important;background:none!important;border:0!important;box-shadow:none!important;color:var(--lwk-accent2,#f3e2c0)!important;font-weight:700;font-size:inherit!important;letter-spacing:0!important}",
      "html #eemenu{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;padding:0!important;scrollbar-width:none;text-shadow:0 1px 3px rgba(0,0,0,.9)}",
      "html #eemenu::-webkit-scrollbar{display:none}",
      "html .lwk-menu-logo{background:linear-gradient(180deg,var(--lwk-accent2,#fff3d6),var(--lwk-accent,#e6c58e) 55%," + AC + ".6))!important;-webkit-background-clip:text!important;background-clip:text!important}",
      "html .lwk-menu-sub{color:" + AC + ".7)!important}html .lwk-menu-rule i{background:var(--lwk-accent,#d9b98a)!important}",
      "html ::-webkit-scrollbar{width:8px;height:8px}html ::-webkit-scrollbar-thumb{background:" + AC + ".35);border-radius:8px}html ::-webkit-scrollbar-track{background:transparent}",
      /* dashboard card */
      "@keyframes lwkIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
      ".lwk-dash{position:fixed;right:14px;top:max(370px,44vh);width:264px;z-index:8;box-sizing:border-box;padding:12px 13px 12px;border-radius:18px;display:none;color:#efe6d3;font-size:12px;font-weight:600;" + F + "background:linear-gradient(160deg,rgba(26,26,34,.90),rgba(9,9,13,.94));border:1px solid " + AC + ".3);box-shadow:0 18px 48px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.07)}",
      ".lwk-dash.on{display:block;animation:lwkIn .22s ease both}",
      ".lwk-dash .h{display:flex;align-items:center;justify-content:space-between}",
      ".lwk-dash .t{font-family:Didot,'Bodoni MT','Playfair Display',Georgia,serif;font-size:15px;font-weight:700;letter-spacing:2px;color:var(--lwk-accent2,#fff0b0)}.lwk-dash .t small{font:600 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1px;color:" + AC + ".7);margin-left:5px}",
      ".lwk-dash .x{width:24px;height:24px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#cfc6b4;cursor:pointer;line-height:1;transition:background .18s,border-color .18s}",
      ".lwk-dash .x:hover{background:" + AC + ".16);border-color:" + AC + ".5)}",
      ".lwk-dash .g{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}",
      ".lwk-dash .c{padding:7px 8px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);min-width:0}",
      ".lwk-dash .c b{display:block;font-size:8.5px;letter-spacing:1.3px;color:" + AC + ".8);font-weight:700}",
      ".lwk-dash .c span{display:block;font-size:14px;color:#fff;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".lwk-dash .l{margin:11px 0 6px;font-size:8.5px;letter-spacing:1.6px;color:#9a917f;font-weight:700}",
      ".lwk-dash .k{display:flex;flex-wrap:wrap;gap:6px}",
      ".lwk-dash .p{padding:5px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#b9b2a3;cursor:pointer;font-size:10.5px;letter-spacing:.5px;font-weight:700;transition:background .18s,color .18s,border-color .18s}",
      ".lwk-dash .p:before{content:'\\25CB  '}.lwk-dash .p.on:before{content:'\\25CF  '}",
      ".lwk-dash .p:hover{border-color:" + AC + ".55)}.lwk-dash .p.on{color:var(--lwk-on-accent,#17130c);background:var(--lwk-accent,#e6c58e);border-color:transparent}",
      ".lwk-dash .s{display:flex;gap:8px}.lwk-dash .sw{width:20px;height:20px;padding:0;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.18);transition:transform .15s,border-color .15s}",
      ".lwk-dash .sw:hover{transform:scale(1.12)}.lwk-dash .sw.on{border-color:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.55)}",
      ".lwk-dash button:focus-visible{outline:2px solid var(--lwk-accent,#e6c58e);outline-offset:2px}",
      ".lwk-dash .f{margin-top:10px;display:flex;justify-content:space-between;font-size:9px;letter-spacing:1px;color:#7d7566}",
      ".lwk-dash.min .bd{display:none}",
      "@media (max-height:800px){.lwk-dash .ext{display:none}}",
      "@media (max-width:1100px){.lwk-dash{display:none!important}}",
      "@media (prefers-reduced-motion:reduce){.lwk-dash,.lwk-dash *{animation:none!important;transition:none!important}}",
      "html.lwk-rm .lwk-dash,html.lwk-rm .lwk-dash *,html.lwk-rm .lwk-sec *{animation:none!important;transition:none!important}",
      "html.lwk-nokeys #ttbox,html.lwk-ingame.lwk-clean #ttbox,html.lwk-ingame.lwk-clean #id_mgraph,html.lwk-ingame.lwk-clean .lwk-ipline{display:none!important}",
      "html.lwk-stream #_myip,html.lwk-stream .lwk-ipline,html.lwk-stream #divpl,html.lwk-stream #nick{filter:blur(6px)}",
      ".lwk-hud.compact{min-width:0;padding:7px 14px;border-radius:999px}.lwk-hud .c1{display:flex;align-items:center;gap:9px;white-space:nowrap;color:#fff}",
      ".lwk-hud .c1 b{font-size:9.5px;letter-spacing:1.2px;font-weight:700}.lwk-hud .c1 i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.5}",
      ".lwk-tint{position:fixed;inset:0;z-index:4;pointer-events:none;display:none}",
      ".lwk-sec{margin:4px 0 8px;padding:12px;border-radius:14px;text-align:left;background:linear-gradient(160deg,rgba(26,26,34,.7),rgba(9,9,13,.8));border:1px solid " + AC + ".32);" + F + "color:#efe6d3;font-size:12px}",
      ".lwk-sec .hd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.lwk-sec .tt{font-family:Didot,Georgia,serif;font-size:15px;font-weight:700;letter-spacing:2px;color:var(--lwk-accent2,#fff0b0)}",
      ".lwk-sec .tt small{font:600 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1px;color:" + AC + ".7);margin-left:4px}.lwk-sec .kh{font-size:10px;color:#9a917f;letter-spacing:.5px}",
      ".lwk-sec .l{margin:11px 0 6px;font-size:8.5px;letter-spacing:1.6px;color:#9a917f;font-weight:700}.lwk-sec .k{display:flex;flex-wrap:wrap;gap:6px}",
      ".lwk-sec .p,.lwk-sec .b{padding:5px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#c9c1b0;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:.4px;transition:background .18s,color .18s,border-color .18s}",
      ".lwk-sec .p:before{content:'\\25CB  '}.lwk-sec .p.on:before{content:'\\25CF  '}.lwk-sec .p:hover,.lwk-sec .b:hover{border-color:" + AC + ".6)}",
      ".lwk-sec .p.on{color:var(--lwk-on-accent,#17130c);background:var(--lwk-accent,#e6c58e);border-color:transparent}",
      ".lwk-sec .r{display:flex;align-items:center;gap:10px;margin:5px 0}.lwk-sec .r span{width:110px;flex:none;color:#cfc6b4}.lwk-sec .r input{flex:1;accent-color:var(--lwk-accent,#e6c58e)}.lwk-sec .r em{width:38px;text-align:right;font-style:normal;color:var(--lwk-accent2,#fff0b0)}",
      ".lwk-sec select,.lwk-sec input[type=text]{background:#0d1018;color:#efe6d3;border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:5px 8px;font-size:11px;min-width:0}.lwk-sec input[type=text]{flex:1;width:100%}",
      ".lwk-sec button:focus-visible,.lwk-sec select:focus-visible,.lwk-sec input:focus-visible{outline:2px solid var(--lwk-accent,#e6c58e);outline-offset:2px}",
      ".lwk-sec .row2{display:flex;gap:6px;align-items:center;flex-wrap:wrap}"
    ].join("");
    (document.head || document.documentElement).appendChild(st);
  }

  /* run history (survives reloads) */
  function loadStats() {
    try { var o = JSON.parse(localStorage.getItem("lwk_stats") || "{}"); return { runs: o.runs | 0, sum: o.sum | 0, best: o.best | 0, last: o.last | 0, ms: o.ms | 0 }; }
    catch (e) { return { runs: 0, sum: 0, best: 0, last: 0, ms: 0 }; }
  }
  function recordRun(sc, ms) {
    try {
      var st = loadStats();
      st.runs++; st.sum += sc; st.last = sc; st.ms += ms; if (sc > st.best) st.best = sc;
      localStorage.setItem("lwk_stats", JSON.stringify(st));
    } catch (e) {}
  }
  function playTime(ms) { var m = Math.floor(ms / 60000), h = Math.floor(m / 60); return h > 0 ? h + "h " + (m % 60) + "m" : m + "m"; }

  /* talk to the extension from the page (same channel the game bridge already uses) */
  function extCall(msg, cb) {
    try {
      var id = localStorage.getItem("tinyscrID");
      if (!id || !window.chrome || !chrome.runtime || !chrome.runtime.sendMessage) { cb(null); return; }
      chrome.runtime.sendMessage(id, msg, function (r) { if (chrome.runtime.lastError) { cb(null); return; } cb(r); });
    } catch (e) { cb(null); }
  }

  var DASH = { el: null, built: false, vis: false, min: false, nodes: {}, cache: {}, syncT: 0 };
  var DASH_CHIPS = [["hud", "HUD"], ["fps", "FPS"], ["aim", "Aim guide"], ["vig", "Vignette"], ["chime", "Chime"], ["toast", "Toasts"]];
  var DASH_SW = [["Gold", "#e6c58e", "#fff0b0"], ["Blue", "#4f8cff", "#a9c8ff"], ["Purple", "#9b6cff", "#cdb6ff"], ["Cyan", "#37d9ff", "#a6efff"], ["Green", "#48df93", "#b2f5d2"], ["Red", "#ff5571", "#ffb0bc"], ["White", "#f3f6ff", "#ffffff"]];

  function dashBuild() {
    if (DASH.built || !document.body) return;
    DASH.built = true;
    try { DASH.min = localStorage.getItem("lwk_dash_min") === "1"; } catch (e) {}
    var d = el("div", "lwk-dash lwk-own"), i, chips = "", sw = "", cells = "";
    d.setAttribute("role", "region"); d.setAttribute("aria-label", BRAND + " dashboard");
    for (i = 0; i < DASH_CHIPS.length; i++) chips += '<button type="button" class="p" data-k="' + DASH_CHIPS[i][0] + '" aria-pressed="false">' + DASH_CHIPS[i][1] + "</button>";
    for (i = 0; i < DASH_SW.length; i++) sw += '<button type="button" class="sw" data-sw="' + i + '" style="background:' + DASH_SW[i][1] + '" title="' + DASH_SW[i][0] + '" aria-label="Accent ' + DASH_SW[i][0] + '"></button>';
    var cs = [["best", "BEST"], ["last", "LAST RUN"], ["runs", "RUNS"], ["avg", "AVERAGE"], ["time", "PLAYTIME"], ["fps", "FPS"]];
    for (i = 0; i < cs.length; i++) cells += '<div class="c"><b>' + cs[i][1] + '</b><span data-s="' + cs[i][0] + '">-</span></div>';
    var ver = ""; try { ver = localStorage.getItem("myscrversion") || ""; } catch (e) {}
    d.innerHTML = '<div class="h"><div class="t">' + BRAND + "<small>" + (ver ? "v" + ver : "") + '</small></div><button type="button" class="x" data-act="min" aria-label="Collapse dashboard"></button></div>' +
      '<div class="bd"><div class="g">' + cells + '</div><div class="ext"><div class="l">QUICK TOGGLES</div><div class="k">' + chips + '</div><div class="l">ACCENT</div><div class="s">' + sw + '</div></div>' +
      '<div class="f"><span>' + BRAND + '</span><span>@davidxsmith</span></div></div>';
    DASH.el = d;
    var ns = d.querySelectorAll("[data-s]");
    for (i = 0; i < ns.length; i++) DASH.nodes[ns[i].getAttribute("data-s")] = ns[i];
    d.classList.toggle("min", DASH.min);
    d.querySelector(".x").textContent = DASH.min ? "+" : "\u2014";
    d.addEventListener("click", dashClick);
  }
  function dashSet(k, v) { if (DASH.cache[k] === v) return; DASH.cache[k] = v; if (DASH.nodes[k]) DASH.nodes[k].textContent = v; }
  function dashSync() {
    if (!DASH.el) return;
    var chips = DASH.el.querySelectorAll("[data-k]"), i, on, b;
    for (i = 0; i < chips.length; i++) { b = chips[i]; on = !!cfg[b.getAttribute("data-k")]; if (b.classList.contains("on") !== on) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); } }
    var sws = DASH.el.querySelectorAll("[data-sw]"), cur = String(themeState.accent || "").toLowerCase();
    for (i = 0; i < sws.length; i++) { on = DASH_SW[+sws[i].getAttribute("data-sw")][1] === cur; if (sws[i].classList.contains("on") !== on) sws[i].classList.toggle("on", on); }
  }
  function dashClick(e) {
    var b = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!b || !DASH.el.contains(b)) return;
    var k = b.getAttribute("data-k"), si = b.getAttribute("data-sw"), act = b.getAttribute("data-act");
    if (act === "min") {
      DASH.min = !DASH.min; DASH.el.classList.toggle("min", DASH.min); b.textContent = DASH.min ? "+" : "\u2014";
      try { localStorage.setItem("lwk_dash_min", DASH.min ? "1" : "0"); } catch (x) {}
      return;
    }
    if (k) { var o = {}; o[k] = !cfg[k]; setCfg(o); return; }
    if (si !== null) {
      var p = DASH_SW[+si]; if (!p) return;
      applyThemeState({ accent: p[1], secondary: p[2] }); dashSync();
      extCall({ greeting: "ntlStorageGet", keys: ["lowkeyTheme"] }, function (r) {
        if (!r || !r.ok) { toast("Theme applied for this session only", true); return; }
        var t = r.data.lowkeyTheme || {}; t.accent = p[1]; t.secondary = p[2];
        extCall({ greeting: "ntlStorageSet", data: { lowkeyTheme: t } }, function (r2) { toast(r2 && r2.ok ? "Theme updated" : "Could not save theme", true); });
      });
    }
  }
  function dashTick() {
    var vis = !S.alive;
    if (vis) { if (!loginEl || !loginEl.isConnected) loginEl = $("login"); if (loginEl && !loginShown(loginEl)) vis = false; }
    if (vis && !DASH.built) dashBuild();
    if (!DASH.el) return;
    if (vis !== DASH.vis) { DASH.vis = vis; DASH.el.classList.toggle("on", vis); if (vis) dashSync(); }
    if (!vis) return;
    var st = loadStats(), best = Math.max(st.best, allBest);
    dashSet("best", fmt(best)); dashSet("last", st.last ? fmt(st.last) : "-"); dashSet("runs", fmt(st.runs));
    dashSet("avg", st.runs ? fmt(Math.round(st.sum / st.runs)) : "-"); dashSet("time", playTime(st.ms)); dashSet("fps", String(fpsVal || "-"));
    var tn = Date.now(); if (tn - DASH.syncT > 1000) { DASH.syncT = tn; dashSync(); }   /* PERF: chip state re-synced 1x/s (setCfg/applyAll still sync instantly) */
  }

  /* ================= shared settings saver, layers, settings-panel tools ================= */
  var pendCfg = {}, pendT = 0;
  function setCfg(obj) {
    var k;
    for (k in obj) if (k in DEF && typeof obj[k] === typeof DEF[k]) { cfg[k] = obj[k]; pendCfg[k] = obj[k]; }
    applyAll();
    clearTimeout(pendT); pendT = setTimeout(flushCfg, 250);
  }
  function flushCfg() {
    var batch = pendCfg; pendCfg = {};
    extCall({ greeting: "ntlStorageGet", keys: ["lwk_cfg"] }, function (r) {
      if (!r || !r.ok) { toast("Saved for this session only", true); return; }
      var c = r.data.lwk_cfg || {}, k; for (k in batch) c[k] = batch[k];
      extCall({ greeting: "ntlStorageSet", data: { lwk_cfg: c } }, function (r2) { if (!r2 || !r2.ok) toast("Could not save setting", true); });
    });
  }
  function saveTheme(acc, sec) {
    extCall({ greeting: "ntlStorageGet", keys: ["lowkeyTheme"] }, function (r) {
      if (!r || !r.ok) return;
      var t = r.data.lowkeyTheme || {}; t.accent = acc; t.secondary = sec;
      extCall({ greeting: "ntlStorageSet", data: { lowkeyTheme: t } }, function () {});
    });
  }

  var tintEl = null;
  function tintApply() {
    var v = Math.max(0, Math.min(50, +cfg.tint || 0));
    if (!v) { if (tintEl) tintEl.style.display = "none"; return; }
    if (!tintEl) tintEl = el("div", "lwk-tint lwk-own");
    tintEl.style.background = "rgba(255,150,40," + (v / 100 * 0.5).toFixed(3) + ")";
    tintEl.style.display = "block";
  }

  var sessT0 = Date.now(), lastBreak = Date.now(), lastIn = null;
  function layerTick() {
    var rc = document.documentElement.classList;
    if (lastIn !== S.alive) { lastIn = S.alive; rc.toggle("lwk-ingame", !!S.alive); }
    var ip = $("_myip");
    if (ip && ip.parentElement && !ip.parentElement.classList.contains("lwk-ipline")) ip.parentElement.classList.add("lwk-ipline");
    if (cfg.breakMin > 0 && Date.now() - lastBreak >= cfg.breakMin * 60000) {
      lastBreak = Date.now();
      toast("Break time - you have been playing " + Math.round((Date.now() - sessT0) / 60000) + " min", true);
    }
  }

  var SEC_CHIPS = [["spineView", "Spine-only enemies"], ["clean", "Clean UI"], ["hideKeys", "Hide hotkey panel"], ["stream", "Streamer mode"], ["hudCompact", "Compact HUD"], ["hud", "HUD"], ["fps", "FPS"], ["foodRadar", "Food radar"], ["targetInd", "Target marker"], ["hideEyes", "Hide enemy eyes"], ["vig", "Vignette"]];
  var SEC_SL = [["tint", "Comfort tint", 0, 50], ["bright", "Brightness", 60, 140], ["sat", "Saturation", 60, 140], ["hudOpacity", "HUD opacity", 35, 100]];
  var SEC_PRE = {
    clean: { clean: true, hideKeys: true, hudCompact: true, fps: false, aim: false, vig: false },
    stream: { stream: true, hideKeys: true, clean: true, hudCompact: true },
    perf: { lowPower: true, perfFreq: "low", reducedMotion: true, vig: false, aim: false, killHi: false, foodRadar: false, targetInd: false, spineView: false },
    reset: { clean: false, hideKeys: false, stream: false, hudCompact: false, spineView: false, tint: 0, bright: 100, sat: 100, vig: false, lowPower: false, perfFreq: "full", reducedMotion: false, breakMin: 0 }
  };
  var SEC_CLAMP = { tint: [0, 50], bright: [40, 160], sat: [40, 160], hudOpacity: [35, 100], hudScale: [70, 130], breakMin: [0, 240] };
  var secFails = 0;

  function exportCode() {
    var o = { c: {}, t: { accent: themeState.accent, secondary: themeState.secondary } }, k;
    for (k in DEF) o.c[k] = cfg[k];
    return "LWK1:" + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  }
  function importCode(str) {
    try {
      str = String(str || "").trim();
      if (str.indexOf("LWK1:") !== 0) throw 0;
      var o = JSON.parse(decodeURIComponent(escape(atob(str.slice(5))))), obj = {}, k, v;
      for (k in DEF) if (o.c && k in o.c && typeof o.c[k] === typeof DEF[k]) {
        v = o.c[k];
        if (SEC_CLAMP[k] && typeof v === "number") v = Math.max(SEC_CLAMP[k][0], Math.min(SEC_CLAMP[k][1], v));
        if (typeof v === "string" && v.length > 12) continue;
        obj[k] = v;
      }
      setCfg(obj);
      if (o.t && /^#[0-9a-f]{6}$/i.test(o.t.accent) && /^#[0-9a-f]{6}$/i.test(o.t.secondary)) { applyThemeState({ accent: o.t.accent, secondary: o.t.secondary }); saveTheme(o.t.accent, o.t.secondary); }
      toast("Config imported", true);
    } catch (e) { toast("Invalid config code", true); }
  }

  function secBuild(tbl) {
    var tr = document.createElement("tr"), td = document.createElement("td"), i, h = "";
    tr.id = "lwk-set-sec"; td.colSpan = 2;
    var chips = "", sl = "";
    for (i = 0; i < SEC_CHIPS.length; i++) chips += '<button type="button" class="p" data-k="' + SEC_CHIPS[i][0] + '" aria-pressed="false">' + SEC_CHIPS[i][1] + "</button>";
    for (i = 0; i < SEC_SL.length; i++) sl += '<div class="r"><span>' + SEC_SL[i][1] + '</span><input type="range" data-r="' + SEC_SL[i][0] + '" min="' + SEC_SL[i][2] + '" max="' + SEC_SL[i][3] + '" aria-label="' + SEC_SL[i][1] + '"><em data-e="' + SEC_SL[i][0] + '"></em></div>';
    h = '<div class="lwk-sec"><div class="hd"><span class="tt">' + BRAND + '<small>TOOLS</small></span><span class="kh" data-kh></span></div>' +
      '<div class="l">VIEW</div><div class="k">' + chips + "</div>" +
      '<div class="l">COMFORT</div>' + sl +
      '<div class="l">PRESETS</div><div class="k"><button type="button" class="b" data-pre="clean">Clean</button><button type="button" class="b" data-pre="stream">Streamer</button><button type="button" class="b" data-pre="perf">Performance</button><button type="button" class="b" data-pre="reset">Defaults</button></div>' +
      '<div class="l">BREAK REMINDER</div><div class="row2"><select data-brk aria-label="Break reminder"><option value="0">Off</option><option value="30">Every 30 min</option><option value="45">Every 45 min</option><option value="60">Every 60 min</option></select></div>' +
      '<div class="l">SHARE CONFIG</div><div class="row2"><button type="button" class="b" data-act="copy">Copy my code</button><input type="text" data-code placeholder="Paste a LWK1: code" aria-label="Config code"><button type="button" class="b" data-act="apply">Apply</button></div></div>';
    td.innerHTML = h; tr.appendChild(td);
    var tb = (tbl.tBodies && tbl.tBodies[0]) || tbl;
    tb.insertBefore(tr, tb.firstChild);
    td.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("button") : null;
      if (!b) return;
      var k = b.getAttribute("data-k"), pre = b.getAttribute("data-pre"), act = b.getAttribute("data-act");
      if (k) { var o = {}; o[k] = !cfg[k]; setCfg(o); }
      else if (pre && SEC_PRE[pre]) { setCfg(SEC_PRE[pre]); toast("Preset applied: " + b.textContent, true); }
      else if (act === "copy") {
        var code = exportCode(), c = td.querySelector("[data-code]");
        try { navigator.clipboard.writeText(code).then(function () { toast("Config code copied", true); }, function () { c.value = code; c.select(); toast("Copy it with Ctrl+C", true); }); }
        catch (x) { c.value = code; c.select(); toast("Copy it with Ctrl+C", true); }
      }
      else if (act === "apply") importCode(td.querySelector("[data-code]").value);
    });
    td.addEventListener("input", function (e) {
      var t = e.target, k = t && t.getAttribute ? t.getAttribute("data-r") : null;
      if (!k) return;
      var o = {}; o[k] = +t.value; setCfg(o);
    });
    td.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.hasAttribute && t.hasAttribute("data-brk")) setCfg({ breakMin: +t.value });
    });
    td.addEventListener("keydown", function (e) { e.stopPropagation(); }, false);
    secSync();
  }
  function secSync() {
    var root = $("lwk-set-sec"); if (!root) return;
    var i, n, on, k;
    var ch = root.querySelectorAll("[data-k]");
    for (i = 0; i < ch.length; i++) { n = ch[i]; on = !!cfg[n.getAttribute("data-k")]; if (n.classList.contains("on") !== on) { n.classList.toggle("on", on); n.setAttribute("aria-pressed", on ? "true" : "false"); } }
    var rs = root.querySelectorAll("[data-r]");
    for (i = 0; i < rs.length; i++) {
      n = rs[i]; k = n.getAttribute("data-r");
      if (document.activeElement !== n && String(n.value) !== String(cfg[k])) n.value = cfg[k];
      var em = root.querySelector('[data-e="' + k + '"]'); if (em) em.textContent = cfg[k] + "%";
    }
    var br = root.querySelector("[data-brk]"); if (br && document.activeElement !== br) br.value = String(cfg.breakMin || 0);
    var kh = root.querySelector("[data-kh]");
    if (kh) kh.textContent = String(cfg.spineKey || "").toUpperCase() + " spine  |  " + String(cfg.cleanKey || "").toUpperCase() + " clean  |  " + String(cfg.mapKey || "").toUpperCase() + String(cfg.mapKey || "").toUpperCase() + " map dot";
  }
  function secTick() {
    if (secFails > 5) return;
    try {
      var tbl = document.querySelector(".opensett-content table");
      if (!tbl) return;
      var ex = $("lwk-set-sec");
      if (ex && tbl.contains(ex)) return;
      if (ex) ex.remove();
      secBuild(tbl);
    } catch (e) { secFails++; }
  }

  window.LWK = { cfg: cfg, toast: toast, score: score };
})();
