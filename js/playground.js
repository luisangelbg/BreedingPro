/* BreedingPro — Block 1: the two interactive laboratories of the home page.

   DIALLEL LAB. A set of homozygous parents is drawn at random for k loci
   (Hayman's additive–dominance model: AA = +a, aa = −a, Aa = d at every
   locus, genes independent), every cross of the half diallel is "grown" in
   replicated plots with normal plot error, and the table of means is then
   analysed exactly as real data are: Hayman–Jinks array statistics (Vr, Wr),
   the Wr–Vr regression with its limiting parabola, the genetic components
   D, H1, H2, F, h², and Griffing's Method 2 (fixed model) general combining
   ability. Optional dominance × dominance epistasis between pairs of loci shows
   what happens when the model's assumptions fail.

   SELECTION LAB. An individual-based population (diploid, free recombination,
   no mutation) under recurrent truncation selection. Each cycle the breeder's
   equation R = c·h²·S is evaluated with the additive variance of that
   generation, and set against the response actually obtained, so that the
   loss of genetic variance (Bulmer effect, fixation) and the price of losing
   pollen control (c = ½) are visible. */

(function () {

  /* ================================================================
     small numerical helpers
     ================================================================ */
  const mean = v => v.reduce((s, x) => s + x, 0) / v.length;
  function variance(v) { const m = mean(v); return v.reduce((s, x) => s + (x - m) * (x - m), 0) / (v.length - 1); }
  function covariance(u, v) { const mu = mean(u), mv = mean(v); let s = 0; for (let i = 0; i < u.length; i++) s += (u[i] - mu) * (v[i] - mv); return s / (u.length - 1); }
  /* standard normal density and quantile (Acklam's rational approximation, |error| < 1.2e-9) */
  const dnorm = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  function qnorm(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  /* selection intensity of truncation selection in an infinite population */
  const intensity = p => dnorm(qnorm(1 - p)) / p;

  function hexToRgb(h) {
    h = String(h).trim();
    if (h.startsWith('rgb')) { const m = h.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128]; }
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
  }
  function luminance(rgbStr) { const [r, g, b] = hexToRgb(rgbStr).map(v => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

  /* ================================================================
     a tiny plotting kit (axes, ticks, lines) drawing real SVG nodes
     ================================================================ */
  function niceTicks(lo, hi, n) {
    if (!(hi > lo)) hi = lo + 1;
    const raw = (hi - lo) / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), e = raw / mag;
    const step = mag * (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1);
    const out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(10));
    return out;
  }
  function tickLabel(v) {
    const a = Math.abs(v);
    let s = a >= 100 ? v.toFixed(0) : a >= 10 ? (+v.toFixed(1)).toString() : (+v.toFixed(2)).toString();
    return s.startsWith('-') ? '−' + s.slice(1) : s;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function frame(svg, o) {
    const W = o.W, H = o.H, m = o.m;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    clear(svg);
    const [x0, x1] = o.x, [y0, y1] = o.y;
    const sx = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r);
    const sy = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    const g = svgEl('g');
    svg.appendChild(g);
    (o.yt || niceTicks(y0, y1, o.ny || 5)).forEach(t => {
      if (t < y0 - 1e-9 || t > y1 + 1e-9) return;
      g.appendChild(svgEl('line', { x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t), class: 'art-ax', 'stroke-width': 0.6, opacity: 0.55 }));
      g.appendChild(svgEl('text', { x: m.l - 5, y: sy(t) + 3, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut' }, tickLabel(t)));
    });
    (o.xt || niceTicks(x0, x1, o.nx || 5)).forEach(t => {
      if (t < x0 - 1e-9 || t > x1 + 1e-9) return;
      g.appendChild(svgEl('line', { x1: sx(t), x2: sx(t), y1: H - m.b, y2: H - m.b + 4, class: 'art-ax', 'stroke-width': 1 }));
      g.appendChild(svgEl('text', { x: sx(t), y: H - m.b + 14, 'font-size': 9, 'text-anchor': 'middle', class: 'art-mut' }, tickLabel(t)));
    });
    g.appendChild(svgEl('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'art-ax', 'stroke-width': 1.2 }));
    g.appendChild(svgEl('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: 'art-ax', 'stroke-width': 1.2 }));
    if (o.xlab) g.appendChild(svgEl('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'font-size': 10.5, 'text-anchor': 'middle', class: 'art-txt', 'font-weight': 600 }, o.xlab));
    if (o.ylab) g.appendChild(svgEl('text', { x: 13, y: (m.t + H - m.b) / 2, 'font-size': 10.5, 'text-anchor': 'middle', class: 'art-txt', 'font-weight': 600, transform: `rotate(-90 13 ${(m.t + H - m.b) / 2})` }, o.ylab));
    /* clip path so lines never cross the axes */
    const id = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = svgEl('defs'), cp = svgEl('clipPath', { id });
    cp.appendChild(svgEl('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }));
    defs.appendChild(cp); svg.appendChild(defs);
    const plot = svgEl('g', { 'clip-path': `url(#${id})` });
    svg.appendChild(plot);
    return { sx, sy, g, plot, W, H, m };
  }
  const pathOf = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  /* greedy label placement: each label takes the first of eight positions
     around its point that overlaps neither earlier labels nor any point */
  function placeLabels(g, pts, r) {
    const boxes = [], w = s => 6.2 * s.length + 2, h = 10;
    const hitsPoint = b => pts.some(p => p.x > b.x - r && p.x < b.x + b.w + r && p.y > b.y - r && p.y < b.y + b.h + r);
    const overlaps = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    pts.forEach(p => {
      const lw = w(p.text);
      const cand = [[r + 2, -h - 1], [r + 2, 2], [-lw - r - 2, -h - 1], [-lw - r - 2, 2], [-lw / 2, -h - r - 2], [-lw / 2, r + 2], [r + 6, -h / 2], [-lw - r - 6, -h / 2]];
      let best = null;
      for (const [dx, dy] of cand) { const b = { x: p.x + dx, y: p.y + dy, w: lw, h }; if (!overlaps(b) && !hitsPoint(b)) { best = b; break; } }
      if (!best) best = { x: p.x + cand[0][0], y: p.y + cand[0][1], w: lw, h };
      boxes.push(best);
      g.appendChild(svgEl('text', { x: best.x + 1, y: best.y + h - 1.5, 'font-size': 9, class: 'art-txt', 'font-weight': 700 }, p.text));
    });
  }

  function bindSlider(id, fmt, onInput) {
    const s = el(id), v = el(id + 'Val');
    if (!s) return;
    const show = () => { if (v) v.textContent = fmt(+s.value); };
    s.addEventListener('input', () => { show(); onInput(); });
    show();
  }
  const val = id => +el(id).value;
  function setSlider(id, x, fmt) { const s = el(id); if (!s) return; s.value = x; const v = el(id + 'Val'); if (v) v.textContent = fmt(+s.value); }

  /* ================================================================
     DIALLEL LAB
     ================================================================ */
  const D_PRESETS = {
    partial: { n: 7, loci: 12, da: 0.5, dir: 1, u: 0.5, eps: 0, err: 0.6 },
    complete: { n: 7, loci: 12, da: 1, dir: 1, u: 0.5, eps: 0, err: 0.6 },
    over: { n: 7, loci: 12, da: 1.8, dir: 1, u: 0.5, eps: 0, err: 0.6 },
    additive: { n: 7, loci: 12, da: 0, dir: 1, u: 0.5, eps: 0, err: 0.6 },
    ambi: { n: 8, loci: 16, da: 0.8, dir: 0.5, u: 0.5, eps: 0, err: 0.6 },
    duplicate: { n: 8, loci: 12, da: 0.8, dir: 1, u: 0.5, eps: -3, err: 0.3 },
    complementary: { n: 8, loci: 12, da: 0.8, dir: 1, u: 0.5, eps: 3, err: 0.3, seed: 20262028 },
    noisy: { n: 7, loci: 12, da: 0.5, dir: 1, u: 0.5, eps: 0, err: 2.5 },
  };
  const D_FMT = {
    dlN: v => String(v), dlLoci: v => String(v), dlDa: v => v.toFixed(2), dlDir: v => Math.round(v * 100) + '%',
    dlU: v => v.toFixed(2), dlEps: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2), dlErr: v => v.toFixed(2),
  };
  let dSeed = 20260917, dRes = null;
  const REPS = 3, MU = 20;

  function diallelConfig() {
    return { n: val('dlN'), loci: val('dlLoci'), da: val('dlDa'), dir: val('dlDir'), u: val('dlU'), eps: val('dlEps'), err: val('dlErr') };
  }

  /* simulate and analyse one half diallel with parents (Griffing's Method 2 layout) */
  function simulateDiallel(cfg, seed) {
    const r = rng(seed);
    const n = cfg.n, K = cfg.loci, a = 1;
    /* homozygous parents: +1 carries the allele that increases the trait */
    const X = [];
    for (let i = 0; i < n; i++) { X.push([]); for (let k = 0; k < K; k++) X[i].push(r() < cfg.u ? 1 : -1); }
    const nUp = Math.round(cfg.dir * K);            // loci where dominance points to the increasing allele
    const dk = k => (k < nUp ? 1 : -1) * cfg.da * a;
    const G = (i, j) => {
      let g = 0;
      const het = [];
      for (let k = 0; k < K; k++) {
        if (X[i][k] === X[j][k]) { g += X[i][k] * a; het.push(false); }
        else { g += dk(k); het.push(true); }
      }
      /* dominance × dominance interaction between the loci of each pair (0,1), (2,3), … */
      if (cfg.eps) for (let k = 0; k + 1 < K; k += 2) if (het[k] && het[k + 1]) g += cfg.eps * a;
      return g;
    };
    /* how many dominant alleles each parent carries (the dominant allele is + where d > 0) */
    const domCount = X.map(row => row.reduce((s, x, k) => s + ((dk(k) >= 0 ? x === 1 : x === -1) ? 1 : 0), 0));

    /* replicated plots, table of means, pooled error */
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    let ssErr = 0, dfErr = 0;
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      const g = G(i, j), ys = [];
      for (let t = 0; t < REPS; t++) ys.push(MU + g + cfg.err * randn(r));
      const m = mean(ys);
      ys.forEach(y => { ssErr += (y - m) * (y - m); });
      dfErr += REPS - 1;
      M[i][j] = M[j][i] = m;
    }
    const msErr = cfg.err > 0 ? ssErr / dfErr : 0;
    const E = msErr / REPS;                         // error variance of a cell mean

    /* ---- Hayman–Jinks array statistics ---- */
    const P = M.map((row, i) => row[i]);
    const Vr = M.map(row => variance(row));
    const Wr = M.map(row => covariance(row, P));
    const Vp = variance(P);
    const Vbar = mean(Vr), Wbar = mean(Wr);
    const arrayMeans = M.map(row => mean(row));
    const V0L1 = variance(arrayMeans);
    const ML1 = mean(arrayMeans), ML0 = mean(P);
    /* Hayman's classical corrections assume a full diallel whose crosses are averaged
       over reciprocals (error variance E/2). Here every cross is observed once, so the
       error parts are E(Vr) = E, E(V0L1) = (n−1)E/n², E(W0L01) = E/n and
       E[(ML1 − ML0)²] = (n² − 1)E/n³, which gives the half-diallel versions below. */
    const D = Vp - E;
    const H1 = Vp - 4 * Wbar + 4 * Vbar - (5 * n - 4) * E / n;
    const H2 = 4 * Vbar - 4 * V0L1 - 4 * E + 4 * (n - 1) * E / (n * n);
    const F = 2 * Vp - 4 * Wbar - 2 * (n - 2) * E / n;
    const h2 = 4 * (ML1 - ML0) * (ML1 - ML0) - 4 * (n * n - 1) * E / (n * n * n);
    /* regression of Wr on Vr */
    const b = covariance(Vr, Wr) / variance(Vr);
    const a0 = Wbar - b * Vbar;
    let rss = 0; for (let i = 0; i < n; i++) { const e = Wr[i] - a0 - b * Vr[i]; rss += e * e; }
    const seb = Math.sqrt(rss / (n - 2) / ((n - 1) * variance(Vr)));
    const sea = Math.sqrt(rss / (n - 2) * (1 / n + Vbar * Vbar / ((n - 1) * variance(Vr))));
    const WV = Vr.map((v, i) => Wr[i] + v);
    const rYW = covariance(P, WV) / Math.sqrt(variance(P) * variance(WV));

    /* ---- Griffing Method 2, Model I on the cell means ---- */
    const rowT = M.map(row => row.reduce((s, x) => s + x, 0));        // X_i. of the completed table
    let Xtot = 0, sumSq = 0;
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { Xtot += M[i][j]; sumSq += M[i][j] * M[i][j]; }
    const S2 = rowT.reduce((s, t, i) => s + (t + M[i][i]) * (t + M[i][i]), 0);
    const ssG = (S2 - 4 * Xtot * Xtot / n) / (n + 2);
    const ssS = sumSq - S2 / (n + 2) + 2 * Xtot * Xtot / ((n + 1) * (n + 2));
    const msG = ssG / (n - 1), msS = ssS / (n * (n - 1) / 2);
    const gca = rowT.map((t, i) => (t + M[i][i] - 2 * Xtot / n) / (n + 2));
    const seG = Math.sqrt((n - 1) * E / (n * (n + 2)));
    const s2g = (msG - msS) / (n + 2), s2s = msS - E;
    const baker = (2 * Math.max(s2g, 0)) / (2 * Math.max(s2g, 0) + Math.max(s2s, 0));
    let f1 = 0, nf1 = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { f1 += M[i][j]; nf1++; }
    const heterosis = (f1 / nf1 - ML0) / ML0;

    return { cfg, n, M, P, Vr, Wr, Vp, Vbar, Wbar, E, msErr, D, H1, H2, F, h2, b, a0, seb, sea, rYW, gca, seG, msG, msS, s2g, s2s, baker, heterosis, domCount, K };
  }

  function drawTable(res) {
    const svg = el('dlTable');
    if (!svg) return;
    const n = res.n, W = 340, pad = 30, cell = (W - pad - 8) / n, H = pad + cell * n + 8;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    clear(svg);
    const all = res.M.flat(), lo = Math.min(...all), hi = Math.max(...all);
    const cLo = cssVar('--heat-lo', '#fbf3df'), cMid = cssVar('--heat-mid', '#c6a3e6'), cHi = cssVar('--heat-hi', '#4a2270');
    const colour = v => { const t = hi > lo ? (v - lo) / (hi - lo) : 0.5; return t < 0.5 ? mix(cLo, cMid, t * 2) : mix(cMid, cHi, (t - 0.5) * 2); };
    for (let i = 0; i < n; i++) {
      svg.appendChild(svgEl('text', { x: pad - 5, y: pad + cell * (i + 0.5) + 3, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut', 'font-weight': 700 }, 'P' + (i + 1)));
      svg.appendChild(svgEl('text', { x: pad + cell * (i + 0.5), y: pad - 7, 'font-size': 9, 'text-anchor': 'middle', class: 'art-mut', 'font-weight': 700 }, 'P' + (i + 1)));
      for (let j = 0; j < n; j++) {
        const fill = colour(res.M[i][j]);
        const rect = svgEl('rect', { x: pad + cell * j + 1, y: pad + cell * i + 1, width: cell - 2, height: cell - 2, rx: 3, fill });
        if (i === j) { rect.setAttribute('stroke', cssVar('--text', '#222')); rect.setAttribute('stroke-width', 1.6); }
        if (j < i) rect.setAttribute('opacity', 0.55);
        const tt = svgEl('title', null, (i === j ? T('Progenitor ', 'Parent ') + 'P' + (i + 1) : 'P' + (i + 1) + ' × P' + (j + 1)) + ' = ' + res.M[i][j].toFixed(2));
        rect.appendChild(tt);
        svg.appendChild(rect);
        if (cell >= 30) {
          const txtCol = luminance(fill) > 0.55 ? '#1e1929' : '#ffffff';
          svg.appendChild(svgEl('text', { x: pad + cell * (j + 0.5), y: pad + cell * (i + 0.5) + 3, 'font-size': Math.min(9.5, cell / 3.6), 'text-anchor': 'middle', fill: txtCol, 'pointer-events': 'none' }, res.M[i][j].toFixed(1)));
        }
      }
    }
  }

  function parentColour(res, i) {
    const K = res.K || 1, t = res.domCount[i] / K;
    /* purple → rose → gold, so intermediate parents do not turn brown */
    const a = cssVar('--primary', '#5e2e8c'), b = cssVar('--rose', '#c0406a'), c = cssVar('--gold', '#e3a41c');
    return t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2);
  }

  function drawWrVr(res) {
    const svg = el('dlWrVr');
    if (!svg) return;
    const { Vr, Wr, Vp, a0, b } = res;
    const vmax = Math.max(...Vr, Vp) * 1.12 || 1;
    const wmaxData = Math.max(...Wr, Math.sqrt(vmax * Vp));
    const wminData = Math.min(...Wr, a0, 0);
    const ypad = (wmaxData - wminData) * 0.1 || 0.5;
    const f = frame(svg, { W: 360, H: 300, m: { l: 44, r: 12, t: 12, b: 36 }, x: [0, vmax], y: [wminData - ypad, wmaxData + ypad], xlab: 'Vr', ylab: 'Wr' });
    /* zero line */
    f.plot.appendChild(svgEl('line', { x1: f.sx(0), x2: f.sx(vmax), y1: f.sy(0), y2: f.sy(0), class: 'art-ax', 'stroke-width': 1, 'stroke-dasharray': '2 3' }));
    /* limiting parabola Wr² = Vr·Vp */
    const para = [];
    for (let t = 0; t <= 1.0001; t += 0.02) { const v = t * vmax; para.push([f.sx(v), f.sy(Math.sqrt(Math.max(0, v * Vp)))]); }
    f.plot.appendChild(svgEl('path', { d: pathOf(para), fill: 'none', stroke: cssVar('--leaf'), 'stroke-width': 2 }));
    /* expected unit-slope line through the mean point, and the fitted line */
    const lineAt = (aa, bb, dash, col, w) => f.plot.appendChild(svgEl('path', { d: pathOf([[f.sx(0), f.sy(aa)], [f.sx(vmax), f.sy(aa + bb * vmax)]]), fill: 'none', stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || null }));
    lineAt(res.Wbar - res.Vbar, 1, '5 4', cssVar('--text-muted'), 1.2);
    lineAt(a0, b, null, cssVar('--accent'), 2.2);
    /* intercept on the Wr axis */
    f.plot.appendChild(svgEl('circle', { cx: f.sx(0), cy: f.sy(a0), r: 3.2, fill: cssVar('--accent') }));
    /* parents */
    Vr.forEach((v, i) => {
      const c = svgEl('circle', { cx: f.sx(v), cy: f.sy(Wr[i]), r: 6.2, fill: parentColour(res, i), stroke: cssVar('--card-bg'), 'stroke-width': 1.5 });
      c.appendChild(svgEl('title', null, `P${i + 1}: Vr = ${v.toFixed(3)}, Wr = ${Wr[i].toFixed(3)} · ${res.domCount[i]}/${res.K} ${T('alelos dominantes', 'dominant alleles')}`));
      f.plot.appendChild(c);
    });
    placeLabels(f.plot, Vr.map((v, i) => ({ x: f.sx(v), y: f.sy(Wr[i]), text: 'P' + (i + 1) })), 6.2);
  }

  function drawGca(res) {
    const svg = el('dlGca');
    if (!svg) return;
    const n = res.n, ci = 1.96 * res.seG;
    const lim = Math.max(...res.gca.map(Math.abs)) + ci;
    const f = frame(svg, { W: 300, H: 300, m: { l: 40, r: 10, t: 12, b: 36 }, x: [0, n], y: [-lim * 1.1 || -1, lim * 1.1 || 1], xt: [], ylab: T('ACG (ĝᵢ)', 'GCA (ĝᵢ)') });
    const bw = (f.sx(1) - f.sx(0)) * 0.62;
    f.plot.appendChild(svgEl('line', { x1: f.sx(0), x2: f.sx(n), y1: f.sy(0), y2: f.sy(0), class: 'art-ax', 'stroke-width': 1.2 }));
    res.gca.forEach((g, i) => {
      const x = f.sx(i + 0.5);
      const rect = svgEl('rect', { x: x - bw / 2, y: Math.min(f.sy(g), f.sy(0)), width: bw, height: Math.abs(f.sy(g) - f.sy(0)), rx: 3, fill: parentColour(res, i) });
      rect.appendChild(svgEl('title', null, `P${i + 1}: ĝ = ${g.toFixed(3)} ± ${res.seG.toFixed(3)}`));
      f.plot.appendChild(rect);
      f.plot.appendChild(svgEl('path', { d: `M${x} ${f.sy(g - ci)} L${x} ${f.sy(g + ci)} M${x - 4} ${f.sy(g - ci)} L${x + 4} ${f.sy(g - ci)} M${x - 4} ${f.sy(g + ci)} L${x + 4} ${f.sy(g + ci)}`, stroke: cssVar('--text'), 'stroke-width': 1.1, fill: 'none' }));
      f.g.appendChild(svgEl('text', { x, y: f.H - f.m.b + 14, 'font-size': 9, 'text-anchor': 'middle', class: 'art-mut', 'font-weight': 700 }, 'P' + (i + 1)));
    });
  }

  function tile(id, v, sub) { const n = el(id); if (n) n.textContent = v; const s = el(id + 'T'); if (s && sub != null) s.textContent = sub; }
  const f3 = x => fmtFixed(x, 3), f2 = x => fmtFixed(x, 2);

  function readDiallel(res) {
    const n = res.n;
    const tB = (1 - res.b) / res.seb;
    const ratio = res.D > 0 && res.H1 >= 0 ? Math.sqrt(res.H1 / res.D) : NaN;
    const kdkr = (() => { const s = Math.sqrt(Math.max(0, 4 * res.D * res.H1)); return s - res.F !== 0 ? (s + res.F) / (s - res.F) : NaN; })();
    tile('dlB', `${f2(res.b)} ± ${f2(res.seb)}`, 't(b = 1) = ' + f2(tB));
    tile('dlRatio', f2(ratio), T('modelo: ', 'model: ') + f2(res.cfg.da));
    const noDom = !(ratio >= 0.25);
    tile('dlH2H1', noDom ? '—' : f3(res.H2 / (4 * res.H1)), noDom ? T('sin dominancia', 'no dominance') : T('0.25 si u = v', '0.25 when u = v'));
    tile('dlKdKr', noDom ? '—' : f2(kdkr), noDom ? T('sin dominancia', 'no dominance') : T('1 si simétrico', '1 when symmetric'));
    tile('dlBaker', f2(res.baker), T('1 = solo aditivo', '1 = additive only'));
    tile('dlHet', fmtPct(res.heterosis, 1), T('F₁ contra progenitores', 'F₁ over parents'));

    /* interpretation in words */
    /* two-sided 5% critical values of Student's t, indexed by degrees of freedom (n − 2) */
    const T975 = [NaN, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179];
    const tcrit = T975[n - 2] || 2.2;
    const fits = Math.abs(tB) < tcrit;
    const tA = res.a0 / res.sea;
    const parts = [];
    if (!isFinite(res.b) || !isFinite(ratio)) {
      parts.push(T('Todos los progenitores quedaron casi iguales: pide padres nuevos o más loci.', 'The parents came out almost identical: draw new parents or add loci.'));
    } else {
      parts.push(fits
        ? T(`<b>b = ${f2(res.b)}</b> no difiere de 1 (t = ${f2(tB)}, gl = ${n - 2}): el modelo aditivo–dominante se sostiene.`, `<b>b = ${f2(res.b)}</b> does not differ from 1 (t = ${f2(tB)}, df = ${n - 2}): the additive–dominance model holds.`)
        : T(`<b>b = ${f2(res.b)}</b> se aleja de 1 (t = ${f2(tB)}, gl = ${n - 2}): hay interacción no alélica u otro supuesto roto, y los componentes quedan sesgados.`, `<b>b = ${f2(res.b)}</b> departs from 1 (t = ${f2(tB)}, df = ${n - 2}): non-allelic interaction or another broken assumption, so the components are biased.`));
      if (fits && res.cfg.eps) parts.push(T('Ojo: aquí sí hay epistasis; con pocos progenitores la prueba b = 1 tiene poca potencia y la pasa por alto en muchas muestras (prueba «Otros progenitores»).', 'Beware: epistasis is present here; with few parents the b = 1 test has little power and misses it in many samples (try “New parents”).'));
      const icpt = `a = ${f2(res.a0)} ± ${f2(res.sea)}`;
      const additive = ratio < 0.25;
      if (additive) parts.push(T(`La recta corta el eje Wr muy arriba del origen (${icpt}) y (H₁/D)<sup>½</sup> = ${f2(ratio)}: <b>acción génica prácticamente aditiva</b>. Sin dominancia, la posición de los progenitores sobre la recta no separa alelos dominantes de recesivos.`, `The line cuts the Wr axis well above the origin (${icpt}) and (H₁/D)<sup>½</sup> = ${f2(ratio)}: <b>essentially additive gene action</b>. Without dominance, the position of the parents along the line does not tell dominant from recessive alleles.`));
      else if (tA > tcrit) parts.push(T(`El intercepto es positivo (${icpt}) → <b>dominancia parcial</b>; (H₁/D)<sup>½</sup> = ${f2(ratio)}.`, `The intercept is positive (${icpt}) → <b>partial dominance</b>; (H₁/D)<sup>½</sup> = ${f2(ratio)}.`));
      else if (tA < -tcrit) parts.push(T(`El intercepto es negativo (${icpt}) → <b>sobredominancia</b>; (H₁/D)<sup>½</sup> = ${f2(ratio)}.`, `The intercept is negative (${icpt}) → <b>overdominance</b>; (H₁/D)<sup>½</sup> = ${f2(ratio)}.`));
      else if (ratio >= 0.8 && ratio <= 1.2) parts.push(T(`El intercepto no difiere de cero (${icpt}) → <b>dominancia completa</b>; (H₁/D)<sup>½</sup> = ${f2(ratio)}.`, `The intercept does not differ from zero (${icpt}) → <b>complete dominance</b>; (H₁/D)<sup>½</sup> = ${f2(ratio)}.`));
      /* a non-significant intercept is not proof of complete dominance: with a large error the test has little power */
      else parts.push(T(`El intercepto no difiere de cero (${icpt}), como en la dominancia completa, pero (H₁/D)<sup>½</sup> = ${f2(ratio)} apunta a <b>${ratio < 0.8 ? 'dominancia parcial' : 'sobredominancia'}</b>. Con este error la prueba del intercepto tiene poca potencia: más repeticiones o más progenitores lo aclararían.`, `The intercept does not differ from zero (${icpt}), as with complete dominance, but (H₁/D)<sup>½</sup> = ${f2(ratio)} points to <b>${ratio < 0.8 ? 'partial dominance' : 'overdominance'}</b>. With this much error the intercept test has little power: more replicates or more parents would settle it.`));
      if (!additive) {
        const order = res.Vr.map((v, i) => [v + res.Wr[i], i]).sort((x, y) => x[0] - y[0]);
        const near = order.slice(0, 2).map(o => 'P' + (o[1] + 1)).join(T(' y ', ' and '));
        parts.push(T(`${near}, los más cercanos al origen, portan más alelos dominantes.`, `${near}, closest to the origin, carry the most dominant alleles.`));
      }
      if (!additive) parts.push(res.rYW < -0.3
        ? T(`r(Yr, Wr+Vr) = ${f2(res.rYW)}: los alelos dominantes aumentan el carácter.`, `r(Yr, Wr+Vr) = ${f2(res.rYW)}: dominant alleles increase the trait.`)
        : res.rYW > 0.3 ? T(`r(Yr, Wr+Vr) = ${f2(res.rYW)}: los alelos recesivos aumentan el carácter.`, `r(Yr, Wr+Vr) = ${f2(res.rYW)}: recessive alleles increase the trait.`)
          : T(`r(Yr, Wr+Vr) = ${f2(res.rYW)}: la dirección de la dominancia no es clara (ambidireccional).`, `r(Yr, Wr+Vr) = ${f2(res.rYW)}: no clear direction of dominance (ambidirectional).`));
    }
    const st = el('dlStatus'); if (st) st.innerHTML = parts.join(' ');
  }

  function runDiallel() {
    dRes = simulateDiallel(diallelConfig(), dSeed);
    drawTable(dRes); drawWrVr(dRes); drawGca(dRes); readDiallel(dRes);
  }
  function redrawDiallel() { if (dRes) { drawTable(dRes); drawWrVr(dRes); drawGca(dRes); readDiallel(dRes); } }

  function applyDiallelPreset(key) {
    const p = D_PRESETS[key]; if (!p) return;
    dSeed = p.seed || 20260917;
    setSlider('dlN', p.n, D_FMT.dlN); setSlider('dlLoci', p.loci, D_FMT.dlLoci); setSlider('dlDa', p.da, D_FMT.dlDa);
    setSlider('dlDir', p.dir, D_FMT.dlDir); setSlider('dlU', p.u, D_FMT.dlU); setSlider('dlEps', p.eps, D_FMT.dlEps); setSlider('dlErr', p.err, D_FMT.dlErr);
    runDiallel();
  }

  /* ================================================================
     SELECTION LAB
     ================================================================ */
  const S_PRESETS = {
    mass: { N: 400, loci: 40, h2: 0.4, ps: 0.1, p0: 0.3, da: 0, c: 1 },
    lowh2: { N: 400, loci: 40, h2: 0.1, ps: 0.1, p0: 0.3, da: 0, c: 1 },
    major: { N: 400, loci: 4, h2: 0.5, ps: 0.1, p0: 0.2, da: 0, c: 1 },
    pollen: { N: 400, loci: 40, h2: 0.4, ps: 0.1, p0: 0.3, da: 0, c: 0.5 },
    small: { N: 60, loci: 40, h2: 0.4, ps: 0.1, p0: 0.3, da: 0, c: 1 },
    dominance: { N: 400, loci: 40, h2: 0.4, ps: 0.1, p0: 0.3, da: 1, c: 1 },
  };
  const S_FMT = {
    slN: v => String(v), slLoci: v => String(v), slH2: v => v.toFixed(2), slPs: v => Math.round(v * 100) + '%', slP0: v => v.toFixed(2),
    slDa: v => v.toFixed(2),
  };
  let sSeed = 7, sPop = null, sTimer = null;
  const MAX_CYCLES = 25;

  function selectionConfig() {
    return { N: val('slN'), loci: val('slLoci'), h2: val('slH2'), ps: val('slPs'), p0: val('slP0'), da: val('slDa'), c: el('slC') ? +el('slC').value : 1 };
  }

  function genotypicValue(pop, idx, da) {
    const L = pop.L; let g = 0;
    for (let k = 0; k < L; k++) {
      const c = pop.A[idx * 2 * L + 2 * k] + pop.A[idx * 2 * L + 2 * k + 1];
      g += c === 2 ? 1 : c === 0 ? -1 : da;
    }
    return g;
  }
  function freqs(pop) {
    const { N, L, A } = pop, p = new Float64Array(L);
    for (let i = 0; i < N; i++) for (let k = 0; k < L; k++) p[k] += A[i * 2 * L + 2 * k] + A[i * 2 * L + 2 * k + 1];
    for (let k = 0; k < L; k++) p[k] /= 2 * N;
    return p;
  }
  /* additive variance from allele frequencies: Σ 2pq α², α = a + d(q − p) (Falconer & Mackay) */
  function additiveVariance(p, da) { let v = 0; for (let k = 0; k < p.length; k++) { const q = 1 - p[k], alpha = 1 + da * (q - p[k]); v += 2 * p[k] * q * alpha * alpha; } return v; }

  function newPopulation(cfg, seed) {
    const r = rng(seed), N = cfg.N, L = cfg.loci;
    const A = new Uint8Array(N * 2 * L);
    for (let i = 0; i < A.length; i++) A[i] = r() < cfg.p0 ? 1 : 0;
    const pop = { N, L, A, r, cfg, cycle: 0, hist: [] };
    const G = Array.from({ length: N }, (_, i) => genotypicValue(pop, i, cfg.da));
    const vg = variance(G) || 1e-9;
    pop.sdE = Math.sqrt(vg * (1 - cfg.h2) / cfg.h2);
    evaluate(pop);
    return pop;
  }
  function evaluate(pop) {
    const { N, r, cfg } = pop;
    pop.G = Array.from({ length: N }, (_, i) => genotypicValue(pop, i, cfg.da));
    pop.Y = pop.G.map(g => g + pop.sdE * randn(r));
    const p = freqs(pop);
    const mY = mean(pop.Y), vP = variance(pop.Y), vA = additiveVariance(p, cfg.da);
    const k = Math.max(2, Math.round(cfg.ps * N));
    const order = pop.Y.map((y, i) => [y, i]).sort((x, y) => y[0] - x[0]);
    const sel = order.slice(0, k).map(o => o[1]);
    const mSel = mean(sel.map(i => pop.Y[i]));
    const S = mSel - mY, h2 = Math.min(1, vA / vP);
    const fixed = p.reduce((s, x) => s + (x <= 0 || x >= 1 ? 1 : 0), 0);
    pop.now = { cycle: pop.cycle, mY, mG: mean(pop.G), vP, vA, h2, S, i: S / Math.sqrt(vP), Rpred: cfg.c * h2 * S, sel, trunc: order[k - 1][0], p, fixed };
    pop.hist.push(pop.now);
  }
  function nextGeneration(pop) {
    const { N, L, A, r, cfg } = pop;
    const sel = pop.now.sel, k = sel.length;
    const B = new Uint8Array(A.length);
    for (let o = 0; o < N; o++) {
      const mother = sel[Math.floor(r() * k)];
      let father;
      if (cfg.c === 1) { do { father = sel[Math.floor(r() * k)]; } while (father === mother && k > 1); }
      else { do { father = Math.floor(r() * N); } while (father === mother); }
      for (let l = 0; l < L; l++) {
        B[o * 2 * L + 2 * l] = A[mother * 2 * L + 2 * l + (r() < 0.5 ? 1 : 0)];
        B[o * 2 * L + 2 * l + 1] = A[father * 2 * L + 2 * l + (r() < 0.5 ? 1 : 0)];
      }
    }
    pop.A = B;
    pop.prevY = pop.Y;
    pop.cycle++;
    evaluate(pop);
  }

  function drawHistogram(pop) {
    const svg = el('slHist');
    if (!svg) return;
    const now = pop.now, Y = pop.Y;
    const all = pop.hist.map(h => h.mY);
    const lo0 = Math.min(...Y, ...(pop.prevY || Y)), hi0 = Math.max(...Y, ...(pop.prevY || Y));
    const span = hi0 - lo0 || 1, lo = lo0 - span * 0.05, hi = hi0 + span * 0.05;
    const nb = 34, w = (hi - lo) / nb;
    const count = arr => { const c = new Array(nb).fill(0); arr.forEach(y => { c[Math.min(nb - 1, Math.max(0, Math.floor((y - lo) / w)))]++; }); return c; };
    const cAll = count(Y), selSet = new Set(now.sel), cSel = count(now.sel.map(i => Y[i]));
    const cPrev = pop.prevY ? count(pop.prevY) : null;
    const ymax = Math.max(...cAll, ...(cPrev || [0])) * 1.18 || 1;
    const f = frame(svg, { W: 420, H: 290, m: { l: 40, r: 12, t: 14, b: 36 }, x: [lo, hi], y: [0, ymax], xlab: T('Valor fenotípico', 'Phenotypic value'), ylab: T('Individuos', 'Individuals') });
    if (cPrev) {
      const pts = [];
      cPrev.forEach((c, b) => { pts.push([f.sx(lo + b * w), f.sy(c)]); pts.push([f.sx(lo + (b + 1) * w), f.sy(c)]); });
      f.plot.appendChild(svgEl('path', { d: pathOf(pts), fill: 'none', stroke: cssVar('--text-muted'), 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: 0.8 }));
    }
    cAll.forEach((c, b) => {
      const x = f.sx(lo + b * w), xw = f.sx(lo + (b + 1) * w) - x - 1;
      f.plot.appendChild(svgEl('rect', { x, y: f.sy(c), width: Math.max(0.5, xw), height: f.sy(0) - f.sy(c), fill: cssVar('--primary'), opacity: 0.32 }));
      if (cSel[b]) f.plot.appendChild(svgEl('rect', { x, y: f.sy(cSel[b]), width: Math.max(0.5, xw), height: f.sy(0) - f.sy(cSel[b]), fill: cssVar('--gold'), opacity: 0.95 }));
    });
    const vline = (x, col, dash, lab, yLab) => {
      f.plot.appendChild(svgEl('line', { x1: f.sx(x), x2: f.sx(x), y1: f.sy(0), y2: f.sy(ymax), stroke: col, 'stroke-width': 1.6, 'stroke-dasharray': dash || null }));
      if (lab) f.plot.appendChild(svgEl('text', { x: f.sx(x) + 3, y: f.sy(ymax * yLab), 'font-size': 9, fill: col, 'font-weight': 700 }, lab));
    };
    vline(now.mY, cssVar('--primary'), null, 'μ', 0.95);
    vline(now.mY + now.S, cssVar('--accent'), '4 3', 'μ + S', 0.85);
    vline(now.mY + now.Rpred, cssVar('--leaf'), '2 2', 'μ + R', 0.73);
    void selSet; void all;
  }

  function drawTrajectory(pop) {
    const svg = el('slTraj');
    if (!svg) return;
    const H = pop.hist, h0 = H[0];
    const sd0 = Math.sqrt(h0.vP);
    const units = h => (h.mY - h0.mY) / sd0;
    const ptsReal = H.map(h => [h.cycle, units(h)]);
    /* naive prediction: the first cycle's response repeated as if h² and S never changed */
    const naive = H.map(h => [h.cycle, h.cycle * h0.Rpred / sd0]);
    const ymax = Math.max(1, ...ptsReal.map(p => p[1]), ...naive.map(p => p[1])) * 1.1;
    const ymin = Math.min(0, ...ptsReal.map(p => p[1])) - 0.1;
    const f = frame(svg, { W: 420, H: 290, m: { l: 40, r: 40, t: 26, b: 36 }, x: [0, MAX_CYCLES], y: [ymin, ymax], xlab: T('Ciclo de selección', 'Selection cycle'), ylab: T('Ganancia (σₚ iniciales)', 'Gain (initial σₚ)') });
    /* h² on a right-hand axis, 0–1 */
    const syH = v => f.sy(ymin + v * (ymax - ymin));
    [0, 0.5, 1].forEach(t => f.g.appendChild(svgEl('text', { x: f.W - f.m.r + 5, y: syH(t) + 3, 'font-size': 9, class: 'art-mut' }, t.toFixed(1))));
    f.g.appendChild(svgEl('text', { x: f.W - f.m.r + 5, y: f.m.t - 12, 'font-size': 10.5, fill: cssVar('--leaf'), 'font-weight': 700 }, 'h²'));
    f.plot.appendChild(svgEl('path', { d: pathOf(naive.map(p => [f.sx(p[0]), f.sy(p[1])])), fill: 'none', stroke: cssVar('--text-muted'), 'stroke-width': 1.3, 'stroke-dasharray': '6 4' }));
    f.plot.appendChild(svgEl('path', { d: pathOf(H.map(h => [f.sx(h.cycle), syH(h.h2)])), fill: 'none', stroke: cssVar('--leaf'), 'stroke-width': 1.8 }));
    /* per-cycle predictions: an arrow from each realised mean to its breeder's-equation forecast */
    for (let t = 0; t + 1 < H.length; t++) {
      const x0 = f.sx(H[t].cycle), y0 = f.sy(units(H[t])), y1 = f.sy(units(H[t]) + H[t].Rpred / sd0);
      f.plot.appendChild(svgEl('path', { d: `M${x0} ${y0} L${f.sx(H[t].cycle + 1)} ${y1}`, stroke: cssVar('--gold'), 'stroke-width': 1.4, fill: 'none', opacity: 0.9 }));
      f.plot.appendChild(svgEl('circle', { cx: f.sx(H[t].cycle + 1), cy: y1, r: 2.4, fill: cssVar('--gold') }));
    }
    f.plot.appendChild(svgEl('path', { d: pathOf(ptsReal.map(p => [f.sx(p[0]), f.sy(p[1])])), fill: 'none', stroke: cssVar('--primary'), 'stroke-width': 2.4 }));
    ptsReal.forEach(p => f.plot.appendChild(svgEl('circle', { cx: f.sx(p[0]), cy: f.sy(p[1]), r: 3, fill: cssVar('--primary') })));
  }

  function readSelection(pop) {
    const n = pop.now, h0 = pop.hist[0], prev = pop.hist.length > 1 ? pop.hist[pop.hist.length - 2] : null;
    tile('slCycle', String(n.cycle));
    tile('slI', f2(n.i), T('teórica ', 'theory ') + f2(intensity(pop.cfg.ps)));
    tile('slS', f2(n.S));
    tile('slRp', f2(n.Rpred), 'c·h²·S');
    tile('slRr', prev ? f2(n.mY - prev.mY) : '—', prev ? T('predicha ', 'predicted ') + f2(prev.Rpred) : '');
    tile('slH2now', f2(n.h2), T('inicial ', 'initial ') + f2(h0.h2));
    tile('slGain', f2((n.mY - h0.mY) / Math.sqrt(h0.vP)) + ' σ');
    tile('slFixed', `${n.fixed}/${pop.L}`);
    const st = el('slStatus');
    if (!st) return;
    if (!prev) {
      st.innerHTML = T(`Se selecciona el mejor <b>${Math.round(pop.cfg.ps * 100)}%</b> (barras doradas). Con h² = ${f2(n.h2)} y S = ${f2(n.S)}, la ecuación del criador predice una respuesta de <b>${f2(n.Rpred)}</b> en el siguiente ciclo. Pulsa <b>Ciclo</b> o <b>▶ Correr</b>.`,
        `The best <b>${Math.round(pop.cfg.ps * 100)}%</b> are selected (gold bars). With h² = ${f2(n.h2)} and S = ${f2(n.S)}, the breeder's equation predicts a response of <b>${f2(n.Rpred)}</b> next cycle. Press <b>Cycle</b> or <b>▶ Run</b>.`);
      return;
    }
    const lost = 1 - n.vA / h0.vA, loci = n.fixed === 1 ? 'locus' : 'loci';
    const domNote = pop.cfg.da > 0;
    st.innerHTML = T(`Ciclo ${n.cycle}: respuesta obtenida <b>${f2(n.mY - prev.mY)}</b> contra <b>${f2(prev.Rpred)}</b> predicha. La varianza aditiva ha caído <b>${fmtPct(Math.max(0, lost), 0)}</b> desde el inicio (efecto Bulmer y fijación de ${n.fixed} ${loci}), por eso la línea discontinua —que supone h² constante— se aleja de la realidad.${domNote ? ' Con dominancia, además, σ²A baja conforme el alelo favorable se vuelve común, porque el recesivo que queda se esconde en los heterocigotos.' : ''}${pop.cfg.c < 1 ? ' Sin control del polen (c = ½) solo la mitad del diferencial se transmite.' : ''}`,
      `Cycle ${n.cycle}: realised response <b>${f2(n.mY - prev.mY)}</b> against <b>${f2(prev.Rpred)}</b> predicted. Additive variance has fallen <b>${fmtPct(Math.max(0, lost), 0)}</b> since the start (Bulmer effect and fixation of ${n.fixed} ${loci}), which is why the dashed line — that assumes a constant h² — drifts away from reality.${domNote ? ' With dominance, σ²A also shrinks as the favourable allele becomes common, because the remaining recessive hides in heterozygotes.' : ''}${pop.cfg.c < 1 ? ' Without pollen control (c = ½) only half the selection differential is transmitted.' : ''}`);
  }

  function drawSelection() { if (!sPop) return; drawHistogram(sPop); drawTrajectory(sPop); readSelection(sPop); }
  function resetSelection() { stopRun(); sPop = newPopulation(selectionConfig(), sSeed); sPop.prevY = null; drawSelection(); }
  function stepSelection() {
    if (!sPop) resetSelection();
    if (sPop.cycle >= MAX_CYCLES) { stopRun(); return; }
    nextGeneration(sPop); drawSelection();
  }
  function stopRun() { if (sTimer) { clearInterval(sTimer); sTimer = null; } const b = el('slRun'); if (b) { b.dataset.es = '▶ Correr'; b.dataset.en = '▶ Run'; b.textContent = T('▶ Correr', '▶ Run'); } }
  function toggleRun() {
    if (sTimer) { stopRun(); return; }
    if (!sPop || sPop.cycle >= MAX_CYCLES) resetSelection();
    const b = el('slRun'); if (b) { b.dataset.es = '❚❚ Pausa'; b.dataset.en = '❚❚ Pause'; b.textContent = T('❚❚ Pausa', '❚❚ Pause'); }
    sTimer = setInterval(() => { if (!sPop || sPop.cycle >= MAX_CYCLES) { stopRun(); return; } stepSelection(); }, 420);
  }
  function applySelectionPreset(key) {
    const p = S_PRESETS[key]; if (!p) return;
    setSlider('slN', p.N, S_FMT.slN); setSlider('slLoci', p.loci, S_FMT.slLoci); setSlider('slH2', p.h2, S_FMT.slH2);
    setSlider('slPs', p.ps, S_FMT.slPs); setSlider('slP0', p.p0, S_FMT.slP0); setSlider('slDa', p.da, S_FMT.slDa);
    if (el('slC')) el('slC').value = String(p.c);
    resetSelection();
  }

  /* ================================================================
     wiring
     ================================================================ */
  function init() {
    if (!el('dlWrVr')) return;
    /* tabs */
    els('.lab-tab').forEach(t => t.addEventListener('click', () => {
      els('.lab-tab').forEach(x => x.classList.toggle('on', x === t));
      els('.lab').forEach(x => x.classList.toggle('on', x.id === t.dataset.lab));
      if (t.dataset.lab === 'labSelection' && !sPop) resetSelection();
    }));
    /* diallel */
    Object.keys(D_FMT).forEach(id => bindSlider(id, D_FMT[id], runDiallel));
    el('dlPreset').addEventListener('change', e => applyDiallelPreset(e.target.value));
    el('dlNew').addEventListener('click', () => { dSeed = (dSeed * 1103515245 + 12345) >>> 0; runDiallel(); });
    applyDiallelPreset(el('dlPreset').value);
    /* selection */
    Object.keys(S_FMT).forEach(id => bindSlider(id, S_FMT[id], resetSelection));
    el('slC').addEventListener('change', resetSelection);
    el('slPreset').addEventListener('change', e => applySelectionPreset(e.target.value));
    el('slRun').addEventListener('click', toggleRun);
    el('slStep').addEventListener('click', () => { stopRun(); stepSelection(); });
    el('slReset').addEventListener('click', resetSelection);
    el('slNew').addEventListener('click', () => { sSeed = (sSeed * 22695477 + 1) >>> 0; resetSelection(); });
    /* redraw in the new language / theme */
    document.addEventListener('langchange', () => { redrawDiallel(); drawSelection(); });
    document.addEventListener('themechange', () => { redrawDiallel(); drawSelection(); });
  }

  document.addEventListener('DOMContentLoaded', init);
  window.Playground = { simulateDiallel, newPopulation, nextGeneration, additiveVariance, intensity, qnorm };
})();
