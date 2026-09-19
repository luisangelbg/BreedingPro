/* Bloque 1: trayectoria de 25 ciclos en el laboratorio de selección, escenario small */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const titulo = re => [...document.querySelectorAll("#panel-1 .section-title")].find(h => re.test(h.textContent));
  goStep(1); await W(300);
  document.querySelector("[data-lab=\"labSelection\"]").click(); await W(300);
  const s = document.getElementById("slPreset"); s.value = "small"; s.dispatchEvent(new Event("change")); await W(200);
  for (let c = 0; c < 25; c++) document.getElementById("slStep").click();
  await W(300);
  const pane = document.querySelectorAll("#labSelection .pg-pane")[1]; irA(document.querySelector(".playground")); await W(500);
  caja([pane], 2);
})()
