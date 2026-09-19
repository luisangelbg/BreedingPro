/* BreedingPro — Block 9 figures: the genotype × environment table as a heat map, the response
   of every genotype to the environmental index, a statistic against the mean (b, WAAS), the
   AMMI1 graph and the biplots (AMMI2 and the views of the GGE biplot). Biplots keep the same
   scale on both axes: angles and inner products are what they show. */

const P9 = {};
const t9 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const cut9 = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ---------------- 1 · heat map of the table ---------------- */
P9.heat = (cfg0, o) => {
  const ge = cfg0.show === 'ge';
  const cfg = t9(cfg0, ge ? 'Interacción genotipo × ambiente' : 'Media de cada genotipo en cada ambiente', ge ? 'Genotype × environment interaction' : 'Mean of every genotype in every environment');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const g = o.genos.length, e = o.envs.length;
  const M = ge ? o.Z : o.Y;
  const rowOrder = o.genos.map((_, i) => i).sort((a, b) => o.gm[b] - o.gm[a]);
  const colOrder = o.envs.map((_, j) => j).sort((a, b) => o.em[a] - o.em[b]);
  const fsR = Math.max(7, Math.min(11, 520 / g));
  const labW = Math.min(150, 14 + Math.max(...o.genos.map(x => Fig.measure(cut9(x, 16), fsR, Fig.fonts.sans))));
  const topH = Math.min(110, 18 + Math.max(...o.envs.map(x => Fig.measure(cut9(x, 14), 10, Fig.fonts.sans))) * 0.72);
  const f = Fig.frame(svg, cfg, { margin: { left: labW + 14, right: 104, top: 44 + topH, bottom: o.nImputed ? 44 : 24 } });
  const cw = (f.x1 - f.x0) / e, ch = (f.y1 - f.y0) / g;
  const vals = M.flat().filter(isFinite);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (ge) { const a = Math.max(Math.abs(lo), Math.abs(hi)) || 1; lo = -a; hi = a; }
  const ramp = Fig.colormaps[cfg.colormap || (ge ? 'rdbu' : 'viridis')] || Fig.colormaps.viridis;
  const col = v => ramp(hi > lo ? (v - lo) / (hi - lo) : 0.5);
  const grp = Fig.g();
  rowOrder.forEach((i, r) => colOrder.forEach((j, c) => {
    const v = M[i][j], x = f.x0 + c * cw, y = f.y0 + r * ch;
    const fill = col(v);
    const rect = Fig.el('rect', { x: x + 0.5, y: y + 0.5, width: Math.max(0.5, cw - 1), height: Math.max(0.5, ch - 1), fill });
    rect.appendChild(Fig.el('title', {}, `${o.genos[i]} · ${o.envs[j]} · ${fmtNum(o.Y[i][j], 4)}${ge ? ` · GA ${fmtNum(v, 4)}` : ''}${o.imputed && o.imputed[i][j] ? ' · ' + T('estimado', 'imputed') : ''}`));
    grp.appendChild(rect);
    if (o.imputed && o.imputed[i][j]) grp.appendChild(Fig.el('path', { d: `M${x + 2} ${y + ch - 2} L${x + cw - 2} ${y + 2}`, stroke: Fig.onColor(fill), 'stroke-width': 1.2 }));
    if (cfg.showValues !== false && cw >= 34 && ch >= 15) grp.appendChild(Fig.text(x + cw / 2, y + ch / 2 + 3.6, fmtNum(v, ge ? 2 : 3), { size: Math.min(10, ch * 0.62), anchor: 'middle', fill: Fig.onColor(fill), font: f.font, role: 'label' }));
  }));
  rowOrder.forEach((i, r) => grp.appendChild(Fig.text(f.x0 - 6, f.y0 + r * ch + ch / 2 + fsR * 0.35, cut9(o.genos[i], 16), { size: fsR, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' })));
  colOrder.forEach((j, c) => grp.appendChild(Fig.text(f.x0 + c * cw + cw / 2 + 3, f.y0 - 6, cut9(o.envs[j], 14), { size: 10, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -50, role: 'tick' })));
  f.g.appendChild(grp);
  P3.colorbar(f, cfg, lo, hi, ramp, ge ? T('interacción', 'interaction') : T('media', 'mean'));
  if (o.nImputed) f.g.appendChild(Fig.text(f.x0, f.y1 + 22, T(`Celdas con diagonal: ${o.nImputed} estimadas por EM-AMMI`, `Cells with a diagonal: ${o.nImputed} imputed by EM-AMMI`), { size: 10.5, fill: f.t.muted, font: f.font, role: 'legend' }));
  f.g.appendChild(Fig.text(f.x0, f.y1 + (o.nImputed ? 36 : 16), T('Genotipos de mayor a menor media; ambientes de menor a mayor índice.', 'Genotypes from highest to lowest mean; environments from lowest to highest index.'), { size: 10, fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

/* ---------------- 2 · response to the environmental index ---------------- */
P9.norms = (cfg0, o) => {
  const cfg = t9(cfg0, 'Respuesta de cada genotipo al índice ambiental', 'Response of every genotype to the environmental index');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 76, right: 150, top: 56, bottom: 64 } });
  const I = o.I, xs = I.concat([0]);
  const ys = o.Y.flat().concat(o.geno.map(x => [x.mean + x.b * Math.min(...I), x.mean + x.b * Math.max(...I)]).flat());
  const dx = Fig.niceDomain(Math.min(...xs), Math.max(...xs)), dy = Fig.niceDomain(Math.min(...ys), Math.max(...ys));
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || T('índice ambiental (media del ambiente − media general)', 'environmental index (environment mean − grand mean)') }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || o.trait }));
  const g = Fig.g();
  const x0 = Math.min(...I), x1 = Math.max(...I);
  /* the average response (b = 1) */
  g.appendChild(Fig.el('line', { x1: sx(x0), y1: sy(o.grand + x0), x2: sx(x1), y2: sy(o.grand + x1), stroke: f.t.fg, 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }));
  const hl = new Set(o.highlight || []);
  const labels = [];
  o.geno.forEach((x, i) => {
    const on = hl.has(i);
    const colr = on ? Fig.color(cfg.palette, [...hl].indexOf(i)) : Fig.alpha(f.t.muted, 0.45);
    if (on && cfg.showPoints !== false) o.Y[i].forEach((v, j) => g.appendChild(Fig.marker(sx(I[j]), sy(v), 2.8, 'circle', { fill: Fig.alpha(colr, 0.75) })));
    const ln = Fig.el('line', { x1: sx(x0), y1: sy(x.mean + x.b * x0), x2: sx(x1), y2: sy(x.mean + x.b * x1), stroke: colr, 'stroke-width': on ? 2.2 : 1 });
    ln.appendChild(Fig.el('title', {}, `${o.names[i]} · b = ${fmtFixed(x.b, 3)} · ${T('media', 'mean')} ${fmtNum(x.mean, 4)}`));
    g.appendChild(ln);
    if (on) labels.push({ y: sy(x.mean + x.b * x1), text: cut9(o.names[i], 16), fill: colr });
  });
  /* end labels, pushed apart vertically */
  labels.sort((a, b) => a.y - b.y);
  const gap = 12 * Fig.fs('label');
  for (let k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < gap) labels[k].y = labels[k - 1].y + gap;
  const over = labels.length ? labels[labels.length - 1].y - (f.y1 - 4) : 0;
  if (over > 0) labels.forEach(l => { l.y -= over; });
  labels.forEach(l => g.appendChild(Fig.text(f.x1 + 8, l.y + 3.5, l.text, { size: 10, fill: l.fill, font: f.font, role: 'label' })));
  g.appendChild(Fig.text(sx(x1), sy(o.grand + x1) - 8, 'b = 1', { size: 10, anchor: 'end', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 3 · a statistic against the mean ---------------- */
P9.vsMean = (cfg0, o) => {
  const cfg = t9(cfg0, o.titleEs, o.titleEn);
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 30, top: 56, bottom: 64 } });
  const xs = o.x.concat([o.xRef]), ys = o.y.concat(o.yRef != null ? [o.yRef] : []);
  const dx = Fig.niceDomain(Math.min(...xs), Math.max(...xs)), dy = Fig.niceDomain(Math.min(...ys), Math.max(...ys), o.zeroY);
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || o.xlab }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || o.ylab }));
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: sx(o.xRef), x2: sx(o.xRef), y1: f.y0, y2: f.y1, stroke: f.t.fg, 'stroke-width': 1, 'stroke-dasharray': '5 4' }));
  if (o.yRef != null) g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(o.yRef), y2: sy(o.yRef), stroke: f.t.fg, 'stroke-width': 1, 'stroke-dasharray': '5 4' }));
  /* quadrant names, in the corners */
  if (o.quadrants && cfg.showQuadrants !== false) {
    const q = o.quadrants, pad = 8, st = { size: 10.5, fill: f.t.muted, font: f.font, role: 'legend', weight: 'bold' };
    g.appendChild(Fig.text(f.x0 + pad, f.y0 + 16, q[0], st));
    g.appendChild(Fig.text(f.x1 - pad, f.y0 + 16, q[1], Object.assign({ anchor: 'end' }, st)));
    g.appendChild(Fig.text(f.x0 + pad, f.y1 - 8, q[2], st));
    g.appendChild(Fig.text(f.x1 - pad, f.y1 - 8, q[3], Object.assign({ anchor: 'end' }, st)));
  }
  const items = [];
  o.x.forEach((x, i) => {
    const colr = o.flag && o.flag[i] ? Fig.color(cfg.palette, 5) : Fig.color(cfg.palette, 0);
    const m = Fig.marker(sx(x), sy(o.y[i]), 4.6, o.flag && o.flag[i] ? 'diamond' : 'circle', { fill: colr, stroke: f.t.bg, 'stroke-width': 1 });
    m.appendChild(Fig.el('title', {}, `${o.names[i]} · ${fmtNum(x, 4)} · ${fmtNum(o.y[i], 4)}`));
    g.appendChild(m);
    items.push({ x: sx(x), y: sy(o.y[i]), text: cut9(o.names[i], 12), r: 5 });
  });
  f.g.appendChild(g);
  if (cfg.showLabels !== false) Fig.repelLabels(g, f, items, {});
  if (o.flagLabel && o.flag && o.flag.some(Boolean)) Fig.legend(f, [{ label: o.flagLabel, color: Fig.color(cfg.palette, 5), shape: 'circle' }, { label: o.otherLabel, color: Fig.color(cfg.palette, 0), shape: 'circle' }], cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- 4 · AMMI1: mean against the first interaction axis ---------------- */
P9.ammi1 = (cfg0, o) => {
  const cfg = t9(cfg0, 'AMMI1: media y primer eje de la interacción', 'AMMI1: mean and first interaction axis');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 30, top: 56, bottom: 70 } });
  const xs = o.gm.concat(o.em), ys = o.G.map(s => s[0]).concat(o.E.map(s => s[0]), [0]);
  const dx = Fig.niceDomain(Math.min(...xs), Math.max(...xs)), dy = Fig.niceDomain(Math.min(...ys), Math.max(...ys), true);
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || o.trait }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || `IPCA1 (${fmtNum(o.pct1, 1)} %)` }));
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: sx(o.grand), x2: sx(o.grand), y1: f.y0, y2: f.y1, stroke: f.t.fg, 'stroke-dasharray': '5 4' }));
  g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(0), y2: sy(0), stroke: f.t.fg, 'stroke-dasharray': '5 4' }));
  const cG = Fig.color(cfg.palette, 0), cE = Fig.color(cfg.palette, 1);
  const items = [];
  o.E.forEach((s, j) => { g.appendChild(Fig.marker(sx(o.em[j]), sy(s[0]), 5, 'triangle', { fill: cE, stroke: f.t.bg, 'stroke-width': 1 })); items.push({ x: sx(o.em[j]), y: sy(s[0]), text: cut9(o.envs[j], 12), r: 5, fill: Fig.darken(cE, 0.15) }); });
  o.G.forEach((s, i) => { g.appendChild(Fig.marker(sx(o.gm[i]), sy(s[0]), 4.4, 'circle', { fill: cG, stroke: f.t.bg, 'stroke-width': 1 })); items.push({ x: sx(o.gm[i]), y: sy(s[0]), text: cut9(o.genos[i], 12), r: 5, fill: Fig.darken(cG, 0.15) }); });
  f.g.appendChild(g);
  if (cfg.showLabels !== false) Fig.repelLabels(g, f, items, {});
  Fig.legend(f, [{ label: T('genotipos', 'genotypes'), color: cG, shape: 'circle' }, { label: T('ambientes', 'environments'), color: cE, shape: 'circle' }], cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- 5 · biplots ----------------
   o: { G, E (2-D coordinates), genos, envs, pct: [PC1 %, PC2 %], view, www, aec, cmp, labels } */
P9.biplot = (cfg0, o) => {
  const cfg = t9(cfg0, o.titleEs, o.titleEn);
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 74, right: 26, top: 56, bottom: o.note ? 92 : 74 } });
  const pts = o.G.concat(o.E, [[0, 0]]);
  if (o.aec && o.aec.ideal) pts.push(o.aec.ideal);
  let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  const padX = 0.1 * (x1 - x0 || 1), padY = 0.1 * (y1 - y0 || 1);
  x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
  /* the same number of pixels per unit on both axes */
  const W = f.x1 - f.x0, H = f.y1 - f.y0;
  const k = Math.min(W / (x1 - x0), H / (y1 - y0));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const dx = [cx - W / k / 2, cx + W / k / 2], dy = [cy - H / k / 2, cy + H / k / 2];
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || `${o.axisNames ? o.axisNames[0] : 'PC1'} (${fmtNum(o.pct[0], 1)} %)` }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || `${o.axisNames ? o.axisNames[1] : 'PC2'} (${fmtNum(o.pct[1], 1)} %)` }));
  const clipId = 'bp' + Math.random().toString(36).slice(2, 8);
  const defs = Fig.el('defs'); const cp = Fig.el('clipPath', { id: clipId }); cp.appendChild(Fig.el('rect', { x: f.x0, y: f.y0, width: W, height: H })); defs.appendChild(cp); f.g.appendChild(defs);
  const g = Fig.g({ 'clip-path': `url(#${clipId})` });
  const top = Fig.g();
  const cG = Fig.color(cfg.palette, 0), cE = Fig.color(cfg.palette, 1), cL = Fig.color(cfg.palette, 5);
  const muted = f.t.muted;
  g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(0), y2: sy(0), stroke: muted, 'stroke-width': 0.8, 'stroke-dasharray': '3 3' }));
  g.appendChild(Fig.el('line', { x1: sx(0), x2: sx(0), y1: f.y0, y2: f.y1, stroke: muted, 'stroke-width': 0.8, 'stroke-dasharray': '3 3' }));
  /* lines and circles are cut to the plotting area here, not by a clip path: the canvas grows to
     the bounding box of its content, and a clip path does not shrink that box */
  const far = 4 * Math.max(dx[1] - dx[0], dy[1] - dy[0]);
  const clipSeg = (x1, y1, x2, y2) => {                    /* Liang–Barsky, in pixels */
    let t0 = 0, t1 = 1;
    const ddx = x2 - x1, ddy = y2 - y1;
    const p = [-ddx, ddx, -ddy, ddy], q = [x1 - f.x0, f.x1 - x1, y1 - f.y0, f.y1 - y1];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return null; continue; }
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
    }
    return { x1: x1 + t0 * ddx, y1: y1 + t0 * ddy, x2: x1 + t1 * ddx, y2: y1 + t1 * ddy };
  };
  const seg = (a, b, attrs) => { const s = clipSeg(sx(a[0]), sy(a[1]), sx(b[0]), sy(b[1])); return s ? Fig.el('line', Object.assign(s, attrs)) : Fig.g(); };
  const ray = (ux, uy, attrs) => { const n = Math.hypot(ux, uy) || 1; return seg([0, 0], [far * ux / n, far * uy / n], attrs); };
  const line = (ux, uy, attrs) => { const n = Math.hypot(ux, uy) || 1; return seg([-far * ux / n, -far * uy / n], [far * ux / n, far * uy / n], attrs); };
  const circles = (c, radii) => radii.forEach(r => {
    const cx0 = sx(c[0]), cy0 = sy(c[1]), R = r * k;
    let d = '', pen = false;
    for (let s = 0; s <= 240; s++) {
      const a = 2 * Math.PI * s / 240, x = cx0 + R * Math.cos(a), y = cy0 + R * Math.sin(a);
      const inside = x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1;
      if (inside) { d += (pen ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); pen = true; } else pen = false;
    }
    if (d) g.appendChild(Fig.el('path', { d, fill: 'none', stroke: muted, 'stroke-width': 0.7, 'stroke-dasharray': '2 3' }));
  });
  const view = o.view || 'basic';
  const winners = new Set();
  if (view === 'www' && o.www) {
    const h = o.www.hull;
    g.appendChild(Fig.el('polygon', { points: h.map(i => `${sx(o.G[i][0])},${sy(o.G[i][1])}`).join(' '), fill: 'none', stroke: cL, 'stroke-width': 1.6 }));
    o.www.rays.forEach(r => g.appendChild(ray(r.nx, r.ny, { stroke: cL, 'stroke-width': 1.1, 'stroke-dasharray': '6 4' })));
    o.www.winner.forEach(w => winners.add(w));
  }
  if ((view === 'aec' || view === 'idealG' || view === 'discr' || view === 'idealE') && o.aec) {
    const u = o.aec.u;
    /* the average-environment axis, with an arrow toward the better end */
    g.appendChild(line(u[0], u[1], { stroke: f.t.fg, 'stroke-width': 1.5 }));
    const tip = Math.max(...o.G.concat(o.E).map(p => p[0] * u[0] + p[1] * u[1])) * 1.08;
    const tx = sx(tip * u[0]), ty = sy(tip * u[1]), ang = Math.atan2(-(u[1]), u[0]);
    const ah = 9, aw = 0.42;
    if (tx >= f.x0 && tx <= f.x1 && ty >= f.y0 && ty <= f.y1) g.appendChild(Fig.el('polygon', { points: `${tx},${ty} ${tx - ah * Math.cos(ang - aw)},${ty - ah * Math.sin(ang - aw)} ${tx - ah * Math.cos(ang + aw)},${ty - ah * Math.sin(ang + aw)}`, fill: f.t.fg }));
    if (view === 'aec') {
      g.appendChild(line(-u[1], u[0], { stroke: f.t.fg, 'stroke-width': 1, 'stroke-dasharray': '6 4' }));
      o.G.forEach(p => { const t = p[0] * u[0] + p[1] * u[1]; g.appendChild(seg(p, [t * u[0], t * u[1]], { stroke: cG, 'stroke-width': 0.8, 'stroke-dasharray': '2 2' })); });
    }
    if (view === 'idealG' && o.aec.ideal) {
      const dmax = Math.max(...o.aec.dist);
      circles(o.aec.ideal, [1, 2, 3, 4, 5, 6].map(q => q * dmax / 5));
    }
    if (view === 'idealE' && o.aec.ideal) {
      const dmax = Math.max(...o.aec.dist);
      circles(o.aec.ideal, [1, 2, 3, 4, 5, 6].map(q => q * dmax / 5));
    }
    if (view === 'discr') {
      const lmax = Math.max(...o.E.map(p => Math.hypot(p[0], p[1])));
      circles([0, 0], [1, 2, 3, 4].map(q => q * lmax / 4));
    }
  }
  if (view === 'compare' && o.cmp) {
    const A = o.G[o.cmp.a], B = o.G[o.cmp.b];
    g.appendChild(seg(A, B, { stroke: cL, 'stroke-width': 1.6 }));
    g.appendChild(line(-(B[1] - A[1]), B[0] - A[0], { stroke: cL, 'stroke-width': 1.2, 'stroke-dasharray': '6 4' }));
  }
  /* environments as vectors from the origin (not in the views about genotypes) */
  const envVectors = view !== 'aec' && view !== 'idealG' && view !== 'compare';
  const items = [];
  o.E.forEach((p, j) => {
    if (envVectors) g.appendChild(Fig.el('line', { x1: sx(0), y1: sy(0), x2: sx(p[0]), y2: sy(p[1]), stroke: Fig.alpha(cE, 0.7), 'stroke-width': 1 }));
    const m = Fig.marker(sx(p[0]), sy(p[1]), 4.6, 'triangle', { fill: cE, stroke: f.t.bg, 'stroke-width': 0.8 });
    m.appendChild(Fig.el('title', {}, `${o.envs[j]} · (${fmtNum(p[0], 3)}, ${fmtNum(p[1], 3)})`));
    top.appendChild(m);
    items.push({ x: sx(p[0]), y: sy(p[1]), text: cut9(o.envs[j], 12), r: 5, fill: Fig.darken(cE, 0.2) });
  });
  const hot = new Set(o.highlight || []);
  o.G.forEach((p, i) => {
    const on = winners.has(i) || hot.has(i) || (view === 'compare' && o.cmp && (i === o.cmp.a || i === o.cmp.b));
    const m = Fig.marker(sx(p[0]), sy(p[1]), on ? 5.2 : 4.2, 'circle', { fill: on ? cL : cG, stroke: f.t.bg, 'stroke-width': 1 });
    m.appendChild(Fig.el('title', {}, `${o.genos[i]} · (${fmtNum(p[0], 3)}, ${fmtNum(p[1], 3)})`));
    top.appendChild(m);
    items.push({ x: sx(p[0]), y: sy(p[1]), text: cut9(o.genos[i], 12), r: 5, fill: on ? Fig.darken(cL, 0.2) : Fig.darken(cG, 0.2), weight: on ? 'bold' : null });
  });
  if ((view === 'idealG' || view === 'idealE') && o.aec && o.aec.ideal) {
    const q = o.aec.ideal;
    top.appendChild(Fig.marker(sx(q[0]), sy(q[1]), 6.5, 'diamond', { fill: 'none', stroke: f.t.fg, 'stroke-width': 1.6 }));
    items.push({ x: sx(q[0]), y: sy(q[1]), text: view === 'idealG' ? T('ideal', 'ideal') : T('ideal', 'ideal'), r: 7, fill: f.t.fg, weight: 'bold' });
  }
  f.g.appendChild(g); f.g.appendChild(top);
  if (cfg.showLabels !== false) Fig.repelLabels(top, f, items, {});
  const leg = [{ label: T('genotipos', 'genotypes'), color: cG, shape: 'circle' }, { label: T('ambientes', 'environments'), color: cE, shape: 'circle' }];
  if (view === 'www') leg.push({ label: T('ganadores (vértices)', 'winners (vertices)'), color: cL, shape: 'circle' });
  Fig.legend(f, leg, cfg, { pos: 'bottom' });
  if (o.note) f.g.appendChild(Fig.text(f.x1, f.y1 + 80, o.note, { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

window.P9 = P9;
