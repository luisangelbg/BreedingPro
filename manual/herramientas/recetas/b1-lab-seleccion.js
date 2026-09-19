/* Bloque 1: el laboratorio de selección, selección masal tras diez ciclos (ventana de 1040 píxeles).
   Deja en window.__recorte el recorte y en window.__marcas la posición de las marcas numeradas (% del recorte). */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  goStep(1); await W(300);
  document.querySelector('[data-lab="labSelection"]').click(); await W(300);
  const s = document.getElementById("slPreset"); s.value = "mass"; s.dispatchEvent(new Event("change")); await W(200);
  for (let k = 0; k < 10; k++) document.getElementById("slStep").click();
  await W(300);
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
  const panes = [...document.querySelectorAll("#labSelection .pg-pane")];
  const nueva = document.getElementById("slNew").getBoundingClientRect();
  const rd = document.querySelector("#labSelection .sim-readout .rd").getBoundingClientRect();
  const fila = document.querySelector("#labSelection .slider-row"), rng = fila.querySelector("input").getBoundingClientRect();
  const [fx, fy] = finTexto(document.getElementById("slStatus"));
  const pts = [
    [nueva.right + 22, medio(nueva)],
    ...panes.map(q => { const [x, y] = finTexto(q.querySelector(".pg-title")); return [x + 26, y]; }),
    [rd.right - 14, rd.top + 14],
    [fx + 26, fy + 6],
    [(finTexto(fila.querySelector("label"))[0] + rng.left) / 2, medio(rng) - 3],
  ];
  window.__marcas = pts.map(([x, y]) => [((x - x0) / w * 100).toFixed(1), ((y - y0) / h * 100).toFixed(1)]);
})()
