/* Bloque 1: gráfica Wr–Vr del laboratorio de dialelos, escenario additive */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const titulo = re => [...document.querySelectorAll("#panel-1 .section-title")].find(h => re.test(h.textContent));
  goStep(1); await W(300);
  const s = document.getElementById("dlPreset"); s.value = "additive"; s.dispatchEvent(new Event("change")); await W(300);
  const pane = document.querySelectorAll("#labDiallel .pg-pane")[1]; irA(document.querySelector(".playground")); await W(500);
  caja([pane.querySelector(".pg-title"), pane.querySelector("svg"), pane.querySelector(".legend-inline")], 4);
})()
