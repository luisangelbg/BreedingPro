/* BreedingPro — Block 2 figures: crossing matrix, generation pedigree, season
   calendar, field map and power curves. All drawn with the Fig engine, so they
   are editable and export at publication resolution. Every text goes through T(),
   and Fig.remountAll redraws them when the language changes. */

const P2 = {};

/* ---------------- entry types: colour and name ---------------- */
P2.TYPES = {
  F1: { i: 0, es: 'F₁ directa', en: 'F₁ (direct)' },
  parent: { i: 1, es: 'progenitor', en: 'parent' },
  FS: { i: 2, es: 'familia de hermanos completos', en: 'full-sib family' },
  reciprocal: { i: 3, es: 'recíproca', en: 'reciprocal' },
  line: { i: 4, es: 'línea', en: 'line' },
  tester: { i: 5, es: 'probador', en: 'tester' },
  L1: { i: 0, es: '× P₁', en: '× P₁' },
  L2: { i: 1, es: '× P₂', en: '× P₂' },
  L3: { i: 2, es: '× F₁', en: '× F₁' },
  check: { i: 9, es: 'testigo', en: 'check' },
};
P2.GEN_INDEX = { P1: 0, P2: 1, F1: 2, F2: 3, BC1: 4, BC2: 5, RF1: 6, F3: 7, BC1S: 8, BC2S: 9 };
P2.typeColor = (cfg, e) => {
  if (e.type === 'generation') return Fig.color(cfg.palette, P2.GEN_INDEX[e.generation] || 0);
  const t = P2.TYPES[e.type] || P2.TYPES.F1;
  return Fig.color(cfg.palette, t.i);
};
P2.typeName = e => e.type === 'generation' ? e.generation : T(P2.TYPES[e.type] || { es: e.type, en: e.type });
const withTitle = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const shorten = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

P2.paletteControl = () => ({ key: 'palette', label: T('Paleta', 'Palette'), type: 'select', options: Object.entries(Fig.paletteNames) });
P2.titleControl = () => ({ key: 'title', label: T('Título (vacío = automático)', 'Title (empty = automatic)'), type: 'text' });

/* ---------------- 1 · crossing matrix ---------------- */
P2.crossMatrix = (cfg0, plan) => {
  const cfg = withTitle(cfg0, 'Plan de cruzamientos', 'Crossing plan');
  const M = plan.matrix;
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const rowLab = Math.min(150, 14 + 7 * Math.max(...M.rows.map(x => String(x).length)));
  const colLab = Math.min(120, 14 + 6.5 * Math.max(...M.cols.map(x => String(x).length)));
  const f = Fig.frame(svg, cfg, { margin: { left: rowLab + 34, right: 30, top: 60 + colLab, bottom: 64 } });
  const nr = M.rows.length, nc = M.cols.length;
  const cell = Math.min((f.x1 - f.x0) / nc, (f.y1 - f.y0) / nr);
  const gx = f.x0, gy = f.y0;
  const g = Fig.g();
  const typeOfCell = t => ({ type: t, generation: null });
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
    const t = M.cells[i][j];
    const x = gx + j * cell, y = gy + i * cell;
    if (!t) { g.appendChild(Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: 'none', stroke: f.t.grid === 'none' ? f.t.axis : f.t.grid, 'stroke-dasharray': '2 2', rx: Math.min(4, cell / 6) })); continue; }
    g.appendChild(Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: P2.typeColor(cfg, typeOfCell(t)), rx: Math.min(4, cell / 6), opacity: t === 'reciprocal' ? 0.85 : 1 }));
    if (cfg.showSymbols !== false && cell >= 18) {
      const sym = t === 'parent' ? '⊗' : t === 'reciprocal' ? 'R' : t === 'F1' || t === 'FS' ? '×' : t.replace('L', '');
      g.appendChild(Fig.text(x + cell / 2, y + cell / 2 + Math.min(12, cell * 0.42) * 0.36, sym, { size: Math.min(12, cell * 0.42), anchor: 'middle', fill: Fig.onColor(P2.typeColor(cfg, typeOfCell(t))), font: f.font, weight: 'bold' }));
    }
  }
  const fsz = Math.max(7, Math.min(11, cell * 0.55));
  M.rows.forEach((r, i) => g.appendChild(Fig.text(gx - 6, gy + i * cell + cell / 2 + fsz * 0.35, shorten(r, 20), { size: fsz, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' })));
  M.cols.forEach((c, j) => g.appendChild(Fig.text(gx + j * cell + cell / 2 + fsz * 0.35, gy - 6, shorten(c, 18), { size: fsz, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -60, role: 'tick' })));
  g.appendChild(Fig.text(gx - rowLab - 18, gy + nr * cell / 2, T(M.rowTitle), { size: 12, anchor: 'middle', fill: f.t.muted, font: f.font, rotate: -90, role: 'axis', weight: 'bold' }));
  g.appendChild(Fig.text(gx + nc * cell / 2, gy - colLab - 14, T(M.colTitle), { size: 12, anchor: 'middle', fill: f.t.muted, font: f.font, role: 'axis', weight: 'bold' }));
  if (M.note) g.appendChild(Fig.text(gx + nc * cell, gy + nr * cell + 16, '(' + T(M.note) + ')', { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, italic: true }));
  f.g.appendChild(g);
  const present = [...new Set(M.cells.flat().filter(Boolean))];
  f.y1 = gy + nr * cell; f.axisDepth = 30;
  Fig.legend(f, present.map(t => ({ label: T(P2.TYPES[t] || { es: t, en: t }), color: P2.typeColor(cfg, typeOfCell(t)) })), cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- 2 · generations pedigree ---------------- */
P2.pedigree = (cfg0, plan) => {
  const cfg = withTitle(cfg0, 'Generaciones y su origen', 'Generations and their origin');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 30, right: 30, top: 60, bottom: 30 } });
  const has = new Set(plan.entries.filter(e => e.type === 'generation').map(e => e.generation));
  const level = { P1: 0, P2: 0, F1: 1, RF1: 1, F2: 2, BC1: 2, BC2: 2, F3: 3, BC1S: 3, BC2S: 3 };
  const order = { P1: 0, P2: 3, F1: 1, RF1: 2, BC1: 0, F2: 1.5, BC2: 3, BC1S: 0, F3: 1.5, BC2S: 3 };
  const levels = Math.max(...[...has].map(g => level[g])) + 1;
  const W = f.x1 - f.x0, Hh = f.y1 - f.y0;
  const pos = g => ({ x: f.x0 + W * (0.12 + 0.76 * order[g] / 3), y: f.y0 + Hh * (levels === 1 ? 0.5 : level[g] / (levels - 1) * 0.8 + 0.1) });
  const edges = [['P1', 'F1'], ['P2', 'F1'], ['P1', 'RF1'], ['P2', 'RF1'], ['F1', 'F2'], ['F1', 'BC1'], ['P1', 'BC1'], ['F1', 'BC2'], ['P2', 'BC2'], ['F2', 'F3'], ['BC1', 'BC1S'], ['BC2', 'BC2S']];
  const g = Fig.g();
  const defs = Fig.el('defs', {});
  const mark = Fig.el('marker', { id: 'p2arrow', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto' });
  mark.appendChild(Fig.el('path', { d: 'M0 0 L8 4 L0 8 z', fill: f.t.muted }));
  defs.appendChild(mark); svg.insertBefore(defs, svg.firstChild.nextSibling);
  const R = Math.min(34, Hh / (levels * 3.2));
  edges.forEach(([a, b]) => {
    if (!has.has(b) || !(has.has(a) || a === 'P1' || a === 'P2' || a === 'F1')) return;
    const A = pos(a), B = pos(b);
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    g.appendChild(Fig.el('line', { x1: A.x + dx / d * R, y1: A.y + dy / d * R, x2: B.x - dx / d * (R + 4), y2: B.y - dy / d * (R + 4), stroke: f.t.muted, 'stroke-width': 1.6, 'marker-end': 'url(#p2arrow)' }));
  });
  const entries = plan.entries.filter(e => e.type === 'generation');
  ['P1', 'P2', 'F1'].forEach(gname => { if (!has.has(gname)) entries.push({ type: 'generation', generation: gname, ghost: true }); });
  entries.forEach(e => {
    const P = pos(e.generation), col = P2.typeColor(cfg, e);
    g.appendChild(Fig.el('circle', { cx: P.x, cy: P.y, r: R, fill: e.ghost ? 'none' : col, stroke: e.ghost ? f.t.muted : 'none', 'stroke-dasharray': e.ghost ? '4 3' : null, 'stroke-width': 1.4 }));
    const label = e.generation.replace(/(\D+)(\d)(S?)$/, (m0, a, n, s) => a + '₀₁₂₃₄₅₆₇₈₉'[+n] + (s || ''));
    g.appendChild(Fig.text(P.x, P.y + 5, label, { size: Math.min(15, R * 0.55), anchor: 'middle', fill: e.ghost ? f.t.muted : Fig.onColor(col), font: f.font, weight: 'bold' }));
    if (!e.ghost && cfg.showPlants !== false) g.appendChild(Fig.text(P.x, P.y + R + 16, `${e.plants} ${T('plantas', 'plants')}`, { size: 12, anchor: 'middle', fill: f.t.fg, font: f.font, halo: f.t.bg, haloWidth: 4 }));
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 3 · season calendar ---------------- */
P2.timeline = (cfg0, seasons) => {
  const cfg = withTitle(cfg0, 'Calendario por ciclos de cultivo', 'Calendar by growing season');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 20, right: 20, top: 58, bottom: 20 } });
  const n = seasons.length, gap = 26;
  const w = (f.x1 - f.x0 - gap * (n - 1)) / n, h = f.y1 - f.y0;
  const g = Fig.g();
  const fs = 15 * Fig.fs('label');
  const wrap = (str, width) => {
    const maxChars = Math.max(10, Math.floor(width / (fs * 0.52))), words = String(str).split(' '), lines = [];
    let line = '';
    words.forEach(wd => { if ((line + ' ' + wd).trim().length > maxChars) { if (line) lines.push(line); line = wd; } else line = (line + ' ' + wd).trim(); });
    if (line) lines.push(line);
    return lines;
  };
  seasons.forEach((s, i) => {
    const x = f.x0 + i * (w + gap), col = Fig.color(cfg.palette, i === n - 1 ? 2 : (i % 2 ? 1 : 0));
    g.appendChild(Fig.el('rect', { x, y: f.y0, width: w, height: h, rx: 12, fill: f.t.bg, stroke: col, 'stroke-width': 2 }));
    g.appendChild(Fig.el('path', { d: `M${x} ${f.y0 + 12} a12 12 0 0 1 12 -12 h${w - 24} a12 12 0 0 1 12 12 v38 h${-w} z`, fill: col }));
    g.appendChild(Fig.text(x + 14, f.y0 + 20, `${T('Ciclo', 'Season')} ${i + 1}`, { size: 12, fill: Fig.onColor(col), font: f.font, weight: 'bold' }));
    g.appendChild(Fig.text(x + 14, f.y0 + 39, shorten(T(s.title), Math.floor(w / 8.5)), { size: 15, fill: Fig.onColor(col), font: f.font, weight: 'bold', role: 'title' }));
    let y = f.y0 + 74;
    s.tasks.forEach(t => {
      const lines = wrap(T(t), w - 36);
      g.appendChild(Fig.el('circle', { cx: x + 17, cy: y - fs * 0.33, r: 3, fill: col }));
      lines.forEach(line => { g.appendChild(Fig.text(x + 27, y, line, { size: 15, fill: f.t.fg, font: f.font })); y += fs * 1.35; });
      y += fs * 0.5;
    });
    if (i < n - 1) g.appendChild(Fig.el('path', { d: `M${x + w + 5} ${f.y0 + h / 2} l${gap - 12} 0 m-6 -6 l6 6 l-6 6`, stroke: f.t.muted, 'stroke-width': 2, fill: 'none' }));
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 4 · field map ---------------- */
P2.fieldMap = (cfg0, field, locIndex) => {
  const L = field.locations[locIndex || 0];
  const cfg = withTitle(cfg0, `Croquis de campo · ${L.name}`, `Field map · ${L.name}`);
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 56, right: 24, top: 56, bottom: 70 } });
  const cw = Math.min(92, (f.x1 - f.x0) / L.nCols), ch = Math.min(46, (f.y1 - f.y0) / L.nRows);
  const g = Fig.g();
  const mode = cfg.colorBy || 'type';
  const reps = [...new Set(L.plots.map(p => p.rep))];
  L.plots.forEach(p => {
    const x = f.x0 + p.col * cw, y = f.y0 + p.row * ch;
    const fill = mode === 'none' ? f.t.bg : mode === 'rep' ? Fig.alpha(Fig.color(cfg.palette, reps.indexOf(p.rep)), 0.55) : P2.typeColor(cfg, p);
    const rect = Fig.el('rect', { x: x + 0.8, y: y + 0.8, width: cw - 1.6, height: ch - 1.6, fill, stroke: f.t.axis, 'stroke-width': 0.6, rx: 2 });
    rect.appendChild(Fig.el('title', {}, `${T('Parcela', 'Plot')} ${p.plot} · ${p.code}`));
    g.appendChild(rect);
    const ink = mode === 'none' ? f.t.fg : Fig.onColor(fill.startsWith('rgba') ? '#ffffff' : fill);
    if (cfg.showPlot !== false && ch >= 16) g.appendChild(Fig.text(x + 3, y + Math.min(9, ch * 0.3) + 1, String(p.plot), { size: Math.min(8.5, ch * 0.28), fill: ink, font: f.font, opacity: 0.85 }));
    if (cfg.showEntry !== false) {
      const label = cw >= 58 && ch >= 26 ? shorten(p.code, Math.floor(cw / 5.2)) : String(p.entry);
      g.appendChild(Fig.text(x + cw / 2, y + ch / 2 + Math.min(10, ch * 0.33) * 0.55 + (ch >= 26 ? 3 : 0), label, { size: Math.min(10, ch * 0.33, cw * 0.28), anchor: 'middle', fill: ink, font: f.font, weight: 'bold' }));
    }
  });
  L.boxes.forEach(b => {
    const x = f.x0 + b.c0 * cw, y = f.y0 + b.r0 * ch, w = (b.c1 - b.c0 + 1) * cw, h = (b.r1 - b.r0 + 1) * ch;
    if (b.kind === 'rep') {
      g.appendChild(Fig.el('rect', { x: x - 2, y: y - 2, width: w + 4, height: h + 4, fill: 'none', stroke: f.t.fg, 'stroke-width': 2.2, rx: 4 }));
      if (field.design !== 'crd') g.appendChild(Fig.text(x - 8, y + h / 2, (field.design === 'augmented' ? T('Bloque ', 'Block ') : T('Rep. ', 'Rep ')) + b.rep, { size: 11, anchor: 'middle', fill: f.t.fg, font: f.font, rotate: -90, weight: 'bold', role: 'axis' }));
    } else if (field.design === 'alpha') {
      g.appendChild(Fig.el('rect', { x, y, width: w, height: h, fill: 'none', stroke: f.t.fg, 'stroke-width': 1.3, 'stroke-dasharray': '5 3' }));
    }
  });
  f.g.appendChild(g);
  /* compass of the numbering */
  f.axisDepth = 8;
  f.y1 = f.y0 + L.nRows * ch;
  if (mode === 'type') {
    const seen = new Map();
    L.plots.forEach(p => { const k = p.type === 'generation' ? p.generation : p.type; if (!seen.has(k)) seen.set(k, { label: P2.typeName(p), color: P2.typeColor(cfg, p) }); });
    Fig.legend(f, [...seen.values()], cfg, { pos: 'bottom' });
  }
  return svg;
};

/* ---------------- 5 · power curves ---------------- */
P2.powerCurve = (cfg0, pts, o) => {
  const cfg = withTitle(cfg0, 'Potencia según el diseño', 'Power by design');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 74, right: 200, top: 56, bottom: 64 } });
  const xs = pts.map(p => p.x);
  const sx = Fig.scaleLinear(Math.min(...xs), Math.max(...xs), f.x0, f.x1);
  const sy = Fig.scaleLinear(0, 1, f.y1, f.y0);
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || T('Potencia (1 − β)', 'Power (1 − β)') }), { ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] });
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || T(o.xes, o.xen) }), { ticks: xs.length <= 16 ? xs : null });
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(o.target), y2: sy(o.target), stroke: f.t.muted, 'stroke-dasharray': '6 4', 'stroke-width': 1.2 }));
  g.appendChild(Fig.text(f.x1 - 4, sy(o.target) - 6, `${Math.round(o.target * 100)}%`, { size: 10, anchor: 'end', fill: f.t.muted, font: f.font }));
  const series = o.series.filter(s => pts.some(p => isFinite(p[s.key])));
  series.forEach((s, k) => {
    const col = Fig.color(cfg.palette, s.color != null ? s.color : k);
    const d = pts.filter(p => isFinite(p[s.key])).map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p[s.key]).toFixed(1)).join(' ');
    g.appendChild(Fig.el('path', { d, fill: 'none', stroke: col, 'stroke-width': 2.4, 'stroke-dasharray': s.dash || null }));
    pts.forEach(p => { if (isFinite(p[s.key])) g.appendChild(Fig.el('circle', { cx: sx(p.x), cy: sy(p[s.key]), r: 3.2, fill: col })); });
  });
  if (o.current != null) g.appendChild(Fig.el('line', { x1: sx(o.current), x2: sx(o.current), y1: f.y0, y2: f.y1, stroke: Fig.color(cfg.palette, 1), 'stroke-width': 1.4, opacity: 0.7 }));
  f.g.appendChild(g);
  Fig.legend(f, series.map((s, k) => ({ label: T(s), color: Fig.color(cfg.palette, s.color != null ? s.color : k), shape: 'line', dash: s.dash })), cfg, { pos: 'right' });
  return svg;
};

window.P2 = P2;
