/* Bloque 1: un tema de teoría abierto (los cuatro métodos de Griffing) */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const titulo = re => [...document.querySelectorAll("#panel-1 .section-title")].find(h => re.test(h.textContent));
  goStep(1); await W(300);
  const d = [...document.querySelectorAll("#theory ~ .theory-card details.acc, .theory-card details.acc")].find(x => /cuatro metodologías de Griffing/.test(x.querySelector("summary").textContent));
  d.open = true; await W(300);
  const t = titulo(/La teoría/); irA(d.previousElementSibling || d); await W(400);
  caja([d.previousElementSibling, d], 6);
})()
