/* Bloque 10: tarjeta 3, BLUP de las líneas simuladas con el parentesco del pedigrí */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).filter(n => n.offsetParent !== null).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const cargar = async id => { goStep(3); await W(500); document.querySelector("[data-fam=\"all\"]").click(); await W(150); document.querySelector(`[data-ex="${id}"]`).click(); for (let k = 0; k < 80; k++) { await W(250); if (B3.results.size && !document.getElementById("b3Analysis").classList.contains("is-busy")) break; } await W(800); goStep(10); await W(2500); };
  const $ = id => document.getElementById(id);
  const filas = (host, n) => { const t = $(host).querySelector("table"); return [t.querySelector("thead")].concat([...t.querySelectorAll("tbody tr")].slice(0, n)); };
  const ensayo = async g => { await cargar("simLines"); document.querySelector("[data-ex10=\"simLinesPed\"]").click(); await W(1500); const s = $("b10TGen"); s.value = g; s.dispatchEvent(new Event("change")); $("b10TRun").click(); for (let k = 0; k < 160; k++) { await W(500); if (B10.tRes && B10.tRes.model === g && !$("b10TRun").disabled) break; } await W(1500); document.querySelectorAll(".book-scroll").forEach(n => { n.style.maxHeight = "none"; }); };
  await ensayo("A");
  const c = $("b10Trial"); irA(c); await W(400);
  caja([c.querySelector("h2"), $("b10TMsg"), $("b10TBox").querySelector(".form-grid"), $("b10TBox").querySelector(".btn-row"), $("b10TTiles"), $("b10TComp"), $("b10TNote"), $("b10TTruth")], 10);
})()
