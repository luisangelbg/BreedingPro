/* BreedingPro — Block 8 figures: heritability of every trait with its confidence interval,
   the correlation matrix as a heat map, the expected gain per trait of every selection
   index, and the gain per cycle and per year of the recurrent-selection methods. */

const P8 = {};
const t8 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const cut8 = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ---------------- 1 · heritability with its interval ---------------- */
P8.h2 = (cfg0, rows, o) => {
  const cfg = t8(cfg0, 'Heredabilidad en base de medias', 'Entry-mean heritability');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const items = rows.filter(r => isFinite(r.h2));
  const labels = items.map(r => cut8(r.name, 16));
  const lo = Math.min(0, ...items.map(r => (isFinite(r.lo) ? r.lo : r.h2)));
  const C = Fig.bandPlot(svg, cfg, labels, [Math.max(-1, Math.floor(lo * 10) / 10), 1], { catLabel: '', valueLabel: 'H²', padding: 0.34, margin: { right: 50 } });
  const f = C.f, g = Fig.g();
  /* the conventional classes of Robinson et al. (1949): low below 0.3, high above 0.6 */
  if (cfg.showClasses !== false) {
    g.appendChild(C.span(0.3, 0.6, { fill: Fig.alpha(f.t.muted, 0.08) }));
    [0.3, 0.6].forEach(v => g.appendChild(C.ref(v, { stroke: f.t.muted, 'stroke-dasharray': '3 4', 'stroke-width': 0.8 })));
  }
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1 }));
  items.forEach((r, i) => {
    const col = Fig.color(cfg.palette, 0);
    g.appendChild(C.bar(i, Math.max(0, r.h2), { fill: Fig.alpha(col, 0.8), rx: 2 }));
    if (isFinite(r.lo) && isFinite(r.hi)) {
      const d0 = Math.min(C.dom[0], C.dom[1]), pos = C.center(i), cap = Math.min(6, C.bw * 0.18);
      const attrs = { stroke: f.t.fg, 'stroke-width': 1.1 };
      if (r.lo >= d0) g.appendChild(C.whisker(pos, r.lo, r.hi, cap, attrs));
      else {
        /* a lower limit beyond the axis: the line runs to the edge and ends in an arrow */
        g.appendChild(C.line(pos, d0, pos, r.hi, attrs));
        g.appendChild(C.line(pos - cap, r.hi, pos + cap, r.hi, attrs));
        const [x, y] = C.P(pos, d0);
        g.appendChild(Fig.el('polygon', { points: C.flip ? `${x},${y} ${x + 7},${y - 4} ${x + 7},${y + 4}` : `${x},${y} ${x - 4},${y - 7} ${x + 4},${y - 7}`, fill: f.t.fg }));
      }
    }
    g.appendChild(C.edgeText(C.center(i), fmtFixed(r.h2, 2), { size: 10, fill: f.t.fg }));
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 2 · correlation matrix ---------------- */
P8.corr = (cfg0, names, R, o) => {
  const kind = o.kind === 'P' ? ['fenotípicas', 'Phenotypic'] : o.kind === 'E' ? ['ambientales', 'Environmental'] : o.kind === 'G' ? ['genotípicas', 'Genotypic'] : null;
  const cfg = t8(cfg0, kind ? `Correlaciones ${kind[0]}` : 'Correlaciones', kind ? `${kind[1]} correlations` : 'Correlations');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const n = names.length;
  const labW = Math.min(130, 16 + 7 * Math.max(...names.map(x => cut8(x, 14).length)));
  const f = Fig.frame(svg, cfg, { margin: { left: labW + 20, right: 120, top: 60 + Math.min(90, 6.4 * Math.max(...names.map(x => cut8(x, 12).length))), bottom: 50 } });
  const cell = Math.max(16, Math.min((f.x1 - f.x0) / n, (f.y1 - f.y0) / n, 64));
  const ramp = Fig.colormaps[cfg.colormap] || Fig.colormaps.rdbu;
  const g = Fig.g();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = R[i][j];
    const x = f.x0 + j * cell, y = f.y0 + i * cell;
    if (!isFinite(v)) { g.appendChild(Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: 'none', stroke: f.t.grid === 'none' ? f.t.axis : f.t.grid, 'stroke-dasharray': '2 2' })); continue; }
    const fill = ramp(0.5 + 0.5 * Math.max(-1, Math.min(1, v)));
    const rect = Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill, rx: 3 });
    rect.appendChild(Fig.el('title', {}, `${names[i]} · ${names[j]} · r = ${fmtFixed(v, 3)}${o.se && isFinite(o.se[i][j]) && i !== j ? ' ± ' + fmtFixed(o.se[i][j], 3) : ''}`));
    g.appendChild(rect);
    if (cell >= 26 && i !== j) g.appendChild(Fig.text(x + cell / 2, y + cell / 2 + 3.5, (Math.abs(v) > 1 ? '>' : '') + fmtFixed(v, 2), { size: Math.min(10.5, cell * 0.28), anchor: 'middle', fill: Fig.onColor(fill), font: f.font, role: 'label' }));
  }
  const fs = Math.max(7, Math.min(11, cell * 0.4));
  names.forEach((nm, i) => {
    g.appendChild(Fig.text(f.x0 - 6, f.y0 + i * cell + cell / 2 + fs * 0.35, cut8(nm, 14), { size: fs, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' }));
    g.appendChild(Fig.text(f.x0 + i * cell + cell / 2 + fs * 0.35, f.y0 - 6, cut8(nm, 12), { size: fs, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -60, role: 'tick' }));
  });
  f.g.appendChild(g);
  f.x1 = f.x0 + n * cell; f.y1 = f.y0 + n * cell;
  P3.colorbar(f, cfg, -1, 1, ramp, 'r');
  if (o.note) f.g.appendChild(Fig.text(f.x0, f.y1 + 26, o.note, { size: 10.5, fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

/* ---------------- 3 · expected gains of every index ---------------- */
P8.indexGains = (cfg0, list, traits, o) => {
  const cfg = t8(cfg0, 'Ganancia esperada por variable', 'Expected gain per trait');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const labels = traits.map(t => cut8(t, 14));
  const vals = [];
  list.forEach(ix => ix.pct.forEach(v => vals.push(v)));
  const lo = Math.min(0, ...vals.filter(isFinite)), hi = Math.max(0, ...vals.filter(isFinite));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(lo, hi, true), { catLabel: '', valueLabel: T('ganancia esperada (% de la media)', 'expected gain (% of the mean)'), padding: 0.22, legendBottom: true });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1 }));
  const k = list.length, w = C.bw / k;
  list.forEach((ix, q) => {
    const col = Fig.color(cfg.palette, q);
    ix.pct.forEach((v, j) => {
      if (!isFinite(v)) return;
      const r = C.rect(C.start(j) + q * w, w * 0.92, 0, v, { fill: Fig.alpha(col, 0.85), rx: 1.5 });
      r.appendChild(Fig.el('title', {}, `${ix.name} · ${traits[j]} · ${fmtNum(v, 2)} %`));
      g.appendChild(r);
    });
  });
  f.g.appendChild(g);
  Fig.legend(f, list.map((ix, q) => ({ label: ix.name, color: Fig.color(cfg.palette, q) })), cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- 4 · gain per cycle and per year ---------------- */
P8.gains = (cfg0, rows, o) => {
  const cfg = t8(cfg0, 'Ganancia esperada por método de selección', 'Expected gain by selection method');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const labels = rows.map(r => cut8(r.short || r.name, 34));
  const field = cfg.show === 'cycle' ? 'gc' : 'gy';
  const vals = rows.map(r => r[field]);
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(0, Math.max(...vals), true), { catLabel: '', valueLabel: cfg.show === 'cycle' ? T('ganancia por ciclo', 'gain per cycle') : T('ganancia por año', 'gain per year'), padding: 0.3, margin: { right: 60 } });
  const f = C.f, g = Fig.g();
  const best = Math.max(...vals);
  rows.forEach((r, i) => {
    const col = Fig.color(cfg.palette, r[field] === best ? 5 : 0);
    g.appendChild(C.bar(i, r[field], { fill: Fig.alpha(col, 0.85), rx: 2 }));
    g.appendChild(C.edgeText(C.center(i), fmtNum(r[field], 2), { size: 10, fill: f.t.fg }));
  });
  f.g.appendChild(g);
  return svg;
};

window.P8 = P8;
