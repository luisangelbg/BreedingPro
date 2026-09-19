/* Bloque 3: la hoja de datos con las primeras filas del dialelo de maíz 4 × 4 */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const cargar = async id => { goStep(3); await W(500); document.querySelector("[data-fam=\"all\"]").click(); await W(150); document.querySelector(`[data-ex="${id}"]`).click(); for (let k = 0; k < 80; k++) { await W(250); if (B3.results.size && !document.getElementById("b3Analysis").classList.contains("is-busy")) break; } await W(800); };
  goStep(3); await W(500);
  const src = Examples.rows("maize4").rows.map(r => r.map(v => String(v)));
  Sheet.open({ rows: src, name: "dialelo_maiz", force: true }); await W(1200);
  const c = document.getElementById("cardSheet"); irA(c); await W(500);
  const g = document.getElementById("sheetGrid"), gr = g.getBoundingClientRect();
  caja([c.querySelector(".card-head"), c.querySelector(".sheet-toolbar")], 10);
  const [x, y, w] = window.__recorte.split(",").map(Number); window.__recorte = [x, y, w, Math.round(gr.top + 300 - y)].join(",");
})()
