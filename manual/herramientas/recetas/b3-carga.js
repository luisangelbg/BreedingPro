/* Bloque 3, tarjeta 1: las tres fuentes, la nota del ejemplo cargado y los primeros ejemplos */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const cargar = async id => { goStep(3); await W(500); document.querySelector("[data-fam=\"all\"]").click(); await W(150); document.querySelector(`[data-ex="${id}"]`).click(); for (let k = 0; k < 80; k++) { await W(250); if (B3.results.size && !document.getElementById("b3Analysis").classList.contains("is-busy")) break; } await W(800); };
  await cargar("simAlpha");
  const c = document.getElementById("b3Load"); irA(c); await W(400);
  const ex = [...document.querySelectorAll("#b3Examples .ex-card")].slice(0, 3);
  caja([c.querySelector("h2"), c.querySelector(".src-grid"), document.getElementById("b3LoadMsg"), document.getElementById("b3SourceLine"), document.getElementById("b3ExFilter"), ...ex], 10);
})()
