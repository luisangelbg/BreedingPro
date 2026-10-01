/* BreedingPro — Block 6 figures: the rectangular grid of specific effects of a factorial
   or of a line × tester, the sums against the differences of North Carolina III and the
   triple test cross, the epistasis contrast of every individual, and how each source of
   variation contributes to the variation among crosses. */

const P6 = {};
const t6 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const cut6 = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ---------------- 1 · grid of specific effects (rows × columns) ---------------- */
P6.grid = (cfg0, o) => {
  const cfg = t6(cfg0, 'Efectos de aptitud combinatoria específica', 'Specific combining ability effects');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const rows = o.rows, cols = o.cols, nr = rows.length, nc = cols.length;
  const labW = Math.min(150, 16 + 7 * Math.max(...rows.map(x => cut6(x, 18).length)));
  const labH = Math.min(110, 14 + 6.4 * Math.max(...cols.map(x => cut6(x, 14).length)));
  const f = Fig.frame(svg, cfg, { margin: { left: labW + 28, right: 120, top: 50 + labH, bottom: 70 } });
  const cell = Math.max(14, Math.min((f.x1 - f.x0) / nc, (f.y1 - f.y0) / nr, 64));
  const vals = o.cells.filter(c => isFinite(c.est)).map(c => Math.abs(c.est));
  const mx = vals.length ? Math.max(...vals) : 1;
  const ramp = Fig.colormaps[cfg.colormap] || Fig.colormaps.rdbu;
  const ink = v => ramp(0.5 + 0.5 * Math.max(-1, Math.min(1, v / mx)));
  const byKey = new Map(o.cells.map(c => [c.i + '|' + c.j, c]));
  const g = Fig.g();
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
    const x = f.x0 + j * cell, y = f.y0 + i * cell;
    const c = byKey.get(i + '|' + j);
    if (!c || !isFinite(c.est)) {
      g.appendChild(Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: 'none', stroke: f.t.grid === 'none' ? f.t.axis : f.t.grid, 'stroke-dasharray': '2 2' }));
      continue;
    }
    const fill = ink(c.est);
    const rect = Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill, rx: 3 });
    rect.appendChild(Fig.el('title', {}, `${rows[i]} × ${cols[j]} · ${fmtNum(c.est, 3)} ± ${fmtNum(c.se, 3)}${isFinite(c.p) ? ' · ' + pEq(c.p) : ''}`));
    g.appendChild(rect);
    if (cfg.showValues !== false && cell >= 28) {
      g.appendChild(Fig.text(x + cell / 2, y + cell / 2 + 3.5, fmtNum(c.est, Math.abs(c.est) >= 100 ? 0 : 1) + P4.starOf(c.p), { size: Math.min(10.5, cell * 0.26), anchor: 'middle', fill: Fig.onColor(fill), font: f.font, role: 'label' }));
    } else if (cell >= 14 && P4.starOf(c.p)) {
      g.appendChild(Fig.text(x + cell / 2, y + cell / 2 + 3, P4.starOf(c.p), { size: Math.min(10, cell * 0.4), anchor: 'middle', fill: Fig.onColor(fill), font: f.font }));
    }
  }
  const fs = Math.max(7, Math.min(11, cell * 0.42));
  rows.forEach((nm, i) => g.appendChild(Fig.text(f.x0 - 6, f.y0 + i * cell + cell / 2 + fs * 0.35, cut6(nm, 18), { size: fs, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' })));
  cols.forEach((nm, j) => g.appendChild(Fig.text(f.x0 + j * cell + cell / 2 + fs * 0.35, f.y0 - 6, cut6(nm, 14), { size: fs, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -60, role: 'tick' })));
  f.g.appendChild(g);
  f.x1 = f.x0 + nc * cell; f.y1 = f.y0 + nr * cell;
  svg.setAttribute('data-plot', [f.x0, f.y0, nc * cell, nr * cell].map(v => +v.toFixed(2)).join(' '));   /* the cells are the plot area (figure studio) */
  P3.colorbar(f, cfg, -mx, mx, ramp, o.label || T('efecto', 'effect'));
  f.g.appendChild(Fig.text(f.x0, f.y1 + 34, `${o.rowTitle || T('fila', 'row')} × ${o.colTitle || T('columna', 'column')} · * p < 0.05  ** p < 0.01  *** p < 0.001`, { size: 10.5, fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

/* ---------------- 2 · sums against differences (NC III and triple test cross) ---------------- */
/* the variation of the sums measures the additive component and that of the differences the
   dominance component; the slope carries the sign of Σ a·d */
P6.sumsDiff = (cfg0, sd, o) => {
  const cfg = t6(cfg0, 'Sumas y diferencias de cada individuo', 'Sums and differences of every individual');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const pts = sd.plants.filter(p => isFinite(p.sum) && isFinite(p.diff));
  const xs = pts.map(p => p.sum), ys = pts.map(p => p.diff);
  const dx = Fig.niceDomain(Math.min(...xs), Math.max(...xs));
  const dy = Fig.niceDomain(Math.min(...ys, 0), Math.max(...ys, 0));
  const f = Fig.frame(svg, cfg, { margin: { left: 82, right: 168, top: 56, bottom: 66 } });
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || T('Suma L₁ + L₂', 'Sum L₁ + L₂') }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || T('Diferencia L₁ − L₂', 'Difference L₁ − L₂') }));
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(Math.max(dy[0], Math.min(dy[1], 0))), y2: sy(Math.max(dy[0], Math.min(dy[1], 0))), stroke: f.t.muted, 'stroke-dasharray': '4 4' }));
  /* the fitted line of the differences on the sums */
  const mx = S.mean(xs), my = S.mean(ys);
  let sxy = 0, sxx = 0;
  pts.forEach(p => { sxy += (p.sum - mx) * (p.diff - my); sxx += (p.sum - mx) * (p.sum - mx); });
  const b = sxx > 0 ? sxy / sxx : NaN, a = my - b * mx;
  if (isFinite(b) && cfg.showFit !== false) {
    g.appendChild(Fig.el('line', { x1: sx(dx[0]), y1: sy(Math.max(dy[0], Math.min(dy[1], a + b * dx[0]))), x2: sx(dx[1]), y2: sy(Math.max(dy[0], Math.min(dy[1], a + b * dx[1]))), stroke: Fig.color(cfg.palette, 0), 'stroke-width': 2 }));
  }
  const sets = [...new Set(pts.map(p => p.set))];
  pts.forEach(p => {
    const k = Math.max(0, sets.indexOf(p.set));
    const m = Fig.marker(sx(p.sum), sy(p.diff), 4.4, Fig.shapes[k % Fig.shapes.length], { fill: Fig.alpha(Fig.color(cfg.palette, sets.length > 1 ? k + 1 : 3), 0.85), stroke: f.t.bg, 'stroke-width': 0.8 });
    m.appendChild(Fig.el('title', {}, `${p.plant}${p.set ? ' · ' + p.set : ''} · ${T('suma', 'sum')} ${fmtNum(p.sum, 3)} · ${T('diferencia', 'difference')} ${fmtNum(p.diff, 3)}`));
    g.appendChild(m);
  });
  f.g.appendChild(g);
  if (cfg.labels !== 0) {
    const worst = pts.map(p => ({ p, d: Math.abs(p.diff - my) })).sort((x, y2) => y2.d - x.d).slice(0, +(cfg.labels == null ? 6 : cfg.labels));
    Fig.repelLabels(g, f, worst.map(w => ({ x: sx(w.p.sum), y: sy(w.p.diff), text: cut6(w.p.plant, 12), r: 4.4 })), { obstacles: pts.map(p => ({ x: sx(p.sum), y: sy(p.diff), r: 4 })) });
  }
  const notes = [
    `σ²A = ${fmtNum(sd.s2A, 3)} ± ${fmtNum(sd.seA, 3)}`,
    `σ²D = ${fmtNum(sd.s2D, 3)} ± ${fmtNum(sd.seD, 3)}`,
    isFinite(sd.dominance) ? T(`√(H/D) = ${fmtFixed(sd.dominance, 2)}`, `√(H/D) = ${fmtFixed(sd.dominance, 2)}`) : '',
    `r(${T('suma', 'sum')}, ${T('dif.', 'diff.')}) = ${fmtFixed(sd.corSD, 3)}`,
    isFinite(sd.pCor) ? `${pEq(sd.pCor)}` : '',
    !isFinite(sd.pCor) || sd.pCor >= 0.05 ? T('sin dirección definida', 'no defined direction')
      : sd.corSD < 0 ? T(`dominancia hacia ${sd.testers[0]}`, `dominance towards ${sd.testers[0]}`)
        : T(`dominancia hacia ${sd.testers[1]}`, `dominance towards ${sd.testers[1]}`),
  ].filter(Boolean);
  if (cfg.legendPos !== 'none') {
    const lg = f.g.appendChild(Fig.g({ 'data-role': 'legend' }));   /* notes and key in one group for the figure studio; data-li = entry */
    notes.forEach((s, k) => lg.appendChild(Fig.text(f.x1 + 16, f.y0 + 14 + k * 16, s, { size: 10.5, fill: k === notes.length - 1 ? f.t.muted : f.t.fg, font: f.font, role: 'legend' })));
    if (sets.length > 1) {
      sets.forEach((s, k) => {
        const yy = f.y0 + 26 + notes.length * 16 + k * 16;
        lg.appendChild(Fig.marker(f.x1 + 24, yy - 4, 4.4, Fig.shapes[k % Fig.shapes.length], { fill: Fig.alpha(Fig.color(cfg.palette, k + 1), 0.85), stroke: f.t.bg, 'stroke-width': 0.8, 'data-li': k }));
        lg.appendChild(Fig.text(f.x1 + 34, yy, T(`conjunto ${s}`, `set ${s}`), { size: 10, fill: f.t.fg, font: f.font, role: 'legend' })).setAttribute('data-li', k);
      });
    }
  }
  return svg;
};

/* ---------------- 3 · the epistasis contrast of every individual ---------------- */
P6.epistasis = (cfg0, sd, o) => {
  const cfg = t6(cfg0, 'Epistasis: L₁ + L₂ − 2L₃ de cada individuo', 'Epistasis: L₁ + L₂ − 2L₃ of every individual');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const pts = sd.plants.filter(p => isFinite(p.epi));
  const se = Math.sqrt(6 * sd.mse / sd.r);
  const items = pts.slice().sort((a, b) => (cfg.order === 'name' ? LM.natCmp(a.plant, b.plant) : b.epi - a.epi));
  const lo = Math.min(0, ...items.map(p => p.epi)) - se, hi = Math.max(0, ...items.map(p => p.epi)) + se;
  const C = Fig.bandPlot(svg, cfg, items.map(p => cut6(p.plant, 14)), Fig.niceDomain(lo, hi, true), { catLabel: T('Individuo', 'Individual'), valueLabel: o.label || T('contraste', 'contrast'), padding: 0.3, margin: { right: 186 } });
  const f = C.f, g = Fig.g();
  const tcrit = o.tcrit || 1.96;
  /* the band where a contrast is no larger than its own error */
  g.appendChild(C.span(-tcrit * se, tcrit * se, { fill: Fig.alpha(f.t.muted, 0.12) }));
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1 }));
  [-tcrit * se, tcrit * se].forEach(v => g.appendChild(C.ref(v, { stroke: f.t.muted, 'stroke-width': 1, 'stroke-dasharray': '5 4' })));
  items.forEach((p, i) => {
    const sig = Math.abs(p.epi) > tcrit * se;
    const col = Fig.color(cfg.palette, sig ? 5 : 0);
    g.appendChild(C.bar(i, p.epi, { fill: Fig.alpha(col, sig ? 0.9 : 0.6), rx: 2 }));
  });
  f.g.appendChild(g);
  const notes = [
    T(`epistasis media = ${fmtNum(sd.epistasis.mean, 3)} ± ${fmtNum(sd.epistasis.seMean, 3)}`, `mean epistasis = ${fmtNum(sd.epistasis.mean, 3)} ± ${fmtNum(sd.epistasis.seMean, 3)}`),
    `t = ${fmtFixed(sd.epistasis.tOverall, 2)} · ${pEq(sd.epistasis.pOverall)}`,
    T(`entre individuos F = ${fmtFixed(sd.epistasis.among.F, 2)} · ${pEq(sd.epistasis.among.p)}`, `among individuals F = ${fmtFixed(sd.epistasis.among.F, 2)} · ${pEq(sd.epistasis.among.p)}`),
    T(`líneas: ± ${fmtFixed(tcrit, 2)} EE de un contraste`, `lines: ± ${fmtFixed(tcrit, 2)} SE of one contrast`),
  ];
  if (cfg.legendPos !== 'none') notes.forEach((s, k) => f.g.appendChild(Fig.text(f.x1 + 16, f.y0 + 14 + k * 16, s, { size: 10.5, fill: k === notes.length - 1 ? f.t.muted : f.t.fg, font: f.font, role: 'legend' })));
  return svg;
};

/* ---------------- 4 · contribution of every source to the crosses ---------------- */
P6.contribution = (cfg0, rows, o) => {
  const cfg = t6(cfg0, 'Aporte de cada fuente a la variación entre cruzas', 'Contribution of every source to the variation among crosses');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const items = rows.filter(r => isFinite(r.pct));
  const labels = items.map(r => T(o.names[r.source] || { es: r.source, en: r.source }));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(0, Math.max(...items.map(r => r.pct)), true), { catLabel: '', valueLabel: T('% de la suma de cuadrados', '% of the sum of squares'), padding: 0.32 });
  const f = C.f, g = Fig.g();
  items.forEach((r, i) => {
    const col = Fig.color(cfg.palette, i);
    g.appendChild(C.bar(i, r.pct, { fill: Fig.alpha(col, 0.85), rx: 3 }));
    const [tx, ty] = C.P(C.center(i), r.pct);
    g.appendChild(Fig.text(tx + (cfg.flip ? 8 : 0), ty + (cfg.flip ? 4 : -8), fmtNum(r.pct, 1) + ' %', { size: 10.5, anchor: cfg.flip ? 'start' : 'middle', fill: f.t.fg, font: f.font, role: 'label' }));
  });
  f.g.appendChild(g);
  return svg;
};

window.P6 = P6;
