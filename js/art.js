/* BreedingPro — hand-drawn SVG illustrations.
   Every picture is generated here with CSS-variable colours, so the whole app
   follows the light/dark theme and nothing depends on external images.
   Each function returns an SVG string. */

(function () {

  const R = seed => rng(seed);
  const f1 = v => (+v).toFixed(1);
  function wrap(vb, inner, extra) { return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" ${extra || ''}>${inner}</svg>`; }
  function txt(x, y, s, cls, size, anchor, extra) {
    const cl = /fill=/.test(extra || "") ? "art-font" : (cls || "art-mut");
    return `<text x="${f1(x)}" y="${f1(y)}" class="${cl}" font-size="${size || 8}" text-anchor="${anchor || 'start'}" ${extra || ''}>${s}</text>`;
  }
  const line = (x1, y1, x2, y2, stroke, w, extra) => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w || 1}" ${extra || ''}/>`;
  const circ = (cx, cy, r, fill, extra) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${fill}" ${extra || ''}/>`;
  const rect = (x, y, w, h, fill, extra) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fill}" ${extra || ''}/>`;
  const poly = pts => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ');
  const V = n => `var(--${n})`;
  const KERNELS = ['kernel-a', 'kernel-b', 'kernel-c', 'kernel-d', 'c8'];

  /* a maize ear: kernels in rows along a spindle, two husk leaves */
  function ear(cx, cy, w, h, colours, seed, opts) {
    opts = opts || {};
    const r = R(seed || 1);
    let s = '';
    if (!opts.noHusk) {
      s += `<path d="M${f1(cx)} ${f1(cy + h * 0.52)} C ${f1(cx - w * 1.1)} ${f1(cy + h * 0.1)}, ${f1(cx - w * 0.9)} ${f1(cy - h * 0.2)}, ${f1(cx - w * 0.28)} ${f1(cy - h * 0.36)} C ${f1(cx - w * 0.5)} ${f1(cy - h * 0.05)}, ${f1(cx - w * 0.45)} ${f1(cy + h * 0.3)}, ${f1(cx)} ${f1(cy + h * 0.52)}Z" fill="${V('leaf')}" opacity="0.85"/>`;
      s += `<path d="M${f1(cx)} ${f1(cy + h * 0.52)} C ${f1(cx + w * 1.15)} ${f1(cy + h * 0.15)}, ${f1(cx + w * 0.95)} ${f1(cy - h * 0.15)}, ${f1(cx + w * 0.34)} ${f1(cy - h * 0.3)} C ${f1(cx + w * 0.52)} ${f1(cy)}, ${f1(cx + w * 0.44)} ${f1(cy + h * 0.32)}, ${f1(cx)} ${f1(cy + h * 0.52)}Z" fill="${V('leaf')}" opacity="0.65"/>`;
    }
    const rows = opts.rows || 11, cols = 4;
    for (let i = 0; i < rows; i++) {
      const t = (i + 0.5) / rows;
      const prof = Math.pow(Math.sin(Math.PI * (0.1 + 0.8 * t)), 0.55) * (0.72 + 0.28 * t);
      const rw = w * prof, y = cy - h * 0.45 + t * h * 0.88, kh = h * 0.88 / rows;
      for (let j = 0; j < cols; j++) {
        const x = cx - rw / 2 + (j + 0.5) * rw / cols;
        const c = colours[Math.floor(r() * colours.length)];
        s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rw / cols / 2 * 0.92)}" ry="${f1(kh / 2 * 0.9)}" fill="${V(c)}" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>`;
      }
    }
    if (!opts.noSilk) s += `<path d="M${f1(cx)} ${f1(cy - h * 0.47)} q ${f1(-w * 0.2)} ${f1(-h * 0.12)} ${f1(-w * 0.05)} ${f1(-h * 0.2)} M${f1(cx)} ${f1(cy - h * 0.47)} q ${f1(w * 0.25)} ${f1(-h * 0.1)} ${f1(w * 0.1)} ${f1(-h * 0.19)}" stroke="${V('gold')}" stroke-width="1" fill="none" opacity="0.8"/>`;
    return s;
  }
  function bell(x0, x1, yBase, height, mu, sd, lo, hi) {
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const v = lo + t * (hi - lo), z = (v - mu) / sd;
      pts.push([x0 + t * (x1 - x0), yBase - height * Math.exp(-0.5 * z * z)]);
    }
    return pts;
  }

  /* ============================================================
     HERO — five parental ears cross into a half-diallel table;
     the table resolves into a Wr–Vr graph and a selection response.
     ============================================================ */
  function hero() {
    const W = 540, H = 450;
    let s = `<defs>
      <radialGradient id="bpHg" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="var(--primary)" stop-opacity="0.14"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></radialGradient>
      <marker id="bpAh" markerWidth="8" markerHeight="8" refX="6.5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 z" fill="var(--accent)"/></marker>
    </defs>`;
    const n = 5, tx = 70, ty = 168, cell = 44;
    const parentsX = i => tx + cell * (i + 0.5);
    const earCols = [['kernel-a', 'kernel-a', 'c7'], ['kernel-b', 'kernel-b', 'gold'], ['kernel-c', 'kernel-c', 'kernel-b'], ['kernel-d', 'kernel-d', 'c6'], ['c8', 'c5', 'c8']];
    /* pollen paths from each ear to its column */
    for (let i = 0; i < n; i++) {
      s += `<path d="M${f1(parentsX(i))} ${ty - 64} C ${f1(parentsX(i) + 10)} ${ty - 44}, ${f1(parentsX(i) - 8)} ${ty - 28}, ${f1(parentsX(i))} ${ty - 10}" stroke="var(--gold)" stroke-width="1.6" fill="none" stroke-dasharray="3 4" class="pollen" style="animation-delay:${(i * 0.45).toFixed(2)}s"/>`;
    }
    for (let i = 0; i < n; i++) {
      s += ear(parentsX(i), ty - 102, 22, 66, earCols[i], 11 + i * 7);
      s += txt(parentsX(i), ty - 20, 'P' + (i + 1), 'art-txt', 10, 'middle', 'font-weight="800"');
    }
    /* the half diallel: parents on the diagonal, F1 above it */
    const val = [[3.1, 6.4, 5.2, 7.9, 6.0], [0, 4.0, 6.8, 7.1, 5.5], [0, 0, 2.6, 6.1, 8.8], [0, 0, 0, 3.6, 6.6], [0, 0, 0, 0, 3.3]];
    s += `<rect x="${tx - 8}" y="${ty - 6}" width="${cell * n + 16}" height="${cell * n + 14}" rx="14" class="art-card" stroke-width="1"/>`;
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      const v = val[i][j], x = tx + cell * j + 3, y = ty + cell * i + 3;
      if (i === j) {
        s += `<rect x="${f1(x)}" y="${f1(y)}" width="${cell - 6}" height="${cell - 6}" rx="7" fill="var(--bg-soft)" stroke="var(--${earCols[i][0]})" stroke-width="3"/>`;
      } else {
        const t = (v - 5) / 4;
        const col = t > 0.5 ? 'primary' : t > 0.1 ? 'c7' : 'gold';
        s += `<rect x="${f1(x)}" y="${f1(y)}" width="${cell - 6}" height="${cell - 6}" rx="7" fill="var(--${col})" opacity="${(0.55 + 0.45 * Math.min(1, Math.max(0, t))).toFixed(2)}" class="cell-pop" style="animation-delay:${((i + j) * 0.35).toFixed(2)}s"/>`;
      }
      s += txt(x + cell / 2 - 3, y + cell / 2 + 1, v.toFixed(1), 'art-txt', 10, 'middle', i === j ? 'font-weight="700"' : (v < 5.5 ? 'fill="#1e1929"' : 'fill="var(--card-bg)"') + ' font-weight="700"');
    }
    /* best cross */
    const stx = tx + cell * 5 - 5, sty = ty + cell * 2 + 1;
    s += `<path transform="translate(${stx} ${sty})" d="M0 -9 L2.6 -3.2 L8.6 -2.8 L4 1.2 L5.4 7.4 L0 4.1 L-5.4 7.4 L-4 1.2 L-8.6 -2.8 L-2.6 -3.2Z" fill="var(--gold)" stroke="var(--card-bg)" stroke-width="1.4"/>`;
    s += txt(tx + cell * 2.5 - 8, ty + cell * n + 34, 'Ŷᵢⱼ = μ + ĝᵢ + ĝⱼ + ŝᵢⱼ', 'art-mut', 11.5, 'middle', 'font-style="italic" font-weight="600"');
    /* GCA bars under the table, left */
    const gca = [0.6, -0.4, 0.9, -0.8, -0.3];
    const gy = ty + cell * 3 + 26;
    s += `<g opacity="0.95">`;
    gca.forEach((g, i) => { const bx = tx + 6 + i * 16, by = gy + 40; s += rect(bx, g > 0 ? by - g * 34 : by, 11, Math.abs(g) * 34, `var(--${earCols[i][0]})`, 'rx="2" stroke="var(--border-strong)" stroke-width="0.8"'); });
    s += line(tx + 2, gy + 40, tx + 86, gy + 40, 'var(--border-strong)', 1.2);
    s += txt(tx + 2, gy - 2, T('ACG de los progenitores', 'GCA of the parents'), 'art-mut', 9, 'start', 'font-weight="700"');
    s += `</g>`;

    /* Wr–Vr card */
    const cx0 = 342, cy0 = 44, cw = 178, ch = 170;
    s += `<rect x="${cx0}" y="${cy0}" width="${cw}" height="${ch}" rx="14" class="art-card"/>`;
    s += txt(cx0 + 12, cy0 + 20, 'Wr – Vr', 'art-txt', 11, 'start', 'font-weight="800"');
    const ox = cx0 + 26, oy = cy0 + ch - 26, gw = cw - 42, gh = ch - 58;
    s += line(ox, oy, ox + gw, oy, 'var(--border-strong)', 1.2) + line(ox, oy, ox, oy - gh, 'var(--border-strong)', 1.2);
    const para = []; for (let t = 0; t <= 1.0001; t += 0.05) para.push([ox + t * gw, oy - Math.sqrt(t) * gh * 0.95]);
    s += `<path d="${poly(para)}" stroke="var(--leaf)" stroke-width="2.2" fill="none"/>`;
    s += `<path d="M${ox} ${oy - gh * 0.18} L${ox + gw} ${oy - gh * 0.9}" stroke="var(--accent)" stroke-width="2.2" fill="none"/>`;
    [[0.12, 0.25], [0.3, 0.39], [0.48, 0.5], [0.66, 0.62], [0.86, 0.74]].forEach((p, i) => { s += circ(ox + p[0] * gw, oy - p[1] * gh, 5.2, `var(--${earCols[i][0]})`, 'stroke="var(--card-bg)" stroke-width="1.5"'); });
    s += txt(ox + gw - 2, oy - gh * 0.97, 'Wr² = Vr·Vp', 'art-mut', 8.5, 'end');

    /* selection card */
    const sx0 = 342, sy0 = 232, sw = 178, sh = 176;
    s += `<rect x="${sx0}" y="${sy0}" width="${sw}" height="${sh}" rx="14" class="art-card"/>`;
    s += txt(sx0 + 12, sy0 + 20, 'R = h² S', 'art-txt', 11, 'start', 'font-weight="800"');
    const bx0 = sx0 + 12, bx1 = sx0 + sw - 12, base = sy0 + sh - 22;
    const b1 = bell(bx0, bx1, base, 92, 0, 1, -3.2, 4.2);
    const b2 = bell(bx0, bx1, base, 92, 1.1, 1, -3.2, 4.2);
    const cut = 1.0, tcut = (cut + 3.2) / 7.4;
    const tail = b1.filter((p, i) => i / (b1.length - 1) >= tcut);
    s += `<path d="${poly([[bx0 + tcut * (bx1 - bx0), base], ...tail, [bx1, base]])}Z" fill="var(--gold)" opacity="0.85"/>`;
    s += `<path d="${poly(b1)}" stroke="var(--primary)" stroke-width="2" fill="none"/>`;
    s += `<path d="${poly(b2)}" stroke="var(--leaf)" stroke-width="2" fill="none" stroke-dasharray="5 3"/>`;
    s += line(bx0, base, bx1, base, 'var(--border-strong)', 1.2);
    const xm = v => bx0 + (v + 3.2) / 7.4 * (bx1 - bx0);
    s += `<path d="M${f1(xm(0))} ${sy0 + 44} L${f1(xm(1.05))} ${sy0 + 44}" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#bpAh)"/>`;
    s += line(xm(0), sy0 + 38, xm(0), base, 'var(--primary)', 1, 'stroke-dasharray="2 2"');
    return wrap(`0 0 ${W} ${H}`, s);
  }

  /* ============================================================
     Diallel layouts (Griffing's four methods)
     ============================================================ */
  function diallelGrid(method, big) {
    const n = 5, c = big ? 22 : 17, x0 = big ? 36 : 44, y0 = big ? 24 : 10;
    let s = '';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const diag = i === j, upper = j > i, lower = j < i;
      const on = method === 1 || (method === 2 && !lower) || (method === 3 && !diag) || (method === 4 && upper);
      const fill = diag ? V('gold') : upper ? V('primary') : V('rose');
      s += `<rect x="${x0 + j * c + 1}" y="${y0 + i * c + 1}" width="${c - 2}" height="${c - 2}" rx="3" fill="${on ? fill : 'none'}" stroke="${on ? 'none' : 'var(--border-strong)'}" stroke-dasharray="${on ? '' : '2 2'}" opacity="${on ? (diag ? 0.95 : upper ? 0.82 : 0.7) : 0.6}"/>`;
    }
    if (big) {
      for (let i = 0; i < n; i++) {
        s += txt(x0 - 6, y0 + i * c + c / 2 + 3, 'P' + (i + 1), 'art-mut', 8, 'end', 'font-weight="700"');
        s += txt(x0 + i * c + c / 2, y0 - 6, 'P' + (i + 1), 'art-mut', 8, 'middle', 'font-weight="700"');
      }
    }
    return s;
  }
  const griffing = m => () => wrap('0 0 200 110', diallelGrid(m) + txt(192, 104, { 1: 'p²', 2: 'p(p+1)/2', 3: 'p(p−1)', 4: 'p(p−1)/2' }[m], 'art-mut', 9, 'end', 'font-weight="700"'));

  function wrvr() {
    let s = '';
    const ox = 34, oy = 96, gw = 140, gh = 80;
    s += line(ox, oy, ox + gw, oy, 'var(--border-strong)', 1.2) + line(ox, oy, ox, oy - gh, 'var(--border-strong)', 1.2);
    const para = []; for (let t = 0; t <= 1.0001; t += 0.05) para.push([ox + t * gw, oy - Math.sqrt(t) * gh * 0.95]);
    s += `<path d="${poly(para)}" stroke="var(--leaf)" stroke-width="2" fill="none"/>`;
    s += `<path d="M${ox} ${oy - 14} L${ox + gw} ${oy - gh * 0.92}" stroke="var(--accent)" stroke-width="2" fill="none"/>`;
    [[0.1, 0.22], [0.28, 0.36], [0.45, 0.49], [0.62, 0.62], [0.84, 0.78]].forEach((p, i) => s += circ(ox + p[0] * gw, oy - p[1] * gh, 4.2, V(KERNELS[i]), 'stroke="var(--card-bg)" stroke-width="1"'));
    s += txt(ox + gw, oy + 11, 'Vr', 'art-mut', 8, 'end') + txt(ox - 4, oy - gh + 4, 'Wr', 'art-mut', 8, 'end');
    return wrap('0 0 200 110', s);
  }
  function haymanAnova() {
    const parts = [['a', 0.34, 'primary'], ['b₁', 0.12, 'gold'], ['b₂', 0.09, 'c6'], ['b₃', 0.16, 'accent'], ['c', 0.08, 'leaf'], ['d', 0.05, 'rose'], ['E', 0.16, 'border-strong']];
    let s = '', x = 20;
    parts.forEach(p => { const w = p[1] * 160; s += rect(x, 40, w - 1.5, 30, V(p[2]), 'rx="3"'); s += txt(x + w / 2, 86, p[0], 'art-txt', 9, 'middle', 'font-weight="700"'); x += w; });
    s += txt(20, 30, 'SS total', 'art-mut', 9, 'start', 'font-weight="700"');
    return wrap('0 0 200 110', s);
  }
  function gardnerEberhart() {
    const bars = [['v', 0.62, 'primary'], ['h̄', 0.34, 'gold'], ['hⱼ', 0.18, 'accent'], ['sⱼⱼ′', 0.1, 'rose']];
    let s = line(24, 92, 184, 92, 'var(--border-strong)', 1.2);
    bars.forEach((b, i) => { const x = 34 + i * 38, h = b[1] * 90; s += rect(x, 92 - h, 26, h, V(b[2]), 'rx="3"'); s += txt(x + 13, 104, b[0], 'art-txt', 9, 'middle', 'font-weight="700"'); });
    return wrap('0 0 200 110', s);
  }
  function reciprocal() {
    let s = '';
    s += ear(46, 52, 16, 52, ['kernel-a'], 3, { noSilk: true }) + ear(154, 52, 16, 52, ['kernel-b'], 5, { noSilk: true });
    s += `<path d="M66 40 C 92 20, 108 20, 134 40" stroke="var(--primary)" stroke-width="2" fill="none" marker-end="url(#bpAr1)"/>`;
    s += `<path d="M134 66 C 108 86, 92 86, 66 66" stroke="var(--rose)" stroke-width="2" fill="none" marker-end="url(#bpAr2)"/>`;
    s += `<defs><marker id="bpAr1" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--primary)"/></marker><marker id="bpAr2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--rose)"/></marker></defs>`;
    s += txt(100, 16, '♀ i × ♂ j', 'art-txt', 9, 'middle', 'font-weight="700"') + txt(100, 102, '♀ j × ♂ i', 'art-txt', 9, 'middle', 'font-weight="700"');
    return wrap('0 0 200 110', s);
  }
  function partialDiallel() {
    const n = 9, cx = 100, cy = 55, rr = 40;
    let s = '';
    const pt = i => [cx + rr * Math.cos(2 * Math.PI * i / n - Math.PI / 2), cy + rr * Math.sin(2 * Math.PI * i / n - Math.PI / 2)];
    for (let i = 0; i < n; i++) for (const k of [2, 4]) { const a = pt(i), b = pt((i + k) % n); s += line(a[0], a[1], b[0], b[1], k === 2 ? 'var(--primary)' : 'var(--gold)', 1.3, 'opacity="0.75"'); }
    for (let i = 0; i < n; i++) { const a = pt(i); s += circ(a[0], a[1], 5.5, V(KERNELS[i % 5]), 'stroke="var(--card-bg)" stroke-width="1.2"'); }
    return wrap('0 0 200 110', s);
  }

  /* ============================================================
     Mating designs
     ============================================================ */
  const male = (x, y, sz, fill) => rect(x - sz, y - sz, sz * 2, sz * 2, fill, 'rx="1.5"');
  const female = (x, y, sz, fill, extra) => circ(x, y, sz, fill, extra);
  function nc1() {
    let s = '';
    [50, 150].forEach((mx, m) => {
      s += male(mx, 18, 7, V(m ? 'gold' : 'primary'));
      [-30, -10, 10, 30].forEach((dx, f) => {
        s += line(mx, 25, mx + dx, 52, 'var(--border-strong)', 1.1);
        s += female(mx + dx, 58, 6, V('rose'));
        for (let k = 0; k < 3; k++) s += circ(mx + dx - 5 + k * 5, 84, 2.2, V(m ? 'gold' : 'primary'), 'opacity="0.75"');
        s += line(mx + dx, 64, mx + dx, 79, 'var(--border-strong)', 0.8);
      });
    });
    return wrap('0 0 200 110', s);
  }
  function nc2() {
    let s = '';
    const x0 = 58, y0 = 30, c = 21;
    for (let i = 0; i < 4; i++) s += female(x0 - 18, y0 + i * c + c / 2, 6, V('rose'));
    for (let j = 0; j < 5; j++) s += male(x0 + j * c + c / 2, y0 - 14, 6, V('primary'));
    const r = R(9);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) s += rect(x0 + j * c + 1, y0 + i * c + 1, c - 2, c - 2, V(['gold', 'c7', 'primary', 'leaf'][Math.floor(r() * 4)]), `rx="3" opacity="${(0.45 + 0.5 * r()).toFixed(2)}"`);
    return wrap('0 0 200 120', s);
  }
  function nc3() {
    let s = '';
    s += ear(100, 30, 14, 40, ['kernel-a', 'kernel-b', 'kernel-c'], 21, { noSilk: true });
    s += txt(100, 60, 'F₂', 'art-txt', 9, 'middle', 'font-weight="800"');
    const tgt = [[36, 'kernel-a', 'P₁'], [100, 'kernel-b', 'F₁'], [164, 'kernel-c', 'P₂']];
    tgt.forEach(t => { s += `<path d="M100 64 Q ${t[0]} 70 ${t[0]} 82" stroke="var(--accent)" stroke-width="1.5" fill="none"/>`; s += circ(t[0], 90, 8, V(t[1]), 'stroke="var(--border-strong)"'); s += txt(t[0], 106, t[2], 'art-mut', 8.5, 'middle', 'font-weight="700"'); });
    return wrap('0 0 200 110', s);
  }
  function lineTester() {
    let s = '';
    const x0 = 64, y0 = 24, c = 17;
    for (let i = 0; i < 5; i++) s += rect(x0 - 26, y0 + i * c + 3, 16, c - 6, V('primary'), 'rx="3"');
    for (let j = 0; j < 3; j++) s += rect(x0 + j * (c + 12) + 5, y0 - 16, c + 2, 10, V('gold'), 'rx="3"');
    const r = R(4);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) s += rect(x0 + j * (c + 12) + 1, y0 + i * c + 1, c + 10, c - 2, V('c7'), `rx="3" opacity="${(0.35 + 0.6 * r()).toFixed(2)}"`);
    s += txt(x0 - 18, y0 + 5 * c + 10, 'L', 'art-mut', 9, 'middle', 'font-weight="700"') + txt(x0 + 118, y0 - 8, 'T', 'art-mut', 9, 'middle', 'font-weight="700"');
    return wrap('0 0 200 120', s);
  }
  function ttc() {
    let s = '';
    const bars = [['L₁', 0.55, 'kernel-a'], ['L₂', 0.72, 'kernel-b'], ['L₃', 0.63, 'c7']];
    for (let k = 0; k < 5; k++) {
      const x = 22 + k * 34;
      bars.forEach((b, j) => { const h = (b[1] + 0.25 * Math.sin(k * 1.7 + j)) * 60; s += rect(x + j * 9, 90 - h, 8, h, V(b[2]), 'rx="1.5"'); });
    }
    s += line(16, 90, 190, 90, 'var(--border-strong)', 1.2);
    s += txt(100, 104, 'L₁ + L₂ − 2L₃', 'art-mut', 9, 'middle', 'font-weight="700"');
    return wrap('0 0 200 110', s);
  }

  /* ============================================================
     Generations, heterosis, hybrids
     ============================================================ */
  function generations() {
    const gens = [['P₁', 2, 0.5, 'kernel-a'], ['P₂', 7, 0.5, 'kernel-c'], ['F₁', 5.8, 0.5, 'gold'], ['F₂', 4.9, 1.4, 'primary'], ['B₁', 3.9, 1.0, 'c7'], ['B₂', 6.4, 1.0, 'leaf']];
    let s = line(10, 92, 190, 92, 'var(--border-strong)', 1.2);
    gens.forEach(g => {
      const pts = bell(10, 190, 92, 64 * 0.5 / g[2], g[1], g[2], 0, 9);
      s += `<path d="${poly(pts)}" stroke="var(--${g[3]})" stroke-width="1.8" fill="var(--${g[3]})" fill-opacity="0.10"/>`;
      s += txt(10 + g[1] / 9 * 180, 92 - 64 * 0.5 / g[2] - 4, g[0], 'art-txt', 8, 'middle', 'font-weight="700"');
    });
    return wrap('0 0 200 110', s);
  }
  function generationMeans() {
    const pts = [['P₁', 2.2], ['B₁', 4.1], ['F₂', 4.8], ['F₁', 6.4], ['B₂', 6.0], ['P₂', 7.1]];
    let s = line(22, 94, 190, 94, 'var(--border-strong)', 1.2) + line(22, 94, 22, 12, 'var(--border-strong)', 1.2);
    s += `<path d="M30 ${94 - 2.0 * 10} C 80 ${94 - 5 * 10}, 120 ${94 - 6.6 * 10}, 182 ${94 - 7.0 * 10}" stroke="var(--leaf)" stroke-width="1.6" fill="none" stroke-dasharray="4 3"/>`;
    pts.forEach((p, i) => { const x = 36 + i * 29, y = 94 - p[1] * 10; s += line(x, y - 6, x, y + 6, 'var(--text-muted)', 1); s += circ(x, y, 4.2, V(i === 3 ? 'gold' : 'primary')); s += txt(x, 106, p[0], 'art-mut', 8, 'middle', 'font-weight="700"'); });
    return wrap('0 0 200 112', s);
  }
  function heterosis() {
    const bars = [['P₁', 3.6, 'kernel-a'], ['P₂', 5.0, 'kernel-c'], ['MP', 4.3, 'border-strong'], ['F₁', 7.4, 'gold'], ['F₂', 5.8, 'primary']];
    let s = line(18, 92, 190, 92, 'var(--border-strong)', 1.2);
    bars.forEach((b, i) => { const x = 28 + i * 33, h = b[1] * 10; s += rect(x, 92 - h, 22, h, V(b[2]), 'rx="3"'); s += txt(x + 11, 104, b[0], 'art-mut', 8, 'middle', 'font-weight="700"'); });
    s += `<path d="M${28 + 2 * 33 + 11} ${92 - 43} L ${28 + 3 * 33 + 11} ${92 - 74}" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="3 2" fill="none"/>`;
    s += txt(160, 14, '+72%', 'art-txt', 10, 'middle', 'font-weight="800" fill="var(--accent)"');
    return wrap('0 0 200 110', s);
  }
  function doubleCross() {
    let s = '';
    const e = (x, y, cols, sd) => ear(x, y, 11, 30, cols, sd, { noSilk: true, rows: 8 });
    s += e(22, 22, ['kernel-a'], 1) + e(62, 22, ['kernel-b'], 2) + e(138, 22, ['kernel-c'], 3) + e(178, 22, ['kernel-d'], 4);
    s += `<path d="M22 40 L42 58 L62 40 M138 40 L158 58 L178 40 M42 66 L100 86 L158 66" stroke="var(--border-strong)" stroke-width="1.4" fill="none"/>`;
    s += e(42, 62, ['kernel-a', 'kernel-b'], 5) + e(158, 62, ['kernel-c', 'kernel-d'], 6);
    s += ear(100, 94, 13, 30, ['kernel-a', 'kernel-b', 'kernel-c', 'kernel-d'], 7, { noSilk: true, rows: 8 });
    s += txt(100, 60, '(A×B)×(C×D)', 'art-mut', 8, 'middle', 'font-weight="700"');
    return wrap('0 0 200 112', s);
  }
  function heteroticGroups() {
    let s = '';
    const r = R(31);
    [[62, 52, 'primary', 'A'], [140, 58, 'gold', 'B']].forEach(g => {
      s += `<ellipse cx="${g[0]}" cy="${g[1]}" rx="40" ry="32" fill="var(--${g[2]})" fill-opacity="0.10" stroke="var(--${g[2]})" stroke-dasharray="4 3"/>`;
      for (let i = 0; i < 9; i++) s += circ(g[0] + (r() - 0.5) * 52, g[1] + (r() - 0.5) * 40, 3.6, V(g[2]));
      s += txt(g[0], g[1] - 36, g[3], 'art-txt', 10, 'middle', 'font-weight="800"');
    });
    s += `<path d="M86 52 Q 101 36 116 54" stroke="var(--accent)" stroke-width="2" fill="none"/>`;
    s += txt(101, 34, '×', 'art-txt', 12, 'middle', 'font-weight="800" fill="var(--accent)"');
    return wrap('0 0 200 110', s);
  }

  /* ============================================================
     Selection
     ============================================================ */
  function selection() {
    let s = '';
    const b1 = bell(14, 186, 92, 70, 0, 1, -3.2, 4.2), b2 = bell(14, 186, 92, 70, 1.0, 1, -3.2, 4.2);
    const tcut = (1.1 + 3.2) / 7.4;
    s += `<path d="${poly([[14 + tcut * 172, 92], ...b1.filter((p, i) => i / (b1.length - 1) >= tcut), [186, 92]])}Z" fill="var(--gold)" opacity="0.85"/>`;
    s += `<path d="${poly(b1)}" stroke="var(--primary)" stroke-width="2" fill="none"/><path d="${poly(b2)}" stroke="var(--leaf)" stroke-width="2" fill="none" stroke-dasharray="5 3"/>`;
    s += line(14, 92, 186, 92, 'var(--border-strong)', 1.2);
    s += txt(100, 106, 'R = i · h · σA', 'art-mut', 8.5, 'middle', 'font-weight="700"');
    return wrap('0 0 200 110', s);
  }
  function heritability() {
    const parts = [[0.46, 'primary', 'σ²G'], [0.18, 'gold', 'σ²GE'], [0.36, 'border-strong', 'σ²e']];
    let s = '', a0 = -Math.PI / 2;
    const cx = 64, cy = 55, ro = 40, ri = 22;
    parts.forEach(p => {
      const a1 = a0 + p[0] * 2 * Math.PI, large = p[0] > 0.5 ? 1 : 0;
      const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const [x1, y1] = P(ro, a0), [x2, y2] = P(ro, a1), [x3, y3] = P(ri, a1), [x4, y4] = P(ri, a0);
      s += `<path d="M${f1(x1)} ${f1(y1)} A${ro} ${ro} 0 ${large} 1 ${f1(x2)} ${f1(y2)} L${f1(x3)} ${f1(y3)} A${ri} ${ri} 0 ${large} 0 ${f1(x4)} ${f1(y4)}Z" fill="var(--${p[1]})"/>`;
      a0 = a1;
    });
    s += txt(64, 59, 'H²', 'art-txt', 11, 'middle', 'font-weight="800"');
    parts.forEach((p, i) => { s += rect(120, 30 + i * 20, 10, 10, V(p[1]), 'rx="2"') + txt(136, 39 + i * 20, p[2], 'art-txt', 9, 'start', 'font-weight="700"'); });
    return wrap('0 0 200 110', s);
  }
  function selIndex() {
    let s = line(22, 96, 188, 96, 'var(--border-strong)', 1.2) + line(22, 96, 22, 10, 'var(--border-strong)', 1.2);
    const r = R(12);
    for (let i = 0; i < 70; i++) {
      const z1 = randn(r), z2 = 0.55 * z1 + 0.83 * randn(r);
      const x = 100 + z1 * 24, y = 54 - z2 * 16, idx = 0.7 * z1 + 0.5 * z2;
      if (x < 26 || x > 186 || y < 12 || y > 94) continue;
      s += circ(x, y, 2.8, V(idx > 1.0 ? 'gold' : 'primary'), `opacity="${idx > 1.0 ? 1 : 0.45}"`);
    }
    s += `<path d="M126 12 L162 94" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="5 3"/>`;
    s += txt(186, 106, 'X₁', 'art-mut', 8, 'end') + txt(18, 16, 'X₂', 'art-mut', 8, 'end') + txt(170, 22, 'I = b′P', 'art-txt', 8.5, 'end', 'font-weight="700"');
    return wrap('0 0 200 110', s);
  }
  function pathAnalysis() {
    let s = `<defs><marker id="bpPa" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--text-muted)"/></marker></defs>`;
    const nodes = [[36, 22, 'X₁'], [36, 55, 'X₂'], [36, 88, 'X₃']];
    nodes.forEach(n => { s += `<path d="M52 ${n[1]} L140 55" stroke="var(--primary)" stroke-width="${n[1] === 55 ? 2.6 : 1.5}" fill="none" marker-end="url(#bpPa)"/>`; });
    s += `<path d="M26 28 Q 8 38 26 49 M26 61 Q 8 72 26 82" stroke="var(--gold)" stroke-width="1.4" fill="none"/>`;
    nodes.forEach(n => { s += `<rect x="${n[0] - 15}" y="${n[1] - 10}" width="30" height="20" rx="6" class="art-card"/>` + txt(n[0], n[1] + 4, n[2], 'art-txt', 9, 'middle', 'font-weight="700"'); });
    s += `<rect x="142" y="42" width="44" height="26" rx="8" fill="var(--primary)"/>` + txt(164, 59, 'Y', 'art-txt', 11, 'middle', 'font-weight="800" fill="var(--card-bg)"');
    return wrap('0 0 200 110', s);
  }

  /* ============================================================
     G×E and stability
     ============================================================ */
  function stability() {
    let s = line(22, 96, 188, 96, 'var(--border-strong)', 1.2) + line(22, 96, 22, 10, 'var(--border-strong)', 1.2);
    const G = [[0.6, 1.4, 'primary'], [0.9, 0.55, 'gold'], [1.0, 1.0, 'leaf'], [1.15, 0.8, 'rose']];
    G.forEach(g => { const y = x => 90 - (g[0] * 20 + g[1] * (x - 22) * 0.45); s += `<path d="M26 ${f1(y(26))} L184 ${f1(y(184))}" stroke="var(--${g[2]})" stroke-width="2" fill="none"/>`; });
    s += txt(186, 106, T('índice ambiental', 'environmental index'), 'art-mut', 8, 'end');
    return wrap('0 0 200 110', s);
  }
  function ammi() {
    let s = line(20, 55, 190, 55, 'var(--border-strong)', 1) + line(105, 8, 105, 102, 'var(--border-strong)', 1);
    const r = R(44);
    for (let i = 0; i < 9; i++) s += circ(30 + r() * 150, 14 + r() * 82, 3.6, V('primary'));
    for (let i = 0; i < 5; i++) { const x = 30 + r() * 150, y = 14 + r() * 82; s += `<path d="M${f1(x - 4)} ${f1(y + 4)} L${f1(x)} ${f1(y - 4)} L${f1(x + 4)} ${f1(y + 4)}Z" fill="var(--gold)"/>`; }
    s += txt(188, 66, T('media', 'mean'), 'art-mut', 8, 'end') + txt(110, 14, 'IPCA1', 'art-mut', 8, 'start');
    return wrap('0 0 200 110', s);
  }
  function gge() {
    let s = line(20, 55, 190, 55, 'var(--border-strong)', 1) + line(105, 8, 105, 102, 'var(--border-strong)', 1);
    const hull = [[40, 40], [92, 12], [168, 30], [176, 84], [110, 100], [46, 82]];
    s += `<path d="${poly(hull)}Z" fill="var(--primary)" fill-opacity="0.07" stroke="var(--primary)" stroke-width="1.5"/>`;
    const origin = [105, 55];
    [[66, 26], [130, 21], [172, 57], [143, 92], [78, 91], [43, 61]].forEach(p => { const dx = p[0] - origin[0], dy = p[1] - origin[1], k = 1.6; s += line(origin[0], origin[1], origin[0] + dx * k, origin[1] + dy * k, 'var(--text-muted)', 0.9, 'stroke-dasharray="3 3"'); });
    hull.forEach(p => s += circ(p[0], p[1], 3.8, V('primary')));
    [[150, 44], [70, 62], [128, 78]].forEach(p => s += `<path d="M${p[0] - 4} ${p[1] + 4} L${p[0]} ${p[1] - 4} L${p[0] + 4} ${p[1] + 4}Z" fill="var(--gold)"/>`);
    return wrap('0 0 200 110', s);
  }
  function reactionNorms() {
    let s = '';
    const envs = [30, 80, 130, 175];
    envs.forEach(x => s += line(x, 14, x, 94, 'var(--border)', 1));
    [[70, 58, 44, 30, 'primary'], [52, 55, 58, 62, 'gold'], [80, 62, 60, 52, 'leaf'], [88, 70, 40, 22, 'rose']].forEach(g => {
      s += `<path d="${poly(envs.map((x, i) => [x, g[i]]))}" stroke="var(--${g[4]})" stroke-width="2" fill="none"/>`;
      envs.forEach((x, i) => s += circ(x, g[i], 2.8, V(g[4])));
    });
    ['E₁', 'E₂', 'E₃', 'E₄'].forEach((e, i) => s += txt(envs[i], 106, e, 'art-mut', 8, 'middle', 'font-weight="700"'));
    return wrap('0 0 200 110', s);
  }

  /* ============================================================
     Mixed models, animals, genomics
     ============================================================ */
  function pedigree() {
    let s = '';
    const E = (x1, y1, x2, y2) => line(x1, y1, x2, y2, 'var(--border-strong)', 1.2);
    s += E(50, 20, 72, 20) + E(128, 20, 150, 20) + E(61, 20, 61, 42) + E(139, 20, 139, 42) + E(61, 42, 88, 42) + E(112, 42, 139, 42);
    s += E(88, 42, 88, 60) + E(112, 42, 112, 60) + E(88, 66, 112, 66) + E(100, 66, 100, 84);
    s += male(44, 20, 7, V('primary')) + female(78, 20, 7, V('rose')) + male(122, 20, 7, V('primary')) + female(156, 20, 7, V('rose'));
    s += male(88, 66, 7, V('primary')) + female(112, 66, 7, V('rose'));
    s += female(100, 92, 8, V('gold'), 'stroke="var(--text)" stroke-width="1.4"');
    [[44, 0.7], [78, 0.4], [122, 0.9], [156, 0.55]].forEach(b => s += rect(b[0] - 7, 4, 14 * b[1], 3, V('leaf'), 'rx="1"'));
    return wrap('0 0 200 106', s);
  }
  function blup() {
    let s = line(40, 14, 40, 96, 'var(--border-strong)', 1.2) + line(160, 14, 160, 96, 'var(--border-strong)', 1.2);
    s += txt(40, 106, 'BLUE', 'art-mut', 8, 'middle', 'font-weight="700"') + txt(160, 106, 'BLUP', 'art-mut', 8, 'middle', 'font-weight="700"');
    s += line(34, 55, 166, 55, 'var(--text-muted)', 0.8, 'stroke-dasharray="3 3"');
    [[18, 36], [30, 44], [48, 52], [64, 60], [80, 66], [92, 72]].forEach((p, i) => {
      s += line(40, p[0], 160, p[1], V(['primary', 'c7', 'gold', 'leaf', 'rose', 'c5'][i]), 1.6);
      s += circ(40, p[0], 3.4, V(['primary', 'c7', 'gold', 'leaf', 'rose', 'c5'][i])) + circ(160, p[1], 3.4, V(['primary', 'c7', 'gold', 'leaf', 'rose', 'c5'][i]));
    });
    return wrap('0 0 200 110', s);
  }
  function cow(x, y, sc, fill) {
    return `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-30 -8 C -30 -18 -20 -20 -8 -20 L 16 -20 C 22 -20 24 -24 28 -26 L 34 -26 L 38 -20 L 42 -14 C 44 -10 40 -8 36 -9 L 30 -10 C 28 -4 26 0 24 2 L 24 18 L 19 18 L 18 5 L -18 5 L -19 18 L -24 18 L -24 2 C -28 0 -30 -4 -30 -8Z" fill="${fill}"/><path d="M-30 -8 C -36 -4 -36 4 -33 10" stroke="${fill}" stroke-width="2" fill="none"/><circle cx="-12" cy="-10" r="4" fill="var(--card-bg)" opacity=".5"/><circle cx="8" cy="-4" r="5" fill="var(--card-bg)" opacity=".4"/></g>`;
  }
  function crossbreeding() {
    let s = cow(40, 36, 0.85, V('c9')) + cow(160, 36, 0.85, V('primary'));
    s += `<path d="M68 40 Q 100 56 132 40" stroke="var(--accent)" stroke-width="1.6" fill="none"/>` + txt(100, 44, '×', 'art-txt', 12, 'middle', 'font-weight="800" fill="var(--accent)"');
    s += cow(100, 82, 0.8, V('gold'));
    s += txt(12, 104, 'gᴬ · gᴹ · hᴵ · hᴹ · r', 'art-mut', 8.5, 'start', 'font-weight="700"');
    return wrap('0 0 200 110', s);
  }
  function genomicMatrix() {
    let s = '';
    const n = 10, c = 8.6, x0 = 16, y0 = 10, r = R(55);
    const base = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { const v = i === j ? 1 : Math.max(0, (Math.abs(i - j) < 3 ? 0.55 : 0.1) + (r() - 0.5) * 0.3); base[i][j] = base[j][i] = v; }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += rect(x0 + j * c, y0 + i * c, c - 0.8, c - 0.8, V(base[i][j] > 0.75 ? 'primary' : base[i][j] > 0.35 ? 'c7' : 'gold'), `opacity="${(0.25 + 0.75 * base[i][j]).toFixed(2)}"`);
    s += txt(x0 + n * c / 2, y0 + n * c + 12, 'G', 'art-txt', 10, 'middle', 'font-weight="800"');
    /* SNP strip */
    for (let i = 0; i < 6; i++) for (let k = 0; k < 14; k++) { const g = Math.floor(r() * 3); s += rect(122 + k * 5, 16 + i * 12, 4.2, 9, V(['kernel-c', 'gold', 'primary'][g])); }
    s += txt(157, 100, '0 · 1 · 2', 'art-mut', 8, 'middle', 'font-weight="700"');
    return wrap('0 0 200 110', s);
  }
  function hybridPrediction() {
    let s = '';
    const n = 7, c = 12.5, x0 = 40, y0 = 12, r = R(71);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const tested = r() < 0.3, v = 0.3 + 0.7 * r();
      s += rect(x0 + j * c, y0 + i * c, c - 1.2, c - 1.2, V(tested ? 'primary' : 'gold'), `opacity="${(tested ? 0.95 : 0.25 + 0.6 * v).toFixed(2)}" rx="2"`);
      if (tested) s += circ(x0 + j * c + c / 2 - 0.6, y0 + i * c + c / 2 - 0.6, 1.6, 'var(--card-bg)');
    }
    s += txt(x0 + n * c + 8, 34, T('● probadas', '● tested'), 'art-mut', 8, 'start') + txt(x0 + n * c + 8, 48, T('predichas', 'predicted'), 'art-mut', 8, 'start');
    return wrap('0 0 200 110', s);
  }

  /* ============================================================
     Planning, data, report
     ============================================================ */
  function fieldPlan() {
    let s = '';
    const r = R(3), cols = ['primary', 'gold', 'leaf', 'rose', 'c7', 'c5', 'c8'];
    for (let b = 0; b < 3; b++) {
      s += rect(12, 12 + b * 30, 176, 26, 'var(--bg-soft)', 'rx="4" stroke="var(--border)"');
      const order = shuffle([0, 1, 2, 3, 4, 5, 6], r);
      order.forEach((k, i) => s += rect(16 + i * 24.6, 15 + b * 30, 22, 20, V(cols[k]), 'rx="3" opacity="0.85"'));
      s += txt(8, 27 + b * 30, 'B' + (b + 1), 'art-mut', 7.5, 'end', 'font-weight="700"');
    }
    return wrap('0 0 200 110', s);
  }
  function dataSheet() {
    let s = rect(20, 10, 160, 90, 'var(--card-bg)', 'rx="8" stroke="var(--border-strong)" stroke-width="1.4"');
    s += rect(20, 10, 160, 16, 'var(--primary)', 'rx="6" opacity="0.9"');
    ['♀', '♂', 'Rep', 'Y'].forEach((h, i) => s += txt(40 + i * 40, 22, h, '', 9, 'middle', 'fill="var(--card-bg)" font-weight="800"'));
    for (let i = 0; i < 4; i++) { s += line(20, 44 + i * 18, 180, 44 + i * 18, 'var(--border)', 1); }
    [60, 100, 140].forEach(x => s += line(x, 26, x, 100, 'var(--border)', 1));
    const rows = [['P1', 'P2', '1', '6.4'], ['P1', 'P3', '1', '5.2'], ['P2', 'P3', '1', '6.8'], ['P1', 'P2', '2', '6.1']];
    rows.forEach((rw, i) => rw.forEach((v, j) => s += txt(40 + j * 40, 39 + i * 18, v, 'art-txt', 8.5, 'middle')));
    s += circ(170, 92, 11, 'var(--leaf)') + `<path d="M164.5 92.5 l3.6 3.6 7-7.4" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    return wrap('0 0 200 110', s);
  }
  function report() {
    let s = rect(52, 6, 96, 100, 'var(--card-bg)', 'rx="6" stroke="var(--border-strong)" stroke-width="1.4"');
    s += rect(62, 16, 50, 6, 'var(--primary)', 'rx="2"');
    for (let i = 0; i < 3; i++) s += rect(62, 28 + i * 7, 76, 3, 'var(--border-strong)', 'rx="1"');
    const bars = [0.4, 0.7, 0.55, 0.9, 0.65];
    bars.forEach((b, i) => s += rect(66 + i * 14, 88 - b * 32, 10, b * 32, V(['primary', 'gold', 'leaf', 'rose', 'c7'][i]), 'rx="2"'));
    s += line(62, 88, 138, 88, 'var(--border-strong)', 1);
    s += rect(142, 70, 40, 26, 'var(--gold)', 'rx="5"') + txt(162, 87, 'ZIP', '', 9, 'middle', 'fill="#1e1929" font-weight="800"');
    return wrap('0 0 200 110', s);
  }

  /* ============================================================
     Material strip
     ============================================================ */
  function matInbred() {
    return wrap('0 0 200 70', ear(40, 36, 18, 52, ['kernel-a'], 1) + ear(82, 36, 18, 52, ['kernel-b'], 2) + txt(112, 42, '→', 'art-mut', 16, 'middle') + ear(146, 36, 22, 58, ['kernel-a', 'kernel-b'], 3));
  }
  function matPopulation() {
    let s = '';
    const r = R(5);
    for (let i = 0; i < 9; i++) {
      const x = 16 + i * 21, h = 34 + r() * 18;
      s += `<path d="M${x} 66 C ${x - 2} ${66 - h / 2}, ${x + 2} ${66 - h * 0.8}, ${x} ${66 - h}" stroke="var(--leaf)" stroke-width="2" fill="none"/>`;
      s += `<path d="M${x} ${66 - h * 0.45} q -9 -4 -12 -12 q 8 2 12 8" fill="var(--leaf)" opacity="0.8"/><path d="M${x} ${66 - h * 0.62} q 9 -4 12 -12 q -8 2 -12 8" fill="var(--leaf)" opacity="0.65"/>`;
      s += `<path d="M${x} ${66 - h} l -3 -8 M${x} ${66 - h} l 3 -8 M${x} ${66 - h} l 0 -9" stroke="var(--gold)" stroke-width="1.4"/>`;
    }
    return wrap('0 0 200 70', s);
  }
  function matSelfer() {
    let s = '';
    [50, 100, 150].forEach((x, k) => {
      s += line(x, 66, x, 34, 'var(--leaf)', 1.8);
      for (let i = 0; i < 7; i++) { const y = 32 - i * 4; s += `<ellipse cx="${x - 4}" cy="${y}" rx="3.2" ry="2.2" fill="var(--gold)" transform="rotate(-30 ${x - 4} ${y})"/><ellipse cx="${x + 4}" cy="${y}" rx="3.2" ry="2.2" fill="var(--gold)" transform="rotate(30 ${x + 4} ${y})"/>`; }
      s += line(x, 6, x, 1, 'var(--c9)', 1);
      void k;
    });
    return wrap('0 0 200 70', s);
  }
  function matClonal() {
    let s = `<path d="M40 64 L40 40" stroke="var(--c9)" stroke-width="5"/><circle cx="40" cy="28" r="20" fill="var(--leaf)" opacity="0.85"/><circle cx="30" cy="26" r="3" fill="var(--rose)"/><circle cx="48" cy="20" r="3" fill="var(--rose)"/><circle cx="44" cy="34" r="3" fill="var(--rose)"/>`;
    s += `<ellipse cx="120" cy="50" rx="16" ry="11" fill="var(--c9)"/><ellipse cx="148" cy="54" rx="12" ry="9" fill="var(--c9)" opacity="0.85"/><ellipse cx="170" cy="48" rx="10" ry="8" fill="var(--c9)" opacity="0.7"/><path d="M134 40 C 134 28, 150 22, 150 12" stroke="var(--leaf)" stroke-width="2" fill="none"/><path d="M150 16 q 10 -6 16 0 q -8 4 -16 0" fill="var(--leaf)"/>`;
    return wrap('0 0 200 70', s);
  }
  function matAnimals() { return wrap('0 0 200 70', cow(52, 40, 0.8, V('c9')) + cow(142, 40, 0.8, V('primary'))); }
  function matMarkers() {
    let s = '';
    const r = R(9);
    for (let i = 0; i < 5; i++) for (let k = 0; k < 30; k++) { const g = Math.floor(r() * 3); s += rect(14 + k * 5.8, 10 + i * 10.5, 5, 8.5, V(['kernel-c', 'gold', 'primary'][g]), 'rx="1"'); }
    return wrap('0 0 200 70', s);
  }

  /* ============================================================
     Theory figures (larger, with labels)
     ============================================================ */
  function theoryMethods() {
    let s = '';
    [[1, 0, T('Método 1', 'Method 1')], [2, 1, T('Método 2', 'Method 2')], [3, 2, T('Método 3', 'Method 3')], [4, 3, T('Método 4', 'Method 4')]].forEach(m => {
      const gx = 12 + (m[1] % 2) * 150, gy = 12 + Math.floor(m[1] / 2) * 150;
      s += `<g transform="translate(${gx} ${gy})">${diallelGrid(m[0], true)}</g>`;
      s += txt(gx + 91, gy + 146, m[2], 'art-txt', 10.5, 'middle', 'font-weight="800"');
    });
    s += rect(24, 312, 10, 10, V('gold'), 'rx="2"') + txt(38, 321, T('progenitores', 'parents'), 'art-mut', 9);
    s += rect(114, 312, 10, 10, V('primary'), 'rx="2"') + txt(128, 321, 'F₁', 'art-mut', 9);
    s += rect(164, 312, 10, 10, V('rose'), 'rx="2"') + txt(178, 321, T('recíprocas', 'reciprocals'), 'art-mut', 9);
    return wrap('0 0 310 332', s);
  }
  function theoryWrVr() {
    let s = '';
    const ox = 40, oy = 214, gw = 250, gh = 196;
    s += line(ox, oy, ox + gw, oy, 'var(--border-strong)', 1.3) + line(ox, oy + 30, ox, oy - gh, 'var(--border-strong)', 1.3);
    const para = []; for (let t = 0; t <= 1.0001; t += 0.02) para.push([ox + t * gw, oy - Math.sqrt(t) * gh * 0.92]);
    s += `<path d="${poly(para)}" stroke="var(--leaf)" stroke-width="2.4" fill="none"/>`;
    /* unit-slope lines that cut the Wr axis above, at and below the origin; each stops short of the
       right edge so its label can sit at its end without crossing any line */
    const stop = gw - 82, slope = 0.62 * gh / gw;
    const L = (a, col, lab, dash) => {
      s += `<path d="M${ox} ${oy - a} L${ox + stop} ${f1(oy - a - slope * stop)}" stroke="${col}" stroke-width="2.2" fill="none" ${dash ? 'stroke-dasharray="5 4"' : ''}/>`;
      s += circ(ox, oy - a, 3.2, col);
      s += txt(ox + stop + 5, oy - a - slope * stop + 3, lab, 'art-txt', 9.5, 'start', `font-weight="700" fill="${col}"`);
    };
    L(52, 'var(--primary)', T('parcial', 'partial'));
    L(0, 'var(--accent)', T('completa', 'complete'));
    L(-22, 'var(--rose)', T('sobredominancia', 'overdominance'), true);
    s += txt(ox + gw, oy + 13, 'Vr', 'art-txt', 11, 'end', 'font-weight="700"') + txt(ox - 6, oy - gh + 6, 'Wr', 'art-txt', 11, 'end', 'font-weight="700"');
    s += txt(ox + 8, oy + 38, T('← más alelos dominantes', '← more dominant alleles'), 'art-mut', 9);
    s += txt(ox + gw, oy + 38, T('más recesivos →', 'more recessive →'), 'art-mut', 9, 'end');
    s += txt(ox + gw - 4, oy - gh * 0.92 - 6, 'Wr² = Vr·Vp', 'art-mut', 9.5, 'end', 'font-style="italic"');
    return wrap('0 0 310 258', s);
  }

  window.Art = {
    hero, griffing1: griffing(1), griffing2: griffing(2), griffing3: griffing(3), griffing4: griffing(4),
    wrvr, haymanAnova, gardnerEberhart, reciprocal, partialDiallel,
    nc1, nc2, nc3, lineTester, ttc, generations, generationMeans, heterosis, doubleCross, heteroticGroups,
    selection, heritability, selIndex, pathAnalysis, stability, ammi, gge, reactionNorms,
    pedigree, blup, crossbreeding, genomicMatrix, hybridPrediction, fieldPlan, dataSheet, report,
    matInbred, matPopulation, matSelfer, matClonal, matAnimals, matMarkers, theoryMethods, theoryWrVr, ear, cow,
  };
})();
