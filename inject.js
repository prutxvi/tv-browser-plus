// TV Browser+ — injected by TizenBrew into every page it opens.
//
// Adds a cursor you drive with the TV remote or a phone touchpad, phone-keyboard
// typing into the focused field, scrolling and back/start navigation. The phone
// pairs through the tv-remote Worker using the QR on the start page.
(function () {
  if (window.top !== window || window.__tvBrowserPlus) return;
  window.__tvBrowserPlus = true;

  var START = 'https://tv-remote.pvhome.workers.dev/browser';
  var KEY = { left: 37, up: 38, right: 39, down: 40, ok: 13, back: 10009, red: 403, green: 404, yellow: 405, chUp: 427, chDown: 428 };

  var x = innerWidth / 2, y = innerHeight / 2, cursorOn = true, cursor = null, toastEl = null;

  // ---------- cursor and toast ----------
  function build() {
    if (cursor || !document.documentElement) return;
    cursor = document.createElement('div');
    cursor.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;' +
      'border:4px solid #fff;box-shadow:0 0 0 2px #000,0 0 18px rgba(0,0,0,.6);z-index:2147483647;pointer-events:none;' +
      'will-change:transform;transition:opacity .3s;';
    var dot = document.createElement('div');
    dot.style.cssText = 'position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#ff2a2a';
    cursor.appendChild(dot);
    toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);padding:14px 26px;border-radius:30px;' +
      'background:rgba(0,0,0,.85);color:#fff;font:600 22px sans-serif;letter-spacing:2px;z-index:2147483647;pointer-events:none;' +
      'opacity:0;transition:opacity .3s';
    document.documentElement.appendChild(cursor);
    document.documentElement.appendChild(toastEl);
    draw();
  }
  // Movement can arrive many times per frame from the phone; paint once per frame.
  var drawQueued = false;
  function draw() {
    if (!cursor || drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(function () {
      drawQueued = false;
      cursor.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      cursor.style.opacity = cursorOn ? '1' : '0';
    });
  }
  function toast(t) {
    if (!toastEl) return;
    toastEl.textContent = t;
    toastEl.style.opacity = '1';
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.style.opacity = '0'; }, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();

  // ---------- actions ----------
  function move(dx, dy) {
    x = Math.max(0, Math.min(innerWidth - 1, x + dx));
    y = Math.max(0, Math.min(innerHeight - 1, y + dy));
    // Pushing against the top or bottom edge scrolls the page.
    if (y >= innerHeight - 2 && dy > 0) scroll(dy * 2);
    if (y <= 1 && dy < 0) scroll(dy * 2);
    draw();
  }
  function scroll(dy) {
    var el = document.elementFromPoint(x, y);
    while (el && el !== document.body && el !== document.documentElement) {
      var st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight) { el.scrollTop += dy; return; }
      el = el.parentElement;
    }
    window.scrollBy(0, dy);
  }
  function click() {
    var el = document.elementFromPoint(x, y);
    if (!el) return;
    var opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    ['pointerdown', 'mousedown'].forEach(function (t) { el.dispatchEvent(new MouseEvent(t, opts)); });
    if (el.focus) el.focus();
    ['pointerup', 'mouseup'].forEach(function (t) { el.dispatchEvent(new MouseEvent(t, opts)); });
    el.click();
    if (cursor) { cursor.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(.7)'; setTimeout(draw, 120); }
    if (isTypable(document.activeElement)) toast('Type on your phone');
  }
  function isTypable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    return el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(button|submit|checkbox|radio|range|color|file|image|reset)$/i.test(el.type));
  }
  // Insert text the way a keyboard would, so React/Vue-style inputs notice it.
  function typeText(s) {
    var el = document.activeElement;
    if (!isTypable(el)) return toast('Click a text box first');
    if (el.isContentEditable) { document.execCommand('insertText', false, s); return; }
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    var a = el.selectionStart, b = el.selectionEnd, v = el.value;
    if (a == null) { a = b = v.length; }
    setter.call(el, v.slice(0, a) + s + v.slice(b));
    try { el.setSelectionRange(a + s.length, a + s.length); } catch (e) {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function pressKey(k) {
    var el = document.activeElement || document.body;
    if (k === 'Backspace' && isTypable(el) && !el.isContentEditable) {
      var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      var a = el.selectionStart, b = el.selectionEnd, v = el.value;
      if (a == null) { a = b = v.length; }
      if (a === b && a > 0) a--;
      setter.call(el, v.slice(0, a) + v.slice(b));
      try { el.setSelectionRange(a, a); } catch (e) {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (k === 'Backspace' && el.isContentEditable) { document.execCommand('delete'); return; }
    var code = k === 'Enter' ? 13 : 8;
    var init = { key: k, code: k, keyCode: code, which: code, bubbles: true, cancelable: true };
    var go = el.dispatchEvent(new KeyboardEvent('keydown', init));
    el.dispatchEvent(new KeyboardEvent('keypress', init));
    el.dispatchEvent(new KeyboardEvent('keyup', init));
    if (k === 'Enter' && go && el.form) {
      if (el.form.requestSubmit) el.form.requestSubmit(); else el.form.submit();
    }
  }
  // Text size per site (sites are built for laptops, read from the sofa).
  var ZOOMS = [0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
  function applyZoom(z) {
    if (!document.body) return;
    document.body.style.zoom = z === 1 ? '' : String(z);
  }
  function savedZoom() {
    var z = 1;
    try { z = parseFloat(localStorage.getItem('tvbZoom')) || 1; } catch (e) {}
    return z;
  }
  function zoom(dir) {
    var z = savedZoom(), i = ZOOMS.indexOf(z);
    if (i < 0) i = ZOOMS.indexOf(1);
    z = dir === 0 ? 1 : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))];
    try { localStorage.setItem('tvbZoom', String(z)); } catch (e) {}
    applyZoom(z);
    toast('Text size ' + Math.round(z * 100) + '%');
  }
  function restoreZoom() { var z = savedZoom(); if (z !== 1) applyZoom(z); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreZoom); else restoreZoom();

  function nav(v) {
    if (v === 'start') location.href = START;
    else if (v === 'back') { if (history.length > 1) history.back(); else location.href = START; }
  }

  // ---------- jump mode: arrows hop between links and buttons ----------
  var jumpOn = false, jumpEl = null, box = null;
  var CLICKABLE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[onclick],[tabindex]:not([tabindex="-1"])';
  function visibleRect(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return null;
    var st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || st.opacity === '0') return null;
    return r;
  }
  function drawBox() {
    if (!box) {
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:0;top:0;border:4px solid #ff2a2a;border-radius:10px;box-shadow:0 0 0 3px rgba(0,0,0,.6),0 0 22px rgba(255,42,42,.7);' +
        'z-index:2147483646;pointer-events:none;will-change:transform;';
      document.documentElement.appendChild(box);
    }
    var r = jumpEl && visibleRect(jumpEl);
    if (!jumpOn || !r) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.style.width = (r.width + 12) + 'px'; box.style.height = (r.height + 12) + 'px';
    box.style.transform = 'translate3d(' + (r.left - 6) + 'px,' + (r.top - 6) + 'px,0)';
  }
  function select(el) {
    jumpEl = el;
    var r = el.getBoundingClientRect();
    if (r.top < 60 || r.bottom > innerHeight - 60) { el.scrollIntoView({ block: 'center' }); r = el.getBoundingClientRect(); }
    x = r.left + r.width / 2; y = r.top + r.height / 2;   // keep the cursor on it, so phone taps match
    draw(); drawBox();
  }
  // Pick the nearest clickable thing in the pressed direction; sideways offset costs more than distance.
  function jump(dx, dy) {
    var from = jumpEl && jumpEl.isConnected ? jumpEl.getBoundingClientRect() : { left: x, top: y, width: 0, height: 0 };
    var cx = from.left + from.width / 2, cy = from.top + from.height / 2, best = null, bestScore = Infinity;
    var all = document.querySelectorAll(CLICKABLE);
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === jumpEl) continue;
      var r = visibleRect(el);
      if (!r || r.bottom < -innerHeight || r.top > innerHeight * 2) continue;
      var ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      var main = dx ? (ex - cx) * dx : (ey - cy) * dy, side = dx ? Math.abs(ey - cy) : Math.abs(ex - cx);
      if (main <= 4) continue;
      var score = main + side * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) select(best);
    else if (dy) scroll(dy * innerHeight * 0.6);
  }
  function setJump(on) {
    jumpOn = on; cursorOn = !on;
    if (on) {
      // Start on whatever clickable thing is closest to the cursor.
      var all = document.querySelectorAll(CLICKABLE), best = null, bd = Infinity;
      for (var i = 0; i < all.length; i++) {
        var r = visibleRect(all[i]);
        if (!r || r.bottom < 0 || r.top > innerHeight) continue;
        var d = Math.pow(r.left + r.width / 2 - x, 2) + Math.pow(r.top + r.height / 2 - y, 2);
        if (d < bd) { bd = d; best = all[i]; }
      }
      jumpEl = null;
      if (best) select(best);
      toast('Jump mode · Yellow to switch');
    }
    else toast('Cursor mode');
    draw(); drawBox();
  }
  window.addEventListener('scroll', function () { if (jumpOn) requestAnimationFrame(drawBox); }, true);

  // ---------- TV remote ----------
  // Held arrows speed up, so crossing the screen doesn't take forever.
  var lastKey = 0, lastAt = 0, streak = 0;
  window.addEventListener('keydown', function (e) {
    if (!e.isTrusted) return;   // our own synthetic Enter/Backspace from the phone
    var k = e.keyCode, handled = true;
    if (k === KEY.yellow) setJump(!jumpOn);
    else if (jumpOn && k >= 37 && k <= 40) jump(k === KEY.left ? -1 : k === KEY.right ? 1 : 0, k === KEY.up ? -1 : k === KEY.down ? 1 : 0);
    else if (jumpOn && k === KEY.ok) { if (jumpEl) { jumpEl.focus && jumpEl.focus(); click(); } }
    else if (k === KEY.red) { if (jumpOn) setJump(false); else { cursorOn = !cursorOn; draw(); toast(cursorOn ? 'Cursor on' : 'Cursor off'); } }
    else if (k === KEY.green) nav('start');
    else if (k === KEY.chUp) scroll(-innerHeight * 0.7);
    else if (k === KEY.chDown) scroll(innerHeight * 0.7);
    else if (k === KEY.back) nav('back');
    else if (cursorOn && k >= 37 && k <= 40) {
      var now = Date.now();
      streak = (k === lastKey && now - lastAt < 250) ? streak + 1 : 0;
      lastKey = k; lastAt = now;
      var step = Math.min(14 + streak * 6, 80);
      move(k === KEY.left ? -step : k === KEY.right ? step : 0, k === KEY.up ? -step : k === KEY.down ? step : 0);
    }
    else if (cursorOn && k === KEY.ok) click();
    else handled = false;
    if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // ---------- phone, via the launcher's local service ----------
  function handle(m) {
    if (m.t === 'mv') { if (jumpOn) setJump(false); cursorOn = true; move(+m.dx || 0, +m.dy || 0); }
    else if (m.t === 'tap') click();
    else if (m.t === 'scroll') scroll(+m.dy || 0);
    else if (m.t === 'text' && typeof m.s === 'string') typeText(m.s);
    else if (m.t === 'key' && (m.k === 'Enter' || m.k === 'Backspace')) pressKey(m.k);
    else if (m.t === 'go' && /^https?:\/\//.test(m.url || '')) location.href = m.url;
    else if (m.t === 'nav') nav(m.v);
    else if (m.t === 'zoom') zoom(m.v > 0 ? 1 : m.v < 0 ? -1 : 0);
    else if (m.t === 'k' && m.d) {
      // Plain D-pad presses from the phone behave like the TV remote.
      if (m.c === KEY.ok) click();
      else if (m.c === KEY.back) nav('back');
      else if (m.c >= 37 && m.c <= 40) move(m.c === 37 ? -60 : m.c === 39 ? 60 : 0, m.c === 38 ? -60 : m.c === 40 ? 60 : 0);
    }
  }
  // ---------- phone pairing (through the secure cloud relay) ----------
  // https pages may not talk to the TV's local http service, so the browser
  // pairs through the Worker. The start page owns a private room ID and hands
  // it to later pages in window.name, which survives navigating between sites.
  var CLOUD = 'tv-remote.pvhome.workers.dev';
  function browserRoom() {
    var m = /(?:^|;)tvb:([a-z0-9]{20})/.exec(window.name || '');
    if (location.href.indexOf(START) === 0) {
      var id = '';
      try { id = localStorage.getItem('tvbroom') || ''; } catch (e) {}
      if (!/^[a-z0-9]{20}$/.test(id)) {
        var chars = 'abcdefghijklmnopqrstuvwxyz0123456789', bytes = new Uint8Array(20);
        crypto.getRandomValues(bytes);
        id = '';
        for (var i = 0; i < 20; i++) id += chars.charAt(bytes[i] % chars.length);
        try { localStorage.setItem('tvbroom', id); } catch (e) {}
      }
      window.name = 'tvb:' + id;
      return id;
    }
    return m ? m[1] : '';
  }

  // On the start page, draw the pairing QR in dots.
  function showPairCode(room) {
    var cv = document.getElementById('pairqr');
    if (!cv || typeof qrcode !== 'function') {
      // The page loads the QR library after we start, so wait for it.
      if ((showPairCode.tries = (showPairCode.tries || 0) + 1) < 60) setTimeout(function () { showPairCode(room); }, 250);
      return;
    }
    var qr = qrcode(0, 'M');
    qr.addData('https://' + CLOUD + '/r/' + room);
    qr.make();
    var n = qr.getModuleCount(), cell = 6, ctx = cv.getContext('2d');
    cv.width = cv.height = (n + 2) * cell;
    ctx.fillStyle = '#fff';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) {
      ctx.beginPath(); ctx.arc((c + 1.5) * cell, (r + 1.5) * cell, cell * 0.46, 0, 6.2832); ctx.fill();
    }
  }

  function connect(retry) {
    var room = browserRoom();
    if (!room) return toast('Press Green to reconnect your phone');
    if (location.href.indexOf(START) === 0) showPairCode(room);
    var ws;
    try { ws = new WebSocket('wss://' + CLOUD + '/ws/' + room + '?role=tv'); }
    catch (e) { return; }    // strict CSP on this site
    ws.onopen = function () { ws.send(JSON.stringify({ t: 'screen', s: 'browser' })); };
    ws.onmessage = function (ev) { var m; try { m = JSON.parse(ev.data); } catch (e) { return; } handle(m); };
    ws.onclose = function () { setTimeout(function () { connect(Math.min(retry * 2, 10000)); }, retry); };
  }
  connect(1000);
})();
