    (() => {
      'use strict';
      /* ---------- helpers ---------- */
      const $ = (s, r = document) => r.querySelector(s);
      const $$ = (s, r = document) => [...r.querySelectorAll(s)];
      const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
      const rad = d => d * Math.PI / 180;
      const esc = s => String(s).replace(/[&<>"]/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
      } [c]));
      let _id = 0;
      const nid = () => 'o' + (++_id) + Math.random().toString(36).slice(2, 6);
      const FORMATS = {
        '16:9': {
          W: 1280,
          H: 720
        },
        '9:16': {
          W: 720,
          H: 1280
        },
        'banner': {
          W: 2560,
          H: 1440
        },
        'avatar': {
          W: 800,
          H: 800
        }
      };
      const fmtCat = () => S.fmt === 'banner' ? 'banner' : S.fmt === 'avatar' ? 'avatar' : 'video';
      const BAN = {
        stripH: 423,
        safeW: 1546,
        tabW: 1855
      }; // YouTube: viditelný pruh, bezpečná zóna (mobil), tablet
      const FONTS = ['JetBrains Mono', 'Anton', 'Bebas Neue', 'Oswald', 'Montserrat', 'Poppins', 'Archivo Black', 'Bangers', 'Roboto Condensed', 'Barlow Condensed', 'Playfair Display', 'Lobster'];
      const BLENDS = [
        ['source-over', 'Normální'],
        ['multiply', 'Násobení'],
        ['screen', 'Zesvětlení (screen)'],
        ['overlay', 'Překrytí'],
        ['soft-light', 'Jemné světlo'],
        ['hard-light', 'Ostré světlo'],
        ['lighten', 'Světlejší'],
        ['darken', 'Tmavší'],
        ['color-dodge', 'Projasnění'],
        ['difference', 'Rozdíl'],
        ['hue', 'Odstín'],
        ['luminosity', 'Svítivost']
      ];
      const SHAPES = [
        ['rect', 'Obdélník'],
        ['round', 'Zaoblený'],
        ['ellipse', 'Elipsa'],
        ['tri', 'Trojúhelník'],
        ['star', 'Hvězda'],
        ['arrow', 'Šipka'],
        ['line', 'Čára'],
        ['diamond', 'Kosočtverec'],
        ['hex', 'Šestiúhelník'],
        ['burst', 'Výbuch'],
        ['bubble', 'Bublina'],
        ['heart', 'Srdce'],
        ['bolt', 'Blesk'],
        ['play', 'Přehrát'],
        ['ring', 'Prstenec'],
        ['cross', 'Křížek'],
        ['check', 'Zaškrtnutí'],
        ['chevron', 'Šipka ›'],
        ['ribbon', 'Stuha'],
        ['pill', 'Pilulka']
      ];
      const getP = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
      const setP = (o, p, v) => {
        const ks = p.split('.');
        const l = ks.pop();
        const t = ks.reduce((a, k) => a[k], o);
        t[l] = v;
      };
      const hexA = (h, a) => {
        h = (h || '#000000').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const n = parseInt(h, 16);
        return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;
      };

      /* ---------- state ---------- */
      let S = null; // {fmt,W,H,bg,objs}
      let assets = {}; // id -> {url,w,h,name}
      const imgCache = new Map(); // id -> HTMLImageElement
      let selId = null;
      let RS = 1; // render scale (shadow/filter pixels are not transformed by the CTM)
      const view = {
        zoom: 'fit',
        z: 1,
        guides: {
          thirds: false,
          center: false,
          safe: false,
          yt: false
        },
        snap: []
      };

      const defBg = () => ({
        type: 'gradient',
        c1: '#10163a',
        c2: '#6a2bd9',
        angle: 135,
        asset: null,
        fit: 'cover',
        px: 50,
        py: 50,
        vig: 0,
        f: {
          brightness: 100,
          contrast: 100,
          saturate: 100,
          blur: 0,
          hue: 0,
          gray: 0,
          sepia: 0
        }
      });
      const defFilters = () => ({
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        hue: 0,
        gray: 0,
        sepia: 0
      });
      const baseObj = (type, o) => Object.assign({
        id: nid(),
        type,
        name: '',
        x: 0,
        y: 0,
        w: 200,
        h: 200,
        rot: 0,
        opacity: 1,
        blend: 'source-over',
        visible: true,
        locked: false,
        flipH: false,
        flipV: false,
        shadow: {
          on: false,
          color: '#000000',
          a: .6,
          blur: 24,
          x: 0,
          y: 8
        }
      }, o);
      const newText = o => baseObj('text', Object.assign({
        text: 'NÁPIS',
        font: 'Anton',
        size: 150,
        weight: 400,
        italic: false,
        align: 'center',
        color: '#ffffff',
        stroke: {
          w: 0,
          color: '#000000'
        },
        ls: 0,
        lh: 1.05,
        upper: false,
        box: {
          on: false,
          color: '#ffd23f',
          pad: 22,
          radius: 12
        },
        w: 800,
        h: 160
      }, o));
      const newShape = (shape, o) => baseObj('shape', Object.assign({
        shape,
        fillOn: true,
        fill: '#ff9c3a',
        grad: false,
        fill2: '#ff3d81',
        angle: 90,
        stroke: {
          w: 0,
          color: '#ffffff'
        },
        radius: shape === 'round' ? 40 : 0,
        w: 300,
        h: 300
      }, o));
      const newImage = (asset, w, h, o) => baseObj('image', Object.assign({
        asset,
        w,
        h,
        fit: 'cover',
        px: 50,
        py: 50,
        radius: 0,
        border: {
          w: 0,
          color: '#ffffff'
        },
        f: defFilters()
      }, o));
      const objLabel = o => o.name || (o.type === 'text' ? (o.text.split('\n')[0].slice(0, 24) || 'Text') : o.type === 'image' ? (assets[o.asset]?.name || 'Obrázek') : (SHAPES.find(s => s[0] === o.shape) || ['', 'Tvar'])[1]);
      const typeLabel = o => ({
        text: 'Text',
        image: 'Obrázek',
        shape: 'Tvar'
      } [o.type]);

      /* ---------- images ---------- */
      const loadImg = url => new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const getImg = id => imgCache.get(id) || null;
      async function importImage(file) {
        const tmp = URL.createObjectURL(file);
        try {
          const im = await loadImg(tmp);
          let w = im.naturalWidth || 1024,
            h = im.naturalHeight || 1024;
          const s = Math.min(1, 2560 / Math.max(w, h));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * s));
          c.height = Math.max(1, Math.round(h * s));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          const keepAlpha = /png|webp|gif|svg/.test(file.type);
          const url = c.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', .92);
          const id = nid();
          assets[id] = {
            url,
            w: c.width,
            h: c.height,
            name: file.name.replace(/\.[^.]+$/, '')
          };
          imgCache.set(id, await loadImg(url));
          return id;
        } finally {
          URL.revokeObjectURL(tmp);
        }
      }

      /* ---------- rendering ---------- */
      const mcv = document.createElement('canvas');
      const mctx = mcv.getContext('2d');
      const tcv = document.createElement('canvas');
      const fontStr = o => `${o.italic?'italic ':''}${o.weight} ${o.size}px "${o.font}", sans-serif`;

      function rr(g, x, y, w, h, r) {
        r = clamp(r || 0, 0, Math.min(w, h) / 2);
        g.beginPath();
        if (!r) {
          g.rect(x, y, w, h);
          return;
        }
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      }

      function filterStr(f, k) {
        const p = [];
        if (f.brightness !== 100) p.push(`brightness(${f.brightness}%)`);
        if (f.contrast !== 100) p.push(`contrast(${f.contrast}%)`);
        if (f.saturate !== 100) p.push(`saturate(${f.saturate}%)`);
        if (f.hue) p.push(`hue-rotate(${f.hue}deg)`);
        if (f.gray) p.push(`grayscale(${f.gray}%)`);
        if (f.sepia) p.push(`sepia(${f.sepia}%)`);
        if (f.blur) p.push(`blur(${f.blur*k}px)`);
        return p.join(' ') || 'none';
      }

      function drawFit(g, im, x, y, w, h, fit, px, py) {
        const iw = im.naturalWidth || im.width,
          ih = im.naturalHeight || im.height;
        if (fit === 'stretch') {
          g.drawImage(im, x, y, w, h);
          return;
        }
        const s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
        const dw = iw * s,
          dh = ih * s;
        g.drawImage(im, x + (w - dw) * (px / 100), y + (h - dh) * (py / 100), dw, dh);
      }

      function gradLine(g, w, h, angle) {
        const a = rad(angle),
          dx = Math.sin(a),
          dy = -Math.cos(a),
          L = Math.abs(w * dx) + Math.abs(h * dy);
        return g.createLinearGradient(w / 2 - dx * L / 2, h / 2 - dy * L / 2, w / 2 + dx * L / 2, h / 2 + dy * L / 2);
      }

      function drawBg(g, W, H) {
        const b = S.bg;
        if (b.type === 'gradient') {
          const gr = gradLine(g, W, H, b.angle);
          gr.addColorStop(0, b.c1);
          gr.addColorStop(1, b.c2);
          g.fillStyle = gr;
        } else g.fillStyle = b.c1;
        g.fillRect(0, 0, W, H);
        if (b.type === 'image' && getImg(b.asset)) {
          g.save();
          g.filter = filterStr(b.f, RS);
          // overscan hides the soft edge that blur leaves
          const m = b.f.blur ? b.f.blur * 2 : 0;
          g.beginPath();
          g.rect(0, 0, W, H);
          g.clip();
          drawFit(g, getImg(b.asset), -m, -m, W + 2 * m, H + 2 * m, b.fit, b.px, b.py);
          g.restore();
        }
        if (b.vig > 0) {
          const d = Math.hypot(W, H) / 2,
            gr = g.createRadialGradient(W / 2, H / 2, d * .35, W / 2, H / 2, d);
          gr.addColorStop(0, 'rgba(0,0,0,0)');
          gr.addColorStop(1, `rgba(0,0,0,${b.vig/100*.85})`);
          g.fillStyle = gr;
          g.fillRect(0, 0, W, H);
        }
      }

      function setShadow(g, o) {
        if (!o.shadow.on) return;
        g.shadowColor = hexA(o.shadow.color, o.shadow.a);
        g.shadowBlur = o.shadow.blur * RS;
        g.shadowOffsetX = o.shadow.x * RS;
        g.shadowOffsetY = o.shadow.y * RS;
      }

      function noShadow(g) {
        g.shadowColor = 'transparent';
        g.shadowBlur = 0;
        g.shadowOffsetX = 0;
        g.shadowOffsetY = 0;
      }

      function layoutText(g, o) {
        g.font = fontStr(o);
        if ('letterSpacing' in g) g.letterSpacing = o.ls + 'px';
        const pad = o.box.on ? o.box.pad : 0,
          maxW = Math.max(10, o.w - pad * 2);
        const src = o.upper ? o.text.toUpperCase() : o.text,
          lines = [];
        for (const para of src.split('\n')) {
          const words = para.split(' ');
          let cur = '';
          for (const w of words) {
            const t = cur ? cur + ' ' + w : w;
            if (cur && g.measureText(t).width > maxW) {
              lines.push(cur);
              cur = w;
            } else cur = t;
          }
          lines.push(cur);
        }
        const lh = o.size * o.lh;
        o.h = Math.max(10, lines.length * lh + pad * 2);
        return {
          lines,
          lh,
          pad
        };
      }

      function drawText(g, o) {
        const L = layoutText(g, o);
        if (o.box.on) {
          g.save();
          setShadow(g, o);
          g.fillStyle = o.box.color;
          rr(g, 0, 0, o.w, o.h, o.box.radius);
          g.fill();
          g.restore();
        }
        g.font = fontStr(o);
        if ('letterSpacing' in g) g.letterSpacing = o.ls + 'px';
        g.textBaseline = 'middle';
        g.textAlign = o.align;
        g.lineJoin = 'round';
        g.miterLimit = 2;
        const x = o.align === 'left' ? L.pad : o.align === 'right' ? o.w - L.pad : o.w / 2;
        L.lines.forEach((ln, i) => {
          const y = L.pad + L.lh * (i + .5);
          if (o.stroke.w > 0) {
            g.save();
            if (!o.box.on) setShadow(g, o);
            g.lineWidth = o.stroke.w * 2;
            g.strokeStyle = o.stroke.color;
            g.strokeText(ln, x, y);
            g.restore();
            g.fillStyle = o.color;
            g.fillText(ln, x, y);
          } else {
            g.save();
            if (!o.box.on) setShadow(g, o);
            g.fillStyle = o.color;
            g.fillText(ln, x, y);
            g.restore();
          }
        });
        if ('letterSpacing' in g) g.letterSpacing = '0px';
      }

      function poly(g, pts) {
        pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
        g.closePath();
      }

      function shapePath(g, o) {
        const w = o.w,
          h = o.h;
        g.beginPath();
        switch (o.shape) {
          case 'ellipse':
            g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            break;
          case 'tri':
            g.moveTo(w / 2, 0);
            g.lineTo(w, h);
            g.lineTo(0, h);
            g.closePath();
            break;
          case 'star':
            for (let i = 0; i < 10; i++) {
              const a = -Math.PI / 2 + i * Math.PI / 5,
                r = i % 2 ? .45 : 1,
                px = w / 2 + Math.cos(a) * r * w / 2,
                py = h / 2 + Math.sin(a) * r * h / 2;
              i ? g.lineTo(px, py) : g.moveTo(px, py);
            }
            g.closePath();
            break;
          case 'arrow': {
            const hl = Math.min(w * .45, h * .95),
              sh = h * .34,
              y0 = (h - sh) / 2;
            g.moveTo(0, y0);
            g.lineTo(w - hl, y0);
            g.lineTo(w - hl, 0);
            g.lineTo(w, h / 2);
            g.lineTo(w - hl, h);
            g.lineTo(w - hl, y0 + sh);
            g.lineTo(0, y0 + sh);
            g.closePath();
            break;
          }
          case 'line':
          case 'pill':
            rr(g, 0, 0, w, h, h / 2);
            break;
          case 'diamond':
            poly(g, [
              [w / 2, 0],
              [w, h / 2],
              [w / 2, h],
              [0, h / 2]
            ]);
            break;
          case 'hex':
            poly(g, [
              [w * .25, 0],
              [w * .75, 0],
              [w, h / 2],
              [w * .75, h],
              [w * .25, h],
              [0, h / 2]
            ]);
            break;
          case 'burst': {
            const pts = [];
            for (let i = 0; i < 28; i++) {
              const a = -Math.PI / 2 + i * Math.PI / 14,
                r = i % 2 ? .8 : 1;
              pts.push([w / 2 + Math.cos(a) * r * w / 2, h / 2 + Math.sin(a) * r * h / 2]);
            }
            poly(g, pts);
            break;
          }
          case 'bubble': {
            const b = h * .8;
            rr(g, 0, 0, w, b, Math.min(w, h) * .18);
            g.moveTo(w * .18, b - 1);
            g.lineTo(w * .38, b - 1);
            g.lineTo(w * .14, h);
            g.closePath();
            break;
          }
          case 'heart': {
            const t = h * .3;
            g.moveTo(w / 2, t);
            g.bezierCurveTo(w / 2, 0, 0, 0, 0, t);
            g.bezierCurveTo(0, (h + t) / 2, w / 2, h * .8, w / 2, h);
            g.bezierCurveTo(w / 2, h * .8, w, (h + t) / 2, w, t);
            g.bezierCurveTo(w, 0, w / 2, 0, w / 2, t);
            g.closePath();
            break;
          }
          case 'bolt':
            poly(g, [
              [.6, 0],
              [.12, .56],
              [.45, .56],
              [.34, 1],
              [.9, .4],
              [.55, .4],
              [.8, 0]
            ].map(p => [p[0] * w, p[1] * h]));
            break;
          case 'play':
            poly(g, [
              [0, 0],
              [w, h / 2],
              [0, h]
            ]);
            break;
          case 'ring': {
            g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            g.closePath();
            const iw = w * .31,
              ih = h * .31;
            g.moveTo(w / 2 + iw, h / 2);
            g.ellipse(w / 2, h / 2, iw, ih, 0, 0, Math.PI * 2, true);
            g.closePath();
            break;
          }
          case 'cross': {
            const a = .35,
              b = .65;
            poly(g, [
              [a, 0],
              [b, 0],
              [b, a],
              [1, a],
              [1, b],
              [b, b],
              [b, 1],
              [a, 1],
              [a, b],
              [0, b],
              [0, a],
              [a, a]
            ].map(p => [p[0] * w, p[1] * h]));
            break;
          }
          case 'check':
            poly(g, [
              [0, .55],
              [.14, .42],
              [.38, .66],
              [.84, .1],
              [1, .24],
              [.38, .96]
            ].map(p => [p[0] * w, p[1] * h]));
            break;
          case 'chevron':
            poly(g, [
              [0, 0],
              [w * .6, 0],
              [w, h / 2],
              [w * .6, h],
              [0, h],
              [w * .4, h / 2]
            ]);
            break;
          case 'ribbon': {
            const n = Math.min(h * .5, w * .15);
            poly(g, [
              [0, 0],
              [w, 0],
              [w - n, h / 2],
              [w, h],
              [0, h],
              [n, h / 2]
            ]);
            break;
          }
          default:
            rr(g, 0, 0, w, h, o.radius);
        }
      }

      function drawShape(g, o) {
        shapePath(g, o);
        if (o.fillOn) {
          g.save();
          setShadow(g, o);
          if (o.grad) {
            const gr = gradLine(g, o.w, o.h, o.angle);
            gr.addColorStop(0, o.fill);
            gr.addColorStop(1, o.fill2);
            g.fillStyle = gr;
          } else g.fillStyle = o.fill;
          g.fill();
          g.restore();
        }
        if (o.stroke.w > 0) {
          g.save();
          g.lineJoin = 'round';
          g.strokeStyle = o.stroke.color;
          if (o.fillOn) {
            g.lineWidth = o.stroke.w * 2;
            g.clip();
          } // inner stroke keeps the outline inside the box
          else {
            setShadow(g, o);
            g.lineWidth = o.stroke.w;
          } // outline only: centred stroke, shadow/glow stays visible
          g.stroke();
          g.restore();
        }
      }

      function drawImageObj(g, o) {
        const im = getImg(o.asset);
        if (!im) {
          g.fillStyle = 'rgba(128,128,160,.35)';
          g.fillRect(0, 0, o.w, o.h);
          return;
        }
        const k = RS;
        tcv.width = Math.max(1, Math.ceil(o.w * k));
        tcv.height = Math.max(1, Math.ceil(o.h * k));
        const t = tcv.getContext('2d');
        t.setTransform(k, 0, 0, k, 0, 0);
        t.clearRect(0, 0, o.w, o.h);
        t.save();
        rr(t, 0, 0, o.w, o.h, o.radius);
        t.clip();
        t.filter = filterStr(o.f, k);
        drawFit(t, im, 0, 0, o.w, o.h, o.fit, o.px, o.py);
        t.filter = 'none';
        if (o.border.w > 0) {
          t.lineWidth = o.border.w * 2;
          t.strokeStyle = o.border.color;
          rr(t, 0, 0, o.w, o.h, o.radius);
          t.stroke();
        }
        t.restore();
        g.save();
        setShadow(g, o);
        g.drawImage(tcv, 0, 0, o.w, o.h);
        g.restore();
      }

      function drawObj(g, o) {
        g.save();
        g.globalAlpha = o.opacity;
        g.globalCompositeOperation = o.blend;
        g.translate(o.x + o.w / 2, o.y + o.h / 2);
        g.rotate(rad(o.rot));
        g.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1);
        g.translate(-o.w / 2, -o.h / 2);
        if (o.type === 'text') drawText(g, o);
        else if (o.type === 'shape') drawShape(g, o);
        else drawImageObj(g, o);
        g.restore();
      }

      function render(g, W, H) {
        g.save();
        g.clearRect(0, 0, W, H);
        drawBg(g, W, H);
        for (const o of S.objs)
          if (o.visible) drawObj(g, o);
        g.restore();
      }
      /* text height must be known before hit-testing; measure all without drawing */
      function measureAll() {
        for (const o of S.objs)
          if (o.type === 'text') layoutText(mctx, o);
      }

      /* ---------- viewport ---------- */
      const cv = $('#cv'),
        ov = $('#ov'),
        cwrap = $('#cwrap'),
        stage = $('#stage');
      const cctx = cv.getContext('2d'),
        octx = ov.getContext('2d');
      let raf = 0;
      const req = () => {
        if (!raf) raf = requestAnimationFrame(() => {
          raf = 0;
          draw();
        });
      };

      function draw() {
        const pk = view.pk || 1;
        RS = pk;
        measureAll();
        cctx.setTransform(pk, 0, 0, pk, 0, 0);
        render(cctx, S.W, S.H);
        RS = 1;
        drawOverlay();
      }
      const fitZ = () => clamp(Math.min((stage.clientWidth - 32) / S.W, (stage.clientHeight - 32) / S.H), .1, 4);

      function layout() {
        view.z = view.zoom === 'fit' ? fitZ() : view.zoom;
        const w = Math.max(40, Math.round(S.W * view.z)),
          h = Math.max(40, Math.round(S.H * view.z)),
          dpr = window.devicePixelRatio || 1;
        cwrap.style.width = w + 'px';
        cwrap.style.height = h + 'px';
        view.pk = Math.min(1, (w * dpr) / S.W); // náhled se kreslí jen v rozlišení obrazovky, export vždy v plné velikosti
        const cw = Math.max(1, Math.round(S.W * view.pk)),
          ch = Math.max(1, Math.round(S.H * view.pk));
        if (cv.width !== cw || cv.height !== ch) {
          cv.width = cw;
          cv.height = ch;
        }
        cv.style.width = w + 'px';
        cv.style.height = h + 'px';
        ov.width = Math.round(w * dpr);
        ov.height = Math.round(h * dpr);
        ov.style.width = w + 'px';
        ov.style.height = h + 'px';
        $('#zval').textContent = (view.zoom === 'fit' ? 'Fit ' : '') + Math.round(view.z * 100) + ' %';
        $('#sizeinfo').textContent = `${S.W} × ${S.H} px`;
        $$('[data-fmt]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmt === S.fmt)));
        syncChips();
        req();
      }

      function setZoom(z) {
        view.zoom = z;
        layout();
      }
      $('#zin').onclick = () => setZoom(clamp((view.zoom === 'fit' ? view.z : view.zoom) * 1.25, .1, 4));
      $('#zout').onclick = () => setZoom(clamp((view.zoom === 'fit' ? view.z : view.zoom) / 1.25, .1, 4));
      $('#zfit').onclick = () => setZoom('fit');
      new ResizeObserver(() => {
        if (S && view.zoom === 'fit') layout();
      }).observe(stage);

      /* ---------- geometry ---------- */
      const getSel = () => S.objs.find(o => o.id === selId) || null;
      const HPOS = {
        nw: [0, 0],
        n: [.5, 0],
        ne: [1, 0],
        e: [1, .5],
        se: [1, 1],
        s: [.5, 1],
        sw: [0, 1],
        w: [0, .5]
      };
      const handlesFor = o => o.type === 'text' ? ['nw', 'ne', 'se', 'sw', 'e', 'w'] : Object.keys(HPOS);
      const CURSORS = {
        nw: 'nwse-resize',
        se: 'nwse-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize'
      };

      function toWorld(o, lx, ly) {
        const a = rad(o.rot),
          dx = lx - o.w / 2,
          dy = ly - o.h / 2;
        return [o.x + o.w / 2 + dx * Math.cos(a) - dy * Math.sin(a), o.y + o.h / 2 + dx * Math.sin(a) + dy * Math.cos(a)];
      }

      function toLocal(o, wx, wy) {
        const a = -rad(o.rot),
          dx = wx - (o.x + o.w / 2),
          dy = wy - (o.y + o.h / 2);
        return [dx * Math.cos(a) - dy * Math.sin(a) + o.w / 2, dx * Math.sin(a) + dy * Math.cos(a) + o.h / 2];
      }
      const U = () => S.W / cwrap.getBoundingClientRect().width;

      function evPt(e) {
        const r = cwrap.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) / r.width * S.W,
          y: (e.clientY - r.top) / r.height * S.H
        };
      }

      function hitTest(x, y, u) {
        for (let i = S.objs.length - 1; i >= 0; i--) {
          const o = S.objs[i];
          if (!o.visible || o.locked) continue;
          const [lx, ly] = toLocal(o, x, y), t = 4 * u;
          if (lx >= -t && lx <= o.w + t && ly >= -t && ly <= o.h + t) return o;
        }
        return null;
      }

      /* ---------- overlay: guides, selection ---------- */
      function drawOverlay() {
        const dpr = window.devicePixelRatio || 1;
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.clearRect(0, 0, ov.width, ov.height);
        const W = S.W,
          H = S.H,
          sc = ov.width / W,
          u = W / (ov.width / dpr);
        octx.setTransform(sc, 0, 0, sc, 0, 0);
        const cs = getComputedStyle(document.documentElement),
          acc = cs.getPropertyValue('--accent').trim() || '#ffa24a';
        const g = octx,
          gv = view.guides;
        g.lineWidth = 1 * u;
        if (gv.thirds) {
          g.strokeStyle = 'rgba(255,255,255,.55)';
          g.setLineDash([6 * u, 5 * u]);
          g.beginPath();
          for (const f of [1 / 3, 2 / 3]) {
            g.moveTo(W * f, 0);
            g.lineTo(W * f, H);
            g.moveTo(0, H * f);
            g.lineTo(W, H * f);
          }
          g.stroke();
        }
        if (gv.center) {
          g.strokeStyle = 'rgba(90,220,255,.8)';
          g.setLineDash([]);
          g.beginPath();
          g.moveTo(W / 2, 0);
          g.lineTo(W / 2, H);
          g.moveTo(0, H / 2);
          g.lineTo(W, H / 2);
          g.stroke();
        }
        if (gv.safe) {
          g.strokeStyle = 'rgba(255,210,63,.9)';
          g.setLineDash([8 * u, 6 * u]);
          g.strokeRect(W * .05, H * .05, W * .9, H * .9);
        }
        if (gv.banner && S.fmt === 'banner') {
          const sh = BAN.stripH,
            y0 = (H - sh) / 2,
            sw = BAN.safeW,
            tw = BAN.tabW;
          g.setLineDash([]);
          g.fillStyle = 'rgba(0,0,0,.55)';
          g.fillRect(0, 0, W, y0);
          g.fillRect(0, y0 + sh, W, H - y0 - sh);
          g.fillStyle = 'rgba(0,0,0,.28)';
          g.fillRect(0, y0, (W - tw) / 2, sh);
          g.fillRect((W + tw) / 2, y0, (W - tw) / 2, sh);
          g.lineWidth = 2 * u;
          g.strokeStyle = 'rgba(255,255,255,.75)';
          g.strokeRect(0, y0, W, sh);
          g.setLineDash([10 * u, 7 * u]);
          g.strokeStyle = 'rgba(120,200,255,.95)';
          g.beginPath();
          g.moveTo((W - tw) / 2, y0);
          g.lineTo((W - tw) / 2, y0 + sh);
          g.moveTo((W + tw) / 2, y0);
          g.lineTo((W + tw) / 2, y0 + sh);
          g.stroke();
          g.setLineDash([]);
          g.strokeStyle = 'rgba(255,210,63,.98)';
          g.strokeRect((W - sw) / 2, y0, sw, sh);
          g.font = `600 ${13*u}px sans-serif`;
          g.fillStyle = '#fff';
          g.textBaseline = 'bottom';
          g.textAlign = 'left';
          g.fillText('POČÍTAČ · celý pruh 2560 × 423', 8 * u, y0 - 8 * u);
          g.textAlign = 'right';
          g.fillStyle = 'rgba(150,215,255,1)';
          g.fillText('TABLET · 1855 × 423 (čárkovaně)', W - 8 * u, y0 - 8 * u);
          g.textBaseline = 'top';
          g.textAlign = 'center';
          g.fillStyle = 'rgba(255,215,80,1)';
          g.fillText('MOBIL A BEZPEČNÁ ZÓNA · 1546 × 423 · sem patří text a logo', W / 2, y0 + sh + 8 * u);
          g.textBaseline = 'bottom';
          g.textAlign = 'left';
          g.fillStyle = 'rgba(255,255,255,.85)';
          g.fillText('TV zobrazí celý obrázek 2560 × 1440', 8 * u, H - 8 * u);
          g.textAlign = 'start';
        }
        if (gv.avatar && S.fmt === 'avatar') {
          g.setLineDash([]);
          g.fillStyle = 'rgba(0,0,0,.62)';
          g.beginPath();
          g.rect(0, 0, W, H);
          g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2, true);
          g.fill('evenodd');
          g.strokeStyle = 'rgba(255,210,63,.98)';
          g.lineWidth = 2 * u;
          g.beginPath();
          g.arc(W / 2, H / 2, W / 2 - u, 0, Math.PI * 2);
          g.stroke();
          g.font = `600 ${13*u}px sans-serif`;
          g.fillStyle = 'rgba(255,215,80,1)';
          g.textAlign = 'center';
          g.textBaseline = 'bottom';
          g.fillText('YouTube ukáže jen kruh · zobrazí se 98 × 98 px', W / 2, H - 8 * u);
          g.textAlign = 'start';
        }
        if (gv.yt) {
          const zones = W > H ? [
            [.86, .86, .14, .14, 'čas videa']
          ] : [
            [0, 0, 1, .06, 'stavový řádek'],
            [.84, .42, .16, .46, 'tlačítka'],
            [0, .86, 1, .14, 'název a kanál']
          ];
          g.setLineDash([]);
          g.font = `600 ${12*u}px sans-serif`;
          g.textBaseline = 'top';
          for (const [x, y, w, h, t] of zones) {
            g.fillStyle = 'rgba(255,40,70,.30)';
            g.fillRect(W * x, H * y, W * w, H * h);
            g.strokeStyle = 'rgba(255,70,90,.9)';
            g.strokeRect(W * x, H * y, W * w, H * h);
            g.fillStyle = '#fff';
            g.fillText(t, W * x + 6 * u, H * y + 5 * u);
          }
        }
        g.setLineDash([]);
        if (view.snap.length) {
          g.strokeStyle = '#ff3dd0';
          g.lineWidth = 1.5 * u;
          g.beginPath();
          for (const s of view.snap) {
            if ('x' in s) {
              g.moveTo(s.x, 0);
              g.lineTo(s.x, H);
            } else {
              g.moveTo(0, s.y);
              g.lineTo(W, s.y);
            }
          }
          g.stroke();
        }
        const o = getSel();
        if (!o || !o.visible) return;
        g.lineWidth = 1.5 * u;
        g.strokeStyle = acc;
        const c = [
          [0, 0],
          [o.w, 0],
          [o.w, o.h],
          [0, o.h]
        ].map(p => toWorld(o, p[0], p[1]));
        g.beginPath();
        c.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
        g.closePath();
        g.stroke();
        if (o.locked) return;
        const hs = 9 * u;
        g.fillStyle = '#fff';
        for (const h of handlesFor(o)) {
          const [x, y] = toWorld(o, HPOS[h][0] * o.w, HPOS[h][1] * o.h);
          g.beginPath();
          g.rect(x - hs / 2, y - hs / 2, hs, hs);
          g.fill();
          g.stroke();
        }
        const [tx, ty] = toWorld(o, o.w / 2, 0), [rx, ry] = toWorld(o, o.w / 2, -26 * u);
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(rx, ry);
        g.stroke();
        g.beginPath();
        g.arc(rx, ry, 5.5 * u, 0, Math.PI * 2);
        g.fillStyle = acc;
        g.fill();
        g.strokeStyle = '#fff';
        g.stroke();
      }

      /* ---------- history ---------- */
      let hist = [],
        hi = -1,
        saveT = 0;
      const snapStr = () => JSON.stringify({
        fmt: S.fmt,
        W: S.W,
        H: S.H,
        bg: S.bg,
        objs: S.objs
      });

      function updUndo() {
        $('#undo').disabled = hi <= 0;
        $('#redo').disabled = hi >= hist.length - 1;
      }

      function commit() {
        const s = snapStr();
        if (hist[hi] === s) return;
        hist = hist.slice(0, hi + 1);
        hist.push(s);
        if (hist.length > 80) hist.shift();
        hi = hist.length - 1;
        updUndo();
        scheduleSave();
      }

      function restore(s) {
        const d = JSON.parse(s);
        S = {
          fmt: d.fmt,
          W: d.W,
          H: d.H,
          bg: d.bg,
          objs: d.objs
        };
        if (!getSel()) selId = null;
        layout();
        renderPane();
      }

      function undo() {
        if (hi > 0) {
          hi--;
          restore(hist[hi]);
          updUndo();
          scheduleSave();
        }
      }

      function redo() {
        if (hi < hist.length - 1) {
          hi++;
          restore(hist[hi]);
          updUndo();
          scheduleSave();
        }
      }
      $('#undo').onclick = undo;
      $('#redo').onclick = redo;

      /* ---------- selection and object operations ---------- */
      let tab = 'add';

      function select(id, fromCanvas) {
        selId = id;
        if (fromCanvas && id && (tab === 'add' || tab === 'tpl')) tab = 'props';
        renderPane();
        req();
      }

      function addObj(o, openProps = true) {
        S.objs.push(o);
        selId = o.id;
        if (openProps) tab = 'props';
        commit();
        renderPane();
        req();
      }

      function delSel() {
        const o = getSel();
        if (!o) return;
        S.objs = S.objs.filter(x => x !== o);
        selId = null;
        commit();
        renderPane();
        req();
      }

      function dupSel() {
        const o = getSel();
        if (!o) return;
        const c = JSON.parse(JSON.stringify(o));
        c.id = nid();
        c.x += 24;
        c.y += 24;
        c.name = o.name ? o.name + ' kopie' : '';
        S.objs.splice(S.objs.indexOf(o) + 1, 0, c);
        selId = c.id;
        commit();
        renderPane();
        req();
      }

      function reorder(id, dir) {
        const i = S.objs.findIndex(o => o.id === id),
          j = i + dir;
        if (i < 0 || j < 0 || j >= S.objs.length) return;
        const [o] = S.objs.splice(i, 1);
        S.objs.splice(j, 0, o);
        commit();
        renderPane();
        req();
      }

      function alignSel(a) {
        const o = getSel();
        if (!o) return;
        if (a === 'l') o.x = 0;
        if (a === 'c') o.x = (S.W - o.w) / 2;
        if (a === 'r') o.x = S.W - o.w;
        if (a === 't') o.y = 0;
        if (a === 'm') o.y = (S.H - o.h) / 2;
        if (a === 'b') o.y = S.H - o.h;
        commit();
        syncProps();
        req();
      }
      let clip = null;

      function copySel() {
        const o = getSel();
        if (o) {
          clip = JSON.parse(JSON.stringify(o));
          toast('Zkopírováno');
        }
      }

      function pasteSel() {
        if (!clip) return false;
        const c = JSON.parse(JSON.stringify(clip));
        c.id = nid();
        c.x += 28;
        c.y += 28;
        clip.x += 28;
        clip.y += 28;
        addObj(c);
        return true;
      }

      /* ---------- pointer interaction ---------- */
      let drag = null;

      function pickHandle(o, p, u, touch) {
        const tol = (touch ? 18 : 10) * u;
        const [rx, ry] = toWorld(o, o.w / 2, -26 * u);
        if (Math.hypot(p.x - rx, p.y - ry) < tol) return 'rot';
        for (const h of handlesFor(o)) {
          const [hx, hy] = toWorld(o, HPOS[h][0] * o.w, HPOS[h][1] * o.h);
          if (Math.hypot(p.x - hx, p.y - hy) < tol) return h;
        }
        return null;
      }
      cwrap.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        const p = evPt(e),
          u = U(),
          sel = getSel(),
          touch = e.pointerType === 'touch';
        let mode = null,
          h = null;
        if (sel && sel.visible && !sel.locked) {
          const k = pickHandle(sel, p, u, touch);
          if (k === 'rot') mode = 'rotate';
          else if (k) {
            mode = 'resize';
            h = k;
          }
        }
        if (!mode) {
          const hit = hitTest(p.x, p.y, u);
          if (hit) {
            if (hit.id !== selId) select(hit.id, true);
            mode = 'move';
          } else {
            select(null);
            return;
          }
        }
        const o = getSel();
        drag = {
          mode,
          h,
          sp: p,
          orig: {
            x: o.x,
            y: o.y,
            w: o.w,
            h: o.h,
            rot: o.rot,
            size: o.size
          },
          moved: false
        };
        cwrap.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      cwrap.addEventListener('pointermove', e => {
        const o = getSel(),
          p = evPt(e),
          u = U();
        if (!drag) {
          let cur = 'default';
          if (o && o.visible && !o.locked) {
            const k = pickHandle(o, p, u, false);
            if (k === 'rot') cur = 'grab';
            else if (k) cur = CURSORS[k];
            else if (hitTest(p.x, p.y, u)) cur = 'move';
          } else if (hitTest(p.x, p.y, u)) cur = 'move';
          cwrap.style.cursor = cur;
          return;
        }
        if (!o) return;
        drag.moved = true;
        if (drag.mode === 'move') doMove(o, p, e, u);
        else if (drag.mode === 'resize') doResize(o, p, e);
        else doRotate(o, p, e);
        syncProps();
        req();
      });
      const endDrag = () => {
        if (!drag) return;
        const m = drag.moved;
        drag = null;
        view.snap = [];
        if (m) commit();
        req();
      };
      cwrap.addEventListener('pointerup', endDrag);
      cwrap.addEventListener('pointercancel', endDrag);
      cwrap.addEventListener('dblclick', e => {
        const o = getSel();
        if (o && o.type === 'text') {
          tab = 'props';
          renderPane();
          const t = $('#pane textarea');
          if (t) {
            t.focus();
            t.select();
          }
        }
      });

      function doMove(o, p, e, u) {
        let nx = drag.orig.x + (p.x - drag.sp.x),
          ny = drag.orig.y + (p.y - drag.sp.y);
        view.snap = [];
        if (!e.altKey) {
          const W = S.W,
            H = S.H,
            th = 7 * u,
            m = view.guides.safe;
          const bn = view.guides.banner && S.fmt === 'banner';
          const xs = [0, W / 2, W].concat(m ? [W * .05, W * .95] : [], bn ? [(W - BAN.safeW) / 2, (W + BAN.safeW) / 2] : []),
            ys = [0, H / 2, H].concat(m ? [H * .05, H * .95] : [], bn ? [(H - BAN.stripH) / 2, (H + BAN.stripH) / 2] : []);
          const pick = (vals, targets) => {
            let b = null;
            for (const v of vals)
              for (const t of targets) {
                const d = t - v;
                if (Math.abs(d) < th && (!b || Math.abs(d) < Math.abs(b.d))) b = {
                  d,
                  t
                };
              }
            return b;
          };
          const bx = pick([nx, nx + o.w / 2, nx + o.w], xs),
            by = pick([ny, ny + o.h / 2, ny + o.h], ys);
          if (bx) {
            nx += bx.d;
            view.snap.push({
              x: bx.t
            });
          }
          if (by) {
            ny += by.d;
            view.snap.push({
              y: by.t
            });
          }
        }
        o.x = Math.round(nx * 10) / 10;
        o.y = Math.round(ny * 10) / 10;
      }

      function doResize(o, p, e) {
        const g = drag.orig,
          h = drag.h,
          [lx, ly] = toLocal(g, p.x, p.y);
        let L = 0,
          T = 0,
          R = g.w,
          B = g.h;
        if (h.includes('w')) L = lx;
        if (h.includes('e')) R = lx;
        if (h.includes('n')) T = ly;
        if (h.includes('s')) B = ly;
        const minW = o.type === 'text' ? 40 : 16,
          minH = 16;
        if (h.length === 2) {
          let nw = Math.max(minW, Math.abs(R - L)),
            nh = Math.max(minH, Math.abs(B - T));
          if (o.type === 'text' || !e.shiftKey) {
            const s = o.type === 'text' ? nw / g.w : Math.max(nw / g.w, nh / g.h);
            nw = g.w * s;
            nh = g.h * s;
          }
          L = h.includes('w') ? g.w - nw : 0;
          R = L + nw;
          T = h.includes('n') ? g.h - nh : 0;
          B = T + nh;
          if (o.type === 'text') o.size = Math.round(Math.max(8, g.size * nw / g.w));
        } else {
          if (R - L < minW) {
            if (h === 'w') L = R - minW;
            else R = L + minW;
          }
          if (B - T < minH) {
            if (h === 'n') T = B - minH;
            else B = T + minH;
          }
        }
        const [cx, cy] = toWorld(g, (L + R) / 2, (T + B) / 2);
        o.w = Math.round((R - L) * 10) / 10;
        o.h = Math.round((B - T) * 10) / 10;
        o.x = Math.round((cx - o.w / 2) * 10) / 10;
        o.y = Math.round((cy - o.h / 2) * 10) / 10;
      }

      function doRotate(o, p, e) {
        let a = Math.atan2(p.y - (o.y + o.h / 2), p.x - (o.x + o.w / 2)) * 180 / Math.PI + 90;
        a = ((a + 540) % 360) - 180;
        if (e.shiftKey) a = Math.round(a / 15) * 15;
        else
          for (const s of [-180, -90, 0, 90, 180])
            if (Math.abs(a - s) < 3) a = s;
        o.rot = Math.round(a * 10) / 10;
      }

      /* ---------- keyboard and paste ---------- */
      const typing = t => t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      document.addEventListener('keydown', e => {
        if (typing(e.target) || $('#modal').hidden === false) return;
        const mod = e.ctrlKey || e.metaKey,
          k = e.key.toLowerCase(),
          o = getSel();
        if (mod && k === 'z') {
          e.preventDefault();
          e.shiftKey ? redo() : undo();
          return;
        }
        if (mod && k === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        if (mod && k === 'd') {
          e.preventDefault();
          dupSel();
          return;
        }
        if (mod && k === 'c' && o) {
          e.preventDefault();
          copySel();
          return;
        }
        if (mod && k === 'v' && clip) {
          e.preventDefault();
          pasteSel();
          return;
        }
        if (mod && k === 's') {
          e.preventDefault();
          saveImage();
          return;
        }
        if (!o) return;
        if (k === 'delete' || k === 'backspace') {
          e.preventDefault();
          delSel();
          return;
        }
        if (k === 'escape') {
          select(null);
          return;
        }
        if (k === '[') {
          reorder(o.id, -1);
          return;
        }
        if (k === ']') {
          reorder(o.id, 1);
          return;
        }
        const d = e.shiftKey ? 10 : 1;
        if (k.startsWith('arrow') && !o.locked) {
          e.preventDefault();
          if (k === 'arrowleft') o.x -= d;
          if (k === 'arrowright') o.x += d;
          if (k === 'arrowup') o.y -= d;
          if (k === 'arrowdown') o.y += d;
          syncProps();
          req();
          clearTimeout(drag_t);
          drag_t = setTimeout(commit, 350);
        }
      });
      let drag_t = 0;
      document.addEventListener('paste', async e => {
        if (typing(e.target)) return;
        const files = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean);
        if (files.length) {
          e.preventDefault();
          await addFiles(files);
        }
      });
      document.addEventListener('dragover', e => {
        if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
      });
      document.addEventListener('drop', async e => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        await addFiles(e.dataTransfer.files);
      });

      /* ---------- toast and modal ---------- */
      let toastT = 0;

      function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.hidden = false;
        clearTimeout(toastT);
        toastT = setTimeout(() => {
          t.hidden = true;
        }, 2600);
      }

      function ask(title, text, okLabel = 'Pokračovat') {
        return new Promise(res => {
          const m = $('#modal');
          m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button type="button" class="btn pri" data-ok>${esc(okLabel)}</button><button type="button" class="btn" data-no>Zrušit</button></div></div>`;
          m.hidden = false;
          const done = v => {
            m.hidden = true;
            m.innerHTML = '';
            res(v);
          };
          $('[data-ok]', m).onclick = () => done(true);
          $('[data-no]', m).onclick = () => done(false);
          m.onclick = e => {
            if (e.target === m) done(false);
          };
          $('[data-ok]', m).focus();
        });
      }

      /* ---------- panel: field builders ---------- */
      const ic = {
        eye: '<svg class="i" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
        eyeoff: '<svg class="i" viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.7A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.9"/></svg>',
        lock: '<svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
        unlock: '<svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
        up: '<svg class="i" viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
        down: '<svg class="i" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
        trash: '<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
      };
      let TG = '';
      const tg = () => TG ? ` data-t="${TG}"` : '';
      const fRange = (label, p, min, max, step, o = {}) => `<label class="f"><span class="lab"><span>${label}</span><output></output></span><input type="range" data-p="${p}"${tg()} data-k="${o.k||1}" data-u="${o.u||''}" min="${min}" max="${max}" step="${step}"></label>`;
      const fNum = (label, p, step, o = {}) => `<label class="f"><span class="lab"><span>${label}</span></span><input type="number" data-p="${p}"${tg()} step="${step}"${o.ro?' readonly':''}></label>`;
      const fCol = (label, p) => `<label class="f"><span class="lab"><span>${label}</span></span><input type="color" data-p="${p}"${tg()}></label>`;
      const fSel = (label, p, opts, o = {}) => `<label class="f"><span class="lab"><span>${label}</span></span><select data-p="${p}"${tg()}${o.r?' data-r':''}${o.num?' data-num="1"':''}>${opts.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('')}</select></label>`;
      const fChk = (label, p, r) => `<label class="chk"><input type="checkbox" data-p="${p}"${tg()}${r?' data-r':''}><span>${label}</span></label>`;
      const fOpt = (p, opts, r) => `<div class="opt" role="group">${opts.map(x=>`<button type="button" data-set="${p}" data-v="${x[0]}"${tg()}${r?' data-r':''}>${x[1]}</button>`).join('')}</div>`;
      const sec = (title, body) => `<div class="sec"><h3>${title}</h3>${body}</div>`;

      /* ---------- panel: tabs ---------- */
      let lastTab = null;

      function renderPane() {
        $$('#tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
        const pane = $('#pane'),
          keep = lastTab === tab ? pane.scrollTop : 0;
        pane.innerHTML = ({
          add: paneAdd,
          tpl: paneTpl,
          props: paneProps,
          layers: paneLayers,
          export: paneExport
        })[tab]();
        pane.scrollTop = keep;
        lastTab = tab;
        if (tab === 'props') syncProps();
        if (tab === 'tpl') drawThumbs();
        if (tab === 'export') {
          syncExport();
          updateSize();
        }
      }
      $('#tabs').addEventListener('click', e => {
        const b = e.target.closest('[data-tab]');
        if (b) {
          tab = b.dataset.tab;
          renderPane();
        }
      });
      $('#goExport').onclick = () => saveImage();

      /* ---------- tab: add ---------- */
      const TEXT_PRESETS = [{
          n: 'Nadpis',
          css: "font:400 26px 'Anton';color:#fff;-webkit-text-stroke:1px #000",
          o: {
            text: 'NADPIS VIDEA',
            font: 'Anton',
            size: 150,
            color: '#ffffff',
            stroke: {
              w: 10,
              color: '#000000'
            },
            shadow: {
              on: true,
              color: '#000000',
              a: .6,
              blur: 18,
              x: 0,
              y: 8
            }
          }
        },
        {
          n: 'Podnadpis',
          css: "font:800 18px 'Montserrat';color:#fff",
          o: {
            text: 'Krátký podnadpis',
            font: 'Montserrat',
            weight: 800,
            size: 64,
            color: '#ffffff',
            shadow: {
              on: true,
              color: '#000000',
              a: .55,
              blur: 16,
              x: 0,
              y: 4
            }
          }
        },
        {
          n: 'Štítek',
          css: "font:400 16px 'Archivo Black';color:#111;background:#ffd23f;padding:3px 9px;border-radius:5px",
          o: {
            text: 'NOVINKA',
            font: 'Archivo Black',
            size: 56,
            color: '#111111',
            upper: true,
            w: 420,
            box: {
              on: true,
              color: '#ffd23f',
              pad: 18,
              radius: 10
            }
          }
        },
        {
          n: 'Neon',
          css: "font:400 24px 'Bebas Neue';color:#fff;text-shadow:0 0 8px #00e5ff,0 0 16px #00e5ff",
          o: {
            text: 'NEON',
            font: 'Bebas Neue',
            size: 170,
            color: '#ffffff',
            ls: 6,
            shadow: {
              on: true,
              color: '#00e5ff',
              a: 1,
              blur: 46,
              x: 0,
              y: 0
            }
          }
        },
        {
          n: 'Komiks',
          css: "font:400 24px 'Bangers';color:#ffe600;-webkit-text-stroke:1px #000",
          o: {
            text: 'BUM!',
            font: 'Bangers',
            size: 170,
            color: '#ffe600',
            stroke: {
              w: 9,
              color: '#000000'
            },
            shadow: {
              on: true,
              color: '#000000',
              a: 1,
              blur: 0,
              x: 8,
              y: 8
            }
          }
        },
        {
          n: 'Elegantní',
          css: "font:italic 700 20px 'Playfair Display';color:#fff",
          o: {
            text: 'Elegantní titul',
            font: 'Playfair Display',
            weight: 700,
            italic: true,
            size: 96,
            color: '#ffffff',
            shadow: {
              on: true,
              color: '#000000',
              a: .5,
              blur: 20,
              x: 0,
              y: 6
            }
          }
        },
        {
          n: 'Žlutý titul',
          css: "font:400 26px 'Anton';color:#ffe600;-webkit-text-stroke:1px #000",
          o: {
            text: 'ŽLUTÝ TITUL',
            font: 'Anton',
            size: 150,
            color: '#ffe600',
            stroke: {
              w: 12,
              color: '#000000'
            },
            shadow: {
              on: true,
              color: '#000000',
              a: 1,
              blur: 0,
              x: 8,
              y: 8
            }
          }
        },
        {
          n: 'Retro',
          css: "font:400 24px 'Lobster';color:#ff5fa2;-webkit-text-stroke:1px #fff",
          o: {
            text: 'Retro styl',
            font: 'Lobster',
            size: 150,
            color: '#ff5fa2',
            stroke: {
              w: 8,
              color: '#ffffff'
            },
            shadow: {
              on: true,
              color: '#000000',
              a: .5,
              blur: 0,
              x: 7,
              y: 7
            }
          }
        },
        {
          n: 'Velké číslo',
          css: "font:400 30px 'Anton';color:#ffc800;-webkit-text-stroke:1px #000",
          o: {
            text: '#1',
            font: 'Anton',
            size: 360,
            color: '#ffc800',
            stroke: {
              w: 12,
              color: '#000000'
            },
            shadow: {
              on: true,
              color: '#000000',
              a: .6,
              blur: 24,
              x: 0,
              y: 10
            }
          }
        },
        {
          n: 'Citace',
          css: "font:italic 700 18px 'Playfair Display';color:#fff",
          o: {
            text: '„Tady je tvoje citace.“',
            font: 'Playfair Display',
            weight: 700,
            italic: true,
            size: 84,
            color: '#ffffff',
            lh: 1.15
          }
        },
        {
          n: 'Černá lišta',
          css: "font:700 17px 'Barlow Condensed';color:#fff;background:#000;padding:3px 9px;letter-spacing:.08em",
          o: {
            text: 'TEXT NA LIŠTĚ',
            font: 'Barlow Condensed',
            weight: 700,
            size: 64,
            color: '#ffffff',
            ls: 4,
            upper: true,
            w: 700,
            box: {
              on: true,
              color: '#000000',
              pad: 18,
              radius: 6
            }
          }
        },
        {
          n: 'Červený štítek',
          css: "font:400 16px 'Archivo Black';color:#fff;background:#e11d2e;padding:3px 9px;border-radius:5px",
          o: {
            text: 'POZOR',
            font: 'Archivo Black',
            size: 60,
            color: '#ffffff',
            upper: true,
            w: 420,
            box: {
              on: true,
              color: '#e11d2e',
              pad: 18,
              radius: 10
            }
          }
        },
        {
          n: 'Technický',
          css: "font:600 14px 'JetBrains Mono';color:#39ff14",
          o: {
            text: '> SPOUŠTÍM_',
            font: 'JetBrains Mono',
            weight: 600,
            size: 72,
            color: '#39ff14',
            align: 'left',
            shadow: {
              on: true,
              color: '#39ff14',
              a: .9,
              blur: 26,
              x: 0,
              y: 0
            }
          }
        }
      ];
      const SHAPE_SVG = {
        rect: '<rect x="4" y="7" width="24" height="18"/>',
        round: '<rect x="4" y="7" width="24" height="18" rx="6"/>',
        ellipse: '<ellipse cx="16" cy="16" rx="12" ry="9"/>',
        tri: '<polygon points="16,5 28,26 4,26"/>',
        star: '<polygon points="16,3 19.5,12 29,12.5 21.5,18.5 24,28 16,22.5 8,28 10.5,18.5 3,12.5 12.5,12"/>',
        arrow: '<polygon points="3,12 18,12 18,5 29,16 18,27 18,20 3,20"/>',
        line: '<rect x="3" y="14" width="26" height="4" rx="2"/>',
        diamond: '<polygon points="16,3 29,16 16,29 3,16"/>',
        hex: '<polygon points="8,5 24,5 30,16 24,27 8,27 2,16"/>',
        burst: '<polygon points="' + Array.from({
          length: 24
        }, (_, i) => {
          const a = -Math.PI / 2 + i * Math.PI / 12,
            r = i % 2 ? 12 : 15.5;
          return (16 + Math.cos(a) * r).toFixed(1) + ',' + (16 + Math.sin(a) * r).toFixed(1);
        }).join(' ') + '"/>',
        bubble: '<path d="M5 5h22a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H15l-6 6v-6H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
        heart: '<path d="M16 28S3 19 3 10.5A6.5 6.5 0 0 1 16 8a6.5 6.5 0 0 1 13 2.5C29 19 16 28 16 28z"/>',
        bolt: '<polygon points="18,2 6,18 14,18 12,30 26,12 17,12"/>',
        play: '<polygon points="8,4 28,16 8,28"/>',
        ring: '<path fill-rule="evenodd" d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26zm0 6a7 7 0 1 1 0 14 7 7 0 0 1 0-14z"/>',
        cross: '<polygon points="12,3 20,3 20,12 29,12 29,20 20,20 20,29 12,29 12,20 3,20 3,12 12,12"/>',
        check: '<polygon points="3,17 7,13 13,19 25,5 29,9 13,27"/>',
        chevron: '<polygon points="6,3 18,3 28,16 18,29 6,29 16,16"/>',
        ribbon: '<polygon points="2,7 30,7 24,16 30,25 2,25 8,16"/>',
        pill: '<rect x="2" y="9" width="28" height="14" rx="7"/>'
      };
      const STICKERS = ['🔥', '⚡', '🚀', '💥', '😱', '😂', '🤯', '❓', '❗', '✅', '❌', '⭐', '👀', '💯', '🎮', '🛠️', '🖖', '👇', '👉', '🏆', '💡', '🔒', '📈', '💰'];

      function paneAdd() {
        return sec('Obrázky', `<div class="drop" id="drop" tabindex="0" role="button"><b>Nahrát obrázek</b><span>klikni, přetáhni soubory nebo vlož <span class="kbd">Ctrl+V</span></span></div>`) +
          sec('Hotové prvky', `<p class="hint">Odznaky, tlačítka, bubliny a lišty. Po přidání je můžeš libovolně upravit.</p><div class="presets">${ELEMS.map((e,i)=>`<button type="button" class="preset" data-add="elem" data-i="${i}">${esc(e.n)}</button>`).join('')}</div>`) +
          sec('Text', `<div class="presets">${TEXT_PRESETS.map((p,i)=>`<button type="button" class="preset" data-add="text" data-i="${i}" title="${p.n}"><span style="${p.css}">${p.n}</span></button>`).join('')}</div>`) +
          sec('Tvary', `<div class="tiles">${SHAPES.map(s=>`<button type="button" class="tile" data-add="shape" data-v="${s[0]}" title="${s[1]}" aria-label="${s[1]}"><svg viewBox="0 0 32 32">${SHAPE_SVG[s[0]]}</svg></button>`).join('')}</div>`) +
          sec('Nálepky', `<div class="tiles">${STICKERS.map(s=>`<button type="button" class="tile" data-add="sticker" data-v="${s}">${s}</button>`).join('')}</div>`);
      }
      const TPL_CATS = ['Základ', 'Banner', 'Profilovka', 'Star Trek', 'YouTube', 'Zábava', 'Styl'];
      const tplVisible = t => t.any || ((t.only || 'video') === fmtCat());

      function paneTpl() {
        const th = Math.round(160 * S.H / S.W),
          rd = S.fmt === 'avatar' ? ' style="border-radius:50%"' : '';
        return `<p class="hint">${S.fmt==='banner'?'Šablony banneru drží název v bezpečné zóně 1546 × 423 px. Zapni si pod plátnem „Zóny banneru“.':S.fmt==='avatar'?'Profilovky mají motiv uprostřed, ať se vejde do kruhu. Náhledy jsou kulaté, jak je uvidíš na YouTube.':'Šablona vymění pozadí a všechny vrstvy.'} Nahrané obrázky zůstanou v projektu, vrátit to jde tlačítkem Zpět.</p>` +
          TPL_CATS.map(c => {
            const list = TEMPLATES.filter(t => t.cat === c && tplVisible(t));
            return list.length ? sec(c, `<div class="tpls">${list.map(t=>`<button type="button" class="tpl" data-tpl="${t.id}"><canvas width="160" height="${th}"${rd}></canvas><span>${esc(t.name)}</span></button>`).join('')}</div>`) : '';
          }).join('');
      }

      function centerObj(o) {
        o.x = Math.round((S.W - o.w) / 2);
        o.y = Math.round((S.H - o.h) / 2);
        return o;
      }

      function addText(preset) {
        const o = newText(JSON.parse(JSON.stringify(preset.o)));
        o.w = Math.round(Math.min(S.W * .9, o.w && o.w !== 800 ? o.w : S.W * .9));
        layoutText(mctx, o);
        ensureFont(o);
        addObj(centerObj(o));
      }

      function addShape(shape) {
        const m = Math.min(S.W, S.H),
          o = newShape(shape);
        if (shape === 'line') {
          o.w = Math.round(S.W * .5);
          o.h = 14;
        } else if (shape === 'pill') {
          o.w = Math.round(m * .5);
          o.h = Math.round(m * .14);
        } else if (shape === 'ribbon' || shape === 'chevron') {
          o.w = Math.round(m * .5);
          o.h = Math.round(m * .15);
          if (shape === 'chevron') o.w = o.h = Math.round(m * .25);
        } else if (shape === 'bubble') {
          o.w = Math.round(m * .5);
          o.h = Math.round(m * .38);
          o.fill = '#ffffff';
          o.stroke = {
            w: 6,
            color: '#111111'
          };
        } else if (shape === 'bolt') {
          o.w = Math.round(m * .26);
          o.h = Math.round(m * .42);
          o.fill = '#ffd23f';
        } else if (shape === 'heart') {
          o.fill = '#ff3b6b';
        } else if (shape === 'check') {
          o.fill = '#22c55e';
        } else if (shape === 'cross') {
          o.fill = '#ef4444';
        } else if (shape === 'arrow') {
          o.w = Math.round(m * .55);
          o.h = Math.round(m * .28);
          o.fill = '#ff2d2d';
          o.stroke = {
            w: 6,
            color: '#ffffff'
          };
        } else {
          o.w = o.h = Math.round(m * .35);
          if (shape === 'rect' || shape === 'round') o.h = Math.round(m * .25);
        }
        addObj(centerObj(o));
      }

      function addSticker(ch) {
        const o = newText({
          text: ch,
          font: 'Montserrat',
          weight: 400,
          size: 220,
          w: 320,
          shadow: {
            on: true,
            color: '#000000',
            a: .5,
            blur: 18,
            x: 0,
            y: 8
          }
        });
        layoutText(mctx, o);
        addObj(centerObj(o));
      }

      function addImageObj(id) {
        const a = assets[id],
          s = Math.min(S.W * .8 / a.w, S.H * .8 / a.h),
          w = Math.round(a.w * s),
          h = Math.round(a.h * s);
        addObj(centerObj(newImage(id, w, h)));
      }
      async function addFiles(files) {
        let n = 0;
        for (const f of files) {
          if (!f.type.startsWith('image/')) continue;
          try {
            addImageObj(await importImage(f));
            n++;
          } catch (err) {
            toast('Obrázek ' + f.name + ' se nepodařilo načíst');
          }
        }
        if (n) toast(n === 1 ? 'Obrázek přidán' : n + ' obrázky přidány');
      }
      $('#fileImg').onchange = async e => {
        await addFiles([...e.target.files]);
        e.target.value = '';
      };
      $('#fileBg').onchange = async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
          const id = await importImage(f);
          S.bg.type = 'image';
          S.bg.asset = id;
          commit();
          renderPane();
          req();
          toast('Pozadí nastaveno');
        } catch (err) {
          toast('Obrázek se nepodařilo načíst');
        }
      };

      /* ---------- tab: layers ---------- */
      function paneLayers() {
        const rows = [...S.objs].reverse().map(o => `<div class="layer" data-layer="${o.id}"${o.id===selId?' aria-current="true"':''}>
  <button type="button" class="btn${o.visible?'':' off'}" data-act="vis" data-id="${o.id}" title="Zobrazit / skrýt" aria-label="Zobrazit nebo skrýt">${o.visible?ic.eye:ic.eyeoff}</button>
  <button type="button" class="btn${o.locked?'':' off'}" data-act="lock" data-id="${o.id}" title="Zamknout" aria-label="Zamknout">${o.locked?ic.lock:ic.unlock}</button>
  <div class="nm">${esc(objLabel(o))}<small>${typeLabel(o)} · ${Math.round(o.w)}×${Math.round(o.h)}</small></div>
  <div class="row" style="flex-wrap:nowrap;gap:0">
    <button type="button" class="btn" data-act="fwd" data-id="${o.id}" title="Výš" aria-label="Posunout výš">${ic.up}</button>
    <button type="button" class="btn" data-act="back" data-id="${o.id}" title="Níž" aria-label="Posunout níž">${ic.down}</button>
    <button type="button" class="btn" data-act="rm" data-id="${o.id}" title="Smazat" aria-label="Smazat vrstvu">${ic.trash}</button>
  </div></div>`).join('');
        return `<p class="hint">Nahoře je vrstva, která je vidět navrchu. Zamčené vrstvy nejdou chytit na plátně.</p>${rows||'<div class="note">Zatím tu nic není. Přidej text, tvar nebo obrázek.</div>'}
<div class="layer" data-layer="bg" style="grid-template-columns:minmax(0,1fr)"><div class="nm" style="padding:6px">Pozadí<small>${{solid:'Plná barva',gradient:'Přechod',image:'Obrázek'}[S.bg.type]}</small></div></div>`;
      }

      /* ---------- tab: props ---------- */
      function paneProps() {
        const o = getSel();
        if (!o) return paneBg();
        TG = '';
        const flip = o.type !== 'text' ? `<button type="button" class="btn sm" data-act="flipH">Zrcadlit ↔</button><button type="button" class="btn sm" data-act="flipV">Zrcadlit ↕</button>` : '';
        let h = `<div class="note ok"><b>${typeLabel(o)}</b> · ${esc(objLabel(o))}${o.locked?' · zamčeno':''}</div>
<div class="row" style="margin-bottom:14px"><button type="button" class="btn sm" data-act="dup">Duplikovat</button>
<button type="button" class="btn sm" data-act="fwd" data-id="${o.id}">Výš</button><button type="button" class="btn sm" data-act="back" data-id="${o.id}">Níž</button>${flip}
<button type="button" class="btn sm danger" data-act="rm" data-id="${o.id}">Smazat</button></div>`;
        if (o.type === 'text') h += secText(o);
        else if (o.type === 'shape') h += secShape(o);
        else h += secImage(o);
        h += sec('Poloha a velikost', `<div class="g2">${fNum('X','x',1)}${fNum('Y','y',1)}${fNum('Šířka','w',1)}${fNum('Výška','h',1,{ro:o.type==='text'})}</div>
  ${fRange('Rotace','rot',-180,180,.5,{u:'°'})}
  <div class="row">${[['l','Vlevo'],['c','Střed'],['r','Vpravo'],['t','Nahoře'],['m','Uprostřed'],['b','Dole']].map(a=>`<button type="button" class="chip" data-act="al" data-v="${a[0]}">${a[1]}</button>`).join('')}</div>`);
        h += sec('Průhlednost a prolnutí', `${fRange('Průhlednost','opacity',0,100,1,{k:.01,u:' %'})}${fSel('Režim prolnutí','blend',BLENDS)}`);
        h += sec('Stín a záře', `${fChk('Zapnout stín nebo záři','shadow.on',true)}${o.shadow.on?`${fCol('Barva','shadow.color')}${fRange('Síla','shadow.a',0,100,1,{k:.01,u:' %'})}${fRange('Rozostření','shadow.blur',0,150,1,{u:' px'})}
  <div class="g2">${fRange('Posun X','shadow.x',-80,80,1)}${fRange('Posun Y','shadow.y',-80,80,1)}</div>
  <div class="row"><button type="button" class="btn sm" data-act="glow">Záře</button><button type="button" class="btn sm" data-act="soft">Měkký stín</button><button type="button" class="btn sm" data-act="hard">Tvrdý stín</button></div>`:''}`);
        return h;
      }

      function secText(o) {
        let h = sec('Text', `<label class="f"><textarea data-p="text" rows="3" spellcheck="false"></textarea></label>
  ${fSel('Písmo','font',FONTS.map(f=>[f,f]))}
  <div class="g2">${fSel('Tloušťka','weight',[[400,'Normální'],[700,'Tučné'],[800,'Extra tučné'],[900,'Černé']],{num:true})}
  <div class="f"><span class="lab"><span>Zarovnání</span></span>${fOpt('align',[['left','Vlevo'],['center','Střed'],['right','Vpravo']])}</div></div>
  ${fRange('Velikost','size',10,500,1,{u:' px'})}
  <div class="g2">${fCol('Barva textu','color')}<div class="f"><span class="lab"><span>Styl</span></span><div style="display:grid;gap:6px;padding-top:4px">${fChk('Velká písmena','upper')}${fChk('Kurzíva','italic')}</div></div></div>
  ${fRange('Řádkování','lh',.7,2,.01)}${fRange('Mezery mezi písmeny','ls',-10,40,.5,{u:' px'})}`);
        h += sec('Obrys textu', `${fRange('Tloušťka obrysu','stroke.w',0,40,1,{u:' px'})}${o.stroke.w>0?fCol('Barva obrysu','stroke.color'):''}`);
        h += sec('Podklad za textem', `${fChk('Barevný štítek','box.on',true)}${o.box.on?`${fCol('Barva podkladu','box.color')}${fRange('Odsazení','box.pad',0,120,1,{u:' px'})}${fRange('Zaoblení','box.radius',0,80,1,{u:' px'})}`:''}`);
        return h;
      }

      function secShape(o) {
        let h = sec('Tvar', `${fSel('Typ','shape',SHAPES,{r:true})}${fChk('Výplň','fillOn',true)}${o.fillOn?`${fCol('Barva','fill')}${fChk('Přechod','grad',true)}${o.grad?`${fCol('Druhá barva','fill2')}${fRange('Úhel přechodu','angle',0,360,1,{u:'°'})}`:''}`:''}
  ${(o.shape==='rect'||o.shape==='round')?fRange('Zaoblení rohů','radius',0,300,1,{u:' px'}):''}`);
        h += sec('Obrys', `${fRange('Tloušťka','stroke.w',0,60,1,{u:' px'})}${o.stroke.w>0?fCol('Barva obrysu','stroke.color'):''}`);
        return h;
      }

      function secImage(o) {
        let h = sec('Obrázek', `<div class="f"><span class="lab"><span>Přizpůsobení rámu</span></span>${fOpt('fit',[['cover','Vyplnit'],['contain','Vložit'],['stretch','Roztáhnout']])}</div>
  ${fRange('Výřez vodorovně','px',0,100,1,{u:' %'})}${fRange('Výřez svisle','py',0,100,1,{u:' %'})}${fRange('Zaoblení rohů','radius',0,500,1,{u:' px'})}
  <div class="row"><button type="button" class="btn sm" data-act="asbg">Použít jako pozadí</button></div>`);
        h += sec('Rámeček', `${fRange('Tloušťka','border.w',0,40,1,{u:' px'})}${o.border.w>0?fCol('Barva rámečku','border.color'):''}`);
        h += sec('Filtry', `${fRange('Jas','f.brightness',0,200,1,{u:' %'})}${fRange('Kontrast','f.contrast',0,200,1,{u:' %'})}${fRange('Sytost','f.saturate',0,300,1,{u:' %'})}
  ${fRange('Odstín','f.hue',-180,180,1,{u:'°'})}${fRange('Rozostření','f.blur',0,40,.5,{u:' px'})}${fRange('Šedotón','f.gray',0,100,1,{u:' %'})}${fRange('Sépie','f.sepia',0,100,1,{u:' %'})}
  <div class="row"><button type="button" class="btn sm" data-act="resetf">Vynulovat filtry</button></div>`);
        return h;
      }
      const GRADS = [
        ['#10163a', '#6a2bd9', 135],
        ['#ff512f', '#f09819', 160],
        ['#00c6ff', '#0072ff', 120],
        ['#f857a6', '#ff5858', 135],
        ['#11998e', '#38ef7d', 140],
        ['#0f0c29', '#302b63', 160],
        ['#fceabb', '#f8b500', 160],
        ['#232526', '#414345', 150]
      ];

      function paneBg() {
        TG = 'bg';
        const b = S.bg;
        let h = `<div class="note ok"><b>Pozadí</b> · klikni na vrstvu na plátně, nebo tu nastav pozadí.</div>`;
        h += sec('Typ pozadí', fOpt('type', [
          ['solid', 'Plná barva'],
          ['gradient', 'Přechod'],
          ['image', 'Obrázek']
        ], true));
        h += sec('Barvy', `${fCol(b.type==='gradient'?'První barva':'Barva','c1')}${b.type==='gradient'?`${fCol('Druhá barva','c2')}${fRange('Úhel přechodu','angle',0,360,1,{u:'°'})}`:''}
  <div class="gradrow">${GRADS.map((g,i)=>`<button type="button" class="gsw" data-act="gp" data-i="${i}" aria-label="Přechod ${i+1}" style="background:linear-gradient(${g[2]}deg,${g[0]},${g[1]})"></button>`).join('')}</div>`);
        if (b.type === 'image') {
          h += sec('Obrázek na pozadí', `<div class="row" style="margin-bottom:8px"><button type="button" class="btn sm" data-act="bgfile">${b.asset?'Vyměnit obrázek':'Nahrát obrázek'}</button></div>
  ${b.asset?`<div class="f"><span class="lab"><span>Přizpůsobení</span></span>${fOpt('fit',[['cover','Vyplnit'],['contain','Vložit'],['stretch','Roztáhnout']])}</div>
  ${fRange('Výřez vodorovně','px',0,100,1,{u:' %'})}${fRange('Výřez svisle','py',0,100,1,{u:' %'})}
  ${fRange('Jas','f.brightness',0,200,1,{u:' %'})}${fRange('Kontrast','f.contrast',0,200,1,{u:' %'})}${fRange('Sytost','f.saturate',0,300,1,{u:' %'})}${fRange('Rozostření','f.blur',0,40,.5,{u:' px'})}`:'<p class="hint">Zatím tu není žádný obrázek.</p>'}`);
        }
        h += sec('Efekty', fRange('Ztmavení okrajů', 'vig', 0, 100, 1, {
          u: ' %'
        }));
        TG = '';
        return h;
      }

      /* ---------- panel: sync and events ---------- */
      function setOut(el) {
        const out = el.closest('label')?.querySelector('output');
        if (!out) return;
        const k = +(el.dataset.k || 1);
        out.textContent = (Math.round(el.value * 10) / 10) + (el.dataset.u || '');
      }

      function syncProps() {
        if (tab !== 'props') return;
        const o = getSel();
        $$('#pane [data-p]').forEach(el => {
          if (document.activeElement === el) return;
          const t = el.dataset.t === 'bg' ? S.bg : o;
          if (!t) return;
          const v = getP(t, el.dataset.p),
            k = +(el.dataset.k || 1);
          if (el.type === 'checkbox') el.checked = !!v;
          else if (el.type === 'range' || el.type === 'number') {
            el.value = Math.round(v / k * 10) / 10;
            setOut(el);
          } else el.value = v;
        });
        $$('#pane [data-set]').forEach(b => {
          const t = b.dataset.t === 'bg' ? S.bg : o;
          if (!t) return;
          b.setAttribute('aria-pressed', String(String(getP(t, b.dataset.set)) === b.dataset.v));
        });
      }
      const parseV = v => v === 'true' ? true : v === 'false' ? false : v;

      function ensureFont(o) {
        if (o.type !== 'text') return Promise.resolve();
        return document.fonts.load(fontStr(o), 'Aáčďéěíňóřšťúůýž').then(req, () => {});
      }
      const pane = $('#pane');
      pane.addEventListener('input', e => {
        const el = e.target;
        if (el.dataset.exp) return expInput(el);
        if (!el.dataset.p) return;
        const t = el.dataset.t === 'bg' ? S.bg : getSel();
        if (!t) return;
        let v;
        if (el.type === 'checkbox') v = el.checked;
        else if (el.type === 'range' || el.type === 'number') {
          if (el.value === '') return;
          v = parseFloat(el.value) * (+(el.dataset.k || 1));
        } else if (el.dataset.num) v = Number(el.value);
        else v = el.value;
        setP(t, el.dataset.p, v);
        if (el.type === 'range') setOut(el);
        if (el.dataset.p === 'font' || el.dataset.p === 'weight') ensureFont(t);
        req();
      });
      pane.addEventListener('change', e => {
        const el = e.target;
        if (!el.dataset.p) return;
        commit();
        if (el.dataset.r !== undefined) renderPane();
        else if (el.dataset.p === 'text' || el.dataset.p === 'name') updateLayersMaybe();
      });

      function updateLayersMaybe() {}
      pane.addEventListener('click', async e => {
        const b = e.target.closest('button,[data-layer],#drop');
        if (!b) return;
        if (b.id === 'drop') {
          $('#fileImg').click();
          return;
        }
        if (b.dataset.add) {
          if (b.dataset.add === 'elem') addElem(+b.dataset.i);
          else if (b.dataset.add === 'text') addText(TEXT_PRESETS[+b.dataset.i]);
          else if (b.dataset.add === 'shape') addShape(b.dataset.v);
          else addSticker(b.dataset.v);
          return;
        }
        if (b.dataset.tpl) {
          applyTemplate(b.dataset.tpl);
          return;
        }
        if (b.dataset.set) {
          const t = b.dataset.t === 'bg' ? S.bg : getSel();
          if (!t) return;
          setP(t, b.dataset.set, parseV(b.dataset.v));
          commit();
          if (b.dataset.r !== undefined) renderPane();
          else syncProps();
          if (b.dataset.set === 'italic') ensureFont(t);
          req();
          return;
        }
        if (b.dataset.exp) {
          expClick(b);
          return;
        }
        if (b.dataset.act) {
          await action(b);
          return;
        }
        if (b.dataset.layer !== undefined) {
          if (b.dataset.layer === 'bg') {
            selId = null;
            tab = 'props';
            renderPane();
            req();
          } else select(b.dataset.layer);
        }
      });
      pane.addEventListener('dblclick', e => {
        const r = e.target.closest('[data-layer]');
        if (r && r.dataset.layer !== 'bg' && !e.target.closest('button')) {
          selId = r.dataset.layer;
          tab = 'props';
          renderPane();
          req();
        }
      });
      pane.addEventListener('keydown', e => {
        if (e.target.id === 'drop' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          $('#fileImg').click();
        }
      });
      ['dragenter', 'dragover'].forEach(ev => pane.addEventListener(ev, e => {
        if (e.target.closest('#drop')) $('#drop').classList.add('over');
      }));
      ['dragleave', 'drop'].forEach(ev => pane.addEventListener(ev, () => {
        $('#drop')?.classList.remove('over');
      }));

      async function action(b) {
        const a = b.dataset.act,
          id = b.dataset.id,
          o = id ? S.objs.find(x => x.id === id) : getSel();
        switch (a) {
          case 'vis':
            if (o) {
              o.visible = !o.visible;
              commit();
              renderPane();
              req();
            }
            break;
          case 'lock':
            if (o) {
              o.locked = !o.locked;
              commit();
              renderPane();
              req();
            }
            break;
          case 'fwd':
            reorder(id || selId, 1);
            break;
          case 'back':
            reorder(id || selId, -1);
            break;
          case 'rm':
            if (id && id !== selId) selId = id;
            delSel();
            break;
          case 'dup':
            dupSel();
            break;
          case 'flipH':
            if (o) {
              o.flipH = !o.flipH;
              commit();
              req();
            }
            break;
          case 'flipV':
            if (o) {
              o.flipV = !o.flipV;
              commit();
              req();
            }
            break;
          case 'al':
            alignSel(b.dataset.v);
            break;
          case 'glow':
            if (o) {
              o.shadow = {
                on: true,
                color: o.type === 'text' ? o.color : o.type === 'shape' ? o.fill : '#ffffff',
                a: 1,
                blur: 60,
                x: 0,
                y: 0
              };
              commit();
              renderPane();
              req();
            }
            break;
          case 'soft':
            if (o) {
              o.shadow = {
                on: true,
                color: '#000000',
                a: .55,
                blur: 28,
                x: 0,
                y: 10
              };
              commit();
              renderPane();
              req();
            }
            break;
          case 'hard':
            if (o) {
              o.shadow = {
                on: true,
                color: '#000000',
                a: 1,
                blur: 0,
                x: 10,
                y: 10
              };
              commit();
              renderPane();
              req();
            }
            break;
          case 'resetf':
            if (o) {
              o.f = defFilters();
              commit();
              syncProps();
              req();
            }
            break;
          case 'asbg':
            if (o && o.type === 'image') {
              S.bg.type = 'image';
              S.bg.asset = o.asset;
              S.objs = S.objs.filter(x => x !== o);
              selId = null;
              commit();
              renderPane();
              req();
              toast('Obrázek je teď pozadí');
            }
            break;
          case 'bgfile':
            $('#fileBg').click();
            break;
          case 'gp': {
            const g = GRADS[+b.dataset.i];
            S.bg.type = 'gradient';
            S.bg.c1 = g[0];
            S.bg.c2 = g[1];
            S.bg.angle = g[2];
            commit();
            renderPane();
            req();
            break;
          }
        }
      }

      /* ---------- template helpers ---------- */
      const P = (W, H) => ({
        wide: W > H,
        m: Math.min(W, H),
        X: f => Math.round(W * f),
        Y: f => Math.round(H * f)
      });
      const ctr = (o, cx, cy) => {
        o.x = Math.round(cx - o.w / 2);
        o.y = Math.round(cy - o.h / 2);
        return o;
      };
      const ctxt = (props, cx, cy) => {
        const t = newText(props);
        layoutText(mctx, t);
        return ctr(t, cx, cy);
      };
      const shp = (s, o) => newShape(s, o);
      const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const SOFT = {
        on: true,
        color: '#000000',
        a: .55,
        blur: 24,
        x: 0,
        y: 10
      };
      const HARD = {
        on: true,
        color: '#000000',
        a: 1,
        blur: 0,
        x: 9,
        y: 9
      };
      const glowOf = (c, b = 44) => ({
        on: true,
        color: c,
        a: 1,
        blur: b,
        x: 0,
        y: 0
      });
      const bgSolid = c => mkBg({
        type: 'solid',
        c1: c
      });

      const NEW_TEMPLATES = [{
          id: 'blank-dark',
          any: true,
          cat: 'Základ',
          name: 'Prázdná tmavá',
          build() {
            return {
              bg: bgSolid('#12131c'),
              objs: []
            };
          }
        },
        {
          id: 'blank-light',
          any: true,
          cat: 'Základ',
          name: 'Prázdná světlá',
          build() {
            return {
              bg: bgSolid('#f4f3f8'),
              objs: []
            };
          }
        },
        {
          id: 'blank-grad',
          any: true,
          cat: 'Základ',
          name: 'Prázdný přechod',
          build() {
            return {
              bg: mkBg({}),
              objs: []
            };
          }
        },
        {
          id: 'minimal',
          cat: 'Základ',
          name: 'Minimal tmavá',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const dot = shp('ellipse', {
              w: Math.round(m * .07),
              h: Math.round(m * .07),
              fill: '#ffa24a',
              x: X(.07),
              y: Y(wide ? .28 : .2),
              name: 'Tečka'
            });
            const t = newText({
              text: 'Méně je\nvíce',
              font: 'Montserrat',
              weight: 800,
              size: wide ? 150 : 132,
              color: '#ffffff',
              align: 'left',
              w: X(.86),
              x: X(.07),
              y: Y(wide ? .34 : .26),
              lh: 1.02,
              name: 'Nadpis'
            });
            const s = newText({
              text: 'Krátký popisek videa',
              font: 'Barlow',
              weight: 600,
              size: wide ? 46 : 44,
              color: '#9a9bb8',
              align: 'left',
              w: X(.86),
              x: X(.07),
              y: Y(wide ? .78 : .62),
              name: 'Podnadpis'
            });
            return {
              bg: bgSolid('#0e0e12'),
              objs: [dot, t, s]
            };
          }
        },
        {
          id: 'gaming',
          cat: 'Zábava',
          name: 'Gaming',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const burst = ctr(shp('burst', {
              w: Math.round(m * 1.05),
              h: Math.round(m * 1.05),
              grad: true,
              fill: '#39ff14',
              fill2: '#00c2ff',
              opacity: .35,
              blend: 'screen',
              rot: 8,
              name: 'Záře'
            }), W * (wide ? .74 : .5), H * (wide ? .5 : .68));
            const pad = ctxt({
              text: '🎮',
              font: 'Montserrat',
              size: Math.round(m * .55),
              w: Math.round(m * .7),
              shadow: SOFT,
              name: 'Ovladač'
            }, W * (wide ? .76 : .5), H * (wide ? .52 : .7));
            const title = newText({
              text: "LET'S\nPLAY",
              font: 'Anton',
              size: wide ? 230 : 190,
              color: '#39ff14',
              align: wide ? 'left' : 'center',
              w: X(wide ? .6 : .9),
              x: X(wide ? .05 : .05),
              y: Y(wide ? .08 : .07),
              lh: .95,
              stroke: {
                w: 12,
                color: '#000000'
              },
              shadow: HARD,
              name: 'Nadpis'
            });
            const tag = newText({
              text: 'DÍL 7 · NEJTĚŽŠÍ BOSS',
              font: 'Barlow Condensed',
              weight: 700,
              size: wide ? 54 : 50,
              color: '#ffffff',
              ls: 3,
              upper: true,
              w: X(wide ? .5 : .84),
              x: X(wide ? .05 : .08),
              y: Y(wide ? .78 : .86),
              box: {
                on: true,
                color: '#000000',
                pad: 16,
                radius: 10
              },
              name: 'Štítek'
            });
            return {
              bg: mkBg({
                c1: '#070a14',
                c2: '#2a0b4d',
                angle: 150,
                vig: 50
              }),
              objs: [burst, pad, title, tag]
            };
          }
        },
        {
          id: 'versus',
          cat: 'YouTube',
          name: 'Versus',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const a = shp('rect', wide ? {
              x: 0,
              y: 0,
              w: Math.round(W / 2),
              h: H
            } : {
              x: 0,
              y: 0,
              w: W,
              h: Math.round(H / 2)
            }, {});
            Object.assign(a, {
              grad: true,
              fill: '#ff3b4a',
              fill2: '#7a0010',
              angle: wide ? 90 : 180,
              name: 'Strana A'
            });
            const b = shp('rect', wide ? {
              x: Math.round(W / 2),
              y: 0,
              w: Math.round(W / 2),
              h: H
            } : {
              x: 0,
              y: Math.round(H / 2),
              w: W,
              h: Math.round(H / 2)
            });
            Object.assign(b, {
              grad: true,
              fill: '#1d9bff',
              fill2: '#06307a',
              angle: wide ? 270 : 0,
              name: 'Strana B'
            });
            const r = Math.round(m * .36),
              vs = ctr(shp('ellipse', {
                w: r,
                h: r,
                fill: '#111111',
                stroke: {
                  w: 10,
                  color: '#ffffff'
                },
                shadow: SOFT,
                name: 'Kruh VS'
              }), W / 2, H / 2);
            const vt = ctxt({
              text: 'VS',
              font: 'Anton',
              size: Math.round(r * .62),
              color: '#ffffff',
              w: r,
              name: 'VS'
            }, W / 2, H / 2);
            const ta = ctxt({
              text: 'TÝM A',
              font: 'Anton',
              size: wide ? 120 : 104,
              color: '#ffffff',
              w: wide ? X(.42) : X(.9),
              stroke: {
                w: 8,
                color: '#000000'
              },
              shadow: HARD,
              name: 'Jméno A'
            }, wide ? W * .25 : W / 2, wide ? H * .2 : H * .17);
            const tb = ctxt({
              text: 'TÝM B',
              font: 'Anton',
              size: wide ? 120 : 104,
              color: '#ffffff',
              w: wide ? X(.42) : X(.9),
              stroke: {
                w: 8,
                color: '#000000'
              },
              shadow: HARD,
              name: 'Jméno B'
            }, wide ? W * .75 : W / 2, wide ? H * .8 : H * .83);
            return {
              bg: bgSolid('#000000'),
              objs: [a, b, vs, vt, ta, tb]
            };
          }
        },
        {
          id: 'top10',
          cat: 'YouTube',
          name: 'Žebříček TOP',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const num = ctxt({
              text: '10',
              font: 'Anton',
              size: wide ? 560 : 430,
              color: '#ffc800',
              w: wide ? X(.5) : X(.9),
              stroke: {
                w: 10,
                color: '#000000'
              },
              shadow: {
                on: true,
                color: '#ff7a00',
                a: .9,
                blur: 60,
                x: 0,
                y: 0
              },
              name: 'Číslo'
            }, W * (wide ? .74 : .5), H * (wide ? .5 : .64));
            const top = newText({
              text: 'TOP',
              font: 'Anton',
              size: wide ? 280 : 230,
              color: '#ffffff',
              align: wide ? 'left' : 'center',
              w: X(wide ? .46 : .9),
              x: X(wide ? .05 : .05),
              y: Y(wide ? .1 : .05),
              stroke: {
                w: 10,
                color: '#000000'
              },
              shadow: HARD,
              name: 'TOP'
            });
            const rb = ctxt({
              text: 'NEJLEPŠÍCH TIPŮ',
              font: 'Archivo Black',
              size: wide ? 44 : 46,
              color: '#ffffff',
              ls: 2,
              w: wide ? X(.4) : X(.74),
              name: 'Text stuhy'
            }, W * (wide ? .27 : .5), H * (wide ? .74 : .3));
            const rib = shp('ribbon', {
              w: wide ? X(.44) : X(.84),
              h: Math.round(m * .14),
              fill: '#e11d2e',
              stroke: {
                w: 0,
                color: '#ffffff'
              },
              shadow: SOFT,
              name: 'Stuha'
            });
            ctr(rib, W * (wide ? .27 : .5), H * (wide ? .74 : .3));
            return {
              bg: mkBg({
                c1: '#0b0b0f',
                c2: '#3a2a00',
                angle: 140,
                vig: 45
              }),
              objs: [num, top, rib, rb]
            };
          }
        },
        {
          id: 'news',
          cat: 'YouTube',
          name: 'Zprávy',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const head = newText({
              text: 'OBROVSKÁ\nZMĚNA',
              font: 'Anton',
              size: wide ? 180 : 150,
              color: '#ffffff',
              align: 'left',
              w: X(.9),
              x: X(.05),
              y: Y(wide ? .08 : .1),
              lh: 1,
              shadow: SOFT,
              name: 'Titulek'
            });
            const bar = shp('rect', {
              x: 0,
              y: Y(wide ? .6 : .56),
              w: W,
              h: Y(wide ? .13 : .08),
              fill: '#d90429',
              name: 'Červený pruh'
            });
            const bt = ctxt({
              text: 'ZPRÁVA DNE',
              font: 'Archivo Black',
              size: wide ? 64 : 56,
              color: '#ffffff',
              ls: 6,
              w: X(.9),
              name: 'Text pruhu'
            }, W / 2, bar.y + bar.h / 2);
            const low = shp('rect', {
              x: 0,
              y: Y(wide ? .8 : .86),
              w: W,
              h: Y(wide ? .14 : .1),
              fill: '#000000',
              opacity: .82,
              name: 'Spodní lišta'
            });
            const lt = ctxt({
              text: 'Doplňující text a jméno kanálu',
              font: 'Barlow',
              weight: 600,
              size: wide ? 46 : 40,
              color: '#ffffff',
              align: 'left',
              w: X(.88),
              name: 'Spodní text'
            }, W / 2, low.y + low.h / 2);
            const live = shp('round', {
              w: Math.round(m * .3),
              h: Math.round(m * .1),
              radius: Math.round(m * .02),
              fill: '#d90429',
              stroke: {
                w: 4,
                color: '#ffffff'
              },
              name: 'Odznak ŽIVĚ'
            });
            ctr(live, W - live.w / 2 - X(.04), Y(wide ? .06 : .04) + live.h / 2 + Y(wide ? .0 : .0));
            const lv = ctxt({
              text: '● ŽIVĚ',
              font: 'Roboto Condensed',
              weight: 700,
              size: Math.round(m * .055),
              color: '#ffffff',
              w: live.w,
              name: 'Text ŽIVĚ'
            }, live.x + live.w / 2, live.y + live.h / 2);
            return {
              bg: mkBg({
                c1: '#0a0f1a',
                c2: '#1b2a49',
                angle: 160,
                vig: 35
              }),
              objs: [head, bar, bt, low, lt, live, lv]
            };
          }
        },
        {
          id: 'review',
          cat: 'YouTube',
          name: 'Recenze',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const t = newText({
              text: 'RECENZE',
              font: 'Archivo Black',
              size: wide ? 150 : 130,
              color: '#ffffff',
              align: wide ? 'left' : 'center',
              w: X(wide ? .58 : .9),
              x: X(.05),
              y: Y(wide ? .1 : .07),
              shadow: SOFT,
              name: 'Nadpis'
            });
            const st = ctxt({
              text: '★★★★★',
              font: 'Montserrat',
              size: wide ? 110 : 96,
              color: '#ffc800',
              w: X(wide ? .58 : .9),
              shadow: SOFT,
              name: 'Hvězdičky'
            }, W * (wide ? .34 : .5), H * (wide ? .5 : .34));
            const rr = Math.round(m * (wide ? .46 : .5)),
              c = ctr(shp('ellipse', {
                w: rr,
                h: rr,
                grad: true,
                fill: '#ffe066',
                fill2: '#ffa000',
                stroke: {
                  w: 10,
                  color: '#111111'
                },
                shadow: SOFT,
                name: 'Kruh skóre'
              }), W * (wide ? .76 : .5), H * (wide ? .52 : .68));
            const sc = ctxt({
              text: '9/10',
              font: 'Anton',
              size: Math.round(rr * .42),
              color: '#111111',
              w: rr,
              name: 'Skóre'
            }, c.x + rr / 2, c.y + rr / 2);
            const rib = shp('ribbon', {
              w: wide ? X(.48) : X(.8),
              h: Math.round(m * .13),
              fill: '#16a34a',
              shadow: SOFT,
              name: 'Stuha'
            });
            ctr(rib, W * (wide ? .31 : .5), H * (wide ? .76 : .2 + .0));
            const rt = ctxt({
              text: 'DOPORUČUJI',
              font: 'Archivo Black',
              size: Math.round(m * .062),
              color: '#ffffff',
              ls: 3,
              w: rib.w * .8,
              name: 'Verdikt'
            }, rib.x + rib.w / 2, rib.y + rib.h / 2);
            if (!wide) {
              rib.y = Math.round(H * .88);
              rt.y = Math.round(rib.y + rib.h / 2 - rt.h / 2);
            }
            return {
              bg: mkBg({
                c1: '#101010',
                c2: '#2d2d3a',
                angle: 150,
                vig: 40
              }),
              objs: [t, st, c, sc, rib, rt]
            };
          }
        },
        {
          id: 'quote',
          cat: 'YouTube',
          name: 'Citát',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const q = newText({
              text: '“',
              font: 'Playfair Display',
              weight: 900,
              size: wide ? 520 : 480,
              color: '#ffa24a',
              align: 'left',
              w: X(.3),
              x: X(.05),
              y: Y(wide ? -.08 : .0),
              opacity: .9,
              name: 'Uvozovky'
            });
            const t = newText({
              text: 'Cokoli uděláš,\ndělej to pořádně.',
              font: 'Playfair Display',
              weight: 700,
              italic: true,
              size: wide ? 92 : 96,
              color: '#ffffff',
              align: 'left',
              w: X(.84),
              x: X(.08),
              y: Y(wide ? .36 : .34),
              lh: 1.12,
              name: 'Citát'
            });
            const a = newText({
              text: '— JMÉNO AUTORA',
              font: 'Barlow Condensed',
              weight: 700,
              size: wide ? 50 : 52,
              color: '#ffa24a',
              ls: 8,
              align: 'left',
              w: X(.8),
              x: X(.08),
              y: Y(wide ? .8 : .72),
              name: 'Autor'
            });
            return {
              bg: mkBg({
                c1: '#1b1530',
                c2: '#3b2a6b',
                angle: 150,
                vig: 35
              }),
              objs: [q, t, a]
            };
          }
        },
        {
          id: 'lcars',
          cat: 'Star Trek',
          name: 'LCARS panel',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H), h = Y(wide ? .07 : .04);
            const row = (y, defs) => defs.map(d => shp('round', {
              x: X(d[0]),
              y,
              w: X(d[1]),
              h,
              radius: Math.round(h / 2),
              fill: d[2],
              name: 'LCARS pruh'
            }));
            const defs = [
              [.04, .1, '#ff9c00'],
              [.15, .22, '#cc99ff'],
              [.38, .08, '#9999ff'],
              [.47, .3, '#ff9966'],
              [.78, .18, '#cc6666']
            ];
            const top = row(Y(wide ? .06 : .04), defs),
              bot = row(Y(wide ? .87 : .92), defs.slice().reverse());
            const t = newText({
              text: 'NÁZEV\nEPIZODY',
              font: 'Barlow Condensed',
              weight: 700,
              size: 170,
              color: '#ff9c00',
              ls: 6,
              align: 'left',
              w: X(.84),
              x: X(.08),
              y: Y(.2),
              lh: .95,
              name: 'Název'
            });
            const s = newText({
              text: 'HVĚZDNÉ DATUM 79412.3',
              font: 'JetBrains Mono',
              weight: 600,
              size: wide ? 40 : 38,
              color: '#cc99ff',
              ls: 4,
              align: 'left',
              w: X(.84),
              x: X(.08),
              y: Y(wide ? .7 : .6),
              name: 'Hvězdné datum'
            });
            const s2 = newText({
              text: 'ZÁZNAM KAPITÁNA',
              font: 'Barlow Condensed',
              weight: 600,
              size: wide ? 44 : 42,
              color: '#9999ff',
              ls: 8,
              align: 'left',
              w: X(.84),
              x: X(.08),
              y: Y(wide ? .77 : .67),
              name: 'Podnadpis'
            });
            return {
              bg: bgSolid('#000000'),
              objs: [...top, ...bot, t, s, s2]
            };
          }
        },
        {
          id: 'starfleet',
          cat: 'Star Trek',
          name: 'Hvězdná flotila',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H), r = rnd(42), stars = [];
            for (let i = 0; i < 70; i++) {
              const z = Math.max(2, Math.round((1.5 + r() * 4.5) * m / 720));
              stars.push(shp('ellipse', {
                w: z,
                h: z,
                x: Math.round(r() * W),
                y: Math.round(r() * H),
                fill: '#ffffff',
                opacity: Math.round((.35 + r() * .65) * 100) / 100,
                name: 'Hvězda'
              }));
            }
            const pl = Math.round(m * 1.0),
              planet = ctr(shp('ellipse', {
                w: pl,
                h: pl,
                grad: true,
                fill: '#5ab0ff',
                fill2: '#06123f',
                angle: 135,
                shadow: glowOf('#3a8dff', 60),
                name: 'Planeta'
              }), W * (wide ? .82 : .78), H * (wide ? .98 : .98));
            const orb = ctr(shp('ellipse', {
              w: Math.round(pl * 1.18),
              h: Math.round(pl * 1.18),
              fillOn: false,
              stroke: {
                w: 3,
                color: '#9bd0ff'
              },
              opacity: .5,
              name: 'Dráha'
            }), planet.x + pl / 2, planet.y + pl / 2);
            const t = newText({
              text: 'HVĚZDNÁ\nFLOTILA',
              font: 'Bebas Neue',
              size: wide ? 210 : 200,
              color: '#ffffff',
              ls: 8,
              align: wide ? 'left' : 'center',
              w: X(wide ? .62 : .9),
              x: X(.06),
              y: Y(wide ? .12 : .1),
              lh: .95,
              shadow: glowOf('#4aa3ff', 46),
              name: 'Nadpis'
            });
            const s = newText({
              text: 'KAPITÁNŮV DENÍK',
              font: 'Montserrat',
              weight: 700,
              size: wide ? 42 : 38,
              color: '#9bd0ff',
              ls: 14,
              align: wide ? 'left' : 'center',
              w: X(wide ? .62 : .9),
              x: X(.06),
              y: Y(wide ? .74 : .5),
              name: 'Podnadpis'
            });
            const hand = ctxt({
              text: '🖖',
              font: 'Montserrat',
              size: Math.round(m * .2),
              w: Math.round(m * .3),
              shadow: SOFT,
              name: 'Pozdrav'
            }, W * (wide ? .1 : .5), H * (wide ? .9 : .58));
            return {
              bg: mkBg({
                c1: '#02030a',
                c2: '#0b1d4a',
                angle: 200,
                vig: 30
              }),
              objs: [...stars, orb, planet, t, s, hand]
            };
          }
        },
        {
          id: 'comic',
          cat: 'Zábava',
          name: 'Komiks',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H);
            const b = ctr(shp('burst', {
              w: Math.round(m * 1.15),
              h: Math.round(m * 1.15),
              fill: '#e11d2e',
              stroke: {
                w: 12,
                color: '#111111'
              },
              rot: -6,
              name: 'Výbuch'
            }), W / 2, H * (wide ? .5 : .46));
            const t = ctxt({
              text: 'BUM!',
              font: 'Bangers',
              size: wide ? 330 : 300,
              color: '#ffffff',
              rot: -6,
              w: X(.9),
              stroke: {
                w: 16,
                color: '#111111'
              },
              shadow: HARD,
              name: 'Nadpis'
            }, W / 2, H * (wide ? .5 : .46));
            const s = ctxt({
              text: 'NEUVĚŘITELNÉ',
              font: 'Bangers',
              size: wide ? 84 : 78,
              color: '#ffd23f',
              ls: 3,
              w: X(wide ? .6 : .84),
              box: {
                on: true,
                color: '#111111',
                pad: 16,
                radius: 12
              },
              name: 'Štítek'
            }, W / 2, H * (wide ? .9 : .88));
            return {
              bg: bgSolid('#ffd23f'),
              objs: [b, t, s]
            };
          }
        },
        {
          id: 'fitness',
          cat: 'Zábava',
          name: 'Fitness',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H), sh = Y(wide ? .1 : .05), stripes = [];
            (wide ? [.76, .86, .96] : [.66, .77, .88]).forEach(f => stripes.push(shp('rect', {
              w: Math.round(W * 1.5),
              h: sh,
              x: Math.round(-W * .2),
              y: Y(f),
              rot: -18,
              fill: '#ffe600',
              name: 'Pruh'
            })));
            const t = newText({
              text: 'ŽÁDNÉ\nVÝMLUVY',
              font: 'Anton',
              italic: true,
              size: 190,
              color: '#ffffff',
              align: 'left',
              w: X(.9),
              x: X(.06),
              y: Y(wide ? .06 : .07),
              lh: .95,
              shadow: HARD,
              name: 'Nadpis'
            });
            const s = newText({
              text: 'TRÉNINK 30 MIN',
              font: 'Barlow Condensed',
              weight: 700,
              size: wide ? 60 : 56,
              color: '#111111',
              ls: 4,
              w: X(wide ? .42 : .7),
              x: X(.06),
              y: Y(wide ? .58 : .5),
              box: {
                on: true,
                color: '#ffe600',
                pad: 16,
                radius: 6
              },
              name: 'Štítek'
            });
            return {
              bg: bgSolid('#0b0b0b'),
              objs: [...stripes, t, s]
            };
          }
        },
        {
          id: 'recipe',
          cat: 'Zábava',
          name: 'Recept',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H), pr = Math.round(m * (wide ? .86 : .78));
            const plate = ctr(shp('ellipse', {
              w: pr,
              h: pr,
              fill: '#ffffff',
              stroke: {
                w: 14,
                color: '#fde7c6'
              },
              shadow: SOFT,
              name: 'Talíř'
            }), W * (wide ? .74 : .5), H * (wide ? .5 : .66));
            const food = ctxt({
              text: '🍕',
              font: 'Montserrat',
              size: Math.round(pr * .62),
              w: pr,
              name: 'Jídlo'
            }, plate.x + pr / 2, plate.y + pr / 2);
            const t = newText({
              text: 'Domácí\npizza',
              font: 'Lobster',
              size: wide ? 180 : 150,
              color: '#ffffff',
              align: wide ? 'left' : 'center',
              w: X(wide ? .5 : .9),
              x: X(wide ? .05 : .05),
              y: Y(wide ? .14 : .06),
              lh: 1,
              shadow: SOFT,
              name: 'Nadpis'
            });
            const rib = shp('ribbon', {
              w: wide ? X(.44) : X(.8),
              h: Math.round(m * .13),
              fill: '#1b1b2a',
              shadow: SOFT,
              name: 'Stuha'
            });
            ctr(rib, W * (wide ? .27 : .5), H * (wide ? .76 : .34));
            const rt = ctxt({
              text: 'RECEPT · 20 MIN',
              font: 'Barlow Condensed',
              weight: 700,
              size: Math.round(m * .07),
              color: '#ffffff',
              ls: 5,
              w: rib.w * .82,
              name: 'Text stuhy'
            }, rib.x + rib.w / 2, rib.y + rib.h / 2);
            return {
              bg: mkBg({
                c1: '#ff9a3c',
                c2: '#e63946',
                angle: 150,
                vig: 20
              }),
              objs: [plate, food, t, rib, rt]
            };
          }
        },
        {
          id: 'horror',
          cat: 'Zábava',
          name: 'Horor',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H), mr = Math.round(m * .5);
            const moon = ctr(shp('ellipse', {
              w: mr,
              h: mr,
              grad: true,
              fill: '#f4f1d8',
              fill2: '#a9a68a',
              opacity: .9,
              shadow: glowOf('#e8e4b0', 70),
              name: 'Měsíc'
            }), W * (wide ? .78 : .5), H * (wide ? .34 : .3));
            const t = newText({
              text: 'NOC\nHRŮZY',
              font: 'Playfair Display',
              weight: 900,
              size: wide ? 210 : 190,
              color: '#d00000',
              align: wide ? 'left' : 'center',
              upper: true,
              w: X(wide ? .6 : .9),
              x: X(.06),
              y: Y(wide ? .28 : .46),
              lh: .98,
              shadow: glowOf('#ff0000', 40),
              name: 'Nadpis'
            });
            const s = newText({
              text: 'NEDÍVEJ SE ZA SEBE',
              font: 'Barlow Condensed',
              weight: 600,
              size: wide ? 46 : 44,
              color: '#9a9a9a',
              ls: 14,
              align: wide ? 'left' : 'center',
              w: X(wide ? .7 : .9),
              x: X(.06),
              y: Y(wide ? .86 : .9),
              name: 'Podnadpis'
            });
            return {
              bg: mkBg({
                c1: '#000000',
                c2: '#3a0000',
                angle: 180,
                vig: 70
              }),
              objs: [moon, t, s]
            };
          }
        },
        {
          id: 'synth',
          cat: 'Styl',
          name: 'Synthwave',
          build(W, H) {
            const {
              wide,
              m,
              X,
              Y
            } = P(W, H), sr = Math.round(m * (wide ? .7 : .62));
            const sun = ctr(shp('ellipse', {
              w: sr,
              h: sr,
              grad: true,
              fill: '#ffe14a',
              fill2: '#ff2e97',
              angle: 180,
              shadow: glowOf('#ff2e97', 70),
              name: 'Slunce'
            }), W / 2, H * (wide ? .5 : .4));
            const floor = shp('rect', {
              x: 0,
              y: Y(.68),
              w: W,
              h: H - Y(.68),
              fill: '#12002b',
              name: 'Podlaha'
            });
            const lines = [0, 1, 2, 3, 4, 5].map(i => shp('rect', {
              x: 0,
              y: Math.round(H * .68 + Math.pow(i / 5, 1.7) * H * .32) + 4,
              w: W,
              h: 3 + i,
              fill: '#ff2e97',
              opacity: .85,
              name: 'Čára mřížky'
            }));
            const t = ctxt({
              text: 'SYNTHWAVE',
              font: 'Bebas Neue',
              size: wide ? 230 : 170,
              color: '#ffffff',
              ls: 12,
              w: X(.92),
              shadow: glowOf('#00e5ff', 46),
              name: 'Nadpis'
            }, W / 2, H * (wide ? .46 : .7));
            const s = ctxt({
              text: 'RETRO MIX',
              font: 'Montserrat',
              weight: 700,
              size: wide ? 44 : 40,
              color: '#ffe14a',
              ls: 16,
              w: X(.9),
              shadow: glowOf('#ff2e97', 24),
              name: 'Podnadpis'
            }, W / 2, H * (wide ? .67 : .78));
            return {
              bg: mkBg({
                c1: '#1a0033',
                c2: '#ff2e97',
                angle: 180,
                vig: 25
              }),
              objs: [sun, floor, ...lines, t, s]
            };
          }
        }
      ];

      /* ---------- ready-made elements ---------- */
      const mk = (shape, o) => newShape(shape, o);
      const ELEMS = [{
          n: 'Tlačítko přehrát',
          make(m, cx, cy) {
            const w = Math.round(m * .42),
              h = Math.round(m * .3);
            const b = ctr(mk('round', {
              w,
              h,
              radius: Math.round(h * .28),
              fill: '#ff0033',
              shadow: SOFT,
              name: 'Tlačítko'
            }), cx, cy);
            const p = ctr(mk('play', {
              w: Math.round(h * .34),
              h: Math.round(h * .4),
              fill: '#ffffff',
              stroke: {
                w: 0,
                color: '#ffffff'
              },
              name: 'Trojúhelník'
            }), cx + h * .03, cy);
            return [b, p];
          }
        },
        {
          n: 'Sleva -50 %',
          make(m, cx, cy) {
            const s = Math.round(m * .42);
            const b = ctr(mk('burst', {
              w: s,
              h: s,
              fill: '#ffd23f',
              stroke: {
                w: 6,
                color: '#111111'
              },
              shadow: SOFT,
              name: 'Odznak'
            }), cx, cy);
            const t = ctxt({
              text: '-50 %',
              font: 'Anton',
              size: Math.round(s * .3),
              color: '#111111',
              w: s,
              rot: -6,
              name: 'Sleva'
            }, cx, cy);
            return [b, t];
          }
        },
        {
          n: 'Stuha NOVÉ',
          make(m, cx, cy) {
            const w = Math.round(m * .5),
              h = Math.round(m * .14);
            const b = ctr(mk('ribbon', {
              w,
              h,
              fill: '#e11d2e',
              shadow: SOFT,
              name: 'Stuha'
            }), cx, cy);
            const t = ctxt({
              text: 'NOVÉ',
              font: 'Archivo Black',
              size: Math.round(h * .5),
              color: '#ffffff',
              ls: 4,
              w: w * .7,
              name: 'Text stuhy'
            }, cx, cy);
            return [b, t];
          }
        },
        {
          n: 'Bublina „Wow!“',
          make(m, cx, cy) {
            const w = Math.round(m * .5),
              h = Math.round(m * .36);
            const b = ctr(mk('bubble', {
              w,
              h,
              fill: '#ffffff',
              stroke: {
                w: 6,
                color: '#111111'
              },
              shadow: SOFT,
              name: 'Bublina'
            }), cx, cy);
            const t = ctxt({
              text: 'Wow!',
              font: 'Bangers',
              size: Math.round(h * .4),
              color: '#111111',
              w: w * .8,
              name: 'Text bubliny'
            }, cx, cy - h * .09);
            return [b, t];
          }
        },
        {
          n: 'Červené zvýraznění',
          make(m, cx, cy) {
            const s = Math.round(m * .4);
            return [ctr(mk('ellipse', {
              w: s,
              h: s,
              fillOn: false,
              stroke: {
                w: 14,
                color: '#ff2d2d'
              },
              shadow: SOFT,
              name: 'Zvýraznění'
            }), cx, cy)];
          }
        },
        {
          n: 'Rámeček přes plátno',
          make(m) {
            const g = Math.round(m * .04);
            return [mk('round', {
              x: g,
              y: g,
              w: S.W - 2 * g,
              h: S.H - 2 * g,
              radius: 28,
              fillOn: false,
              stroke: {
                w: 14,
                color: '#ffffff'
              },
              name: 'Rámeček'
            })];
          }
        },
        {
          n: 'Tlačítko odběru',
          make(m, cx, cy) {
            const w = Math.round(m * .5),
              h = Math.round(m * .12);
            const b = ctr(mk('pill', {
              w,
              h,
              fill: '#ff0033',
              shadow: SOFT,
              name: 'Tlačítko'
            }), cx, cy);
            const t = ctxt({
              text: 'ODEBÍRAT',
              font: 'Roboto Condensed',
              weight: 700,
              size: Math.round(h * .5),
              color: '#ffffff',
              ls: 3,
              w: w * .8,
              name: 'Text tlačítka'
            }, cx, cy);
            return [b, t];
          }
        },
        {
          n: 'Délka videa',
          make(m, cx, cy) {
            const w = Math.round(m * .22),
              h = Math.round(m * .085);
            const b = ctr(mk('round', {
              w,
              h,
              radius: 10,
              fill: '#000000',
              opacity: .85,
              name: 'Čas'
            }), cx, cy);
            const t = ctxt({
              text: '12:34',
              font: 'Roboto Condensed',
              weight: 700,
              size: Math.round(h * .6),
              color: '#ffffff',
              w: w,
              name: 'Čas text'
            }, cx, cy);
            return [b, t];
          }
        },
        {
          n: 'Odznak VS',
          make(m, cx, cy) {
            const s = Math.round(m * .3);
            const b = ctr(mk('ellipse', {
              w: s,
              h: s,
              fill: '#111111',
              stroke: {
                w: 8,
                color: '#ffffff'
              },
              shadow: SOFT,
              name: 'Kruh VS'
            }), cx, cy);
            const t = ctxt({
              text: 'VS',
              font: 'Anton',
              size: Math.round(s * .55),
              color: '#ffffff',
              w: s,
              name: 'VS'
            }, cx, cy);
            return [b, t];
          }
        },
        {
          n: 'Číslo dílu #1',
          make(m, cx, cy) {
            const s = Math.round(m * .26);
            const b = ctr(mk('ellipse', {
              w: s,
              h: s,
              fill: '#ffc800',
              stroke: {
                w: 8,
                color: '#111111'
              },
              shadow: SOFT,
              name: 'Kruh čísla'
            }), cx, cy);
            const t = ctxt({
              text: '#1',
              font: 'Anton',
              size: Math.round(s * .5),
              color: '#111111',
              w: s,
              name: 'Číslo'
            }, cx, cy);
            return [b, t];
          }
        },
        {
          n: 'Hvězdičky ★★★★★',
          make(m, cx, cy) {
            return [ctxt({
              text: '★★★★★',
              font: 'Montserrat',
              size: Math.round(m * .14),
              color: '#ffc800',
              w: Math.round(m * .9),
              shadow: SOFT,
              name: 'Hvězdičky'
            }, cx, cy)];
          }
        },
        {
          n: 'Spodní lišta s jménem',
          make(m) {
            const h = Math.round(m * .22);
            const b = mk('rect', {
              x: 0,
              y: S.H - h,
              w: S.W,
              h,
              fill: '#000000',
              opacity: .72,
              name: 'Spodní lišta'
            });
            const t = ctxt({
              text: 'Jméno kanálu · Díl 1',
              font: 'Barlow Condensed',
              weight: 700,
              size: Math.round(h * .46),
              color: '#ffffff',
              align: 'left',
              w: Math.round(S.W * .9),
              name: 'Text lišty'
            }, S.W / 2, S.H - h / 2);
            return [b, t];
          }
        },
        {
          n: 'Zelené zaškrtnutí',
          make(m, cx, cy) {
            const s = Math.round(m * .3);
            return [ctr(mk('check', {
              w: s,
              h: s,
              fill: '#22c55e',
              stroke: {
                w: 8,
                color: '#ffffff'
              },
              shadow: SOFT,
              name: 'Zaškrtnutí'
            }), cx, cy)];
          }
        },
        {
          n: 'Červený křížek',
          make(m, cx, cy) {
            const s = Math.round(m * .3);
            return [ctr(mk('cross', {
              w: s,
              h: s,
              rot: 45,
              fill: '#ef4444',
              stroke: {
                w: 8,
                color: '#ffffff'
              },
              shadow: SOFT,
              name: 'Křížek'
            }), cx, cy)];
          }
        },
        {
          n: 'Blesk',
          make(m, cx, cy) {
            return [ctr(mk('bolt', {
              w: Math.round(m * .26),
              h: Math.round(m * .42),
              fill: '#ffd23f',
              stroke: {
                w: 8,
                color: '#111111'
              },
              shadow: SOFT,
              name: 'Blesk'
            }), cx, cy)];
          }
        },
        {
          n: 'Srdce',
          make(m, cx, cy) {
            const s = Math.round(m * .3);
            return [ctr(mk('heart', {
              w: s,
              h: s * .92,
              fill: '#ff3b6b',
              stroke: {
                w: 6,
                color: '#ffffff'
              },
              shadow: SOFT,
              name: 'Srdce'
            }), cx, cy)];
          }
        },
        {
          n: 'Dvojitá šipka ››',
          make(m, cx, cy) {
            const w = Math.round(m * .2),
              h = Math.round(m * .24);
            const a = ctr(mk('chevron', {
                w,
                h,
                fill: '#ffffff',
                shadow: SOFT,
                name: 'Šipka 1'
              }), cx - w * .45, cy),
              b = ctr(mk('chevron', {
                w,
                h,
                fill: '#ffc800',
                shadow: SOFT,
                name: 'Šipka 2'
              }), cx + w * .45, cy);
            return [a, b];
          }
        }
      ];

      function addElem(i) {
        const e = ELEMS[i],
          m = Math.min(S.W, S.H),
          objs = e.make(m, S.W / 2, S.H / 2);
        objs.forEach(o => {
          S.objs.push(o);
          if (o.type === 'text') ensureFont(o);
        });
        selId = objs[objs.length - 1].id;
        tab = 'props';
        commit();
        renderPane();
        req();
      }

      /* ---------- banner kanálu 2560 x 1440 (viditelný pruh 423 px uprostřed, bezpečná zóna 1546 x 423) ---------- */
      const bnd = (W, H) => ({
        T: (H - BAN.stripH) / 2,
        B: (H + BAN.stripH) / 2,
        X: f => Math.round(W * f),
        Y: f => Math.round(H * f)
      });
      const BANNER_TEMPLATES = [{
          id: 'bn-space',
          cat: 'Banner',
          only: 'banner',
          name: 'Hvězdný kanál',
          build(W, H) {
            const r = rnd(7),
              stars = [];
            for (let i = 0; i < 150; i++) {
              const z = Math.max(3, Math.round(2 + r() * 7));
              stars.push(shp('ellipse', {
                w: z,
                h: z,
                x: Math.round(r() * W),
                y: Math.round(r() * H),
                fill: '#ffffff',
                opacity: Math.round((.3 + r() * .7) * 100) / 100,
                name: 'Hvězda'
              }));
            }
            const orb = ctr(shp('ellipse', {
              w: 1000,
              h: 1000,
              fillOn: false,
              stroke: {
                w: 4,
                color: '#9bd0ff'
              },
              opacity: .45,
              name: 'Dráha'
            }), W * .04, H * .5);
            const pl = ctr(shp('ellipse', {
              w: 800,
              h: 800,
              grad: true,
              fill: '#5ab0ff',
              fill2: '#06123f',
              angle: 135,
              shadow: glowOf('#3a8dff', 80),
              name: 'Planeta'
            }), W * .04, H * .5);
            const moon = ctr(shp('ellipse', {
              w: 420,
              h: 420,
              grad: true,
              fill: '#ffb86b',
              fill2: '#7a2a00',
              angle: 140,
              shadow: glowOf('#ff8a3a', 50),
              name: 'Měsíc'
            }), W * .95, H * .4);
            const t = ctxt({
              text: 'NÁZEV KANÁLU',
              font: 'Bebas Neue',
              size: 200,
              color: '#ffffff',
              ls: 12,
              w: 1480,
              shadow: glowOf('#4aa3ff', 50),
              name: 'Název kanálu'
            }, W / 2, H / 2 - 40);
            const s = ctxt({
              text: 'KAPITÁNŮV DENÍK · NOVÉ DÍLY',
              font: 'Montserrat',
              weight: 700,
              size: 46,
              color: '#9bd0ff',
              ls: 12,
              w: 1480,
              name: 'Podtitul'
            }, W / 2, H / 2 + 112);
            const hand = ctxt({
              text: '🖖',
              font: 'Montserrat',
              size: 190,
              w: 260,
              shadow: SOFT,
              name: 'Pozdrav'
            }, W * .89, H * .62);
            return {
              bg: mkBg({
                c1: '#02030a',
                c2: '#0b1d4a',
                angle: 200,
                vig: 25
              }),
              objs: [...stars, orb, pl, moon, t, s, hand]
            };
          }
        },
        {
          id: 'bn-lcars',
          cat: 'Banner',
          only: 'banner',
          name: 'LCARS banner',
          build(W, H) {
            const b = bnd(W, H),
              h = 40;
            const defs = [
              [0, .08, '#ff9c00'],
              [.09, .2, '#cc99ff'],
              [.30, .07, '#9999ff'],
              [.38, .22, '#ff9966'],
              [.61, .12, '#cc6666'],
              [.74, .1, '#9999ff'],
              [.85, .15, '#ff9c00']
            ];
            const row = y => defs.map(d => shp('round', {
              x: b.X(d[0]),
              y: Math.round(y),
              w: b.X(d[1]),
              h,
              radius: 20,
              fill: d[2],
              name: 'LCARS pruh'
            }));
            const top = row(b.T + 6),
              bot = row(b.B - 6 - h);
            const l = shp('round', {
              x: b.X(.012),
              y: b.Y(.12),
              w: 70,
              h: b.Y(.76),
              radius: 35,
              fill: '#cc99ff',
              name: 'Levý sloupec'
            });
            const rr2 = shp('round', {
              x: W - b.X(.012) - 70,
              y: b.Y(.12),
              w: 70,
              h: b.Y(.76),
              radius: 35,
              fill: '#ff9c00',
              name: 'Pravý sloupec'
            });
            const t = ctxt({
              text: 'NÁZEV KANÁLU',
              font: 'Barlow Condensed',
              weight: 700,
              size: 190,
              color: '#ff9c00',
              ls: 10,
              w: 1480,
              name: 'Název kanálu'
            }, W / 2, H / 2 - 8);
            const s = ctxt({
              text: 'HVĚZDNÉ DATUM 79412.3 · NOVÉ DÍLY KAŽDÝ TÝDEN',
              font: 'JetBrains Mono',
              weight: 600,
              size: 36,
              color: '#cc99ff',
              ls: 3,
              w: 1480,
              name: 'Podtitul'
            }, W / 2, H / 2 + 148);
            return {
              bg: bgSolid('#000000'),
              objs: [l, rr2, ...top, ...bot, t, s]
            };
          }
        },
        {
          id: 'bn-neon',
          cat: 'Banner',
          only: 'banner',
          name: 'Neon',
          build(W, H) {
            const a = ctr(shp('ellipse', {
              w: 700,
              h: 700,
              fillOn: false,
              stroke: {
                w: 14,
                color: '#00e5ff'
              },
              shadow: glowOf('#00e5ff', 40),
              name: 'Prstenec vlevo'
            }), W * .07, H * .5);
            const b2 = ctr(shp('ellipse', {
              w: 700,
              h: 700,
              fillOn: false,
              stroke: {
                w: 14,
                color: '#ff2bd6'
              },
              shadow: glowOf('#ff2bd6', 40),
              name: 'Prstenec vpravo'
            }), W * .93, H * .5);
            const t = ctxt({
              text: 'NÁZEV KANÁLU',
              font: 'Bebas Neue',
              size: 210,
              color: '#ffffff',
              ls: 14,
              w: 1480,
              shadow: glowOf('#ff2bd6', 50),
              name: 'Název kanálu'
            }, W / 2, H / 2 - 30);
            const s = ctxt({
              text: 'NOVÉ VIDEO KAŽDÝ TÝDEN',
              font: 'Montserrat',
              weight: 800,
              size: 46,
              color: '#00e5ff',
              ls: 14,
              w: 1480,
              shadow: glowOf('#00e5ff', 26),
              name: 'Podtitul'
            }, W / 2, H / 2 + 120);
            return {
              bg: mkBg({
                c1: '#05010f',
                c2: '#2b0a5e',
                angle: 160,
                vig: 45
              }),
              objs: [a, b2, t, s]
            };
          }
        },
        {
          id: 'bn-gaming',
          cat: 'Banner',
          only: 'banner',
          name: 'Gaming',
          build(W, H) {
            const burst = ctr(shp('burst', {
              w: 1500,
              h: 1500,
              grad: true,
              fill: '#39ff14',
              fill2: '#00c2ff',
              opacity: .3,
              blend: 'screen',
              rot: 8,
              name: 'Záře'
            }), W / 2, H / 2);
            const pad = ctxt({
              text: '🎮',
              font: 'Montserrat',
              size: 380,
              w: 520,
              shadow: SOFT,
              name: 'Ovladač'
            }, W * .09, H * .5);
            const joy = ctxt({
              text: '🕹️',
              font: 'Montserrat',
              size: 380,
              w: 520,
              shadow: SOFT,
              name: 'Joystick'
            }, W * .91, H * .5);
            const t = ctxt({
              text: 'NÁZEV KANÁLU',
              font: 'Anton',
              size: 190,
              color: '#39ff14',
              w: 1480,
              stroke: {
                w: 12,
                color: '#000000'
              },
              shadow: HARD,
              name: 'Název kanálu'
            }, W / 2, H / 2 - 40);
            const s = ctxt({
              text: "GAMEPLAY · LET'S PLAY · NOVÉ DÍLY",
              font: 'Barlow Condensed',
              weight: 700,
              size: 54,
              color: '#ffffff',
              ls: 5,
              w: 1100,
              box: {
                on: true,
                color: '#000000',
                pad: 14,
                radius: 10
              },
              name: 'Podtitul'
            }, W / 2, H / 2 + 135);
            return {
              bg: mkBg({
                c1: '#070a14',
                c2: '#2a0b4d',
                angle: 150,
                vig: 50
              }),
              objs: [burst, pad, joy, t, s]
            };
          }
        },
        {
          id: 'bn-minimal',
          cat: 'Banner',
          only: 'banner',
          name: 'Minimal tmavý',
          build(W, H) {
            const acc = ctr(shp('pill', {
              w: 180,
              h: 14,
              grad: true,
              fill: '#ffa24a',
              fill2: '#b7a4ff',
              angle: 90,
              name: 'Proužek'
            }), W / 2, H / 2 - 112);
            const t = ctxt({
              text: 'Název kanálu',
              font: 'Montserrat',
              weight: 800,
              size: 150,
              color: '#ffffff',
              w: 1480,
              name: 'Název kanálu'
            }, W / 2, H / 2 - 10);
            const s = ctxt({
              text: 'Krátký popis toho, o čem kanál je',
              font: 'Barlow',
              weight: 600,
              size: 48,
              color: '#9a9bb8',
              w: 1480,
              name: 'Podtitul'
            }, W / 2, H / 2 + 108);
            const d1 = ctr(shp('ellipse', {
              w: 44,
              h: 44,
              fill: '#ffa24a',
              name: 'Tečka vlevo'
            }), W * .1, H * .5);
            const d2 = ctr(shp('ellipse', {
              w: 44,
              h: 44,
              fill: '#b7a4ff',
              name: 'Tečka vpravo'
            }), W * .9, H * .5);
            return {
              bg: bgSolid('#0e0e12'),
              objs: [d1, d2, acc, t, s]
            };
          }
        },
        {
          id: 'bn-synth',
          cat: 'Banner',
          only: 'banner',
          name: 'Synthwave',
          build(W, H) {
            const sun = ctr(shp('ellipse', {
              w: 800,
              h: 800,
              grad: true,
              fill: '#ffe14a',
              fill2: '#ff2e97',
              angle: 180,
              shadow: glowOf('#ff2e97', 80),
              name: 'Slunce'
            }), W / 2, H * .5);
            const fy = Math.round(H * .72),
              floor = shp('rect', {
                x: 0,
                y: fy,
                w: W,
                h: H - fy,
                fill: '#12002b',
                name: 'Podlaha'
              });
            const lines = [0, 1, 2, 3, 4, 5].map(i => shp('rect', {
              x: 0,
              y: Math.round(fy + Math.pow(i / 5, 1.7) * (H - fy - 16)) + 4,
              w: W,
              h: 3 + i,
              fill: '#ff2e97',
              opacity: .85,
              name: 'Čára mřížky'
            }));
            const t = ctxt({
              text: 'NÁZEV KANÁLU',
              font: 'Bebas Neue',
              size: 210,
              color: '#ffffff',
              ls: 14,
              w: 1480,
              shadow: {
                on: true,
                color: '#2a0050',
                a: 1,
                blur: 36,
                x: 0,
                y: 0
              },
              name: 'Název kanálu'
            }, W / 2, H / 2 - 40);
            const s = ctxt({
              text: 'RETRO MIX · NOVÉ DÍLY',
              font: 'Montserrat',
              weight: 700,
              size: 44,
              color: '#ffe14a',
              ls: 16,
              w: 1480,
              shadow: {
                on: true,
                color: '#2a0050',
                a: 1,
                blur: 24,
                x: 0,
                y: 0
              },
              name: 'Podtitul'
            }, W / 2, H / 2 + 118);
            return {
              bg: mkBg({
                c1: '#1a0033',
                c2: '#ff2e97',
                angle: 180,
                vig: 25
              }),
              objs: [sun, floor, ...lines, t, s]
            };
          }
        },
        {
          id: 'bn-nature',
          cat: 'Banner',
          only: 'banner',
          name: 'Příroda',
          build(W, H) {
            const b = bnd(W, H),
              gy = Math.round(b.B + 6),
              r = rnd(11),
              objs = [];
            objs.push(ctr(shp('ellipse', {
              w: 300,
              h: 300,
              fill: '#ffe680',
              shadow: glowOf('#fff2a0', 80),
              name: 'Slunce'
            }), W * .87, H * .4));
            [
              [.2, .4, 420],
              [.6, .37, 520],
              [.73, .44, 380],
              [.36, .34, 360]
            ].forEach(c => {
              objs.push(ctr(shp('ellipse', {
                w: c[2],
                h: Math.round(c[2] * .32),
                fill: '#ffffff',
                opacity: .85,
                name: 'Mrak'
              }), W * c[0], H * c[1]));
              objs.push(ctr(shp('ellipse', {
                w: Math.round(c[2] * .6),
                h: Math.round(c[2] * .3),
                fill: '#ffffff',
                opacity: .85,
                name: 'Mrak'
              }), W * c[0] + c[2] * .22, H * c[1] - c[2] * .08));
            });
            const cols = ['#0f3d2a', '#14532d', '#1b6b3a', '#0b2e20'];
            [
              [-20, 380],
              [2170, 2580]
            ].forEach(rg => {
              for (let x = rg[0]; x < rg[1]; x += 70) {
                const w = Math.round(90 + r() * 90),
                  h = Math.round(w * (2.2 + r() * .6));
                objs.push(shp('tri', {
                  w,
                  h,
                  x: Math.round(x),
                  y: gy - h + 14,
                  fill: cols[Math.floor(r() * 4)],
                  name: 'Strom'
                }));
              }
            });
            objs.push(shp('rect', {
              x: 0,
              y: gy,
              w: W,
              h: H - gy,
              fill: '#2f7a4b',
              name: 'Louka'
            }));
            objs.push(shp('rect', {
              x: 0,
              y: Math.round(gy + (H - gy) * .55),
              w: W,
              h: H - Math.round(gy + (H - gy) * .55),
              fill: '#1f5c37',
              name: 'Zem'
            }));
            const t = ctxt({
              text: 'NÁZEV KANÁLU',
              font: 'Montserrat',
              weight: 900,
              size: 150,
              color: '#0f3d2a',
              w: 1480,
              shadow: {
                on: true,
                color: '#ffffff',
                a: .7,
                blur: 20,
                x: 0,
                y: 0
              },
              name: 'Název kanálu'
            }, W / 2, H / 2 - 30);
            const s = ctxt({
              text: 'PŘÍRODA · POHODA · NOVÉ DÍLY',
              font: 'Montserrat',
              weight: 700,
              size: 44,
              color: '#14532d',
              ls: 10,
              w: 1480,
              name: 'Podtitul'
            }, W / 2, H / 2 + 100);
            return {
              bg: mkBg({
                c1: '#8fd0ff',
                c2: '#eaf7ff',
                angle: 180
              }),
              objs: [...objs, t, s]
            };
          }
        }
      ];

      /* ---------- další šablony banneru ---------- */
      function ensureBricks() {
        const id = 'tpl-bricks';
        if (assets[id] && imgCache.get(id)) return id;
        const c = document.createElement('canvas');
        c.width = 2560;
        c.height = 1440;
        const g = c.getContext('2d'),
          r = rnd(5);
        g.fillStyle = '#3a2a24';
        g.fillRect(0, 0, 2560, 1440);
        const bw = 150,
          bh = 62,
          gap = 8;
        for (let row = 0, y = 0; y < 1440; row++, y += bh + gap) {
          const off = row % 2 ? -(bw + gap) / 2 : 0;
          for (let x = off; x < 2560; x += bw + gap) {
            g.fillStyle = `hsl(${10+r()*8} ${45+r()*15}% ${38+r()*14}%)`;
            g.fillRect(x, y, bw, bh);
            g.fillStyle = 'rgba(0,0,0,.13)';
            g.fillRect(x, y + bh - 8, bw, 8);
          }
        }
        assets[id] = {
          url: c.toDataURL('image/jpeg', .85),
          w: 2560,
          h: 1440,
          name: 'Cihlová zeď'
        };
        imgCache.set(id, c);
        return id;
      }

      function ledString(W, y0, sag, n, colors, tag) {
        const o = [],
          pts = [];
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          pts.push([-40 + (W + 80) * t, y0 + sag * (1 - Math.pow(2 * t - 1, 2))]);
        }
        for (let i = 0; i < n - 1; i++) {
          const a = pts[i],
            b = pts[i + 1],
            dx = b[0] - a[0],
            dy = b[1] - a[1],
            len = Math.hypot(dx, dy);
          o.push(ctr(shp('rect', {
            w: Math.round(len + 2),
            h: 4,
            rot: Math.round(Math.atan2(dy, dx) * 1800 / Math.PI) / 10,
            fill: '#2a2f45',
            name: 'Drát ' + tag
          }), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
        }
        pts.forEach((p, i) => {
          const c = colors[i % colors.length];
          o.push(ctr(shp('rect', {
            w: 14,
            h: 12,
            fill: '#2a2f45',
            name: 'Patice'
          }), p[0], p[1] + 6));
          o.push(ctr(shp('ellipse', {
            w: 34,
            h: 48,
            fill: c,
            shadow: glowOf(c, 36),
            name: 'Žárovka ' + tag
          }), p[0], p[1] + 32));
        });
        return o;
      }
      const GOLD = '#f3d98b';
      BANNER_TEMPLATES.push({
        id: 'bn-duo',
        cat: 'Banner',
        only: 'banner',
        name: 'Dvojice',
        build(W, H) {
          const l = ctr(shp('ellipse', {
            w: 260,
            h: 260,
            fillOn: false,
            stroke: {
              w: 12,
              color: '#ffa24a'
            },
            shadow: SOFT,
            name: 'Rámeček vlevo'
          }), W / 2 - 640, H / 2);
          const r = ctr(shp('ellipse', {
            w: 260,
            h: 260,
            fillOn: false,
            stroke: {
              w: 12,
              color: '#b7a4ff'
            },
            shadow: SOFT,
            name: 'Rámeček vpravo'
          }), W / 2 + 640, H / 2);
          const t = ctxt({
            text: 'JMÉNO & JMÉNO',
            font: 'Montserrat',
            weight: 900,
            size: 96,
            color: '#ffffff',
            w: 980,
            shadow: SOFT,
            name: 'Názvy'
          }, W / 2, H / 2 - 30);
          const s = ctxt({
            text: 'společný kanál',
            font: 'Barlow',
            weight: 600,
            size: 44,
            color: '#c9c7e6',
            ls: 6,
            w: 980,
            name: 'Podtitul'
          }, W / 2, H / 2 + 70);
          return {
            bg: mkBg({
              c1: '#141a3a',
              c2: '#3b1f6b',
              angle: 140,
              vig: 30
            }),
            objs: [l, r, t, s]
          };
        }
      }, {
        id: 'bn-lcars2',
        cat: 'Banner',
        only: 'banner',
        name: 'LCARS závorky',
        build(W, H) {
          const b = bnd(W, H),
            T = Math.round(b.T),
            bk = (x0, dir, c1, c2) => {
              const vx = dir > 0 ? x0 : x0 - 100,
                hx = dir > 0 ? x0 : x0 - 500;
              return [shp('round', {
                  x: vx,
                  y: T,
                  w: 100,
                  h: BAN.stripH,
                  radius: 50,
                  fill: c1,
                  name: 'Svislý pruh'
                }),
                shp('round', {
                  x: hx,
                  y: T,
                  w: 500,
                  h: 56,
                  radius: 28,
                  fill: c1,
                  name: 'Horní pruh'
                }),
                shp('round', {
                  x: hx,
                  y: T + BAN.stripH - 56,
                  w: 500,
                  h: 56,
                  radius: 28,
                  fill: c1,
                  name: 'Dolní pruh'
                }),
                shp('round', {
                  x: dir > 0 ? x0 + 140 : x0 - 340,
                  y: T + 100,
                  w: 200,
                  h: 40,
                  radius: 20,
                  fill: c2,
                  name: 'Pilulka'
                }),
                shp('round', {
                  x: dir > 0 ? x0 + 140 : x0 - 340,
                  y: T + 283 - 40,
                  w: 200,
                  h: 40,
                  radius: 20,
                  fill: c2,
                  name: 'Pilulka'
                })
              ];
            };
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Barlow Condensed',
            weight: 700,
            size: 180,
            color: '#ff9c00',
            ls: 10,
            w: 1000,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 20);
          const s = ctxt({
            text: 'NOVÉ DÍLY KAŽDÝ TÝDEN',
            font: 'JetBrains Mono',
            weight: 600,
            size: 34,
            color: '#cc99ff',
            ls: 4,
            w: 1000,
            name: 'Podtitul'
          }, W / 2, H / 2 + 110);
          return {
            bg: bgSolid('#000000'),
            objs: [...bk(0, 1, '#ff9c00', '#cc99ff'), ...bk(W, -1, '#cc99ff', '#ff9c00'), t, s]
          };
        }
      }, {
        id: 'bn-cyber',
        cat: 'Banner',
        only: 'banner',
        name: 'Cyber glitch',
        build(W, H) {
          const bars = [
            [.1, .4, 600, 18, '#fcee09'],
            [.12, .47, 480, 8, '#00f0ff'],
            [.9, .4, 600, 18, '#fcee09'],
            [.88, .47, 480, 8, '#00f0ff']
          ].map(d => ctr(shp('rect', {
            w: d[2],
            h: d[3],
            rot: d[0] < .5 ? -12 : 12,
            fill: d[4],
            name: 'Pruh'
          }), W * d[0], H * d[1]));
          const base = {
            text: 'NÁZEV KANÁLU',
            font: 'Anton',
            size: 190,
            ls: 6,
            w: 1480
          };
          const m = ctxt(Object.assign({}, base, {
            color: '#ff2bd6',
            opacity: .9,
            name: 'Glitch růžový'
          }), W / 2 - 9, H / 2 - 20);
          const c = ctxt(Object.assign({}, base, {
            color: '#00f0ff',
            opacity: .9,
            name: 'Glitch modrý'
          }), W / 2 + 9, H / 2 - 20);
          const t = ctxt(Object.assign({}, base, {
            color: '#ffffff',
            name: 'Název kanálu'
          }), W / 2, H / 2 - 20);
          const s = ctxt({
            text: '// NOVÉ DÍLY KAŽDÝ TÝDEN',
            font: 'JetBrains Mono',
            weight: 600,
            size: 40,
            color: '#fcee09',
            ls: 4,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 120);
          return {
            bg: bgSolid('#0a0a12'),
            objs: [...bars, m, c, t, s]
          };
        }
      }, {
        id: 'bn-sunset',
        cat: 'Banner',
        only: 'banner',
        name: 'Západ slunce',
        build(W, H) {
          const sun = ctr(shp('ellipse', {
            w: 420,
            h: 420,
            grad: true,
            fill: '#ffd36b',
            fill2: '#ff6a3d',
            angle: 180,
            shadow: glowOf('#ff9a3c', 80),
            name: 'Slunce'
          }), W * .8, H * .5);
          const r = rnd(21),
            ms = [];
          [
            [-120, 380],
            [2160, 2680]
          ].forEach(rg => {
            for (let x = rg[0]; x < rg[1]; x += 150) {
              const w = Math.round(420 + r() * 260),
                h = Math.round(260 + r() * 220);
              ms.push(shp('tri', {
                w,
                h,
                x: Math.round(x),
                y: Math.round(H / 2 + BAN.stripH / 2 + 40 - h),
                fill: r() > .5 ? '#2a0f3f' : '#3d1a58',
                name: 'Hora'
              }));
            }
          });
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Montserrat',
            weight: 900,
            size: 140,
            color: '#ffffff',
            w: 1480,
            shadow: {
              on: true,
              color: '#3b1a5e',
              a: .8,
              blur: 30,
              x: 0,
              y: 8
            },
            name: 'Název kanálu'
          }, W / 2, H / 2 - 30);
          const s = ctxt({
            text: 'PŘÍBĚHY · CESTY · NOVÉ DÍLY',
            font: 'Montserrat',
            weight: 700,
            size: 42,
            color: '#ffe9c4',
            ls: 12,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 100);
          return {
            bg: mkBg({
              c1: '#3b1a5e',
              c2: '#ff9a3c',
              angle: 180
            }),
            objs: [sun, ...ms, t, s]
          };
        }
      }, {
        id: 'bn-ocean',
        cat: 'Banner',
        only: 'banner',
        name: 'Oceán',
        build(W, H) {
          const r = rnd(33),
            o = [];
          [
            [.2, .78, 1500],
            [.7, .82, 1700],
            [.45, .72, 1200]
          ].forEach(w => o.push(ctr(shp('ellipse', {
            w: w[2],
            h: Math.round(w[2] * .14),
            fill: '#ffffff',
            opacity: .22,
            name: 'Vlna'
          }), W * w[0], H * w[1])));
          for (let i = 0; i < 16; i++) {
            const z = Math.round(30 + r() * 70),
              left = i % 2 === 0;
            o.push(ctr(shp('ellipse', {
              w: z,
              h: z,
              fillOn: false,
              stroke: {
                w: 4,
                color: '#ffffff'
              },
              opacity: .55,
              name: 'Bublina'
            }), left ? W * (.03 + r() * .16) : W * (.81 + r() * .16), H * (.3 + r() * .45)));
          }
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Montserrat',
            weight: 800,
            size: 150,
            color: '#ffffff',
            w: 1480,
            shadow: {
              on: true,
              color: '#023e8a',
              a: .7,
              blur: 26,
              x: 0,
              y: 8
            },
            name: 'Název kanálu'
          }, W / 2, H / 2 - 30);
          const s = ctxt({
            text: 'PONOŘ SE DO NOVÝCH DÍLŮ',
            font: 'Montserrat',
            weight: 700,
            size: 44,
            color: '#caf0f8',
            ls: 12,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 100);
          return {
            bg: mkBg({
              c1: '#48cae4',
              c2: '#023e8a',
              angle: 180,
              vig: 15
            }),
            objs: [...o, t, s]
          };
        }
      }, {
        id: 'bn-tech',
        cat: 'Banner',
        only: 'banner',
        name: 'Kód a technika',
        build(W, H) {
          const g = [];
          for (let x = 0; x <= W; x += 160) g.push(shp('rect', {
            x,
            y: 0,
            w: 2,
            h: H,
            fill: '#1b3a5a',
            opacity: .55,
            name: 'Mřížka svislá'
          }));
          for (let y = 0; y <= H; y += 160) g.push(shp('rect', {
            x: 0,
            y,
            w: W,
            h: 2,
            fill: '#1b3a5a',
            opacity: .55,
            name: 'Mřížka vodorovná'
          }));
          const h1 = ctr(shp('hex', {
            w: 280,
            h: 244,
            fillOn: false,
            stroke: {
              w: 8,
              color: '#00e5ff'
            },
            shadow: glowOf('#00e5ff', 30),
            name: 'Šestiúhelník vlevo'
          }), W * .09, H * .5);
          const h2 = ctr(shp('hex', {
            w: 280,
            h: 244,
            fillOn: false,
            stroke: {
              w: 8,
              color: '#39ff14'
            },
            shadow: glowOf('#39ff14', 30),
            name: 'Šestiúhelník vpravo'
          }), W * .91, H * .5);
          const t = ctxt({
            text: '> NÁZEV_KANÁLU',
            font: 'JetBrains Mono',
            weight: 600,
            size: 116,
            color: '#39ff14',
            w: 1480,
            shadow: glowOf('#39ff14', 30),
            name: 'Název kanálu'
          }, W / 2, H / 2 - 30);
          const s = ctxt({
            text: '// kódování · technika · návody',
            font: 'JetBrains Mono',
            weight: 400,
            size: 40,
            color: '#7dd3fc',
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 100);
          return {
            bg: bgSolid('#07121f'),
            objs: [...g, h1, h2, t, s]
          };
        }
      }, {
        id: 'bn-sport',
        cat: 'Banner',
        only: 'banner',
        name: 'Sport',
        build(W, H) {
          const st = [
            [.1, .4, 700, 56],
            [.07, .53, 620, 34],
            [.9, .4, 700, 56],
            [.93, .53, 620, 34]
          ].map(d => ctr(shp('rect', {
            w: d[2],
            h: d[3],
            rot: d[0] < .5 ? -18 : 18,
            fill: '#ffe600',
            name: 'Pruh'
          }), W * d[0], H * d[1]));
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Anton',
            italic: true,
            size: 190,
            color: '#ffffff',
            w: 1480,
            shadow: HARD,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 30);
          const s = ctxt({
            text: 'TRÉNINK · VÝZVY · MOTIVACE',
            font: 'Barlow Condensed',
            weight: 700,
            size: 54,
            color: '#111111',
            ls: 6,
            w: 1000,
            box: {
              on: true,
              color: '#ffe600',
              pad: 14,
              radius: 6
            },
            name: 'Podtitul'
          }, W / 2, H / 2 + 120);
          return {
            bg: bgSolid('#0b0b0b'),
            objs: [...st, t, s]
          };
        }
      }, {
        id: 'bn-light',
        cat: 'Banner',
        only: 'banner',
        name: 'Světlý',
        build(W, H) {
          const c1 = ctr(shp('ellipse', {
            w: 420,
            h: 420,
            fill: '#ffa24a',
            name: 'Kruh oranžový'
          }), W * .06, H * .55);
          const c2 = ctr(shp('ellipse', {
            w: 520,
            h: 520,
            fill: '#b7a4ff',
            name: 'Kruh fialový'
          }), W * .95, H * .45);
          const c3 = ctr(shp('ellipse', {
            w: 150,
            h: 150,
            fill: '#7db4ff',
            name: 'Kruh modrý'
          }), W * .17, H * .4);
          const acc = ctr(shp('pill', {
            w: 180,
            h: 14,
            grad: true,
            fill: '#ffa24a',
            fill2: '#b7a4ff',
            angle: 90,
            name: 'Proužek'
          }), W / 2, H / 2 - 112);
          const t = ctxt({
            text: 'Název kanálu',
            font: 'Montserrat',
            weight: 800,
            size: 150,
            color: '#1b1b2a',
            w: 1480,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 10);
          const s = ctxt({
            text: 'Krátký popis toho, o čem kanál je',
            font: 'Barlow',
            weight: 600,
            size: 48,
            color: '#5d5b72',
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 108);
          return {
            bg: mkBg({
              c1: '#f6f4ff',
              c2: '#e3ecff',
              angle: 160
            }),
            objs: [c1, c2, c3, acc, t, s]
          };
        }
      }, {
        id: 'bn-comic',
        cat: 'Banner',
        only: 'banner',
        name: 'Komiks',
        build(W, H) {
          const bs = ctr(shp('burst', {
            w: 1500,
            h: 1500,
            fill: '#e11d2e',
            stroke: {
              w: 12,
              color: '#111111'
            },
            rot: -6,
            name: 'Výbuch'
          }), W / 2, H / 2);
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Bangers',
            size: 230,
            color: '#ffffff',
            rot: -3,
            w: 1480,
            stroke: {
              w: 16,
              color: '#111111'
            },
            shadow: HARD,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 30);
          const s = ctxt({
            text: 'NOVÉ DÍLY!',
            font: 'Bangers',
            size: 66,
            color: '#ffd23f',
            ls: 4,
            w: 600,
            box: {
              on: true,
              color: '#111111',
              pad: 12,
              radius: 12
            },
            name: 'Podtitul'
          }, W / 2, H / 2 + 130);
          return {
            bg: bgSolid('#ffd23f'),
            objs: [bs, t, s]
          };
        }
      }, {
        id: 'bn-elegant',
        cat: 'Banner',
        only: 'banner',
        name: 'Elegantní zlatý',
        build(W, H) {
          const ln = (y, n) => ctr(shp('pill', {
            w: 520,
            h: 4,
            grad: true,
            fill: '#b8892e',
            fill2: GOLD,
            angle: 90,
            name: n
          }), W / 2, y);
          const dm = (x, n) => ctr(shp('diamond', {
            w: 26,
            h: 26,
            fill: GOLD,
            name: n
          }), x, H / 2);
          const t = ctxt({
            text: 'Název kanálu',
            font: 'Playfair Display',
            weight: 900,
            size: 140,
            color: GOLD,
            w: 1480,
            shadow: SOFT,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 8);
          const s = ctxt({
            text: 'NOVÉ DÍLY · KAŽDÝ TÝDEN',
            font: 'Barlow Condensed',
            weight: 600,
            size: 44,
            color: '#b8a46a',
            ls: 14,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 112);
          return {
            bg: mkBg({
              c1: '#0b0b0f',
              c2: '#1f1a10',
              angle: 160,
              vig: 40
            }),
            objs: [ln(H / 2 - 130, 'Linka nahoře'), ln(H / 2 + 168, 'Linka dole'), dm(W / 2 - 340, 'Kosočtverec vlevo'), dm(W / 2 + 340, 'Kosočtverec vpravo'), t, s]
          };
        }
      }, {
        id: 'bn-zed',
        cat: 'Banner',
        only: 'banner',
        name: 'Cihlová zeď',
        build(W, H) {
          const id = ensureBricks();
          const plate = ctr(shp('round', {
            w: 1520,
            h: 300,
            radius: 30,
            fill: '#111111',
            opacity: .8,
            stroke: {
              w: 6,
              color: '#ffd23f'
            },
            shadow: SOFT,
            name: 'Cedule'
          }), W / 2, H / 2);
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Anton',
            size: 150,
            color: '#ffffff',
            ls: 6,
            w: 1440,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 45);
          const s = ctxt({
            text: 'ŘEMESLO · TECHNIKA · NOVÉ DÍLY',
            font: 'Barlow Condensed',
            weight: 700,
            size: 46,
            color: '#ffd23f',
            ls: 10,
            w: 1440,
            name: 'Podtitul'
          }, W / 2, H / 2 + 80);
          return {
            bg: mkBg({
              type: 'image',
              asset: id,
              fit: 'cover',
              vig: 45,
              f: Object.assign(defFilters(), {
                brightness: 85
              })
            }),
            objs: [plate, t, s]
          };
        }
      }, {
        id: 'bn-led',
        cat: 'Banner',
        only: 'banner',
        name: 'LED světýlka',
        build(W, H) {
          const b = bnd(W, H),
            cols = ['#ff3b5c', '#ffd23f', '#39ff14', '#00e5ff', '#b45cff'];
          const s1 = ledString(W, Math.round(b.T + 8), 40, 26, cols, '1'),
            s2 = ledString(W, Math.round(b.T + 62), 24, 22, cols.slice().reverse(), '2');
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Bebas Neue',
            size: 170,
            color: '#ffffff',
            ls: 12,
            w: 1480,
            shadow: glowOf('#ffd27a', 46),
            name: 'Název kanálu'
          }, W / 2, H / 2 + 20);
          const s = ctxt({
            text: 'NOVÉ DÍLY KAŽDÝ TÝDEN',
            font: 'Montserrat',
            weight: 700,
            size: 42,
            color: '#ffe9c4',
            ls: 12,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 140);
          return {
            bg: mkBg({
              c1: '#070b1a',
              c2: '#101a3a',
              angle: 180,
              vig: 35
            }),
            objs: [...s1, ...s2, t, s]
          };
        }
      });

      /* ---------- trekovské bannery (styl panelů, bez log a insignií) ---------- */
      function lcarsBars(W, H, cols, shape, tag, labels) {
        const T = Math.round((H - BAN.stripH) / 2),
          B = Math.round((H + BAN.stripH) / 2),
          h = 44,
          o = [];
        const segs = [
          [0, .08],
          [.09, .2],
          [.30, .07],
          [.38, .22],
          [.61, .12],
          [.74, .1],
          [.85, .15]
        ];
        [T + 6, B - 6 - h].forEach((y, row) => segs.forEach((d, i) => {
          const x = Math.round(W * d[0]),
            w = Math.round(W * d[1]);
          o.push(shp(shape, {
            x,
            y,
            w,
            h,
            radius: h / 2,
            fill: cols[(i + row * 2) % cols.length],
            name: tag + ' pruh'
          }));
          if (labels && w > 200) o.push(ctxt({
            text: labels[(i + row * 3) % labels.length],
            font: 'JetBrains Mono',
            weight: 600,
            size: 26,
            color: '#000000',
            w: w - 40,
            name: 'Číslo'
          }, x + w / 2, y + h / 2));
        }));
        return o;
      }
      BANNER_TEMPLATES.push({
        id: 'bn-tng',
        cat: 'Star Trek',
        only: 'banner',
        name: 'Panely TNG',
        build(W, H) {
          const cols = ['#ff9900', '#ffcc99', '#cc99cc', '#9999cc', '#cc6666'],
            b = bnd(W, H);
          const bars = lcarsBars(W, H, cols, 'round', 'TNG', ['47-1701', '04-2364', '81-0292', '12-4471']);
          const blk = (x, y, c, txt) => [ctr(shp('round', {
            w: 200,
            h: 36,
            radius: 18,
            fill: c,
            name: 'Blok'
          }), x, y), ctxt({
            text: txt,
            font: 'JetBrains Mono',
            weight: 600,
            size: 24,
            color: '#000000',
            w: 160,
            name: 'Číslo'
          }, x, y)];
          const side = [...blk(W * .08, H / 2 - 60, '#cc99cc', '03-7714'), ...blk(W * .08, H / 2, '#ff9900', '55-1209'), ...blk(W * .08, H / 2 + 60, '#9999cc', '21-6603'),
            ...blk(W * .92, H / 2 - 60, '#9999cc', '90-4418'), ...blk(W * .92, H / 2, '#ff9900', '14-0087'), ...blk(W * .92, H / 2 + 60, '#cc99cc', '62-3305')
          ];
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Barlow Condensed',
            weight: 700,
            size: 180,
            color: '#ff9900',
            ls: 10,
            w: 1480,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 8);
          const s = ctxt({
            text: 'ZÁZNAM KAPITÁNA · NOVÉ DÍLY',
            font: 'JetBrains Mono',
            weight: 600,
            size: 36,
            color: '#cc99cc',
            ls: 3,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 120);
          return {
            bg: bgSolid('#000000'),
            objs: [...bars, ...side, t, s]
          };
        }
      }, {
        id: 'bn-voy',
        cat: 'Star Trek',
        only: 'banner',
        name: 'Panely Voyager',
        build(W, H) {
          const r = rnd(61),
            st = [];
          for (let i = 0; i < 70; i++) {
            const z = Math.round(3 + r() * 5);
            st.push(shp('ellipse', {
              w: z,
              h: z,
              x: Math.round(r() * W),
              y: Math.round(r() * H),
              fill: '#ffffff',
              opacity: Math.round((.3 + r() * .6) * 100) / 100,
              name: 'Hvězda'
            }));
          }
          const orb1 = ctr(shp('ellipse', {
            w: 1500,
            h: 420,
            fillOn: false,
            stroke: {
              w: 3,
              color: '#99ccff'
            },
            opacity: .4,
            rot: -8,
            name: 'Dráha'
          }), W / 2, H / 2);
          const orb2 = ctr(shp('ellipse', {
            w: 1900,
            h: 560,
            fillOn: false,
            stroke: {
              w: 3,
              color: '#cc99ff'
            },
            opacity: .3,
            rot: 6,
            name: 'Dráha 2'
          }), W / 2, H / 2);
          const bars = lcarsBars(W, H, ['#99ccff', '#cc99ff', '#ffcc66', '#6699cc', '#cc6699'], 'ribbon', 'Voyager', null);
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Barlow Condensed',
            weight: 700,
            size: 190,
            color: '#ffffff',
            ls: 12,
            w: 1480,
            shadow: glowOf('#99ccff', 44),
            name: 'Název kanálu'
          }, W / 2, H / 2 - 8);
          const s = ctxt({
            text: 'DENÍK Z DALEKÉ CESTY',
            font: 'Montserrat',
            weight: 700,
            size: 40,
            color: '#99ccff',
            ls: 14,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 122);
          return {
            bg: mkBg({
              c1: '#02040f',
              c2: '#0a1030',
              angle: 180,
              vig: 25
            }),
            objs: [...st, orb2, orb1, ...bars, t, s]
          };
        }
      }, {
        id: 'bn-ds9',
        cat: 'Star Trek',
        only: 'banner',
        name: 'Stanice DS9',
        build(W, H) {
          const ring = (cx, sz, tag) => {
            const o = [ctr(shp('ellipse', {
                w: sz,
                h: sz,
                fillOn: false,
                stroke: {
                  w: 16,
                  color: '#ffb347'
                },
                shadow: glowOf('#ff9a3c', 34),
                name: 'Prstenec ' + tag
              }), cx, H / 2),
              ctr(shp('ellipse', {
                w: Math.round(sz * .72),
                h: Math.round(sz * .72),
                fillOn: false,
                stroke: {
                  w: 6,
                  color: '#cc9966'
                },
                name: 'Vnitřní prstenec ' + tag
              }), cx, H / 2)
            ];
            [0, 60, 120].forEach(a => o.push(ctr(shp('rect', {
              w: sz,
              h: 12,
              rot: a,
              fill: '#996633',
              name: 'Pylon ' + tag
            }), cx, H / 2)));
            return o;
          };
          const b = bnd(W, H);
          const bar1 = ctr(shp('ribbon', {
            w: 1200,
            h: 22,
            fill: '#cc9966',
            name: 'Pruh nahoře'
          }), W / 2, b.T + 10);
          const bar2 = ctr(shp('ribbon', {
            w: 1200,
            h: 22,
            fill: '#996633',
            name: 'Pruh dole'
          }), W / 2, b.B - 10);
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Barlow Condensed',
            weight: 700,
            size: 180,
            color: '#ffb347',
            ls: 8,
            w: 1400,
            shadow: glowOf('#ff7a1a', 30),
            name: 'Název kanálu'
          }, W / 2, H / 2 - 8);
          const s = ctxt({
            text: 'VÝCHOZÍ STANICE · NOVÉ DÍLY',
            font: 'JetBrains Mono',
            weight: 600,
            size: 36,
            color: '#e0c9a6',
            ls: 4,
            w: 1400,
            name: 'Podtitul'
          }, W / 2, H / 2 + 122);
          return {
            bg: mkBg({
              c1: '#0b0907',
              c2: '#2a1a10',
              angle: 180,
              vig: 40
            }),
            objs: [...ring(W * .07, 800, 'vlevo'), ...ring(W * .93, 800, 'vpravo'), bar1, bar2, t, s]
          };
        }
      }, {
        id: 'bn-modern',
        cat: 'Star Trek',
        only: 'banner',
        name: 'Moderní hologram',
        build(W, H) {
          const b = bnd(W, H);
          const r1 = ctr(shp('ellipse', {
            w: 1100,
            h: 1100,
            fillOn: false,
            stroke: {
              w: 2,
              color: '#7dd3fc'
            },
            opacity: .25,
            name: 'Kruh 1'
          }), W / 2, H / 2);
          const r2 = ctr(shp('ellipse', {
            w: 1500,
            h: 1500,
            fillOn: false,
            stroke: {
              w: 2,
              color: '#7dd3fc'
            },
            opacity: .18,
            name: 'Kruh 2'
          }), W / 2, H / 2);
          const l1 = ctr(shp('rect', {
            w: 1600,
            h: 3,
            fill: '#7dd3fc',
            opacity: .7,
            shadow: glowOf('#7dd3fc', 20),
            name: 'Linka nahoře'
          }), W / 2, b.T + 12);
          const l2 = ctr(shp('rect', {
            w: 1600,
            h: 3,
            fill: '#7dd3fc',
            opacity: .7,
            shadow: glowOf('#7dd3fc', 20),
            name: 'Linka dole'
          }), W / 2, b.B - 12);
          const ticks = [];
          for (let i = -6; i <= 6; i++) ticks.push(ctr(shp('rect', {
            w: 3,
            h: i % 3 === 0 ? 26 : 14,
            fill: '#7dd3fc',
            opacity: .6,
            name: 'Značka'
          }), W / 2 + i * 120, b.T + 31));
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Montserrat',
            weight: 700,
            size: 128,
            color: '#ffffff',
            ls: 22,
            w: 1480,
            shadow: glowOf('#38bdf8', 36),
            name: 'Název kanálu'
          }, W / 2, H / 2 - 10);
          const s = ctxt({
            text: 'NOVÉ DÍLY KAŽDÝ TÝDEN',
            font: 'Barlow Condensed',
            weight: 600,
            size: 44,
            color: '#7dd3fc',
            ls: 18,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 110);
          return {
            bg: mkBg({
              c1: '#04080f',
              c2: '#0b1a2a',
              angle: 160,
              vig: 35
            }),
            objs: [r2, r1, l1, l2, ...ticks, t, s]
          };
        }
      }, {
        id: 'bn-klingon',
        cat: 'Star Trek',
        only: 'banner',
        name: 'Bojovník',
        build(W, H) {
          const b = bnd(W, H),
            z = [];
          for (let x = 0; x < W; x += 120) {
            z.push(shp('tri', {
              w: 120,
              h: 60,
              x,
              y: Math.round(b.T),
              flipV: true,
              fill: '#b30000',
              name: 'Zub nahoře'
            }));
            z.push(shp('tri', {
              w: 120,
              h: 60,
              x,
              y: Math.round(b.B - 60),
              fill: '#b30000',
              name: 'Zub dole'
            }));
          }
          const l = ctr(shp('tri', {
            w: 520,
            h: 900,
            fill: '#4a0000',
            rot: -90,
            name: 'Hrot vlevo'
          }), W * .03, H / 2);
          const r = ctr(shp('tri', {
            w: 520,
            h: 900,
            fill: '#4a0000',
            rot: 90,
            name: 'Hrot vpravo'
          }), W * .97, H / 2);
          const t = ctxt({
            text: 'NÁZEV KANÁLU',
            font: 'Anton',
            size: 180,
            color: '#ff3b3b',
            ls: 6,
            w: 1480,
            stroke: {
              w: 8,
              color: '#000000'
            },
            shadow: HARD,
            name: 'Název kanálu'
          }, W / 2, H / 2 - 5);
          const s = ctxt({
            text: 'ČEST · VÍTĚZSTVÍ · NOVÉ DÍLY',
            font: 'Barlow Condensed',
            weight: 700,
            size: 50,
            color: '#e5e5e5',
            ls: 12,
            w: 1480,
            name: 'Podtitul'
          }, W / 2, H / 2 + 120);
          return {
            bg: mkBg({
              c1: '#0a0000',
              c2: '#3a0000',
              angle: 180,
              vig: 55
            }),
            objs: [l, r, ...z, t, s]
          };
        }
      });

      /* ---------- profilovky kanálu 800 x 800 (motiv uprostřed, YouTube ukáže kruh) ---------- */
      const mono = (txt, o) => ctxt(Object.assign({
        text: txt,
        w: 700,
        name: 'Monogram'
      }, o), 400, 400);
      const AVATARS = [{
          id: 'av-space',
          cat: 'Star Trek',
          name: 'Hvězdná',
          build() {
            const r = rnd(9),
              st = [];
            for (let i = 0; i < 45; i++) {
              const z = Math.round(2 + r() * 4);
              st.push(shp('ellipse', {
                w: z,
                h: z,
                x: Math.round(r() * 800),
                y: Math.round(r() * 800),
                fill: '#ffffff',
                opacity: Math.round((.3 + r() * .7) * 100) / 100,
                name: 'Hvězda'
              }));
            }
            const pl = ctr(shp('ellipse', {
              w: 520,
              h: 520,
              grad: true,
              fill: '#5ab0ff',
              fill2: '#06123f',
              angle: 135,
              shadow: glowOf('#3a8dff', 60),
              name: 'Planeta'
            }), 400, 400);
            const orb = ctr(shp('ellipse', {
              w: 700,
              h: 240,
              fillOn: false,
              stroke: {
                w: 4,
                color: '#9bd0ff'
              },
              opacity: .6,
              rot: -20,
              name: 'Dráha'
            }), 400, 400);
            return {
              bg: mkBg({
                c1: '#02030a',
                c2: '#0b1d4a',
                angle: 200,
                vig: 25
              }),
              objs: [...st, pl, orb, mono('K', {
                font: 'Bebas Neue',
                size: 340,
                color: '#ffffff',
                shadow: glowOf('#4aa3ff', 40)
              })]
            };
          }
        },
        {
          id: 'av-lcars',
          cat: 'Star Trek',
          name: 'LCARS',
          build() {
            const p = (y, w, c, x) => ctr(shp('round', {
              w,
              h: 64,
              radius: 32,
              fill: c,
              name: 'LCARS pruh'
            }), x || 400, y);
            return {
              bg: bgSolid('#000000'),
              objs: [p(170, 480, '#ff9c00'), p(250, 300, '#cc99ff', 330), p(630, 480, '#cc99ff'), p(550, 300, '#ff9966', 470), mono('K', {
                font: 'Barlow Condensed',
                weight: 700,
                size: 330,
                color: '#ff9c00'
              })]
            };
          }
        },
        {
          id: 'av-ds9',
          cat: 'Star Trek',
          name: 'Stanice',
          build() {
            const o = [ctr(shp('ellipse', {
                w: 660,
                h: 660,
                fillOn: false,
                stroke: {
                  w: 16,
                  color: '#ffb347'
                },
                shadow: glowOf('#ff9a3c', 30),
                name: 'Prstenec'
              }), 400, 400),
              ctr(shp('ellipse', {
                w: 480,
                h: 480,
                fillOn: false,
                stroke: {
                  w: 6,
                  color: '#cc9966'
                },
                name: 'Vnitřní prstenec'
              }), 400, 400)
            ];
            [0, 60, 120].forEach(a => o.push(ctr(shp('rect', {
              w: 660,
              h: 12,
              rot: a,
              fill: '#996633',
              name: 'Pylon'
            }), 400, 400)));
            return {
              bg: mkBg({
                c1: '#0b0907',
                c2: '#2a1a10',
                angle: 180,
                vig: 30
              }),
              objs: [...o, mono('K', {
                font: 'Barlow Condensed',
                weight: 700,
                size: 260,
                color: '#ffb347',
                shadow: {
                  on: true,
                  color: '#0b0907',
                  a: 1,
                  blur: 20,
                  x: 0,
                  y: 0
                }
              })]
            };
          }
        },
        {
          id: 'av-voy',
          cat: 'Star Trek',
          name: 'Dráhy',
          build() {
            const pl = ctr(shp('ellipse', {
              w: 440,
              h: 440,
              grad: true,
              fill: '#99ccff',
              fill2: '#3b1f6b',
              angle: 140,
              shadow: glowOf('#99ccff', 50),
              name: 'Planeta'
            }), 400, 400);
            const o1 = ctr(shp('ellipse', {
              w: 720,
              h: 260,
              fillOn: false,
              stroke: {
                w: 4,
                color: '#cc99ff'
              },
              rot: -18,
              name: 'Dráha 1'
            }), 400, 400);
            const o2 = ctr(shp('ellipse', {
              w: 720,
              h: 260,
              fillOn: false,
              stroke: {
                w: 3,
                color: '#99ccff'
              },
              opacity: .6,
              rot: 14,
              name: 'Dráha 2'
            }), 400, 400);
            return {
              bg: mkBg({
                c1: '#02040f',
                c2: '#0a1030',
                angle: 180,
                vig: 25
              }),
              objs: [pl, o1, o2, mono('K', {
                font: 'Barlow Condensed',
                weight: 700,
                size: 300,
                color: '#ffffff',
                shadow: {
                  on: true,
                  color: '#0a1030',
                  a: 1,
                  blur: 24,
                  x: 0,
                  y: 0
                }
              })]
            };
          }
        },
        {
          id: 'av-hand',
          cat: 'Star Trek',
          name: 'Pozdrav',
          build() {
            const ring = ctr(shp('ellipse', {
              w: 620,
              h: 620,
              fillOn: false,
              stroke: {
                w: 14,
                color: '#ffc83d'
              },
              shadow: glowOf('#ffc83d', 30),
              name: 'Zlatý kruh'
            }), 400, 400);
            return {
              bg: mkBg({
                c1: '#0b1d4a',
                c2: '#02030a',
                angle: 160,
                vig: 20
              }),
              objs: [ring, ctxt({
                text: '🖖',
                font: 'Montserrat',
                size: 380,
                w: 520,
                name: 'Pozdrav',
                shadow: SOFT
              }, 400, 400)]
            };
          }
        },
        {
          id: 'av-neon',
          cat: 'Profilovka',
          name: 'Neon',
          build() {
            const a = ctr(shp('ellipse', {
              w: 640,
              h: 640,
              fillOn: false,
              stroke: {
                w: 16,
                color: '#00e5ff'
              },
              shadow: glowOf('#00e5ff', 40),
              name: 'Prstenec modrý'
            }), 400, 400);
            const b = ctr(shp('ellipse', {
              w: 500,
              h: 500,
              fillOn: false,
              stroke: {
                w: 10,
                color: '#ff2bd6'
              },
              shadow: glowOf('#ff2bd6', 40),
              name: 'Prstenec růžový'
            }), 400, 400);
            return {
              bg: mkBg({
                c1: '#05010f',
                c2: '#2b0a5e',
                angle: 160,
                vig: 40
              }),
              objs: [a, b, mono('K', {
                font: 'Bebas Neue',
                size: 300,
                color: '#ffffff',
                shadow: glowOf('#ff2bd6', 40)
              })]
            };
          }
        },
        {
          id: 'av-gaming',
          cat: 'Profilovka',
          name: 'Gaming',
          build() {
            const bs = ctr(shp('burst', {
              w: 780,
              h: 780,
              grad: true,
              fill: '#39ff14',
              fill2: '#00c2ff',
              opacity: .4,
              blend: 'screen',
              rot: 8,
              name: 'Záře'
            }), 400, 400);
            return {
              bg: mkBg({
                c1: '#070a14',
                c2: '#2a0b4d',
                angle: 150,
                vig: 45
              }),
              objs: [bs, ctxt({
                text: '🎮',
                font: 'Montserrat',
                size: 360,
                w: 520,
                name: 'Ovladač',
                shadow: SOFT
              }, 400, 400)]
            };
          }
        },
        {
          id: 'av-minimal',
          cat: 'Profilovka',
          name: 'Minimal',
          build() {
            const ring = ctr(shp('ellipse', {
              w: 640,
              h: 640,
              fillOn: false,
              stroke: {
                w: 6,
                color: '#ffa24a'
              },
              name: 'Kruh'
            }), 400, 400);
            const dot = ctr(shp('ellipse', {
              w: 36,
              h: 36,
              fill: '#b7a4ff',
              name: 'Tečka'
            }), 400, 640);
            return {
              bg: bgSolid('#0e0e12'),
              objs: [ring, dot, mono('K', {
                font: 'Montserrat',
                weight: 800,
                size: 300,
                color: '#ffffff'
              })]
            };
          }
        },
        {
          id: 'av-duo',
          cat: 'Profilovka',
          name: 'Dvojice',
          build() {
            const l = shp('rect', {
                x: 0,
                y: 0,
                w: 400,
                h: 800,
                fill: '#ffa24a',
                name: 'Levá půlka'
              }),
              r = shp('rect', {
                x: 400,
                y: 0,
                w: 400,
                h: 800,
                fill: '#7c5cff',
                name: 'Pravá půlka'
              });
            return {
              bg: bgSolid('#0e0e12'),
              objs: [l, r, mono('&', {
                font: 'Anton',
                size: 430,
                color: '#ffffff',
                shadow: HARD
              })]
            };
          }
        },
        {
          id: 'av-brick',
          cat: 'Profilovka',
          name: 'Cihlová zeď',
          build() {
            const id = ensureBricks();
            return {
              bg: mkBg({
                type: 'image',
                asset: id,
                fit: 'cover',
                vig: 40,
                f: Object.assign(defFilters(), {
                  brightness: 85
                })
              }),
              objs: [mono('K', {
                font: 'Anton',
                size: 400,
                color: '#ffffff',
                stroke: {
                  w: 14,
                  color: '#111111'
                },
                shadow: HARD
              })]
            };
          }
        },
        {
          id: 'av-led',
          cat: 'Profilovka',
          name: 'LED světýlka',
          build() {
            const cols = ['#ff3b5c', '#ffd23f', '#39ff14', '#00e5ff', '#b45cff'];
            return {
              bg: mkBg({
                c1: '#070b1a',
                c2: '#101a3a',
                angle: 180,
                vig: 30
              }),
              objs: [...ledString(800, 150, 60, 9, cols, '1'), ...ledString(800, 560, 60, 9, cols.slice().reverse(), '2'), mono('K', {
                font: 'Bebas Neue',
                size: 330,
                color: '#ffffff',
                shadow: glowOf('#ffd27a', 40)
              })]
            };
          }
        },
        {
          id: 'av-sunset',
          cat: 'Profilovka',
          name: 'Západ slunce',
          build() {
            const sun = ctr(shp('ellipse', {
              w: 320,
              h: 320,
              grad: true,
              fill: '#ffd36b',
              fill2: '#ff6a3d',
              angle: 180,
              shadow: glowOf('#ff9a3c', 50),
              name: 'Slunce'
            }), 400, 380);
            const m1 = shp('tri', {
                w: 620,
                h: 320,
                x: -140,
                y: 480,
                fill: '#2a0f3f',
                name: 'Hora vlevo'
              }),
              m2 = shp('tri', {
                w: 700,
                h: 380,
                x: 300,
                y: 420,
                fill: '#3d1a58',
                name: 'Hora vpravo'
              });
            return {
              bg: mkBg({
                c1: '#3b1a5e',
                c2: '#ff9a3c',
                angle: 180
              }),
              objs: [sun, m1, m2, mono('K', {
                font: 'Montserrat',
                weight: 900,
                size: 280,
                color: '#ffffff',
                shadow: {
                  on: true,
                  color: '#3b1a5e',
                  a: .8,
                  blur: 24,
                  x: 0,
                  y: 8
                }
              })]
            };
          }
        },
        {
          id: 'av-synth',
          cat: 'Profilovka',
          name: 'Synthwave',
          build() {
            const sun = ctr(shp('ellipse', {
              w: 520,
              h: 520,
              grad: true,
              fill: '#ffe14a',
              fill2: '#ff2e97',
              angle: 180,
              shadow: glowOf('#ff2e97', 50),
              name: 'Slunce'
            }), 400, 380);
            const fl = shp('rect', {
              x: 0,
              y: 560,
              w: 800,
              h: 240,
              fill: '#12002b',
              name: 'Podlaha'
            });
            const ln = [0, 1, 2, 3].map(i => shp('rect', {
              x: 0,
              y: Math.round(566 + Math.pow(i / 3, 1.6) * 200),
              w: 800,
              h: 3 + i,
              fill: '#ff2e97',
              opacity: .85,
              name: 'Čára mřížky'
            }));
            return {
              bg: mkBg({
                c1: '#1a0033',
                c2: '#ff2e97',
                angle: 180
              }),
              objs: [sun, fl, ...ln, mono('K', {
                font: 'Bebas Neue',
                size: 320,
                color: '#ffffff',
                shadow: {
                  on: true,
                  color: '#2a0050',
                  a: 1,
                  blur: 30,
                  x: 0,
                  y: 0
                }
              })]
            };
          }
        },
        {
          id: 'av-light',
          cat: 'Profilovka',
          name: 'Světlá',
          build() {
            const c1 = ctr(shp('ellipse', {
                w: 380,
                h: 380,
                fill: '#ffa24a',
                name: 'Kruh oranžový'
              }), 230, 250),
              c2 = ctr(shp('ellipse', {
                w: 420,
                h: 420,
                fill: '#b7a4ff',
                name: 'Kruh fialový'
              }), 590, 560);
            return {
              bg: mkBg({
                c1: '#f6f4ff',
                c2: '#e3ecff',
                angle: 160
              }),
              objs: [c1, c2, mono('K', {
                font: 'Montserrat',
                weight: 900,
                size: 320,
                color: '#1b1b2a'
              })]
            };
          }
        },
        {
          id: 'av-elegant',
          cat: 'Profilovka',
          name: 'Elegantní zlatá',
          build() {
            const a = ctr(shp('ellipse', {
                w: 660,
                h: 660,
                fillOn: false,
                stroke: {
                  w: 8,
                  color: GOLD
                },
                name: 'Zlatý kruh'
              }), 400, 400),
              b = ctr(shp('ellipse', {
                w: 600,
                h: 600,
                fillOn: false,
                stroke: {
                  w: 3,
                  color: '#b8892e'
                },
                name: 'Vnitřní kruh'
              }), 400, 400);
            return {
              bg: mkBg({
                c1: '#0b0b0f',
                c2: '#1f1a10',
                angle: 160,
                vig: 35
              }),
              objs: [a, b, mono('K', {
                font: 'Playfair Display',
                weight: 900,
                size: 340,
                color: GOLD
              })]
            };
          }
        },
        {
          id: 'av-tech',
          cat: 'Profilovka',
          name: 'Kód',
          build() {
            const g = [];
            for (let i = 0; i <= 800; i += 100) {
              g.push(shp('rect', {
                x: i,
                y: 0,
                w: 2,
                h: 800,
                fill: '#1b3a5a',
                opacity: .55,
                name: 'Mřížka'
              }));
              g.push(shp('rect', {
                x: 0,
                y: i,
                w: 800,
                h: 2,
                fill: '#1b3a5a',
                opacity: .55,
                name: 'Mřížka'
              }));
            }
            const hx = ctr(shp('hex', {
              w: 580,
              h: 500,
              fillOn: false,
              stroke: {
                w: 8,
                color: '#39ff14'
              },
              shadow: glowOf('#39ff14', 26),
              name: 'Šestiúhelník'
            }), 400, 400);
            return {
              bg: bgSolid('#07121f'),
              objs: [...g, hx, mono('>_', {
                font: 'JetBrains Mono',
                weight: 600,
                size: 200,
                color: '#39ff14',
                shadow: glowOf('#39ff14', 30)
              })]
            };
          }
        },
        {
          id: 'av-sport',
          cat: 'Profilovka',
          name: 'Sport',
          build() {
            const st = ctr(shp('rect', {
              w: 1100,
              h: 210,
              rot: -35,
              fill: '#ffe600',
              name: 'Pruh'
            }), 400, 400);
            return {
              bg: bgSolid('#0b0b0b'),
              objs: [st, mono('K', {
                font: 'Anton',
                italic: true,
                size: 400,
                color: '#ffffff',
                stroke: {
                  w: 14,
                  color: '#111111'
                },
                shadow: HARD
              })]
            };
          }
        }
      ];
      AVATARS.forEach(t => {
        t.only = 'avatar';
      });
      NEW_TEMPLATES.push(...AVATARS);

      /* ---------- templates ---------- */
      const mkBg = o => Object.assign(defBg(), o);
      const TEMPLATES = [{
          id: 'fire',
          cat: 'YouTube',
          name: 'Šok / reakce',
          build(W, H) {
            const wide = W > H,
              m = Math.min(W, H);
            const glow = newShape('ellipse', {
              w: Math.round(m * 1.05),
              h: Math.round(m * 1.05),
              grad: true,
              fill: '#ffd23f',
              fill2: '#ff3d00',
              opacity: .4,
              blend: 'screen',
              name: 'Záře'
            });
            glow.x = Math.round((wide ? W * .72 : W * .5) - glow.w / 2);
            glow.y = Math.round((wide ? H * .55 : H * .64) - glow.h / 2);
            const title = newText({
              text: 'TOHLE JSEM\nNEČEKAL!',
              font: 'Anton',
              size: wide ? 190 : 132,
              color: '#ffffff',
              upper: true,
              align: wide ? 'left' : 'center',
              w: Math.round(W * .92),
              x: Math.round(W * .04),
              y: Math.round(H * (wide ? .07 : .1)),
              stroke: {
                w: 12,
                color: '#000000'
              },
              shadow: {
                on: true,
                color: '#000000',
                a: .7,
                blur: 20,
                x: 0,
                y: 10
              },
              name: 'Nadpis'
            });
            const tag = newText({
              text: 'ŠOKUJÍCÍ',
              font: 'Archivo Black',
              size: 54,
              color: '#111111',
              w: 380,
              rot: -4,
              x: Math.round(W * (wide ? .05 : .1)),
              y: Math.round(H * (wide ? .72 : .62)),
              box: {
                on: true,
                color: '#ffd23f',
                pad: 18,
                radius: 10
              },
              shadow: {
                on: true,
                color: '#000000',
                a: .5,
                blur: 16,
                x: 0,
                y: 8
              },
              name: 'Štítek'
            });
            const arrow = newShape('arrow', {
              w: Math.round(m * .55),
              h: Math.round(m * .28),
              fill: '#ff2d2d',
              stroke: {
                w: 7,
                color: '#ffffff'
              },
              rot: wide ? -8 : 10,
              x: Math.round(W * (wide ? .5 : .42)),
              y: Math.round(H * (wide ? .6 : .48)),
              shadow: {
                on: true,
                color: '#000000',
                a: .6,
                blur: 20,
                x: 0,
                y: 10
              },
              name: 'Šipka'
            });
            return {
              bg: mkBg({
                c1: '#1a0505',
                c2: '#ff5a1f',
                angle: 200,
                vig: 55
              }),
              objs: [glow, title, tag, arrow]
            };
          }
        },
        {
          id: 'neon',
          cat: 'Styl',
          name: 'Neon',
          build(W, H) {
            const wide = W > H,
              m = Math.min(W, H),
              r = Math.round(m * .78);
            const ring = newShape('ellipse', {
              w: r,
              h: r,
              fillOn: false,
              stroke: {
                w: 14,
                color: '#00e5ff'
              },
              shadow: {
                on: true,
                color: '#00e5ff',
                a: 1,
                blur: 40,
                x: 0,
                y: 0
              },
              name: 'Prstenec'
            });
            ring.x = Math.round(W / 2 - r / 2);
            ring.y = Math.round(H * (wide ? .5 : .42) - r / 2);
            const ring2 = JSON.parse(JSON.stringify(ring));
            ring2.id = nid();
            ring2.name = 'Prstenec 2';
            ring2.w = ring2.h = Math.round(r * .82);
            ring2.x = Math.round(W / 2 - ring2.w / 2);
            ring2.y = Math.round(H * (wide ? .5 : .42) - ring2.h / 2);
            ring2.stroke.color = '#ff2bd6';
            ring2.shadow.color = '#ff2bd6';
            const title = newText({
              text: 'NOČNÍ\nVÝPRAVA',
              font: 'Bebas Neue',
              size: wide ? 250 : 190,
              color: '#ffffff',
              ls: 6,
              w: Math.round(W * .9),
              x: Math.round(W * .05),
              y: Math.round(H * (wide ? .2 : .28)),
              shadow: {
                on: true,
                color: '#ff2bd6',
                a: 1,
                blur: 50,
                x: 0,
                y: 0
              },
              name: 'Nadpis'
            });
            const sub = newText({
              text: 'DÍL 12',
              font: 'Montserrat',
              weight: 800,
              size: 54,
              color: '#00e5ff',
              ls: 12,
              w: Math.round(W * .9),
              x: Math.round(W * .05),
              y: Math.round(H * (wide ? .8 : .76)),
              shadow: {
                on: true,
                color: '#00e5ff',
                a: 1,
                blur: 26,
                x: 0,
                y: 0
              },
              name: 'Podnadpis'
            });
            return {
              bg: mkBg({
                c1: '#05010f',
                c2: '#2b0a5e',
                angle: 160,
                vig: 45
              }),
              objs: [ring, ring2, title, sub]
            };
          }
        },
        {
          id: 'studio',
          cat: 'YouTube',
          name: 'Návod',
          build(W, H) {
            const wide = W > H;
            const bar = newShape('round', {
              w: 150,
              h: 16,
              radius: 8,
              grad: true,
              fill: '#b7a4ff',
              fill2: '#7db4ff',
              x: Math.round(W * .06),
              y: Math.round(H * (wide ? .26 : .2)),
              name: 'Proužek'
            });
            const title = newText({
              text: 'Jak postavit\nvlastní web',
              font: 'Montserrat',
              weight: 900,
              size: wide ? 104 : 92,
              color: '#ffffff',
              align: 'left',
              w: Math.round(W * .88),
              x: Math.round(W * .06),
              y: Math.round(H * (wide ? .32 : .26)),
              name: 'Nadpis'
            });
            const sub = newText({
              text: 'Návod krok za krokem',
              font: 'Montserrat',
              weight: 700,
              size: wide ? 44 : 40,
              color: '#ffa24a',
              align: 'left',
              w: Math.round(W * .88),
              x: Math.round(W * .06),
              y: Math.round(H * (wide ? .76 : .66)),
              name: 'Podnadpis'
            });
            const star = newShape('star', {
              w: Math.round(Math.min(W, H) * .34),
              h: Math.round(Math.min(W, H) * .34),
              grad: true,
              fill: '#ffd23f',
              fill2: '#ff7a1a',
              rot: 14,
              x: Math.round(W * (wide ? .72 : .6)),
              y: Math.round(H * (wide ? .08 : .72)),
              shadow: {
                on: true,
                color: '#000000',
                a: .5,
                blur: 24,
                x: 0,
                y: 10
              },
              name: 'Hvězda'
            });
            return {
              bg: mkBg({
                type: 'gradient',
                c1: '#0d1022',
                c2: '#1d2352',
                angle: 150,
                vig: 30
              }),
              objs: [bar, title, sub, star]
            };
          }
        },
        {
          id: 'clean',
          cat: 'Základ',
          name: 'Světlá',
          build(W, H) {
            const wide = W > H;
            const dot = newShape('ellipse', {
              w: Math.round(Math.min(W, H) * .5),
              h: Math.round(Math.min(W, H) * .5),
              fill: '#d9640a',
              x: Math.round(W * (wide ? .66 : .48)),
              y: Math.round(H * (wide ? .2 : .56)),
              name: 'Kruh'
            });
            const title = newText({
              text: 'Minimalismus\nv praxi',
              font: 'Playfair Display',
              weight: 900,
              size: wide ? 124 : 104,
              color: '#1b1b2a',
              align: 'left',
              w: Math.round(W * .88),
              x: Math.round(W * .06),
              y: Math.round(H * (wide ? .22 : .12)),
              name: 'Nadpis'
            });
            const line = newShape('rect', {
              w: Math.round(W * .3),
              h: 6,
              fill: '#1b1b2a',
              x: Math.round(W * .06),
              y: Math.round(H * (wide ? .7 : .4)),
              name: 'Linka'
            });
            const sub = newText({
              text: 'Pět pravidel, která fungují',
              font: 'Barlow Condensed',
              weight: 700,
              size: wide ? 52 : 46,
              color: '#5d5b72',
              upper: true,
              ls: 3,
              align: 'left',
              w: Math.round(W * .6),
              x: Math.round(W * .06),
              y: Math.round(H * (wide ? .75 : .44)),
              name: 'Podnadpis'
            });
            return {
              bg: mkBg({
                type: 'solid',
                c1: '#f3efe6'
              }),
              objs: [dot, title, line, sub]
            };
          }
        },
        ...NEW_TEMPLATES,
        ...BANNER_TEMPLATES
      ];

      function tplState(id, fmt) {
        const {
          W,
          H
        } = FORMATS[fmt], t = TEMPLATES.find(x => x.id === id), b = t.build(W, H);
        return {
          fmt,
          W,
          H,
          bg: b.bg,
          objs: b.objs
        };
      }
      const fontsFor = objs => Promise.all(objs.filter(o => o.type === 'text').map(o => document.fonts.load(fontStr(o), 'Aáčďéěíňóřšťúůýž').catch(() => {})));
      async function applyTemplate(id) {
        const st = tplState(id, S.fmt);
        S.bg = st.bg;
        S.objs = st.objs;
        selId = null;
        await fontsFor(S.objs);
        commit();
        renderPane();
        req();
        toast('Šablona použita');
      }

      function paintThumbs() {
        $$('#pane .tpl').forEach(el => {
          const c = $('canvas', el),
            st = tplState(el.dataset.tpl, S.fmt),
            keep = S,
            k = c.width / st.W;
          try {
            S = st;
            RS = k;
            const g = c.getContext('2d');
            g.setTransform(k, 0, 0, k, 0, 0);
            render(g, st.W, st.H);
          } finally {
            S = keep;
            RS = 1;
          }
        });
      }

      function drawThumbs() {
        paintThumbs();
        fontsFor($$('#pane .tpl').flatMap(el => tplState(el.dataset.tpl, S.fmt).objs)).then(() => {
          if (tab === 'tpl' && $('#pane .tpl')) paintThumbs();
        });
      }

      /* ---------- format switch ---------- */
      $$('[data-fmt]').forEach(b => b.addEventListener('click', () => {
        const f = b.dataset.fmt;
        if (f === S.fmt) return;
        const n = FORMATS[f],
          s = Math.min(n.W / S.W, n.H / S.H);
        for (const o of S.objs) {
          const cx = (o.x + o.w / 2) / S.W * n.W,
            cy = (o.y + o.h / 2) / S.H * n.H;
          o.w = Math.round(o.w * s);
          o.h = Math.round(o.h * s);
          if (o.type === 'text') {
            o.size = Math.max(8, Math.round(o.size * s));
            o.box.pad = Math.round(o.box.pad * s);
            o.stroke.w = Math.round(o.stroke.w * s);
          }
          if (o.type === 'shape') o.stroke.w = Math.round(o.stroke.w * s);
          if (o.shadow) {
            o.shadow.blur = Math.round(o.shadow.blur * s);
            o.shadow.x = Math.round(o.shadow.x * s);
            o.shadow.y = Math.round(o.shadow.y * s);
          }
          o.x = Math.round(cx - o.w / 2);
          o.y = Math.round(cy - o.h / 2);
        }
        S.fmt = f;
        S.W = n.W;
        S.H = n.H;
        view.zoom = 'fit';
        view.guides.banner = (f === 'banner');
        view.guides.avatar = (f === 'avatar');
        commit();
        layout();
        renderPane();
        toast(f === 'avatar' ? 'Profilovka: motiv drž uprostřed, YouTube ji ořízne do kruhu' : f === 'banner' ? 'Banner kanálu: text a logo drž v žluté bezpečné zóně' : 'Formát ' + f + ': rozložení je přepočítané, dolaď ho ručně');
      }));

      function syncChips() {
        $$('[data-guide]').forEach(b => {
          const only = b.dataset.only;
          b.hidden = !!only && only !== fmtCat();
          b.setAttribute('aria-pressed', String(!!view.guides[b.dataset.guide]));
        });
      }
      $$('[data-guide]').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.guide;
        view.guides[k] = !view.guides[k];
        b.setAttribute('aria-pressed', String(view.guides[k]));
        req();
      }));

      /* ---------- export ---------- */
      const exp = {
        fmt: 'jpg',
        scale: 1,
        q: .92,
        name: 'miniatura'
      };

      function paneExport() {
        const bn = S.fmt === 'banner',
          av = S.fmt === 'avatar',
          list = bn ? [1, .8] : av ? [1, .5] : [1, 1.5, 2];
        if (!list.includes(exp.scale)) exp.scale = 1;
        const sc = list.map(k => [k, `${k}× · ${Math.round(S.W*k)} × ${Math.round(S.H*k)} px`]);
        return sec('Obrázek', `<div class="f"><span class="lab"><span>Formát souboru</span></span><div class="opt">${[['png','PNG'],['jpg','JPG'],['webp','WEBP']].map(x=>`<button type="button" data-exp="fmt" data-v="${x[0]}">${x[1]}</button>`).join('')}</div></div>
  <label class="f"><span class="lab"><span>Velikost</span></span><select data-exp="scale">${sc.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select></label>
  ${exp.fmt!=='png'?`<label class="f"><span class="lab"><span>Kvalita</span><output id="qout"></output></span><input type="range" data-exp="q" min="50" max="100" step="1"></label>`:''}
  <label class="f"><span class="lab"><span>Název souboru</span></span><input type="text" data-exp="name" maxlength="60"></label>
  <div class="note" id="sizenote">Počítám velikost…</div>
  <div class="g2"><button type="button" class="btn pri" data-exp="save">Uložit obrázek</button><button type="button" class="btn" data-exp="copy">Kopírovat</button></div>`) +
          sec('Projekt', `<p class="hint">Rozdělaná práce se ukládá sama v tomto prohlížeči. Pro zálohu nebo přenos na jiné zařízení ulož projekt do souboru.</p>
  <div class="row"><button type="button" class="btn sm" data-exp="savePrj">Uložit projekt (.json)</button><button type="button" class="btn sm" data-exp="loadPrj">Načíst projekt</button></div>`) +
          sec(bn ? 'Tipy pro banner' : av ? 'Tipy pro profilovku' : 'Tipy pro YouTube', av ? `<p class="hint" style="margin:0">Profilovka se na YouTube zobrazuje v kruhu 98 × 98 px. Doporučuju nahrát 800 × 800 px, formát JPG nebo PNG (povoleno i GIF a BMP, nejvýš 15 MB). Rohy čtverce se oříznou, proto drž motiv uprostřed v žlutém kruhu. Zapni si pod plátnem „Kruhová maska“.</p>` : bn ? `<p class="hint" style="margin:0">Banner kanálu má mít 2560 × 1440 px (minimum 2048 × 1152) a nejvýš 6 MB. Na počítači je vidět jen pruh 2560 × 423 px uprostřed, na tabletu 1855 × 423 a na mobilu 1546 × 423. Logo a text proto drž v žluté bezpečné zóně. Zapni si pod plátnem „Zóny banneru“.</p>` : `<p class="hint" style="margin:0">Doporučená miniatura je 1280 × 720 px (16:9) do 2 MB. Pro menší soubor zvol JPG a kvalitu kolem 90 %. Zapni v liště pod plátnem „Rozhraní YouTube“, ať text nezapadne pod čas videa.</p>`);
      }

      function syncExport() {
        $$('#pane [data-exp="fmt"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === exp.fmt)));
        const s = $('#pane select[data-exp="scale"]');
        if (s) s.value = String(exp.scale);
        const q = $('#pane input[data-exp="q"]');
        if (q) {
          q.value = Math.round(exp.q * 100);
          $('#qout').textContent = Math.round(exp.q * 100) + ' %';
        }
        const n = $('#pane input[data-exp="name"]');
        if (n) n.value = exp.name;
      }

      function expInput(el) {
        const k = el.dataset.exp;
        if (k === 'scale') exp.scale = Number(el.value);
        else if (k === 'q') {
          exp.q = Number(el.value) / 100;
          $('#qout').textContent = el.value + ' %';
        } else if (k === 'name') exp.name = el.value;
        if (k !== 'name') updateSize();
      }

      function expClick(b) {
        const k = b.dataset.exp;
        if (k === 'fmt') {
          exp.fmt = b.dataset.v;
          renderPane();
        } else if (k === 'save') saveImage();
        else if (k === 'copy') copyImage();
        else if (k === 'savePrj') saveProject();
        else if (k === 'loadPrj') $('#filePrj').click();
      }
      async function buildBlob(fmt) {
        fmt = fmt || exp.fmt;
        await fontsFor(S.objs);
        const k = exp.scale,
          c = document.createElement('canvas');
        c.width = Math.round(S.W * k);
        c.height = Math.round(S.H * k);
        const g = c.getContext('2d');
        RS = k;
        g.scale(k, k);
        render(g, S.W, S.H);
        RS = 1;
        const mime = {
          png: 'image/png',
          jpg: 'image/jpeg',
          webp: 'image/webp'
        } [fmt];
        return new Promise(r => c.toBlob(b => r(b), mime, exp.q));
      }
      let sizeT = 0,
        sizeTok = 0;

      function updateSize() {
        clearTimeout(sizeT);
        sizeT = setTimeout(async () => {
          const tok = ++sizeTok,
            note = $('#sizenote');
          if (!note) return;
          note.className = 'note';
          note.textContent = 'Počítám velikost…';
          const blob = await buildBlob();
          if (tok !== sizeTok || !$('#sizenote')) return;
          if (!blob) {
            note.textContent = 'Velikost se nepodařilo spočítat.';
            return;
          }
          const kb = blob.size / 1024,
            txt = kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : Math.round(kb) + ' kB';
          const w = Math.round(S.W * exp.scale),
            h = Math.round(S.H * exp.scale);
          const bn = S.fmt === 'banner',
            av = S.fmt === 'avatar',
            mb = bn ? 6 : av ? 15 : 2,
            lim = mb * 1024 * 1024;
          if (blob.size > lim) {
            note.className = 'note warn';
            note.textContent = `${w} × ${h} px · ${txt}. Přes ${mb} MB, YouTube ${bn?'banner':av?'profilovku':'miniaturu'} odmítne. Zkus JPG, nižší kvalitu${bn?'':' nebo menší velikost'}.`;
          } else note.textContent = `${w} × ${h} px · ${txt}`;
        }, 350);
      }
      let dlP = null,
        dlWhy = '';
      const topLevel = () => {
        try {
          return window.top === window.self;
        } catch (e) {
          return false;
        }
      };

      function getDL() {
        if (!dlP) {
          const t = new Promise(r => setTimeout(() => r(null), 4000));
          let u;
          if (!(window.claude && window.claude.use)) {
            dlWhy = 'stránka běží mimo Claude, bez ukládacího rozhraní';
            u = Promise.resolve(null);
          } else u = Promise.resolve().then(() => window.claude.use('downloads')).catch(() => {
            dlWhy = 'ukládací rozhraní se nenačetlo';
            return null;
          });
          dlP = Promise.race([u, t]).then(v => {
            if (!v) {
              dlP = null;
              if (!dlWhy) dlWhy = topLevel() ? 'stránka je otevřená samostatně, ne uvnitř Claude' : 'ukládací rozhraní tu není povolené nebo dostupné';
            } else dlWhy = '';
            return v;
          });
        }
        return dlP;
      }
      /* skutečné stažení přes odkaz: funguje, když stránka běží samostatně (není v rámečku Claude) */
      function anchorDownload(fn, data) {
        const blob = data instanceof Blob ? data : new Blob([data], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob),
          a = document.createElement('a');
        a.href = url;
        a.download = fn;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 5000);
      }
      async function shareFile(fn, data) {
        try {
          const f = new File([data], fn, {
            type: data instanceof Blob ? data.type : 'application/json'
          });
          if (navigator.canShare && navigator.canShare({
              files: [f]
            })) {
            await navigator.share({
              files: [f],
              title: fn
            });
            return true;
          }
        } catch (e) {
          if (e && e.name === 'AbortError') return true;
        }
        return false;
      }
      async function saveFile(fn, data) {
        const dl = await getDL();
        if (dl) {
          try {
            const r = await dl.save({
              filename: fn,
              data
            });
            toast(r && r.status === 'saved' ? 'Uloženo: ' + fn : 'Soubor odeslán');
            return true;
          } catch (err) {
            const c = err && err.code;
            if (c === 'declined') {
              toast('Ukládání zrušeno');
              return false;
            }
            if (c === 'rate_limited') {
              toast('Okno uložení už je otevřené, chvilku počkej');
              return false;
            }
            if (c === 'too_large') {
              toast('Soubor je moc velký, zvol menší velikost nebo JPG');
              return false;
            }
            dlWhy = 'uložení selhalo' + (c ? ' (' + c + ')' : '');
          }
        }
        if (topLevel()) {
          anchorDownload(fn, data);
          toast('Stahuji ' + fn + ', najdeš ho ve stažených souborech');
          return true;
        }
        showFallback(fn, data, 'Přímé uložení tu není dostupné, zkus tlačítko Stáhnout.');
        return false;
      }
      async function copyImage() {
        try {
          if (!navigator.clipboard || !window.ClipboardItem) throw new Error('no clipboard');
          await navigator.clipboard.write([new ClipboardItem({
            'image/png': buildBlob('png')
          })]);
          toast('Obrázek je ve schránce, vlož ho Ctrl+V');
        } catch (e) {
          toast('Kopírování tu prohlížeč nepovolil, použij uložení');
        }
      }

      function showFallback(fn, data, why) {
        const m = $('#modal'),
          isBlob = typeof data !== 'string';
        let url = '';
        const body = isBlob ?
          (url = URL.createObjectURL(data), `<img src="${url}" alt="${esc(fn)}"><p class="mono">Kdyby tlačítko Stáhnout nic neudělalo: na počítači klikni na obrázek pravým tlačítkem, na telefonu na něj podrž prst.</p>`) :
          `<label class="f"><textarea id="fbtxt" rows="8" readonly></textarea></label><p class="mono">Kdyby tlačítko Stáhnout nic neudělalo, zkopíruj obsah a ulož ho do souboru ${esc(fn)}.</p>`;
        const canShare = !!navigator.share;
        m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><h2>Uložení souboru</h2><p>${esc(why||'')}</p>${body}
  <p class="mono">Příčina: ${esc(dlWhy||'neznámá')}. Nejspolehlivější je otevřít editor přímo v Claude (karta Artefakty), tam se soubor uloží jedním klepnutím.</p>
  <div class="row"><button type="button" class="btn pri" data-dl>Stáhnout</button>${canShare?'<button type="button" class="btn" data-share>Sdílet / uložit do telefonu</button>':''}<button type="button" class="btn" data-retry>Zkusit uložit přes Claude</button>${isBlob?'<button type="button" class="btn" data-copy>Kopírovat obrázek</button>':'<button type="button" class="btn" data-copytxt>Kopírovat text</button>'}<button type="button" class="btn" data-no>Zavřít</button></div></div>`;
        if (!isBlob) $('#fbtxt', m).value = data;
        m.hidden = false;
        const close = () => {
          m.hidden = true;
          m.innerHTML = '';
          if (url) URL.revokeObjectURL(url);
        };
        $('[data-no]', m).onclick = close;
        m.onclick = e => {
          if (e.target === m) close();
        };
        $('[data-dl]', m).onclick = () => {
          anchorDownload(fn, data);
          toast('Spouštím stažení: ' + fn);
        };
        const sh = $('[data-share]', m);
        if (sh) sh.onclick = async () => {
          if (!await shareFile(fn, data)) toast('Sdílení tu prohlížeč nepovolil');
        };
        $('[data-retry]', m).onclick = async () => {
          dlP = null;
          const ok = await saveFile(fn, data);
          if (ok) close();
        };
        const c1 = $('[data-copy]', m);
        if (c1) c1.onclick = copyImage;
        const c2 = $('[data-copytxt]', m);
        if (c2) c2.onclick = async () => {
          try {
            await navigator.clipboard.writeText(data);
            toast('Zkopírováno');
          } catch (e) {
            $('#fbtxt', m).select();
            toast('Označeno, zkopíruj ho Ctrl+C');
          }
        };
      }
      let saving = false;
      async function saveImage() {
        if (saving) return;
        saving = true;
        try {
          toast('Připravuji soubor…');
          const blob = await buildBlob();
          if (!blob) {
            toast('Export se nepodařil');
            return;
          }
          const nm = (exp.name || 'miniatura').replace(/[^\p{L}\p{N}\- _]+/gu, '').trim() || 'miniatura';
          const bn = S.fmt === 'banner',
            av = S.fmt === 'avatar',
            base = nm === 'miniatura' ? (bn ? 'banner-kanalu' : av ? 'profilovka-kanalu' : nm) : nm;
          await saveFile(`${base}${bn||av?'':'-'+S.fmt.replace(':','x')}.${exp.fmt}`, blob);
        } finally {
          saving = false;
        }
      }

      /* ---------- project: save, load, autosave ---------- */
      function usedAssets() {
        const ids = new Set(S.objs.filter(o => o.type === 'image').map(o => o.asset));
        if (S.bg.asset) ids.add(S.bg.asset);
        const out = {};
        ids.forEach(i => {
          if (assets[i]) out[i] = assets[i];
        });
        return out;
      }
      const projectJSON = () => JSON.stringify({
        v: 1,
        fmt: S.fmt,
        W: S.W,
        H: S.H,
        bg: S.bg,
        objs: S.objs,
        assets: usedAssets()
      });
      async function saveProject() {
        await saveFile('miniatura-projekt.json', projectJSON());
      }
      async function loadProject(d) {
        if (!d || !Array.isArray(d.objs) || !FORMATS[d.fmt] || !d.bg) throw new Error('bad');
        const as = d.assets || {},
          ids = Object.keys(as),
          next = new Map();
        await Promise.all(ids.map(async i => {
          next.set(i, await loadImg(as[i].url));
        }));
        assets = as;
        imgCache.clear();
        next.forEach((v, k) => imgCache.set(k, v));
        S = {
          fmt: d.fmt,
          W: FORMATS[d.fmt].W,
          H: FORMATS[d.fmt].H,
          bg: Object.assign(defBg(), d.bg),
          objs: d.objs
        };
        selId = null;
        hist = [];
        hi = -1;
        view.guides.banner = (S.fmt === 'banner');
        view.guides.avatar = (S.fmt === 'avatar');
        await fontsFor(S.objs);
        commit();
        view.zoom = 'fit';
        layout();
        renderPane();
      }
      $('#filePrj').onchange = async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
          await loadProject(JSON.parse(await f.text()));
          toast('Projekt načten');
        } catch (err) {
          toast('Soubor není platný projekt');
        }
      };
      $('#newp').onclick = async () => {
        if (!await ask('Nový projekt', 'Plátno se vyprázdní. Rozdělanou práci uložíš tlačítkem Export → Uložit projekt, nebo se vrátíš tlačítkem Zpět.', 'Začít znovu')) return;
        const st = tplState('blank-dark', S.fmt);
        S.bg = st.bg;
        S.objs = st.objs;
        selId = null;
        assets = {};
        imgCache.clear();
        hist = [];
        hi = -1;
        await fontsFor(S.objs);
        commit();
        tab = 'add';
        layout();
        renderPane();
      };
      const idb = {
        db: null,
        open() {
          return this.db || (this.db = new Promise((res, rej) => {
            const r = indexedDB.open('mustek-miniatur', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('kv');
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
          }));
        },
        async get(k) {
          const d = await this.open();
          return new Promise((res, rej) => {
            const q = d.transaction('kv').objectStore('kv').get(k);
            q.onsuccess = () => res(q.result);
            q.onerror = () => rej(q.error);
          });
        },
        async set(k, v) {
          const d = await this.open();
          return new Promise((res, rej) => {
            const t = d.transaction('kv', 'readwrite');
            t.objectStore('kv').put(v, k);
            t.oncomplete = () => res();
            t.onerror = () => rej(t.error);
          });
        }
      };
      let booted = false;

      function scheduleSave() {
        if (!booted) return;
        clearTimeout(saveT);
        saveT = setTimeout(() => {
          try {
            idb.set('cur', projectJSON()).catch(() => {});
          } catch (e) {}
        }, 900);
      }

      /* ---------- start ---------- */
      (async function init() {
        const st = tplState('fire', '16:9');
        S = st;
        layout();
        commit();
        renderPane();
        try {
          const saved = await Promise.race([idb.get('cur'), new Promise(r => setTimeout(() => r(null), 1500))]);
          if (saved) {
            await loadProject(JSON.parse(saved));
            toast('Obnoven poslední projekt');
          }
        } catch (e) {}
        booted = true;
        getDL();
        await Promise.all(FONTS.map(f => document.fonts.load(`400 40px "${f}"`, 'Aáčďéěíňóřšťúůýž').catch(() => {})));
        await fontsFor(S.objs);
        req();
        if (tab === 'add') drawThumbs();
        document.fonts.ready.then(req);
      })();
    })();
