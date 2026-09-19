/* Bloque 8: dirección y pesos, y comparación de índices con la altura restringida */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).filter(n => n.offsetParent !== null).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const cargar = async id => { goStep(3); await W(500); document.querySelector("[data-fam=\"all\"]").click(); await W(150); document.querySelector(`[data-ex="${id}"]`).click(); for (let k = 0; k < 80; k++) { await W(250); if (B3.results.size && !document.getElementById("b3Analysis").classList.contains("is-busy")) break; } await W(800); goStep(8); await W(3500); };
  const $ = id => document.getElementById(id);
  const prep = async o => {
    o = o || {};
    const p = $("b8P"); p.value = o.p || "0.2"; p.dispatchEvent(new Event("change")); await W(1500);
    if (o.traits !== false) { const ins = [...document.querySelectorAll("#b8TraitPick input")]; ins.forEach(i => { i.checked = [0, 1, 8, 13, 14].includes(+i.dataset.j); }); ins[0].dispatchEvent(new Event("change")); await W(1500); }
    if (o.traits !== false) { ["0", "1"].forEach(j => { const s = document.querySelector(`#b8SetupTable select[data-j="${j}"]`); s.value = "-1"; s.dispatchEvent(new Event("change")); }); await W(1000); }
    if (o.pathP) { const y = $("b8PathY"); y.value = [...y.options].find(x => x.text === "KW").value; y.dispatchEvent(new Event("change")); await W(600); const b = $("b8PathBasis"); b.value = o.pathP; b.dispatchEvent(new Event("change")); await W(600); }
    if (o.restrict) { const r = document.querySelector("#b8SetupTable input[data-j=\"0\"][data-k=\"restrict\"]"); r.checked = true; r.dispatchEvent(new Event("change")); await W(1000); }
  };
  await cargar("maize13");
  await prep({ restrict: true });
  const c = $("b8Index"); irA(c); await W(400);
  caja([c.querySelector("h2"), $("b8IndexBox").querySelector("p.hint"), $("b8SetupTable"), $("b8IndexMsg"), $("b8IndexBox").querySelector("h3"), $("b8IndexTable")], 10);
})()
