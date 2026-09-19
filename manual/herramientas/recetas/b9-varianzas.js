/* Bloque 9: ecovalencia y varianzas de estabilidad */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).filter(n => n.offsetParent !== null).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const cargar = async id => { goStep(3); await W(500); document.querySelector("[data-fam=\"all\"]").click(); await W(150); document.querySelector(`[data-ex="${id}"]`).click(); for (let k = 0; k < 80; k++) { await W(250); if (B3.results.size && !document.getElementById("b3Analysis").classList.contains("is-busy")) break; } await W(800); goStep(9); await W(4000); };
  const $ = id => document.getElementById(id);
  await cargar("oat14");
  document.querySelectorAll(".book-scroll").forEach(n => { n.style.maxHeight = "none"; }); await W(200);
  const c = $("b9Var"); irA(c); await W(400);
  caja([c.querySelector("h2"), c.querySelector("h3"), $("b9VarTable"), $("b9VarNote")], 10);
})()
