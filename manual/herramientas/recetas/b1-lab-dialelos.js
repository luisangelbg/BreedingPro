/* Bloque 1: el laboratorio de dialelos con el escenario de dominancia parcial (ventana de 1040 píxeles).
   Deja en window.__recorte el recorte y en window.__marcas la posición de las marcas numeradas (% del recorte). */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  goStep(1); await W(300);
  const p = document.querySelector(".playground");
  window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - 104, behavior: "instant" }); await W(500);
  const c = p.getBoundingClientRect(), pad = 6;
  const x0 = c.left - pad, y0 = c.top - pad, w = c.width + 2 * pad, h = c.height + 2 * pad;
  window.__recorte = [x0, y0, w, h].map(Math.round).join(",");
  /* the right edge and middle of the last visible character of an element */
  const finTexto = n => {
    const tw = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    let t = null;
    for (let x = tw.nextNode(); x; x = tw.nextNode()) if (x.textContent.trim() && x.parentElement.getClientRects().length) t = x;
    const k = t.textContent.trimEnd().length, r = document.createRange();
    r.setStart(t, k - 1); r.setEnd(t, k);
    const u = r.getBoundingClientRect();
    return [u.right, (u.top + u.bottom) / 2];
  };
  const medio = b => (b.top + b.bottom) / 2;
  const panes = [...document.querySelectorAll("#labDiallel .pg-pane")];
  const tab = document.querySelector('[data-lab="labSelection"]').getBoundingClientRect();
  const nuevo = document.getElementById("dlNew").getBoundingClientRect();
  const rd = document.querySelector("#labDiallel .sim-readout .rd").getBoundingClientRect();
  const fila = document.querySelector("#labDiallel .slider-row"), rng = fila.querySelector("input").getBoundingClientRect();
  const [fx, fy] = finTexto(document.getElementById("dlStatus"));
  const pts = [
    [tab.right + 20, medio(tab)],
    [nuevo.right + 22, medio(nuevo)],
    ...panes.map(q => { const [x, y] = finTexto(q.querySelector(".pg-title")); return [x + 26, y]; }),
    [rd.right - 14, rd.top + 14],
    [fx + 26, fy + 6],
    [(finTexto(fila.querySelector("label"))[0] + rng.left) / 2, medio(rng) - 3],
  ];
  window.__marcas = pts.map(([x, y]) => [((x - x0) / w * 100).toFixed(1), ((y - y0) / h * 100).toFixed(1)]);
})()
