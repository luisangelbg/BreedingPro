/* Bloque 1: el material con el que trabajas */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const titulo = re => [...document.querySelectorAll("#panel-1 .section-title")].find(h => re.test(h.textContent));
  goStep(1); await W(300);
  const t = titulo(/material con el que/); irA(t); await W(400);
  caja([t, t.nextElementSibling, document.getElementById("materialStrip")], 10);
})()
