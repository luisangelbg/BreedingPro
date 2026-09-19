/* Bloque 3: la tarjeta de carga con la libreta del Bloque 2 lista para usarse */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const set = (id, v, ev) => { const n = document.getElementById(id); n.value = v; n.dispatchEvent(new Event(ev || "input")); };
  /* the running example of the chapter: eight maize lines, Griffing method 4, two checks, alpha lattice */
  goStep(2); await W(1500);
  document.querySelector("[data-tile=\"g4\"]").click(); await W(500);
  set("b2Parents", "L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8"); set("b2Checks", "Testigo A, Testigo B"); await W(900);
  set("b2FieldDesign", "alpha", "change"); await W(300); set("b2Arrange", "side", "change"); await W(300); set("b2K", "5", "change"); await W(3000);
  set("b2Traits", "Rendimiento, Floración masculina, Altura de planta"); await W(700);
  goStep(3); await W(800);
  const c = document.getElementById("b3FromPlan"); const card = c.closest(".card"); irA(card); await W(400);
  caja([card.querySelector("h2"), c.parentElement, document.getElementById("b3PlanSim").closest("label")], 10);
})()
