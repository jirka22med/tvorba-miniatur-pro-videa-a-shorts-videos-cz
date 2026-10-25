/* =====================================================================
   log-modul.js – logování Můstku Miniatur do DevTools (F12 → Konzole)
   Samostatný modul: do script.js nezasahuje, projekt jen pozoruje zvenku.
   Vlož do index.html těsně PŘED <script src="script.js">.
   Nápověda v konzoli: MMLog.help()
   ===================================================================== */
(function () {
  'use strict';
  if (window.MMLog) return;
  var W = window, T0 = performance.now();

  /* ---------- nastavení (uloží se do localStorage) ---------- */
  var LV = { debug: 0, info: 1, warn: 2, error: 3 };
  var CAT = {
    akce: ['AKCE', '#cc99cc'], ui: ['UI', '#ff9c00'], io: ['IO', '#99cc77'],
    font: ['FONT', '#9999ff'], perf: ['VÝKON', '#ffcc99'], err: ['CHYBA', '#ff6b73'], sys: ['SYS', '#9aa1bd']
  };
  var cfg = { on: true, level: 'info', only: null };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem('mmlog') || '{}')); } catch (e) { }
  try {
    var qp = new URLSearchParams(location.search).get('log');
    if (qp === '0' || qp === 'off') cfg.on = false;
    else if (qp && LV[qp] !== undefined) { cfg.on = true; cfg.level = qp; }
  } catch (e) { }
  function persist() { try { localStorage.setItem('mmlog', JSON.stringify(cfg)); } catch (e) { } }

  /* ---------- pomocné ---------- */
  var ring = [], RING_MAX = 800;
  var fmtT = function (ms) { return ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(2) + ' s'; };
  var kb = function (n) { return n == null ? '?' : n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' kB' : (n / 1048576).toFixed(2) + ' MB'; };
  var css = function (bg, fg) { return 'background:' + bg + ';color:' + (fg || '#000') + ';padding:1px 6px;border-radius:3px;font-weight:700'; };
  function safe(name, fn) { try { fn(); } catch (e) { console.warn('[MMLog] hook „' + name + '“ se nepovedl:', e); } }

  function log(cat, msg, data, lv) {
    try {
      lv = lv || 'info';
      var rec = { t: performance.now() - T0, cat: cat, lv: lv, msg: msg, data: data };
      ring.push(rec); if (ring.length > RING_MAX) ring.shift();
      if (!cfg.on || LV[lv] < LV[cfg.level]) return;
      if (cfg.only && cfg.only.indexOf(cat) < 0 && lv !== 'error') return;
      var c = CAT[cat] || [String(cat).toUpperCase(), '#999'];
      var fn = lv === 'error' ? console.error : lv === 'warn' ? console.warn : console.log;
      var args = ['%c Můstek %c ' + c[0] + ' %c +' + fmtT(rec.t) + ' %c ' + String(msg).replace(/%/g, '%%'),
        css('#ff9c00'), css(c[1]), 'color:#8a8fa8', 'color:inherit'];
      if (data !== undefined) args.push(data);
      fn.apply(console, args);
    } catch (e) { }
  }
  function dom(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  var $ = function (s) { return document.querySelector(s); };

  /* ---------- 1) chyby (včetně nenačtených souborů) ---------- */
  safe('chyby', function () {
    W.addEventListener('error', function (e) {
      var t = e.target;
      if (t && t !== W && (t.src || t.href)) {
        log('err', 'Nenačteno <' + t.tagName.toLowerCase() + '>: ' + (t.src || t.href), undefined, 'error');
      } else {
        log('err', (e.message || 'Neznámá chyba') + (e.filename ? '  [' + e.filename.split('/').pop() + ':' + e.lineno + ':' + e.colno + ']' : ''),
          e.error || undefined, 'error');
      }
    }, true);
    W.addEventListener('unhandledrejection', function (e) {
      var r = e.reason;
      log('err', 'Neošetřený Promise: ' + (r && r.message ? r.message : String(r)), r, 'error');
    });
  });

  /* ---------- 2) kliknutí, klávesy, změny polí, soubory ---------- */
  function describeClick(t) {
    if (t.id === 'modal') return ['ui', 'Dialog: zrušeno (klik mimo okno)'];
    var m = t.closest && t.closest('button,[data-layer],#drop');
    if (!m) return null;
    var d = m.dataset || {};
    var N = { undo: 'Zpět (undo)', redo: 'Znovu (redo)', newp: 'Nový projekt', goExport: 'Uložit obrázek (přechod na Export)', zin: 'Zoom +', zout: 'Zoom −', zfit: 'Zoom: přizpůsobit', drop: 'Přidání obrázku: výběr souborů' };
    if (m.id && N[m.id]) return ['akce', N[m.id]];
    if (m.hasAttribute('data-ok')) return ['ui', 'Dialog: potvrzeno'];
    if (m.hasAttribute('data-no')) return ['ui', 'Dialog: zrušeno'];
    if (d.tab) return ['ui', 'Záložka: ' + d.tab];
    if (d.fmt) return ['akce', 'Formát plátna → ' + d.fmt];
    if (d.guide) return ['ui', 'Pomůcka „' + d.guide + '“ → ' + (m.getAttribute('aria-pressed') === 'true' ? 'vypnuto' : 'zapnuto')];
    if (d.tpl) return ['akce', 'Šablona: ' + d.tpl];
    if (d.add) return ['akce', 'Přidat ' + d.add + (d.v ? ' „' + d.v + '“' : '') + (d.i != null ? ' #' + d.i : '')];
    if (d.act) return ['akce', 'Akce: ' + d.act + (d.id ? ' (' + d.id + ')' : '')];
    if (d.set) return ['akce', 'Nastavit ' + d.set + ' = ' + d.v + (d.t ? ' [' + d.t + ']' : '')];
    if (d.exp) return ['io', 'Export: ' + d.exp + (d.v ? ' = ' + d.v : '')];
    if (m.hasAttribute('data-layer')) return ['ui', 'Vrstva vybrána: ' + d.layer];
    return ['ui', 'Klik: ' + ((m.getAttribute('aria-label') || m.textContent || m.id).trim().slice(0, 40)), 'debug'];
  }
  safe('události', function () {
    document.addEventListener('click', function (e) {
      var r = describeClick(e.target); if (r) log(r[0], r[1], undefined, r[2]);
    }, true);

    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1)) return;
      var k = (e.ctrlKey || e.metaKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      log('ui', 'Klávesa: ' + k, undefined, 'debug');
    }, true);

    document.addEventListener('change', function (e) {
      var el = e.target, d = el.dataset || {};
      if (el.type === 'file') {
        var fl = Array.prototype.slice.call(el.files || []);
        log('io', 'Vybráno souborů: ' + fl.length + ' (' + (el.id || 'input') + ')',
          fl.map(function (f) { return f.name + ' · ' + (f.type || '?') + ' · ' + kb(f.size); }));
      } else if (d.p) {
        log('akce', 'Úprava ' + d.p + (d.t === 'bg' ? ' (pozadí)' : '') + ' = ' + (el.type === 'checkbox' ? el.checked : String(el.value).slice(0, 60)));
      } else if (d.exp) {
        log('io', 'Nastavení exportu: ' + d.exp + ' = ' + el.value);
      }
    }, true);

    document.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files;
      if (f && f.length) log('io', 'Přetaženo souborů: ' + f.length, Array.prototype.map.call(f, function (x) { return x.name + ' · ' + kb(x.size); }));
    }, true);
    document.addEventListener('paste', function (e) {
      var it = e.clipboardData && e.clipboardData.items, n = 0;
      if (it) for (var i = 0; i < it.length; i++) if (it[i].type.indexOf('image/') === 0) n++;
      if (n) log('io', 'Vložen obrázek ze schránky (' + n + '×)');
    }, true);

    /* tah / klik na plátně: souhrn, ne záplava pointermove */
    var ptr = null;
    var pct = function (v, a, s) { return Math.round((v - a) / s * 100); };
    document.addEventListener('pointerdown', function (e) {
      var w = e.target.closest && e.target.closest('#cwrap'); if (!w) return;
      ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, t: performance.now(), n: 0, mx: 0, r: w.getBoundingClientRect(), k: e.pointerType };
    }, true);
    document.addEventListener('pointermove', function (e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      ptr.n++; ptr.x1 = e.clientX; ptr.y1 = e.clientY;
      ptr.mx = Math.max(ptr.mx, Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0));
    }, true);
    var endPtr = function (e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var p = ptr; ptr = null;
      var a = '(' + pct(p.x0, p.r.left, p.r.width) + ' %, ' + pct(p.y0, p.r.top, p.r.height) + ' %)';
      if (e.type === 'pointercancel') return log('ui', 'Plátno: gesto přerušeno ' + a, undefined, 'warn');
      if (p.mx < 4) log('ui', 'Klik na plátno ' + a + ' [' + p.k + ']');
      else log('ui', 'Tah na plátně ' + a + ' → (' + pct(p.x1, p.r.left, p.r.width) + ' %, ' + pct(p.y1, p.r.top, p.r.height) + ' %), ' +
        Math.round(p.mx) + ' px, ' + fmtT(performance.now() - p.t) + ', ' + p.n + ' událostí [' + p.k + ']');
    };
    document.addEventListener('pointerup', endPtr, true);
    document.addEventListener('pointercancel', endPtr, true);
    document.addEventListener('dblclick', function (e) {
      if (e.target.closest && e.target.closest('#cwrap')) log('ui', 'Dvojklik na plátno');
    }, true);
    document.addEventListener('visibilitychange', function () {
      log('sys', 'Karta ' + (document.hidden ? 'skryta' : 'zobrazena'), undefined, 'debug');
    });
  });

  /* ---------- 3) pozorování změn v rozhraní ---------- */
  dom(function () {
    log('sys', 'DOM připraven (' + fmtT(performance.now() - T0) + ' po načtení modulu)');
    function obs(el, opt, cb) { if (el) new MutationObserver(cb).observe(el, opt); }
    var tt = $('#toast');
    obs(tt, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true }, function () {
      if (!tt.hidden && tt.textContent) log('ui', 'Hláška: ' + tt.textContent);
    });
    var md = $('#modal');
    obs(md, { attributes: true, attributeFilter: ['hidden'], childList: true }, function () {
      var h = md.querySelector('h2'), p = md.querySelector('p');
      if (!md.hidden && h) log('ui', 'Dialog: ' + h.textContent + (p ? ' – ' + p.textContent : ''));
    });
    ['undo', 'redo'].forEach(function (id) {
      var b = document.getElementById(id);
      obs(b, { attributes: true, attributeFilter: ['disabled'] }, function () {
        log('ui', (id === 'undo' ? 'Zpět' : 'Znovu') + ': ' + (b.disabled ? 'nedostupné' : 'dostupné'), undefined, 'debug');
      });
    });
    var zv = document.getElementById('zval');
    obs(zv, { childList: true, characterData: true, subtree: true }, function () { log('ui', 'Zoom: ' + zv.textContent); });
    var si = document.getElementById('sizeinfo');
    obs(si, { childList: true, characterData: true, subtree: true }, function () { log('ui', 'Plátno: ' + si.textContent, undefined, 'debug'); });

    /* panel se při každé změně celý překresluje: debounce + zprávy o vrstvách a odhadu exportu */
    var pane = document.getElementById('pane'), tm = 0, last = {}, renders = 0;
    obs(pane, { childList: true, subtree: true, characterData: true }, function () {
      renders++; clearTimeout(tm);
      tm = setTimeout(function () {
        var tabEl = $('#tabs [aria-selected="true"]'), tab = tabEl ? tabEl.dataset.tab : '?';
        log('ui', 'Panel překreslen (' + tab + ', ' + renders + '×)', undefined, 'debug'); renders = 0;
        if (tab === 'layers') {
          var L = pane.querySelectorAll('.layer'), s = pane.querySelector('.layer[aria-current="true"] .nm');
          var nm = s && s.firstChild ? s.firstChild.textContent : '', key = L.length + '|' + nm;
          if (key !== last.layers) { last.layers = key; log('ui', 'Vrstvy: ' + L.length + (s ? ', vybraná „' + nm + '“' : ', žádná vybraná')); }
        }
        var sn = document.getElementById('sizenote');
        if (sn) {
          var tx = sn.textContent.trim();
          if (tx && tx !== last.size && tx.indexOf('Počítám') !== 0) {
            last.size = tx; log('io', 'Odhad exportu: ' + tx, undefined, sn.classList.contains('warn') ? 'warn' : 'info');
          }
        }
      }, 200);
    });
  });

  /* ---------- 4) IndexedDB (automatické ukládání, které v projektu tiše selhává) ---------- */
  safe('indexeddb', function () {
    if (!W.IDBFactory) return;
    var F = IDBFactory.prototype, fo = F.open;
    F.open = function (name, ver) {
      var r = fo.apply(this, arguments);
      log('io', 'IndexedDB: otevírám „' + name + '“ v' + ver, undefined, 'debug');
      r.addEventListener('success', function () { log('io', 'IndexedDB: „' + name + '“ otevřena', undefined, 'debug'); });
      r.addEventListener('upgradeneeded', function () { log('io', 'IndexedDB: vytvářím strukturu „' + name + '“'); });
      r.addEventListener('blocked', function () { log('io', 'IndexedDB: otevření blokuje jiná karta', undefined, 'warn'); });
      r.addEventListener('error', function () { log('io', 'IndexedDB: chyba při otevření: ' + (r.error && r.error.message), r.error, 'error'); });
      return r;
    };
    var D = IDBDatabase.prototype, dt = D.transaction;
    D.transaction = function () {
      var tx = dt.apply(this, arguments);
      tx.addEventListener('abort', function () { log('io', 'IndexedDB: transakce zrušena – ' + (tx.error ? tx.error.name + ': ' + tx.error.message : 'bez chyby'), tx.error || undefined, 'error'); });
      return tx;
    };
    var S = IDBObjectStore.prototype;
    ['put', 'add', 'get', 'delete', 'clear'].forEach(function (m) {
      var o = S[m]; if (!o) return;
      S[m] = function () {
        var t0 = performance.now(), a = arguments, req = o.apply(this, a);
        try {
          var key = (m === 'put' || m === 'add') ? a[1] : a[0], v = a[0];
          var size = typeof v === 'string' ? v.length : (v && v.size);
          req.addEventListener('success', function () {
            var ms = Math.round(performance.now() - t0), res = req.result;
            if (m === 'put' || m === 'add') log('io', 'Autosave: uloženo „' + key + '“ ' + kb(size) + ' za ' + ms + ' ms', undefined, size > 26214400 ? 'warn' : 'info');
            else if (m === 'get') log('io', 'Načteno z úložiště „' + key + '“: ' + (res == null ? 'nic' : kb(typeof res === 'string' ? res.length : res.size)) + ' za ' + ms + ' ms');
            else log('io', 'IndexedDB ' + m + (key !== undefined ? ' „' + key + '“' : '') + ' hotovo');
          });
          req.addEventListener('error', function () {
            var er = req.error;
            log('io', 'IndexedDB ' + m + ' selhalo: ' + (er ? er.name + ' – ' + er.message : '?'), er, 'error');
          });
        } catch (e) { }
        return req;
      };
    });
  });

  /* ---------- 5) canvas, blob URL, stahování, sdílení, schránka ---------- */
  safe('canvas', function () {
    var C = HTMLCanvasElement.prototype, tb = C.toBlob, td = C.toDataURL;
    C.toBlob = function (cb, type, q) {
      var c = this, t0 = performance.now();
      return tb.call(this, function (b) {
        log('io', 'toBlob ' + c.width + '×' + c.height + ' ' + (type || 'image/png') + (q != null ? ' q=' + q : '') + ' → ' + (b ? kb(b.size) : 'NULL') + ' (' + Math.round(performance.now() - t0) + ' ms)',
          undefined, b ? 'debug' : 'error');
        return cb && cb.apply(this, arguments);
      }, type, q);
    };
    C.toDataURL = function () {
      var t0 = performance.now(), r = td.apply(this, arguments);
      log('io', 'toDataURL ' + this.width + '×' + this.height + ' → ' + kb(r.length) + ' (' + Math.round(performance.now() - t0) + ' ms)', undefined, r === 'data:,' ? 'error' : 'debug');
      return r;
    };
  });
  safe('blob-url', function () {
    var cu = URL.createObjectURL, ru = URL.revokeObjectURL, live = new Set();
    URL.createObjectURL = function (o) {
      var u = cu.apply(URL, arguments); live.add(u);
      log('io', 'Blob URL vytvořena (' + ((o && o.type) || '?') + ', ' + kb(o && o.size) + '), aktivních: ' + live.size, undefined, live.size > 40 ? 'warn' : 'debug');
      return u;
    };
    URL.revokeObjectURL = function (u) { live.delete(u); return ru.apply(URL, arguments); };
  });
  safe('stahování', function () {
    var ac = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) log('io', 'Stažení přes odkaz: „' + this.download + '“');
      return ac.apply(this, arguments);
    };
  });
  safe('sdílení', function () {
    if (!navigator.share) return;
    var sh = navigator.share.bind(navigator);
    navigator.share = function (d) {
      log('io', 'Sdílení: zahájeno', d && d.files ? d.files.map(function (f) { return f.name + ' · ' + kb(f.size); }) : d);
      return sh(d).then(function (r) { log('io', 'Sdílení: hotovo'); return r; }, function (e) {
        var ab = e && e.name === 'AbortError';
        log('io', 'Sdílení: ' + (ab ? 'zrušeno uživatelem' : 'chyba – ' + (e && e.message)), ab ? undefined : e, ab ? 'info' : 'error');
        throw e;
      });
    };
  });
  safe('schránka', function () {
    if (!W.Clipboard) return;
    ['write', 'writeText'].forEach(function (m) {
      var o = Clipboard.prototype[m]; if (!o) return;
      Clipboard.prototype[m] = function () {
        var p = o.apply(this, arguments);
        Promise.resolve(p).then(function () { log('io', 'Schránka: ' + m + ' OK'); },
          function (e) { log('io', 'Schránka: ' + m + ' selhalo – ' + (e && e.message), e, 'error'); });
        return p;
      };
    });
  });

  /* ---------- 6) fonty ---------- */
  safe('fonty', function () {
    var fs = document.fonts; if (!fs) return;
    var ol = fs.load.bind(fs);
    fs.load = function (spec, text) {
      var t0 = performance.now(), p = ol(spec, text);
      p.then(function (r) {
        var ms = Math.round(performance.now() - t0);
        if (!r || !r.length) log('font', 'Žádná shoda pro font ' + spec + ' (není v @font-face / Google Fonts?)', undefined, 'warn');
        else if (ms > 400) log('font', 'Font ' + spec + ' se načítal ' + ms + ' ms');
        else log('font', 'Font ' + spec + ' OK (' + ms + ' ms)', undefined, 'debug');
      }, function (e) { log('font', 'Font ' + spec + ' – chyba: ' + (e && e.message), e, 'error'); });
      return p;
    };
    fs.addEventListener('loadingerror', function (e) {
      (e.fontfaces || []).forEach(function (f) { log('font', 'Nepodařilo se načíst font: ' + f.family, undefined, 'error'); });
    });
    fs.ready.then(function () { log('font', 'Všechny fonty hotové (' + fs.size + ' záznamů)'); });
  });

  /* ---------- 7) výkon: pomalé překreslování ---------- */
  safe('výkon', function () {
    var raf = W.requestAnimationFrame.bind(W), lastSlow = -Infinity, slow = 0;
    W.requestAnimationFrame = function (cb) {
      return raf(function (ts) {
        var t = performance.now();
        try { return cb(ts); } finally {
          var d = performance.now() - t;
          if (d > 40) {
            slow++;
            if (t - lastSlow > 1000) { log('perf', 'Pomalý snímek: ' + Math.round(d) + ' ms (pomalých od minule: ' + slow + ')', undefined, 'warn'); lastSlow = t; slow = 0; }
          }
        }
      });
    };
  });

  /* ---------- diagnostika prostředí ---------- */
  function snapshot() {
    var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}, top = '?';
    try { top = W.top === W.self; } catch (e) { top = false; }
    var info = {
      'Prohlížeč': navigator.userAgent,
      'Okno': W.innerWidth + '×' + W.innerHeight + ' @' + W.devicePixelRatio + 'x',
      'Téma systému': W.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'tmavé' : 'světlé',
      'Dotykové ovládání': navigator.maxTouchPoints > 0,
      'IndexedDB (autosave)': !!W.indexedDB,
      'navigator.share': !!navigator.share,
      'Schránka pro obrázky': !!(navigator.clipboard && W.ClipboardItem),
      'Ukládací rozhraní Claude (window.claude.use)': !!(W.claude && W.claude.use),
      'Stránka běží samostatně (top-level)': top,
      'DOMContentLoaded': nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) + ' ms' : '?',
      'Úplné načtení': nav.loadEventEnd ? Math.round(nav.loadEventEnd) + ' ms' : '?'
    };
    console.groupCollapsed('%c Můstek %c Diagnostika prostředí', css('#ff9c00'), css('#9aa1bd'));
    console.table(info); console.groupEnd();
    return info;
  }
  W.addEventListener('load', function () { setTimeout(snapshot, 0); });

  /* ---------- veřejné API: MMLog v konzoli ---------- */
  var text = function () {
    return ring.map(function (r) {
      var d = ''; if (r.data !== undefined) { try { d = ' ' + (r.data instanceof Error ? r.data.name + ': ' + r.data.message : JSON.stringify(r.data).slice(0, 300)); } catch (e) { d = ' [data]'; } }
      return '+' + fmtT(r.t) + ' [' + (CAT[r.cat] ? CAT[r.cat][0] : r.cat) + '/' + r.lv + '] ' + r.msg + d;
    }).join('\n');
  };
  W.MMLog = {
    on: function () { cfg.on = true; persist(); return 'Logování zapnuto'; },
    off: function () { cfg.on = false; persist(); return 'Logování vypnuto (historie se dál ukládá)'; },
    level: function (l) { if (LV[l] === undefined) return 'Úrovně: debug, info, warn, error'; cfg.level = l; persist(); return 'Úroveň: ' + l; },
    only: function () { cfg.only = arguments.length ? Array.prototype.slice.call(arguments) : null; persist(); return cfg.only ? 'Jen: ' + cfg.only.join(', ') : 'Všechny kategorie'; },
    history: function (n) { console.table(ring.slice(-(n || 50)).map(function (r) { return { čas: fmtT(r.t), kat: r.cat, úroveň: r.lv, zpráva: r.msg }; })); },
    text: text,
    copy: function () { return navigator.clipboard.writeText(text()).then(function () { return 'Log zkopírován (' + ring.length + ' řádků)'; }); },
    save: function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text()], { type: 'text/plain;charset=utf-8' }));
      a.download = 'mustek-log-' + new Date().toISOString().replace(/[:.]/g, '-') + '.txt';
      document.body.appendChild(a); a.click(); a.remove();
      return 'Log stažen';
    },
    clear: function () { ring.length = 0; console.clear(); return 'Vyčištěno'; },
    info: snapshot,
    mem: function () {
      var m = performance.memory; if (!m) return 'performance.memory je jen v Chromu';
      console.table({ 'Použito': kb(m.usedJSHeapSize), 'Celkem': kb(m.totalJSHeapSize), 'Limit': kb(m.jsHeapSizeLimit) });
    },
    log: function (cat, msg, data, lv) { log(cat || 'sys', msg, data, lv); },
    help: function () {
      console.log('%c Můstek %c MMLog – příkazy', css('#ff9c00'), css('#9aa1bd'));
      console.table({
        'MMLog.level("debug")': 'víc detailů (klávesy, toBlob, panel, fonty OK…); dál: info / warn / error',
        'MMLog.only("io","err")': 'jen vybrané kategorie: akce, ui, io, font, perf, err, sys; bez argumentů = všechny',
        'MMLog.on() / .off()': 'zapnout / vypnout výpis (zapamatuje se)',
        'MMLog.history(100)': 'tabulka posledních záznamů',
        'MMLog.text() / .copy() / .save()': 'celý log jako text / do schránky / do souboru',
        'MMLog.info() / .mem()': 'diagnostika prostředí / paměť (Chrome)',
        'MMLog.log(kat, zpráva, data, úroveň)': 'vlastní řádek (např. z script.js: window.MMLog && MMLog.log("akce","…"))',
        'URL ?log=debug, ?log=off': 'nastavení přes adresu stránky'
      });
    }
  };
  log('sys', 'Logovací modul aktivní (úroveň: ' + cfg.level + (cfg.only ? ', jen: ' + cfg.only.join('/') : '') + '). Nápověda: MMLog.help()');
})();
