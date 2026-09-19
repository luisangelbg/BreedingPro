/* BreedingPro — Block 7 figures: the means of every generation with the model fitted to
   them, the individual scaling tests against zero, the variances of every generation
   against their expectation, and heterosis with its confidence interval. */

const P7 = {};
const t7 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });

/* ---------------- 1 · generation means and the fitted model ---------------- */
P7.means = (cfg0, res, o) => {
  const cfg = t7(cfg0, 'Medias de las generaciones', 'Means of the generations');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const stats = res.stats;
  const fit = cfg.model === 'perfect' ? res.perfect : res.models.chosen;
  const tcrit = o.tcrit || 1.96;
  const labels = stats.map(s => T(GEN.NAMES[s.gen] || { es: s.gen, en: s.gen }));
  const lo = Math.min(...stats.map(s => s.mean - tcrit * s.seMean));
  const hi = Math.max(...stats.map(s => s.mean + tcrit * s.seMean));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(lo, hi), { catLabel: T('Generación', 'Generation'), valueLabel: o.label, padding: 0.4, margin: { right: 150 } });
  const f = C.f, g = Fig.g();
  const colObs = Fig.color(cfg.palette, 3), colFit = Fig.color(cfg.palette, 0);
  let midLabel = null;
  /* the mid-parent line, which is the reference for heterosis */
  if (res.heterosis && isFinite(res.heterosis.midParent) && cfg.showMidParent !== false) {
    g.appendChild(C.ref(res.heterosis.midParent, { stroke: f.t.muted, 'stroke-dasharray': '5 4' }));
    /* the label goes on top of the model line, so its halo keeps it readable */
    midLabel = C.refLabel(res.heterosis.midParent, T('media de los progenitores', 'mid-parent'), { fill: f.t.muted });
  }
  stats.forEach((s, i) => {
    g.appendChild(C.whisker(C.center(i), s.mean - tcrit * s.seMean, s.mean + tcrit * s.seMean, Math.min(6, C.bw * 0.2), { stroke: colObs, 'stroke-width': 1.3 }));
    const m = C.marker(C.center(i), s.mean, 4.6, 'circle', { fill: colObs, stroke: f.t.bg, 'stroke-width': 0.9 });
    m.appendChild(Fig.el('title', {}, `${s.gen} · n = ${s.n} · ${fmtNum(s.mean, 3)} ± ${fmtNum(s.seMean, 3)}`));
    g.appendChild(m);
  });
  /* the values the model expects */
  if (fit && cfg.showFit !== false) {
    const ix = new Map(fit.generations.map((gg, k) => [gg, k]));
    const pts = [];
    stats.forEach((s, i) => { if (ix.has(s.gen)) pts.push([C.center(i), fit.fitted[ix.get(s.gen)]]); });
    if (pts.length > 1) g.appendChild(Fig.el('path', { d: C.path(pts), fill: 'none', stroke: colFit, 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }));
    pts.forEach(p => g.appendChild(C.marker(p[0], p[1], 4, 'diamond', { fill: 'none', stroke: colFit, 'stroke-width': 1.6 })));
  }
  if (midLabel) g.appendChild(midLabel);
  f.g.appendChild(g);
  const notes = [];
  if (fit) {
    notes.push(T(`modelo ${fit.params.map(k => GEN.PARAM_LABEL[fit.metric][k]).join(', ')}`, `model ${fit.params.map(k => GEN.PARAM_LABEL[fit.metric][k]).join(', ')}`));
    if (fit.df > 0) notes.push(`χ²(${fit.df}) = ${fmtNum(fit.chi2, 3)} · ${pEq(fit.p)}`);
    else notes.push(T('ajuste perfecto (0 gl)', 'perfect fit (0 df)'));
    fit.est.forEach(e => notes.push(`${GEN.PARAM_LABEL[fit.metric][e.key]} = ${fmtNum(e.value, 3)} ± ${fmtNum(e.se, 3)}`));
  }
  if (cfg.legendPos !== 'none') {
    notes.forEach((s, k) => f.g.appendChild(Fig.text(f.x1 + 16, f.y0 + 14 + k * 15, s, { size: 10, fill: f.t.fg, font: f.font, role: 'legend' })));
    const key = [[colObs, 'circle', T('observado ± IC', 'observed ± CI')], [colFit, 'diamond', T('esperado', 'expected')]];
    key.forEach(([c, sh, lab], k) => {
      const yy = f.y0 + 26 + notes.length * 15 + k * 16;
      f.g.appendChild(Fig.marker(f.x1 + 22, yy - 4, 4.2, sh, sh === 'diamond' ? { fill: 'none', stroke: c, 'stroke-width': 1.6 } : { fill: c }));
      f.g.appendChild(Fig.text(f.x1 + 32, yy, lab, { size: 10, fill: f.t.muted, font: f.font, role: 'legend' }));
    });
  }
  return svg;
};

/* ---------------- 2 · the individual scaling tests ---------------- */
P7.scaling = (cfg0, tests, o) => {
  const cfg = t7(cfg0, 'Pruebas de escala', 'Scaling tests');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const tcrit = o.tcrit || 1.96;
  const labels = tests.map(x => T(x.es, x.en));
  const lo = Math.min(0, ...tests.map(x => x.value - tcrit * x.se));
  const hi = Math.max(0, ...tests.map(x => x.value + tcrit * x.se));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(lo, hi, true), { catLabel: '', valueLabel: o.label, padding: 0.38, margin: { right: 60 } });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1.1 }));
  tests.forEach((x, i) => {
    const sig = isFinite(x.p) && x.p < (o.alpha || 0.05);
    const col = Fig.color(cfg.palette, sig ? 5 : 2);
    g.appendChild(C.bar(i, x.value, { fill: Fig.alpha(col, sig ? 0.9 : 0.45), rx: 2 }));
    g.appendChild(C.whisker(C.center(i), x.value - tcrit * x.se, x.value + tcrit * x.se, Math.min(6, C.bw * 0.18), { stroke: f.t.fg, 'stroke-width': 1.1 }));
    /* the value is written at the edge of the frame, where it never meets a bar or a label */
    g.appendChild(C.edgeText(C.center(i), fmtNum(x.value, 2) + (sig && P4.starOf(x.p) ? ' ' + P4.starOf(x.p) : ''), { size: 10, fill: f.t.fg }));
  });
  f.g.appendChild(g);
  f.g.appendChild(Fig.text(f.x0, f.y1 + (f.axisDepth != null ? f.axisDepth - 6 : 40), T('barras rellenas: distintas de cero (hay epistasis)', 'solid bars: different from zero (epistasis is present)'), { size: 10, fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

/* ---------------- 3 · variances against their expectation ---------------- */
P7.variances = (cfg0, vc, o) => {
  const cfg = t7(cfg0, 'Varianzas de las generaciones', 'Variances of the generations');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const labels = vc.generations.map(g => T(GEN.NAMES[g] || { es: g, en: g }));
  const all = vc.observed.concat(vc.fitted);
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(0, Math.max(...all), true), { catLabel: T('Generación', 'Generation'), valueLabel: o.label || T('varianza', 'variance'), padding: 0.3, margin: { right: 150 } });
  const f = C.f, g = Fig.g();
  const colObs = Fig.color(cfg.palette, 3), colFit = Fig.color(cfg.palette, 0);
  vc.generations.forEach((gg, i) => {
    const half = C.bw / 2;
    g.appendChild(C.rect(C.start(i), half, 0, vc.observed[i], { fill: Fig.alpha(colObs, 0.85), rx: 2 }));
    g.appendChild(C.rect(C.start(i) + half, half, 0, vc.fitted[i], { fill: Fig.alpha(colFit, 0.6), rx: 2 }));
  });
  f.g.appendChild(g);
  const notes = [
    `D = ${fmtNum(vc.D, 3)}`, `H = ${fmtNum(vc.H, 3)}`,
    isFinite(vc.F) ? `F = ${fmtNum(vc.F, 3)}` : '',
    `E = ${fmtNum(vc.E, 3)}`,
    vc.df > 0 ? `χ²(${vc.df}) = ${fmtNum(vc.chi2, 2)} · ${pEq(vc.p)}` : T('ajuste perfecto', 'perfect fit'),
    isFinite(vc.dominance) ? T(`√(H/D) = ${fmtFixed(vc.dominance, 2)}`, `√(H/D) = ${fmtFixed(vc.dominance, 2)}`) : '',
  ].filter(Boolean);
  if (cfg.legendPos !== 'none') {
    notes.forEach((s, k) => f.g.appendChild(Fig.text(f.x1 + 16, f.y0 + 14 + k * 15, s, { size: 10.5, fill: f.t.fg, font: f.font, role: 'legend' })));
    [[colObs, T('observada', 'observed')], [colFit, T('esperada', 'expected')]].forEach(([c, lab], k) => {
      const yy = f.y0 + 26 + notes.length * 15 + k * 16;
      f.g.appendChild(Fig.el('rect', { x: f.x1 + 18, y: yy - 11, width: 10, height: 10, fill: Fig.alpha(c, 0.8), rx: 2 }));
      f.g.appendChild(Fig.text(f.x1 + 33, yy, lab, { size: 10, fill: f.t.muted, font: f.font, role: 'legend' }));
    });
  }
  return svg;
};

/* ---------------- 4 · heterosis and inbreeding depression ---------------- */
P7.heterosis = (cfg0, het, o) => {
  const cfg = t7(cfg0, 'Heterosis y depresión endogámica', 'Heterosis and inbreeding depression');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const items = het.list.filter(x => isFinite(x.value));
  /* each contrast with the t quantile of its own degrees of freedom */
  const tq = x => (o.alpha && isFinite(x.df) && x.df > 0 ? S.qt(1 - o.alpha / 2, x.df) : o.tcrit || 1.96);
  const pct = cfg.show === 'pct';
  const val = x => (pct ? x.pct : x.value);
  const err = x => (pct && x.base ? 100 * x.se / Math.abs(x.base) : x.se);
  const labels = items.map(x => T(x.es, x.en));
  const lo = Math.min(0, ...items.map(x => val(x) - tq(x) * err(x)));
  const hi = Math.max(0, ...items.map(x => val(x) + tq(x) * err(x)));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(lo, hi, true), { catLabel: '', valueLabel: pct ? '%' : o.label, padding: 0.42, margin: { right: 60 } });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1.1 }));
  items.forEach((x, i) => {
    const sig = isFinite(x.p) && x.p < (o.alpha || 0.05);
    const col = Fig.color(cfg.palette, val(x) >= 0 ? 0 : 3);
    g.appendChild(C.bar(i, val(x), { fill: Fig.alpha(col, sig ? 0.9 : 0.45), rx: 2 }));
    g.appendChild(C.whisker(C.center(i), val(x) - tq(x) * err(x), val(x) + tq(x) * err(x), Math.min(6, C.bw * 0.16), { stroke: f.t.fg, 'stroke-width': 1.1 }));
    g.appendChild(C.edgeText(C.center(i), fmtNum(val(x), pct ? 1 : 3) + (pct ? ' %' : '') + (sig && P4.starOf(x.p) ? ' ' + P4.starOf(x.p) : ''), { size: 10, fill: f.t.fg }));
  });
  f.g.appendChild(g);
  return svg;
};

window.P7 = P7;
